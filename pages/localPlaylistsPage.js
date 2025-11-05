async function localPlaylistsPageHandler() {
  showLoadingState("Loading your playlists...");

  try {
    const playlists = app.playlists || [];
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    if (playlists.length === 0) {
      showEmptyPlaylistsState();
      return;
    }

    playlists.sort((a, b) => b.created_at - a.created_at);
    renderPlaylistsGrid(playlists);
    setupPlaylistsEventListeners();
    
  } catch (error) {
    console.error("Error rendering playlists page:", error);
    showErrorState(`Error loading playlists: ${formatErrorForDisplay(error)}`);
  }
}

function showLoadingState(message) {
  mainContent.innerHTML = `
      <h1>My Playlists</h1>
      <div class="loading-indicator">
        <p>${message}</p>
      </div>
  `;
}

function showEmptyPlaylistsState() {
  mainContent.innerHTML = `
      <div class="empty-state">
        <h1>No Playlists Found</h1>
        <p>You haven't created any playlists yet. Start watching videos and save them to playlists!</p>
        <a href="#home" class="nav-link">Browse Videos</a>
      </div>
  `;
}

function showErrorState(message) {
  mainContent.innerHTML = `
      <h1>Error</h1>
      <div class="error-message">
        <p>${message}</p>
      </div>
  `;
}

function renderPlaylistsGrid(playlists) {
  const localPlaylists = playlists.filter(isLocalPlaylist);
  const networkPlaylists = playlists.filter(isNetworkPlaylist);
  
  mainContent.innerHTML = `
      <div class="playlists-header">
        <h1>Local Playlists (${playlists.length})</h1>
        <div class="playlists-actions">
          <button class="create-playlist-btn btn-primary">Create Playlist</button>
          ${networkPlaylists.length > 0 ? 
            '<button class="sync-all-btn btn-secondary">Sync All Network Playlists</button>' 
            : ''}
        </div>
      </div>
      
      ${networkPlaylists.length > 0 ? `
        <div class="playlists-section">
          <h2>Read-only (${networkPlaylists.length})</h2>
          <div class="playlists-grid">
            ${networkPlaylists.map(playlist => renderPlaylistCard(playlist)).join('')}
          </div>
        </div>
      ` : ''}
      
      ${localPlaylists.length > 0 ? `
        <div class="playlists-section">
          <h2>My Playlists (${localPlaylists.length})</h2>
          <div class="playlists-grid">
            ${localPlaylists.map(playlist => renderPlaylistCard(playlist)).join('')}
          </div>
        </div>
      ` : ''}
  `;
}
function renderPlaylistCard(playlist) {
  const dTag = getValueFromTags(playlist, "d", "");
  const title = getValueFromTags(playlist, "title", "Untitled Playlist");
  
  // Try to get thumbnail from either "image" or "thumb" tag
  const image = getValueFromTags(playlist, "image", "") || getValueFromTags(playlist, "thumb", "");
  
  const description = getValueFromTags(playlist, "description", "");
  
  // Count both kind 21 and kind 22 video references
  const videoCount = playlist.tags.filter(tag => {
    if (tag[0] !== "a") return false;
    const aTagValue = tag[1];
    return aTagValue && (aTagValue.startsWith("21:") || aTagValue.startsWith("22:"));
  }).length;
  
  const isLocal = isLocalPlaylist(playlist);
  
  return `
    <div class="playlist-card ${isLocal ? 'local-playlist' : 'network-playlist'}" data-d-tag="${escapeHtml(dTag)}">
      <div class="playlist-thumbnail">
        ${image ? 
          `<img src="${escapeHtml(image)}" alt="Playlist thumbnail" loading="lazy">` :
          `<div class="no-thumbnail">📹</div>`
        }
        <div class="playlist-badge ${isLocal ? 'local-badge' : 'network-badge'}">
          ${isLocal ? '💾 Local' : '📡 Network'}
        </div>
        ${isLocal ? `
          <div class="playlist-overlay">
            <button class="edit-playlist-btn" data-d-tag="${escapeHtml(dTag)}" title="Edit playlist">✏️</button>
            <button class="delete-playlist-btn" data-d-tag="${escapeHtml(dTag)}" title="Delete playlist">🗑️</button>
          </div>
        ` : ''}
      </div>
      <div class="playlist-info">
        <h3 class="playlist-title">${escapeHtml(title)}</h3>
        <p class="playlist-description">${escapeHtml(truncateText(description, 80))}</p>
        <div class="playlist-meta">
          <span class="video-count">${videoCount} videos</span>
          <span class="created-date">${escapeHtml(getRelativeTime(playlist.created_at))}</span>
        </div>
        ${!isLocal ? `
          <div class="playlist-author" data-pubkey="${escapeHtml(playlist.pubkey)}">
            <div class="playlist-author-image"></div>
            <div class="playlist-author-name"></div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function setupPlaylistsEventListenersForGrid(gridElement) {
  // Playlist card clicks
  gridElement.querySelectorAll('.playlist-card').forEach(card => {
    card.addEventListener('click', handlePlaylistCardClick);
  });
  
  // Edit playlist buttons (only for local playlists)
  gridElement.querySelectorAll('.edit-playlist-btn').forEach(btn => {
    btn.addEventListener('click', handleEditPlaylistClick);
  });
  
  // Delete playlist buttons
  gridElement.querySelectorAll('.delete-playlist-btn').forEach(btn => {
    btn.addEventListener('click', handleDeletePlaylistClick);
  });
  
  // Initialize author information for network playlists
  gridElement.querySelectorAll('.playlist-author').forEach(authorElement => {
    const pubkey = authorElement.dataset.pubkey;
    
    // Create and append nostr-picture element
    const imageContainer = authorElement.querySelector('.playlist-author-image');
    const creatorImage = document.createElement('nostr-picture');
    creatorImage.className = 'author-picture';
    creatorImage.setAttribute('pubkey', pubkey);
    imageContainer.appendChild(creatorImage);
    
    // Create and append nostr-name element
    const nameContainer = authorElement.querySelector('.playlist-author-name');
    const creatorName = document.createElement('nostr-name');
    creatorName.className = 'author-name';
    creatorName.setAttribute('pubkey', pubkey);
    nameContainer.appendChild(creatorName);
    
    // Make author section clickable
    authorElement.style.cursor = 'pointer';
    authorElement.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.hash = `#profile/${pubkey}`;
    });
  });
}

