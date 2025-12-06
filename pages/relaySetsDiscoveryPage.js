function extractWebSocketUrls(event) {
  let jsonString = JSON.stringify(event, null, 2);
  let wsUrlRegex = /(wss?:\/\/[^\s",\]]+)/g;
  let urls = [...jsonString.matchAll(wsUrlRegex)].map(match => match[0]);
  return [...new Set(urls)];
}

async function relaySetsDiscoveryPageHandler() {
  // Clean up any existing subscriptions first
  cleanupRelaySetDiscovery();
  
  // Parse URL parameters for tab selection
  const currentHash = window.location.hash;
  const urlParams = new URLSearchParams(currentHash.split('?')[1] || '');
  const pubkeySource = urlParams.get('source') || 'latest'; // 'latest', 'local', or 'friends'

  mainContent.innerHTML = `
    <h1>Discovering Relay sets</h1>
    <div class="relays-discovery-page">
      <div class="pubkey-source-tabs">
        <button class="source-tab-button ${pubkeySource === 'latest' ? 'active' : ''}" data-source="latest">
          Latest Sets
        </button>
        <button class="source-tab-button ${pubkeySource === 'local' ? 'active' : ''}" data-source="local">
          Subscriptions
        </button>
        <button class="source-tab-button ${pubkeySource === 'friends' ? 'active' : ''}" data-source="friends">
          Friends (kind-3)
        </button>
      </div>
      
      <div class="discovery-tabs">
        <button class="tab-button active" data-tab="sets">Relay Sets</button>
        <button class="tab-button disabled" data-tab="ranking" id="ranking-tab-btn" disabled title="Available after discovery completes">Working...</button>
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

  // Setup pubkey source tab event handlers
  const sourceTabButtons = document.querySelectorAll('.source-tab-button');
  sourceTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const newSource = button.dataset.source;
      const baseHash = '#relaysetsdiscover';
      const params = new URLSearchParams();
      if (newSource !== 'latest') params.set('source', newSource);
      const paramString = params.toString();
      const newUrl = paramString ? `${baseHash}/params?${paramString}` : baseHash;
      window.location.hash = newUrl;
    });
  });

  // Get the appropriate pubkeys based on source
  let followedPubkeys = null;
  let sourceLabel = 'Latest';

  if (pubkeySource === 'local') {
    followedPubkeys = getFollowedPubkeys();
    if (!followedPubkeys || followedPubkeys.length === 0) {
      showTabContentMessage('No Local Subscriptions', 'You haven\'t subscribed to any users locally. Browse around and click the follow button on users to add them to your subscriptions.');
      return;
    }
    sourceLabel = 'Subscriptions';
  } else if (pubkeySource === 'friends') {
    // Get kind-3 pubkeys with retry logic
    let retries = 0;
    const maxRetries = 3;
    
    while (!app.myPk && retries < maxRetries) {
      retries++;
      console.log(`app.myPk not available, retrying in 2 seconds... (attempt ${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (!app.myPk) {
      showTabContentMessage('Login Required', 'You need to be logged in to view your friends\' relay sets. Please <a href="#login">log in</a> first.');
      return;
    }

    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.innerHTML = '<p>Loading kind-3 event...</p>';
    }
    
    const kindThreeEvents = await NostrClient.getEvents({
      kinds: [3],
      authors: [app.myPk],
    });
    
    if (!kindThreeEvents || kindThreeEvents.length === 0) {
      showTabContentMessage('No Kind-3 Following List', 'You don\'t have a kind-3 following list published. Visit the <a href="#kind1follows">Friends</a> page to see more details.');
      return;
    }
    
    const latestEvent = kindThreeEvents.reduce((latest, current) =>
      current.created_at > latest.created_at ? current : latest
    );
    
    followedPubkeys = latestEvent.tags
      .filter(tag => tag[0] === 'p' && tag[1])
      .map(tag => tag[1]);
    
    if (!followedPubkeys || followedPubkeys.length === 0) {
      showTabContentMessage('No Friends Followed', 'Your kind-3 following list exists but doesn\'t contain any followed users. Visit the <a href="#kind1follows">Friends</a> page to add some friends.');
      return;
    }
    
    sourceLabel = 'Friends (kind-3)';
  }

  const rSets = document.querySelector('.videos-listview');
  let receivedEvents = new Map();
  let subscription = null;
  let timeoutId = null;

  try {
    // Start with globalRelays as the base for all modes
    let relaysToUse = new Set(app.globalRelays || []);
    
    console.log(`Starting with ${relaysToUse.size} global relays`);
    
    // For all modes, add pubkey-specific relays if we have pubkeys
    if (followedPubkeys && followedPubkeys.length > 0) {
      const MAX_PUBKEYS_FOR_RELAY_SEARCH = 50;
      const pubkeysForRelaySearch = followedPubkeys.length > MAX_PUBKEYS_FOR_RELAY_SEARCH
        ? followedPubkeys.slice(0, MAX_PUBKEYS_FOR_RELAY_SEARCH)
        : followedPubkeys;
      
      console.log(`Discovering relays for ${pubkeysForRelaySearch.length} pubkeys...`);
      
      for (const pubkey of pubkeysForRelaySearch) {
        try {
          const pubkeyRelays = await getExtendedRelaysForProfile(pubkey);
          if (pubkeyRelays && pubkeyRelays.length > 0) {
            pubkeyRelays.forEach(relay => {
              if (relay && (relay.startsWith('wss://') || relay.startsWith('ws://'))) {
                relaysToUse.add(relay);
              }
            });
          }
        } catch (error) {
          console.warn(`Failed to get relays for pubkey ${pubkey.slice(0, 8)}...`, error);
        }
      }
      
      console.log(`Total relays after adding user relays: ${relaysToUse.size}`);
    }
    
    // Convert Set back to Array
    relaysToUse = Array.from(relaysToUse);
    
    if (relaysToUse.length === 0) {
      showTabContentMessage('No Relays Configured', 'Please configure relays in network settings first.');
      return;
    }

    console.log(`Using ${relaysToUse.length} total relays for ${sourceLabel} mode`);

    if (!window.nostrPool) {
      window.nostrPool = new window.NostrTools.SimplePool();
    }

    // Build the filter
    const filter = { kinds: [30002], limit: 100 };
    
    // Add authors filter for local/friends mode
    if (followedPubkeys) {
      filter.authors = followedPubkeys;
      console.log(`Subscribing to kind:30002 events from ${followedPubkeys.length} followed pubkeys on ${relaysToUse.length} relays`);
    } else {
      console.log(`Subscribing to kind:30002 events on ${relaysToUse.length} relays`);
    }

    // Store receivedEvents on the container for access across tabs
    rSets._receivedEvents = receivedEvents;

    // Setup unified event delegation once
    setupUnifiedEventDelegationForDiscoveryPage(mainContent, receivedEvents);

    let pendingCards = [];
    const BATCH_SIZE = 10;
    
    subscription = window.nostrPool.subscribeMany(
      relaysToUse,
      filter,
      {
        onevent: (event) => {
          const card = handleNewRelaySetEvent(event, receivedEvents, rSets);
          if (card) {
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
          updateLoadingState(receivedEvents, rSets, sourceLabel, followedPubkeys?.length);
        }
      }
    );

    // Store subscription for cleanup
    app.currentRelaySetSubscription = subscription;

    timeoutId = setTimeout(() => {
      if (subscription) {
        console.log('Closing subscription after timeout');
        subscription.close();
        subscription = null;
        app.currentRelaySetSubscription = null;
        updateLoadingState(receivedEvents, rSets, sourceLabel, followedPubkeys?.length);
        enableRankingTab();
      }
    }, 10000);

    // Store timeout for cleanup
    app.currentRelaySetTimeout = timeoutId;

  } catch (error) {
    console.error("Error setting up relay sets discovery:", error);
    showTabContentMessage('Error', `Error discovering relay sets: ${formatErrorForDisplay(error)}`);
  }

  setupDiscoveryTabs();
}

// New helper function to show messages only in tab-content
function showTabContentMessage(title, message) {
  const tabContent = document.querySelector('.tab-content');
  if (!tabContent) return;
  
  tabContent.innerHTML = `
    <div class="tab-pane active" id="sets-tab">
      <div class="loading-indicator">
        <h2>${escapeHtml(title)}</h2>
        <p>${message}</p>
      </div>
    </div>
  `;
}


function enableRankingTab() {
  const rankingTabBtn = document.getElementById('ranking-tab-btn');
  if (rankingTabBtn) {
    rankingTabBtn.disabled = false;
    rankingTabBtn.classList.remove('disabled'); // Remove the CSS class
    rankingTabBtn.title = '';
    rankingTabBtn.textContent = 'Relay Ranking';
  }
}

function setupUnifiedEventDelegationForDiscoveryPage(pageContainer, receivedEventsMap) {
  // Remove existing listener if it exists
  if (pageContainer._discoveryClickHandler) {
    pageContainer.removeEventListener('click', pageContainer._discoveryClickHandler);
  }
  
  // Create the click handler function
  const clickHandler = (e) => {
    const target = e.target;
    
    // Helper function to get button text from SVG structure
    const getButtonText = (target) => {
      const button = target.closest('button');
      if (!button) return null;
      const span = button.querySelector('span');
      return span ? span.textContent.trim() : null;
    };
    
    const buttonText = getButtonText(target);
    
    // Handle "Add to Set" button specifically in ranking tab
    if (target.classList.contains('ranking-add-to-set-btn') || 
        target.closest('.ranking-add-to-set-btn')) {
      e.stopPropagation();
      e.preventDefault();
      const relayItem = target.closest('.relay-item');
      const relayUrl = relayItem.dataset.relay;
      showRelaySetSelector(relayUrl);
      return;
    }
    
    // Handle Check Status button
    if (buttonText === "Check Status") {
      e.stopPropagation();
      e.preventDefault();
      const relayItem = target.closest(".relay-item");
      const relayUrl = relayItem.dataset.relay;
      const index = parseInt(relayItem.dataset.index);
      
      // Get the correct status ID for ranking items
      const statusId = `status-ranking-${index}`;
      const statusElement = document.getElementById(statusId);
      if (statusElement) {
        checkRelayStatusForRanking(relayUrl, statusId, true);
      }
      return;
    }
    
    // Handle Relay Info button
    if (buttonText === "Relay Info" || buttonText === "Info") {
      e.preventDefault(); 
      e.stopPropagation();
      const relayUrl = target.closest(".relay-item").dataset.relay;
      getRelayInfo(relayUrl);
      return;
    }
    
    // Handle Visit button
/*   if (buttonText === "Visit") {
      e.stopPropagation();
      e.preventDefault();
      let relayUrl = target.closest(".relay-item").dataset.relay;
      if (relayUrl.startsWith('wss://')) {
        relayUrl = relayUrl.slice(6);
      } else if (relayUrl.startsWith('ws://')) {
        relayUrl = relayUrl.slice(5);
      }
      window.location.hash = `#singlerelay/${relayUrl}`;
      return;
    } */
    
    // Handle Block/Unblock button
    if (buttonText === "Block" || buttonText === "Unblock") {
      e.stopPropagation();
      e.preventDefault();
      const relayItem = target.closest(".relay-item");
      const relayUrl = relayItem.dataset.relay;
      const button = target.closest('button');
      const buttonSpan = button.querySelector('span');
      
      if (buttonText === "Block") {
        if (confirm(`Block all future connections to:\n${extractDomainName(relayUrl)}?`)) {
          window.WebSocketManager.blockURL(relayUrl);
          
          button.style.backgroundColor = '#ff00005c';
          button.style.borderColor = 'red';
          buttonSpan.textContent = 'Unblock';
          
          const originalText = buttonSpan.textContent;
          buttonSpan.textContent = 'Blocked!';
          setTimeout(() => {
            buttonSpan.textContent = 'Unblock';
          }, 1000);
        }
      } else if (buttonText === "Unblock") {
        if (confirm(`Unblock connections to:\n${extractDomainName(relayUrl)}?`)) {
          window.WebSocketManager.unblockURL(relayUrl);
          
          button.style.backgroundColor = '';
          button.style.borderColor = '';
          buttonSpan.textContent = 'Block';
          
          const originalText = buttonSpan.textContent;
          buttonSpan.textContent = 'Unblocked!';
          setTimeout(() => {
            buttonSpan.textContent = 'Block';
          }, 1000);
        }
      }
      return;
    }
    
    // Handle "Add to Set" button in feed tab (relay-item level)
    if (target.classList.contains('relay-add-btn') || 
        target.closest('.relay-add-btn')) {
      e.stopPropagation();
      e.preventDefault();
      const button = target.closest('.relay-add-btn');
      const relayUrl = button.dataset.url;
      showRelaySetSelector(relayUrl);
      return;
    }
    
    // Rest of the handlers for relay-set-card elements...
    const card = target.closest('.relay-set-card');
    if (!card) return;
    
    e.stopPropagation();
    e.preventDefault();
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
  };
  
  // Store the handler reference and add it
  pageContainer._discoveryClickHandler = clickHandler;
  pageContainer.addEventListener('click', clickHandler);
  
  console.log('✅ Unified event delegation set up for discovery page');
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
  //  console.log('Event has no relay tags');
    return null;
  }

  const wsUrls = extractWebSocketUrls(sanitizedEvent);
  if (wsUrls.length === 0) {
  //  console.log('No WebSocket URLs found in event');
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
  //  console.log('Appended card to container, container child count:', container.children.length);
    return card;
  }
  
//  console.log('Event already exists or is older');
  return null;
}

function updateLoadingState(receivedEvents, container, sourceLabel = 'Latest', pubkeyCount = null) {
  const loadingIndicator = document.querySelector('.loading-indicator');
  
  if (receivedEvents.size === 0) {
    if (loadingIndicator) {
      const message = pubkeyCount 
        ? `No relay sets found from ${pubkeyCount} followed users. They may not have published any relay sets yet.`
        : 'No relay sets found. Try connecting to more relays or check your network connection.';
      loadingIndicator.innerHTML = `<p>${message}</p>`;
    }
  } else {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    
    const header = document.querySelector('h1');
    if (header && !document.querySelector('h2')) {
      const subtitle = pubkeyCount 
        ? `Relay Sets from ${sourceLabel} (${pubkeyCount} users)`
        : `Relay Sets from ${sourceLabel}`;
      header.insertAdjacentHTML('afterend', `<h2>${subtitle}</h2>`);
    }
  }
}

function cleanupRelaySetDiscovery() {
  console.log('🧹 Cleaning up relay set discovery page...');
  
  // Close any active subscription
  if (app.currentRelaySetSubscription) {
    try {
      app.currentRelaySetSubscription.close();
      console.log('✅ Relay set subscription closed');
    } catch (error) {
      console.warn('⚠️ Error closing relay set subscription:', error);
    }
    app.currentRelaySetSubscription = null;
  }
  
  // Clear any pending timeout
  if (app.currentRelaySetTimeout) {
    clearTimeout(app.currentRelaySetTimeout);
    console.log('✅ Relay set timeout cleared');
    app.currentRelaySetTimeout = null;
  }
  
  // Clean up event delegation
  if (mainContent && mainContent._discoveryClickHandler) {
    mainContent.removeEventListener('click', mainContent._discoveryClickHandler);
    mainContent._discoveryClickHandler = null;
    console.log('✅ Event delegation removed');
  }
  
  // Clean up delegation flag (legacy)
  if (mainContent) {
    mainContent._unifiedDelegationSetUp = false;
  }
  
  // Clean up any lazy observers
  const container = document.querySelector('.videos-listview');
  if (container && container._lazyObserver) {
    container._lazyObserver.disconnect();
    container._lazyObserver = null;
    console.log('✅ Lazy observer disconnected');
  }
  
  const rankingContainer = document.querySelector('.ranking-list');
  if (rankingContainer && rankingContainer._relayInfoObserver) {
    rankingContainer._relayInfoObserver.disconnect();
    rankingContainer._relayInfoObserver = null;
    console.log('✅ Ranking observer disconnected');
  }
  
  console.log('✅ Relay set discovery cleanup complete');
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

// Updated createRelayItemHtml for feed tab - now uses relay-identity
function createRelayItemHtml(url) {
  const { html: identityHtml, iconId } = createRelayIdentityHTML(url);
  
  // Store iconId for lazy loading
  const itemHtml = `
    <div class="relay-item" data-relay="${escapeHtml(url)}" data-icon-id="${iconId}">
      <div class="relay-header">
        ${identityHtml}
      </div>
      <div class="relay-actions">
        <button class="btn btn-primary relay-add-btn" data-url="${escapeHtml(url)}" title="Add to relay set">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Add to Set</span>
        </button>
      <!--  <button class="btn btn-secondary relay-visit-btn" data-url="${escapeHtml(url)}" title="Visit relay">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 13.5V9M15 9H10.5M15 9L9.00019 14.9999M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
          </svg>
          <span>Visit</span>
        </button> -->
      </div>
    </div>
  `;
  
  // Queue icon loading (will be done when visible)
  setTimeout(() => loadRelayIcon(url, iconId), 0);
  
  return itemHtml;
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
  
//  console.log('Created card element for event:', event.id);
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
            // Use your existing normalization function
            const cleanUrl = normalizeRelayUrl(url);
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
    
    const mentionStats = `
      <div class="mention-stats" style="margin-top: 8px; padding: 8px; background: var(--background-secondary); border-radius: 4px;">
        <strong>Rank #${rank}</strong> • Mentioned in ${relay.count} of ${totalSets} sets (${percentage}%)
      </div>
    `;
    
    // Create full relay item exactly like network page
    const relayItemHTML = createRankingRelayItemHTML(relay.url, index, null, mentionStats);
    
    return `
      <div class="ranking-item-wrapper" data-rank="${rank}" data-relay-url="${escapeHtml(relay.url)}" data-index="${index}">
        ${relayItemHTML}
      </div>
    `;
  }).join('');

  container.innerHTML = rankingHtml;
  
  // Set up lazy loading for relay info
  setupLazyRelayInfoLoadingForRanking(container);
}
function setupLazyRelayInfoLoadingForRanking(container) {
  const observer = new IntersectionObserver(async (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const rankingWrapper = entry.target;
        
        if (rankingWrapper.dataset.infoLoaded === 'true') {
          observer.unobserve(rankingWrapper);
          continue;
        }
        
        const relayUrl = rankingWrapper.dataset.relayUrl;
        const index = rankingWrapper.dataset.index;
        
        rankingWrapper.dataset.infoLoaded = 'loading';
        
        // Fetch relay info
        const relayInfo = await fetchRelayInfo(relayUrl);
        
        if (relayInfo) {
          // Get the mention stats HTML before replacing
          const mentionStats = rankingWrapper.querySelector('.mention-stats')?.outerHTML || '';
          
          // Re-create the relay item with full info
          const newHTML = createRankingRelayItemHTML(relayUrl, index, relayInfo, mentionStats);
          const relayItem = rankingWrapper.querySelector('.relay-item');
          relayItem.outerHTML = newHTML;
        }
        
        // Load icon (works for both cases)
        const iconId = `icon-ranking-${index}`;
        loadRelayIcon(relayUrl, iconId);
        
        rankingWrapper.dataset.infoLoaded = 'true';
        observer.unobserve(rankingWrapper);
      }
    }
  }, {
    rootMargin: '50px'
  });
  
  container.querySelectorAll('.ranking-item-wrapper').forEach(item => {
    observer.observe(item);
  });
  
  container._relayInfoObserver = observer;
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








