async function playlistPageHandler() {
  const urlParts = window.location.hash.split("/");
  const playlistPath = urlParts[1] || "";
  
  const [basePath, queryString] = playlistPath.split("?");
  
  if (!basePath) {
    window.location.hash = "#playlists";
    return;
  }
  
  showPlaylistLoadingState();
  
  try {
    const { discovery, author, dtag, error } = parsePlaylistParams(queryString);
    
    if (error) {
      throw new Error(error);
    }
    
    console.log("Playlist params:", { author, dtag, discovery });
    
    // Get extended relays for the author (similar to profile page)
    const extendedRelays = await getExtendedRelaysForProfile(author);
    const allRelays = [...new Set([...app.globalRelays, ...extendedRelays])];
    
    console.log(`Searching for playlist across ${allRelays.length} relays`);
    
    // Initialize pool and subscription tracking
    app.playlistPool = new window.NostrTools.SimplePool();
    
    // Register cleanup
    const cleanup = () => {
      console.log("Cleaning up playlist resources");
      
      if (app.playlistSubscription) {
        app.playlistSubscription.close();
        app.playlistSubscription = null;
      }
      
      if (app.playlistPool) {
        app.playlistPool.close(allRelays);
        app.playlistPool = null;
      }
      
      if (app.playlistVideoSubscription) {
        app.playlistVideoSubscription.close();
        app.playlistVideoSubscription = null;
      }
      
      if (app.playlistVideoPool) {
        app.playlistVideoPool.close(allRelays);
        app.playlistVideoPool = null;
      }
    };
    
    registerCleanup(cleanup);
    
    // Load playlist with real-time updates
    await loadPlaylistWithUpdates(author, dtag, allRelays);
    
  } catch (error) {
    console.error("Error rendering playlist page:", error);
    showPlaylistError(error);
  }
}


async function loadPlaylistWithUpdates(author, dtag, allRelays) {
  let latestPlaylist = null;
  let latestTimestamp = 0;
  const playlistId = `${author}:${dtag}`;
  
  return new Promise((resolve) => {
    let isInitialLoadComplete = false;
    
    const filter = {
      kinds: [30005],
      authors: [author],
      "#d": [dtag],
    };
    
    const sub = app.playlistPool.subscribeMany(
      allRelays,
      [filter],
      {
        onevent(event) {
          const sanitizedEvent = sanitizeNostrEvent(event);
          if (!sanitizedEvent) return;
          
          if (sanitizedEvent.created_at > latestTimestamp) {
            latestTimestamp = sanitizedEvent.created_at;
            latestPlaylist = sanitizedEvent;
            
            console.log("Found playlist version:", {
              created_at: sanitizedEvent.created_at,
              id: sanitizedEvent.id
            });
            
            if (isInitialLoadComplete) {
              console.log("🔥 Received newer playlist version in real-time!");
              renderPlaylistUpdate(sanitizedEvent, playlistId);
            }
          }
        },
        
        oneose() {
          console.log("Initial playlist search complete");
          
          if (latestPlaylist) {
            renderPlaylistWithPlaceholders(latestPlaylist, playlistId, allRelays);
            isInitialLoadComplete = true;
            resolve(latestPlaylist);
          } else {
            console.log("Playlist not found");
            showPlaylistNotFound();
            resolve(null);
          }
        }
      }
    );
    
    app.playlistSubscription = sub;
    
    setTimeout(() => {
      if (!isInitialLoadComplete) {
        if (latestPlaylist) {
          renderPlaylistWithPlaceholders(latestPlaylist, playlistId, allRelays);
          isInitialLoadComplete = true;
          resolve(latestPlaylist);
        } else {
          showPlaylistNotFound();
          resolve(null);
        }
      }
    }, 10000);
  });
}

