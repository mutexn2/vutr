async function localPlaylistPageHandler() {
  const urlParts = window.location.hash.split('/');
  const dTag = urlParts[1];
  
  if (!dTag) {
    window.location.hash = '#localplaylists';
    return;
  }
  
  showPlaylistLoadingState();

  try {
    const playlists = app.playlists || [];
    const playlist = playlists.find(p => getValueFromTags(p, "d", "") === dTag);
    
    if (!playlist) {
      showPlaylistNotFound();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Fetch video events before rendering
    const videoTags = playlist.tags.filter(tag => tag[0] === "a");
    const videoEvents = await fetchVideoEvents(videoTags);
    
    renderSinglePlaylist(playlist, dTag, videoEvents);
    setupSinglePlaylistEventListeners(dTag);
    setupDragAndDrop(dTag);
    
  } catch (error) {
    console.error("Error rendering playlist page:", error);
    showPlaylistError(error);
  }
}

async function fetchVideoEvents(videoTags) {
  if (videoTags.length === 0) return [];
  
  console.log("Fetching video events for playlist...");
  
  // Extract video IDs from tags
  const videoIds = videoTags.map(tag => {
    const videoRef = tag[1]; // Format: "21:eventId"
    return videoRef.split(':')[1];
  });
  
  try {
    // Fetch all events at once
    const events = await NostrClient.getEvents({
      ids: videoIds,
      kinds: [21, 22],
      limit: videoIds.length,
      maxWait: 3000,
      timeout: 5000
    });
    
    console.log(`Found ${events?.length || 0} video events out of ${videoIds.length} requested`);
    
    // Create a map for quick lookup
    const eventMap = new Map();
    if (events && events.length > 0) {
      events.forEach(event => eventMap.set(event.id, event));
    }
    
    // Create result array with events or placeholders
    return videoIds.map(id => {
      const event = eventMap.get(id);
      if (event) {
        return event;
      } else {
        // Create placeholder event
        return createPlaceholderEvent(id);
      }
    });
    
  } catch (error) {
    console.error("Error fetching video events:", error);
    // Return placeholders for all videos if fetch fails
    return videoIds.map(id => createPlaceholderEvent(id));
  }
}

function createPlaceholderEvent(videoId) {
  return {
    id: videoId,
    kind: 21,
    pubkey: '',
    created_at: 0,
    content: '',
    tags: [
      ['title', 'Video not found'],
      ['alt', 'This video could not be loaded from the network']
    ],
    sig: '',
    isPlaceholder: true
  };
}

function showPlaylistLoadingState() {
  mainContent.innerHTML = `
      <h1>Playlist</h1>
      <div class="loading-indicator">
        <p>Loading playlist and videos...</p>
      </div>
  `;
}

function showPlaylistNotFound() {
  mainContent.innerHTML = `
      <div class="empty-state">
        <h1>Playlist Not Found</h1>
        <p>The playlist you're looking for doesn't exist.</p>
      </div>
  `;
}

function showPlaylistError(error) {
  mainContent.innerHTML = `
      <h1>Error</h1>
      <div class="error-message">
        <p>Error loading playlist: ${formatErrorForDisplay(error)}</p>
      </div>
  `;
}


function renderSinglePlaylist(playlist, dTag, videoEvents = []) {
  const title = getValueFromTags(playlist, "title", "Untitled Playlist");
  const description = getValueFromTags(playlist, "description", "");
  const image = getValueFromTags(playlist, "image", "");
  const videoTags = playlist.tags.filter(tag => tag[0] === "a");
  
  mainContent.innerHTML = `
      <div class="playlist-header">
        <div class="playlist-info">
          <div class="playlist-thumbnail">
            ${image ? 
              `<img src="${escapeHtml(image)}" alt="Playlist thumbnail" loading="lazy">` :
              `<div class="no-thumbnail">📹</div>`
            }
          </div>
          <div class="playlist-details">
            <h1 class="playlist-title">${escapeHtml(title)}</h1>
            ${description ? `<p class="playlist-description">${escapeHtml(description)}</p>` : ''}
            <div class="playlist-meta">
              <span class="video-count">${videoTags.length} videos</span>
              <span class="created-date">Created ${escapeHtml(getRelativeTime(playlist.created_at))}</span>
            </div>
          </div>
        </div>
        <div class="playlist-actions">
          <button class="btn-primary share-playlist-btn" data-d-tag="${escapeHtml(dTag)}">Share to Network</button>
          <button class="btn-secondary edit-playlist-btn" data-d-tag="${escapeHtml(dTag)}">Edit Playlist</button>
          <button class="btn-danger delete-playlist-btn" data-d-tag="${escapeHtml(dTag)}">Delete Playlist</button>
        </div>
      </div>
      
      <div class="playlist-content">
        <div class="playlist-videos" id="playlist-videos">
          ${renderPlaylistVideos(videoEvents, dTag)}
        </div>
      </div>
  `;
}

function renderPlaylistVideos(videoEvents, dTag) {
  if (videoEvents.length === 0) {
    return `
      <div class="empty-playlist">
        <p>This playlist is empty. Add some videos to get started!</p>
        <a href="#home" class="nav-link">Browse Videos</a>
      </div>
    `;
  }
  
  return videoEvents.map((event, index) => {
    return `
      <div class="playlist-video-item ${event.isPlaceholder ? 'placeholder-video' : ''}" 
           data-video-id="${escapeHtml(event.id)}" 
           data-index="${index}"
           draggable="true">
        <div class="drag-handle">⋮⋮</div>
        ${renderVideoThumbnail(event)}
        ${renderVideoDetails(event, index + 1)}
        <div class="video-actions">
          <button class="btn-secondary remove-video-btn" 
                  data-video-id="${escapeHtml(event.id)}" 
                  data-d-tag="${escapeHtml(dTag)}">
            ×
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderVideoThumbnail(event) {
  if (event.isPlaceholder) {
    return `
      <div class="video-thumbnail placeholder-thumbnail">
        <div class="placeholder-icon">📹</div>
      </div>
    `;
  }
  
  // Try to get thumbnail from imeta tag
  const imetaTag = event.tags.find(tag => tag[0] === 'imeta');
  let thumbnailUrl = '';
  
  if (imetaTag) {
    // Look for image URL in imeta tag
    const imageEntry = imetaTag.find(entry => entry.startsWith('image '));
    if (imageEntry) {
      thumbnailUrl = imageEntry.replace('image ', '');
    }
  }
  
  const duration = getValueFromTags(event, 'duration', '');
  const durationDisplay = duration ? formatDuration(parseFloat(duration)) : '';
  
  return `
    <div class="video-thumbnail">
      ${thumbnailUrl ? 
        `<img src="${escapeHtml(thumbnailUrl)}" alt="Video thumbnail" loading="lazy">` :
        `<div class="no-thumbnail">📹</div>`
      }
      ${durationDisplay ? `<div class="duration-badge">${durationDisplay}</div>` : ''}
    </div>
  `;
}

function renderVideoDetails(event, position) {
  const title = getValueFromTags(event, 'title', event.isPlaceholder ? 'Video not found' : 'Untitled Video');
  const description = event.content || '';
  const publishedAt = getValueFromTags(event, 'published_at', event.created_at.toString());
  const tags = event.tags.filter(tag => tag[0] === 't').map(tag => tag[1]);
  const author = event.pubkey.slice(0, 8) + '...';
  
  // Truncate long descriptions
  const maxDescLength = 120;
  const truncatedDesc = description.length > maxDescLength 
    ? description.slice(0, maxDescLength) + '...' 
    : description;
  
  return `
    <div class="video-details">
      <h3 class="video-title">${escapeHtml(title)}</h3>
      
      ${truncatedDesc ? `<p class="video-description">${escapeHtml(truncatedDesc)}</p>` : ''}
      
      <div class="video-meta">
        ${!event.isPlaceholder ? `<span class="video-author">by ${escapeHtml(author)}</span>` : ''}
        ${publishedAt && !event.isPlaceholder ? `<span class="video-date">${escapeHtml(getRelativeTime(parseInt(publishedAt)))}</span>` : ''}
        <span class="video-kind">Kind ${event.kind}</span>
      </div>
      
      ${tags.length > 0 ? `
        <div class="video-tags">
          ${tags.slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          ${tags.length > 3 ? `<span class="tag-more">+${tags.length - 3}</span>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}


function renderVideoActions(event, dTag) {
  return `
    <div class="video-actions">
      <button class="btn-primary watch-video-btn" 
              data-video-id="${escapeHtml(event.id)}"
              ${event.isPlaceholder ? 'disabled' : ''}>
        ${event.isPlaceholder ? 'Unavailable' : 'Watch'}
      </button>
      <button class="btn-secondary remove-video-btn" 
              data-video-id="${escapeHtml(event.id)}" 
              data-d-tag="${escapeHtml(dTag)}">
        Remove
      </button>
    </div>
  `;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

function setupSinglePlaylistEventListeners(dTag) {
  // Make entire video item clickable to watch video
  document.querySelectorAll('.playlist-video-item').forEach(item => {
    if (!item.classList.contains('placeholder-video')) {
      item.addEventListener('click', (e) => {
        // Don't navigate if clicking on remove button or drag handle
        if (e.target.closest('.remove-video-btn') || e.target.closest('.drag-handle')) {
          return;
        }
        const videoId = item.dataset.videoId;
        window.location.hash = `#watch/${videoId}`;
      });
      
      // Add hover cursor
      item.style.cursor = 'pointer';
    }
  });
  

document.querySelectorAll('.remove-video-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent video navigation
    const videoId = btn.dataset.videoId;
    const dTag = btn.dataset.dTag;
    
    if (confirm('Remove this video from the playlist?')) {
      const success = removeVideoFromPlaylist(dTag, videoId);
      
      if (success) {
        showTemporaryNotification('Video removed from playlist');
        // Remove the video item from UI instead of reloading
        removeVideoFromUI(videoId);
        updatePlaylistVideoCount();
      }
    }
  });
});
  
  // Share playlist button
  document.querySelector('.share-playlist-btn').addEventListener('click', async () => {
    const shareBtn = document.querySelector('.share-playlist-btn');
    const originalText = shareBtn.textContent;
    
    try {
      shareBtn.textContent = 'Sharing...';
      shareBtn.disabled = true;
      
      await sharePlaylistToNetwork(dTag);
      
      shareBtn.textContent = 'Shared!';
      setTimeout(() => {
        shareBtn.textContent = originalText;
        shareBtn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error sharing playlist:', error);
      shareBtn.textContent = 'Share Failed';
      setTimeout(() => {
        shareBtn.textContent = originalText;
        shareBtn.disabled = false;
      }, 2000);
      
      alert('Failed to share playlist: ' + error.message);
    }
  });

  // Edit playlist button
  document.querySelector('.edit-playlist-btn').addEventListener('click', () => {
    const dTag = document.querySelector('.edit-playlist-btn').dataset.dTag;
    showPlaylistModal(dTag);
  });
  
  // Delete playlist button
  document.querySelector('.delete-playlist-btn').addEventListener('click', () => {
    const dTag = document.querySelector('.delete-playlist-btn').dataset.dTag;
    const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
    const title = playlist ? getValueFromTags(playlist, "title", "Untitled Playlist") : "playlist";
    
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      app.playlists = app.playlists.filter(p => getValueFromTags(p, "d", "") !== dTag);
      savePlaylistsToStorage();
      showTemporaryNotification('Playlist deleted');
      window.location.hash = '#localplaylists';
    }
  });
}



function setupDragAndDrop(dTag) {
  const playlistVideos = document.getElementById('playlist-videos');
  let draggedElement = null;
  let draggedIndex = null;
  
  if (!playlistVideos) return;
  
  playlistVideos.addEventListener('dragstart', (e) => {
    if (!e.target.closest('.playlist-video-item')) return;
    
    draggedElement = e.target.closest('.playlist-video-item');
    draggedIndex = parseInt(draggedElement.dataset.index);
    
    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  
  playlistVideos.addEventListener('dragend', (e) => {
    if (draggedElement) {
      draggedElement.classList.remove('dragging');
      // Remove all drop indicators
      document.querySelectorAll('.drop-indicator').forEach(indicator => {
        indicator.remove();
      });
      draggedElement = null;
      draggedIndex = null;
    }
  });
  
  playlistVideos.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(playlistVideos, e.clientY);
    const dragIndicator = document.querySelector('.drop-indicator') || createDropIndicator();
    
    if (afterElement == null) {
      playlistVideos.appendChild(dragIndicator);
    } else {
      playlistVideos.insertBefore(dragIndicator, afterElement);
    }
  });
  
  playlistVideos.addEventListener('drop', (e) => {
    e.preventDefault();
    
    const afterElement = getDragAfterElement(playlistVideos, e.clientY);
    let newIndex;
    
    if (afterElement == null) {
      newIndex = playlistVideos.children.length - 1;
    } else {
      newIndex = parseInt(afterElement.dataset.index);
      if (newIndex > draggedIndex) {
        newIndex -= 1;
      }
    }
    
    if (newIndex !== draggedIndex) {
      reorderPlaylistVideo(dTag, draggedIndex, newIndex);
    }
    
    // Clean up
    document.querySelectorAll('.drop-indicator').forEach(indicator => {
      indicator.remove();
    });
  });
  
  playlistVideos.addEventListener('dragleave', (e) => {
    if (!playlistVideos.contains(e.relatedTarget)) {
      document.querySelectorAll('.drop-indicator').forEach(indicator => {
        indicator.remove();
      });
    }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.playlist-video-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function createDropIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';
  return indicator;
}

function reorderPlaylistVideo(dTag, fromIndex, toIndex) {
  const playlists = app.playlists || [];
  const playlist = playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  
  if (!playlist) return false;
  
  const videoTags = playlist.tags.filter(tag => tag[0] === "a");
  const otherTags = playlist.tags.filter(tag => tag[0] !== "a");
  
  // Reorder the video tags
  const movedVideo = videoTags.splice(fromIndex, 1)[0];
  videoTags.splice(toIndex, 0, movedVideo);
  
  // Update the playlist with reordered tags
  playlist.tags = [...otherTags, ...videoTags];
  
  // Save to storage
  savePlaylistsToStorage();
  
  // Update UI in place instead of refreshing
  updatePlaylistOrder(fromIndex, toIndex);
  
  return true;
}

function updatePlaylistOrder(fromIndex, toIndex) {
  const playlistVideos = document.getElementById('playlist-videos');
  const videoItems = [...playlistVideos.querySelectorAll('.playlist-video-item')];
  
  // Move the DOM element
  const movedItem = videoItems[fromIndex];
  
  // Handle case where we're moving to the end
  if (toIndex >= videoItems.length - 1) {
    // Moving to the end
    playlistVideos.appendChild(movedItem);
  } else {
    const targetItem = videoItems[toIndex];
    
    if (fromIndex < toIndex) {
      // Moving down - insert after target
      if (targetItem.nextSibling) {
        playlistVideos.insertBefore(movedItem, targetItem.nextSibling);
      } else {
        playlistVideos.appendChild(movedItem);
      }
    } else {
      // Moving up - insert before target
      playlistVideos.insertBefore(movedItem, targetItem);
    }
  }
  
  // Update data-index attributes for all items
  const updatedItems = [...playlistVideos.querySelectorAll('.playlist-video-item')];
  updatedItems.forEach((item, index) => {
    item.dataset.index = index;
  });
}

function removeVideoFromUI(videoId) {
  const videoItem = document.querySelector(`[data-video-id="${videoId}"]`);
  if (videoItem) {
    // Add a smooth removal animation
    videoItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    videoItem.style.opacity = '0';
    videoItem.style.transform = 'translateX(-20px)';
    
    // Remove from DOM after animation
    setTimeout(() => {
      videoItem.remove();
      
      // Update data-index attributes for remaining items
      updateRemainingVideoIndices();
      
      // Check if playlist is now empty
      checkIfPlaylistEmpty();
    }, 300);
  }
}

function updateRemainingVideoIndices() {
  const playlistVideos = document.getElementById('playlist-videos');
  const videoItems = [...playlistVideos.querySelectorAll('.playlist-video-item')];
  
  videoItems.forEach((item, index) => {
    item.dataset.index = index;
  });
}

function updatePlaylistVideoCount() {
  const videoCountElement = document.querySelector('.video-count');
  if (videoCountElement) {
    const currentCount = document.querySelectorAll('.playlist-video-item').length;
    // Account for the item that will be removed
    const newCount = Math.max(0, currentCount - 1);
    videoCountElement.textContent = `${newCount} video${newCount !== 1 ? 's' : ''}`;
  }
}

function checkIfPlaylistEmpty() {
  const playlistVideos = document.getElementById('playlist-videos');
  const videoItems = playlistVideos.querySelectorAll('.playlist-video-item');
  
  if (videoItems.length === 0) {
    playlistVideos.innerHTML = `
      <div class="empty-playlist">
        <p>This playlist is empty. Add some videos to get started!</p>
        <a href="#home" class="nav-link">Browse Videos</a>
      </div>
    `;
  }
}


////////////////////////

async function sharePlaylistToNetwork(dTag) {
  const playlists = app.playlists || [];
  const playlist = playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  
  if (!playlist) {
    throw new Error("Playlist not found");
  }

  const eventData = buildPlaylistEventData(playlist);
  
  try {
    console.log("Playlist event data:", eventData);
    const signedEvent = await handleEventSigning(eventData);
    
    // await publishEventToRelays(signedEvent);
    
    showTemporaryNotification('Playlist NOT shared to network successfully!');
    console.log("Playlist NOT shared successfully!", signedEvent);
    
    return signedEvent;
  } catch (error) {
    console.error("Error sharing playlist:", error);
    throw error;
  }
}


function buildPlaylistEventData(playlist) {
  const now = Math.floor(Date.now() / 1000);
  
  // Extract the tags from the local playlist, filtering out local-specific ones
  const localTags = playlist.tags || [];
  
  // Build the tags array for the network event
  const tags = localTags.filter(tag => {
    // Keep all tags except any local-specific ones you might want to exclude
    return tag[0] !== 'local_only'; // example of a tag you might want to exclude
  });
  
  // Generate a new d tag for the network version (or keep the same one)
  const dTag = getValueFromTags(playlist, "d", "");
  
  const networkDTag = dTag;
  // const networkDTag = dTag.replace('vutr-', ''); // Remove any local prefix if needed
  
  // Update the d tag for network sharing
  const updatedTags = tags.map(tag => {
    if (tag[0] === 'd') {
      return ['d', networkDTag];
    }
    return tag;
  });
  
  return {
    kind: 30005,
    created_at: now,
    content: playlist.content || "",
    tags: updatedTags
  };
}

