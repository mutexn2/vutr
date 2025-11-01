async function homePageHandler() {
  // Clean up any existing home subscription
  if (app.homeSubscription) {
    app.homeSubscription.close();
    app.homeSubscription = null;
  }
  if (app.homePool) {
    app.homePool.close(app.relays);
    app.homePool = null;
  }

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

    pageContainer.innerHTML = `
<button id="shorts-btn" class="shorts-button">
  <svg viewBox="0 24 24" class="shorts-icon">
    <rect x="8" y="4" width="8" height="16" rx="2" fill="currentColor"/>
    <polygon points="10,9 10,15 14,12" fill="white"/>
  </svg>
  <span>Shorts</span>
</button>

<div>
  <div id="filter-container"></div>
</div>

<div class="videos-grid"></div>
<div class="load-more-container" style="text-align: center; padding: 20px;">
  <button id="load-more-btn" class="load-more-btn" style="display: none;">Load More Videos</button>
  <p id="load-more-status" style="display: none;"></p>
</div>
    `;

    // Create and setup filter form
    let filterContainer = document.getElementById("filter-container");
    let filterForm = createFilterForm(config);
    filterContainer.appendChild(filterForm);

    // Initialize filter form with current URL params
    initializeFilterFromUrl(filterForm, filterParams);

    const grid = document.querySelector(".videos-grid");
    const loadMoreBtn = document.getElementById("load-more-btn");
    const loadMoreStatus = document.getElementById("load-more-status");
    
    // Infinite scroll state
    const scrollState = {
      currentTimestamp: Math.floor(Date.now() / 1000), // Current time in seconds
      oldestTimestamp: null, // Will be set to the oldest event we've loaded
      isLoading: false,
      hasMoreContent: true,
      eventsPerPage: 40,
      loadedEventsCount: 0,
      existingEventIds: new Set(),
      filterParams: filterParams,
      emptyPeriodCount: 0, // Track consecutive empty periods
      maxEmptyPeriods: 3, // Stop after 3 consecutive empty periods at max size
      currentPeriodSize: 24 * 60 * 60, // Start with 1 day in seconds
      periodSizes: [
        1 * 24 * 60 * 60,    // 1 day
        7 * 24 * 60 * 60,    // 1 week
        30 * 24 * 60 * 60,   // 1 month
        90 * 24 * 60 * 60,   // 3 months
        180 * 24 * 60 * 60,  // 6 months
        365 * 24 * 60 * 60,  // 1 year
      ],
      periodIndex: 0, // Current position in periodSizes array
    };

    // Initialize SimplePool
    app.homePool = new window.NostrTools.SimplePool();

    // Function to render a single event immediately
    function renderEventImmediately(event) {
      const card = createVideoCard(event);
      grid.appendChild(card);
      
      // Add entrance animation
      card.style.opacity = '0';
      card.style.transform = 'translateY(-10px)';
      
      requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
      
      scrollState.loadedEventsCount++;
    }

    // Function to increase period size adaptively
    function increasePeriodSize() {
      if (scrollState.periodIndex < scrollState.periodSizes.length - 1) {
        scrollState.periodIndex++;
        scrollState.currentPeriodSize = scrollState.periodSizes[scrollState.periodIndex];
        const periodName = ['1 day', '1 week', '1 month', '3 months', '6 months', '1 year'][scrollState.periodIndex];
        console.log(`Increasing search period to: ${periodName}`);
        return true;
      }
      return false; // Already at maximum period size
    }

    // Function to load events for a time period with immediate rendering
    async function loadEventsForPeriod(since, until, renderImmediately = false) {
      return new Promise((resolve) => {
        const events = [];
        let isComplete = false;

        let filter = {
          kinds: [21],
          since: since,
          until: until,
        };

        // Add tags to filter if specified
        if (scrollState.filterParams.tags.length > 0) {
          filter["#t"] = scrollState.filterParams.tags;
        }

        // Add user's date filter if specified (affects initial load only)
        if (scrollState.filterParams.dateFilter !== "any" && !scrollState.oldestTimestamp) {
          const userSince = getDateFilterTimestamp(scrollState.filterParams.dateFilter);
          if (userSince && userSince > since) {
            filter.since = userSince;
          }
        }

        const periodName = ['1 day', '1 week', '1 month', '3 months', '6 months', '1 year'][scrollState.periodIndex];
        console.log(`Loading events with ${periodName} period, filter:`, filter);

        const sub = app.homePool.subscribe(
          app.relays,
          filter,
          {
            onevent(event) {
              // Skip duplicates
              if (!scrollState.existingEventIds.has(event.id)) {
                const sanitizedEvent = sanitizeNostrEvent(event);
                if (sanitizedEvent) {
                  scrollState.existingEventIds.add(event.id);
                  events.push(sanitizedEvent);
                  
                  // Render immediately if flag is set
                  if (renderImmediately) {
                    renderEventImmediately(sanitizedEvent);
                  }
                }
              }
            },
            oneose() {
              if (!isComplete) {
                isComplete = true;
                sub.close();
                console.log(`Loaded ${events.length} events for period ${since} to ${until}`);
                resolve(events);
              }
            },
            onclose() {
              if (!isComplete) {
                isComplete = true;
                resolve(events);
              }
            },
          }
        );

        // Timeout fallback
        setTimeout(() => {
          if (!isComplete) {
            isComplete = true;
            sub.close();
            resolve(events);
          }
        }, 5000);
      });
    }

    // Function to load more events going back in time
    async function loadMoreEvents() {
      if (scrollState.isLoading || !scrollState.hasMoreContent) {
        return;
      }

      scrollState.isLoading = true;
      loadMoreBtn.style.display = 'none';
      loadMoreStatus.textContent = 'Loading more videos...';
      loadMoreStatus.style.display = 'block';

      const startLoadedCount = scrollState.loadedEventsCount;
      
      // Start from where we left off, or from now
      let currentUntil = scrollState.oldestTimestamp || scrollState.currentTimestamp;
      let currentSince = currentUntil - scrollState.currentPeriodSize;

      console.log(`Loading more events, starting from timestamp: ${currentUntil}`);

      // Keep loading until we get enough events
      while ((scrollState.loadedEventsCount - startLoadedCount) < scrollState.eventsPerPage && scrollState.hasMoreContent) {
        const periodEvents = await loadEventsForPeriod(currentSince, currentUntil, true); // true = render immediately
        
        if (periodEvents.length === 0) {
          // No events found in this period
          scrollState.emptyPeriodCount++;
          console.log(`No events found for current period, empty count: ${scrollState.emptyPeriodCount}/${scrollState.maxEmptyPeriods}`);
          
          // Check if we should increase period size
          if (scrollState.emptyPeriodCount >= 2) { // After 2 empty periods, increase size
            const increased = increasePeriodSize();
            if (increased) {
              // Reset empty counter and try with new period size
              scrollState.emptyPeriodCount = 0;
              currentSince = currentUntil - scrollState.currentPeriodSize;
              continue;
            } else {
              // Already at max period size, check if we should stop
              if (scrollState.emptyPeriodCount >= scrollState.maxEmptyPeriods) {
                console.log(`Reached ${scrollState.maxEmptyPeriods} consecutive empty periods at maximum period size, stopping`);
                scrollState.hasMoreContent = false;
                break;
              }
            }
          }
          
          // Move to previous period
          currentUntil = currentSince;
          currentSince = currentUntil - scrollState.currentPeriodSize;
          
          // Safety check: don't go before Unix epoch start
          if (currentUntil < 0) {
            console.log("Reached beginning of time, stopping");
            scrollState.hasMoreContent = false;
            break;
          }
          
          continue;
        }

        // Reset empty counter since we found events
        scrollState.emptyPeriodCount = 0;

        // Update our position to the oldest event in this batch
        const oldestEvent = periodEvents.reduce((oldest, event) => 
          event.created_at < oldest.created_at ? event : oldest
        );
        scrollState.oldestTimestamp = oldestEvent.created_at;
        currentUntil = oldestEvent.created_at;
        currentSince = currentUntil - scrollState.currentPeriodSize;
        
        console.log(`Loaded ${periodEvents.length} events, total loaded this batch: ${scrollState.loadedEventsCount - startLoadedCount}`);
        
        // If we got fewer events than a full page, try the previous period
        if ((scrollState.loadedEventsCount - startLoadedCount) < scrollState.eventsPerPage) {
          continue;
        } else {
          break;
        }
      }

      scrollState.isLoading = false;
      loadMoreStatus.style.display = 'none';

      const loadedThisBatch = scrollState.loadedEventsCount - startLoadedCount;
      console.log(`Finished loading batch: ${loadedThisBatch} new events, total: ${scrollState.loadedEventsCount}`);
      
      if (scrollState.hasMoreContent && loadedThisBatch > 0) {
        loadMoreBtn.style.display = 'block';
      } else if (!scrollState.hasMoreContent) {
        loadMoreStatus.textContent = 'No more videos to load';
        loadMoreStatus.style.display = 'block';
      } else if (loadedThisBatch === 0) {
        // No new events loaded
        loadMoreStatus.textContent = 'No more videos to load';
        loadMoreStatus.style.display = 'block';
        scrollState.hasMoreContent = false;
      } else {
        loadMoreBtn.style.display = 'block';
      }
    }

    // ========== SET UP EVENT LISTENERS BEFORE LOADING DATA ==========
    
    // Video card click handler - MOVED BEFORE loadMoreEvents()
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

    // Shorts button click handler
    document.getElementById("shorts-btn").addEventListener("click", () => {
      window.location.hash = "#shorts";
    });

    // Load More button click handler
    loadMoreBtn.addEventListener('click', () => {
      loadMoreEvents();
    });

    // ========== NOW LOAD THE DATA ==========
    
    // Initial load
    await loadMoreEvents();

    // Hide loading indicator after initial load
    const loadingIndicator = document.querySelector(".loading-indicator");
    if (loadingIndicator) {
      loadingIndicator.remove();
    }

    // Subscribe to new events (real-time updates)
    app.homeSubscription = app.homePool.subscribe(
      app.relays,
      {
        kinds: [21],
        since: scrollState.currentTimestamp, // Only new events from now on
        "#t": scrollState.filterParams.tags.length > 0 ? scrollState.filterParams.tags : undefined,
      },
      {
        onevent(event) {
          if (!scrollState.existingEventIds.has(event.id)) {
            const sanitizedEvent = sanitizeNostrEvent(event);
            if (sanitizedEvent) {
              scrollState.existingEventIds.add(event.id);
              renderNewVideoAtTop(sanitizedEvent, grid);
            }
          }
        },
      }
    );

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

// Helper function to render new video at the top of the grid
function renderNewVideoAtTop(video, grid) {
  let card = createVideoCard(video);
  
  // Insert at the beginning of the grid
  if (grid.firstChild) {
    grid.insertBefore(card, grid.firstChild);
  } else {
    grid.appendChild(card);
  }
  
  // Optional: Add a visual indicator for new videos
  card.classList.add("new-video");
  setTimeout(() => {
    card.classList.remove("new-video");
  }, 2000);
}

/* async function homePageHandler() {
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
} */