///////////////
// global helpers
// Shared function to create relay identity element (icon + name + url)
function createRelayIdentityHTML(relayUrl, relayDoc = null) {
  const domain = extractDomainName(relayUrl);
  const name = relayDoc?.name || domain;
  const uniqueId = `icon-${crypto.randomUUID().slice(0, 8)}`;
  
  return {
    html: `
      <div class="relay-identity">
        <img id="${uniqueId}" class="relay-icon" alt="" style="display: none;">
        <div class="relay-text-info">
          <h3 class="relay-name">${escapeHtml(name)}</h3>
          <div class="relay-url">${escapeHtml(relayUrl)}</div>
        </div>
      </div>
    `,
    iconId: uniqueId
  };
}

// Shared function to create full relay item (like in network page)
function createDiscoveryRelayItemHTML(relayUrl, relayDoc = null, options = {}) {
  const domain = extractDomainName(relayUrl);
  const name = relayDoc?.name || domain;
  const description = relayDoc?.description || "";
  const uniqueId = `icon-${crypto.randomUUID().slice(0, 8)}`;
  
  const supportedNips = relayDoc?.supported_nips?.length || 0;
  const software = relayDoc?.software ? extractSoftwareName(relayDoc.software) : "";
  const authRequired = relayDoc?.limitation?.auth_required || false;
  const paymentRequired = relayDoc?.limitation?.payment_required || false;
  
  // Optional extra content (like mention stats for ranking)
  const extraContent = options.extraContent || '';
  
  return {
    html: `
      <div class="relay-item" data-relay="${escapeHtml(relayUrl)}">
        <div class="relay-header">
          <div class="relay-main-info">
            <div class="relay-identity">
              <img id="${uniqueId}" class="relay-icon" alt="" style="display: none;">
              <div class="relay-text-info">
                <h3 class="relay-name">${escapeHtml(name)}</h3>
                <div class="relay-url">${escapeHtml(relayUrl)}</div>
              </div>
            </div>
          </div>
          
          ${description ? `<div class="relay-description">${escapeHtml(truncateText(description, 120))}</div>` : ''}
          
          ${(supportedNips > 0 || software || authRequired || paymentRequired) ? `
            <div class="relay-badges">
              ${supportedNips > 0 ? `<span class="badge badge-info">NIPs: ${supportedNips}</span>` : ''}
              ${software ? `<span class="badge badge-info">${software}</span>` : ''}
              ${authRequired ? '<span class="badge badge-warning">Auth Required</span>' : ''}
              ${paymentRequired ? '<span class="badge badge-warning">Payment Required</span>' : ''}
            </div>
          ` : ''}
          
          ${extraContent}
        </div>
        
        <div class="relay-actions">
         <!-- <button class="btn btn-secondary relay-visit-btn" data-url="${escapeHtml(relayUrl)}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 13.5V9M15 9H10.5M15 9L9.00019 14.9999M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
            </svg>
            <span>Visit</span>
          </button> -->
          <button class="btn btn-primary relay-add-btn" data-url="${escapeHtml(relayUrl)}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Add to Set</span>
          </button>
        </div>
      </div>
    `,
    iconId: uniqueId
  };
}