// Update the main setup function to use the grid-specific version
function setupPlaylistsEventListeners() {
  const playlistsGrids = document.querySelectorAll('.playlists-grid');
  
  playlistsGrids.forEach(grid => {
    setupPlaylistsEventListenersForGrid(grid);
  });
  
  // Create playlist button
  const createBtn = document.querySelector('.create-playlist-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      showPlaylistModal();
    });
  }

  // Sync all network playlists button
  const syncAllBtn = document.querySelector('.sync-all-btn');
  if (syncAllBtn) {
    syncAllBtn.addEventListener('click', async () => {
      const originalText = syncAllBtn.textContent;
      syncAllBtn.textContent = 'Syncing...';
      syncAllBtn.disabled = true;
      
      const networkPlaylists = app.playlists.filter(isNetworkPlaylist);
      let updatedCount = 0;
      
      for (const playlist of networkPlaylists) {
        try {
          const updatedPlaylist = await syncNetworkPlaylist(playlist);
          if (updatedPlaylist) {
            updatedCount++;
          }
        } catch (error) {
          console.error('Error syncing playlist:', error);
        }
      }
      
      if (updatedCount > 0) {
        savePlaylistsToStorage();
        showTemporaryNotification(`Updated ${updatedCount} playlist(s)`);
        setTimeout(() => location.reload(), 1000);
      } else {
        showTemporaryNotification('All playlists are up to date');
        syncAllBtn.textContent = originalText;
        syncAllBtn.disabled = false;
      }
    });
  }
}


function handlePlaylistCardClick(e) {
  if (e.target.closest('.playlist-overlay')) return;
  
  const dTag = e.currentTarget.dataset.dTag;
  window.location.hash = `#localplaylist/${dTag}`;
}

