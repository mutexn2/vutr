async function playlistsPageHandler() {
  mainContent.innerHTML = `
  <div id="playlistPage-container">
    <h1>Discovering Playlists</h1>
    <div class="loading-indicator">
        <p>Searching for kind 30005 events...</p>
    </div>
    </div>
  `;

  let pageContainer = document.getElementById("playlistPage-container");

  try {
    // Parse URL parameters
    const filterParams = parseFilterUrl();
    console.log("Current filter params:", filterParams);

    let kinds = [30005];
    let limit = 21;

    // Prepare query options
    let queryOptions = { kinds: kinds, limit: limit };

    // Add tags to query if specified
    if (filterParams.tags.length > 0) {
      queryOptions.tags = { t: filterParams.tags };
    }

    // Add date filter to query if specified
    if (filterParams.dateFilter !== "any") {
      const since = getDateFilterTimestamp(filterParams.dateFilter);
      if (since) {
        queryOptions.since = since;
      }
    }

    console.log("Querying with options:", queryOptions);

    let playlists = await NostrClient.getEvents(queryOptions);
    playlists = playlists.map(sanitizeNostrEvent).filter((v) => v !== null);

    // Filter to only include playlists with valid kind-21 references
    //playlists = filterValidPlaylists(playlists);

    if (playlists.length === 0) {
      pageContainer.innerHTML = `
        <h1>No playlists Found</h1>
        <p>No playlists found.</p>
      `;

      setTimeout(() => {
        window.location.hash = "playlists";
      }, 1200);

      return;
    }

    // Apply sorting based on filter params
    playlists = applySorting(playlists, filterParams.sortBy);

    console.log(
      `Found ${playlists.length} playlists, sorted by: ${filterParams.sortBy}`
    );

    pageContainer.innerHTML = `
      <div id="filter-container"></div>
      <div class="playlists-grid"></div>
    `;

    // Create and setup filter form
    let filterContainer = document.getElementById("filter-container");
    let filterForm = createFilterForm(config);
    filterContainer.appendChild(filterForm);

    // Initialize filter form with current URL params
    initializeFilterFromUrl(filterForm, filterParams);

    // Render playlists using the new playlist card
    let grid = document.querySelector(".playlists-grid");
    playlists.forEach((playlist) => {
      let card = createPlaylistCard(playlist);
      grid.appendChild(card);
    });

    grid.addEventListener("click", async (event) => {
      let card = event.target.closest(".playlist-card");
      if (card && card.dataset.playlistId) {
        const discoveryRelays = app.relays.slice(0, 3).map(cleanRelayUrl);
        const uniqueDiscoveryRelays = [...new Set(discoveryRelays)];
        const discoveryParam = uniqueDiscoveryRelays.join(",");
        
        const author = card.dataset.author;
        const dtag = card.dataset.dtag;

        const playlistUrl = `#playlist/params?author=${author}&dtag=${dtag}&discovery=${discoveryParam}`;
        console.log("Navigating to playlist URL:", playlistUrl);
        window.location.hash = playlistUrl;
      }
    });
  } catch (error) {
    console.error("Error rendering playlists page:", error);
    let errorDiv = document.createElement("div");
    errorDiv.innerHTML = safeHtml`
      <h1>404</h1>
      <div class="loading-indicator">
        <p>Error rendering playlists page: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
    pageContainer.replaceChildren(errorDiv);
  }
}


function filterValidPlaylists(playlists) {
  return playlists.filter(playlist => {
    // Check if the playlist has tags
    if (!playlist.tags || !Array.isArray(playlist.tags)) {
      return false;
    }

    // Look for at least one valid kind-21 reference
    return playlist.tags.some(tag => {
      // Check if it's an "a" tag with at least 2 elements
      if (!Array.isArray(tag) || tag.length < 2 || tag[0] !== "a") {
        return false;
      }

      const aTagValue = tag[1];
      
      // Check if it starts with "21:"
      if (!aTagValue || typeof aTagValue !== "string" || !aTagValue.startsWith("21:")) {
        return false;
      }

      // Extract the ID part after "21:"
      const idPart = aTagValue.substring(3);
      
      // Check if the ID is exactly 64 characters (valid hex length)
      return idPart.length === 64 && /^[a-fA-F0-9]{64}$/.test(idPart);
    });
  });
}