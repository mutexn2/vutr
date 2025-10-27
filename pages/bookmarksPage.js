async function bookmarksPageHandler() {
    mainContent.innerHTML = `
     <div id="bookmarksPage-container">
      <h1>My Bookmarks</h1>
      <div class="loading-indicator">
        <p>Loading your saved videos...</p>
      </div>
      </div>
  `;

   let pageContainer = document.getElementById("bookmarksPage-container");

  try {
    // Get bookmark playlist
    const bookmarkPlaylist = app.bookmarkPlaylist;
    
    if (!bookmarkPlaylist) {
        pageContainer.innerHTML = `
      <div class="empty-state">
        <h1>No Bookmarks Found</h1>
        <p>You haven't saved any videos yet. Start watching videos and click the save button to bookmark them!</p>
        <a href="#home" class="nav-link">Browse Videos</a>
      </div>
  `;
      return;
    }

    // Get video references from the playlist
    const videoTags = bookmarkPlaylist.tags.filter(tag => tag[0] === "a");
    
    if (videoTags.length === 0) {
       pageContainer.innerHTML = `
      <div class="empty-state">
        <h1>No Bookmarks Found</h1>
        <p>You haven't saved any videos yet. Start watching videos and click the save button to bookmark them!</p>
        <a href="#home" class="nav-link">Browse Videos</a>
      </div>
  `;
      return;
    }

    console.log("Loaded bookmark playlist:", bookmarkPlaylist);

    // Delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Fetch video events (reuse the same function from playlists)
    const videoEvents = await fetchVideoEvents(videoTags);
    
      const title = getValueFromTags(bookmarkPlaylist, "title", "My Bookmarks");
  const description = getValueFromTags(bookmarkPlaylist, "description", "Your saved videos");
  
  
  pageContainer.innerHTML = `
      <div class="playlist-header bookmarks-header">
        <div class="playlist-info">
          <div class="playlist-thumbnail">
            <div class="no-thumbnail">🔖</div>
          </div>
          <div class="playlist-details">
            <h1 class="playlist-title">${escapeHtml(title)}</h1>
            <p class="playlist-description">${escapeHtml(description)}</p>
            <div class="playlist-meta">
              <span class="video-count">${videoTags.length} videos</span>
              <span class="created-date">Updated ${escapeHtml(getRelativeTime(bookmarkPlaylist.created_at))}</span>
            </div>
          </div>
        </div>
        <div class="playlist-actions">
          ${app.isLoggedIn ? `
            <button class="btn-primary sync-bookmarks-btn">🔄 Sync</button>
            <button class="btn-secondary share-bookmarks-btn">📤 Share</button>
          ` : ''}
          
        </div>
      </div>
      
      <div class="playlist-content">
        <div class="playlist-videos" id="bookmark-videos">
          ${renderBookmarkVideos(videoEvents)}
        </div>
      </div>
  `;
    setupBookmarksEventListeners();
    setupBookmarksDragAndDrop();
    
  } catch (error) {
    console.error("Error rendering bookmarks page:", error);
      pageContainer.innerHTML = `
      <h1>Error</h1>
      <div class="error-message">
        <p>Error loading bookmarks: ${formatErrorForDisplay(error)}</p>
      </div>
  `;
  }
}






