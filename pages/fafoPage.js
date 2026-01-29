async function fafoPageHandler() {
  mainContent.innerHTML = `
    <h1>Nostr Event Explorer</h1>
    <div class="loading-indicator">
        <p>Loading explorer...</p>
    </div>
  `;
  
  try {
    // check and handle query params if found
    // (none for this page currently)

    // innerHTML for static skeleton (safe - no dynamic data)
    mainContent.innerHTML = `
      <div class="nostr-explorer" data-page="fafo-${Date.now()}">
        <h1>Nostr Event Explorer</h1>
        
    <div class="config-form">
      <details open>
        <summary>
          <h3 style="display: inline">Configure Search Parameters</h3>
        </summary>
        <form id="event-search-form">
          <div class="form-group">
            <label for="request-type">Request Type:</label>
            <select id="request-type" required>
              <option value="single">Single Event</option>
              <option value="query" selected>Query Events</option>
              <option value="subscription">
                Live Subscription
              </option>
            </select>
          </div>

          <div
            id="single-event-section"
            class="conditional-section"
            style="display: none"
          >
            <div class="form-group">
              <label for="event-id">Event ID:</label>
              <input
                type="text"
                id="event-id"
                placeholder="Enter event ID (hex)"
              />
            </div>
          </div>

          <div id="query-section" class="conditional-section">
            <div class="form-group">
              <label for="event-kind">Event Kind:</label>
              <input
                type="number"
                id="event-kind"
                value="1"
                min="0"
                max="65535"
              />
              <small
                >Common: 0=metadata, 1=text note, 3=contacts, 7=reaction,
                21=video</small
              >
            </div>
            <div class="form-group">
              <label for="event-limit">Number of Events:</label>
              <input
                type="number"
                id="event-limit"
                value="10"
                min="1"
                max="100"
              />
            </div>
            <div class="form-group">
              <label for="author-pubkey">Author (optional):</label>
              <input
                type="text"
                id="author-pubkey"
                placeholder="Enter author pubkey (hex)"
              />
            </div>
            <div class="form-group">
              <label for="search-text">Search Text (optional):</label>
              <input
                type="text"
                id="search-text"
                placeholder="Search in event content"
              />
            </div>
            <div class="form-group">
              <label for="time-since">Events Since (optional):</label>
              <select id="time-since">
                <option value="">All time</option>
                <option value="1">Last hour</option>
                <option value="24">Last 24 hours</option>
                <option value="168">Last week</option>
                <option value="720">Last month</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="relay-list">Relays (one per line):</label>
            <textarea id="relay-list" rows="4" required>
wss://nos.lol
wss://nostr.mom
wss://relay.damus.io</textarea
            >
          </div>

          <button type="submit" id="search-btn">Query Events</button>
          <button type="button" id="stop-btn" style="display: none">
            Stop Subscription
          </button>
        </form>
      </details>
    </div>
        
        <div id="relay-dashboard" style="display: none; margin-top: 20px;">
          <h3>🔗 Relay Status Dashboard</h3>
          <div id="relay-status-container"></div>
          <div class="dashboard-stats">
            <div class="stat-item"><span class="stat-label">Total Events:</span><span id="total-events-count">0</span></div>
            <div class="stat-item"><span class="stat-label">Active Duration:</span><span id="subscription-duration">00:00</span></div>
            <div class="stat-item"><span class="stat-label">Events/Min:</span><span id="events-per-minute">0</span></div>
          </div>
        </div>
        
        <div id="video-container" style="margin-top: 20px;">
          <p>Configure your search parameters above and click "Query Events" to begin.</p>
        </div>
      </div>
    `;

    // programmatic rendering of dynamic elements - event listeners
    const state = { activeSubscription: null, subscriptionStartTime: null, totalEvents: 0, durationInterval: null };
    
    document.getElementById('request-type').addEventListener('change', function() {
      const requestType = this.value;
      document.getElementById('single-event-section').style.display = requestType === 'single' ? 'block' : 'none';
      document.getElementById('query-section').style.display = requestType === 'single' ? 'none' : 'block';
      document.getElementById('search-btn').textContent = requestType === 'single' ? 'Get Event' : requestType === 'query' ? 'Query Events' : 'Start Subscription';
    });

    ['nostr-loading-started', 'nostr-relay-connected', 'nostr-relay-disconnected', 'nostr-relay-error', 'nostr-subscription-started', 'nostr-event-arrived', 'nostr-loading-complete', 'nostr-load-error'].forEach(eventType => {
      document.addEventListener(eventType, function(e) {
        if (!document.querySelector('.nostr-explorer')) return;
        
        if (eventType === 'nostr-loading-started') {
          document.getElementById('video-container').innerHTML = '<h3>Events found:</h3>';
        } else if (eventType === 'nostr-subscription-started') {
          document.getElementById('relay-dashboard').style.display = 'block';
          const container = document.getElementById('relay-status-container');
          container.innerHTML = ''; // Clear first
          // Create relay items programmatically (SAFE)
          e.detail.relays.forEach(relay => {
            const relayItem = document.createElement('div');
            relayItem.className = 'relay-status-item';
            relayItem.id = `relay-${btoa(relay).replace(/[^a-zA-Z0-9]/g, '')}`;
            
            const relayInfo = document.createElement('div');
            relayInfo.className = 'relay-info';
            const relayUrl = document.createElement('span');
            relayUrl.className = 'relay-url';
            relayUrl.textContent = relay; // Safe textContent
            const relayStatus = document.createElement('span');
            relayStatus.className = 'relay-status connecting';
            relayStatus.textContent = 'Connecting...';
            relayInfo.appendChild(relayUrl);
            relayInfo.appendChild(relayStatus);
            
            const relayStats = document.createElement('div');
            relayStats.className = 'relay-stats';
            const eventCount = document.createElement('span');
            eventCount.className = 'event-count';
            eventCount.textContent = '0 events';
            const indicator = document.createElement('span');
            indicator.className = 'connection-indicator';
            indicator.textContent = '⏳';
            relayStats.appendChild(eventCount);
            relayStats.appendChild(indicator);
            
            relayItem.appendChild(relayInfo);
            relayItem.appendChild(relayStats);
            container.appendChild(relayItem);
          });
          
          state.subscriptionStartTime = Date.now(); 
          state.totalEvents = 0;
          state.durationInterval = setInterval(() => {
            const duration = Date.now() - state.subscriptionStartTime;
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            document.getElementById('subscription-duration').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }, 1000);
        } else if (eventType === 'nostr-event-arrived') {
          state.totalEvents++; 
          document.getElementById('total-events-count').textContent = state.totalEvents;
          if (state.subscriptionStartTime) {
            const minutes = Math.floor((Date.now() - state.subscriptionStartTime) / 60000);
            document.getElementById('events-per-minute').textContent = minutes > 0 ? Math.round(state.totalEvents / minutes) : 0;
          }
          
          // Create event display programmatically (SAFE)
          const eventDiv = document.createElement('div');
          eventDiv.className = 'event-display';
          
          const eventHeader = document.createElement('div');
          eventHeader.className = 'event-header';
          const eventNumber = document.createElement('strong');
          eventNumber.textContent = `# ${e.detail.index}`;
          const eventMeta = document.createElement('span');
          eventMeta.className = 'event-meta';
          const eventTime = new Date(e.detail.event.created_at * 1000).toLocaleString();
          eventMeta.textContent = `📡 ${e.detail.relay || 'Unknown'} | ⏰ ${eventTime} | 👤 ${e.detail.event.pubkey.substring(0, 8)}... | 🏷️ Kind ${e.detail.event.kind}`;
          eventHeader.appendChild(eventNumber);
          eventHeader.appendChild(eventMeta);
          
          const eventContent = document.createElement('div');
          eventContent.className = 'event-content';
          if (e.detail.event.content) {
            const contentPreview = document.createElement('div');
            contentPreview.className = 'content-preview';
            contentPreview.textContent = e.detail.event.content.substring(0, 200) + (e.detail.event.content.length > 200 ? '...' : '');
            eventContent.appendChild(contentPreview);
          }
          const details = document.createElement('details');
          const summary = document.createElement('summary');
          summary.textContent = 'View Full JSON';
          const pre = document.createElement('pre');
          pre.textContent = JSON.stringify(e.detail.event, null, 2);
          details.appendChild(summary);
          details.appendChild(pre);
          eventContent.appendChild(details);
          
          eventDiv.appendChild(eventHeader);
          eventDiv.appendChild(eventContent);
          document.getElementById('video-container').appendChild(eventDiv);
          
          // Update relay count
          const relayItem = document.getElementById(`relay-${btoa(e.detail.relay || 'Unknown').replace(/[^a-zA-Z0-9]/g, '')}`);
          if (relayItem) {
            const eventCountElement = relayItem.querySelector('.event-count');
            const currentCount = parseInt(eventCountElement.textContent) || 0;
            eventCountElement.textContent = `${currentCount + 1} events`;
          }
        } else if (eventType.includes('relay-')) {
          const relayItem = document.getElementById(`relay-${btoa(e.detail.relay).replace(/[^a-zA-Z0-9]/g, '')}`);
          if (relayItem) {
            const statusElement = relayItem.querySelector('.relay-status');
            const indicator = relayItem.querySelector('.connection-indicator');
            const status = eventType.split('-')[1];
            statusElement.textContent = status === 'connected' ? 'Connected' : status === 'disconnected' ? 'Disconnected' : `Error: ${e.detail.error}`;
            statusElement.className = `relay-status ${status}`;
            indicator.textContent = status === 'connected' ? '✅' : status === 'disconnected' ? '❌' : status === 'error' ? '⚠️' : '⏳';
          }
        } else if (eventType === 'nostr-loading-complete') {
          // Create summary programmatically (SAFE)
          const summary = document.createElement('div');
          summary.className = 'loading-summary';
          const strong = document.createElement('strong');
          strong.textContent = `✅ ${e.detail.message}`;
          summary.appendChild(strong);
          document.getElementById('video-container').insertBefore(summary, document.getElementById('video-container').firstChild);
          
          const requestType = document.getElementById('request-type').value;
          document.getElementById('search-btn').disabled = false;
          document.getElementById('search-btn').textContent = requestType === 'single' ? 'Get Event' : requestType === 'query' ? 'Query Events' : 'Start Subscription';
          document.getElementById('stop-btn').style.display = 'none';
          if (requestType !== 'subscription') { 
            document.getElementById('relay-dashboard').style.display = 'none'; 
            if (state.durationInterval) clearInterval(state.durationInterval); 
          }
        } else if (eventType === 'nostr-load-error') {
          // Create error programmatically (SAFE)
          const errorDiv = document.createElement('div');
          errorDiv.className = 'error-display';
          const strong = document.createElement('strong');
          strong.textContent = 'Error: ';
          const errorText = document.createTextNode(e.detail.error);
          errorDiv.appendChild(strong);
          errorDiv.appendChild(errorText);
          document.getElementById('video-container').innerHTML = '';
          document.getElementById('video-container').appendChild(errorDiv);
          
          document.getElementById('search-btn').disabled = false; 
          document.getElementById('stop-btn').style.display = 'none';
          document.getElementById('relay-dashboard').style.display = 'none'; 
          if (state.durationInterval) clearInterval(state.durationInterval);
        }
      });
    });

    // click event delegation - on the main html element's first child
    mainContent.firstElementChild.addEventListener('click', function(e) {
      if (e.target.id === 'stop-btn' && state.activeSubscription?.close) {
        state.activeSubscription.close(); 
        state.activeSubscription = null;
        document.dispatchEvent(new CustomEvent('nostr-loading-complete', { detail: { message: 'Subscription stopped by user' } }));
      }
    });

    document.getElementById('event-search-form').addEventListener('submit', function(e) {
      e.preventDefault(); 
      fafoPageLoaded();
    });

    // load function
    function fafoPageLoaded() {
      const requestType = document.getElementById('request-type').value;
      const relays = document.getElementById('relay-list').value.trim().split('\n').map(r => r.trim()).filter(r => r.length > 0);
      
      if (relays.length === 0) { alert('Please enter at least one relay URL'); return; }
      
      document.getElementById('search-btn').disabled = true; 
      document.getElementById('search-btn').textContent = 'Working...';
      document.getElementById('video-container').innerHTML = '<p>Preparing request...</p>';
      
      if (requestType === 'single') {
        const eventId = document.getElementById('event-id').value.trim();
        if (!eventId) { alert('Please enter an event ID'); document.getElementById('search-btn').disabled = false; return; }
        window.fafoPageLoaded('single', { eventId, relays });
      } else {
        const filter = {};
        const eventKind = document.getElementById('event-kind').value; if (eventKind) filter.kinds = [parseInt(eventKind)];
        const eventLimit = document.getElementById('event-limit').value; if (eventLimit) filter.limit = parseInt(eventLimit);
        const authorPubkey = document.getElementById('author-pubkey').value.trim(); if (authorPubkey) filter.authors = [authorPubkey];
        const searchText = document.getElementById('search-text').value.trim(); if (searchText) filter.search = searchText;
        const timeSince = document.getElementById('time-since').value;
        if (timeSince) filter.since = Math.floor(Date.now() / 1000) - (parseInt(timeSince) * 3600);
        
        if (requestType === 'subscription') document.getElementById('stop-btn').style.display = 'inline-block';
        state.activeSubscription = window.fafoPageLoaded(requestType, { filter, relays });
      }
    }

  } catch (error) {
    console.error("Error rendering fafo page:", error);
    mainContent.innerHTML = `
      <h1>404</h1>
      <div class="loading-indicator">
          <p>Error rendering fafo page: ${error.message}</p>
      </div>
    `;
  }
}





