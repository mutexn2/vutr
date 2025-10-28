async function relaySetsDiscoveryPageHandler() {
  mainContent.innerHTML = `
    <h1>Discovering Relay sets</h1>
    <div class="loading-indicator">
        <p>Searching for relay sets...</p>
    </div>
  `;

  try {
    let kinds = [30002];
    let limit = 21;

    let sets = await NostrClient.getEvents({ kinds: kinds, limit: limit });
    sets = sets.map(sanitizeNostrEvent).filter(v => v !== null);
    
    if (sets.length === 0) {
      mainContent.innerHTML = `
        <h1>No sets Found</h1>
        <p>No kind-30002 events were found on the connected relays.</p>
      `;
      return;
    }

    // Deduplicate replaceable events - keep only the latest for each pubkey+d_tag combination
    sets = deduplicateReplaceableEvents(sets);
    
    sets.sort((a, b) => b.created_at - a.created_at);
    console.log("~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.");

    mainContent.innerHTML = `<h2>Relay Sets (kind-30002)</h2>
                             <div class="videos-listview"></div>`;
    const rSets = document.querySelector('.videos-listview');

    // Create all skeleton cards first
    sets.forEach(event => {
      const skeletonCard = createSkeletonRelaySetCard(event);
      rSets.appendChild(skeletonCard);
    });

    // Set up lazy loading for publisher components
    setupRelaySetLazyLoading(rSets, sets);

    // Event delegation for all button clicks
    setupRelaySetEventDelegation(rSets, sets);

  } catch (error) {
    console.error("Error rendering relay sets page:", error);
    let errorDiv = document.createElement("div");
    errorDiv.innerHTML = safeHtml`
      <h1>404</h1>
      <div class="loading-indicator">
        <p>Error rendering relay sets page: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
    mainContent.replaceChildren(errorDiv);
  }
}

function setupRelaySetEventDelegation(container, sets) {
  container.addEventListener('click', (e) => {
    e.stopPropagation();
    
    const target = e.target;
    const card = target.closest('.relay-set-card');
    if (!card) return;
    
    const eventId = card.dataset.eventId;
    const event = sets.find(s => s.id === eventId);
    if (!event) return;

    // Handle import button clicks
    if (target.classList.contains('import-relay-set-btn')) {
      showImportPreviewModal(event);
      return;
    }

    // Handle relay action buttons
    if (target.classList.contains('relay-action-btn')) {
      const url = target.dataset.url;
      console.log('WebSocket URL:', url);
      const cleanUrl = url.replace(/^(wss?:\/\/|https?:\/\/)/, '');
      window.location.hash = `#singlerelay/${cleanUrl}`;
      return;
    }

    // Handle show JSON button
    if (target.classList.contains('show-json-btn')) {
      const jsonSection = card.querySelector('.relay-set-json');
      const jsonContainer = card.querySelector('.json-content');
      const isHidden = jsonSection.classList.contains('hidden');
      
      if (isHidden) {
        jsonSection.classList.remove('hidden');
        target.textContent = 'Hide JSON';
        renderJson(event, jsonContainer);
      } else {
        jsonSection.classList.add('hidden');
        target.textContent = 'Show JSON';
        jsonContainer.innerHTML = '';
      }
      return;
    }

    // Handle clickable publisher
    if (target.closest('.clickable-publisher')) {
      e.preventDefault();
      const npub = window.NostrTools.nip19.npubEncode(event.pubkey);
      window.location.hash = `#profile/${npub}`;
      return;
    }

    // Handle more relays / collapse functionality
    if (target.classList.contains('clickable-more')) {
      handleMoreRelaysClick(target, card);
      return;
    }

    if (target.classList.contains('clickable-collapse')) {
      handleCollapseRelaysClick(target, card);
      return;
    }
  });
}

function handleMoreRelaysClick(moreRelaysBtn, card) {
  const relayUrlsContainer = card.querySelector('.relay-urls');
  const allUrls = JSON.parse(relayUrlsContainer.dataset.allUrls);
  
  relayUrlsContainer.innerHTML = `
    <div class="relay-item collapse-relays clickable-collapse">Show less</div>
  ` + allUrls.map(url => `
    <div class="relay-item">
      <span class="relay-url">${escapeHtml(url)}</span>
      <button class="relay-action-btn" data-url="${escapeHtml(url)}" title="Visit relay">⍆</button>
    </div>
  `).join('');
}

function handleCollapseRelaysClick(collapseBtn, card) {
  const relayUrlsContainer = card.querySelector('.relay-urls');
  const allUrls = JSON.parse(relayUrlsContainer.dataset.allUrls);
  
  relayUrlsContainer.innerHTML = (allUrls.length > 3 ? `
    <div class="relay-item more-relays clickable-more" data-count="${allUrls.length - 3}">Show ${allUrls.length - 3} more relays</div>
  ` : '') + allUrls.slice(0, 3).map(url => `
    <div class="relay-item">
      <span class="relay-url">${escapeHtml(url)}</span>
      <button class="relay-action-btn" data-url="${escapeHtml(url)}" title="Visit relay">⍆</button>
    </div>
  `).join('');
}