function renderBookmarkVideos(videoEvents) {
  if (videoEvents.length === 0) {
    return `
      <div class="empty-playlist">
        <p>No bookmarks found. Start saving videos you want to watch later!</p>
        <a href="#home" class="nav-link">Browse Videos</a>
      </div>
    `;
  }
  
  return videoEvents.map((event, index) => {
    return `
      <div class="playlist-video-item bookmark-video-item ${event.isPlaceholder ? 'placeholder-video' : ''}" 
           data-video-id="${escapeHtml(event.id)}" 
           data-index="${index}"
           draggable="true">
        <div class="drag-handle">⋮⋮</div>
        ${renderVideoThumbnail(event)}
        ${renderVideoDetails(event, index + 1)}
        <div class="video-actions">
          <button class="btn-secondary remove-bookmark-btn" 
                  data-video-id="${escapeHtml(event.id)}">
            ×
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function setupBookmarksEventListeners() {
  // Make entire video item clickable to watch video (reuse logic from playlists)
  document.querySelectorAll('.bookmark-video-item').forEach(item => {
    if (!item.classList.contains('placeholder-video')) {
      item.addEventListener('click', (e) => {
        // Don't navigate if clicking on remove button or drag handle
        if (e.target.closest('.remove-bookmark-btn') || e.target.closest('.drag-handle')) {
          return;
        }
        const videoId = item.dataset.videoId;
        window.location.hash = `#watch/${videoId}`;
      });
      
      // Add hover cursor
      item.style.cursor = 'pointer';
    }
  });

  // Remove bookmark buttons
  document.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent video navigation
      const videoId = btn.dataset.videoId;
      
      if (confirm('Remove this video from your bookmarks?')) {
        const success = removeVideoFromBookmarks(videoId);
        
        if (success) {
          showTemporaryNotification('Bookmark removed');
          // Remove the video item from UI instead of reloading
          removeBookmarkFromUI(videoId);
          updateBookmarksVideoCount();
        }
      }
    });
  });

  // Handle bookmark action buttons
  if (app.isLoggedIn) {
    const syncBtn = document.querySelector('.sync-bookmarks-btn');
    const shareBtn = document.querySelector('.share-bookmarks-btn');
    
    syncBtn?.addEventListener('click', async () => {
      const originalText = syncBtn.textContent;
      try {
        syncBtn.textContent = 'Syncing...';
        syncBtn.disabled = true;
        
        // TODO: Implement sync with Nostr
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        syncBtn.textContent = 'Synced!';
        showTemporaryNotification('Sync functionality coming soon');
        
        setTimeout(() => {
          syncBtn.textContent = originalText;
          syncBtn.disabled = false;
        }, 2000);
      } catch (error) {
        syncBtn.textContent = 'Sync Failed';
        setTimeout(() => {
          syncBtn.textContent = originalText;
          syncBtn.disabled = false;
        }, 2000);
      }
    });
    
    shareBtn?.addEventListener('click', async () => {
      const originalText = shareBtn.textContent;
      try {
        shareBtn.textContent = 'Sharing...';
        shareBtn.disabled = true;
        
        // TODO: Implement share bookmarks
        await shareBookmarksToNetwork();
        
        shareBtn.textContent = 'Shared!';
        setTimeout(() => {
          shareBtn.textContent = originalText;
          shareBtn.disabled = false;
        }, 2000);
        
      } catch (error) {
        console.error('Error sharing bookmarks:', error);
        shareBtn.textContent = 'Share Failed';
        setTimeout(() => {
          shareBtn.textContent = originalText;
          shareBtn.disabled = false;
        }, 2000);
        
        alert('Failed to share bookmarks: ' + error.message);
      }
    });
  }

}

function setupBookmarksDragAndDrop() {
  const bookmarkVideos = document.getElementById('bookmark-videos');
  let draggedElement = null;
  let draggedIndex = null;
  
  if (!bookmarkVideos) return;
  
  // Reuse the same drag and drop logic from playlists, but adapted for bookmarks
  bookmarkVideos.addEventListener('dragstart', (e) => {
    if (!e.target.closest('.bookmark-video-item')) return;
    
    draggedElement = e.target.closest('.bookmark-video-item');
    draggedIndex = parseInt(draggedElement.dataset.index);
    
    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  
  bookmarkVideos.addEventListener('dragend', (e) => {
    if (draggedElement) {
      draggedElement.classList.remove('dragging');
      document.querySelectorAll('.drop-indicator').forEach(indicator => {
        indicator.remove();
      });
      draggedElement = null;
      draggedIndex = null;
    }
  });
  
  bookmarkVideos.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(bookmarkVideos, e.clientY);
    const dragIndicator = document.querySelector('.drop-indicator') || createDropIndicator();
    
    if (afterElement == null) {
      bookmarkVideos.appendChild(dragIndicator);
    } else {
      bookmarkVideos.insertBefore(dragIndicator, afterElement);
    }
  });
  
  bookmarkVideos.addEventListener('drop', (e) => {
    e.preventDefault();
    
    const afterElement = getDragAfterElement(bookmarkVideos, e.clientY);
    let newIndex;
    
    if (afterElement == null) {
      newIndex = bookmarkVideos.children.length - 1;
    } else {
      newIndex = parseInt(afterElement.dataset.index);
      if (newIndex > draggedIndex) {
        newIndex -= 1;
      }
    }
    
    if (newIndex !== draggedIndex) {
      reorderBookmarkVideo(draggedIndex, newIndex);
    }
    
    // Clean up
    document.querySelectorAll('.drop-indicator').forEach(indicator => {
      indicator.remove();
    });
  });
  
  bookmarkVideos.addEventListener('dragleave', (e) => {
    if (!bookmarkVideos.contains(e.relatedTarget)) {
      document.querySelectorAll('.drop-indicator').forEach(indicator => {
        indicator.remove();
      });
    }
  });
}

