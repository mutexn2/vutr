// Direct subscription management functions (no initiation needed)
function startSubscription(subscriptionId, filter, relays, options = {}) {
  // Close existing subscription with same ID if it exists
  if (app.subscriptions.has(subscriptionId)) {
    stopSubscription(subscriptionId);
  }

  // Initialize events array for this subscription
  app.subscriptionEvents.set(subscriptionId, []);

  const subscription = {
    id: subscriptionId,
    filter,
    relays,
    options,
    eventCount: 0,
    startTime: Date.now(),
    relayStates: new Map(),
    isActive: true,

    // Callbacks for event handling
    onEvent: options.onEvent || null,
    onEose: options.onEose || null,
    onClose: options.onClose || null,
    onError: options.onError || null,
  };

  // Initialize relay states
  relays.forEach((relay, index) => {
    subscription.relayStates.set(relay, {
      url: relay,
      status: "connecting",
      eventCount: 0,
      connected: false,
      eose: false,
      error: null,
      index: index,
    });
  });

  // Start the actual Nostr subscription
  _startNostrSubscription(subscription);

  // Store the subscription
  app.subscriptions.set(subscriptionId, subscription);

  return subscription;
}

function _startNostrSubscription(subscription) {
  const relayConnections = new Map();

  subscription.relays.forEach((relayUrl) => {
    try {
      const relayState = subscription.relayStates.get(relayUrl);
      let pool = new window.NostrTools.SimplePool();
      const sub = pool.subscribeMany(
        [relayUrl],
        [subscription.filter],
        {
          onevent: (event, sourceRelayUrl) => {
            _handleEvent(subscription.id, event, relayUrl);
          },
          oneose: (sourceRelayUrl) => {
            _handleEose(subscription.id, relayUrl);
          },
          onclose: (sourceRelayUrl, reason) => {
            _handleClose(subscription.id, relayUrl, reason);
          },
          onerror: (sourceRelayUrl, error) => {
            _handleError(subscription.id, relayUrl, error);
          },
        }
      );

      relayConnections.set(relayUrl, sub);
    } catch (error) {
      console.error(`Failed to connect to ${relayUrl}:`, error);
      const relayState = subscription.relayStates.get(relayUrl);
      relayState.status = "error";
      relayState.error = error.message;
    }
  });

  // Store close function
  subscription.close = () => {
    relayConnections.forEach((sub, relayUrl) => {
      try {
        sub.close();
      } catch (error) {
        console.warn(`Error closing connection to ${relayUrl}:`, error);
      }
    });
  };

  // Set connection timeout
  subscription.connectionTimeout = setTimeout(() => {
    subscription.relayStates.forEach((state) => {
      if (state.status === "connecting") {
        state.status = "timeout";
        state.error = "Connection timeout";
      }
    });
  }, 10000);
}

function _handleEvent(subscriptionId, event, relayUrl) {
  const subscription = app.subscriptions.get(subscriptionId);
  if (!subscription || !subscription.isActive) return;

  const relayState = subscription.relayStates.get(relayUrl);
  subscription.eventCount++;
  relayState.eventCount++;
  relayState.connected = true;
  relayState.status = "connected";

  // Check if we already have this event (deduplication)
  const existingEvents = app.subscriptionEvents.get(subscriptionId) || [];
  const existingEventIndex = existingEvents.findIndex(
    (e) => e.event.id === event.id
  );

  const eventData = {
    event,
    subscriptionId,
    receivedAt: Date.now(),
    relays: [relayUrl], // Start with this relay
  };

  if (existingEventIndex !== -1) {
    // Event exists, add this relay to the relays list if not already there
    const existingEvent = existingEvents[existingEventIndex];
    if (!existingEvent.relays.includes(relayUrl)) {
      existingEvent.relays.push(relayUrl);
    }
    // Update the event in place
    existingEvents[existingEventIndex] = existingEvent;
  } else {
    // New event, add it
    existingEvents.push(eventData);

    // Sort by created_at (newest first)
    existingEvents.sort((a, b) => b.event.created_at - a.event.created_at);

    // Limit events if specified
    if (
      subscription.options.limit &&
      existingEvents.length > subscription.options.limit
    ) {
      existingEvents.splice(subscription.options.limit);
    }
  }

  app.subscriptionEvents.set(subscriptionId, existingEvents);

  // Call custom event handler if provided
  if (subscription.onEvent) {
    subscription.onEvent(eventData, subscription);
  }
}

