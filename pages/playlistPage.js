async function playlistPageHandler() {
  const urlParts = window.location.hash.split("/");
  const playlistPath = urlParts[1] || "";
  
  // Split the path to separate the base path from query parameters
  const [basePath, queryString] = playlistPath.split("?");
  
  if (!basePath) {
    window.location.hash = "#playlists";
    return;
  }
  
  showPlaylistLoadingState();
  
  try {
    // Parse and validate specific parameters
    const { id, discovery, author, dtag, error } = parsePlaylistParams(queryString);
    
    if (error) {
      throw new Error(error);
    }
    
    console.log("Playlist params:", { id, discovery, author, dtag });
    
    // Query for the playlist event
    let playlistResult;
    
    // For replaceable events, we need author and dtag, not just id
    if (author && dtag) {
      console.log("Getting playlist by author and dtag:", author, dtag);
      
      if (discovery && discovery.length > 0) {
        const formattedDiscoveryRelays = discovery.map((relay) => {
          let cleanRelay = relay.trim();
          cleanRelay = cleanRelay.replace(/^wss?::\/\//, "wss://");
          if (cleanRelay.startsWith("wss://")) {
            cleanRelay = cleanRelay.slice(6);
          } else if (cleanRelay.startsWith("ws://")) {
            cleanRelay = cleanRelay.slice(5);
          }
          return `wss://${cleanRelay}`;
        });
        
        const appRelays = (app.relays || []).map((relay) => {
          let cleanRelay = relay.trim();
          cleanRelay = cleanRelay.replace(/^wss?::\/\//, "wss://");
          if (!cleanRelay.startsWith("ws://") && !cleanRelay.startsWith("wss://")) {
            cleanRelay = `wss://${cleanRelay}`;
          }
          return cleanRelay;
        });
        
        const allRelays = [...new Set([...formattedDiscoveryRelays, ...appRelays])];
        console.log("Combined relay list:", allRelays);
        
        playlistResult = await NostrClient.getEventsFromRelays(allRelays, {
          kinds: [30005],
          authors: [author],
          tags: { d: [dtag] },
          limit: 1,
        });
      } else {
        const extendedRelays = await getExtendedRelaysForProfile(author);
        playlistResult = await NostrClient.getEventsFromRelays(extendedRelays, {
          kinds: [30005],
          authors: [author],
          tags: { d: [dtag] },
          limit: 1,
        });
      }
    } else if (id) {
      console.log("Trying to get playlist by ID (fallback):", id);
      
      if (discovery && discovery.length > 0) {
        const formattedDiscoveryRelays = discovery.map((relay) => {
          let cleanRelay = relay.trim();
          cleanRelay = cleanRelay.replace(/^wss?::\/\//, "wss://");
          if (cleanRelay.startsWith("wss://")) {
            cleanRelay = cleanRelay.slice(6);
          } else if (cleanRelay.startsWith("ws://")) {
            cleanRelay = cleanRelay.slice(5);
          }
          return `wss://${cleanRelay}`;
        });
        
        const appRelays = (app.relays || []).map((relay) => {
          let cleanRelay = relay.trim();
          cleanRelay = cleanRelay.replace(/^wss?::\/\//, "wss://");
          if (!cleanRelay.startsWith("ws://") && !cleanRelay.startsWith("wss://")) {
            cleanRelay = `wss://${cleanRelay}`;
          }
          return cleanRelay;
        });
        
        const allRelays = [...new Set([...formattedDiscoveryRelays, ...appRelays])];
        
        playlistResult = await NostrClient.getEventsFromRelays(allRelays, {
          kinds: [30005],
          ids: [id],
          limit: 1,
        });
      } else {
        playlistResult = await NostrClient.getEvents({
          kinds: [30005],
          ids: [id],
          limit: 1,
        });
      }
    } else {
      throw new Error("Either (author + dtag) or id is required for playlist lookup");
    }
    
    if (playlistResult) {
      console.log("Playlist result:", JSON.stringify(playlistResult, null, 2));
      
      const playlist = Array.isArray(playlistResult) ? playlistResult[0] : playlistResult;
      
      if (!playlist) {
        showPlaylistNotFound();
        return;
      }
      
      const sanitizedPlaylist = sanitizeNostrEvent(playlist);
      const videoTags = filterValidVideoTags(sanitizedPlaylist.tags);
      
      // Fetch video events
      const videoEvents = await fetchVideoEvents(videoTags);
      
      // **CACHE THE VIDEO EVENTS HERE**
      const playlistId = id || `${author}:${dtag}`;
      app.playlistVideoCache = {
        videos: videoEvents,
        playlistId: playlistId
      };
      
      renderNetworkPlaylist(sanitizedPlaylist, videoEvents, playlistId);
      setupNetworkPlaylistEventListeners(sanitizedPlaylist, videoEvents); // Pass videoEvents
      
    } else {
      showPlaylistNotFoundWithSearch(author, dtag, id);
    }
    
  } catch (error) {
    console.error("Error rendering playlist page:", error);
    showPlaylistError(error);
  }
}

function filterValidVideoTags(tags) {
  if (!tags) return [];
  
  // OLD: return tags.filter(tag => {
  //   if (tag[0] !== "a") return false;
  //   const videoRef = tag[1];
  //   if (!videoRef) return false;
  //   return videoRef.startsWith("21:") || videoRef.startsWith("22:");
  // });
  
  // NEW: Simple e tag filtering
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
  
  // For replaceable events, we prefer author + dtag combination
  if (params.author && params.dtag) {
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
  
  // Fallback to ID-based lookup
  if (params.id) {
    // Validate ID format
    const idPattern = /^[a-f0-9]{64}$/i;
    if (!idPattern.test(params.id)) {
      return { error: "Invalid playlist ID format" };
    }
    
    // Parse discovery relays if present
    let discoveryRelays = null;
    if (params.discovery) {
      discoveryRelays = params.discovery.split(",").map((relay) => relay.trim());
    }
    
    return {
      id: params.id,
      discovery: discoveryRelays,
      author: params.author || null,
      error: null,
    };
  }
  
  return { error: "Either (author + dtag) or id is required" };
}

function showPlaylistNotFoundWithSearch(author, dtag, id) {
  mainContent.innerHTML = `
    <div class="empty-state">
      <h1>Playlist Not Found</h1>
      <p>The playlist was not found on the relays.</p>
      <div class="playlist-actions">
        <button class="btn-primary extensive-search-btn">Try Extensive Search</button>
      </div>
    </div>
  `;
  
  const extensiveSearchBtn = mainContent.querySelector(".extensive-search-btn");
  extensiveSearchBtn?.addEventListener("click", async () => {
    let staticRelays = ["relay.nostr.band", "nos.lol", "nostr.mom"];
    const playlistUrl = `#playlist/params?${
      author && dtag ? `author=${author}&dtag=${dtag}` : `id=${id}`
    }&discovery=${staticRelays.join(",")}`;
    console.log("Navigating to playlist URL:", playlistUrl);
    window.location.hash = playlistUrl;
  });
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
      const firstVideo = document.querySelector('.network-playlist-video');
      if (firstVideo) {
        // Use cached video events or fetch if needed
        let videoEvents = cachedVideoEvents;
        
        if (!videoEvents && app.playlistVideoCache.playlistId === playlistId) {
          videoEvents = app.playlistVideoCache.videos;
        }
        
        if (!videoEvents) {
          const videoTags = filterValidVideoTags(playlist.tags);
          videoEvents = await fetchVideoEvents(videoTags);
        }
        
        // Check for non-whitelisted domains
        const nonWhitelistedDomains = await checkPlaylistDomains(videoEvents);
        
        if (nonWhitelistedDomains.length > 0) {
          await promptWhitelistDomains(nonWhitelistedDomains);
        }
        
        const videoId = firstVideo.dataset.videoId;
        window.location.hash = `#watch/params?v=${videoId}&listp=${author}&listd=${dTag}`;
      }
    });
  }
  
  // Make entire video item clickable WITH playlist params
  document.querySelectorAll('.network-playlist-video').forEach(item => {
    if (!item.classList.contains('placeholder-video')) {
      item.addEventListener('click', async (e) => {
        // Use cached video events or fetch if needed
        let videoEvents = cachedVideoEvents;
        
        if (!videoEvents && app.playlistVideoCache.playlistId === playlistId) {
          videoEvents = app.playlistVideoCache.videos;
        }
        
        if (!videoEvents) {
          const videoTags = filterValidVideoTags(playlist.tags);
          videoEvents = await fetchVideoEvents(videoTags);
        }
        
        // Check for non-whitelisted domains
        const nonWhitelistedDomains = await checkPlaylistDomains(videoEvents);
        
        if (nonWhitelistedDomains.length > 0) {
          await promptWhitelistDomains(nonWhitelistedDomains);
        }
        
        const videoId = item.dataset.videoId;
        window.location.hash = `#watch/params?v=${videoId}&listp=${author}&listd=${dTag}`;
      });
      item.style.cursor = 'pointer';
    }
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
    
    const domain = extractDomain(url);
    if (!domain) continue;
    
    // Check if domain is whitelisted
    if (!isDomainWhitelisted(url)) {
      nonWhitelistedDomains.add(domain);
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
  const message = `Would you like to add these servers to your whitelist for seamless playback?\n\n${domainList}\n\n(If you cancel, this still works but you will have to manually allow servers as needed)`;
  
  const userConfirmed = confirm(message);
  
  if (userConfirmed) {
    // Add all domains to whitelist
    domains.forEach(domain => {
      if (!app.mediaServerWhitelist.includes(domain.toLowerCase())) {
        app.mediaServerWhitelist.push(domain.toLowerCase());
      }
    });
    
    // Save to localStorage
    localStorage.setItem("mediaServerWhitelist", JSON.stringify(app.mediaServerWhitelist));
    console.log(`Added ${domains.length} domain(s) to whitelist:`, domains);
  }
  
  return userConfirmed;
}