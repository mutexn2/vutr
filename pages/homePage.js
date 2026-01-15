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
    const filterParams = parseFilterUrl();
    console.log("Current filter params:", filterParams);

    pageContainer.innerHTML = `
<button id="shorts-btn" class="shorts-button">
  <svg class="shorts-icon">
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
      currentTimestamp: Math.floor(Date.now() / 1000),
      isLoading: false,
      hasMoreContent: true,
      eventsPerPage: 40,
      loadedEventsCount: 0,
      existingEventIds: new Set(),
      filterParams: filterParams,
      // GLOBAL period management (shared across all relays)
      emptyPeriodCount: 0,
      maxEmptyPeriods: 3,
      currentPeriodSize: 24 * 60 * 60, // Start with 1 day
      periodSizes: [
        1 * 24 * 60 * 60,    // 1 day
        7 * 24 * 60 * 60,    // 1 week
        30 * 24 * 60 * 60,   // 1 month
        90 * 24 * 60 * 60,   // 3 months
        180 * 24 * 60 * 60,  // 6 months
        365 * 24 * 60 * 60,  // 1 year
      ],
      periodIndex: 0,
      // Per-relay state tracking
      relayStates: {},
    };

    // Initialize per-relay state
    app.relays.forEach(relay => {
      scrollState.relayStates[relay] = {
        oldestTimestamp: null,
        hasMoreContent: true,
        isActive: true,
      };
    });

    // Initialize SimplePool
    app.homePool = new window.NostrTools.SimplePool();

    // ========== REGISTER CLEANUP ==========
    registerCleanup(() => {
      console.log("Cleaning up home page resources");
      
      // Close home subscription
      if (app.homeSubscription) {
        app.homeSubscription.close();
        app.homeSubscription = null;
      }
      
      // Close home pool
      if (app.homePool) {
        app.homePool.close(app.relays);
        app.homePool = null;
      }
    });

    function renderEventImmediately(event) {
      // Filter before creating the card
      if (!shouldDisplayVideo(event)) {
        return;
      }
      
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

    // Function to increase period size GLOBALLY
    function increasePeriodSize() {
      if (scrollState.periodIndex < scrollState.periodSizes.length - 1) {
        scrollState.periodIndex++;
        scrollState.currentPeriodSize = scrollState.periodSizes[scrollState.periodIndex];
        return true;
      }
      return false;
    }

    // Function to load events from a SINGLE relay for a time period
    async function loadEventsForPeriodFromRelay(relay, since, until, renderImmediately = false) {
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

        // Add user's date filter if specified
        const relayState = scrollState.relayStates[relay];
        if (scrollState.filterParams.dateFilter !== "any" && !relayState.oldestTimestamp) {
          const userSince = getDateFilterTimestamp(scrollState.filterParams.dateFilter);
          if (userSince && userSince > since) {
            filter.since = userSince;
          }
        }

        const sub = app.homePool.subscribe(
          [relay], // Single relay only
          filter,
          {
            onevent(event) {
              // Skip duplicates (global check)
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

        // Timeout fallback (per relay)
        setTimeout(() => {
          if (!isComplete) {
            isComplete = true;
            sub.close();
            resolve(events);
          }
        }, 5000);
      });
    }

    // Function to load from a single relay continuously
    async function loadFromSingleRelay(relay, targetEventCount) {
      const relayState = scrollState.relayStates[relay];
      
      if (!relayState.isActive || !relayState.hasMoreContent) {
        return 0;
      }

      const startCount = scrollState.loadedEventsCount;
      let currentUntil = relayState.oldestTimestamp || scrollState.currentTimestamp;
      let currentSince = currentUntil - scrollState.currentPeriodSize; // Use GLOBAL period size

      // Keep loading from this relay until global target is reached or relay exhausted
      while (scrollState.loadedEventsCount < targetEventCount && relayState.hasMoreContent && relayState.isActive) {
        const periodEvents = await loadEventsForPeriodFromRelay(relay, currentSince, currentUntil, true);
        
        if (periodEvents.length === 0) {
          // Move to previous period with GLOBAL period size
          currentUntil = currentSince;
          currentSince = currentUntil - scrollState.currentPeriodSize;
          
          if (currentUntil < 0) {
            relayState.hasMoreContent = false;
            relayState.isActive = false;
            break;
          }
          
          continue;
        }

        // Update relay's position
        const oldestEvent = periodEvents.reduce((oldest, event) => 
          event.created_at < oldest.created_at ? event : oldest
        );
        relayState.oldestTimestamp = oldestEvent.created_at;
        currentUntil = oldestEvent.created_at;
        currentSince = currentUntil - scrollState.currentPeriodSize; // Use GLOBAL period size
        
        // Check if we've reached global target
        if (scrollState.loadedEventsCount >= targetEventCount) {
          break;
        }
      }

      return scrollState.loadedEventsCount - startCount;
    }

    // Main function to load events from all relays in parallel
    async function loadMoreEvents() {
      if (scrollState.isLoading || !scrollState.hasMoreContent) {
        return;
      }

      scrollState.isLoading = true;
      loadMoreBtn.style.display = 'none';
      loadMoreStatus.textContent = 'Loading more videos...';
      loadMoreStatus.style.display = 'block';

      const startLoadedCount = scrollState.loadedEventsCount;
      const targetCount = startLoadedCount + scrollState.eventsPerPage;

      // Keep loading until we get enough events or run out of content
      while (scrollState.loadedEventsCount < targetCount && scrollState.hasMoreContent) {
        const batchStartCount = scrollState.loadedEventsCount;
        
        // Start all relays in parallel for this time period
        const relayPromises = app.relays.map(relay => 
          loadFromSingleRelay(relay, targetCount)
        );

        // Wait for all relays to complete this batch
        await Promise.all(relayPromises);

        const eventsInThisBatch = scrollState.loadedEventsCount - batchStartCount;
        
        if (eventsInThisBatch === 0) {
          // No events found in this period across ALL relays
          scrollState.emptyPeriodCount++;
          
          // Check if we should increase period size
          if (scrollState.emptyPeriodCount >= 2) {
            const increased = increasePeriodSize();
            if (increased) {
              scrollState.emptyPeriodCount = 0;
              // Continue with new period size
              continue;
            } else {
              // Already at max period size
              if (scrollState.emptyPeriodCount >= scrollState.maxEmptyPeriods) {
                scrollState.hasMoreContent = false;
                break;
              }
            }
          }
          
          // Check if ANY relay still has content
          const anyRelayHasContent = Object.values(scrollState.relayStates).some(
            state => state.hasMoreContent && state.isActive
          );
          
          if (!anyRelayHasContent) {
            scrollState.hasMoreContent = false;
            break;
          }
        } else {
          // Reset empty counter since we found events
          scrollState.emptyPeriodCount = 0;
        }
        
        // If we got enough events, stop
        if (scrollState.loadedEventsCount >= targetCount) {
          break;
        }
      }

      scrollState.isLoading = false;
      loadMoreStatus.style.display = 'none';

      const loadedThisBatch = scrollState.loadedEventsCount - startLoadedCount;
      
      // Check if ANY relay still has content
      const anyRelayHasContent = Object.values(scrollState.relayStates).some(
        state => state.hasMoreContent && state.isActive
      );
      scrollState.hasMoreContent = anyRelayHasContent;
      
      if (scrollState.hasMoreContent && loadedThisBatch > 0) {
        loadMoreBtn.style.display = 'block';
      } else if (!scrollState.hasMoreContent) {
        loadMoreStatus.textContent = 'No more videos to load';
        loadMoreStatus.style.display = 'block';
      } else if (loadedThisBatch === 0) {
        loadMoreStatus.textContent = 'No more videos to load';
        loadMoreStatus.style.display = 'block';
        scrollState.hasMoreContent = false;
      } else {
        loadMoreBtn.style.display = 'block';
      }
    }

    // ========== SET UP EVENT LISTENERS BEFORE LOADING DATA ==========

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
        since: scrollState.currentTimestamp,
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

function renderNewVideoAtTop(video, grid) {
  if (!shouldDisplayVideo(video)) {
    return;
  }
  
  let card = createVideoCard(video);
  
  if (grid.firstChild) {
    grid.insertBefore(card, grid.firstChild);
  } else {
    grid.appendChild(card);
  }
  
  card.classList.add("new-video");
  setTimeout(() => {
    card.classList.remove("new-video");
  }, 2000);
}

function shouldDisplayVideo(event) {
  if (isProfileMuted(event.pubkey)) {
    return false;
  }
  
  const contentWarnings = event.tags?.filter((tag) => tag[0] === "content-warning") || [];
  const hasContentWarning = contentWarnings.length > 0;
  const showContentWarning = localStorage.getItem("showContentWarning") !== "false";
  
  if (hasContentWarning && !showContentWarning) {
    return false;
  }
  
  return true;
}