// Shared function to load relay icon
async function loadRelayIcon(relayUrl, iconId) {
  const iconElement = document.getElementById(iconId);
  if (!iconElement) return;
  
  try {
    const httpUrl = relayUrl
      .replace("wss://", "https://")
      .replace("ws://", "http://");
    
    const response = await fetch(httpUrl, {
      headers: { Accept: "application/nostr+json" },
    });
    
    if (response.ok) {
      const relayDoc = await response.json();
      if (relayDoc.icon) {
        iconElement.src = relayDoc.icon;
        iconElement.style.display = "inline";
        return;
      }
    }
    
    // Fallback to favicon
    const faviconUrl = `${httpUrl}/favicon.ico`;
    const img = new Image();
    img.onload = () => {
      iconElement.src = faviconUrl;
      iconElement.style.display = "inline";
    };
    img.onerror = () => {
      iconElement.style.display = "none";
    };
    img.src = faviconUrl;
  } catch (error) {
    iconElement.style.display = "none";
  }
}

function createRankingRelayItemHTML(relayUrl, index, relayDoc = null, extraContent = '') {
  const domain = extractDomainName(relayUrl);
  const name = relayDoc?.name || domain;
  const description = relayDoc?.description || "";
  const uniqueIconId = `icon-ranking-${index}`;
  const uniqueStatusId = `status-ranking-${index}`;
  
  // Check if this relay is blocked
  const isBlocked = window.WebSocketManager && window.WebSocketManager.isURLBlocked(relayUrl);
  
  const supportedNips = relayDoc?.supported_nips?.length || 0;
  const software = relayDoc?.software ? extractSoftwareName(relayDoc.software) : "";
  const authRequired = relayDoc?.limitation?.auth_required || false;
  const paymentRequired = relayDoc?.limitation?.payment_required || false;
  
  return `
    <div class="relay-item" data-relay="${relayUrl}" data-index="${index}">
      <div class="relay-header">
      ${extraContent}
        <div class="relay-main-info">
          <div class="relay-identity">
            <img id="${uniqueIconId}" class="relay-icon" alt="" style="display: none;">
            <div class="relay-text-info">
              <h3 class="relay-name">${escapeHtml(name)}</h3>
              <div class="relay-url">${escapeHtml(relayUrl)}</div>
            </div>
          </div>
          <div class="relay-status" id="${uniqueStatusId}">
           <!-- <span class="status-checking">Ready</span> -->
          </div>
        </div>
        
        ${description ? `<div class="relay-description">${escapeHtml(truncateText(description, 120))}</div>` : ''}
        
        ${(supportedNips > 0 || software || authRequired || paymentRequired) ? `
          <div class="relay-badges">
            ${supportedNips > 0 ? `<span class="badge badge-info">NIPs: ${supportedNips}</span>` : ''}
            ${software ? `<span class="badge badge-info">${software}</span>` : ''}
            ${authRequired ? '<span class="badge badge-warning">Auth Required</span>' : ''}
            ${paymentRequired ? '<span class="badge badge-warning">Payment Required</span>' : ''}
          </div>
        ` : ''}
        
        
      </div>
      
      <div class="relay-actions">
        <button class="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <span>Check Status</span>
        </button>
        <button class="btn btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke-linejoin="round"/>
            <path d="M12 16v-4" stroke-linecap="round"/>
            <circle cx="12" cy="8" r="1" fill="currentColor"/>
          </svg>
          <span>Relay Info</span>
        </button>
   <!--     <button class="btn btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 13.5V9M15 9H10.5M15 9L9.00019 14.9999M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
          </svg>
          <span>Visit</span>
        </button> -->
        <button class="btn btn-primary ranking-add-to-set-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Add to Set</span>
        </button>
        <button class="btn btn-secondary" ${isBlocked ? 'style="background-color: #ff00005c; border-color: red;"' : ''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4" y1="20" x2="20" y2="4"/>
          </svg>
          <span>${isBlocked ? 'Unblock' : 'Block'}</span>
        </button>
      </div>
    </div>
  `;
}


async function checkRelayStatusForRanking(relayUrl, statusId, verbose = false) {
  const statusElement = document.getElementById(statusId);
  if (!statusElement) return;
  
  if (!verbose) {
    statusElement.innerHTML = '<span class="status-checking">Checking...</span>';
    return performBasicCheck(relayUrl, statusId, statusElement);
  } else {
    statusElement.innerHTML = '<span class="status-checking">Running analysis...</span>';
    return performDetailedAnalysis(relayUrl, statusId, statusElement);
  }
}