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
    
    const videoTags = playlist.tags.filter(tag => tag[0] === "e");
    const videoIds = videoTags.map(tag => tag[1]);
    
    // Create placeholders
    const placeholderEvents = videoIds.map(id => createPlaceholderVideo(id));
    
    // Cache with placeholders
    const isLocal = isLocalPlaylist(playlist);
    const playlistId = isLocal ? `local:${dTag}` : `${playlist.pubkey}:${dTag}`;
    app.playlistVideoCache = {
      videos: placeholderEvents,
      playlistId: playlistId
    };
    
    // Render immediately with placeholders
    renderSinglePlaylist(playlist, dTag, placeholderEvents);
    setupSinglePlaylistEventListeners(dTag, placeholderEvents);
    setupDragAndDrop(dTag);
    
    // Now fetch real video data progressively
    await fetchVideoEventsForLocalPlaylist(videoIds, playlistId, playlist);
    
  } catch (error) {
    console.error("Error rendering playlist page:", error);
    showPlaylistError(error);
  }
}

async function fetchVideoEventsForLocalPlaylist(videoIds, playlistId, playlist) {
  if (videoIds.length === 0) return;
  
  const authorPubkey = playlist.pubkey;
  
  // Get extended relays for the author (if not local)
  let baseRelays;
  if (authorPubkey && authorPubkey !== 'local') {
    const extendedRelays = await getExtendedRelaysForProfile(authorPubkey);
    baseRelays = [...new Set([...app.globalRelays, ...extendedRelays])];
  } else {
    baseRelays = app.globalRelays;
  }
  
  // Extract relay hints from playlist
  const playlistRelayHints = extractRelayHintsFromPlaylist(playlist.tags);
  
  // Combine all relays
  const allRelays = [...new Set([...baseRelays, ...playlistRelayHints])];
  
  console.log(`Fetching ${videoIds.length} videos from ${allRelays.length} relays (${baseRelays.length} base + ${playlistRelayHints.length} from playlist)`);
  
  const videoMap = new Map();
  
  const filter = {
    kinds: [21, 22],
    ids: videoIds
  };
  
  const pool = new window.NostrTools.SimplePool();
  
  // Register cleanup
  const cleanup = () => {
    if (pool) {
      pool.close(allRelays);
    }
  };
  registerCleanup(cleanup);
  
  const sub = pool.subscribeMany(
    allRelays,
    filter,
    {
      onevent(event) {
        const sanitizedEvent = sanitizeNostrEvent(event);
        if (!sanitizedEvent || videoMap.has(sanitizedEvent.id)) return;
        
        videoMap.set(sanitizedEvent.id, sanitizedEvent);
        
        console.log("📹 Received video event:", sanitizedEvent.id);
        
        // Update cache
        const existingCache = app.playlistVideoCache;
        if (existingCache && existingCache.playlistId === playlistId) {
          const videoIndex = existingCache.videos.findIndex(v => v.id === sanitizedEvent.id);
          if (videoIndex !== -1) {
            existingCache.videos[videoIndex] = sanitizedEvent;
          }
        }
        
        // Update UI immediately
        updateVideoCardInLocalPlaylist(sanitizedEvent);
      },
      
      oneose() {
        console.log(`Video fetch complete: ${videoMap.size}/${videoIds.length} found`);
        
        // NEW: Mark unfound videos as "not found"
        const existingCache = app.playlistVideoCache;
        if (existingCache && existingCache.playlistId === playlistId) {
          existingCache.videos.forEach((video, index) => {
            if (video.isPlaceholder && !video.notFound && !videoMap.has(video.id)) {
              const notFoundVideo = createPlaceholderVideo(video.id, true);
              existingCache.videos[index] = notFoundVideo;
              updateVideoCardInLocalPlaylist(notFoundVideo);
            }
          });
        }
      }
    }
  );
  
  setTimeout(() => {
    sub.close();
    pool.close(allRelays);
  }, 10000);
}
function updateVideoCardInLocalPlaylist(videoEvent) {
  const videoCard = document.querySelector(`[data-video-id="${videoEvent.id}"]`);
  if (!videoCard) return;
  
  // Store whether this card is draggable before we update it
  const isDraggable = videoCard.hasAttribute('draggable');
  const wasDraggable = videoCard.getAttribute('draggable') === 'true';
  
  // Remove placeholder class
  videoCard.classList.remove('placeholder-video');
  
  // Get the index and dTag from the card
  const index = parseInt(videoCard.dataset.index);
  const dTag = document.querySelector('.edit-playlist-btn')?.dataset.dTag;
  
  // Check if this is a local playlist (has drag handle)
  const isLocal = isDraggable && wasDraggable;
  
  // Recreate the entire card content
  videoCard.innerHTML = `
    ${isLocal ? '<div class="drag-handle">⋮⋮</div>' : ''}
    ${renderVideoThumbnail(videoEvent)}
    ${renderVideoDetails(videoEvent, index + 1)}
    ${isLocal && dTag ? `
      <div class="video-actions">
        <button class="btn-secondary remove-video-btn" 
                data-video-id="${escapeHtml(videoEvent.id)}" 
                data-d-tag="${escapeHtml(dTag)}">
          ×
        </button>
      </div>
    ` : ''}
  `;
  
  // Add update animation
  videoCard.classList.add('video-updated');
  setTimeout(() => {
    videoCard.classList.remove('video-updated');
  }, 1000);
  
  // Re-attach the remove button listener (since we recreated the button)
  if (isLocal && dTag) {
    const removeBtn = videoCard.querySelector('.remove-video-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const videoId = removeBtn.dataset.videoId;
        
        if (confirm('Remove this video from the playlist?')) {
          const success = removeVideoFromPlaylist(dTag, videoId);
          
          if (success) {
            showTemporaryNotification('Video removed from playlist');
            removeVideoFromUI(videoId);
            updatePlaylistVideoCount();
          }
        }
      });
    }
  }
  
  // The main click listener for navigation is still attached to the card
  // element itself, so it survives the innerHTML update
}

