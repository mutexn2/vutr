async function followsFeedPageHandler() {
  // Cancel any active queries from previous page loads
  cancelActiveQueries();
  
  mainContent.innerHTML = `
    <h1>Following Feed</h1>
    <div class="loading-indicator">
        <p>Loading videos from followed channels...</p>
    </div>
  `;

  try {
    const followedPubkeys = getFollowedPubkeys();
    
    if (followedPubkeys.length === 0) {
      mainContent.innerHTML = `
        <h1>No Followed Channels</h1>
        <p>You haven't followed any channels yet. Visit the <a href="#follows">Following</a> page to start following channels!</p>
      `;
      return;
    }

    const currentHash = window.location.hash;
    const urlParams = new URLSearchParams(currentHash.split('?')[1] || '');
    const sortBy = urlParams.get('sort') || 'newest';
    const relaySource = urlParams.get('relays') || 'active';
    const includeShorts = urlParams.get('shorts') || 'no';

    console.log(`🎯 Starting subscription feed for ${followedPubkeys.length} followed channels`);

    // Initialize UI immediately
    mainContent.innerHTML = `
      <div class="follows-feed-header">
        <div class="follows-feed-header-header">
          <h2 class="loading-indicator">Loading</h2>
        </div>

<div class="sort-controls">

<div class="form-group" style="display: none;">
  <label for="follows-sort">Sort by:</label>
  <select id="follows-sort">
    <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
    <option value="oldest" ${sortBy === 'oldest' ? 'selected' : ''}>Oldest First</option>
  </select>
</div>  
<div class="form-group">  
  <label for="relay-source">Relay source:</label>
  <select id="relay-source">
    <option value="active" ${relaySource === 'active' ? 'selected' : ''}>Active Relay Set</option>
    <option value="extended" ${relaySource === 'extended' ? 'selected' : ''}>Extended Relays (outbox)</option>
  </select>
</div>
<div class="form-group" style="display: none;">  
  <label for="shorts-option">shorts:</label>
  <select id="shorts-option">
    <option value="no" ${includeShorts === 'no' ? 'selected' : ''}>no shorts</option>
    <option value="yes" ${includeShorts === 'yes' ? 'selected' : ''}>with shorts</option>
  </select>
</div>

</div>
<div class="form-group">  
  <button id="apply-options-btn">Apply</button>
</div>  
      </div>
      <div class="videos-grid"></div>
      <div class="load-more-container" style="text-align: center; margin-top: 20px;"></div>
    `;

    // Setup event handlers
    const sortSelect = document.getElementById('follows-sort');
    const relaySourceSelect = document.getElementById('relay-source');
    const shortsSelect = document.getElementById('shorts-option');
    const grid = document.querySelector(".videos-grid");
    const loadMoreContainer = document.querySelector(".load-more-container");
    const headerElement = document.querySelector(".follows-feed-header-header");
    
const handleApplyOptions = () => {
  const newSort = sortSelect.value;
  const newRelaySource = relaySourceSelect.value;
  const newShorts = shortsSelect.value;
  const baseHash = '#followsfeed';
  
  const params = new URLSearchParams();
  if (newSort !== 'newest') params.set('sort', newSort);
  if (newRelaySource !== 'active') params.set('relays', newRelaySource);
  if (newShorts !== 'no') params.set('shorts', newShorts);
  
  const paramString = params.toString();
  const newUrl = paramString ? `${baseHash}/params?${paramString}` : baseHash;
  window.location.hash = newUrl;
};

// Add event listener for the apply button
document.getElementById('apply-options-btn').addEventListener('click', handleApplyOptions);

    // Start progressive feed loading
    await loadProgressiveFeed(followedPubkeys, relaySource, sortBy, includeShorts, grid, headerElement);



  } catch (error) {
    console.error("❌ Error rendering follows feed page:", error);
    let errorDiv = document.createElement("div");
    errorDiv.innerHTML = `
      <h1>Error</h1>
      <div class="loading-indicator">
        <p>Error rendering follows feed page: ${error.message}</p>
      </div>
    `;
    mainContent.replaceChildren(errorDiv);
  }
}