function _handleEose(subscriptionId, relayUrl) {
  const subscription = app.subscriptions.get(subscriptionId);
  if (!subscription) return;

  const relayState = subscription.relayStates.get(relayUrl);
  relayState.eose = true;
  if (!relayState.connected) {
    relayState.connected = true;
    relayState.status = "connected";
  }

  if (subscription.onEose) {
    subscription.onEose(relayUrl, subscription);
  }
}

function _handleClose(subscriptionId, relayUrl, reason) {
  const subscription = app.subscriptions.get(subscriptionId);
  if (!subscription) return;

  const relayState = subscription.relayStates.get(relayUrl);
  relayState.status = "closed";
  relayState.connected = false;
  relayState.error = "Connection closed";

  if (subscription.onClose) {
    subscription.onClose(relayUrl, reason, subscription);
  }
}

function _handleError(subscriptionId, relayUrl, error) {
  const subscription = app.subscriptions.get(subscriptionId);
  if (!subscription) return;

  const relayState = subscription.relayStates.get(relayUrl);
  relayState.status = "error";
  relayState.connected = false;
  relayState.error = error?.message || "Connection error";

  if (subscription.onError) {
    subscription.onError(relayUrl, error, subscription);
  }
}

function stopSubscription(subscriptionId) {
  const subscription = app.subscriptions.get(subscriptionId);
  if (subscription) {
    subscription.isActive = false;
    if (subscription.close) {
      subscription.close();
    }
    if (subscription.connectionTimeout) {
      clearTimeout(subscription.connectionTimeout);
    }
    app.subscriptions.delete(subscriptionId);
    app.subscriptionEvents.delete(subscriptionId);
  }
}

function stopAllSubscriptions() {
  for (const [subscriptionId] of app.subscriptions) {
    stopSubscription(subscriptionId);
  }
}

function getSubscriptionEvents(subscriptionId) {
  return app.subscriptionEvents.get(subscriptionId) || [];
}

function clearSubscriptionEvents(subscriptionId) {
  app.subscriptionEvents.set(subscriptionId, []);
}

function getSubscriptionStatus(subscriptionId) {
  const subscription = app.subscriptions.get(subscriptionId);
  if (!subscription) return null;

  const connectedRelays = Array.from(subscription.relayStates.values())
    .filter((state) => state.connected).length;

  return {
    id: subscription.id,
    isActive: subscription.isActive,
    eventCount: subscription.eventCount,
    connectedRelays,
    totalRelays: subscription.relays.length,
    duration: Date.now() - subscription.startTime,
    relayStates: Array.from(subscription.relayStates.values()),
  };
}