function showImportPreviewModal(event) {
  const titleTag = event.tags.find(tag => tag[0] === 'title');
  const originalTitle = titleTag ? titleTag[1] : 'Untitled Set';
  const relays = event.tags.filter(tag => tag[0] === 'relay');
  const relayList = relays.map(relay => relay[1]).join('\n');
  
  // Check if name conflict exists and determine final name
  let finalTitle = originalTitle;
  let counter = 1;
  while (app.relayLists[finalTitle]) {
    finalTitle = `${originalTitle} (${counter})`;
    counter++;
  }
  
  const hasNameConflict = finalTitle !== originalTitle;
  
  const content = `
    <div class="import-relay-set-modal">
      <div class="set-preview">
        <h4>Import Relay Set: ${escapeHtml(originalTitle)}</h4>
        ${hasNameConflict ? `<p class="warning">⚠️ A set named "${escapeHtml(originalTitle)}" already exists. Will be imported as "${escapeHtml(finalTitle)}"</p>` : ''}
        <p><strong>Relays (${relays.length}):</strong></p>
        <pre class="relay-list-preview">${relayList}</pre>
      </div>
      <div class="import-actions">
        <button class="btn-secondary" id="modalCancelBtn">Cancel</button>
        <button class="btn-primary" id="modalImportBtn">Import</button>
      </div>
    </div>
  `;

  const modal = openModal({
    title: "Import Relay Set",
    content,
    size: "medium"
  });

  modal.querySelector("#modalImportBtn").addEventListener("click", () => {
    importRelaySet(event, finalTitle);
    closeModal();
  });
  modal.querySelector("#modalCancelBtn").addEventListener("click", closeModal);
}

async function importRelaySet(event, finalTitle) {
  try {
    // Create the new relay set structure for local storage
    const newRelaySet = {
      kind: 30002,
      tags: [
        ['d', crypto.randomUUID().replace(/-/g, '').slice(0, 15)], // Generate new unique ID
        ['title', finalTitle],
        // Copy all relay tags from the imported event
        ...event.tags.filter(tag => tag[0] === 'relay')
      ]
    };
    
    // Add to local storage
    app.relayLists[finalTitle] = newRelaySet;
    saveRelayLists();
    
    showTemporaryNotification(`Relay set "${finalTitle}" imported successfully!`);
     updateDrawerContent();
  } catch (error) {
    console.error('Error importing relay set:', error);
    showTemporaryNotification('Failed to import relay set');
  }
}

// Add this new function to handle deduplication
function deduplicateReplaceableEvents(events) {
  const eventMap = new Map();
  
  events.forEach(event => {
    // Get the 'd' tag value (identifier for replaceable events)
    const dTag = event.tags?.find(tag => tag[0] === 'd');
    const dValue = dTag ? dTag[1] : ''; // Empty string if no 'd' tag
    
    // Create unique key from pubkey and d tag value
    const key = `${event.pubkey}:${dValue}`;
    
    const existing = eventMap.get(key);
    if (!existing || event.created_at > existing.created_at) {
      // Keep this event if it's newer or first of its kind
      eventMap.set(key, event);
    }
  });
  
  return Array.from(eventMap.values());
}

function setupRelaySetLazyLoading(container, sets) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const skeletonCard = entry.target;
        const eventId = skeletonCard.dataset.eventId;
        const event = sets.find(e => e.id === eventId);
        
        if (event) {
          // Replace skeleton with real card
          const realCard = createRelaySetCard(event);
          container.replaceChild(realCard, skeletonCard);
          
          // Stop observing this element
          observer.unobserve(skeletonCard);
        }
      }
    });
  }, {
    rootMargin: '100px' // Start loading 100px before the element becomes visible
  });
  
  // Observe all skeleton cards
  const skeletonCards = container.querySelectorAll('.relay-set-skeleton');
  skeletonCards.forEach(card => observer.observe(card));
}