async function loadProgressiveFeed(followedPubkeys, relaySource, sortBy, includeShorts, grid, headerElement) {
  const MAX_EVENTS = 100;
  const EVENTS_PER_PAGE = 20;
  const MAX_PUBKEYS_FOR_EXTENDED_RELAYS = 50;
  const MAX_RELAYS_TO_USE = 100;
  const RELAY_BATCH_SIZE = 10;
  
  let allEvents = new Map();
  let renderedEventIds = new Set();
  let usedRelays = new Set();
  let currentPage = 0;
  let queryCompleted = false;
  let shouldStopQuerying = false;
  
  // Create cancellation controller
  const queryController = {
    cancelled: false,
    cancel: () => {
      queryController.cancelled = true;
      shouldStopQuerying = true;
      queryCompleted = true;
      console.log('🛑 Query cancelled by navigation or user action');
    }
  };
  
  // Register this query as active
  app.activeQuery = queryController;
  app.isQuerying = true;
  
  const kinds = includeShorts === 'yes' ? [21, 22] : [21];
  const queryOptions = {
    kinds: kinds,
    limit: MAX_EVENTS,
    authors: followedPubkeys
  };

  // Function to check if we should continue
  const shouldContinue = () => !queryController.cancelled && !shouldStopQuerying;

  // Function to update header with current stats and stop button
const updateHeader = (eventCount, relayCount, isExtended, isCompleted = false) => {
  if (queryController.cancelled) return;
  
  const status = isCompleted || shouldStopQuerying ? '' : '<span class="loading-indicator">searching for more</span>';
  const relayInfo = isExtended ? `${relayCount} relays` : 'active set';
  
  const stopButton = (!isCompleted && !shouldStopQuerying && isExtended) 
    ? '<button id="stop-query-btn">Stop</button>'
    : '';
  
  // Check if we're in loading state (status or stopButton present)
  const isLoading = status || stopButton;
  
  if (isLoading) {
    // Column layout for loading state
    headerElement.innerHTML = `
      <div>${eventCount} videos • ${followedPubkeys.length} pubkeys • ${relayInfo}</div>
      ${status ? `<div>${status}</div>` : ''}
      ${stopButton ? `<div>${stopButton}</div>` : ''}
    `;
  } else {
    // Single h2 for static states
    headerElement.innerHTML = `<h2>${eventCount} videos • ${followedPubkeys.length} pubkeys • ${relayInfo}</h2>`;
  }
  
  // Add stop button functionality
  const stopBtn = document.getElementById('stop-query-btn');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      shouldStopQuerying = true;
      queryCompleted = true;
      updateHeader(allEvents.size, usedRelays.size, relaySource === 'extended', true);
      updatePaginationButtons();
      console.log('🛑 User stopped querying, keeping current events');
    });
  }
};

  // Function to render events for current page
  const renderCurrentPage = () => {
    if (queryController.cancelled) return;
    
    const sortedEvents = Array.from(allEvents.values());
    const finalSorted = applySorting(sortedEvents, sortBy);
    
    const startIndex = 0;
    const endIndex = (currentPage + 1) * EVENTS_PER_PAGE;
    const eventsToShow = finalSorted.slice(startIndex, endIndex);
    
    // Clear grid and render all events up to current page
    grid.innerHTML = '';
    renderedEventIds.clear();
    
    eventsToShow.forEach(video => {
      if (!renderedEventIds.has(video.id)) {
        try {
          const sanitized = sanitizeNostrEvent(video);
          if (sanitized) {
            const card = createVideoCard(sanitized);
            grid.appendChild(card);
            renderedEventIds.add(video.id);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to create card for video:`, error.message);
        }
      }
    });

    updatePaginationButtons();
  };

  // Function to handle new events from relay queries
  const handleNewEvents = (newEvents, relayInfo) => {
    if (queryController.cancelled) return;
    
    let addedCount = 0;
    
    newEvents.forEach(event => {
      if (event && event.id && !allEvents.has(event.id)) {
        allEvents.set(event.id, event);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      console.log(`📥 Added ${addedCount} new events from ${relayInfo}, total: ${allEvents.size}`);
      updateHeader(allEvents.size, usedRelays.size, relaySource === 'extended');
      renderCurrentPage();
    }
  };

  // Function to update pagination buttons
  const updatePaginationButtons = () => {
    if (queryController.cancelled) return;
    
    const loadMoreContainer = document.querySelector(".load-more-container");
    if (!loadMoreContainer) return;

    const sortedEvents = Array.from(allEvents.values());
    const finalSorted = applySorting(sortedEvents, sortBy);
    const totalEvents = finalSorted.length;
    const eventsShown = (currentPage + 1) * EVENTS_PER_PAGE;
    
    // Show load more button if there are more events to show
    if (eventsShown < totalEvents) {
      const remainingEvents = totalEvents - eventsShown;
      const nextPageEvents = Math.min(remainingEvents, EVENTS_PER_PAGE);
      
      const button = document.createElement('button');
      button.textContent = `Show More (${nextPageEvents} more)`;
      button.className = 'load-more-btn';
      button.style.cssText = 'padding: 10px 20px; font-size: 16px; cursor: pointer; margin: 20px 0;';
      
      button.addEventListener('click', () => {
        currentPage++;
        renderCurrentPage();
      });
      
      loadMoreContainer.innerHTML = '';
      loadMoreContainer.appendChild(button);
    } else {
      loadMoreContainer.innerHTML = '';
    }
  };

// Function to query a batch of relays
const queryRelayBatch = async (relayBatch) => {
  if (relayBatch.length === 0 || !shouldContinue()) return;
  
  try {
    console.log(`📡 Querying batch of ${relayBatch.length} relays...`);
    
    // Update header to show we're about to query this batch
    updateHeader(allEvents.size, usedRelays.size, relaySource === 'extended');
    
    const batchEvents = await getFeedFromRelays(relayBatch, queryOptions);
    
    if (shouldContinue()) {
      handleNewEvents(batchEvents, `batch of ${relayBatch.length} relays`);
      // Update header again after the batch is complete (this will show updated relay count)
      updateHeader(allEvents.size, usedRelays.size, relaySource === 'extended');
    }
  } catch (error) {
    console.warn(`⚠️ Failed to query relay batch:`, error.message);
    // Even on error, update header to reflect that we tried these relays
    if (shouldContinue()) {
      updateHeader(allEvents.size, usedRelays.size, relaySource === 'extended');
    }
  }
};

// Start with active relays immediately (for both modes)
console.log(`📡 Starting with active relay set (${app.relays.length} relays)`);

try {
  const normalizedActiveRelays = app.relays.map(relay => relay.toLowerCase().replace(/\/+$/, ""));
  const initialEvents = await getFeedFromRelays(app.relays, queryOptions);
  if (shouldContinue()) {
    normalizedActiveRelays.forEach(relay => usedRelays.add(relay));
    handleNewEvents(initialEvents, 'active relays');
  }
} catch (error) {
  console.warn("⚠️ Failed to query active relays:", error.message);
}

// If extended mode, query global relays next
if (relaySource === 'extended' && shouldContinue()) {
  console.log(`📡 Querying global relay set (${app.globalRelays.length} relays)`);
  
  try {
    // Filter out relays we've already used
    const newGlobalRelays = app.globalRelays.filter(relay => {
      const normalized = relay.toLowerCase().replace(/\/+$/, "");
      return !usedRelays.has(normalized);
    });
    
    if (newGlobalRelays.length > 0) {
      const normalizedGlobalRelays = newGlobalRelays.map(relay => relay.toLowerCase().replace(/\/+$/, ""));
      const globalEvents = await getFeedFromRelays(newGlobalRelays, queryOptions);
      if (shouldContinue()) {
        normalizedGlobalRelays.forEach(relay => usedRelays.add(relay));
        handleNewEvents(globalEvents, 'global relays');
      }
    }
  } catch (error) {
    console.warn("⚠️ Failed to query global relays:", error.message);
  }
}

// If extended mode, progressively discover and query relays in batches
if (relaySource === 'extended' && shouldContinue()) {
  const pubkeysForRelaySearch = followedPubkeys.length > MAX_PUBKEYS_FOR_EXTENDED_RELAYS 
    ? followedPubkeys.slice(0, MAX_PUBKEYS_FOR_EXTENDED_RELAYS)
    : followedPubkeys;

  console.log(`🔍 Starting extended relay discovery for ${pubkeysForRelaySearch.length} pubkeys...`);
  
    let newRelaysBatch = [];
    
    // Process pubkeys and collect relays in batches
    for (const pubkey of pubkeysForRelaySearch) {
      if (!shouldContinue()) break;
      
      try {
        const pubkeyRelays = await getExtendedRelaysForProfile(pubkey);
        
        if (pubkeyRelays && pubkeyRelays.length > 0 && shouldContinue()) {
          // Filter out already used relays and validate
          const validNewRelays = pubkeyRelays
            .filter(relay => {
              try {
                if (!relay || typeof relay !== 'string') return false;
                if (!relay.startsWith('wss://') && !relay.startsWith('ws://')) return false;
                const normalized = relay.toLowerCase().replace(/\/+$/, "");
                return !usedRelays.has(normalized);
              } catch (error) {
                return false;
              }
            })
            .map(relay => relay.toLowerCase().replace(/\/+$/, ""));

          // Add new relays to our batch
validNewRelays.forEach(relay => {
  if (usedRelays.size < MAX_RELAYS_TO_USE && !usedRelays.has(relay)) {
    newRelaysBatch.push(relay);
    // Don't add to usedRelays yet - wait until we actually query them
  }
});

// If we have a full batch, query it immediately
if (newRelaysBatch.length >= RELAY_BATCH_SIZE && shouldContinue()) {
  const batchToQuery = newRelaysBatch.splice(0, RELAY_BATCH_SIZE);
  
  // Add these relays to usedRelays just before querying
  batchToQuery.forEach(relay => usedRelays.add(relay));
  
  await queryRelayBatch(batchToQuery);
}

          // Stop if we've reached the relay limit
          if (usedRelays.size >= MAX_RELAYS_TO_USE) {
            console.log(`📊 Reached relay limit of ${MAX_RELAYS_TO_USE}, stopping discovery`);
            break;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get relays for pubkey ${pubkey.slice(0, 8)}...`, error.message);
      }
    }

// Query any remaining relays in the final batch
if (newRelaysBatch.length > 0 && shouldContinue()) {
  // Add remaining relays to usedRelays
  newRelaysBatch.forEach(relay => usedRelays.add(relay));
  await queryRelayBatch(newRelaysBatch);
}
  }

  // Mark query as completed
  if (shouldContinue()) {
    queryCompleted = true;
    app.isQuerying = false;
    app.activeQuery = null;
    updateHeader(allEvents.size, usedRelays.size, relaySource === 'extended', true);
    updatePaginationButtons();
  }

  // Handle video card clicks (only add listener once)
  const handleVideoClick = (event) => {
    let card = event.target.closest(".video-card");
    if (card && card.dataset.videoId) {
      try {
        const discoveryRelays = Array.from(usedRelays).slice(0, 3);
        const discoveryParam = discoveryRelays.join(",");
        const watchUrl = `#watch/params?v=${card.dataset.videoId}&discovery=${discoveryParam}`;
        window.location.hash = watchUrl;
      } catch (error) {
        console.warn("⚠️ Failed to create watch URL, using fallback:", error.message);
        window.location.hash = `#watch/params?v=${card.dataset.videoId}`;
      }
    }
  };

  // Remove any existing listeners and add new one
  grid.removeEventListener("click", handleVideoClick);
  grid.addEventListener("click", handleVideoClick);
}

async function getFeedFromRelays(relays, options = {}) {
  let {
    kinds = [21],
    limit = 40,
    authors = null,
    maxWait = 5000,
    timeout = 7000,
  } = options;

  try {
    // Validate and clean relays
    const cleanRelays = relays
      .filter(relay => {
        try {
          // Basic URL validation
          if (!relay || typeof relay !== 'string') return false;
          if (!relay.startsWith('wss://') && !relay.startsWith('ws://')) return false;
          new URL(relay); // This will throw if invalid
          return true;
        } catch (error) {
          console.warn(`⚠️ Invalid relay URL filtered out: ${relay}`);
          return false;
        }
      })
      .map(relay => relay.toLowerCase().replace(/\/+$/, ""));

    if (cleanRelays.length === 0) {
      console.warn("❌ No valid relays provided to getFeedFromRelays");
      return [];
    }

    console.log(`📡 Querying ${cleanRelays.length} relays for feed events`);

    const pool = new window.NostrTools.SimplePool();
    
    let filter = { kinds, limit };
    if (authors && authors.length > 0) {
      filter.authors = authors;
    }

    console.log(`🔍 Feed filter:`, filter);

    return new Promise((resolve) => {
      let events = [];
      let timeoutId;
      let startTime = Date.now();
      let sub;
      
      const handleCompletion = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (sub) {
          try {
            console.log("🔒 Closing feed subscription");
            sub.close();
          } catch (error) {
            console.warn("⚠️ Error closing subscription:", error.message);
          }
        }
        
        // Clean up the pool
        try {
          pool.close(cleanRelays);
        } catch (error) {
          console.warn("⚠️ Error closing pool:", error.message);
        }
        
        let duration = Date.now() - startTime;
        console.log(`✅ Feed query completed in ${duration}ms with ${events.length} events from ${cleanRelays.length} relays`);
        resolve(events);
      };

      timeoutId = setTimeout(() => {
        console.warn(`⏰ Feed query timeout reached after ${timeout}ms, returning ${events.length} events`);
        handleCompletion();
      }, timeout);

      try {
        sub = pool.subscribeManyEose(cleanRelays, [filter], {
          onevent: (event) => {
            try {
              // Basic event validation
              if (event && event.kind && event.pubkey && event.created_at) {
                events.push(event);
              }
            } catch (error) {
              console.warn("⚠️ Invalid event received:", error.message);
            }
          },
          onclose: () => {
            console.log("📪 Feed subscription closed by relay");
            handleCompletion();
          },
          oneose: () => {
            console.log("📥 End of stored events reached for feed");
            handleCompletion();
          },
          maxWait: maxWait,
        });
      } catch (error) {
        console.error("❌ Feed subscription error:", error);
        handleCompletion();
      }
    });

  } catch (error) {
    console.error("❌ Error in getFeedFromRelays:", error);
    return [];
  }
}


// Function to cancel any active queries
function cancelActiveQueries() {
  if (app.activeQuery && app.isQuerying) {
    console.log('🛑 Cancelling active queries...');
    app.activeQuery.cancel();
    app.activeQuery = null;
    app.isQuerying = false;
  }
}