async function nakPageHandler() {
  mainContent.innerHTML = `
    <div class="subscription-dashboard">
      <h1>Nostr Subscriptions</h1>
      
      <!-- Compact Filter Form -->
      <div class="filter-section">
        <div class="section-header">
          <h3>New Subscription</h3>
          <button type="button" id="toggle-form" class="btn btn-secondary">▼</button>
        </div>
        <div id="filter-form-container" class="collapsible">
          <form id="filter-form" class="filter-form">
            <div class="form-grid">
              <div class="form-field">
                <label>Kinds</label>
                <input type="text" id="kinds" placeholder="1,6,7" value="1">
              </div>
              <div class="form-field">
                <label>Limit</label>
                <input type="number" id="limit" placeholder="20" value="20" min="1" max="500">
              </div>
              <div class="form-field">
                <label>Since (hours ago)</label>
                <input type="number" id="since" placeholder="24" min="1">
              </div>
              <div class="form-field">
                <label>Authors</label>
                <input type="text" id="authors" placeholder="npub... or hex">
              </div>
              <div class="form-field">
                <label>Search</label>
                <input type="text" id="search" placeholder="Search content">
              </div>
            </div>
            <div class="form-field">
              <label>Relays (one per line)</label>
              <textarea id="relays" rows="3">
wss://nos.lol
wss://nostr.mom
              </textarea>
            </div>
            <button type="button" id="start-subscription" class="btn btn-primary">
              Start Subscription
            </button>
          </form>
        </div>
      </div>
      
      <!-- Active Subscriptions -->
      <div class="subscriptions-section">
        <div class="section-header">
          <h3>Active Subscriptions</h3>
          <span id="subscription-count" class="count-badge">0</span>
        </div>
        <div id="subscriptions-list" class="subscriptions-list">
          <div class="no-subscriptions">No active subscriptions</div>
        </div>
      </div>
      
      <!-- Events Feed -->
      <div class="events-section">
        <div class="section-header">
          <h3>Live Events</h3>
          <div class="events-controls">
            <select id="event-display-mode">
              <option value="summary">Summary</option>
              <option value="json">JSON</option>
            </select>
            <button id="clear-events" class="btn btn-secondary">Clear</button>
            <button id="pause-events" class="btn btn-secondary">Pause</button>
          </div>
        </div>
        <div id="events-container" class="events-container">
          <div class="no-events">No events yet</div>
        </div>
      </div>
    </div>
  `;

  setupSubscriptionManager();
}

