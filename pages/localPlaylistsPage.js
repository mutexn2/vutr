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
  mainContent.innerHTML = `
      <div class="playlists-header">
        <h1>My Local Playlists (${playlists.length})</h1>
        <div class="playlists-actions">
          <button class="create-playlist-btn btn-primary">Create Playlist</button>
        </div>
      </div>
      <div class="playlists-grid">
        ${playlists.map(playlist => renderPlaylistCard(playlist)).join('')}
      </div>
  `;
}

function renderPlaylistCard(playlist) {
  const dTag = getValueFromTags(playlist, "d", "");
  const title = getValueFromTags(playlist, "title", "Untitled Playlist");
  const image = getValueFromTags(playlist, "image", "");
  const description = getValueFromTags(playlist, "description", "");
  const videoCount = playlist.tags.filter(tag => tag[0] === "a").length;
  
  return `
    <div class="playlist-card" data-d-tag="${escapeHtml(dTag)}">
      <div class="playlist-thumbnail">
        ${image ? 
          `<img src="${escapeHtml(image)}" alt="Playlist thumbnail" loading="lazy">` :
          `<div class="no-thumbnail">📹</div>`
        }
        <div class="playlist-overlay">
          <button class="edit-playlist-btn" data-d-tag="${escapeHtml(dTag)}" title="Edit playlist">✏️</button>
          <button class="delete-playlist-btn" data-d-tag="${escapeHtml(dTag)}" title="Delete playlist">🗑️</button>
        </div>
      </div>
      <div class="playlist-info">
        <h3 class="playlist-title">${escapeHtml(title)}</h3>
        <p class="playlist-description">${escapeHtml(truncateText(description, 80))}</p>
        <div class="playlist-meta">
          <span class="video-count">${videoCount} videos</span>
          <span class="created-date">${escapeHtml(getRelativeTime(playlist.created_at))}</span>
        </div>
      </div>
    </div>
  `;
}

function setupPlaylistsEventListeners() {
  // Playlist card clicks
  document.querySelectorAll('.playlist-card').forEach(card => {
    card.addEventListener('click', handlePlaylistCardClick);
  });
  
  // Edit playlist buttons
  document.querySelectorAll('.edit-playlist-btn').forEach(btn => {
    btn.addEventListener('click', handleEditPlaylistClick);
  });
  
  // Delete playlist buttons
  document.querySelectorAll('.delete-playlist-btn').forEach(btn => {
    btn.addEventListener('click', handleDeletePlaylistClick);
  });
  

  // Create playlist button
  document.querySelector('.create-playlist-btn').addEventListener('click', () => {
    showPlaylistModal();
  });
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
    location.reload();
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
      <!--  <h3>${isEditing ? 'Edit Playlist' : 'Create New Playlist'}</h3> -->
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

  // Focus and setup handlers
//  const titleInput = modal.querySelector('#playlist-title');
  const form = modal.querySelector('.playlist-form');
  
 // titleInput?.focus();

  // Event listeners
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
    //  showTemporaryNotification('Playlist updated');
    
    } else {
      createPlaylist(title, description, image);
    //  showTemporaryNotification(`Playlist "${title}" created`);
    
    }
    
    closeModal();
    location.reload();
  });
}


function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Updated playlist management functions
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
  return playlist;
}

function updatePlaylist(dTag, title, description, image) {
  const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  if (!playlist) return false;
  
  // Update playlist tags
  playlist.tags = playlist.tags.filter(tag => !["title", "description", "image"].includes(tag[0]));
  playlist.tags.push(["title", title]);
  if (description) playlist.tags.push(["description", description]);
  if (image) playlist.tags.push(["image", image]);
  
  // Update playlist metadata
  playlist.created_at = Math.floor(Date.now() / 1000);
  playlist.id = generateId();
  
  savePlaylistsToStorage();
  return true;
}

function addVideoToPlaylist(dTag, videoId) {
  const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  if (!playlist) return false;
  
  const existingVideoTag = playlist.tags.find(tag => tag[0] === "a" && tag[1] === `21:${videoId}`);
  if (existingVideoTag) {
    showTemporaryNotification("Video already in this playlist");
    return false;
  }
  
  playlist.tags.push(["a", `21:${videoId}`]);
  playlist.created_at = Math.floor(Date.now() / 1000);
  playlist.id = generateId();
  
  savePlaylistsToStorage();
  return true;
}

function removeVideoFromPlaylist(dTag, videoId) {
  const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  if (!playlist) return false;
  
  playlist.tags = playlist.tags.filter(tag => !(tag[0] === "a" && tag[1] === `21:${videoId}`));
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



