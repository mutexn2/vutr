async function shortsPageHandler() {
  mainContent.innerHTML = `
  <div id="shortsPage-container">
    <h1>Discovering Videos</h1>
    <div class="loading-indicator">
        <p>Searching for video events...</p>
    </div>
  </div>
  `;

  let pageContainer = document.getElementById("shortsPage-container");

  try {
    // Parse URL parameters
    const filterParams = parseFilterUrl();
    console.log("Current filter params:", filterParams);

    let kinds = [22];
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

    let videos = await NostrClient.getEvents(queryOptions);
    videos = videos.map(sanitizeNostrEvent).filter((v) => v !== null);

    if (videos.length === 0) {
      pageContainer.innerHTML = `
    <h1>No Videos Found</h1>
    <p>No videos found.</p>
  `;

      setTimeout(() => {
        window.location.hash = "home";
      }, 1200);

      return;
    }

    // Apply sorting based on filter params
    videos = applySorting(videos, filterParams.sortBy);

    console.log(
      `Found ${videos.length} videos, sorted by: ${filterParams.sortBy}`
    );

    pageContainer.innerHTML = `
      <div id="filter-container"></div>
      <div class="videos-grid"></div>
    `;

    // Create and setup filter form
    let filterContainer = document.getElementById("filter-container");
    let filterForm = createFilterForm(config);
    filterContainer.appendChild(filterForm);

    // Initialize filter form with current URL params
    initializeFilterFromUrl(filterForm, filterParams);

    // Render videos
    let grid = document.querySelector(".videos-grid");
    videos.forEach((video) => {
      let card = createVideoCard(video);
      grid.appendChild(card);
    });

    grid.addEventListener("click", (event) => {
      let card = event.target.closest(".video-card");
      if (card && card.dataset.videoId) {
        //  window.location.hash = `#watch/${card.dataset.videoId}`;
        const discoveryRelays = app.relays.slice(0, 3).map(cleanRelayUrl);
        const uniqueDiscoveryRelays = [...new Set(discoveryRelays)];
        const discoveryParam = uniqueDiscoveryRelays.join(",");
        const watchUrl = `#watch/params?v=${card.dataset.videoId}&discovery=${discoveryParam}`;

        console.log("Navigating to watch URL:", watchUrl);
        window.location.hash = watchUrl;
      }
    });
  } catch (error) {
    console.error("Error rendering home page:", error);
    let errorDiv = document.createElement("div");
    errorDiv.innerHTML = safeHtml`
      <h1>404</h1>
      <div class="loading-indicator">
        <p>Error rendering home page: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
    pageContainer.replaceChildren(errorDiv);
  }
}







