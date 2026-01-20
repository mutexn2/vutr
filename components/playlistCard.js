function createPlaylistCard(playlist, options = {}) {
  if (!playlist || !playlist.id) return document.createElement('div');

  const {
    showEditControls = false,  // Show edit/delete buttons for local playlists
    showAuthor = true,         // Show author info (hide for user's own playlists)
    badgeText = null,          // Custom badge text (e.g., "Local", "Network")
    badgeIcon = null           // Custom badge icon
  } = options;

  let getValueFromTags = (tags, key, defaultValue = "") => {
    let tag = tags?.find((t) => t[0] === key);
    return tag ? tag[1] : defaultValue;
  };

  let truncateText = (text, maxLength = 80) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };


  // Check if playlist is already saved locally (only for network playlists)
  const isSavedLocally = showAuthor ? isPlaylistInLocalLibrary(playlist) : false;
  
  // Extract playlist data
  let title = getValueFromTags(playlist.tags, "title", "Untitled Playlist");
  let description = getValueFromTags(playlist.tags, "description", "");
  let imageUrl = getValueFromTags(playlist.tags, "image", "") || getValueFromTags(playlist.tags, "thumb", "");
  let timeAgo = getRelativeTime(playlist.created_at);
  let videoCount = countVideoReferences(playlist);
  let dtag = getValueFromTags(playlist.tags, "d", "");

  // Fallback thumbnail if no image provided
  let thumbnailSrc = sanitizeUrl(
    imageUrl || "https://image.nostr.build/477d78313a37287eb5613424772a14f051288ad1cbf2cdeec60e1c3052a839d4.jpg"
  );

  // Create the card
  let card = document.createElement('div');
  card.className = 'video-card playlist-card';
  
  // Add empty class if video count is 0
  if (videoCount === 0) {
    card.classList.add('playlist-empty');
  }
  
  card.dataset.playlistId = playlist.id;
  card.dataset.author = playlist.pubkey;
  card.dataset.dtag = dtag;
  card.dataset.isSaved = isSavedLocally;

  // Build the badge HTML
  let badgeHtml = '';
  if (badgeText || badgeIcon) {
    badgeHtml = `<div class="playlist-type-badge">${badgeIcon || ''} ${badgeText || ''}</div>`;
  }

  card.innerHTML = `
    <div class="metadata">
      <span class="time"></span>
      ${isSavedLocally ? '<span class="saved-indicator" title="Saved in your library">💾</span>' : ''}
    </div>
    <div class="thumbnail-container">
      <img class="thumbnail" loading="lazy" />
      <div class="playlist-overlay-indicator">📋 Playlist</div>
    </div>
    <div class="video-info">
      <h3 class="title"></h3>
      ${showAuthor ? `
        <div class="creator">
          <div class="creator-image"></div>
          <div class="creator-name"></div>
        </div>
      ` : ''}

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
  let timeElement = card.querySelector('.time');
  let videoInfoContainer = card.querySelector('.video-info');
  let optionsButton = card.querySelector('.options-button');

  // Set dynamic content
  thumbnailImg.src = thumbnailSrc;
  thumbnailImg.alt = title;
  
  titleElement.textContent = truncateText(title, 50);
  titleElement.title = title;
  
  timeElement.textContent = timeAgo;

  // Add video count
  if (videoCount !== undefined) {
    let videoCountSpan = document.createElement('span');
    videoCountSpan.className = 'duration';
    videoCountSpan.textContent = `${videoCount} items`;
    
    // Add empty class to the duration span if count is 0
    if (videoCount === 0) {
      videoCountSpan.classList.add('empty-count');
    }
    
    card.querySelector('.thumbnail-container').appendChild(videoCountSpan);
  }

  // Creator info (only if showAuthor is true)
  if (showAuthor) {
    let creatorSection = card.querySelector('.creator');
    let creatorImageContainer = card.querySelector('.creator-image');
    let creatorNameContainer = card.querySelector('.creator-name');

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
  }

  // Add description if available
  if (description) {
    let descriptionP = document.createElement('p');
    descriptionP.className = 'description';
    descriptionP.textContent = truncateText(description);
    videoInfoContainer.appendChild(descriptionP);
  }


  // Options menu - always check current saved status
  optionsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentSavedStatus = showAuthor ? isPlaylistInLocalLibrary(playlist) : false;
    showPlaylistCardMenu(optionsButton, playlist, title, currentSavedStatus, options);
  });

  return card;
}


// Helper function for delete confirmation
function handleDeletePlaylist(playlist, title) {
  const dTag = getValueFromTags(playlist, "d", "");
  
  if (confirm(`Are you sure you want to delete "${title}"?`)) {
    app.playlists = app.playlists.filter(p => getValueFromTags(p, "d", "") !== dTag);
    savePlaylistsToStorage();
    showTemporaryNotification('Playlist deleted');
    
    // Re-render the grid
    const playlists = app.playlists || [];
    renderPlaylistsGrid(playlists);
    setupPlaylistsEventListeners();
  }
}

function isPlaylistInLocalLibrary(playlist) {
  // Check both local playlists and bookmarked playlists
  const dTag = getValueFromTags(playlist, "d", "");
  
  const inLocalPlaylists = (app.playlists || []).some(
    (p) => p.pubkey === playlist.pubkey && 
           getValueFromTags(p, "d", "") === dTag
  );
  
  const inBookmarkedPlaylists = (app.bookmarkedPlaylists || []).some(
    (p) => p.pubkey === playlist.pubkey && 
           getValueFromTags(p, "d", "") === dTag
  );
  
  return inLocalPlaylists || inBookmarkedPlaylists;
}
//////////////////////////////////////////////
// PLAYLIST CARD MENU
//////////////////////////////////////////////
let playlistCardMenuControls = null;
let currentPlaylistCardData = null;

async function showPlaylistCardMenu(buttonElement, playlist, title, isSavedLocally = false, options = {}) {
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

  // Determine if this is a local playlist (user's own playlist)
  const isLocalPlaylist = options.showEditControls || false;

  // If menu doesn't exist, create it
  if (!playlistCardMenuControls || currentPlaylistCardData?.id !== playlist.id) {
    await createPlaylistCardMenu(buttonElement, playlist, title, isSavedLocally, isLocalPlaylist);
  }

  // Open the menu
  playlistCardMenuControls.open();
}

async function createPlaylistCardMenu(buttonElement, playlist, title, isSavedLocally = false, isLocalPlaylist = false) {
  currentPlaylistCardData = playlist;
  
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
          ${escapeHtml(title)}
          ${isSavedLocally && !isLocalPlaylist ? '<span class="saved-badge">💾 Bookmarked</span>' : ''}
          ${isLocalPlaylist ? '<span class="saved-badge">💾 My Playlist</span>' : ''}
        </div>
      </div>
      
      <div class="menu-items">
        ${isLocalPlaylist ? `
          <button class="menu-item playlist-edit">
            <span class="item-icon">✏️</span>
            <span class="item-text">Edit Metadata</span>
          </button>
          <button class="menu-item playlist-delete">
            <span class="item-icon">🗑️</span>
            <span class="item-text">Delete Playlist</span>
          </button>
          <div class="menu-separator"></div>
          <button class="menu-item playlist-share">
            <span class="item-icon">🔗</span>
            <span class="item-text">Share Playlist</span>
          </button>
        ` : isSavedLocally ? `
          <button class="menu-item playlist-remove-bookmark">
            <span class="item-icon">🔖</span>
            <span class="item-text">Remove Bookmark</span>
          </button>
        ` : `
          <button class="menu-item playlist-bookmark">
            <span class="item-icon">🔖</span>
            <span class="item-text">Bookmark Playlist</span>
          </button>
        `}
        ${!isLocalPlaylist ? `
          <div class="menu-separator"></div>
          <button class="menu-item playlist-mute-user">
            <span class="item-icon">🔇</span>
            <span class="item-text">Mute User</span>
          </button>
          <button class="menu-item playlist-report">
            <span class="item-icon">🚩</span>
            <span class="item-text">Report</span>
          </button>
        ` : ''}
        <div class="menu-separator"></div>
        <button class="menu-item playlist-show-json">
          <span class="item-icon">📄</span>
          <span class="item-text">Show JSON</span>
        </button>
      </div>
    </div>
  `;
  
  menuElement.style.position = 'fixed';
  menuElement.style.top = '50%';
  menuElement.style.left = '50%';
  menuElement.style.transform = 'translate(-50%, -50%)';
  menuElement.style.zIndex = '9999';
  
  overlayElement.appendChild(menuElement);
  document.body.appendChild(overlayElement);
  
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

  setupPlaylistCardMenuEvents(menuElement, playlist, isSavedLocally, isLocalPlaylist);
  
  if (app.overlayControls) {
    app.overlayControls.playlistCard = playlistCardMenuControls;
  }
}