function createSkeletonRelaySetCard(event) {
  if (!event || !event.id) return document.createElement('div');

  // Helper function to get title from tags
  let getValueFromTags = (tags, key, defaultValue = "") => {
    let tag = tags?.find((t) => t[0] === key);
    return tag ? tag[1] : defaultValue;
  };

  // Extract websocket URLs from the event
  function extractWebSocketUrls(event) {
    let jsonString = JSON.stringify(event, null, 2);
    let wsUrlRegex = /(wss?:\/\/[^\s",\]]+)/g;
    let urls = [...jsonString.matchAll(wsUrlRegex)].map(match => match[0]);
    return [...new Set(urls)]; // Remove duplicates
  }

  let wsUrls = extractWebSocketUrls(event);
  let title = getValueFromTags(event.tags, "title");
  let description = getValueFromTags(event.tags, "description"); // Get description
  
  // Create the skeleton card element
  let card = document.createElement('div');
  card.className = 'relay-set-card relay-set-skeleton';
  card.dataset.eventId = event.id;
  
  // Create title section if title exists
  let titleHtml = '';
  if (title) {
    titleHtml = `<div class="relay-set-title">${escapeHtml(title)}</div>`;
  }
  
  // Create description section if description exists
  let descriptionHtml = '';
  if (description) {
    descriptionHtml = `<div class="relay-set-description">${escapeHtml(description)}</div>`;
  }
  
  // Skeleton state
  card.innerHTML = `
    ${titleHtml}
    ${descriptionHtml}
    <div class="relay-set-main">
      <div class="relay-set-info">
        <div class="publisher-section">
          <div class="skeleton-avatar"></div>
          <div class="publisher-details">
            <div class="skeleton-name"></div>
            <div class="skeleton-time"></div>
          </div>
        </div>
        <div class="relay-count">
          <span class="relay-count-number">${wsUrls.length}</span>
          <span class="relay-count-label">relays</span>
        </div>
      </div>
      <div class="relay-urls" data-all-urls='${JSON.stringify(wsUrls)}'>
        ${wsUrls.length > 3 ? `<div class="relay-item more-relays clickable-more" data-count="${wsUrls.length - 3}">Show ${wsUrls.length - 3} more relays</div>` : ''}
        ${wsUrls.slice(0, 3).map(url => `
          <div class="relay-item">
            <span class="relay-url">${escapeHtml(url)}</span>
            <button class="relay-action-btn" data-url="${escapeHtml(url)}" title="Visit relay">⍆</button>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="relay-set-footer">
      <button class="show-json-btn">Show JSON</button>
      <button class="import-relay-set-btn" data-event-id="${event.id}">Add to my local sets</button>
    </div>
    <div class="relay-set-json hidden">
      <pre class="json-content"></pre>
    </div>
  `;

  return card;
}

function createRelaySetCard(event) {
  if (!event || !event.id) return document.createElement('div');
  
  // Helper function to get title from tags
  let getValueFromTags = (tags, key, defaultValue = "") => {
    let tag = tags?.find((t) => t[0] === key);
    return tag ? tag[1] : defaultValue;
  };

  // Extract websocket URLs from the event
  function extractWebSocketUrls(event) {
    let jsonString = JSON.stringify(event, null, 2);
    let wsUrlRegex = /(wss?:\/\/[^\s",\]]+)/g;
    let urls = [...jsonString.matchAll(wsUrlRegex)].map(match => match[0]);
    return [...new Set(urls)]; // Remove duplicates
  }

  let wsUrls = extractWebSocketUrls(event);
  let title = getValueFromTags(event.tags, "title");
  let description = getValueFromTags(event.tags, "description"); // Get description
  
  // Create the card element
  let card = document.createElement('div');
  card.className = 'relay-set-card';
  card.dataset.eventId = event.id;
  
  // Create title section if title exists
  let titleHtml = '';
  if (title) {
    titleHtml = `<div class="relay-set-title">${escapeHtml(title)}</div>`;
  }

  // Create description section if description exists
  let descriptionHtml = '';
  if (description) {
    descriptionHtml = `<div class="relay-set-description">${escapeHtml(description)}</div>`;
  }

  // Convert pubkey to npub for consistency with your following page
  const npub = window.NostrTools.nip19.npubEncode(event.pubkey);
  
  // Real card with all the information
  card.innerHTML = `
    ${titleHtml}
    ${descriptionHtml}
    <div class="relay-set-main">
      <div class="relay-set-info">
        <div class="publisher-section clickable-publisher" data-npub="${npub}">
          <nostr-picture pubkey="${escapeHtml(event.pubkey)}"></nostr-picture>
          <div class="publisher-details">
            <nostr-name pubkey="${escapeHtml(event.pubkey)}"></nostr-name>
            <div class="publish-time">${getRelativeTime(event.created_at)}</div>
          </div>
        </div>
        <div class="relay-count">
          <span class="relay-count-number">${wsUrls.length}</span>
          <span class="relay-count-label">relays</span>
        </div>
      </div>
      <div class="relay-urls" data-all-urls='${JSON.stringify(wsUrls)}'>
        ${wsUrls.length > 3 ? `<div class="relay-item more-relays clickable-more" data-count="${wsUrls.length - 3}">Show ${wsUrls.length - 3} more relays</div>` : ''}
        ${wsUrls.slice(0, 3).map(url => `
          <div class="relay-item">
            <span class="relay-url">${escapeHtml(url)}</span>
            <button class="relay-action-btn" data-url="${escapeHtml(url)}" title="Visit relay">⍆</button>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="relay-set-footer">
      <button class="import-relay-set-btn" data-event-id="${event.id}">⚼ Add set to local</button>
      <button class="show-json-btn">Show JSON</button>
    </div>
    <div class="relay-set-json hidden">
      <pre class="json-content"></pre>
    </div>
  `;

  return card;
}

function renderJson(event, container) {
  // Convert event to formatted JSON string and display as plain text
  let jsonString = JSON.stringify(event, null, 2);
  container.textContent = jsonString;
}

