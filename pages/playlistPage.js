async function playlistPageHandler() {
  const urlParts = window.location.hash.split("/");
  const playlistPath = urlParts[1] || "";

  // Split the path to separate the base path from query parameters
  const [basePath, queryString] = playlistPath.split("?");

  if (!basePath) {
    window.location.hash = "#playlists";
    return;
  }

  mainContent.innerHTML = `
        <h1>Playlist</h1>
        <div class="loading-indicator">
            <p>Loading playlist...</p>
        </div>
    `;

  try {
    // Parse and validate specific parameters
    const { id, discovery, author, dtag, error } =
      parsePlaylistParams(queryString);

    if (error) {
      throw new Error(error);
    }

    console.log("Playlist params:", { id, discovery, author, dtag });

    // Query for the playlist event
    let playlistResult;

    // For replaceable events, we need author and dtag, not just id
    if (author && dtag) {
      // This is the correct way to query replaceable events
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
          if (
            !cleanRelay.startsWith("ws://") &&
            !cleanRelay.startsWith("wss://")
          ) {
            cleanRelay = `wss://${cleanRelay}`;
          }
          return cleanRelay;
        });

        const allRelays = [
          ...new Set([...formattedDiscoveryRelays, ...appRelays]),
        ];
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
      // Fallback: try to get by ID (this might work for some cases)
      console.log("Trying to get playlist by ID (fallback):", id);

      if (discovery && discovery.length > 0) {
        // ... existing discovery relay logic but with proper filter
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
          if (
            !cleanRelay.startsWith("ws://") &&
            !cleanRelay.startsWith("wss://")
          ) {
            cleanRelay = `wss://${cleanRelay}`;
          }
          return cleanRelay;
        });

        const allRelays = [
          ...new Set([...formattedDiscoveryRelays, ...appRelays]),
        ];

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
      throw new Error(
        "Either (author + dtag) or id is required for playlist lookup"
      );
    }

    if (playlistResult) {
      console.log("Playlist result:", JSON.stringify(playlistResult, null, 2));
      renderPlaylistPage(playlistResult, id || `${author}:${dtag}`);
    } else {
      // Show "playlist not found" message
      mainContent.innerHTML = `
                <div class="playlist-not-found">
                    <h1>Playlist Not Found</h1>
                    <p>The playlist was not found on the relays.</p>
                    <div class="not-found-actions">
                        <button class="btn-primary extensive-search-btn">Try Extensive Search</button>
                    </div>
                </div>
            `;

      const extensiveSearchBtn = mainContent.querySelector(
        ".extensive-search-btn"
      );
      extensiveSearchBtn?.addEventListener("click", async () => {
        let staticRelays = ["relay.nostr.band", "nos.lol", "nostr.mom"];
        const playlistUrl = `#playlist/params?${
          author && dtag ? `author=${author}&dtag=${dtag}` : `id=${id}`
        }&discovery=${staticRelays.join(",")}`;
        console.log("Navigating to playlist URL:", playlistUrl);
        window.location.hash = playlistUrl;
      });
    }
  } catch (error) {
    console.error("Error rendering playlist page:", error);
    mainContent.innerHTML = `
            <h1>Error</h1>
            <div class="error-message">
                <p>Error loading playlist: ${formatErrorForDisplay(error)}</p>
            </div>
        `;
  }
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
      discoveryRelays = params.discovery
        .split(",")
        .map((relay) => relay.trim());
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
      discoveryRelays = params.discovery
        .split(",")
        .map((relay) => relay.trim());
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