function setupPlaylistCardMenuEvents(menuElement, playlist, isSavedLocally, isLocalPlaylist) {
  const dTag = getValueFromTags(playlist, "d", "");
  const title = getValueFromTags(playlist, "title", "Untitled Playlist");

  // ===== LOCAL PLAYLIST ACTIONS =====
  
  // Edit playlist (local playlists only)
  const editButton = menuElement.querySelector('.playlist-edit');
  if (editButton) {
    editButton.addEventListener('click', () => {
      showPlaylistModal(dTag);
      playlistCardMenuControls?.close();
    });
  }
  
  // Delete playlist (local playlists only)
  const deleteButton = menuElement.querySelector('.playlist-delete');
  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete "${title}"?`)) {
        app.playlists = app.playlists.filter(p => 
          !(getValueFromTags(p, "d", "") === dTag && p.pubkey === playlist.pubkey)
        );
        savePlaylistsToStorage();
        playlistCardMenuControls?.close();
        showTemporaryNotification('Playlist deleted');
        
        // Re-render if on local playlists page
        if (window.location.hash === '#localplaylists') {
          const playlists = app.playlists || [];
          renderPlaylistsGrid(playlists);
          setupPlaylistsEventListeners();
        }
      }
    });
  }

  // Share playlist (local playlists only)
  const shareButton = menuElement.querySelector('.playlist-share');
  if (shareButton) {
    shareButton.addEventListener('click', () => {
      console.log('Share playlist clicked for:', playlist.id);
      // TODO: Implement playlist sharing functionality
      showTemporaryNotification('Share functionality coming soon');
      playlistCardMenuControls?.close();
    });
  }

  // ===== BOOKMARKED PLAYLIST ACTIONS =====
  
  // Remove bookmark (bookmarked playlists)
  const removeBookmarkButton = menuElement.querySelector('.playlist-remove-bookmark');
  if (removeBookmarkButton) {
    removeBookmarkButton.addEventListener('click', () => {
      if (confirm(`Remove "${title}" from your bookmarks?`)) {
        app.bookmarkedPlaylists = app.bookmarkedPlaylists.filter(p => 
          !(getValueFromTags(p, "d", "") === dTag && p.pubkey === playlist.pubkey)
        );
        
        saveBookmarkedPlaylistsToStorage();
        playlistCardMenuControls?.close();
        showTemporaryNotification('Playlist removed from bookmarks');
        
        updatePlaylistCardSavedStatus(playlist, false);
        
        if (window.location.hash === '#bookmarkedplaylists') {
          bookmarkedListsPageHandler();
        }
      }
    });
  }

  // ===== NETWORK PLAYLIST ACTIONS =====
  
  // Bookmark playlist (network playlists not yet bookmarked)
  const bookmarkButton = menuElement.querySelector('.playlist-bookmark');
  if (bookmarkButton) {
    bookmarkButton.addEventListener('click', async () => {
      try {
        await bookmarkPlaylist(playlist);
        playlistCardMenuControls?.close();
        showTemporaryNotification('Playlist bookmarked');
        updatePlaylistCardSavedStatus(playlist, true);
      } catch (error) {
        console.error('Error bookmarking playlist:', error);
        showTemporaryNotification('Failed to bookmark playlist');
      }
    });
  }

  // ===== COMMON ACTIONS =====
  
  // Mute user (not for local playlists)
  const muteButton = menuElement.querySelector('.playlist-mute-user');
  if (muteButton) {
    muteButton.addEventListener('click', () => {
      console.log('Mute User clicked for playlist:', playlist.id, 'pubkey:', playlist.pubkey);
      // TODO: Implement mute user functionality
      showTemporaryNotification('Mute functionality coming soon');
      playlistCardMenuControls?.close();
    });
  }
  
  // Report playlist (not for local playlists)
  const reportButton = menuElement.querySelector('.playlist-report');
  if (reportButton) {
    reportButton.addEventListener('click', () => {
      console.log('Report clicked for playlist:', playlist.id);
      // TODO: Implement report functionality
      showTemporaryNotification('Report functionality coming soon');
      playlistCardMenuControls?.close();
    });
  }
  
  // Show JSON (all playlists)
  const showJsonButton = menuElement.querySelector('.playlist-show-json');
  if (showJsonButton) {
    showJsonButton.addEventListener('click', () => {
      showPlaylistJsonModal(playlist);
      playlistCardMenuControls?.close();
    });
  }
}
// Updated helper function with isSaved parameter
function updatePlaylistCardSavedStatus(playlist, isSaved) {
  const cards = document.querySelectorAll('.playlist-card');
  const dTag = getValueFromTags(playlist, "d", "");
  
  cards.forEach(card => {
    if (card.dataset.author === playlist.pubkey && card.dataset.dtag === dTag) {
      card.dataset.isSaved = isSaved.toString();
      
      // Update saved indicator
      const metadata = card.querySelector('.metadata');
      const existingIndicator = metadata.querySelector('.saved-indicator');
      
      if (isSaved && !existingIndicator) {
        // Add indicator if saving
        const indicator = document.createElement('span');
        indicator.className = 'saved-indicator';
        indicator.title = 'Saved in your library';
        indicator.textContent = '💾';
        metadata.appendChild(indicator);
      } else if (!isSaved && existingIndicator) {
        // Remove indicator if unsaving
        existingIndicator.remove();
      }
    }
  });
}



/**
 * Check if a playlist is a local playlist (created by current user)
 */
function isLocalPlaylist(playlist) {
  return playlist.pubkey === "local" || playlist.sig === "local";
}

/**
 * Check if a playlist is bookmarked
 */
function isPlaylistBookmarked(playlist) {
  const bookmarkedPlaylists = app.bookmarkedPlaylists || [];
  const dTag = getValueFromTags(playlist, "d", "");
  
  return bookmarkedPlaylists.some(
    (p) => p.pubkey === playlist.pubkey && 
           getValueFromTags(p, "d", "") === dTag
  );
}

function isPlaylistInLocalLibrary(playlist) {
  // Check if it's a local playlist
  if (isLocalPlaylist(playlist)) {
    const dTag = getValueFromTags(playlist, "d", "");
    return (app.playlists || []).some(
      (p) => isLocalPlaylist(p) && getValueFromTags(p, "d", "") === dTag
    );
  }
  
  // Check if it's bookmarked
  return isPlaylistBookmarked(playlist);
}
/**
 * Get unique playlist identifier
 */
function getPlaylistIdentifier(playlist) {
  const dTag = getValueFromTags(playlist, "d", "");
  return isLocalPlaylist(playlist) ? `local:${dTag}` : `${playlist.pubkey}:${dTag}`;
}


function savePlaylistsToStorage() {
  // Only save LOCAL playlists (pubkey === "local")
  const localPlaylists = (app.playlists || []).filter(isLocalPlaylist);
  localStorage.setItem('playlists', JSON.stringify(localPlaylists));
}

function saveBookmarkedPlaylistsToStorage() {
  // Only save NETWORK playlists (pubkey !== "local")
  const networkPlaylists = (app.bookmarkedPlaylists || []).filter(p => !isLocalPlaylist(p));
  localStorage.setItem('bookmarkedPlaylists', JSON.stringify(networkPlaylists));
}

function savePlaylistHistoryToStorage() {
  // History can contain both types
  localStorage.setItem('playlistHistory', JSON.stringify(app.playlistHistory || []));
}

function loadPlaylistsFromStorage() {
  try {
    const stored = localStorage.getItem('playlists');
    app.playlists = stored ? JSON.parse(stored).filter(isLocalPlaylist) : [];
  } catch (error) {
    console.error('Error loading playlists:', error);
  //  app.playlists = [];
  }
}

function loadBookmarkedPlaylistsFromStorage() {
  try {
    const stored = localStorage.getItem('bookmarkedPlaylists');
    app.bookmarkedPlaylists = stored ? JSON.parse(stored).filter(p => !isLocalPlaylist(p)) : [];
  } catch (error) {
    console.error('Error loading bookmarked playlists:', error);
  //  app.bookmarkedPlaylists = [];
  }
}

function loadPlaylistHistoryFromStorage() {
  try {
    const stored = localStorage.getItem('playlistHistory');
    app.playlistHistory = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading playlist history:', error);
  //  app.playlistHistory = [];
  }
}

function bookmarkPlaylist(networkPlaylist) {
  // Validate: Cannot bookmark local playlists
  if (isLocalPlaylist(networkPlaylist)) {
    throw new Error("Cannot bookmark local playlists");
  }
  
  try {
    app.bookmarkedPlaylists = app.bookmarkedPlaylists || [];
    const dTag = getValueFromTags(networkPlaylist, "d", "");
    
    // Check if already bookmarked
    const existingIndex = app.bookmarkedPlaylists.findIndex(
      (p) => p.pubkey === networkPlaylist.pubkey && 
             getValueFromTags(p, "d", "") === dTag
    );
    
    if (existingIndex !== -1) {
      throw new Error("Already bookmarked");
    }
    
    // Add to bookmarked playlists ONLY
    app.bookmarkedPlaylists.push({ ...networkPlaylist });
    saveBookmarkedPlaylistsToStorage();
    
  } catch (error) {
    console.error("Error bookmarking playlist:", error);
    throw error;
  }
}

function unbookmarkPlaylist(playlist) {
  try {
    app.bookmarkedPlaylists = app.bookmarkedPlaylists || [];
    const dTag = getValueFromTags(playlist, "d", "");
    
    // Remove from bookmarked playlists ONLY
    app.bookmarkedPlaylists = app.bookmarkedPlaylists.filter(p => 
      !(p.pubkey === playlist.pubkey && getValueFromTags(p, "d", "") === dTag)
    );
    
    saveBookmarkedPlaylistsToStorage();
    
  } catch (error) {
    console.error("Error unbookmarking playlist:", error);
    throw error;
  }
}

function countVideoReferences(playlist) {
  if (!playlist.tags || !Array.isArray(playlist.tags)) {
    return 0;
  }
    
  // Count e tags with valid video IDs
  return playlist.tags.filter(tag => {
    if (!Array.isArray(tag) || tag.length < 2 || tag[0] !== "e") return false;
    const videoId = tag[1];
    if (!videoId || typeof videoId !== "string") return false;
    return videoId.length === 64 && /^[a-fA-F0-9]{64}$/.test(videoId);
  }).length;
}
