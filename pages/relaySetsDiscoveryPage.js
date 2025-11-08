function extractWebSocketUrls(event) {
  let jsonString = JSON.stringify(event, null, 2);
  let wsUrlRegex = /(wss?:\/\/[^\s",\]]+)/g;
  let urls = [...jsonString.matchAll(wsUrlRegex)].map(match => match[0]);
  return [...new Set(urls)];
}

async function relaySetsDiscoveryPageHandler() {
  mainContent.innerHTML = `
    <h1>Discovering Relay sets</h1>
    <div class="relays-discovery-page">
      <div class="discovery-tabs">
        <button class="tab-button active" data-tab="sets">Relay Sets</button>
        <button class="tab-button disabled" data-tab="ranking" id="ranking-tab-btn" disabled title="Available after discovery completes">Relay Ranking</button>
      </div>
      <div class="tab-content">
        <div class="tab-pane active" id="sets-tab">
          <div class="loading-indicator">
            <p>Searching for relay sets...</p>
          </div>
          <div class="videos-listview"></div>
        </div>
        <div class="tab-pane" id="ranking-tab">
          <div class="ranking-container">
            <div class="ranking-info">
              <p>Ranking based on how many relay sets mention each relay</p>
            </div>
            <div class="ranking-list">
              <div class="no-data-message">
                <p>Switch to this tab after relay sets have been discovered to see the ranking.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const rSets = document.querySelector('.videos-listview');
  let receivedEvents = new Map();
  let subscription = null;

  try {
    const relays = app.globalRelays || [];
    
    if (relays.length === 0) {
      mainContent.innerHTML = `
        <h1>No Relays Configured</h1>
        <p>Please configure relays in network settings first.</p>
      `;
      return;
    }

    if (!window.nostrPool) {
      window.nostrPool = new window.NostrTools.SimplePool();
    }

    const filter = { kinds: [30002], limit: 100 };
    console.log(`Subscribing to kind:30002 events on relays:`, relays);

    // Store receivedEvents on the container for access across tabs
    rSets._receivedEvents = receivedEvents;

    // Setup unified event delegation once
    setupUnifiedEventDelegation(mainContent, receivedEvents);

    let pendingCards = [];
    const BATCH_SIZE = 10;
    
    subscription = window.nostrPool.subscribeMany(
      relays,
      [filter],
      {
        onevent: (event) => {
          console.log('Received event:', event.id, 'from pubkey:', event.pubkey);
          const card = handleNewRelaySetEvent(event, receivedEvents, rSets);
          if (card) {
            console.log('Created card for event:', event.id);
            pendingCards.push(card);
            
            if (pendingCards.length >= BATCH_SIZE) {
              const fragment = document.createDocumentFragment();
              pendingCards.forEach(c => fragment.appendChild(c));
              rSets.appendChild(fragment);
              pendingCards = [];
              setupLazyCardRendering(rSets);
            }
          }
        },
        oneose: () => {
          console.log('EOSE received for relay sets');
          if (pendingCards.length > 0) {
            const fragment = document.createDocumentFragment();
            pendingCards.forEach(c => fragment.appendChild(c));
            rSets.appendChild(fragment);
            pendingCards = [];
            setupLazyCardRendering(rSets);
          }
          updateLoadingState(receivedEvents, rSets);
        }
      }
    );

    setTimeout(() => {
      if (subscription) {
        console.log('Closing subscription after timeout');
        subscription.close();
        subscription = null;
        updateLoadingState(receivedEvents, rSets);
        enableRankingTab();
      }
    }, 10000);

  } catch (error) {
    console.error("Error setting up relay sets discovery:", error);
    let errorDiv = document.createElement("div");
    errorDiv.innerHTML = safeHtml`
      <h1>Error</h1>
      <div class="loading-indicator">
        <p>Error discovering relay sets: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
    mainContent.replaceChildren(errorDiv);
  }

  setupDiscoveryTabs();
  app.currentRelaySetSubscription = subscription;
}

function enableRankingTab() {
  const rankingTabBtn = document.getElementById('ranking-tab-btn');
  if (rankingTabBtn) {
    rankingTabBtn.disabled = false;
    rankingTabBtn.classList.remove('disabled'); // Remove the CSS class
    rankingTabBtn.title = '';
  }
}

// UNIFIED event delegation for both tabs - fixes the double-firing issue
function setupUnifiedEventDelegation(pageContainer, receivedEventsMap) {
  if (pageContainer._unifiedDelegationSetUp) return;
  pageContainer._unifiedDelegationSetUp = true;
  
  pageContainer.addEventListener('click', (e) => {
    const target = e.target;
    
    // Handle "Add to relay set" buttons from ANY tab (unified handling)
    if (target.classList.contains('add-relay-to-set-btn') || 
        target.closest('.add-relay-to-set-btn')) {
      e.stopPropagation();
      const button = target.closest('.add-relay-to-set-btn');
      const url = button.dataset.url;
      console.log('Add relay to set:', url);
      showRelaySetSelector(url);
      return;
    }
    
    // Handle "Visit relay" buttons from ANY tab (unified handling)
    if (target.classList.contains('relay-action-btn') || 
        target.closest('.relay-action-btn')) {
      e.stopPropagation();
      const button = target.closest('.relay-action-btn');
      const url = button.dataset.url;
      console.log('WebSocket URL:', url);
      const cleanUrl = url.replace(/^(wss?:\/\/|https?:\/\/)/, '');
      window.location.hash = `#singlerelay/${cleanUrl}`;
      return;
    }

    // Rest of the handlers only apply to relay-set-card elements (Sets tab)
    const card = target.closest('.relay-set-card');
    if (!card) return;
    
    e.stopPropagation();
    const eventId = card.dataset.eventId;
    const rSets = document.querySelector('.videos-listview');
    const receivedEvents = rSets ? rSets._receivedEvents : null;
    if (!receivedEvents) return;
    
    const event = Array.from(receivedEvents.values()).find(s => s.id === eventId);
    if (!event) return;

    // Handle import button
    if (target.classList.contains('import-relay-set-btn') || 
        target.closest('.import-relay-set-btn')) {
      showImportPreviewModal(event);
      return;
    }

    // Handle show JSON button
    if (target.classList.contains('show-json-btn') || 
        target.closest('.show-json-btn')) {
      const button = target.closest('.show-json-btn');
      const jsonSection = card.querySelector('.relay-set-json');
      const jsonContainer = card.querySelector('.json-content');
      const isHidden = jsonSection.classList.contains('hidden');
      
      if (isHidden) {
        jsonSection.classList.remove('hidden');
        button.textContent = 'Hide JSON';
        renderJson(event, jsonContainer);
      } else {
        jsonSection.classList.add('hidden');
        button.textContent = 'Show JSON';
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

    // Handle more/collapse relays
    if (target.closest('.clickable-more')) {
      handleMoreRelaysClick(target.closest('.clickable-more'), card);
      return;
    }

    if (target.closest('.clickable-collapse')) {
      handleCollapseRelaysClick(target.closest('.clickable-collapse'), card);
      return;
    }
  });
}

function handleNewRelaySetEvent(event, receivedEvents, container) {
  const sanitizedEvent = sanitizeNostrEvent(event);
  if (!sanitizedEvent) {
    console.log('Event sanitization failed');
    return null;
  }
  
  const hasRelayTags = sanitizedEvent.tags?.some(tag => 
    tag[0] === 'relay' || tag[0] === 'r'
  );
  if (!hasRelayTags) {
    console.log('Event has no relay tags');
    return null;
  }

  const wsUrls = extractWebSocketUrls(sanitizedEvent);
  if (wsUrls.length === 0) {
    console.log('No WebSocket URLs found in event');
    return null;
  }

  const dTag = sanitizedEvent.tags?.find(tag => tag[0] === 'd');
  const dValue = dTag ? dTag[1] : '';
  const eventKey = `${sanitizedEvent.pubkey}:${dValue}`;

  const existingEvent = receivedEvents.get(eventKey);
  
  if (!existingEvent || sanitizedEvent.created_at > existingEvent.created_at) {
    receivedEvents.set(eventKey, sanitizedEvent);
    
    if (existingEvent) {
      const oldCard = container.querySelector(`[data-event-id="${existingEvent.id}"]`);
      if (oldCard) oldCard.remove();
    }

    const card = createRelaySetCard(sanitizedEvent);
    card._eventData = sanitizedEvent;
    card._isRendered = false;
    card.style.minHeight = '200px';
    
    container._receivedEvents = receivedEvents;
    console.log('Appended card to container, container child count:', container.children.length);
    return card;
  }
  
  console.log('Event already exists or is older');
  return null;
}

function updateLoadingState(receivedEvents, container) {
  const loadingIndicator = document.querySelector('.loading-indicator');
  
  if (receivedEvents.size === 0) {
    if (loadingIndicator) {
      loadingIndicator.innerHTML = `
        <p>No relay sets found. Try connecting to more relays or check your network connection.</p>
      `;
    }
  } else {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    
    const header = document.querySelector('h1');
    if (header && !document.querySelector('h2')) {
      header.insertAdjacentHTML('afterend', '<h2>Relay Sets (kind-30002)</h2>');
    }
  }
}

function cleanupRelaySetDiscovery() {
  if (app.currentRelaySetSubscription) {
    app.currentRelaySetSubscription.close();
    app.currentRelaySetSubscription = null;
    console.log('Relay set discovery subscription closed');
  }
  
  // Clean up delegation flag
  if (mainContent) {
    mainContent._unifiedDelegationSetUp = false;
  }
}

function handleMoreRelaysClick(moreRelaysBtn, card) {
  const relayUrlsContainer = card.querySelector('.relay-urls');
  const allUrls = JSON.parse(relayUrlsContainer.dataset.allUrls);
  
  relayUrlsContainer.innerHTML = `
    <div class="relay-item collapse-relays clickable-collapse">Show less</div>
  ` + allUrls.map(url => createRelayItemHtml(url)).join('');
}

function handleCollapseRelaysClick(collapseBtn, card) {
  const relayUrlsContainer = card.querySelector('.relay-urls');
  const allUrls = JSON.parse(relayUrlsContainer.dataset.allUrls);
  
  relayUrlsContainer.innerHTML = (allUrls.length > 3 ? `
    <div class="relay-item more-relays clickable-more" data-count="${allUrls.length - 3}">Show ${allUrls.length - 3} more relays</div>
  ` : '') + allUrls.slice(0, 3).map(url => createRelayItemHtml(url)).join('');
}

// Helper function to avoid HTML duplication
function createRelayItemHtml(url) {
  return `
    <div class="relay-item">
      <span class="relay-url">${escapeHtml(url)}</span>
      <button class="add-relay-to-set-btn" data-url="${escapeHtml(url)}" title="Add to relay set">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
      <button class="relay-action-btn" data-url="${escapeHtml(url)}" title="Visit relay">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
        </svg>
      </button>
    </div>
  `;
}

function showImportPreviewModal(event) {
  const titleTag = event.tags.find(tag => tag[0] === 'title');
  const originalTitle = titleTag ? titleTag[1] : 'Untitled Set';
  const relays = event.tags.filter(tag => tag[0] === 'relay');
  const relayList = relays.map(relay => relay[1]).join('\n');
  
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
    const newRelaySet = {
      kind: 30002,
      tags: [
        ['d', crypto.randomUUID().replace(/-/g, '').slice(0, 15)],
        ['title', finalTitle],
        ...event.tags.filter(tag => tag[0] === 'relay')
      ]
    };
    
    app.relayLists[finalTitle] = newRelaySet;
    saveRelayLists();
    
    showTemporaryNotification(`Relay set "${finalTitle}" imported successfully!`);
    updateDrawerContent();
  } catch (error) {
    console.error('Error importing relay set:', error);
    showTemporaryNotification('Failed to import relay set');
  }
}

function createRelaySetCard(event) {
  if (!event || !event.id) {
    console.log('Invalid event for card creation');
    return document.createElement('div');
  }
  
  let card = document.createElement('div');
  card.className = 'relay-set-card';
  card.dataset.eventId = event.id;
  
  console.log('Created card element for event:', event.id);
  return card;
}

function setupLazyCardRendering(container) {
  if (container._lazyObserver) {
    container._lazyObserver.disconnect();
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const card = entry.target;
        if (!card._isRendered && card._eventData) {
          renderCardContent(card, card._eventData);
          card._isRendered = true;
          observer.unobserve(card);
        }
      }
    });
  }, {
    rootMargin: '100px'
  });
  
  container._lazyObserver = observer;
  
  container.querySelectorAll('.relay-set-card:not([data-rendered="true"])').forEach(card => {
    if (!card._isRendered) {
      observer.observe(card);
    }
  });
}

