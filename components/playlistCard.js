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

  // Create the card with subtle stacking hint
  let card = document.createElement('div');
  card.className = 'playlist-card';
  card.dataset.playlistId = playlist.id;
  card.dataset.author = playlist.pubkey;
  card.dataset.dtag = dtag;

  card.innerHTML = `
    <div class="thumbnail-container">
      <img class="thumbnail" loading="lazy" />
    </div>
    <div class="playlist-info">
      <h3 class="title"></h3>
      <div class="creator">
        <div class="creator-image"></div>
        <div class="creator-name"></div>
      </div>
      <div class="metadata">
        <span class="time"></span>
        <span class="video-count">${videoCount} videos</span>
      </div>
      <button class="options-button" type="button" aria-label="Playlist options">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      <div class="options-menu hidden">
        <div class="options-menu-item">
          <span>Save Playlist</span>
        </div>
        <div class="options-menu-item">
          <span>Share</span>
        </div>
        <div class="options-menu-item">
          <span>Report</span>
        </div>
        <div class="options-menu-item" data-action="show-json">
          <span>Show JSON</span>
        </div>
      </div>
    </div>
  `;

  // Get references to elements
  let thumbnailImg = card.querySelector('.thumbnail');
  let titleElement = card.querySelector('.title');
  let creatorImageContainer = card.querySelector('.creator-image');
  let creatorNameContainer = card.querySelector('.creator-name');
  let timeElement = card.querySelector('.time');
  let playlistInfoContainer = card.querySelector('.playlist-info');
  let optionsButton = card.querySelector('.options-button');
  let optionsMenu = card.querySelector('.options-menu');
  let creatorSection = card.querySelector('.creator');

  // Set dynamic content
  thumbnailImg.src = thumbnailSrc;
  thumbnailImg.alt = title;
  titleElement.textContent = truncateText(title, 50);
  titleElement.title = title;
  timeElement.textContent = timeAgo;

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
    playlistInfoContainer.appendChild(descriptionP);
  }

  // Options menu functionality
  optionsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.options-menu:not(.hidden)').forEach(menu => {
      if (menu !== optionsMenu) {
        menu.classList.add('hidden');
      }
    });
    optionsMenu.classList.toggle('hidden');
  });

  card.querySelectorAll('.options-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      const menuText = item.textContent.trim();
      if (action === 'show-json') {
        showPlaylistJsonModal(playlist);
      } else {
        console.log('Menu item clicked:', menuText);
      }
      optionsMenu.classList.add('hidden');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!optionsMenu.classList.contains('hidden') && !card.contains(e.target)) {
      optionsMenu.classList.add('hidden');
    }
  });

  return card;
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