// Keep the old fetchVideoEvents for backwards compatibility if needed elsewhere
async function fetchVideoEvents(videoTags, playlist = null) {
  if (videoTags.length === 0) return [];
  
  const videoIds = videoTags.map(tag => tag[1]);
  
  // Build relay list
  let relays = [...app.globalRelays];
  
  // Add playlist relay hints if playlist is provided
  if (playlist && playlist.tags) {
    const playlistRelayHints = extractRelayHintsFromPlaylist(playlist.tags);
    relays = [...new Set([...relays, ...playlistRelayHints])];
    
    if (playlistRelayHints.length > 0) {
      console.log(`Using ${relays.length} relays (including ${playlistRelayHints.length} from playlist)`);
    }
  }
  
  try {
    const events = await NostrClient.getEventsFromRelays(relays, {
      ids: videoIds,
      kinds: [21, 22],
      limit: videoIds.length,
      maxWait: 3000,
      timeout: 5000
    });    

    console.log(`Found ${events?.length || 0} video events out of ${videoIds.length} requested`);
    
    const eventMap = new Map();
    if (events && events.length > 0) {
      events.forEach(event => eventMap.set(event.id, event));
    }
    
    return videoIds.map(id => {
      const event = eventMap.get(id);
      if (event) {
        return event;
      } else {
        return createPlaceholderVideo(id);
      }
    });
    
  } catch (error) {
    console.error("Error fetching video events:", error);
    return videoIds.map(id => createPlaceholderVideo(id));
  }
}