function handleEditPlaylistClick(e) {
  e.stopPropagation();
  const dTag = e.currentTarget.dataset.dTag;
  showPlaylistModal(dTag);
}

function handleDeletePlaylistClick(e) {
  e.stopPropagation();
  const dTag = e.currentTarget.dataset.dTag;
  const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  const title = playlist ? getValueFromTags(playlist, "title", "Untitled Playlist") : "playlist";
  
  if (playlist && confirm(`Are you sure you want to delete "${title}"?`)) {
    app.playlists = app.playlists.filter(p => getValueFromTags(p, "d", "") !== dTag);
    savePlaylistsToStorage();
    showTemporaryNotification('Playlist deleted');
  //  location.reload();
  // updatePlaylistsGridWithNewPlaylist(playlist);
    const playlists = app.playlists || [];
    renderPlaylistsGrid(playlists);
    setupPlaylistsEventListeners();  
  }
}

function showPlaylistModal(dTag = null) {
  const isEditing = !!dTag;
  const playlist = isEditing ? app.playlists.find(p => getValueFromTags(p, "d", "") === dTag) : null;
  
  const currentTitle = isEditing ? getValueFromTags(playlist, "title", "") : "";
  const currentDescription = isEditing ? getValueFromTags(playlist, "description", "") : "";
  const currentImage = isEditing ? getValueFromTags(playlist, "image", "") : "";
  
  const content = `
      <div class="modal-header">
        <h3>${isEditing ? 'Edit Playlist' : 'Create New Playlist'}</h3>
      </div>
      <div class="modal-content">
        <form class="playlist-form">
          <div class="form-group">
            <label for="playlist-title">Title:</label>
            <input type="text" id="playlist-title" class="form-input" value="${escapeHtml(currentTitle)}" placeholder="Enter playlist title" maxlength="50" required>
          </div>
          <div class="form-group">
            <label for="playlist-description">Description:</label>
            <textarea id="playlist-description" class="form-input" placeholder="Enter playlist description" maxlength="200">${escapeHtml(currentDescription)}</textarea>
          </div>
          <div class="form-group">
            <label for="playlist-image">Image URL:</label>
            <input type="url" id="playlist-image" class="form-input" value="${escapeHtml(currentImage)}" placeholder="Enter image URL (optional)">
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary cancel-btn">Cancel</button>
            <button type="submit" class="btn-primary save-btn">${isEditing ? 'Save Changes' : 'Create Playlist'}</button>
          </div>
        </form>
      </div>
  `;

  const modal = openModal({
    title: isEditing ? 'Edit Playlist' : 'Create Playlist',
    content,
    size: 'medium',
    customClass: 'playlist-modal'
  });

  const form = modal.querySelector('.playlist-form');
  
  modal.querySelector('.cancel-btn')?.addEventListener('click', closeModal);
  
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = modal.querySelector('#playlist-title').value.trim();
    const description = modal.querySelector('#playlist-description').value.trim();
    const image = modal.querySelector('#playlist-image').value.trim();
    
    if (!title) {
      modal.querySelector('#playlist-title').focus();
      showTemporaryNotification('Please enter a playlist title');
      return;
    }
    
    if (isEditing) {
      updatePlaylist(dTag, title, description, image);
      showTemporaryNotification('Playlist updated');
      
      setTimeout(() => {
        // Check which page we're on
        const currentHash = window.location.hash;
        
        if (currentHash === '#localplaylists') {
          // We're on the playlists grid page - re-render the grid
          const playlists = app.playlists || [];
          renderPlaylistsGrid(playlists);
          setupPlaylistsEventListeners();
        } else if (currentHash.startsWith('#localplaylist/')) {
          // We're on a single playlist page - re-render that playlist
          localPlaylistPageHandler();
        }
      }, 500);

    } else {
      createPlaylist(title, description, image);
      showTemporaryNotification(`Playlist "${title}" created`);
    }
    
    closeModal();
  });
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function createPlaylist(title, description = "", image = "") {
  const dTag = `vutr-${generateId()}`;
  
  const playlist = {
    id: generateId(),
    pubkey: "local",
    created_at: Math.floor(Date.now() / 1000),
    kind: 30005,
    tags: [
      ["d", dTag],
      ["title", title],
      ...(description ? [["description", description]] : []),
      ...(image ? [["image", image]] : [])
    ],
    content: "",
    sig: "local"
  };
  
  app.playlists = app.playlists || [];
  app.playlists.push(playlist);
  savePlaylistsToStorage();
  
  // Only update the UI grid if we're currently on the localplaylists page
  if (window.location.hash === '#localplaylists') {
    updatePlaylistsGridWithNewPlaylist(playlist);
  }
  
  return playlist;
}
function updatePlaylistsGridWithNewPlaylist(newPlaylist) {
  const localPlaylistsSection = document.querySelector('.playlists-section:last-child');
  const localPlaylistsGrid = localPlaylistsSection?.querySelector('.playlists-grid');
  
  if (localPlaylistsGrid) {
    // Add new playlist card to existing grid
    const newCard = createPlaylistCardElement(newPlaylist);
    localPlaylistsGrid.insertBefore(newCard, localPlaylistsGrid.firstChild);
    
    // Re-attach event listeners to ALL playlist cards in the grid
    reattachPlaylistCardEventListeners(localPlaylistsGrid);
  } else {
    // If no grid exists yet, re-render the entire section
    const playlists = app.playlists || [];
    renderPlaylistsGrid(playlists);
    setupPlaylistsEventListeners();
  }
}