function renderCardContent(card, event) {
  let getValueFromTags = (tags, key, defaultValue = "") => {
    let tag = tags?.find((t) => t[0] === key);
    return tag ? tag[1] : defaultValue;
  };

  let wsUrls = extractWebSocketUrls(event);
  let title = getValueFromTags(event.tags, "title");
  let description = getValueFromTags(event.tags, "description");
  
  let titleHtml = title ? `<div class="relay-set-title">${escapeHtml(title)}</div>` : '';
  let descriptionHtml = description ? `<div class="relay-set-description">${escapeHtml(description)}</div>` : '';

  const npub = window.NostrTools.nip19.npubEncode(event.pubkey);
  
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
        ${wsUrls.slice(0, 3).map(url => createRelayItemHtml(url)).join('')}
      </div>
    </div>
    <div class="relay-set-footer">
      <button class="import-relay-set-btn" data-event-id="${event.id}">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
        </svg>
        Add set to local
      </button>
      <button class="show-json-btn">Show JSON</button>
    </div>
    <div class="relay-set-json hidden">
      <pre class="json-content"></pre>
    </div>
  `;
  
  card.style.minHeight = '';
  card.dataset.rendered = "true";
}

function renderJson(event, container) {
  let jsonString = JSON.stringify(event, null, 2);
  container.textContent = jsonString;
}

// Tabs & ranking
function setupDiscoveryTabs() {
  const tabButtons = mainContent.querySelectorAll('.tab-button');
  const tabPanes = mainContent.querySelectorAll('.tab-pane');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.id === 'ranking-tab-btn' && button.disabled) {
        return;
      }
      
      const targetTab = button.dataset.tab;
      
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      tabPanes.forEach(pane => pane.classList.remove('active'));
      const targetPane = mainContent.querySelector(`#${targetTab}-tab`);
      if (targetPane) {
        targetPane.classList.add('active');
      }
      
      if (targetTab === 'ranking') {
        const rankingContainer = mainContent.querySelector('.ranking-list');
        showRelayRanking(rankingContainer);
      }
      
      if (targetTab === 'sets') {
        const rSets = document.querySelector('.videos-listview');
        if (rSets) {
          setupLazyCardRendering(rSets);
        }
      }
    });
  });
}