function createPlaceholderEvent(videoId, kind = 21) { // kind parameter kept for backward compatibility
  return {
    id: videoId,
    kind: kind,
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
  const image = getValueFromTags(playlist, "image", "") || getValueFromTags(playlist, "thumb", "");
  
  // FIX: Use "e" tags for local playlists (same as network playlists)
  const videoTags = playlist.tags.filter(tag => tag[0] === "e");
  
  // Use total video count from tags, not from loaded events
  const totalVideoCount = videoTags.length;
  
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
            <span class="video-count">${totalVideoCount} item${totalVideoCount !== 1 ? 's' : ''}</span>
            <span class="created-date">Created ${escapeHtml(getRelativeTime(playlist.created_at))}</span>
            <span class="local-badge">💾 Local</span>
          </div>
        </div>
      </div>
      <div class="playlist-actions">
        ${totalVideoCount > 0 ? `<button class="btn-primary play-all-btn">▶ Play All</button>` : ''}
        <button class="btn-primary share-playlist-btn" data-d-tag="${escapeHtml(dTag)}">Share</button>
        <button class="btn-secondary edit-playlist-btn" data-d-tag="${escapeHtml(dTag)}">Edit Metadata</button>
        <button class="btn-danger delete-playlist-btn" data-d-tag="${escapeHtml(dTag)}">Delete</button>
      </div>
    </div>
    
    <div class="playlist-content">
      <div class="playlist-videos" id="playlist-videos">
        ${renderPlaylistVideos(videoEvents, dTag, true)}
      </div>
    </div>
    
    <div class="playlist-raw-data">
      <details>
        <summary><strong>Raw Event JSON</strong></summary>
        <pre>${JSON.stringify(playlist, null, 2)}</pre>
      </details>
    </div>
  `;
}

async function syncNetworkPlaylist(playlist) {
  if (isLocalPlaylist(playlist)) {
    return null; // Can't sync local playlists
  }
  
  const dTag = getValueFromTags(playlist, "d", "");
  const author = playlist.pubkey;
  
  try {
    const extendedRelays = await getExtendedRelaysForProfile(author);
    const result = await NostrClient.getEventsFromRelays(extendedRelays, {
      kinds: [30005],
      authors: [author],
      tags: { d: [dTag] },
      limit: 1,
    });
    
    const latestPlaylist = Array.isArray(result) ? result[0] : result;
    
    if (!latestPlaylist) {
      return null; // Playlist not found on network
    }
    
    // Check if newer version exists
    if (latestPlaylist.created_at > playlist.created_at) {
      return latestPlaylist;
    }
    
    return null; // Already up to date
  } catch (error) {
    console.error("Error syncing playlist:", error);
    return null;
  }
}



function renderPlaylistVideos(videoEvents, dTag, isLocal) {
  if (videoEvents.length === 0) {
    return `
      <div class="empty-playlist">
        <p>This playlist is empty. ${isLocal ? 'Add some videos to get started!' : ''}</p>
        <a href="#home" class="nav-link">Browse Videos</a>
      </div>
    `;
  }
  
  return videoEvents.map((event, index) => {
    return `
      <div class="playlist-video-item ${event.isPlaceholder ? 'placeholder-video' : ''}" 
           data-video-id="${escapeHtml(event.id)}" 
           data-index="${index}"
           ${isLocal ? 'draggable="true"' : ''}>
        ${isLocal ? '<div class="drag-handle">⋮⋮</div>' : ''}
        ${renderVideoThumbnail(event)}
        ${renderVideoDetails(event, index + 1)}
        ${isLocal ? `
          <div class="video-actions">
            <button class="btn-secondary remove-video-btn" 
                    data-video-id="${escapeHtml(event.id)}" 
                    data-d-tag="${escapeHtml(dTag)}">
              ×
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}
function renderVideoThumbnail(event) {
  if (event.isPlaceholder) {
    return `
      <div class="video-thumbnail placeholder-thumbnail ${event.notFound ? 'not-found' : ''}">
        <div class="placeholder-icon">${event.notFound ? '❌' : '📹'}</div>
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
  
  // Fallback to image or thumb tags if imeta not found
  if (!thumbnailUrl) {
    thumbnailUrl = getValueFromTags(event, 'image', '') || getValueFromTags(event, 'thumb', '');
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
  
  // Determine content type based on kind
  const contentType = event.kind === 22 ? 'Short Video' : 'Video';
  
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
        <span class="video-kind">${contentType}</span>
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

function setupSinglePlaylistEventListeners(dTag, cachedVideoEvents = null) {
  const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
  const isLocal = isLocalPlaylist(playlist);
  const playlistId = isLocal ? `local:${dTag}` : `${playlist.pubkey}:${dTag}`;
  
// Play All button
const playAllBtn = document.querySelector('.play-all-btn');
if (playAllBtn) {
  playAllBtn.addEventListener('click', async () => {
    const firstVideo = document.querySelector('.playlist-video-item:not(.placeholder-video)');
    if (firstVideo) {
      // Use cached video events or fetch if needed
      let videoEvents = cachedVideoEvents;
      
      if (!videoEvents && app.playlistVideoCache.playlistId === playlistId) {
        videoEvents = app.playlistVideoCache.videos;
      }
      
      if (!videoEvents) {
/*         const videoTags = playlist.tags.filter(tag => tag[0] === "e");
        videoEvents = await fetchVideoEvents(videoTags); */
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~play all');
      }
      
      // Check for non-whitelisted domains
      const nonWhitelistedDomains = await checkPlaylistDomains(videoEvents);
      
      if (nonWhitelistedDomains.length > 0) {
        await promptWhitelistDomains(nonWhitelistedDomains);
      }
      
      const videoId = firstVideo.dataset.videoId;
      const pubkey = isLocal ? 'local' : playlist.pubkey;
      window.location.hash = `#watch/params?v=${videoId}&listp=${pubkey}&listd=${dTag}`;
    }
  });
}

// Make entire video item clickable WITH playlist params
document.querySelectorAll('.playlist-video-item').forEach(item => {
  item.addEventListener('click', async (e) => {
    // Skip if placeholder
    if (item.classList.contains('placeholder-video')) {
      return;
    }
    
    if (e.target.closest('.remove-video-btn') || e.target.closest('.drag-handle')) {
      return;
    }
    
    // Use cached video events or fetch if needed
    let videoEvents = cachedVideoEvents;
    
    if (!videoEvents && app.playlistVideoCache.playlistId === playlistId) {
      videoEvents = app.playlistVideoCache.videos;
    }
    
    if (!videoEvents) {
      const videoTags = playlist.tags.filter(tag => tag[0] === "e");
      videoEvents = await fetchVideoEvents(videoTags, playlist);
    }
    
    // Check for non-whitelisted domains
    const nonWhitelistedDomains = await checkPlaylistDomains(videoEvents);
    
    if (nonWhitelistedDomains.length > 0) {
      await promptWhitelistDomains(nonWhitelistedDomains);
    }
    
    const videoId = item.dataset.videoId;
    const pubkey = isLocal ? 'local' : playlist.pubkey;
    
    // Get relay hint for this specific video
    const relayHint = getRelayHintForVideo(playlist.tags, videoId);
    
    // Build URL with discovery parameter if relay hint exists
    let watchUrl = `#watch/params?v=${videoId}&listp=${pubkey}&listd=${dTag}`;
    if (relayHint) {
      watchUrl += `&discovery=${encodeURIComponent(relayHint)}`;
      console.log(`Adding relay hint for video ${videoId}: ${relayHint}`);
    }
    
    window.location.hash = watchUrl;
  });
  
  item.style.cursor = 'pointer';
});
  
  
  // Remove video buttons (only for local playlists)
  if (isLocal) {
    document.querySelectorAll('.remove-video-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const videoId = btn.dataset.videoId;
        const dTag = btn.dataset.dTag;
        
        if (confirm('Remove this video from the playlist?')) {
          const success = removeVideoFromPlaylist(dTag, videoId);
          
          if (success) {
            showTemporaryNotification('Video removed from playlist');
            removeVideoFromUI(videoId);
            updatePlaylistVideoCount();
          }
        }
      });
    });
  }

  // Copy to local button (for network playlists)
  const copyBtn = document.querySelector('.copy-to-local-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
      if (playlist) {
        const newPlaylist = copyNetworkPlaylistToLocal(playlist);
        const newDTag = getValueFromTags(newPlaylist, "d", "");
        
        // Navigate to the new local playlist
        setTimeout(() => {
          window.location.hash = `#localplaylist/${newDTag}`;
        }, 500);
      }
    });
  }
  
  // Sync playlist button (for network playlists)
  const syncBtn = document.querySelector('.sync-playlist-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      const originalText = syncBtn.textContent;
      
      try {
        syncBtn.textContent = 'Checking...';
        syncBtn.disabled = true;
        
        const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
        
        if (!playlist) {
          throw new Error("Playlist not found");
        }
        
        const updatedPlaylist = await syncNetworkPlaylist(playlist);
        
        if (updatedPlaylist) {
          const shouldUpdate = confirm(
            'A newer version of this playlist is available. Update now?'
          );
          
          if (shouldUpdate) {
            const existingIndex = app.playlists.findIndex(
              p => getValueFromTags(p, "d", "") === dTag && p.pubkey === playlist.pubkey
            );
            
            if (existingIndex !== -1) {
              // Replace with exact network playlist
              app.playlists[existingIndex] = { ...updatedPlaylist };
              savePlaylistsToStorage();
              
              showTemporaryNotification('Playlist updated successfully!');
              
              setTimeout(() => {
                  const playlists = app.playlists || [];
    renderPlaylistsGrid(playlists);
    setupPlaylistsEventListeners(); 
              }, 1000);
            }
          } else {
            syncBtn.textContent = originalText;
            syncBtn.disabled = false;
          }
        } else {
          showTemporaryNotification('Playlist is already up to date');
          syncBtn.textContent = 'Up to date ✓';
          setTimeout(() => {
            syncBtn.textContent = originalText;
            syncBtn.disabled = false;
          }, 2000);
        }
        
      } catch (error) {
        console.error('Error syncing playlist:', error);
        showTemporaryNotification('Failed to sync playlist');
        syncBtn.textContent = 'Sync Failed';
        setTimeout(() => {
          syncBtn.textContent = originalText;
          syncBtn.disabled = false;
        }, 2000);
      }
    });
  }

  // Share playlist button (for local playlists only)
  const shareBtn = document.querySelector('.share-playlist-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
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
  }

  // Edit playlist button (for local playlists only)
  const editBtn = document.querySelector('.edit-playlist-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      showPlaylistModal(dTag);
    });
  }
  
  // Delete/Remove playlist button
  const deleteBtn = document.querySelector('.delete-playlist-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const playlist = app.playlists.find(p => getValueFromTags(p, "d", "") === dTag);
      const title = playlist ? getValueFromTags(playlist, "title", "Untitled Playlist") : "playlist";
      const isLocal = isLocalPlaylist(playlist);
      
      const confirmMessage = isLocal 
        ? `Are you sure you want to delete "${title}"? This cannot be undone.`
        : `Remove "${title}" from your library? (You can save it again later)`;
      
      if (confirm(confirmMessage)) {
        if (isLocal) {
          app.playlists = app.playlists.filter(p => getValueFromTags(p, "d", "") !== dTag);
        } else {
          // For network playlists, match by both dTag and pubkey
          app.playlists = app.playlists.filter(p => 
            !(getValueFromTags(p, "d", "") === dTag && p.pubkey === playlist.pubkey)
          );
        }
        
        savePlaylistsToStorage();
        showTemporaryNotification(isLocal ? 'Playlist deleted' : 'Playlist removed from library');
/*     const playlists = app.playlists || [];
    renderPlaylistsGrid(playlists);
    setupPlaylistsEventListeners();  */
          window.location.hash = '#localplaylists';
     //   localPlaylistPageHandler();
      }
    });
  }
  
  // Setup drag and drop only for local playlists
  if (isLocal) {
    setupDragAndDrop(dTag);
  }
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
  
  const videoTags = playlist.tags.filter(tag => tag[0] === "e");
  const otherTags = playlist.tags.filter(tag => tag[0] !== "e");
  
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
  const playlist = playlists.find((p) => getValueFromTags(p, "d", "") === dTag);

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  const eventData = buildPlaylistEventData(playlist);

  // await publishEventToRelays(signedEvent);

  try {
    console.log("Playlist event data:", eventData);
    const signedEvent = await handleEventSigning(eventData);

    const result = await publishEvent(signedEvent, app.relays, {
      successMessage: "Playlist published successfully",
      errorMessage: "Failed to publish playlist event",
    });

    if (result.success) {
      console.dir(signedEvent, { depth: null });
     
      showTemporaryNotification("Playlist published successfully!");
     

    } else {
      throw new Error(result.error);
    }
  } catch (publishError) {
    console.error("Error publishing video event:", publishError);
    showTemporaryNotification("❌ Failed to publish video event");
    resetButton();
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

function updatePlaylistMetadataInView(dTag, title, description, image) {
  // Update the title
  const titleElement = document.querySelector('.playlist-title');
  if (titleElement) {
    titleElement.textContent = title;
  }
  
  // Update the description
  const descriptionElement = document.querySelector('.playlist-description');
  if (descriptionElement) {
    if (description) {
      descriptionElement.textContent = description;
      descriptionElement.style.display = '';
    } else {
      descriptionElement.style.display = 'none';
    }
  } else if (description) {
    // If description didn't exist before, create it
    const playlistDetails = document.querySelector('.playlist-details h1');
    if (playlistDetails) {
      const newDesc = document.createElement('p');
      newDesc.className = 'playlist-description';
      newDesc.textContent = description;
      playlistDetails.insertAdjacentElement('afterend', newDesc);
    }
  }
  
  // Update the thumbnail
  const thumbnailContainer = document.querySelector('.playlist-thumbnail');
  if (thumbnailContainer) {
    if (image) {
      thumbnailContainer.innerHTML = `<img src="${escapeHtml(image)}" alt="Playlist thumbnail" loading="lazy">`;
    } else {
      thumbnailContainer.innerHTML = `<div class="no-thumbnail">📹</div>`;
    }
  }
}