async function renderPlaylistWithPlaceholders(playlist, playlistId, allRelays) {
  const videoTags = filterValidVideoTags(playlist.tags);
  const videoIds = videoTags.map(tag => tag[1]);
  
  // Extract relay hints from playlist
  const playlistRelayHints = extractRelayHintsFromPlaylist(playlist.tags);
  
  // Combine all relays: global + author's + playlist hints
  const combinedRelays = [...new Set([...allRelays, ...playlistRelayHints])];
  
  console.log(`Using ${combinedRelays.length} relays (${allRelays.length} base + ${playlistRelayHints.length} from playlist)`);
  
  // Create placeholder events
  const placeholderEvents = videoIds.map(id => createPlaceholderVideo(id));
  
  // Initialize cache with placeholders
  app.playlistVideoCache = {
    videos: placeholderEvents,
    playlistId: playlistId,
    timestamp: Date.now()
  };
  
  // Render immediately with placeholders
  renderNetworkPlaylist(playlist, placeholderEvents, playlistId);
  setupNetworkPlaylistEventListeners(playlist, placeholderEvents);
  
  // Now fetch real video data progressively with combined relays
  await fetchVideoEventsProgressively(videoIds, combinedRelays, playlistId);
}

async function fetchVideoEventsProgressively(videoIds, allRelays, playlistId) {
  if (videoIds.length === 0) return;
  
  const videoMap = new Map();
  
  const filter = {
    kinds: [21, 22],
    ids: videoIds
  };
  
  const pool = new window.NostrTools.SimplePool();
  
  const sub = pool.subscribeMany(
    allRelays,
    [filter],
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
        updateVideoCardInPlaylist(sanitizedEvent);
      },
      
      oneose() {
        console.log(`Video fetch complete: ${videoMap.size}/${videoIds.length} found`);
        
        // Mark unfound videos as "not found"
        const existingCache = app.playlistVideoCache;
        if (existingCache && existingCache.playlistId === playlistId) {
          existingCache.videos.forEach((video, index) => {
            if (video.isPlaceholder && !video.notFound && !videoMap.has(video.id)) {
              // This video was never found, mark it as not found
              const notFoundVideo = createPlaceholderVideo(video.id, true);
              existingCache.videos[index] = notFoundVideo;
              updateVideoCardInPlaylist(notFoundVideo);
            }
          });
        }
      }
    }
  );
  
  // Store for cleanup
  app.playlistVideoSubscription = sub;
  app.playlistVideoPool = pool;
}

async function renderPlaylist(playlist, playlistId) {
  const videoTags = filterValidVideoTags(playlist.tags);
  
  // Fetch video events using the same relay strategy
  const author = playlist.pubkey;
  const extendedRelays = await getExtendedRelaysForProfile(author);
  const allRelays = [...new Set([...app.globalRelays, ...extendedRelays])];
  
  const videoEvents = await fetchVideoEventsOptimized(videoTags, allRelays);
  
  // Cache the video events
  app.playlistVideoCache = {
    videos: videoEvents,
    playlistId: playlistId,
    timestamp: Date.now()
  };
  
  renderNetworkPlaylist(playlist, videoEvents, playlistId);
  setupNetworkPlaylistEventListeners(playlist, videoEvents);
  
  // Subscribe to video updates
  subscribeToVideoUpdates(videoTags, allRelays, playlistId);
}

