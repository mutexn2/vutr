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
    const filterParams = parseFilterUrl();
    console.log("Current filter params:", filterParams);

    pageContainer.innerHTML = `
<div style="display: none;">
  <div id="filter-container"></div>
</div>

<div class="playlists-grid"></div>
<div class="load-more-container" style="text-align: center; padding: 20px;">
  <button id="load-more-btn" class="load-more-btn" style="display: none;">Load More Playlists</button>
  <p id="load-more-status" style="display: none;"></p>
</div>
    `;

    // Create and setup filter form
    let filterContainer = document.getElementById("filter-container");
    let filterForm = createFilterForm(config);
    filterContainer.appendChild(filterForm);

    // Initialize filter form with current URL params
    initializeFilterFromUrl(filterForm, filterParams);

    const grid = document.querySelector(".playlists-grid");
    const loadMoreBtn = document.getElementById("load-more-btn");
    const loadMoreStatus = document.getElementById("load-more-status");

    // Infinite scroll state
    const scrollState = {
      currentTimestamp: Math.floor(Date.now() / 1000),
      isLoading: false,
      hasMoreContent: true,
      eventsPerPage: 21,
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
      // Final sweep state
      finalSweepComplete: false,
      bufferedEvents: [],
      bufferedEventIndex: 0,
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
    app.playlistPool = new window.NostrTools.SimplePool();

    // ========== REGISTER CLEANUP ==========
    registerCleanup(() => {
      console.log("Cleaning up playlists page resources");

      // Close playlist subscription
      if (app.playlistSubscription) {
        app.playlistSubscription.close();
        app.playlistSubscription = null;
      }

      // Close playlist pool
      if (app.playlistPool) {
        app.playlistPool.close(app.relays);
        app.playlistPool = null;
      }
    });

    function renderEventImmediately(event) {
      const card = createPlaylistCard(event);
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

    // Helper function to validate playlist
    function isValidPlaylist(playlist) {
      // Check if the playlist has tags
      if (!playlist.tags || !Array.isArray(playlist.tags)) {
        return false;
      }

      // Look for at least one valid "e" tag reference
/*       return playlist.tags.some(tag => {
        // Check if it's an "e" tag with at least 2 elements
        if (!Array.isArray(tag) || tag.length < 2 || tag[0] !== "e") {
          return false;
        }

        const eventId = tag[1];

        // Check if the ID is a string
        if (!eventId || typeof eventId !== "string") {
          return false;
        }

        // Check if the ID is exactly 64 characters (valid hex length)
        return eventId.length === 64 && /^[a-fA-F0-9]{64}$/.test(eventId);
      }); */
      return playlist;
    }

    // Function to load events from a SINGLE relay for a time period
    async function loadEventsForPeriodFromRelay(relay, since, until, renderImmediately = false) {
      return new Promise((resolve) => {
        const events = [];
        let isComplete = false;

        let filter = {
          kinds: [30005],
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

        const sub = app.playlistPool.subscribe(
          [relay], // Single relay only
          filter,
          {
            onevent(event) {
              // For addressable events (kind:30005), use author+d-tag as unique identifier
              const dTag = event.tags?.find(t => t[0] === 'd')?.[1] || '';
              const uniqueId = `${event.pubkey}:${dTag}`;

              // Skip duplicates (global check)
              if (!scrollState.existingEventIds.has(uniqueId)) {
                const sanitizedEvent = sanitizeNostrEvent(event);
                if (sanitizedEvent && isValidPlaylist(sanitizedEvent)) {
                  scrollState.existingEventIds.add(uniqueId);
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
      console.log("Making final sweep request for remaining playlists");

      const allEvents = [];
      const promises = app.relays.map(relay => {
        return new Promise((resolve) => {
          const events = [];
          let isComplete = false;

          let filter = {
            kinds: [30005],
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

          const sub = app.playlistPool.subscribe(
            [relay],
            filter,
            {
              onevent(event) {
                // For addressable events, use author+d-tag as unique identifier
                const dTag = event.tags?.find(t => t[0] === 'd')?.[1] || '';
                const uniqueId = `${event.pubkey}:${dTag}`;

                if (!scrollState.existingEventIds.has(uniqueId)) {
                  const sanitizedEvent = sanitizeNostrEvent(event);
                  if (sanitizedEvent && isValidPlaylist(sanitizedEvent)) {
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

      console.log(`Final sweep found ${allEvents.length} total playlists`);

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
        // For addressable events, use author+d-tag as unique identifier
        const dTag = event.tags?.find(t => t[0] === 'd')?.[1] || '';
        const uniqueId = `${event.pubkey}:${dTag}`;

        if (!scrollState.existingEventIds.has(uniqueId)) {
          scrollState.existingEventIds.add(uniqueId);
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
      loadMoreStatus.textContent = 'Loading more playlists...';
      loadMoreStatus.style.display = 'block';

      const startLoadedCount = scrollState.loadedEventsCount;
      const targetCount = startLoadedCount + scrollState.eventsPerPage;

      // Check if we should do a final sweep
      if (!scrollState.finalSweepComplete && scrollState.emptyPeriodCount >= 2) {
        // Make final sweep request
        await makeFinalSweepRequest();
      }

      // Load from buffer if final sweep is complete
      if (scrollState.finalSweepComplete) {
        const neededCount = targetCount - scrollState.loadedEventsCount;
        const loadedFromBuffer = loadFromBuffer(neededCount);

        if (scrollState.bufferedEventIndex >= scrollState.bufferedEvents.length) {
          scrollState.hasMoreContent = false;
        }
      } else {
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

            // Check if we should do final sweep
            if (scrollState.emptyPeriodCount >= 2) {
              // Trigger final sweep on next iteration
              break;
            }

            // Check if we should increase period size
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
          } else {
            // Reset empty counter since we found events
            scrollState.emptyPeriodCount = 0;
          }

          // If we got enough events, stop
          if (scrollState.loadedEventsCount >= targetCount) {
            break;
          }
        }
      }

      scrollState.isLoading = false;
      loadMoreStatus.style.display = 'none';

      const loadedThisBatch = scrollState.loadedEventsCount - startLoadedCount;

      // Check if ANY relay still has content
      const anyRelayHasContent = Object.values(scrollState.relayStates).some(
        state => state.hasMoreContent && state.isActive
      );

      // Update hasMoreContent based on final sweep state or relay states
      if (scrollState.finalSweepComplete) {
        scrollState.hasMoreContent = scrollState.bufferedEventIndex < scrollState.bufferedEvents.length;
      } else {
        scrollState.hasMoreContent = anyRelayHasContent;
      }

      if (scrollState.hasMoreContent && loadedThisBatch > 0) {
        loadMoreBtn.style.display = 'block';
      } else if (!scrollState.hasMoreContent) {
        loadMoreStatus.textContent = 'No more playlists to load';
        loadMoreStatus.style.display = 'block';
      } else if (loadedThisBatch === 0) {
        loadMoreStatus.textContent = 'No more playlists to load';
        loadMoreStatus.style.display = 'block';
        scrollState.hasMoreContent = false;
      } else {
        loadMoreBtn.style.display = 'block';
      }
    }

    // ========== SET UP EVENT LISTENERS BEFORE LOADING DATA ==========

    grid.addEventListener("click", async (event) => {
      let card = event.target.closest(".video-card");
      if (card && card.dataset.playlistId) {
        const author = card.dataset.author;
        const dtag = card.dataset.dtag;

        const discoveryRelays = app.relays.slice(0, 3).map(cleanRelayUrl);
        const uniqueDiscoveryRelays = [...new Set(discoveryRelays)];
        const discoveryParam = uniqueDiscoveryRelays.join(",");

        const playlistUrl = `#playlist/params?author=${author}&dtag=${dtag}&discovery=${discoveryParam}`;
        console.log("Navigating to playlist URL:", playlistUrl);
        window.location.hash = playlistUrl;
      }
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
    app.playlistSubscription = app.playlistPool.subscribe(
      app.relays,
      {
        kinds: [30005],
        since: scrollState.currentTimestamp,
        "#t": scrollState.filterParams.tags.length > 0 ? scrollState.filterParams.tags : undefined,
      },
      {
        onevent(event) {
          // For addressable events, use author+d-tag as unique identifier
          const dTag = event.tags?.find(t => t[0] === 'd')?.[1] || '';
          const uniqueId = `${event.pubkey}:${dTag}`;

          if (!scrollState.existingEventIds.has(uniqueId)) {
            const sanitizedEvent = sanitizeNostrEvent(event);
            if (sanitizedEvent && isValidPlaylist(sanitizedEvent)) {
              scrollState.existingEventIds.add(uniqueId);
              renderNewPlaylistAtTop(sanitizedEvent, grid);
            }
          }
        },
      }
    );
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
function renderNewPlaylistAtTop(playlist, grid) {
  let card = createPlaylistCard(playlist);
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