function renderPlaylistPage(playlistResult, playlistId) {
  // Handle the case where we might get an array or single event
  let playlist;
  let resultType = "single";

  if (Array.isArray(playlistResult)) {
    if (playlistResult.length === 0) {
      mainContent.innerHTML = `
                <h1>No Playlist Found</h1>
                <p>No playlist events were returned.</p>
            `;
      return;
    }

    playlist = playlistResult[0]; // Take the first one
    resultType = "array";

    if (playlistResult.length > 1) {
      console.warn(
        `Multiple playlist events received (${playlistResult.length}), using the first one`
      );
    }
  } else {
    playlist = playlistResult;
  }

  // Sanitize the event
  try {
    playlist = sanitizeNostrEvent(playlist);
  } catch (error) {
    console.error("Error sanitizing playlist event:", error);
  }

  // Extract basic data safely
  const title = getValueFromTags(playlist, "title", "Untitled Playlist");
  const description = getValueFromTags(playlist, "description", "");
  const dTag = getValueFromTags(playlist, "d", "");

  // Extract video references (a tags) safely
  const videoRefs = playlist.tags
    ? playlist.tags.filter((tag) => tag[0] === "a")
    : [];

  // Safe time formatting
  let timeDisplay = "Unknown time";
  if (
    playlist.created_at &&
    typeof playlist.created_at === "number" &&
    playlist.created_at > 0
  ) {
    try {
      timeDisplay = getRelativeTime(playlist.created_at);
    } catch (error) {
      console.error("Error formatting time:", error);
      timeDisplay = new Date(playlist.created_at * 1000).toLocaleString();
    }
  }

  mainContent.innerHTML = `
        <div class="playlist-page">
            <h1>Playlist</h1>
            
            <div class="playlist-basic-info">
                <h2>${escapeHtml(title)}</h2>
                ${
                  description
                    ? `<p><strong>Description:</strong> ${escapeHtml(
                        description
                      )}</p>`
                    : ""
                }
                <p><strong>Created:</strong> ${escapeHtml(timeDisplay)}</p>
                <p><strong>Videos:</strong> ${videoRefs.length}</p>
                <p><strong>Author:</strong> ${escapeHtml(
                  playlist.pubkey || "Unknown"
                )}</p>
                ${
                  dTag
                    ? `<p><strong>Identifier:</strong> ${escapeHtml(dTag)}</p>`
                    : ""
                }
                
                <div class="playlist-actions">
                    <button class="btn-primary save-playlist-btn" data-playlist-id="${escapeHtml(
                      playlistId
                    )}">Save to Local</button>
                </div>
            </div>
            
            ${
              videoRefs.length > 0
                ? `
                <div class="playlist-videos">
                    <h3>Video References:</h3>
                    <ul>
                        ${videoRefs
                          .map(
                            (ref, index) => `
                            <li>
                                <strong>${index + 1}.</strong> ${escapeHtml(
                              ref[1] || "Invalid reference"
                            )}
                                ${
                                  ref[1]
                                    ? `<button class="btn-secondary view-video-btn" data-ref="${escapeHtml(
                                        ref[1]
                                      )}">View</button>`
                                    : ""
                                }
                            </li>
                        `
                          )
                          .join("")}
                    </ul>
                </div>
            `
                : "<p>No videos in this playlist.</p>"
            }
            
            <div class="playlist-debug-info">
                <details>
                    <summary>Debug Info</summary>
                    <p><strong>Result Type:</strong> ${resultType}</p>
                    ${
                      Array.isArray(playlistResult)
                        ? `<p><strong>Events Received:</strong> ${playlistResult.length}</p>`
                        : ""
                    }
                    <p><strong>Event ID:</strong> ${escapeHtml(
                      playlist.id || "Unknown"
                    )}</p>
                    <p><strong>Event Kind:</strong> ${
                      playlist.kind || "Unknown"
                    }</p>
                </details>
            </div>
            
            <div class="playlist-raw-data">
                <details>
                    <summary>Raw JSON Data</summary>
                    <pre>${JSON.stringify(playlist, null, 2)}</pre>
                </details>
            </div>
        </div>
    `;

  // Add event listeners
  setupNetworkPlaylistEventListeners(playlist);
}

function setupNetworkPlaylistEventListeners(playlist) {
  // Save playlist button
  const savePlaylistBtn = mainContent.querySelector(".save-playlist-btn");
  if (savePlaylistBtn) {
    savePlaylistBtn.addEventListener("click", async () => {
      const originalText = savePlaylistBtn.textContent;

      try {
        savePlaylistBtn.textContent = "Saving...";
        savePlaylistBtn.disabled = true;

        await saveNetworkPlaylistToLocal(playlist);

        savePlaylistBtn.textContent = "Saved!";
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

  // Existing view video buttons
  const viewVideoButtons = mainContent.querySelectorAll(".view-video-btn");
  viewVideoButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const ref = e.target.dataset.ref;
      console.log("View video reference:", ref);

      // Parse the "a" tag format: kind:pubkey:identifier or kind:eventid
      const parts = ref.split(":");
      if (parts.length >= 2) {
        const eventId = parts[1];
        window.location.hash = `#watch/${eventId}`;
      }
    });
  });
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
      showTemporaryNotification("Playlist saved to local storage");
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
  const localDTag =
    originalDTag || `vutr-${networkPlaylist.id.substring(0, 12)}`;

  // Ensure the d-tag has the local prefix
  const finalDTag = localDTag.startsWith("vutr-")
    ? localDTag
    : `vutr-${localDTag}`;

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
    sig: networkPlaylist.sig || "network", // Mark as from network
  };

  return localPlaylist;
}
