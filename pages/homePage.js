async function homePageHandler() {
  mainContent.innerHTML = `
  <div id="homePage-container">
    <h1>Discovering Videos</h1>
    <div class="loading-indicator">
        <p>Searching for video events...</p>
    </div>
  </div>
  `;

  let pageContainer = document.getElementById("homePage-container");

  try {
    // Parse URL parameters
    const filterParams = parseFilterUrl();
    console.log("Current filter params:", filterParams);

    let kinds = [21];
    let limit = 50;

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
<button id="shorts-btn" class="shorts-button">
  <svg viewBox="0 0 24 24" class="shorts-icon">
    <rect x="8" y="4" width="8" height="16" rx="2" fill="currentColor"/>
    <polygon points="10,9 10,15 14,12" fill="white"/>
  </svg>
  <span>Shorts</span>
</button>

<div>
      <div id="filter-container"></div>
</div>

      <div class="videos-grid"></div>
      <div class="load-more-container" style="text-align: center; margin-top: 20px;"></div>
    `;

    // Create and setup filter form
    let filterContainer = document.getElementById("filter-container");
    let filterForm = createFilterForm(config);
    filterContainer.appendChild(filterForm);

    // Initialize filter form with current URL params
    initializeFilterFromUrl(filterForm, filterParams);

// Pagination variables
const EVENTS_PER_PAGE = 20;
let currentPage = 0;

// Function to render current page
const renderCurrentPage = () => {
  const grid = document.querySelector(".videos-grid");
  const loadMoreContainer = document.querySelector(".load-more-container");
  
  // Calculate which events to show
  const startIndex = currentPage * EVENTS_PER_PAGE;
  const endIndex = (currentPage + 1) * EVENTS_PER_PAGE;
  const videosToShow = videos.slice(startIndex, endIndex);
  
  // Only render new events for the current page
  videosToShow.forEach((video) => {
    let card = createVideoCard(video);
    grid.appendChild(card);
  });

  // Update pagination button
  updatePaginationButton();
};

// Function to update pagination button
const updatePaginationButton = () => {
  const loadMoreContainer = document.querySelector(".load-more-container");
  if (!loadMoreContainer) return;

  const totalEvents = videos.length;
  const eventsShown = (currentPage + 1) * EVENTS_PER_PAGE;
  
  // Show load more button if there are more events to show
  if (eventsShown < totalEvents) {
    const remainingEvents = totalEvents - eventsShown;
    const nextPageEvents = Math.min(remainingEvents, EVENTS_PER_PAGE);
    
    const button = document.createElement('button');
    button.textContent = `Show More (${nextPageEvents} more)`;
    button.className = 'load-more-btn';
    
    button.addEventListener('click', () => {
      currentPage++;
      renderCurrentPage(); // This will now only append new cards
    });
    
    loadMoreContainer.innerHTML = '';
    loadMoreContainer.appendChild(button);
  } else {
    loadMoreContainer.innerHTML = '';
  }
};

    // Initial render
    renderCurrentPage();

    // Video card click handler
    const grid = document.querySelector(".videos-grid");
    grid.addEventListener("click", (event) => {
      let card = event.target.closest(".video-card");
      if (card && card.dataset.videoId) {
        const discoveryRelays = app.relays.slice(0, 3).map(cleanRelayUrl);
        const uniqueDiscoveryRelays = [...new Set(discoveryRelays)];
        const discoveryParam = uniqueDiscoveryRelays.join(",");
        const watchUrl = `#watch/params?v=${card.dataset.videoId}&discovery=${discoveryParam}`;

        console.log("Navigating to watch URL:", watchUrl);
        window.location.hash = watchUrl;
      }
    });

    document.getElementById("shorts-btn").addEventListener("click", () => {
      window.location.hash = "#shorts";
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