function showRelayRanking(rankingContainer) {
  const rSets = document.querySelector('.videos-listview');
  const receivedEvents = rSets ? rSets._receivedEvents : null;
  
  // Disconnect previous observer if exists
  if (rankingContainer._relayInfoObserver) {
    rankingContainer._relayInfoObserver.disconnect();
  }
  
  if (!receivedEvents || receivedEvents.size === 0) {
    rankingContainer.innerHTML = `
      <div class="no-data-message">
        <p>No relay sets data available yet. Relay ranking will appear here once relay sets are discovered.</p>
      </div>
    `;
    return;
  }

  const relayMentions = new Map();
  
  receivedEvents.forEach(event => {
    const relayUrls = extractWebSocketUrls(event);
    relayUrls.forEach(url => {
      const cleanUrl = url.toLowerCase().trim();
      const currentCount = relayMentions.get(cleanUrl) || 0;
      relayMentions.set(cleanUrl, currentCount + 1);
    });
  });

  const rankedRelays = Array.from(relayMentions.entries())
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count);

  renderRelayRanking(rankedRelays, rankingContainer, receivedEvents.size);
}

function renderRelayRanking(rankedRelays, container, totalSets) {
  if (rankedRelays.length === 0) {
    container.innerHTML = `
      <div class="no-data-message">
        <p>No relays found in the discovered relay sets.</p>
      </div>
    `;
    return;
  }
  
  const rankingHtml = rankedRelays.map((relay, index) => {
    const rank = index + 1;
    const percentage = totalSets > 0 ? Math.round((relay.count / totalSets) * 100) : 0;
    
    return `
      <div class="ranking-item" data-rank="${rank}" data-relay-url="${escapeHtml(relay.url)}">
        <div class="rank-badge">${rank}</div>
        <div class="ranking-details">
          <div class="relay-info-header-compact">
            <div class="relay-icon-placeholder"></div>
            <div class="relay-text-info">
              <div class="relay-url-ranking">${escapeHtml(relay.url)}</div>
              <div class="relay-name-description"></div>
            </div>
          </div>
          <div class="mention-stats">
            Mentioned in ${relay.count} of ${totalSets} sets (${percentage}%)
          </div>
        </div>
        <div class="ranking-actions">
          <button class="add-relay-to-set-btn" data-url="${escapeHtml(relay.url)}" title="Add to relay set">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button class="relay-action-btn" data-url="${escapeHtml(relay.url)}" title="Visit relay">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = rankingHtml;
  
  // Set up lazy loading for relay info
  setupLazyRelayInfoLoading(container);
}


async function fetchRelayInfo(relayUrl) {
  try {
    const httpUrl = relayUrl
      .replace(/^wss:\/\//, "https://")
      .replace(/^ws:\/\//, "http://");
    
    const response = await fetch(httpUrl, {
      headers: {
        Accept: "application/nostr+json",
      },
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log("Could not fetch relay info for:", relayUrl, error);
  }
  return null;
}

function setupLazyRelayInfoLoading(container) {
  const observer = new IntersectionObserver(async (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const rankingItem = entry.target;
        
        // Check if already loaded
        if (rankingItem.dataset.infoLoaded === 'true') {
          observer.unobserve(rankingItem);
          continue;
        }
        
        const relayUrl = rankingItem.dataset.relayUrl;
        const iconPlaceholder = rankingItem.querySelector('.relay-icon-placeholder');
        const nameDescriptionDiv = rankingItem.querySelector('.relay-name-description');
        
        // Mark as loading
        rankingItem.dataset.infoLoaded = 'loading';
        
        // Fetch relay info
        const relayInfo = await fetchRelayInfo(relayUrl);
        
        if (relayInfo) {
          // Handle icon with proper fallback logic (similar to single relay page)
          const httpUrl = relayUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
          
          // Create icon element
          const icon = document.createElement('img');
          icon.className = 'relay-icon';
          icon.alt = 'Relay icon';
          
          if (relayInfo.icon) {
            // Try icon from relay document first
            icon.onload = () => {
              iconPlaceholder.replaceWith(icon);
            };
            icon.onerror = () => {
              // If relay doc icon fails, fallback to favicon
              const faviconUrl = `${httpUrl}/favicon.ico`;
              const faviconImg = new Image();
              faviconImg.onload = () => {
                icon.src = faviconUrl;
                iconPlaceholder.replaceWith(icon);
              };
              faviconImg.onerror = () => {
                // Both failed, remove placeholder
                iconPlaceholder.remove();
              };
              faviconImg.src = faviconUrl;
            };
            icon.src = relayInfo.icon;
          } else {
            // No icon in relay doc, try favicon directly
            const faviconUrl = `${httpUrl}/favicon.ico`;
            const faviconImg = new Image();
            faviconImg.onload = () => {
              icon.src = faviconUrl;
              iconPlaceholder.replaceWith(icon);
            };
            faviconImg.onerror = () => {
              // Favicon failed, remove placeholder
              iconPlaceholder.remove();
            };
            faviconImg.src = faviconUrl;
          }
          
          // Add name and description
          const nameSpan = document.createElement('div');
          nameSpan.className = 'relay-name-small';
          nameSpan.textContent = relayInfo.name || '';
          
          const descSpan = document.createElement('div');
          descSpan.className = 'relay-description-small';
          descSpan.textContent = relayInfo.description || '';
          
          if (relayInfo.name || relayInfo.description) {
            nameDescriptionDiv.appendChild(nameSpan);
            nameDescriptionDiv.appendChild(descSpan);
          }
        } else {
          // No relay info available, still try favicon as last resort
          const httpUrl = relayUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
          const faviconUrl = `${httpUrl}/favicon.ico`;
          
          const icon = document.createElement('img');
          icon.className = 'relay-icon';
          icon.alt = 'Relay icon';
          
          const faviconImg = new Image();
          faviconImg.onload = () => {
            icon.src = faviconUrl;
            iconPlaceholder.replaceWith(icon);
          };
          faviconImg.onerror = () => {
            // No info and no favicon, remove placeholder
            iconPlaceholder.remove();
          };
          faviconImg.src = faviconUrl;
        }
        
        // Mark as loaded
        rankingItem.dataset.infoLoaded = 'true';
        observer.unobserve(rankingItem);
      }
    }
  }, {
    rootMargin: '50px'
  });
  
  // Observe all ranking items
  container.querySelectorAll('.ranking-item').forEach(item => {
    observer.observe(item);
  });
  
  // Store observer for cleanup
  container._relayInfoObserver = observer;
}