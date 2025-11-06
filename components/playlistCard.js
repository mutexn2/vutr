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

  function countVideoReferences(playlist) {
    if (!playlist.tags || !Array.isArray(playlist.tags)) {
      return 0;
    }
    
    return playlist.tags.filter(tag => {
      if (!Array.isArray(tag) || tag.length < 2 || tag[0] !== "a") {
        return false;
      }
      
      const aTagValue = tag[1];
      if (!aTagValue || typeof aTagValue !== "string" || 
          (!aTagValue.startsWith("21:") && !aTagValue.startsWith("22:"))) {
        return false;
      }
      
      const idPart = aTagValue.substring(3);
      return idPart.length === 64 && /^[a-fA-F0-9]{64}$/.test(idPart);
    }).length;
  }

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
    imageUrl || "https://cdn.nostrcheck.me/a605827e09ea5be22a06ac2ec7e2be3985cac6b0322f7621881adbe21a7d7fb6.jpeg"
  );

  // Create the card
  let card = document.createElement('div');
  card.className = 'video-card playlist-card';
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
          ${isSavedLocally && !isLocalPlaylist ? '<span class="saved-badge">💾 Saved</span>' : ''}
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
          <button class="menu-item playlist-sync">
            <span class="item-icon">🔄</span>
            <span class="item-text">Sync Playlist</span>
          </button>
          <button class="menu-item playlist-remove">
            <span class="item-icon">🗑️</span>
            <span class="item-text">Remove from Library</span>
          </button>
          <div class="menu-separator"></div>
          <button class="menu-item playlist-view-original">
            <span class="item-icon">🔗</span>
            <span class="item-text">View Original</span>
          </button>
        ` : `
          <button class="menu-item playlist-save">
            <span class="item-icon">💾</span>
            <span class="item-text">Save to Library</span>
          </button>
          <div class="menu-separator"></div>
          <button class="menu-item playlist-view-network">
            <span class="item-icon">🔗</span>
            <span class="item-text">View on Network</span>
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

  // ===== SAVED NETWORK PLAYLIST ACTIONS =====
  
  // Sync playlist (saved network playlists)
  const syncButton = menuElement.querySelector('.playlist-sync');
  if (syncButton) {
    syncButton.addEventListener('click', async () => {
      const originalText = syncButton.querySelector('.item-text').textContent;
      syncButton.querySelector('.item-text').textContent = 'Syncing...';
      syncButton.disabled = true;
      
      try {
        const updatedPlaylist = await syncNetworkPlaylist(playlist);
        if (updatedPlaylist) {
          savePlaylistsToStorage();
          showTemporaryNotification('Playlist synced successfully');
          
          // Refresh the page after a short delay
          setTimeout(() => {
            if (window.location.hash === '#localplaylists') {
              const playlists = app.playlists || [];
              renderPlaylistsGrid(playlists);
              setupPlaylistsEventListeners();
            }
          }, 500);
        } else {
          showTemporaryNotification('Playlist is already up to date');
        }
      } catch (error) {
        console.error('Error syncing playlist:', error);
        showTemporaryNotification('Failed to sync playlist');
        syncButton.querySelector('.item-text').textContent = originalText;
        syncButton.disabled = false;
      }
      
      playlistCardMenuControls?.close();
    });
  }

  // Remove from library (saved network playlists)
const removeButton = menuElement.querySelector('.playlist-remove');
if (removeButton) {
  removeButton.addEventListener('click', () => {
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
  // View original (saved network playlists)
  const viewOriginalButton = menuElement.querySelector('.playlist-view-original');
  if (viewOriginalButton) {
    viewOriginalButton.addEventListener('click', () => {
      const author = playlist.pubkey;
      const discoveryRelays = app.relays.slice(0, 3).map(cleanRelayUrl);
      const uniqueDiscoveryRelays = [...new Set(discoveryRelays)];
      const discoveryParam = uniqueDiscoveryRelays.join(",");
      
      window.location.hash = `#playlist/params?author=${author}&dtag=${dTag}&discovery=${discoveryParam}`;
      playlistCardMenuControls?.close();
    });
  }

  // ===== NETWORK PLAYLIST ACTIONS =====
  
const saveButton = menuElement.querySelector('.playlist-save');
if (saveButton) {
  // Replace single button with two options
  const menuItems = menuElement.querySelector('.menu-items');
  const saveMenuItem = menuElement.querySelector('.playlist-save').parentElement;
  
  saveMenuItem.innerHTML = `
    <button class="menu-item playlist-bookmark">
      <span class="item-icon">🔖</span>
      <span class="item-text">Bookmark Playlist</span>
    </button>
    <button class="menu-item playlist-create-copy">
      <span class="item-icon">📋</span>
      <span class="item-text">Create Local Copy</span>
    </button>
  `;
  
  // Bookmark action
  menuElement.querySelector('.playlist-bookmark').addEventListener('click', async () => {
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
  
  // Create local copy action
  menuElement.querySelector('.playlist-create-copy').addEventListener('click', () => {
    const newPlaylist = copyNetworkPlaylistToLocal(playlist);
    const newDTag = getValueFromTags(newPlaylist, "d", "");
    playlistCardMenuControls?.close();
    showTemporaryNotification('Local copy created');
    setTimeout(() => {
      window.location.hash = `#localplaylist/${newDTag}`;
    }, 500);
  });
}


  // View on network (network playlists not yet saved)
  const viewNetworkButton = menuElement.querySelector('.playlist-view-network');
  if (viewNetworkButton) {
    viewNetworkButton.addEventListener('click', () => {
      const author = playlist.pubkey;
      const discoveryRelays = app.relays.slice(0, 3).map(cleanRelayUrl);
      const uniqueDiscoveryRelays = [...new Set(discoveryRelays)];
      const discoveryParam = uniqueDiscoveryRelays.join(",");
      
      window.location.hash = `#playlist/params?author=${author}&dtag=${dTag}&discovery=${discoveryParam}`;
      playlistCardMenuControls?.close();
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