// Helper function to reattach event listeners to all playlist cards
function reattachPlaylistCardEventListeners(playlistsGrid) {
  // Remove existing event listeners by cloning and replacing
  const newGrid = playlistsGrid.cloneNode(true);
  playlistsGrid.parentNode.replaceChild(newGrid, playlistsGrid);
  
  // Re-attach all event listeners
  setupPlaylistsEventListenersForGrid(newGrid);
}

// Helper function to create DOM element from playlist card HTML
function createPlaylistCardElement(playlist) {
  const cardHTML = renderPlaylistCard(playlist);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cardHTML;
  return tempDiv.firstElementChild;
}

function updatePlaylist(dTag, title, description, image) {
  const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  if (!playlist) return false;
  
  // Only regenerate ID for truly local playlists
  if (isLocalPlaylist(playlist)) {
    playlist.id = generateId();
    playlist.created_at = Math.floor(Date.now() / 1000);
  }
  // For network playlists saved locally, keep original metadata
  // but update the tags
  
  playlist.tags = playlist.tags.filter(tag => !["title", "description", "image"].includes(tag[0]));
  playlist.tags.push(["title", title]);
  if (description) playlist.tags.push(["description", description]);
  if (image) playlist.tags.push(["image", image]);
  
  savePlaylistsToStorage();
  return true;
}

function addVideoToPlaylist(dTag, videoId, kind = 21) {
  const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  if (!playlist) return false;
  
  const videoRef = `${kind}:${videoId}`;
  const existingVideoTag = playlist.tags.find(tag => tag[0] === "a" && tag[1] === videoRef);
  if (existingVideoTag) {
    showTemporaryNotification("Video already in this playlist");
    return false;
  }
  
  playlist.tags.push(["a", videoRef]);
  playlist.created_at = Math.floor(Date.now() / 1000);
  playlist.id = generateId();
  
  savePlaylistsToStorage();
  return true;
}

function removeVideoFromPlaylist(dTag, videoId, kind = 21) {
  const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  if (!playlist) return false;
  
  const videoRef = `${kind}:${videoId}`;
  playlist.tags = playlist.tags.filter(tag => !(tag[0] === "a" && tag[1] === videoRef));
  playlist.created_at = Math.floor(Date.now() / 1000);
  playlist.id = generateId();
  
  savePlaylistsToStorage();
  return true;
}
function savePlaylistsToStorage() {
  localStorage.setItem('playlists', JSON.stringify(app.playlists || []));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}



