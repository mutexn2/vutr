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
      
      // Handle array or single event
      const playlist = Array.isArray(playlistResult) ? playlistResult[0] : playlistResult;
      
      if (!playlist) {
        showPlaylistNotFound();
        return;
      }
      
      // Sanitize the event
      const sanitizedPlaylist = sanitizeNostrEvent(playlist);
      
      // Filter valid video tags (only kind:21 and kind:22)
      const videoTags = filterValidVideoTags(sanitizedPlaylist.tags);
      
      // Fetch video events
      const videoEvents = await fetchVideoEvents(videoTags);
      
      renderNetworkPlaylist(sanitizedPlaylist, videoEvents, id || `${author}:${dtag}`);
      setupNetworkPlaylistEventListeners(sanitizedPlaylist);
      
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
  
  return tags.filter(tag => {
    if (tag[0] !== "a") return false;
    
    const videoRef = tag[1];
    if (!videoRef) return false;
    
    // Check if it starts with "21:" or "22:"
    return videoRef.startsWith("21:") || videoRef.startsWith("22:");
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

function renderNetworkPlaylist(playlist, videoEvents, playlistId) {
  const title = getValueFromTags(playlist, "title", "Untitled Playlist");
  const description = getValueFromTags(playlist, "description", "");
  const image = getValueFromTags(playlist, "image", "");
  const dTag = getValueFromTags(playlist, "d", "");
  const validVideoCount = videoEvents.length;
  
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
            <span class="video-count">${validVideoCount} valid video${validVideoCount !== 1 ? 's' : ''}</span>
            <span class="created-date">Created ${escapeHtml(getRelativeTime(playlist.created_at))}</span>
          </div>
        </div>
      </div>
      <div class="playlist-actions">
        <button class="btn-primary save-playlist-btn" data-playlist-id="${escapeHtml(playlistId)}">
          Save to Local
        </button>
      </div>
    </div>
    
  <!--  <div class="playlist-publisher-info">
      <p><strong>Publisher:</strong> ${escapeHtml(playlist.pubkey)}</p>
      ${dTag ? `<p><strong>Playlist ID (d-tag):</strong> ${escapeHtml(dTag)}</p>` : ''}
    </div>    -->

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

function renderNetworkPlaylistVideos(videoEvents) {
  if (videoEvents.length === 0) {
    return `
      <div class="empty-playlist">
        <p>No valid videos found in this playlist (only kind:21 and kind:22 are supported).</p>
        <a href="#home" class="nav-link">Browse Videos</a>
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

function setupNetworkPlaylistEventListeners(playlist) {
  // Make entire video item clickable to watch video
  document.querySelectorAll('.network-playlist-video').forEach(item => {
    if (!item.classList.contains('placeholder-video')) {
      item.addEventListener('click', (e) => {
        const videoId = item.dataset.videoId;
        window.location.hash = `#watch/${videoId}`;
      });
      
      // Add hover cursor
      item.style.cursor = 'pointer';
    }
  });
  
  // Save playlist button
  const savePlaylistBtn = document.querySelector(".save-playlist-btn");
  if (savePlaylistBtn) {
    savePlaylistBtn.addEventListener("click", async () => {
      const originalText = savePlaylistBtn.textContent;
      
      try {
        savePlaylistBtn.textContent = "Saving...";
        savePlaylistBtn.disabled = true;
        
        await saveNetworkPlaylistToLocal(playlist);
        
        savePlaylistBtn.textContent = "Saved!";
        showTemporaryNotification('Playlist saved to local storage');
        
        setTimeout(() => {
          savePlaylistBtn.textContent = originalText;
          savePlaylistBtn.disabled = false;
        }, 2000);
        
      } catch (error) {
        console.error("Error saving playlist:", error);
        savePlaylistBtn.textContent = "Save Failed";
        setTimeout(() => {
          savePlaylistBtn.textContent = originalText;
          savePlaylistBtn.disabled = false;
        }, 2000);
        
        alert("Failed to save playlist: " + error.message);
      }
    });
  }
}

async function saveNetworkPlaylistToLocal(networkPlaylist) {
  try {
    // Convert network playlist to local format
    const localPlaylist = convertNetworkPlaylistToLocal(networkPlaylist);
    
    // Check if playlist already exists locally
    const existingPlaylists = app.playlists || [];
    const existingIndex = existingPlaylists.findIndex(
      (p) => p.id === localPlaylist.id
    );
    
    if (existingIndex !== -1) {
      // Update existing playlist
      const shouldUpdate = confirm(
        "This playlist already exists locally. Do you want to update it?"
      );
      if (shouldUpdate) {
        app.playlists[existingIndex] = localPlaylist;
        showTemporaryNotification("Playlist updated in local storage");
      } else {
        return;
      }
    } else {
      // Add new playlist
      app.playlists = app.playlists || [];
      app.playlists.push(localPlaylist);
    }
    
    // Save to localStorage
    savePlaylistsToStorage();
    
    console.log("Playlist saved locally:", localPlaylist);
  } catch (error) {
    console.error("Error saving playlist to local:", error);
    throw error;
  }
}

function convertNetworkPlaylistToLocal(networkPlaylist) {
  // Generate a local d-tag if one doesn't exist
  const originalDTag = getValueFromTags(networkPlaylist, "d", "");
  const localDTag = originalDTag || `vutr-${networkPlaylist.id.substring(0, 12)}`;
  
  // Ensure the d-tag has the local prefix
  const finalDTag = localDTag.startsWith("vutr-") ? localDTag : `vutr-${localDTag}`;
  
  // Convert the tags, updating the d-tag for local storage
  const convertedTags = networkPlaylist.tags.map((tag) => {
    if (tag[0] === "d") {
      return ["d", finalDTag];
    }
    return tag;
  });
  
  // Create the local playlist structure
  const localPlaylist = {
    id: networkPlaylist.id,
    pubkey: networkPlaylist.pubkey,
    created_at: networkPlaylist.created_at,
    kind: networkPlaylist.kind,
    tags: convertedTags,
    content: networkPlaylist.content || "",
    sig: networkPlaylist.sig || "network",
  };
  
  return localPlaylist;
}