// Helper functions for bookmarks (similar to playlist functions)
function removeBookmarkFromUI(videoId) {
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
      updateRemainingBookmarkIndices();
      
      // Check if bookmarks is now empty
      checkIfBookmarksEmpty();
    }, 300);
  }
}

function updateRemainingBookmarkIndices() {
  const bookmarkVideos = document.getElementById('bookmark-videos');
  const videoItems = [...bookmarkVideos.querySelectorAll('.bookmark-video-item')];
  
  videoItems.forEach((item, index) => {
    item.dataset.index = index;
  });
}

function updateBookmarksVideoCount() {
  const videoCountElement = document.querySelector('.video-count');
  if (videoCountElement) {
    const currentCount = document.querySelectorAll('.bookmark-video-item').length;
    // Account for the item that will be removed
    const newCount = Math.max(0, currentCount - 1);
    videoCountElement.textContent = `${newCount} video${newCount !== 1 ? 's' : ''}`;
  }
}

function checkIfBookmarksEmpty() {
  const bookmarkVideos = document.getElementById('bookmark-videos');
  const videoItems = bookmarkVideos.querySelectorAll('.bookmark-video-item');
  
  if (videoItems.length === 0) {
    bookmarkVideos.innerHTML = `
      <div class="empty-playlist">
        <p>No bookmarks found. Start saving videos you want to watch later!</p>
        <a href="#home" class="nav-link">Browse Videos</a>
      </div>
    `;
  }
}

function reorderBookmarkVideo(fromIndex, toIndex) {
  const bookmarkPlaylist = app.bookmarkPlaylist;
  
  if (!bookmarkPlaylist) return false;
  
  const videoTags = bookmarkPlaylist.tags.filter(tag => tag[0] === "a");
  const otherTags = bookmarkPlaylist.tags.filter(tag => tag[0] !== "a");
  
  // Reorder the video tags
  const movedVideo = videoTags.splice(fromIndex, 1)[0];
  videoTags.splice(toIndex, 0, movedVideo);
  
  // Update the bookmark playlist with reordered tags
  bookmarkPlaylist.tags = [...otherTags, ...videoTags];
  
  // Save to storage (assuming you have a function for this)
  saveBookmarksToStorage();
  
  // Update UI in place instead of refreshing
  updateBookmarkOrder(fromIndex, toIndex);
  
  return true;
}

function updateBookmarkOrder(fromIndex, toIndex) {
  const bookmarkVideos = document.getElementById('bookmark-videos');
  const videoItems = [...bookmarkVideos.querySelectorAll('.bookmark-video-item')];
  
  // Move the DOM element
  const movedItem = videoItems[fromIndex];
  
  // Handle case where we're moving to the end
  if (toIndex >= videoItems.length - 1) {
    bookmarkVideos.appendChild(movedItem);
  } else {
    const targetItem = videoItems[toIndex];
    
    if (fromIndex < toIndex) {
      // Moving down - insert after target
      if (targetItem.nextSibling) {
        bookmarkVideos.insertBefore(movedItem, targetItem.nextSibling);
      } else {
        bookmarkVideos.appendChild(movedItem);
      }
    } else {
      // Moving up - insert before target
      bookmarkVideos.insertBefore(movedItem, targetItem);
    }
  }
  
  // Update data-index attributes for all items
  const updatedItems = [...bookmarkVideos.querySelectorAll('.bookmark-video-item')];
  updatedItems.forEach((item, index) => {
    item.dataset.index = index;
  });
}



async function shareBookmarksToNetwork() {
  const bookmarkPlaylist = app.bookmarkPlaylist;
  
  if (!bookmarkPlaylist) {
    throw new Error("No bookmarks to share");
  }

  const eventData = buildPlaylistEventData(bookmarkPlaylist);
  
  try {
    console.log("Bookmark playlist event data:", eventData);
    const signedEvent = await handleEventSigning(eventData);
    
    // await publishEventToRelays(signedEvent);
    
    showTemporaryNotification('Bookmarks NOT shared to network successfully!');
    console.log("Bookmarks NOT shared successfully!", signedEvent);
    
    return signedEvent;
  } catch (error) {
    console.error("Error sharing bookmarks:", error);
    throw error;
  }
}

function saveBookmarksToStorage() {
  try {
    localStorage.setItem('bookmarkPlaylist', JSON.stringify(app.bookmarkPlaylist));
  } catch (error) {
    console.error('Error saving bookmarks to storage:', error);
  }
}