async function renderPlaylistUpdate(playlist, playlistId) {
  console.log("Rendering updated playlist version");
  showTemporaryNotification("📝 Playlist updated by creator");
  
  const videoTags = filterValidVideoTags(playlist.tags);
  const videoIds = videoTags.map(tag => tag[1]);
  
  // Get extended relays again
  const extendedRelays = await getExtendedRelaysForProfile(playlist.pubkey);
  
  // Extract relay hints from updated playlist
  const playlistRelayHints = extractRelayHintsFromPlaylist(playlist.tags);
  
  // Combine all relays
  const allRelays = [...new Set([...app.globalRelays, ...extendedRelays, ...playlistRelayHints])];
  
  console.log(`Using ${allRelays.length} relays for update (including ${playlistRelayHints.length} from playlist)`);
  
  // Create placeholders for new structure
  const placeholderEvents = videoIds.map(id => {
    // Check if we already have this video in cache
    const cached = app.playlistVideoCache?.videos?.find(v => v.id === id);
    return cached && !cached.isPlaceholder ? cached : createPlaceholderVideo(id);
  });
  
  // Update cache
  app.playlistVideoCache = {
    videos: placeholderEvents,
    playlistId: playlistId,
    timestamp: Date.now()
  };
  
  // Re-render
  renderNetworkPlaylist(playlist, placeholderEvents, playlistId);
  setupNetworkPlaylistEventListeners(playlist, placeholderEvents);
  
  // Fetch any missing videos
  const missingVideoIds = placeholderEvents
    .filter(v => v.isPlaceholder)
    .map(v => v.id);
  
  if (missingVideoIds.length > 0) {
    await fetchVideoEventsProgressively(missingVideoIds, allRelays, playlistId);
  }
}

async function fetchVideoEventsOptimized(videoTags, allRelays) {
  if (videoTags.length === 0) return [];
  
  const videoIds = videoTags.map(tag => tag[1]);
  const videoMap = new Map();
  
  return new Promise((resolve) => {
    let isComplete = false;
    
    // Fixed filter format
    const filter = {
      kinds: [21, 22],
      ids: videoIds
    };
    
    const pool = new window.NostrTools.SimplePool();
    
    const sub = pool.subscribeMany(
      allRelays,
      [filter],  // Array of filters
      {
        onevent(event) {
          const sanitizedEvent = sanitizeNostrEvent(event);
          if (sanitizedEvent && !videoMap.has(sanitizedEvent.id)) {
            videoMap.set(sanitizedEvent.id, sanitizedEvent);
          }
        },
        
        oneose() {
          if (!isComplete) {
            isComplete = true;
            sub.close();
            pool.close(allRelays);
            
            // Return videos in original order, with placeholders for missing ones
            const orderedVideos = videoIds.map(id => {
              if (videoMap.has(id)) {
                return videoMap.get(id);
              } else {
                return createPlaceholderVideo(id);
              }
            });
            
            resolve(orderedVideos);
          }
        }
      }
    );
    
    // Timeout after 8 seconds
    setTimeout(() => {
      if (!isComplete) {
        isComplete = true;
        sub.close();
        pool.close(allRelays);
        
        const orderedVideos = videoIds.map(id => 
          videoMap.has(id) ? videoMap.get(id) : createPlaceholderVideo(id)
        );
        
        resolve(orderedVideos);
      }
    }, 8000);
  });
}