function setupSubscriptionManager() {
  let isEventsPaused = false;
  const eventDisplayLimit = 50;

  const elements = {
    toggleForm: document.getElementById("toggle-form"),
    formContainer: document.getElementById("filter-form-container"),
    startBtn: document.getElementById("start-subscription"),
    subscriptionCount: document.getElementById("subscription-count"),
    subscriptionsList: document.getElementById("subscriptions-list"),
    eventsContainer: document.getElementById("events-container"),
    displayMode: document.getElementById("event-display-mode"),
    clearBtn: document.getElementById("clear-events"),
    pauseBtn: document.getElementById("pause-events"),
  };

  // Event listeners
  elements.toggleForm.addEventListener("click", toggleForm);
  elements.startBtn.addEventListener("click", startNewSubscription);
  elements.clearBtn.addEventListener("click", clearEvents);
  elements.pauseBtn.addEventListener("click", toggleEventsPause);
  elements.displayMode.addEventListener("change", refreshEventsDisplay);

  // Set up update interval for subscription status
  const updateInterval = setInterval(updateAllSubscriptionDisplays, 2000);

  function toggleForm() {
    const isCollapsed = elements.formContainer.style.display === "none";
    elements.formContainer.style.display = isCollapsed ? "block" : "none";
    elements.toggleForm.textContent = isCollapsed ? "▲" : "▼";
  }

  function buildFilter() {
    const filter = {};

    const kinds = document.getElementById("kinds").value.trim();
    if (kinds) {
      filter.kinds = kinds
        .split(",")
        .map((k) => parseInt(k.trim()))
        .filter((k) => !isNaN(k));
    }

    const authors = document.getElementById("authors").value.trim();
    if (authors) {
      filter.authors = authors
        .split(",")
        .map((a) => a.trim())
        .map((author) => {
          if (author.startsWith("npub")) {
            try {
              return window.NostrTools.nip19.decode(author).data;
            } catch (e) {
              return author;
            }
          }
          return author;
        })
        .filter((a) => a.length > 0);
    }

    const limit = document.getElementById("limit").value.trim();
    if (limit) filter.limit = parseInt(limit);

    const since = document.getElementById("since").value.trim();
    if (since) {
      filter.since = Math.floor(Date.now() / 1000) - parseInt(since) * 3600;
    }

    const search = document.getElementById("search").value.trim();
    if (search) filter.search = search;

    return filter;
  }

  function getRelays() {
    return document
      .getElementById("relays")
      .value.trim()
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r && (r.startsWith("wss://") || r.startsWith("ws://")));
  }

  function startNewSubscription() {
    const filter = buildFilter();
    const relays = getRelays();

    if (relays.length === 0) {
      alert("Please add at least one valid relay");
      return;
    }

    const subscriptionId = "nak_sub_" + Date.now().toString(36);

    // Use the global function directly
    startSubscription(subscriptionId, filter, relays, {
      limit: filter.limit || 50,
      onEvent: (eventData) => {
        if (!isEventsPaused) {
          displayEvent(eventData);
        }
      },
    });

    updateSubscriptionsList();
    elements.formContainer.style.display = "none";
    elements.toggleForm.textContent = "▼";
  }

  function displayEvent(eventData) {
    const { event, relays, subscriptionId, receivedAt } = eventData;

    // Remove no-events message
    const noEvents = elements.eventsContainer.querySelector(".no-events");
    if (noEvents) noEvents.remove();

    const eventEl = document.createElement("div");
    eventEl.className = "event-item";

    const displayMode = elements.displayMode.value;
    const eventTime = new Date(event.created_at * 1000).toLocaleTimeString();

    if (displayMode === "json") {
      eventEl.innerHTML = `
        <div class="event-header">
          <div class="event-meta">
            <span class="kind-badge">Kind ${event.kind}</span>
            <span class="time-badge">${eventTime}</span>
            <span class="relay-badge">${relays.join(", ")}</span>
            <span class="sub-badge">${subscriptionId}</span>
          </div>
        </div>
        <pre class="event-json">${JSON.stringify(event, null, 2)}</pre>
      `;
    } else {
      const content =
        event.content.length > 200
          ? event.content.substring(0, 200) + "..."
          : event.content;

      eventEl.innerHTML = `
        <div class="event-header">
          <div class="event-meta">
            <span class="kind-badge">Kind ${event.kind}</span>
            <span class="time-badge">${eventTime}</span>
            <span class="relay-badge">${relays.join(", ")}</span>
            <span class="sub-badge">${subscriptionId}</span>
          </div>
        </div>
        <div class="event-content">${escapeHtml(content)}</div>
        <div class="event-details">
          <span>ID: ${event.id.substring(0, 16)}...</span>
          <span>Author: ${event.pubkey.substring(0, 16)}...</span>
          <span>Tags: ${event.tags.length}</span>
        </div>
      `;
    }

    elements.eventsContainer.insertBefore(
      eventEl,
      elements.eventsContainer.firstChild
    );

    // Limit displayed events
    const items = elements.eventsContainer.querySelectorAll(".event-item");
    if (items.length > eventDisplayLimit) {
      for (let i = eventDisplayLimit; i < items.length; i++) {
        items[i].remove();
      }
    }
  }

  function updateAllSubscriptionDisplays() {
    // Update count
    elements.subscriptionCount.textContent = app.subscriptions.size;

    // Update each subscription display
    for (const [subscriptionId] of app.subscriptions) {
      updateSubscriptionDisplay(subscriptionId);
    }
  }

  function updateSubscriptionDisplay(subscriptionId) {
    // Use global function
    const status = getSubscriptionStatus(subscriptionId);
    if (!status) return;

    const element = document.getElementById(`sub-${subscriptionId}`);
    if (!element) return;

    // Update stats
    const eventsEl = element.querySelector(".sub-events");
    const relaysEl = element.querySelector(".sub-relays");
    const durationEl = element.querySelector(".sub-duration");

    if (eventsEl) eventsEl.textContent = status.eventCount;
    if (relaysEl)
      relaysEl.textContent = `${status.connectedRelays}/${status.totalRelays}`;
    if (durationEl)
      durationEl.textContent = formatDuration(status.duration / 1000);

    // Update relay states
    const relayList = element.querySelector(".relay-states");
    if (relayList) {
      const relayStatesHTML = status.relayStates
        .map((state) => {
          const statusClass = state.status.toLowerCase();
          const statusText =
            state.status === "connecting" && status.duration > 5000
              ? "timeout"
              : state.status;

          return `
            <div class="relay-state relay-${statusClass}">
              <span class="relay-url" title="${state.url}">${state.url}</span>
              <span class="relay-status ${statusClass}">${statusText}</span>
              <span class="relay-events">${state.eventCount} events</span>
              ${state.eose ? '<span class="relay-eose">EOSE</span>' : ""}
              ${
                state.error
                  ? `<span class="relay-error" title="${state.error}">⚠️</span>`
                  : ""
              }
            </div>
          `;
        })
        .join("");

      relayList.innerHTML = relayStatesHTML;
    }
  }

  function updateSubscriptionsList() {
    elements.subscriptionCount.textContent = app.subscriptions.size;

    if (app.subscriptions.size === 0) {
      elements.subscriptionsList.innerHTML =
        '<div class="no-subscriptions">No active subscriptions</div>';
      return;
    }

    const subscriptionsHTML = Array.from(app.subscriptions.entries())
      .map(([subId, sub]) => {
        // Use global function
        const status = getSubscriptionStatus(subId);
        return `
          <div class="subscription-item" id="sub-${subId}">
            <div class="sub-header">
              <div class="sub-info">
                <span class="sub-id">${subId}</span>
                <div class="sub-stats">
                  <span class="sub-events">${
                    status ? status.eventCount : 0
                  }</span> events
                  <span class="sub-relays">${
                    status ? status.connectedRelays : 0
                  }/${sub.relays.length}</span> relays
                  <span class="sub-duration">${
                    status ? formatDuration(status.duration / 1000) : "0s"
                  }</span>
                </div>
              </div>
              <div class="sub-controls">
                <button class="btn-toggle" data-sub-id="${subId}">▲</button>
                <button class="btn-close" data-sub-id="${subId}">✕</button>
              </div>
            </div>
            <div class="sub-details" style="display:block">
              <div class="sub-filter">
                <strong>Filter:</strong> ${JSON.stringify(sub.filter)}
              </div>
              <div class="relay-states"></div>
            </div>
          </div>
        `;
      })
      .join("");

    elements.subscriptionsList.innerHTML = subscriptionsHTML;

    // Add event listeners after rendering
    addSubscriptionEventListeners();
  }

  function addSubscriptionEventListeners() {
    elements.subscriptionsList.addEventListener("click", (event) => {
      const toggleBtn = event.target.closest(".btn-toggle");
      const closeBtn = event.target.closest(".btn-close");

      if (toggleBtn) {
        const subId = toggleBtn.getAttribute("data-sub-id");
        toggleSubDetails(subId);
      }

      if (closeBtn) {
        const subId = closeBtn.getAttribute("data-sub-id");
        closeSubscription(subId);
      }
    });
  }

  function toggleSubDetails(subId) {
    const details = document.querySelector(`#sub-${subId} .sub-details`);
    const toggle = document.querySelector(`#sub-${subId} .btn-toggle`);
    if (!details || !toggle) return;

    const isVisible = details.style.display !== "none";
    details.style.display = isVisible ? "none" : "block";
    toggle.textContent = isVisible ? "▼" : "▲";
  }

  function closeSubscription(subId) {
    // Use global function
    stopSubscription(subId);
    updateSubscriptionsList();
  }

  function toggleEventsPause() {
    isEventsPaused = !isEventsPaused;
    elements.pauseBtn.textContent = isEventsPaused ? "Resume" : "Pause";

    if (!isEventsPaused) {
      refreshEventsDisplay();
    }
  }

  function refreshEventsDisplay() {
    clearEvents();

    // Display events from all subscriptions
    for (const [subId] of app.subscriptions) {
      // Use global function
      const events = getSubscriptionEvents(subId);
      events.slice(0, eventDisplayLimit).forEach((eventData) => {
        displayEvent(eventData);
      });
    }
  }

  function clearEvents() {
    elements.eventsContainer.innerHTML =
      '<div class="no-events">No events yet</div>';
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Initial update
  updateSubscriptionsList();

  // No cleanup function needed since router handles it automatically
}

///////////////////////////////
// In your chat page - with page ownership
function startChatSubscription(channelId) {
  const filter = {
    kinds: [1111],
    '#t': [channelId],
    limit: 100
  };
  
  const subscriptionId = `chat_${channelId}`;
  const relays = app.relays;
  
  return startSubscription(subscriptionId, filter, relays, {
    onEvent: (eventData) => {
      // This will only be called once per event, even if received from multiple relays
      renderChatMessage(eventData.event, eventData.relays);
    }
  });
}

