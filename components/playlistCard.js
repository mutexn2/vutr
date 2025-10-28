function createPlaylistCard(playlist) {
  if (!playlist || !playlist.id) return document.createElement('div');

  let getValueFromTags = (tags, key, defaultValue = "") => {
    let tag = tags?.find((t) => t[0] === key);
    return tag ? tag[1] : defaultValue;
  };

  let truncateText = (text, maxLength = 80) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  let countVideoReferences = (playlist) => {
    if (!playlist.tags || !Array.isArray(playlist.tags)) {
      return 0;
    }
    
    return playlist.tags.filter(tag => {
      if (!Array.isArray(tag) || tag.length < 2 || tag[0] !== "a") {
        return false;
      }
      
      const aTagValue = tag[1];
      if (!aTagValue || typeof aTagValue !== "string" || !aTagValue.startsWith("21:")) {
        return false;
      }
      
      const idPart = aTagValue.substring(3);
      return idPart.length === 64 && /^[a-fA-F0-9]{64}$/.test(idPart);
    }).length;
  };

  // Extract playlist data
  let title = getValueFromTags(playlist.tags, "title", "Untitled Playlist");
  let description = getValueFromTags(playlist.tags, "description", "");
  let imageUrl = getValueFromTags(playlist.tags, "image", "");
  let timeAgo = getRelativeTime(playlist.created_at);
  let videoCount = countVideoReferences(playlist);
  let dtag = getValueFromTags(playlist.tags, "d", "");

  // Fallback thumbnail if no image provided
  let thumbnailSrc = sanitizeUrl(
    imageUrl || "https://cdn.nostrcheck.me/a605827e09ea5be22a06ac2ec7e2be3985cac6b0322f7621881adbe21a7d7fb6.jpeg"
  );

  // Create the card using same structure as video card
  let card = document.createElement('div');
  card.className = 'video-card'; // Using same class as video card
  card.dataset.playlistId = playlist.id;
  card.dataset.author = playlist.pubkey;
  card.dataset.dtag = dtag;

  card.innerHTML = `
    <div class="metadata">
      <span class="time"></span>
    </div>
    <div class="thumbnail-container">
      <img class="thumbnail" loading="lazy" />
    </div>
    <div class="video-info">
      <h3 class="title"></h3>
      <div class="creator">
        <div class="creator-image"></div>
        <div class="creator-name"></div>
      </div>

      <button class="options-button" type="button" aria-label="Playlist options">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
    </div>
  `;

  // Get references to elements
  let thumbnailImg = card.querySelector('.thumbnail');
  let titleElement = card.querySelector('.title');
  let creatorImageContainer = card.querySelector('.creator-image');
  let creatorNameContainer = card.querySelector('.creator-name');
  let timeElement = card.querySelector('.time');
  let videoInfoContainer = card.querySelector('.video-info');
  let optionsButton = card.querySelector('.options-button');
  let creatorSection = card.querySelector('.creator');

  // Set dynamic content programmatically
  thumbnailImg.src = thumbnailSrc;
  thumbnailImg.alt = title;
  
  titleElement.textContent = truncateText(title, 50);
  titleElement.title = title;
  
  timeElement.textContent = timeAgo;

  // Add video count instead of duration (in the same position as video card duration)
  if (videoCount !== undefined) {
    let videoCountSpan = document.createElement('span');
    videoCountSpan.className = 'duration'; // Using same class as video duration
    videoCountSpan.textContent = `${videoCount} videos`;
    card.querySelector('.thumbnail-container').appendChild(videoCountSpan);
  }

  // Creator info
  let creatorImage = document.createElement('nostr-picture');
  creatorImage.className = 'channel-image';
  creatorImage.setAttribute('pubkey', playlist.pubkey);
  creatorImageContainer.appendChild(creatorImage);

  let creatorName = document.createElement('nostr-name');
  creatorName.className = 'channel-name';
  creatorName.setAttribute('pubkey', playlist.pubkey);
  creatorNameContainer.appendChild(creatorName);

  // Make creator section clickable
  creatorSection.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.hash = `#profile/${playlist.pubkey}`;
  });

  // Add description if available
  if (description) {
    let descriptionP = document.createElement('p');
    descriptionP.className = 'description';
    descriptionP.textContent = truncateText(description);
    videoInfoContainer.appendChild(descriptionP);
  }

  // Options menu functionality - same as video card
  optionsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    showPlaylistCardMenu(optionsButton, playlist, title);
  });

  return card;
}


//////////////////////////////////////////////
// PLAYLIST CARD MENU (same pattern as video card menu)
//////////////////////////////////////////////
let playlistCardMenuControls = null;
let currentPlaylistCardData = null;