function subscribeToVideoUpdates(videoTags, allRelays, playlistId) {
  if (videoTags.length === 0) return;
  
  const videoIds = videoTags.map(tag => tag[1]);
  
  // Fixed filter format
  const filter = {
    kinds: [21, 22],
    ids: videoIds
  };
  
  const pool = new window.NostrTools.SimplePool();
  
  const sub = pool.subscribeMany(
    allRelays,
    [filter],  // Array of filters
    {
      onevent(event) {
        const sanitizedEvent = sanitizeNostrEvent(event);
        if (!sanitizedEvent) return;
        
        // Check if this is a new/updated video
        const existingCache = app.playlistVideoCache;
        if (existingCache && existingCache.playlistId === playlistId) {
          const existingVideo = existingCache.videos.find(v => v.id === sanitizedEvent.id);
          
          if (!existingVideo || existingVideo.isPlaceholder) {
            console.log("🎬 Received video data:", sanitizedEvent.id);
            
            // Update cache
            const videoIndex = existingCache.videos.findIndex(v => v.id === sanitizedEvent.id);
            if (videoIndex !== -1) {
              existingCache.videos[videoIndex] = sanitizedEvent;
            }
            
            // Update UI
            updateVideoCardInPlaylist(sanitizedEvent);
          }
        }
      }
    }
  );
  
  // Store for cleanup
  app.playlistVideoSubscription = sub;
  app.playlistVideoPool = pool;
  
  // Add to cleanup
  registerCleanup(() => {
    if (app.playlistVideoSubscription) {
      app.playlistVideoSubscription.close();
      app.playlistVideoSubscription = null;
    }
    if (app.playlistVideoPool) {
      app.playlistVideoPool.close(allRelays);
      app.playlistVideoPool = null;
    }
  });
}
function updateVideoCardInPlaylist(videoEvent) {
  const videoCard = document.querySelector(`[data-video-id="${videoEvent.id}"]`);
  if (!videoCard) return;
  
  // Remove placeholder class
  videoCard.classList.remove('placeholder-video');
  
  // Get the index from the card
  const index = parseInt(videoCard.dataset.index);
  
  // Recreate the entire card content (but NOT the wrapper itself)
  videoCard.innerHTML = `
    ${renderVideoThumbnail(videoEvent)}
    ${renderVideoDetails(videoEvent, index + 1)}
  `;
  
  // Add update animation
  videoCard.classList.add('video-updated');
  setTimeout(() => {
    videoCard.classList.remove('video-updated');
  }, 1000);
  
  // The click listener is still attached to the parent card element
  // so we don't need to re-attach it - it survives the innerHTML update
}
function createPlaceholderVideo(videoId, notFound = false) {
  return {
    id: videoId,
    kind: 21,
    pubkey: '',
    created_at: 0,
    content: '',
    tags: [
      ['title', notFound ? 'Video not found' : 'Loading...'],
    ],
    sig: '',
    isPlaceholder: true,
    notFound: notFound 
  };
}

// Helper functions for rendering
function createVideoThumbnailElement(event) {
  // Your existing thumbnail rendering logic
  return renderVideoThumbnail(event);
}

function createVideoDetailsElement(event, index) {
  // Your existing details rendering logic
  return renderVideoDetails(event, index);
}
// Helper function to get primary relays (app.relays + discovery)
function getPrimaryRelays(discoveryRelays) {
  const appRelays = (app.relays || []).map(cleanRelayUrl);
  
  if (discoveryRelays && discoveryRelays.length > 0) {
    const formattedDiscoveryRelays = discoveryRelays.map(cleanRelayUrl);
    return [...new Set([...appRelays, ...formattedDiscoveryRelays])];
  }
  
  return appRelays;
}


function filterValidVideoTags(tags) {
  if (!tags) return [];
  
  // Filter e tags for video IDs
  return tags.filter(tag => {
    if (tag[0] !== "e") return false;
    const videoId = tag[1];
    if (!videoId) return false;
    // Validate it's a 64-character hex string
    return videoId.length === 64 && /^[a-fA-F0-9]{64}$/.test(videoId);
  });
}

