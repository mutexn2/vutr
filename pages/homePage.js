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
    eventsPerPage: 20,
    loadedEventsCount: 0,
    existingEventIds: new Set(),
    filterParams: filterParams,
    
    // Time-based pagination (only used after initial load)
    minPeriod: 300,
    maxPeriod: 31536000,
    currentPeriodSize: 300,
    
    // Per-relay state tracking
    relayStates: {},
    finalSweepComplete: false,
    bufferedEvents: [],
    bufferedEventIndex: 0,
    
    // Track if this is the first load
    isFirstLoad: true,
  };

  // Initialize per-relay state
  app.relays.forEach(relay => {
    scrollState.relayStates[relay] = {
      oldestTimestamp: null,
      hasMoreContent: true,
      isActive: true,
      hadEventsInInitialLoad: false, // Track which relays have content
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



  // FAST initial load function - just ask for events with limit
  async function fastInitialLoadFromRelay(relay) {
    return new Promise((resolve) => {
      const events = [];
      let isComplete = false;

      let filter = {
        kinds: [21],
        limit: 20,
      };

      // Add tags to filter if specified
      if (scrollState.filterParams.tags.length > 0) {
        filter["#t"] = scrollState.filterParams.tags;
      }

      // Add user's date filter if specified
      if (scrollState.filterParams.dateFilter !== "any") {
        const userSince = getDateFilterTimestamp(scrollState.filterParams.dateFilter);
        if (userSince) {
          filter.since = userSince;
        }
      }

      const sub = app.homePool.subscribe(
        [relay],
        filter,
        {
          onevent(event) {
            if (!scrollState.existingEventIds.has(event.id)) {
              const sanitizedEvent = sanitizeNostrEvent(event);
              if (sanitizedEvent) {
                scrollState.existingEventIds.add(event.id);
                events.push(sanitizedEvent);
                
                // Render immediately as events come in
                renderEventImmediately(sanitizedEvent);
              }
            }
          },
          oneose() {
            if (!isComplete) {
              isComplete = true;
              sub.close();
              
              // Track relay state based on results
              const relayState = scrollState.relayStates[relay];
              if (events.length >= 20) {
                // This relay has plenty of content
                relayState.hadEventsInInitialLoad = true;
                relayState.hasMoreContent = true;
              } else if (events.length > 0) {
                // This relay has some content
                relayState.hadEventsInInitialLoad = true;
                relayState.hasMoreContent = true; // Maybe has more with time filtering
              } else {
                // This relay has no content (or very little)
                relayState.hadEventsInInitialLoad = false;
                relayState.hasMoreContent = true; // Still try with time filtering later
              }
              
              // Update oldest timestamp if we got events
              if (events.length > 0) {
                const oldestEvent = events.reduce((oldest, event) =>
                  event.created_at < oldest.created_at ? event : oldest
                );
                relayState.oldestTimestamp = oldestEvent.created_at;
              }
              
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

      // Faster timeout for initial load
      setTimeout(() => {
        if (!isComplete) {
          isComplete = true;
          sub.close();
          resolve(events);
        }
      }, 3000);
    });
  }

  // Fast initial load from all relays
  async function fastInitialLoad() {
    console.log("Starting fast initial load...");
    
    // Fire all relay requests in parallel
    const relayPromises = app.relays.map(relay => fastInitialLoadFromRelay(relay));
    
    // Wait for all to complete
    await Promise.all(relayPromises);
    
    console.log(`Fast initial load complete. Loaded ${scrollState.loadedEventsCount} events`);
    
    // Mark first load as complete
    scrollState.isFirstLoad = false;
    
    // If we got more than target, we're done for now
    if (scrollState.loadedEventsCount >= scrollState.eventsPerPage) {
      return;
    }
    
    // If we didn't get enough, continue with time-based loading from relays that have content
    console.log("Not enough events from initial load, continuing with time-based pagination...");
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

    // Function to make a final sweep request when we're not finding events
    async function makeFinalSweepRequest() {
      console.log("Making final sweep request for remaining events");

      const allEvents = [];
      const promises = app.relays.map(relay => {
        return new Promise((resolve) => {
          const events = [];
          let isComplete = false;

          let filter = {
            kinds: [21],
            limit: 500, // Get up to 500 events from each relay
          };

          // Add tags to filter if specified
          if (scrollState.filterParams.tags.length > 0) {
            filter["#t"] = scrollState.filterParams.tags;
          }

          // Add user's date filter if specified
          if (scrollState.filterParams.dateFilter !== "any") {
            const userSince = getDateFilterTimestamp(scrollState.filterParams.dateFilter);
            if (userSince) {
              filter.since = userSince;
            }
          }

          const sub = app.homePool.subscribe(
            [relay],
            filter,
            {
              onevent(event) {
                if (!scrollState.existingEventIds.has(event.id)) {
                  const sanitizedEvent = sanitizeNostrEvent(event);
                  if (sanitizedEvent) {
                    events.push(sanitizedEvent);
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

          setTimeout(() => {
            if (!isComplete) {
              isComplete = true;
              sub.close();
              resolve(events);
            }
          }, 8000); // Longer timeout for final sweep
        });
      });

      const resultsPerRelay = await Promise.all(promises);

      // Merge and sort all events by created_at (newest first)
      resultsPerRelay.forEach(relayEvents => {
        allEvents.push(...relayEvents);
      });

      allEvents.sort((a, b) => b.created_at - a.created_at);

      // Store for pagination
      scrollState.bufferedEvents = allEvents;
      scrollState.bufferedEventIndex = 0;
      scrollState.finalSweepComplete = true;

      console.log(`Final sweep found ${allEvents.length} total events`);

      return allEvents;
    }

    // Function to load events from buffer
    function loadFromBuffer(count) {
      const events = [];
      const endIndex = Math.min(
        scrollState.bufferedEventIndex + count,
        scrollState.bufferedEvents.length
      );

      for (let i = scrollState.bufferedEventIndex; i < endIndex; i++) {
        const event = scrollState.bufferedEvents[i];
        if (!scrollState.existingEventIds.has(event.id)) {
          scrollState.existingEventIds.add(event.id);
          events.push(event);
          renderEventImmediately(event);
        }
      }

      scrollState.bufferedEventIndex = endIndex;
      return events;
    }

    // Function to load from a single relay continuously
  async function loadFromSingleRelay(relay, targetEventCount) {
    const relayState = scrollState.relayStates[relay];

    if (!relayState.isActive || !relayState.hasMoreContent) {
      return 0;
    }

    // Skip relays that had no events in initial load (unless we're desperate)
    if (!relayState.hadEventsInInitialLoad && scrollState.loadedEventsCount > 0) {
      return 0;
    }

    const startCount = scrollState.loadedEventsCount;
    let currentUntil = relayState.oldestTimestamp || scrollState.currentTimestamp;
    let localPeriodSize = scrollState.currentPeriodSize;

    while (scrollState.loadedEventsCount < targetEventCount && relayState.hasMoreContent && relayState.isActive) {
      const currentSince = Math.max(0, currentUntil - localPeriodSize);
      
      const periodEvents = await loadEventsForPeriodFromRelay(relay, currentSince, currentUntil, true);

      if (periodEvents.length === 0) {
        localPeriodSize = Math.min(localPeriodSize * 2, scrollState.maxPeriod);
        currentUntil = currentSince;
        
        if (currentUntil <= 0) {
          relayState.hasMoreContent = false;
          relayState.isActive = false;
          break;
        }
        
        continue;
      }

      // Found events! Reset to minimum period size
      localPeriodSize = scrollState.minPeriod;
      
      const oldestEvent = periodEvents.reduce((oldest, event) =>
        event.created_at < oldest.created_at ? event : oldest
      );
      relayState.oldestTimestamp = oldestEvent.created_at;
      currentUntil = oldestEvent.created_at;

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

    // First load: use fast initial load
    if (scrollState.isFirstLoad) {
      await fastInitialLoad();
      
      // If still not enough after initial load, continue with time-based
      if (scrollState.loadedEventsCount < targetCount && !scrollState.isFirstLoad) {
        // Continue loading with time-based approach
        await loadMoreWithTimePagination(targetCount);
      }
    } else {
      // Subsequent loads: use time-based pagination
      await loadMoreWithTimePagination(targetCount);
    }

    scrollState.isLoading = false;
    loadMoreStatus.style.display = 'none';

    const loadedThisBatch = scrollState.loadedEventsCount - startLoadedCount;

    // Check if ANY relay still has content
    const anyRelayHasContent = Object.values(scrollState.relayStates).some(
      state => state.hasMoreContent && state.isActive
    );

    if (scrollState.finalSweepComplete) {
      scrollState.hasMoreContent = scrollState.bufferedEventIndex < scrollState.bufferedEvents.length;
    } else {
      scrollState.hasMoreContent = anyRelayHasContent;
    }

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

  async function loadMoreWithTimePagination(targetCount) {
    if (scrollState.finalSweepComplete) {
      const neededCount = targetCount - scrollState.loadedEventsCount;
      loadFromBuffer(neededCount);

      if (scrollState.bufferedEventIndex >= scrollState.bufferedEvents.length) {
        scrollState.hasMoreContent = false;
      }
      return;
    }

    let emptyBatchCount = 0;
    
    while (scrollState.loadedEventsCount < targetCount && scrollState.hasMoreContent && emptyBatchCount < 3) {
      const batchStartCount = scrollState.loadedEventsCount;

      const relayPromises = app.relays.map(relay =>
        loadFromSingleRelay(relay, targetCount)
      );

      await Promise.all(relayPromises);

      const eventsInThisBatch = scrollState.loadedEventsCount - batchStartCount;

      if (eventsInThisBatch === 0) {
        emptyBatchCount++;
        
        if (emptyBatchCount >= 2 && !scrollState.finalSweepComplete) {
          await makeFinalSweepRequest();
          break;
        }
      } else {
        emptyBatchCount = 0;
        scrollState.currentPeriodSize = scrollState.minPeriod;
      }

      if (scrollState.loadedEventsCount >= targetCount) {
        break;
      }
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