async function showPlaylistCardMenu(buttonElement, playlist, title) {
  // If menu exists and it's for a different playlist, close it first
  if (playlistCardMenuControls && playlistCardMenuControls.isOpen() && currentPlaylistCardData?.id !== playlist.id) {
    playlistCardMenuControls.close();
    playlistCardMenuControls = null;
  }
  
  // If menu exists for same playlist, toggle it
  if (playlistCardMenuControls && playlistCardMenuControls.isOpen() && currentPlaylistCardData?.id === playlist.id) {
    playlistCardMenuControls.close();
    return;
  }

  // If menu doesn't exist, create it
  if (!playlistCardMenuControls || currentPlaylistCardData?.id !== playlist.id) {
    await createPlaylistCardMenu(buttonElement, playlist, title);
  }

  // Open the menu
  playlistCardMenuControls.open();
}

async function createPlaylistCardMenu(buttonElement, playlist, title) {
  // Store current playlist data
  currentPlaylistCardData = playlist;
  
  // Create overlay container
  let overlayElement = document.createElement('div');
  overlayElement.id = 'playlist-card-overlay';
  overlayElement.classList.add('menu-overlay');
  
  let menuElement = document.createElement('div');
  menuElement.id = 'playlist-card-menu';
  menuElement.classList.add('settings-menu');
  
  menuElement.innerHTML = `
    <div class="menu-container">
      <div class="menu-header">
        <div class="user-info">
          ${title}
        </div>
      </div>
      
      <div class="menu-items">
        <button class="menu-item playlist-save">
          <span class="item-icon">💾</span>
          <span class="item-text">Save Playlist</span>
        </button>
        <button class="menu-item playlist-share">
          <span class="item-icon">🔗</span>
          <span class="item-text">Share</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item playlist-mute-user">
          <span class="item-icon">🔇</span>
          <span class="item-text">Mute User</span>
        </button>
        <button class="menu-item playlist-report">
          <span class="item-icon">🚩</span>
          <span class="item-text">Report</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item playlist-show-json">
          <span class="item-icon">📄</span>
          <span class="item-text">Show JSON</span>
        </button>
      </div>
    </div>
  `;
  
  // Center the menu on screen
  menuElement.style.position = 'fixed';
  menuElement.style.top = '50%';
  menuElement.style.left = '50%';
  menuElement.style.transform = 'translate(-50%, -50%)';
  menuElement.style.zIndex = '9999';
  
  overlayElement.appendChild(menuElement);
  document.body.appendChild(overlayElement);
  
  // Create overlay controls
  playlistCardMenuControls = createOverlayControls("playlist-card", overlayElement, {
    closeOnOutsideClick: true,
    closeOnEscape: true,
    preventBodyScroll: false
  });

  // Override onOpen and onClose for animations
  const originalOverlay = OverlayManager.overlays.get("playlist-card");
  const originalOnOpen = originalOverlay.onOpen;
  const originalOnClose = originalOverlay.onClose;
  
  originalOverlay.onOpen = function() {
    originalOnOpen.call(this);
    setTimeout(() => {
      menuElement.classList.add('visible');
    }, 10);
  };
  
  originalOverlay.onClose = function() {
    menuElement.classList.remove('visible');
    setTimeout(() => {
      originalOnClose.call(this);
      if (overlayElement.parentNode) {
        overlayElement.remove();
      }
      playlistCardMenuControls = null;
      currentPlaylistCardData = null;
    }, 150);
  };

  setupPlaylistCardMenuEvents(menuElement, playlist);
  
  // Store reference in app object (optional)
  if (app.overlayControls) {
    app.overlayControls.playlistCard = playlistCardMenuControls;
  }
}

function setupPlaylistCardMenuEvents(menuElement, playlist) {
  menuElement.querySelector('.playlist-save')?.addEventListener('click', () => {
    console.log('Save Playlist clicked for:', playlist.id);
    playlistCardMenuControls?.close();
  });
  
  menuElement.querySelector('.playlist-share')?.addEventListener('click', () => {
    console.log('Share clicked for playlist:', playlist.id);
    playlistCardMenuControls?.close();
  });
  
  menuElement.querySelector('.playlist-mute-user')?.addEventListener('click', () => {
    console.log('Mute User clicked for playlist:', playlist.id, 'pubkey:', playlist.pubkey);
    playlistCardMenuControls?.close();
  });
  
  menuElement.querySelector('.playlist-report')?.addEventListener('click', () => {
    console.log('Report clicked for playlist:', playlist.id);
    playlistCardMenuControls?.close();
  });
  
  menuElement.querySelector('.playlist-show-json')?.addEventListener('click', () => {
    console.log('Show JSON clicked for playlist:', playlist.id);
    showPlaylistJsonModal(playlist);
    playlistCardMenuControls?.close();
  });
}

function showPlaylistJsonModal(playlistData) {
  const modal = openModal({
    title: `Playlist JSON - ${playlistData.id}`,
    content: `<pre>${JSON.stringify(playlistData, null, 2)}</pre>`,
    size: "large",
    customClass: "playlist-json-modal",
    onClose: () => {
      // Any specific cleanup for this modal
    }
  });

  const closeBtn = modal.querySelector('.close-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
}