function parsePlaylistParams(queryString) {
  const params = {};
  
  if (queryString) {
    queryString.split("&").forEach((param) => {
      const [key, value] = param.split("=");
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
  }
  
  // For replaceable events, we require author + dtag
  if (!params.author || !params.dtag) {
    return { error: "Both author and dtag are required for playlist lookup" };
  }
  
  // Validate author (pubkey) format
  const pubkeyPattern = /^[a-f0-9]{64}$/i;
  if (!pubkeyPattern.test(params.author)) {
    return { error: "Invalid author pubkey format" };
  }
  
  // Parse discovery relays if present
  let discoveryRelays = null;
  if (params.discovery) {
    discoveryRelays = params.discovery.split(",").map((relay) => relay.trim());
  }
  
  return {
    author: params.author,
    dtag: params.dtag,
    discovery: discoveryRelays,
    error: null,
  };
}

function showPlaylistNotFound() {
  mainContent.innerHTML = `
    <div class="empty-state">
      <h1>Playlist Not Found</h1>
      <p>The playlist could not be found on any available relays.</p>
    </div>
  `;
}
function isPlaylistSaved(playlist) {
  const existingPlaylists = app.playlists || [];
  const dTag = getValueFromTags(playlist, "d", "");
  
  return existingPlaylists.some(
    (p) => p.pubkey === playlist.pubkey && 
           getValueFromTags(p, "d", "") === dTag
  );
}

function renderNetworkPlaylist(playlist, videoEvents, playlistId) {
  const title = getValueFromTags(playlist, "title", "Untitled Playlist");
  const description = getValueFromTags(playlist, "description", "");
  const image = getValueFromTags(playlist, "image", "");
  const dTag = getValueFromTags(playlist, "d", "");
  const validVideoCount = videoEvents.length;
  const isBookmarked = isPlaylistBookmarked(playlist);
  
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
            <span class="video-count">${validVideoCount} item${validVideoCount !== 1 ? 's' : ''}</span>
            <span class="created-date">Created ${escapeHtml(getRelativeTime(playlist.created_at))}</span>
            ${isBookmarked ? '<span class="saved-badge">🔖 Bookmarked</span>' : ''}
          </div>
        </div>
      </div>
      <div class="playlist-actions">
        ${validVideoCount > 0 ? `<button class="btn-primary play-all-btn">▶ Play All</button>` : ''}
        <button class="btn-primary bookmark-playlist-btn ${isBookmarked ? 'bookmarked' : ''}" 
                data-playlist-id="${escapeHtml(playlistId)}">
          ${isBookmarked ? '❌ Remove Bookmark' : '🔖 Bookmark Playlist'}
        </button>
        <button class="btn-secondary copy-local-btn" 
                data-playlist-id="${escapeHtml(playlistId)}">
          📋 Create Local Copy
        </button>
      </div>
    </div>
    
    <div class="playlist-publisher-info">
      <nostr-picture pubkey="${playlist.pubkey}"></nostr-picture>
      <nostr-name pubkey="${playlist.pubkey}"></nostr-name>
      ${dTag ? `<p style="display: none;"><strong>Playlist ID (d-tag):</strong> ${escapeHtml(dTag)}</p>` : ''}
    </div>    
    
    <div class="playlist-content">
      <div class="playlist-videos" id="network-playlist-videos">
        ${renderNetworkPlaylistVideos(videoEvents)}
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
function isPlaylistBookmarked(playlist) {
  const bookmarkedPlaylists = app.bookmarkedPlaylists || [];
  const dTag = getValueFromTags(playlist, "d", "");
  
  return bookmarkedPlaylists.some(
    (p) => p.pubkey === playlist.pubkey && 
           getValueFromTags(p, "d", "") === dTag
  );
}
function renderNetworkPlaylistVideos(videoEvents) {
  if (videoEvents.length === 0) {
return `
  <div class="empty-playlist">
    <p>No valid video content found in this playlist.</p>
    <a href="#home" class="nav-link">Browse Content</a>
  </div>
`;
  }
  
  return videoEvents.map((event, index) => {
    return `
      <div class="playlist-video-item network-playlist-video ${event.isPlaceholder ? 'placeholder-video' : ''}" 
           data-video-id="${escapeHtml(event.id)}" 
           data-index="${index}">
        ${renderVideoThumbnail(event)}
        ${renderVideoDetails(event, index + 1)}
      </div>
    `;
  }).join('');
}

function setupNetworkPlaylistEventListeners(playlist, cachedVideoEvents = null) {
  const dTag = getValueFromTags(playlist, "d", "");
  const author = playlist.pubkey;
  const playlistId = `${author}:${dTag}`;
  
// Play All button
const playAllBtn = document.querySelector('.play-all-btn');
if (playAllBtn) {
  playAllBtn.addEventListener('click', async () => {
    const firstVideo = document.querySelector('.network-playlist-video:not(.placeholder-video)');
    if (firstVideo) {
      // Use cached video events or fetch if needed
      let videoEvents = cachedVideoEvents;
      
      if (!videoEvents && app.playlistVideoCache.playlistId === playlistId) {
        videoEvents = app.playlistVideoCache.videos;
      }
      
      if (!videoEvents) {
        const videoTags = filterValidVideoTags(playlist.tags);
        videoEvents = await fetchVideoEvents(videoTags, playlist);
      }
      
      // Check for non-whitelisted domains
      const nonWhitelistedDomains = await checkPlaylistDomains(videoEvents);
      
      if (nonWhitelistedDomains.length > 0) {
        await promptWhitelistDomains(nonWhitelistedDomains);
      }
      
      const videoId = firstVideo.dataset.videoId;
      
      // Get relay hint for the first video
      const relayHint = getRelayHintForVideo(playlist.tags, videoId);
      
      // Build URL with discovery parameter if relay hint exists
      let watchUrl = `#watch/params?v=${videoId}&listp=${author}&listd=${dTag}`;
      if (relayHint) {
        watchUrl += `&discovery=${encodeURIComponent(relayHint)}`;
        console.log(`Adding relay hint for first video ${videoId}: ${relayHint}`);
      }
      
      window.location.hash = watchUrl;
    }
  });
}
  
// Make entire video item clickable WITH playlist params
document.querySelectorAll('.network-playlist-video').forEach(item => {
  item.addEventListener('click', async (e) => {
    // Skip if placeholder
    if (item.classList.contains('placeholder-video')) {
      return;
    }
    
    // Don't trigger if clicking on action buttons
    if (e.target.closest('button')) {
      return;
    }
    
    // Use cached video events or fetch if needed
    let videoEvents = cachedVideoEvents;
    
    if (!videoEvents && app.playlistVideoCache.playlistId === playlistId) {
      videoEvents = app.playlistVideoCache.videos;
    }
    
    if (!videoEvents) {
      const videoTags = filterValidVideoTags(playlist.tags);
      videoEvents = await fetchVideoEvents(videoTags, playlist);
    }
    
    // Check for non-whitelisted domains
    const nonWhitelistedDomains = await checkPlaylistDomains(videoEvents);
    
    if (nonWhitelistedDomains.length > 0) {
      await promptWhitelistDomains(nonWhitelistedDomains);
    }
    
    const videoId = item.dataset.videoId;
    
    // Get relay hint for this specific video
    const relayHint = getRelayHintForVideo(playlist.tags, videoId);
    
    // Build URL with discovery parameter if relay hint exists
    let watchUrl = `#watch/params?v=${videoId}&listp=${author}&listd=${dTag}`;
    if (relayHint) {
      watchUrl += `&discovery=${encodeURIComponent(relayHint)}`;
      console.log(`Adding relay hint for video ${videoId}: ${relayHint}`);
    }
    
    window.location.hash = watchUrl;
  });
  
  item.style.cursor = 'pointer';
});
const bookmarkBtn = document.querySelector(".bookmark-playlist-btn");
if (bookmarkBtn) {
  bookmarkBtn.addEventListener("click", async () => {
    const originalText = bookmarkBtn.textContent;
    const isCurrentlyBookmarked = bookmarkBtn.classList.contains('bookmarked');
    
    try {
      bookmarkBtn.disabled = true;
      
      if (isCurrentlyBookmarked) {
        // Unbookmark
        bookmarkBtn.textContent = "Removing...";
        await unbookmarkPlaylist(playlist);
        
        bookmarkBtn.textContent = "🔖 Bookmark Playlist";
        bookmarkBtn.classList.remove('bookmarked');
        showTemporaryNotification('Bookmark removed');
        
        // Remove the bookmarked badge if it exists
        const savedBadge = document.querySelector('.saved-badge');
        if (savedBadge) {
          savedBadge.remove();
        }
        
      } else {
        // Bookmark
        bookmarkBtn.textContent = "Bookmarking...";
        await bookmarkPlaylist(playlist);
        
        bookmarkBtn.textContent = "❌ Remove Bookmark";
        bookmarkBtn.classList.add('bookmarked');
        showTemporaryNotification('Playlist bookmarked');
        
        // Add the bookmarked badge
        const metaDiv = document.querySelector('.playlist-meta');
        if (metaDiv && !document.querySelector('.saved-badge')) {
          const badge = document.createElement('span');
          badge.className = 'saved-badge';
          badge.textContent = '🔖 Bookmarked';
          metaDiv.appendChild(badge);
        }
      }
      
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      bookmarkBtn.textContent = "Action Failed";
      setTimeout(() => {
        bookmarkBtn.textContent = originalText;
      }, 2000);
      
      alert("Failed to toggle bookmark: " + error.message);
    } finally {
      bookmarkBtn.disabled = false;
    }
  });
}
  
  // Create local copy button
  const copyBtn = document.querySelector(".copy-local-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const newPlaylist = copyNetworkPlaylistToLocal(playlist);
      const newDTag = getValueFromTags(newPlaylist, "d", "");
      
      showTemporaryNotification('Local copy created');
      setTimeout(() => {
        window.location.hash = `#localplaylist/${newDTag}`;
      }, 500);
    });
  }
}


function saveNetworkPlaylistToLocal(networkPlaylist) {
  try {
    const existingPlaylists = app.playlists || [];
    const dTag = getValueFromTags(networkPlaylist, "d", "");
    
    // Check if playlist already exists
    const existingIndex = existingPlaylists.findIndex(
      (p) => p.pubkey === networkPlaylist.pubkey && 
             getValueFromTags(p, "d", "") === dTag
    );
    
    let notificationMessage = "";
    
    if (existingIndex !== -1) {
      const existing = existingPlaylists[existingIndex];
      
      // Check if network version is newer
      if (networkPlaylist.created_at > existing.created_at) {
        const shouldUpdate = confirm(
          "A newer version of this playlist is available. Update?"
        );
        if (shouldUpdate) {
          app.playlists[existingIndex] = { ...networkPlaylist };
          notificationMessage = "Playlist updated to newer version";
        } else {
          notificationMessage = "Update cancelled";
        }
      } else {
        notificationMessage = "You already have the latest version";
      }
    } else {
      // Save exact network playlist
      app.playlists.push({ ...networkPlaylist });
      notificationMessage = "Playlist saved for reference";
    }
    
    savePlaylistsToStorage();
    
    // Show only one notification
    if (notificationMessage) {
      showTemporaryNotification(notificationMessage);
    }
    
  } catch (error) {
    console.error("Error saving playlist:", error);
    throw error;
  }
}

function copyNetworkPlaylistToLocal(networkPlaylist) {
  const originalTitle = getValueFromTags(networkPlaylist, "title", "Untitled Playlist");
  const description = getValueFromTags(networkPlaylist, "description", "");
  const image = getValueFromTags(networkPlaylist, "image", "");
  
  const dTag = `vutr-${generateId()}`;
  
  // OLD: const videoTags = networkPlaylist.tags.filter(tag => tag[0] === "a");
  // NEW:
  const videoTags = networkPlaylist.tags.filter(tag => tag[0] === "e");
  
  const localPlaylist = {
    id: generateId(),
    pubkey: "local",
    created_at: Math.floor(Date.now() / 1000),
    kind: 30005,
    tags: [
      ["d", dTag],
      ["title", `${originalTitle} (copy)`],
      ...(description ? [["description", description]] : []),
      ...(image ? [["image", image]] : []),
      ...videoTags
    ],
    content: "",
    sig: "local"
  };
  
  app.playlists = app.playlists || [];
  app.playlists.push(localPlaylist);
  savePlaylistsToStorage();
  
  showTemporaryNotification(`Created local copy: "${originalTitle} (copy)"`);
  return localPlaylist;
}

// Helper function to check if playlist is local
function isLocalPlaylist(playlist) {
  return playlist.pubkey === "local" || playlist.sig === "local";
}

// Helper function to check if playlist is from network
function isNetworkPlaylist(playlist) {
  return !isLocalPlaylist(playlist);
}

// Helper function to get playlist unique identifier
function getPlaylistIdentifier(playlist) {
  const dTag = getValueFromTags(playlist, "d", "");
  
  if (isLocalPlaylist(playlist)) {
    return `local:${dTag}`;
  } else {
    return `${playlist.pubkey}:${dTag}`;
  }
}



////////////////
/**
 * Check all videos in a playlist for non-whitelisted domains
 * Returns array of unique non-whitelisted domains
 */
async function checkPlaylistDomains(videoEvents) {
  const nonWhitelistedDomains = new Set();
  
  for (const event of videoEvents) {
    // Skip placeholder videos
    if (event.isPlaceholder) continue;
    
    const url = getValueFromTags(event, "url", "");
    if (!url) continue;
    
    const hostname = extractHostname(url);
    if (!hostname) continue;
    
    // Check if domain is whitelisted
    if (!app.mediaServerWhitelist.includes(hostname)) {
      nonWhitelistedDomains.add(hostname);
    }
  }
  
  return Array.from(nonWhitelistedDomains);
}

/**
 * Prompt user to whitelist domains for seamless playlist experience
 * Returns true if user accepts, false if cancelled
 */
async function promptWhitelistDomains(domains) {
  if (domains.length === 0) return true;
  
  const domainList = domains.map(d => `  • ${d}`).join('\n');
  const message = `This playlist contains videos from servers not in your whitelist:\n\n${domainList}\n\nWould you like to add them for seamless playback?\n\n(still works if you cancel but you'll need to approve servers as needed)`;
  
  const userConfirmed = confirm(message);
  
  if (userConfirmed) {
    // Add all domains to whitelist
    domains.forEach(hostname => {
      if (!app.mediaServerWhitelist.includes(hostname)) {
        app.mediaServerWhitelist.push(hostname);
      }
    });
    
    // Save to localStorage
    localStorage.setItem("mediaServerWhitelist", JSON.stringify(app.mediaServerWhitelist));
    
    showTemporaryNotification(`Added ${domains.length} server${domains.length !== 1 ? 's' : ''} to whitelist`);
    console.log(`Added ${domains.length} domain(s) to whitelist:`, domains);
  }
  
  return userConfirmed;
}


/////////
/**
 * Extract relay hints from playlist e-tags
 * @param {Array} tags - Playlist tags array
 * @returns {Array} - Array of unique relay URLs
 */
function extractRelayHintsFromPlaylist(tags) {
  if (!tags || !Array.isArray(tags)) return [];
  
  const relayHints = new Set();
  
  tags.forEach(tag => {
    // e-tags can have relay hints as third element: ["e", "event-id", "relay-url"]
    if (tag[0] === "e" && tag[2]) {
      const relayUrl = cleanRelayUrl(tag[2]);
      if (relayUrl) {
        relayHints.add(relayUrl);
      }
    }
  });
  
  const hints = Array.from(relayHints);
  if (hints.length > 0) {
    console.log(`📡 Found ${hints.length} relay hints in playlist:`, hints);
  }
  
  return hints;
}




/**
 * Get the relay hint for a specific video ID from playlist tags
 * @param {Array} playlistTags - The playlist's tags array
 * @param {string} videoId - The video event ID
 * @returns {string|null} - The relay URL or null if not found
 */
function getRelayHintForVideo(playlistTags, videoId) {
  if (!playlistTags || !Array.isArray(playlistTags)) return null;
  
  const eTag = playlistTags.find(tag => 
    tag[0] === "e" && tag[1] === videoId && tag[2]
  );
  
  return eTag ? eTag[2] : null;
}