function fafoPageLoaded(requestType, params) {
  const pool = new window.NostrTools.SimplePool();

  try {
    console.log(`Starting ${requestType} request...`, params);

    let eventsReceived = 0;
    let hasDispatchedStart = false;
    let subscription = null;
    let relayConnections = new Map(); // Track relay connection states

    if (requestType === "single") {
      // Single event by ID using pool.get()
      handleSingleEvent(pool, params.relays, params.eventId);
    } else if (requestType === "query") {
      // One-time query using pool.querySync()
      handleQueryEvents(pool, params.relays, params.filter);
    } else if (requestType === "subscription") {
      // Live subscription using pool.subscribe()
      subscription = handleSubscription(pool, params.relays, params.filter);
      return subscription; // Return subscription for external control
    }

    // Single event handler
    async function handleSingleEvent(pool, relays, eventId) {
      try {
        console.log(`Fetching single event: ${eventId}`);

        const event = await pool.get(relays, {
          ids: [eventId],
        });

        if (event) {
          // Dispatch start event
          const startEvent = new CustomEvent("nostr-loading-started");
          document.dispatchEvent(startEvent);

          // Dispatch the single event
          setTimeout(() => {
            const eventArrivedEvent = new CustomEvent("nostr-event-arrived", {
              detail: {
                event,
                index: 1,
                relay: "Single query result", // We don't know which relay for single queries
              },
            });
            document.dispatchEvent(eventArrivedEvent);

            // Dispatch completion
            setTimeout(() => {
              const completeEvent = new CustomEvent("nostr-loading-complete", {
                detail: { message: "Single event retrieved successfully" },
              });
              document.dispatchEvent(completeEvent);
            }, 500);
          }, 500);
        } else {
          const errorEvent = new CustomEvent("nostr-load-error", {
            detail: { error: `Event with ID ${eventId} not found` },
          });
          document.dispatchEvent(errorEvent);
        }
      } catch (error) {
        console.error("Error fetching single event:", error);
        const errorEvent = new CustomEvent("nostr-load-error", {
          detail: { error: error.message },
        });
        document.dispatchEvent(errorEvent);
      }
    }

    // Query events handler
    async function handleQueryEvents(pool, relays, filter) {
      try {
        console.log("Querying events with filter:", filter);

        const events = await pool.querySync(relays, filter);

        if (events && events.length > 0) {
          // Dispatch start event
          const startEvent = new CustomEvent("nostr-loading-started");
          document.dispatchEvent(startEvent);

          // Dispatch each event with delay
          events.forEach((event, index) => {
            //console.log(cleanEvent);
            setTimeout(() => {
              const eventArrivedEvent = new CustomEvent("nostr-event-arrived", {
                detail: {
                  event,
                  index: index + 1,
                  relay: "Query result", // We don't know which relay for querySync
                },
              });
              document.dispatchEvent(eventArrivedEvent);
            }, (index + 1) * 500);
          });

          // Dispatch completion after all events
          setTimeout(() => {
            const completeEvent = new CustomEvent("nostr-loading-complete", {
              detail: {
                message: `Query completed - ${events.length} events found`,
              },
            });
            document.dispatchEvent(completeEvent);
          }, events.length * 500 + 1000);
        } else {
          const errorEvent = new CustomEvent("nostr-load-error", {
            detail: { error: "No events found matching the query" },
          });
          document.dispatchEvent(errorEvent);
        }
      } catch (error) {
        console.error("Error querying events:", error);
        const errorEvent = new CustomEvent("nostr-load-error", {
          detail: { error: error.message },
        });
        document.dispatchEvent(errorEvent);
      }
    }

    // Subscription handler with detailed relay tracking
    function handleSubscription(pool, relays, filter) {
      console.log("Starting subscription with filter:", filter);

      // Initialize relay tracking
      relays.forEach((relay) => {
        relayConnections.set(relay, {
          status: "connecting",
          eventCount: 0,
          lastEvent: null,
          connectedAt: null,
          errors: [],
        });
      });

      // Dispatch subscription started event
      const subscriptionStartedEvent = new CustomEvent(
        "nostr-subscription-started",
        {
          detail: { relays },
        }
      );
      document.dispatchEvent(subscriptionStartedEvent);

      // Set up individual relay connections to track their status
      const relayPromises = relays.map(async (relayUrl) => {
        try {
          // Try to connect to each relay individually to track connection status
          const relay = new window.NostrTools.Relay(relayUrl);

          relay
            .connect()
            .then(() => {
              console.log(`Connected to relay: ${relayUrl}`);
              relayConnections.set(relayUrl, {
                ...relayConnections.get(relayUrl),
                status: "connected",
                connectedAt: Date.now(),
              });

              const connectedEvent = new CustomEvent("nostr-relay-connected", {
                detail: { relay: relayUrl },
              });
              document.dispatchEvent(connectedEvent);
            })
            .catch((error) => {
              console.error(`Failed to connect to relay ${relayUrl}:`, error);
              relayConnections.set(relayUrl, {
                ...relayConnections.get(relayUrl),
                status: "error",
                errors: [
                  ...relayConnections.get(relayUrl).errors,
                  error.message,
                ],
              });

              const errorEvent = new CustomEvent("nostr-relay-error", {
                detail: { relay: relayUrl, error: error.message },
              });
              document.dispatchEvent(errorEvent);
            });

          // Handle relay disconnection
          relay.on("disconnect", () => {
            console.log(`Disconnected from relay: ${relayUrl}`);
            relayConnections.set(relayUrl, {
              ...relayConnections.get(relayUrl),
              status: "disconnected",
            });

            const disconnectedEvent = new CustomEvent(
              "nostr-relay-disconnected",
              {
                detail: { relay: relayUrl },
              }
            );
            document.dispatchEvent(disconnectedEvent);
          });
        } catch (error) {
          console.error(`Error setting up relay ${relayUrl}:`, error);

          const errorEvent = new CustomEvent("nostr-relay-error", {
            detail: { relay: relayUrl, error: error.message },
          });
          document.dispatchEvent(errorEvent);
        }
      });

      // Set up the main subscription
      const sub = pool.subscribe(relays, filter, {
        onevent(event, relayUrl) {
          //  console.log(`Received event from ${relayUrl}:`, event);
          eventsReceived++;

          // Update relay statistics
          if (relayUrl && relayConnections.has(relayUrl)) {
            const relayData = relayConnections.get(relayUrl);
            relayConnections.set(relayUrl, {
              ...relayData,
              eventCount: relayData.eventCount + 1,
              lastEvent: Date.now(),
            });
          }

          // Dispatch start event only once
          if (!hasDispatchedStart) {
            const startEvent = new CustomEvent("nostr-loading-started");
            document.dispatchEvent(startEvent);
            hasDispatchedStart = true;
          }

          // Dispatch event immediately (no delay for live subscription)
          const eventArrivedEvent = new CustomEvent("nostr-event-arrived", {
            detail: {
              event,
              index: eventsReceived,
              relay: relayUrl || "Unknown relay",
              timestamp: Date.now(),
            },
          });
          document.dispatchEvent(eventArrivedEvent);
        },

        oneose(relayUrl) {
          console.log(
            `End of stored events reached for relay: ${relayUrl || "unknown"}`
          );

          // Update relay status to indicate EOSE received
          if (relayUrl && relayConnections.has(relayUrl)) {
            const relayData = relayConnections.get(relayUrl);
            relayConnections.set(relayUrl, {
              ...relayData,
              eoseReceived: true,
              eoseAt: Date.now(),
            });
          }

          // Check if all relays have sent EOSE
          const allRelaysEOSE = Array.from(relayConnections.values()).every(
            (relay) => relay.eoseReceived || relay.status === "error"
          );

          if (allRelaysEOSE) {
            // All relays have finished sending stored events
            const totalStoredEvents = eventsReceived;

            if (totalStoredEvents === 0) {
              const noStoredEventsEvent = new CustomEvent(
                "nostr-loading-complete",
                {
                  detail: {
                    message: `No stored events found. Subscription is active for new events. Connected to ${relays.length} relays.`,
                  },
                }
              );
              document.dispatchEvent(noStoredEventsEvent);
            } else {
              const completeEvent = new CustomEvent("nostr-loading-complete", {
                detail: {
                  message: `Subscription active - ${totalStoredEvents} stored events loaded from ${relays.length} relays. Listening for new events...`,
                },
              });
              document.dispatchEvent(completeEvent);
            }
          }
        },

        onclose(relayUrl, reason) {
          console.log(`Subscription closed for relay ${relayUrl}:`, reason);

          if (relayUrl && relayConnections.has(relayUrl)) {
            const relayData = relayConnections.get(relayUrl);
            relayConnections.set(relayUrl, {
              ...relayData,
              status: "closed",
              closedAt: Date.now(),
              closeReason: reason,
            });

            const disconnectedEvent = new CustomEvent(
              "nostr-relay-disconnected",
              {
                detail: { relay: relayUrl, reason },
              }
            );
            document.dispatchEvent(disconnectedEvent);
          }
        },
      });

      // Enhanced subscription object with relay tracking
      const enhancedSub = {
        close: () => {
          console.log("Closing subscription and all relay connections");
          sub.close();

          // Update all relay statuses to closed
          relayConnections.forEach((relayData, relayUrl) => {
            relayConnections.set(relayUrl, {
              ...relayData,
              status: "closed",
              closedAt: Date.now(),
            });
          });
        },

        getRelayStats: () => {
          return Array.from(relayConnections.entries()).map(([url, data]) => ({
            url,
            ...data,
          }));
        },

        getTotalEvents: () => eventsReceived,

        getActiveRelays: () => {
          return Array.from(relayConnections.entries())
            .filter(([_, data]) => data.status === "connected")
            .map(([url, _]) => url);
        },
      };

      return enhancedSub;
    }
  } catch (error) {
    console.error("Error setting up Nostr request:", error);
    const errorEvent = new CustomEvent("nostr-load-error", {
      detail: { error: error.message },
    });
    document.dispatchEvent(errorEvent);
  }
}



