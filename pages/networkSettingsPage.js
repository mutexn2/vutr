async function networkSettingsPageHandler() {
  try {
    mainContent.innerHTML = `
<div class="network-container-container">

<div class="network-container">
  <!-- Tab Navigation -->
  <div class="network-tab-nav">
    <button class="network-tab-button active" data-tab="active-set">
      Content relay sets
    </button>
    <button class="network-tab-button" data-tab="placeholder-1">my relays</button>
    <button class="network-tab-button" data-tab="placeholder-2">blossom servers</button>
    <button class="network-tab-button" data-tab="allowed-servers">Allowed Servers</button>

  </div>

<!-- Active Set Tab -->
  <div class="network-tab-content active" id="active-set-tab">
<!-- Actions bar above the header -->
<div class="relay-set-actions-bar">
  <button id="createNewSetBtn" class="btn-primary">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Create New
  </button>
  <button id="importMyRelaySetsBtn" class="btn-primary">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
    </svg>
    Import My Relay Sets
  </button>
    <button id="relay-set-discovery-btn" class="btn-primary">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
      </svg>
      Discover
    </button>  
</div>

<div class="active-set-header">
<p>active set</p>
  <div class="set-selector">
    <label for="activeSetSelect">Active Relay Set:</label>
    <select id="activeSetSelect" class="set-dropdown">
      <!-- Options will be populated dynamically -->
    </select>
  </div>
<div class="set-actions">
  <button id="editActiveSetMetadataBtn" class="btn-secondary" ${isGlobalSet(app.activeRelayList) ? 'style="display:none"' : ''}>Edit Metadata</button>
  <button id="shareActiveSetBtn" class="btn-primary" ${isGlobalSet(app.activeRelayList) ? 'style="display:none"' : ''}>Share</button>
  <button id="deleteActiveSetBtn" class="btn-danger" ${isGlobalSet(app.activeRelayList) ? 'style="display:none"' : ''}>Delete</button>
</div>
</div>

    <!-- Set Info Section -->
    <div class="set-info-section" id="setInfoSection">
      <!-- Will be populated dynamically -->
    </div>

    <!-- Active Relay List -->
    <div class="active-relay-list">
      <div id="activeRelayList" class="relay-list">
        <!-- Dynamic content will be inserted here -->
      </div>
    </div>

    <!-- Add New Relay Section -->
    <div class="add-relay-section">
      <h3>Add Relay</h3>
      <div class="add-relay-form">
        <input
          type="text"
          id="newRelayInput"
          placeholder="wss://relay.example.com"
          class="relay-input"
        />
        <button id="addRelayBtn" class="btn-primary">Add Relay</button>
      </div>
    </div>
  </div>

<!-- My Relays (Outbox) Tab -->
<div class="network-tab-content" id="placeholder-1-tab">
  <div class="outbox-relays-container">
    <h2>My Relays (Outbox)</h2>
    <p class="tab-description">
      Manage your personal relay list (kind:10002). This tells others where to find your content and where to send replies so you can read them.
    </p>
    
    <div class="outbox-controls">
      <button id="importOutboxBtn" class="btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
        </svg>
        Import My Outbox List
      </button>
      <button id="shareOutboxBtn" class="btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        Share to Relays
      </button>
    </div>
    
    <div id="outboxRelaysList" class="outbox-relay-list">
      <!-- Dynamic content will be inserted here -->
    </div>
    
    <div class="add-outbox-relay-section">
      <h3>Add Relay</h3>
      <div class="add-outbox-relay-form">
        <input
          type="text"
          id="newOutboxRelayInput"
          placeholder="wss://relay.example.com"
          class="relay-input"
        />
        <select id="outboxRelayMarker" class="relay-marker-select">
          <option value="">Read & Write</option>
          <option value="read">Read Only</option>
          <option value="write">Write Only</option>
        </select>
        <button id="addOutboxRelayBtn" class="btn-primary">Add Relay</button>
      </div>
    </div>
  </div>
</div>

<!-- Blossom Servers Tab -->
<div class="network-tab-content" id="placeholder-2-tab">
  <div class="blossom-servers-container">
    <h2>Blossom Servers</h2>
    <p class="tab-description">
      Manage your list of Blossom media servers (kind:10063). These servers host your media files and make them discoverable.
    </p>
    
    <div class="blossom-controls">
      <button id="importBlossomBtn" class="btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
        </svg>
        Import My Blossom Servers
      </button>
      <button id="shareBlossomBtn" class="btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        Share to Relays
      </button>
    </div>
    
    <div id="blossomServersList" class="blossom-server-list">
      <!-- Dynamic content will be inserted here -->
    </div>
    
    <div class="add-blossom-server-section">
      <h3>Add Server</h3>
      <div class="add-blossom-server-form">
        <input
          type="url"
          id="newBlossomServerInput"
          placeholder="https://blossom.example.com"
          class="relay-input"
        />
        <button id="addBlossomServerBtn" class="btn-primary">Add Server</button>
      </div>
    </div>
  </div>
</div>


<!-- Allowed Servers Tab -->
<div class="network-tab-content" id="allowed-servers-tab">
  <div class="allowed-servers-container">
    <h2>Trusted Media Servers</h2>
    <p class="allowed-servers-description">Manage domains allowed to serve media content across the app</p>
    
    <div class="server-controls">
      <button id="checkAllServersBtn" class="btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
        </svg>
        Check All Servers
      </button>
      <button class="add-domain-btn settings-btn primary">Add Domain</button>
    </div>
    
    <div class="whitelist-domains" id="whitelistDomainsContainer">
      <!-- Domains will be rendered here -->
    </div>
    
    <div class="add-domain-form" style="display: none;">
      <input type="text" class="domain-input" placeholder="Enter domain (e.g., cdn.example.com)">
      <div class="form-actions">
        <button class="confirm-add-btn">Add</button>
        <button class="cancel-add-btn">Cancel</button>
      </div>
    </div>
  </div>
</div>
</div>
</div>

    `;


    // Initialize the page
    populateActiveSetDropdown();
    renderSetInfo();
    renderActiveRelaySet();
    setupNetworkPageEventListeners();


    // Setup media whitelist in the allowed servers tab
    const allowedServersTab = mainContent.querySelector("#allowed-servers-tab");
    if (allowedServersTab) {
      const mediaSection = allowedServersTab.querySelector(".allowed-servers-container");
      if (mediaSection) {
        setupMediaWhitelistSettings(mediaSection);
        setupAllowedServersEventListeners();
      }
    }



  } catch (error) {
    console.error("Error rendering network page:", error);
    mainContent.innerHTML = `
      <h1>Error</h1>
      <div class="error-message">
        <p>${formatErrorForDisplay(error)}</p>
      </div>
    `;
  }
}

function populateActiveSetDropdown() {
  const select = document.getElementById("activeSetSelect");
  if (!select) return;

  const listsWithGlobal = getRelayListsWithGlobal();

  // Sort regular sets alphabetically, but keep global set at the end
  const regularSets = Object.keys(app.relayLists).sort();
  const allSets = [...regularSets, GLOBAL_SET_NAME];

  select.innerHTML = allSets
    .map(setName => `<option value="${setName}" ${setName === app.activeRelayList ? 'selected' : ''}>${setName}</option>`)
    .join('');
}

function renderSetInfo() {
  const container = document.getElementById("setInfoSection");
  if (!container) return;

  let activeSet;
  if (isGlobalSet(app.activeRelayList)) {
    activeSet = generateGlobalRelaySet();
  } else {
    activeSet = app.relayLists[app.activeRelayList];
  }

  if (!activeSet) {
    container.innerHTML = '';
    return;
  }

  const relayCount = activeSet.tags.filter(tag => tag[0] === "relay").length;
  const descriptionTag = activeSet.tags.find(tag => tag[0] === "description");
  const description = descriptionTag ? descriptionTag[1] : "No description";

  container.innerHTML = `
    <div class="set-metadata">
      <div class="set-stat">
        <strong>Relays:</strong> <span>${relayCount}</span>
      </div>
      <div class="set-description-display">
        <strong>Description:</strong> <span>${escapeHtml(description)}</span>
      </div>
    </div>
  `;
}


function setupNetworkPageEventListeners() {

  document.getElementById("relay-set-discovery-btn").addEventListener("click", function () {
    window.location.hash = "relaysetsdiscover";
  });

  // Tab switching
  document.querySelectorAll('.network-tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const targetTab = e.target.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Active set dropdown change
  document.getElementById("activeSetSelect").addEventListener("change", (e) => {
    const newActiveSet = e.target.value;
    setActiveRelaySet(newActiveSet);
  });

  // Share active set
  document.getElementById("shareActiveSetBtn").addEventListener("click", () => {
    shareActiveRelaySet();
  });

  document.getElementById("deleteActiveSetBtn").addEventListener("click", deleteActiveSet);

  // Add relay button
  document.getElementById("addRelayBtn").addEventListener("click", addRelay);

  // Add relay on Enter key
  document.getElementById("newRelayInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addRelay();
  });

  // Edit active set metadata (name + description)
  document.getElementById("editActiveSetMetadataBtn").addEventListener("click", () => {
    editSetMetadata(app.activeRelayList);
  });

  // NEW: Create new set button (moved to actions bar)
  document.getElementById("createNewSetBtn").addEventListener("click", createNewEmptySet);

  // NEW: Import my relay sets button
  document.getElementById("importMyRelaySetsBtn").addEventListener("click", importMyRelaySets);

  // Outbox relay controls
  const importOutboxBtn = document.getElementById("importOutboxBtn");
  const shareOutboxBtn = document.getElementById("shareOutboxBtn");
  const addOutboxRelayBtn = document.getElementById("addOutboxRelayBtn");
  const newOutboxRelayInput = document.getElementById("newOutboxRelayInput");

  if (importOutboxBtn) {
    importOutboxBtn.addEventListener("click", importOutboxRelays);
  }

  if (shareOutboxBtn) {
    shareOutboxBtn.addEventListener("click", shareOutboxRelays);
  }

  if (addOutboxRelayBtn) {
    addOutboxRelayBtn.addEventListener("click", addOutboxRelay);
  }

  if (newOutboxRelayInput) {
    newOutboxRelayInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addOutboxRelay();
    });
  }


  // Blossom server controls
  const importBlossomBtn = document.getElementById("importBlossomBtn");
  const shareBlossomBtn = document.getElementById("shareBlossomBtn");
  const addBlossomServerBtn = document.getElementById("addBlossomServerBtn");
  const newBlossomServerInput = document.getElementById("newBlossomServerInput");

  if (importBlossomBtn) {
    importBlossomBtn.addEventListener("click", importBlossomServers);
  }

  if (shareBlossomBtn) {
    shareBlossomBtn.addEventListener("click", shareBlossomServers);
  }

  if (addBlossomServerBtn) {
    addBlossomServerBtn.addEventListener("click", addBlossomServer);
  }

  if (newBlossomServerInput) {
    newBlossomServerInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addBlossomServer();
    });
  }

  // Delegate events for dynamic content
  const networkContainer = document.querySelector('.network-container-container');
  if (networkContainer) {
    networkContainer.addEventListener("click", (e) => {
      // Helper function to get button text from SVG structure
      const getButtonText = (target) => {
        const button = target.closest('button');
        if (!button) return null;
        const span = button.querySelector('span');
        return span ? span.textContent.trim() : null;
      };

      const buttonText = getButtonText(e.target);

      if (buttonText === "Check Status") {
        e.stopPropagation();
        const relayItem = e.target.closest(".relay-item");
        const relayUrl = relayItem.dataset.relay;
        const index = parseInt(relayItem.dataset.index);

        // Use verbose mode for manual checks
        checkRelayStatus(relayUrl, index, true);
      }

      else if (buttonText === "Relay Info" || buttonText === "Info") {
        e.preventDefault();
        e.stopPropagation();
        const relayUrl = e.target.closest(".relay-item").dataset.relay;
        getRelayInfo(relayUrl);
      }

      else if (buttonText === "Visit") {
        e.stopPropagation();
        let relayUrl = e.target.closest(".relay-item").dataset.relay;
        if (relayUrl.startsWith('wss://')) {
          relayUrl = relayUrl.slice(6);
        } else if (relayUrl.startsWith('ws://')) {
          relayUrl = relayUrl.slice(5);
        }
        window.location.hash = `#singlerelay/${relayUrl}`;
      }


      else if (buttonText === "Block" || buttonText === "Unblock") {
        e.stopPropagation();
        const relayItem = e.target.closest(".relay-item");
        const relayUrl = relayItem.dataset.relay;
        const button = e.target.closest('button');
        const buttonSpan = button.querySelector('span');

        if (buttonText === "Block") {
          if (confirm(`Block all future connections to:\n${extractDomainName(relayUrl)}?`)) {
            window.WebSocketManager.blockURL(relayUrl);

            // Update button appearance
            button.style.backgroundColor = '#ff00005c';
            button.style.borderColor = 'red';
            buttonSpan.textContent = 'Unblock';

            // Optional: Show a brief feedback message
            const originalText = buttonSpan.textContent;
            buttonSpan.textContent = 'Blocked!';
            setTimeout(() => {
              buttonSpan.textContent = 'Unblock';
            }, 1000);
          }
        } else if (buttonText === "Unblock") {
          if (confirm(`Unblock connections to:\n${extractDomainName(relayUrl)}?`)) {
            window.WebSocketManager.unblockURL(relayUrl);

            // Reset button appearance
            button.style.backgroundColor = '';
            button.style.borderColor = '';
            buttonSpan.textContent = 'Block';

            // Optional: Show a brief feedback message
            const originalText = buttonSpan.textContent;
            buttonSpan.textContent = 'Unblocked!';
            setTimeout(() => {
              buttonSpan.textContent = 'Block';
            }, 1000);
          }
        }
      }

      else if (buttonText === "Delete" || buttonText === "Remove") {
        e.stopPropagation();
        const relayItem = e.target.closest(".relay-item");
        if (relayItem) {
          const index = parseInt(relayItem.dataset.index);
          removeRelay(index);
        }
      }
    });
  }
}

function switchTab(targetTab) {
  // Update tab buttons
  document.querySelectorAll('.network-tab-button').forEach(button => {
    button.classList.remove('active');
  });
  document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.network-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${targetTab}-tab`).classList.add('active');

  // Render content based on tab
  if (targetTab === 'placeholder-1') {
    renderOutboxRelays();
    setupOutboxEventListeners();
  } else if (targetTab === 'placeholder-2') {
    renderBlossomServers();
    setupBlossomEventListeners();
  }
}

function renderActiveRelaySet() {
  const container = document.getElementById("activeRelayList");
  let activeSet;

  if (isGlobalSet(app.activeRelayList)) {
    activeSet = generateGlobalRelaySet();
  } else {
    activeSet = app.relayLists[app.activeRelayList];
  }

  if (!activeSet) {
    container.innerHTML = '<p class="no-relays">No active relay set found.</p>';
    return;
  }

  const relays = activeSet.tags.filter((tag) => tag[0] === "relay");
  if (relays.length === 0) {
    container.innerHTML = '<p class="no-relays">No relays in active set.</p>';
    return;
  }

  // Create placeholder items first
  container.innerHTML = relays
    .map((relay, index) => createRelayItemHTML(relay[1], index, null))
    .join("");

  // Then fetch relay documents and update items
  relays.forEach((relay, index) => {
    fetchRelayDocumentAndUpdate(relay[1], index);
  });
}







// Save relay lists to localStorage
function saveRelayLists() {
  localStorage.setItem("relayLists", JSON.stringify(app.relayLists));
  localStorage.setItem("activeRelayList", app.activeRelayList);
}


function generateLimitationBadges(relayDoc) {
  if (!relayDoc) return [];

  const badges = [];

  // Add ALL NIP badges from the relay document
  /*   if (relayDoc.supported_nips?.length > 0) {
      // Sort NIPs numerically for better display
      const sortedNips = [...relayDoc.supported_nips].sort((a, b) => a - b);
      
      // Show all NIPs with tooltips
      sortedNips.forEach(nip => {
        badges.push(`<span class="badge badge-info" title="NIP-${nip}">NIP-${nip}</span>`);
      });
    } */

  // Add limitation badges
  if (relayDoc.limitation?.auth_required) {
    badges.push('<span class="badge badge-warning">🔐 Auth Required</span>');
  }
  if (relayDoc.limitation?.payment_required) {
    badges.push('<span class="badge badge-warning">💰 Payment Required</span>');
  }
  if (relayDoc.limitation?.restricted_writes) {
    badges.push('<span class="badge badge-warning">✏️ Restricted Writes</span>');
  }

  return badges;
}
function createRelayItemHTML(relayUrl, index, relayDoc) {
  const domain = extractDomainName(relayUrl);
  const name = relayDoc?.name || domain;
  const description = relayDoc?.description || "Loading relay information...";

  // Check if this relay is blocked
  const isBlocked = window.WebSocketManager && window.WebSocketManager.isURLBlocked(relayUrl);

  // Generate all badges including NIPs and limitations
  const badges = generateLimitationBadges(relayDoc);

  // Add software badge separately if present
  const softwareBadge = relayDoc?.software ?
    `<span class="badge badge-info">${extractSoftwareName(relayDoc.software)}</span>` : '';

  return `
    <div class="relay-item" data-relay="${relayUrl}" data-index="${index}">
      <div class="relay-header">
        <div class="relay-main-info">
          <div class="relay-identity">
            <img id="icon-${index}" class="relay-icon" alt="" style="display: none;">
            <div class="relay-text-info">
              <h3 class="relay-name">${name}</h3>
              <div class="relay-url">${relayUrl}</div>
            </div>
          </div>
          <div class="relay-status" id="status-${index}">
            <span class="status-checking">Checking...</span>
          </div>
        </div>
        
        <div class="relay-description">${truncateText(description, 120)}</div>
        
        ${(badges.length > 0 || softwareBadge) ? `
          <div class="relay-badges">
            ${badges.join('')}
            ${softwareBadge}
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
        <button class="btn btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 13.5V9M15 9H10.5M15 9L9.00019 14.9999M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
          </svg>
          <span>Visit</span>
        </button>
        ${!isGlobalSet(app.activeRelayList) ? `
          <button class="btn btn-danger">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            <span>Delete</span>
          </button>
        ` : ''}
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
// Update fetchRelayDocumentAndUpdate to properly handle icons
async function fetchRelayDocumentAndUpdate(relayUrl, index) {
  try {
    const httpUrl = relayUrl
      .replace("wss://", "https://")
      .replace("ws://", "http://");

    const response = await fetch(httpUrl, {
      headers: {
        Accept: "application/nostr+json",
      },
    });

    let relayDoc = null;
    if (response.ok) {
      relayDoc = await response.json();
    }

    // Update the entire relay item with new data
    const relayItem = document.querySelector(`[data-relay="${relayUrl}"][data-index="${index}"]`);
    if (relayItem) {
      const newHTML = createRelayItemHTML(relayUrl, index, relayDoc);
      relayItem.outerHTML = newHTML;

      // Load the icon using the existing fetchRelayIcon function
      fetchRelayIcon(relayUrl, index);

      // Re-start the status check for the updated item
      checkRelayStatus(relayUrl, index);
    }

  } catch (error) {
    console.error(`Failed to fetch relay document for ${relayUrl}:`, error);
    // Still check status and load icon even if relay doc failed
    fetchRelayIcon(relayUrl, index);
    checkRelayStatus(relayUrl, index);
  }
}

// Helper function to normalize relay URLs
function normalizeRelayUrl(url) {
  let normalized = url.trim().toLowerCase(); // trim whitespace and lowercase

  // Add protocol if missing
  if (!normalized.startsWith("wss://") && !normalized.startsWith("ws://")) {
    normalized = "wss://" + normalized;
  }

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  // Remove default ports (optional)
  //  normalized = normalized.replace(':80/', '/').replace(':443/', '/');

  return normalized;
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Helper functions
function extractSoftwareName(softwareUrl) {
  try {
    const url = new URL(softwareUrl);
    const pathParts = url.pathname.split('/').filter(part => part);
    if (pathParts.length >= 2) {
      return pathParts[pathParts.length - 1]; // repo name
    }
    return url.hostname;
  } catch {
    return softwareUrl;
  }
}
// Fetch relay icon
async function fetchRelayIcon(relayUrl, index) {
  const iconElement = document.getElementById(`icon-${index}`);
  try {
    const httpUrl = relayUrl
      .replace("wss://", "https://")
      .replace("ws://", "http://");

    // First try to get the relay document
    const response = await fetch(httpUrl, {
      headers: {
        Accept: "application/nostr+json",
      },
    });

    if (response.ok) {
      const relayDoc = await response.json();
      if (relayDoc.icon) {
        iconElement.src = relayDoc.icon;
        iconElement.style.display = "inline";
        return;
      }
    }

    // Fallback to favicon.ico
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



///////////////////
function addRelay() {
  // Prevent adding relays to the global set
  if (isGlobalSet(app.activeRelayList)) {
    showTemporaryNotification("Cannot add relays to the global set");
    return;
  }

  const input = document.getElementById("newRelayInput");
  const url = input.value.trim();

  if (!url) {
    showTemporaryNotification("Please enter a relay URL");
    return;
  }

  const normalizedUrl = normalizeRelayUrl(url);
  const activeSet = app.relayLists[app.activeRelayList];

  const isDuplicateRelay = activeSet.tags.some(tag =>
    tag[0] === "relay" && isUrlEquivalent(tag[1], normalizedUrl)
  );

  if (isDuplicateRelay) {
    showTemporaryNotification("Relay already exists in this set");
    return;
  }

  activeSet.tags.push(["relay", normalizedUrl]);
  saveRelayLists();
  updateAllNetworkUI();
  input.value = "";
  showTemporaryNotification("Relay added successfully");
}

// Improved URL equivalence checking
function isUrlEquivalent(url1, url2) {
  // Remove protocol (http://, https://, etc.)
  const cleanUrl1 = url1.replace(/^https?:\/\//, '');
  const cleanUrl2 = url2.replace(/^https?:\/\//, '');

  // Remove www. if present
  const baseUrl1 = cleanUrl1.replace(/^www\./, '');
  const baseUrl2 = cleanUrl2.replace(/^www\./, '');

  // Remove trailing slashes
  const trimmedUrl1 = baseUrl1.replace(/\/$/, '');
  const trimmedUrl2 = baseUrl2.replace(/\/$/, '');

  // Compare cleaned URLs
  return trimmedUrl1.toLowerCase() === trimmedUrl2.toLowerCase();
}


function removeRelay(index) {
  // Prevent removing relays from the global set
  if (isGlobalSet(app.activeRelayList)) {
    showTemporaryNotification("Cannot remove relays from the global set");
    return;
  }

  const activeSet = app.relayLists[app.activeRelayList];
  const relays = activeSet.tags.filter((tag) => tag[0] === "relay");
  const relayUrl = relays[index][1];

  showConfirmDialog(
    "Remove Relay",
    `Are you sure you want to remove ${relayUrl}?`,
    () => {
      const relayIndex = activeSet.tags.findIndex(
        (tag) => tag[0] === "relay" && tag[1] === relayUrl
      );

      if (relayIndex !== -1) {
        activeSet.tags.splice(relayIndex, 1);
        saveRelayLists();
        updateAllNetworkUI();
        showTemporaryNotification("Relay removed");
      }
    }
  );
}

function setActiveRelaySet(setName) {
  app.activeRelayList = setName;
  saveRelayLists();
  updateAllNetworkUI();
  updateButtonVisibility();
  showTemporaryNotification(`Active relay set changed to: ${setName}`);
}

//////////////////////////////////////////


// Main function to check relay status with info
async function checkRelayStatus(relayUrl, index, verbose = false) {
  const statusElement = document.getElementById(`status-${index}`);

  if (!verbose) {
    statusElement.innerHTML = '<span class="status-checking">Checking...</span>';
    return performBasicCheck(relayUrl, index, statusElement);
  } else {
    statusElement.innerHTML = '<span class="status-checking">Running analysis...</span>';
    return performDetailedAnalysis(relayUrl, index, statusElement);
  }
}

// Fast basic check
async function performBasicCheck(relayUrl, index, statusElement) {
  try {
    const startTime = performance.now();
    const ws = new WebSocket(relayUrl);

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('timeout'));
      }, 2000);

      ws.onopen = () => {
        const connectionTime = Math.round(performance.now() - startTime);
        clearTimeout(timeout);
        ws.close();
        resolve({ status: 'online', connectionTime });
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('failed'));
      };
    });

    statusElement.innerHTML = '<span class="status-online">Online</span>';
  } catch (error) {
    statusElement.innerHTML = '<span class="status-offline">Offline</span>';
  }
}

// Enhanced detailed analysis
async function performDetailedAnalysis(relayUrl, index, statusElement) {
  try {
    // First fetch relay info document
    const relayInfo = await fetchRelayInfo(relayUrl);

    // Then perform technical analysis
    const techAnalysis = await performTechnicalCheck(relayUrl);

    // Combine both results
    updateDetailedStatusWithInfo(statusElement, relayInfo, techAnalysis, relayUrl);

  } catch (error) {
    const failedResult = {
      status: 'offline',
      connectionTime: 0,
      error: error.message || 'Analysis failed'
    };
    updateDetailedStatusWithInfo(statusElement, null, failedResult, relayUrl);
  }
}

async function performTechnicalCheck(relayUrl) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const ws = new WebSocket(relayUrl);

    let result = {
      status: 'offline',
      responseTime: null,
      hasVideoEvents: false,
      hasTextEvents: false,
      canAccess: false,
      error: null
      // No authRequired field
    };


    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 8000);

    ws.onopen = () => {
      result.status = 'online';

      // Use a simple random ID instead of nostr-tools for subscription ID
      const subId1 = Math.random().toString(36).substring(7);
      const subId2 = Math.random().toString(36).substring(7);

      const videoReq = JSON.stringify([
        "REQ", subId1, { kinds: [21, 22], limit: 1 }
      ]);

      const textReq = JSON.stringify([
        "REQ", subId2, { kinds: [1], limit: 1 }
      ]);

      ws.send(videoReq);
      ws.send(textReq);

      setTimeout(() => {
        ws.close();
        clearTimeout(timeout);
        resolve(result);
      }, 4000);
    };

    ws.onmessage = (event) => {
      if (!result.responseTime) {
        result.responseTime = Math.round(performance.now() - startTime);
      }

      try {
        const message = JSON.parse(event.data);
        if (Array.isArray(message)) {
          const [type, subscriptionId, ...args] = message;

          switch (type) {
            case 'EVENT':
              result.canAccess = true;
              const eventData = args[0];
              if (eventData && eventData.kind) {
                if (eventData.kind === 21 || eventData.kind === 22) {
                  result.hasVideoEvents = true;
                } else if (eventData.kind === 1) {
                  result.hasTextEvents = true;
                }
              }
              break;

            // Removed AUTH and NOTICE handling for authentication
            // Authentication is now only determined from relay document limitations
          }
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    };

    ws.onclose = (event) => {
      clearTimeout(timeout);
      // Removed auth detection from close codes
      resolve(result);
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      result.status = 'offline';
      result.error = 'Connection failed';
      reject(result);
    };
  });
}



function updateDetailedStatusWithInfo(statusElement, relayInfo, techResult, relayUrl) {
  // Clear existing content
  statusElement.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'status-detailed';

  // Create relay header
  const header = createRelayHeader(relayInfo, relayUrl);
  container.appendChild(header);

  // Create technical analysis
  const analysis = createTechnicalAnalysis(techResult);
  container.appendChild(analysis);

  statusElement.appendChild(container);
}

function createTechnicalAnalysis(techResult) {
  const analysis = document.createElement('div');
  analysis.className = 'technical-analysis';

  const analysisHeader = document.createElement('div');
  analysisHeader.className = 'analysis-header';

  const statusSpan = document.createElement('span');
  const isOnline = techResult.status === 'online';
  statusSpan.className = isOnline ? 'status-online' : 'status-offline';
  statusSpan.textContent = isOnline ? '✅ Online' : '❌ Offline';
  analysisHeader.appendChild(statusSpan);

  const details = document.createElement('div');
  details.className = 'analysis-details';

  // Response time
  if (techResult.responseTime) {
    const perfItem = createAnalysisItem(
      '⚡ Response Time:',
      getPerformanceText(techResult.responseTime),
      getPerformanceClass(techResult.responseTime)
    );
    details.appendChild(perfItem);
  }

  // Content analysis
  let contentStatus = '❌ No Content';
  let contentClass = 'status-no';

  if (techResult.hasVideoEvents) {
    contentStatus = '🎥 Has Videos';
    contentClass = 'status-yes';
  } else if (techResult.hasTextEvents) {
    contentStatus = '📝 Text Only';
    contentClass = 'status-warning';
  }

  const contentItem = createAnalysisItem('📺 Content:', contentStatus, contentClass);
  details.appendChild(contentItem);

  // Access status
  const accessStatus = techResult.canAccess ? '✅ Accessible' : '❌ No Access';
  const accessClass = techResult.canAccess ? 'status-yes' : 'status-no';
  const accessItem = createAnalysisItem('🔓 Access:', accessStatus, accessClass);
  details.appendChild(accessItem);

  // No auth status display

  // Error
  if (techResult.error) {
    const errorItem = createAnalysisItem('❌ Issue:', techResult.error, 'error');
    details.appendChild(errorItem);
  }

  analysis.appendChild(analysisHeader);
  analysis.appendChild(details);

  return analysis;
}

function createAnalysisItem(label, value, valueClass = '') {
  const item = document.createElement('div');
  item.className = 'analysis-item';

  const labelSpan = document.createElement('span');
  labelSpan.className = 'item-label';
  labelSpan.textContent = label;

  const valueSpan = document.createElement('span');
  valueSpan.className = `item-value ${valueClass}`;
  valueSpan.textContent = value;

  item.appendChild(labelSpan);
  item.appendChild(valueSpan);

  return item;
}


function createRelayHeader(relayInfo, relayUrl) {
  const header = document.createElement('div');
  header.className = 'relay-info-header compact';

  const nameContainer = document.createElement('div');
  nameContainer.className = 'relay-name-container';

  if (relayInfo) {
    const icon = document.createElement('img');
    icon.className = 'relay-icon';
    icon.src = relayInfo.icon || getRelayIconUrl(relayUrl);
    icon.alt = 'icon';
    icon.style.cssText = 'width: 24px; height: 24px; margin-right: 6px;';
    icon.onerror = () => icon.style.display = 'none';
    nameContainer.appendChild(icon);

    const name = document.createElement('div');
    name.className = 'relay-name';
    name.textContent = relayInfo.name || extractDomainName(relayUrl);
    nameContainer.appendChild(name);

    const description = document.createElement('div');
    description.className = 'relay-description';
    description.textContent = relayInfo.description || "No description available";

    // Add additional info for detailed status
    const additionalInfo = document.createElement('div');
    additionalInfo.className = 'relay-additional-info';
    additionalInfo.style.fontSize = '0.8em';
    additionalInfo.style.marginTop = '4px';
    additionalInfo.style.color = 'var(--text-secondary)';

    const infoParts = [];
    if (relayInfo.supported_nips?.length) {
      infoParts.push(`${relayInfo.supported_nips.length} NIPs`);
    }
    if (relayInfo.software) {
      infoParts.push(extractSoftwareName(relayInfo.software));
    }
    // Removed auth_required and payment_required from here since they're in badges

    if (infoParts.length > 0) {
      additionalInfo.textContent = infoParts.join(' • ');
    }

    header.appendChild(nameContainer);
    header.appendChild(description);
    if (infoParts.length > 0) {
      header.appendChild(additionalInfo);
    }
  } else {
    // Fallback when no relay info available
    const name = document.createElement('div');
    name.className = 'relay-name';
    name.textContent = extractDomainName(relayUrl);
    nameContainer.appendChild(name);

    const description = document.createElement('div');
    description.className = 'relay-description';
    description.textContent = "Relay information not available";

    header.appendChild(nameContainer);
    header.appendChild(description);
  }

  return header;
}


// Helper functions
function extractDomainName(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^wss?:\/\//, '').split('/')[0];
  }
}

function getRelayIconUrl(relayUrl) {
  const httpUrl = relayUrl.replace("wss://", "https://").replace("ws://", "http://");
  return `${httpUrl}/favicon.ico`;
}

function getSpeedClass(connectionTime) {
  if (connectionTime < 100) return 'speed-fast';
  if (connectionTime < 300) return 'speed-medium';
  if (connectionTime < 800) return 'speed-slow';
  return 'speed-very-slow';
}

function getSpeedText(connectionTime) {
  if (connectionTime < 100) return `Very Fast (${connectionTime}ms)`;
  if (connectionTime < 300) return `Fast (${connectionTime}ms)`;
  if (connectionTime < 800) return `Slow (${connectionTime}ms)`;
  return `Very Slow (${connectionTime}ms)`;
}

function getPerformanceClass(responseTime) {
  if (responseTime < 200) return 'speed-fast';
  if (responseTime < 500) return 'speed-medium';
  if (responseTime < 1000) return 'speed-slow';
  return 'speed-very-slow';
}

function getPerformanceText(responseTime) {
  if (responseTime < 200) return `Excellent (${responseTime}ms)`;
  if (responseTime < 500) return `Good (${responseTime}ms)`;
  if (responseTime < 1000) return `Fair (${responseTime}ms)`;
  return `Poor (${responseTime}ms)`;
}



// Get relay information document
async function getRelayInfo(relayUrl) {
  let modal = null;

  try {
    const httpUrl = relayUrl
      .replace("wss://", "https://")
      .replace("ws://", "http://");

    // Open modal once with loading state
    modal = openModal({
      title: "Loading...",
      content: `<pre>Fetching relay information...</pre>`,
      size: "large",
      customClass: "relay-info-modal"
    });

    const response = await fetch(httpUrl, {
      headers: {
        Accept: "application/nostr+json",
      },
    });

    // Update the existing modal content instead of creating a new one
    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.modal-body');

    if (response.ok) {
      const relayDoc = await response.json();
      const formattedJson = formatJsonWithStyle(relayDoc);
      if (modalTitle) modalTitle.textContent = relayUrl;
      if (modalBody) modalBody.innerHTML = `<div class="json-simple-viewer"><pre>${formattedJson}</pre></div>`;
    } else {
      if (modalTitle) modalTitle.textContent = relayUrl;
      if (modalBody) modalBody.innerHTML = `<pre>Error: ${response.status} ${response.statusText}</pre>`;
    }
  } catch (error) {
    // Update existing modal with error if it still exists
    if (modal && document.body.contains(modal)) {
      const modalTitle = modal.querySelector('.modal-title');
      const modalBody = modal.querySelector('.modal-body');
      if (modalTitle) modalTitle.textContent = relayUrl;
      if (modalBody) modalBody.innerHTML = `<pre>Error: ${error.message}</pre>`;
    } else {
      // If modal doesn't exist anymore, create a new one with error
      openModal({
        title: relayUrl,
        content: `<pre>Error: ${error.message}</pre>`,
        size: "large",
        customClass: "relay-info-modal"
      });
    }
  }
}

// Fetch relay info document
async function fetchRelayInfo(relayUrl) {
  try {
    const httpUrl = relayUrl.replace("wss://", "https://").replace("ws://", "http://");
    const response = await fetch(httpUrl, {
      headers: { "Accept": "application/nostr+json" },
      timeout: 3000
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // Relay info not available, continue with technical check only
  }
  return null;
}



/////////////////////////////////////////
function createNewEmptySet() {
  // Generate a unique placeholder name
  let counter = 1;
  let setName = `New Set ${counter}`;

  while (app.relayLists[setName]) {
    counter++;
    setName = `New Set ${counter}`;
  }

  app.relayLists[setName] = {
    kind: 30002,
    tags: [
      ["d", crypto.randomUUID().replace(/-/g, '').slice(0, 15)],
      ["title", setName],
      ["description", ""]
    ],
  };

  saveRelayLists();
  app.activeRelayList = setName;
  updateAllNetworkUI();
  showTemporaryNotification(`New set "${setName}" created and activated`);
}

function deleteActiveSet() {
  const currentSet = app.activeRelayList;

  // Prevent deleting the global set
  if (isGlobalSet(currentSet)) {
    showTemporaryNotification("Cannot delete the global relay set");
    return;
  }

  // Prevent deleting if it's the only set (besides global)
  const regularSets = Object.keys(app.relayLists).filter(set => !isGlobalSet(set));
  if (regularSets.length <= 1) {
    showTemporaryNotification("Cannot delete the only relay set");
    return;
  }

  showConfirmDialog(
    "Delete Relay Set",
    `Are you sure you want to delete the "${currentSet}" relay set? This action cannot be undone.`,
    () => {
      // Find a new active set (pick the first available set that's not the one being deleted)
      const availableSets = Object.keys(app.relayLists).filter(set =>
        set !== currentSet && !isGlobalSet(set)
      );

      const newActiveSet = availableSets[0]; // Pick the first available set

      // Delete the current set
      delete app.relayLists[currentSet];

      // Set the new active set
      app.activeRelayList = newActiveSet;

      // Save and update UI
      saveRelayLists();
      updateAllNetworkUI();
      showTemporaryNotification(`Set "${currentSet}" deleted. Active set is now "${newActiveSet}"`);
    }
  );
}

async function shareActiveRelaySet() {
  //  if (!app.isLoggedIn) {
  //    showTemporaryNotification("You must be logged in to share relay sets");
  //    return;
  //  }

  const activeSet = app.relayLists[app.activeRelayList];
  if (!activeSet) {
    showTemporaryNotification("No active relay set found");
    return;
  }

  // Show preview modal first
  publishRelaySetToNostr(activeSet);
}



async function publishRelaySetToNostr(setData) {
  try {
    showTemporaryNotification("Publishing relay set...");

    const eventData = buildRelaySetEventData(setData);
    console.log("Relay set event data:", eventData);

    const signedEvent = await handleEventSigning(eventData);
    console.log("Relay set event signed successfully!");
    //  console.log(JSON.stringify(signedEvent, null, 4));

    try {
      const result = await publishEvent(signedEvent, app.globalRelays, {
        successMessage: "✅ Relay set shared successfully!",
        errorMessage: "Failed to publish relay set"
      });

      if (result.success) {
        console.dir(signedEvent, { depth: null });

        showTemporaryNotification("Event published successfully!");

      } else {
        throw new Error(result.error);
      }


    } catch (publishError) {
      console.error("Error publishing relay set:", publishError);
      showTemporaryNotification("❌ Failed to publish relay set");
    }
  } catch (error) {
    console.error("Error creating relay set event:", error);
    showTemporaryNotification("❌ Failed to create relay set event: " + error.message);
  }
}

function buildRelaySetEventData(setData) {
  const now = Math.floor(Date.now() / 1000);

  return {
    kind: 30002,
    created_at: now,
    content: "", // Kind 30002 events typically have empty content
    tags: [...setData.tags] // Use the existing tags (including d-tag) from the set
  };
}
////
async function importMyRelaySets() {
  if (!app.myPk) {
    showTemporaryNotification("You must be logged in to import your relay sets");
    return;
  }

  showTemporaryNotification("Fetching your published relay sets...");

  try {
    // Get extended relays for the user
    const extendedRelays = await getExtendedRelaysForProfile(app.myPk);
    const allRelays = [...new Set([...app.globalRelays, ...extendedRelays])];

    // Fetch user's kind:30002 events
    const relaySetEvents = await NostrClient.getEvents({
      kinds: [30002],
      authors: [app.myPk],
    }, allRelays);

    if (!relaySetEvents || relaySetEvents.length === 0) {
      showTemporaryNotification("No published relay sets found");
      return;
    }

    // Deduplicate by d-tag (keep only latest)
    const eventsByDtag = new Map();
    relaySetEvents.forEach(event => {
      const dTag = event.tags.find(tag => tag[0] === 'd');
      const dValue = dTag ? dTag[1] : '';
      const key = dValue;

      const existing = eventsByDtag.get(key);
      if (!existing || event.created_at > existing.created_at) {
        eventsByDtag.set(key, event);
      }
    });

    const uniqueEvents = Array.from(eventsByDtag.values());

    // Check for conflicts with local d-tags
    const conflicts = [];
    const localDtags = new Set();

    Object.values(app.relayLists).forEach(localSet => {
      const dTag = localSet.tags.find(tag => tag[0] === 'd');
      if (dTag) localDtags.add(dTag[1]);
    });

    uniqueEvents.forEach(event => {
      const dTag = event.tags.find(tag => tag[0] === 'd');
      const dValue = dTag ? dTag[1] : '';
      if (localDtags.has(dValue)) {
        const titleTag = event.tags.find(tag => tag[0] === 'title');
        const title = titleTag ? titleTag[1] : 'Untitled';
        conflicts.push({ event, title, dValue });
      }
    });

    // Show preview modal
    showImportMyRelaySetsModal(uniqueEvents, conflicts);

  } catch (error) {
    console.error("Error importing relay sets:", error);
    showTemporaryNotification("Failed to import relay sets: " + error.message);
  }
}

function showImportMyRelaySetsModal(events, conflicts) {
  const hasConflicts = conflicts.length > 0;
  const uniqueCount = events.length - conflicts.length;

  // Create list of all events with titles for display
  const allEventsList = events.map(event => {
    const titleTag = event.tags.find(tag => tag[0] === 'title');
    const dTag = event.tags.find(tag => tag[0] === 'd');
    const title = titleTag ? titleTag[1] : 'Untitled';
    const dValue = dTag ? dTag[1] : 'no d-tag';
    return `<li><strong>${escapeHtml(title)}</strong> <span style="color: var(--text-secondary); font-size: 0.9em;">(d-tag: ${escapeHtml(dValue)})</span></li>`;
  }).join('');

  const conflictsList = conflicts.map(c =>
    `<li><strong>${escapeHtml(c.title)}</strong> <span style="color: var(--text-secondary); font-size: 0.9em;">(d-tag: ${escapeHtml(c.dValue)})</span></li>`
  ).join('');

  const content = `
    <div class="import-my-relay-sets-modal">
      <div class="import-summary">
        <p><strong>Found ${events.length} relay set${events.length !== 1 ? 's' : ''} published by you:</strong></p>
        
        ${!hasConflicts ? `
          <div class="sets-list">
            <ul>${allEventsList}</ul>
          </div>
        ` : ''}
        
        ${uniqueCount > 0 && hasConflicts ? `<p>✅ ${uniqueCount} new set${uniqueCount !== 1 ? 's' : ''} will be imported</p>` : ''}
        
        ${hasConflicts ? `
          <div class="conflict-warning">
            <p>⚠️ ${conflicts.length} set${conflicts.length !== 1 ? 's' : ''} already exist${conflicts.length === 1 ? 's' : ''} locally:</p>
            <ul>${conflictsList}</ul>
            <p><strong>Do you want to overwrite the existing sets with your published versions?</strong></p>
          </div>
        ` : ''}
      </div>
      <div class="import-actions">
        <button class="btn-secondary" id="modalCancelBtn">Cancel</button>
        ${hasConflicts ? `
          <button class="btn-secondary" id="modalImportUniqueBtn">Import New Only</button>
          <button class="btn-primary" id="modalImportAllBtn">Import All (Overwrite)</button>
        ` : `
          <button class="btn-primary" id="modalImportAllBtn">Import All</button>
        `}
      </div>
    </div>
  `;

  const modal = openModal({
    title: "Import My Relay Sets",
    content,
    size: "medium"
  });

  modal.querySelector("#modalCancelBtn").addEventListener("click", closeModal);

  const importAllBtn = modal.querySelector("#modalImportAllBtn");
  if (importAllBtn) {
    importAllBtn.addEventListener("click", () => {
      performImport(events, true);
      closeModal();
    });
  }

  const importUniqueBtn = modal.querySelector("#modalImportUniqueBtn");
  if (importUniqueBtn) {
    importUniqueBtn.addEventListener("click", () => {
      performImport(events, false);
      closeModal();
    });
  }
}

function performImport(events, allowOverwrite) {
  let importedCount = 0;
  let skippedCount = 0;

  const localDtags = new Set();
  Object.values(app.relayLists).forEach(localSet => {
    const dTag = localSet.tags.find(tag => tag[0] === 'd');
    if (dTag) localDtags.add(dTag[1]);
  });

  events.forEach(event => {
    const dTag = event.tags.find(tag => tag[0] === 'd');
    const dValue = dTag ? dTag[1] : crypto.randomUUID().replace(/-/g, '').slice(0, 15);

    const titleTag = event.tags.find(tag => tag[0] === 'title');
    let title = titleTag ? titleTag[1] : 'Imported Set';

    // Check if d-tag exists locally
    const dtagExists = localDtags.has(dValue);

    if (dtagExists && !allowOverwrite) {
      skippedCount++;
      return; // Skip this one
    }

    // If d-tag exists and we're overwriting, find and update the existing set
    if (dtagExists && allowOverwrite) {
      // Find the set with this d-tag
      const existingSetName = Object.keys(app.relayLists).find(setName => {
        const set = app.relayLists[setName];
        const existingDtag = set.tags.find(tag => tag[0] === 'd');
        return existingDtag && existingDtag[1] === dValue;
      });

      if (existingSetName) {
        // Overwrite the existing set while keeping the d-tag
        app.relayLists[existingSetName] = {
          kind: 30002,
          tags: [...event.tags] // Keep all tags including the original d-tag
        };
        importedCount++;
        return;
      }
    }

    // For new sets, make sure title is unique
    let finalTitle = title;
    let counter = 1;
    while (app.relayLists[finalTitle]) {
      finalTitle = `${title} (${counter})`;
      counter++;
    }

    // Create new set preserving the d-tag
    app.relayLists[finalTitle] = {
      kind: 30002,
      tags: [...event.tags] // This includes the original d-tag
    };
    importedCount++;
  });

  saveRelayLists();
  updateAllNetworkUI();

  if (importedCount > 0 && skippedCount > 0) {
    showTemporaryNotification(`Imported ${importedCount} set${importedCount !== 1 ? 's' : ''}, skipped ${skippedCount} duplicate${skippedCount !== 1 ? 's' : ''}`);
  } else if (importedCount > 0) {
    showTemporaryNotification(`Successfully imported ${importedCount} relay set${importedCount !== 1 ? 's' : ''}!`);
  } else {
    showTemporaryNotification("No new relay sets to import");
  }
}


// =============================================
// MODAL FUNCTIONS
// =============================================

let currentEditingSet = null;

async function editSetMetadata(setName) {
  if (isGlobalSet(setName)) {
    showTemporaryNotification("Cannot edit the global relay set");
    return;
  }

  currentEditingSet = setName;
  const setData = app.relayLists[setName];

  const descriptionTag = setData.tags.find(tag => tag[0] === "description");
  const currentDescription = descriptionTag ? descriptionTag[1] : "";

  const title = "Edit Set Metadata";
  const content = `
    <div class="edit-set-modal">
      <div class="form-group">
        <label for="modalNameInput">Name:</label>
        <input type="text" id="modalNameInput" class="relay-input" value="${escapeHtml(setName)}">
      </div>
      <div class="form-group">
        <label for="modalDescriptionInput">Description:</label>
        <textarea id="modalDescriptionInput" class="relay-input" rows="3" placeholder="Enter a description for this relay set">${escapeHtml(currentDescription)}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" id="modalCancelBtn">Cancel</button>
        <button class="btn-primary" id="modalSaveBtn">Save</button>
      </div>
    </div>
  `;

  const modal = openModal({
    title,
    content,
    size: "medium"
  });

  // Helper function to clean up event listeners
  const cleanup = () => {
    saveBtn?.removeEventListener("click", saveHandler);
    cancelBtn?.removeEventListener("click", cancelHandler);
  };

  const saveHandler = () => {
    cleanup();
    saveModalMetadata();
  };

  const cancelHandler = () => {
    cleanup();
    closeModal();
  };

  const saveBtn = modal.querySelector("#modalSaveBtn");
  const cancelBtn = modal.querySelector("#modalCancelBtn");

  if (saveBtn) saveBtn.addEventListener("click", saveHandler);
  if (cancelBtn) cancelBtn.addEventListener("click", cancelHandler);

  // Also handle Enter key in the name input
  const nameInput = modal.querySelector("#modalNameInput");
  if (nameInput) {
    nameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveHandler();
      }
    });
  }
}


async function saveModalMetadata() {
  const nameInput = document.querySelector("#modalNameInput");
  const descriptionInput = document.querySelector("#modalDescriptionInput");

  const newName = nameInput?.value.trim();
  const newDescription = descriptionInput?.value.trim() || "";

  if (!newName) {
    showTemporaryNotification("Please enter a name");
    return;
  }

  if (currentEditingSet) {
    let setData = app.relayLists[currentEditingSet]; // Use 'let' instead of 'const'

    // Check if renaming
    if (newName !== currentEditingSet) {
      if (app.relayLists[newName]) {
        showTemporaryNotification("A set with this name already exists");
        return;
      }

      // Rename the set
      app.relayLists[newName] = { ...setData };
      delete app.relayLists[currentEditingSet];

      if (app.activeRelayList === currentEditingSet) {
        app.activeRelayList = newName;
      }

      setData = app.relayLists[newName]; // Now update the reference
    }

    // Update title tag
    const titleTagIndex = setData.tags.findIndex(tag => tag[0] === "title");
    if (titleTagIndex !== -1) {
      setData.tags[titleTagIndex] = ["title", newName];
    } else {
      setData.tags.push(["title", newName]);
    }

    // Update or add description tag
    const descTagIndex = setData.tags.findIndex(tag => tag[0] === "description");
    if (descTagIndex !== -1) {
      setData.tags[descTagIndex] = ["description", newDescription];
    } else {
      setData.tags.push(["description", newDescription]);
    }
  }

  saveRelayLists();
  updateAllNetworkUI();
  closeModal();
  showTemporaryNotification("Metadata updated");
}

async function showConfirmDialog(title, message, callback) {
  const confirmed = await confirmModal(message, title);
  if (confirmed && callback) {
    callback();
  }
}

function deleteRelaySet(setName) {
  if (setName === app.activeRelayList) {
    showTemporaryNotification("Cannot delete the active relay set");
    return;
  }

  showConfirmDialog(
    "Delete Relay Set",
    `Are you sure you want to delete the "${setName}" relay set?`,
    () => {
      delete app.relayLists[setName];
      saveRelayLists();
      updateAllNetworkUI(); // Use centralized update
      showTemporaryNotification("Relay set deleted");
    }
  );
}



function updateAllNetworkUI() {
  populateActiveSetDropdown();
  renderSetInfo();
  renderActiveRelaySet();
  updateButtonVisibility();
  updateSidebar();
  updateDrawerContent();
}



/////////////////////////////
// global relay set

const GLOBAL_SET_NAME = "🌐 All Relays (Global)";

function generateGlobalRelaySet() {
  const allRelays = new Set();

  // Collect all relays from all sets (except the global one)
  Object.entries(app.relayLists).forEach(([setName, setData]) => {
    if (setName !== GLOBAL_SET_NAME) {
      setData.tags
        .filter(tag => tag[0] === "relay")
        .forEach(tag => allRelays.add(tag[1]));
    }
  });

  // Create the global set structure
  return {
    kind: 30002,
    tags: [
      ["d", "global-relay-set"],
      ["title", GLOBAL_SET_NAME],
      ["description", "Aggregated view of all relays from all sets"],
      ...Array.from(allRelays).map(relay => ["relay", relay])
    ],
    isGlobal: true // Flag to identify this as the global set
  };
}


// Helper function to get relay lists including the global set
function getRelayListsWithGlobal() {
  const lists = { ...app.relayLists };
  lists[GLOBAL_SET_NAME] = generateGlobalRelaySet();
  return lists;
}

function updateButtonVisibility() {
  const editBtn = document.getElementById("editActiveSetMetadataBtn");
  const shareBtn = document.getElementById("shareActiveSetBtn");
  const deleteBtn = document.getElementById("deleteActiveSetBtn");

  if (editBtn && shareBtn && deleteBtn) {
    const shouldHide = isGlobalSet(app.activeRelayList);
    editBtn.style.display = shouldHide ? 'none' : '';
    shareBtn.style.display = shouldHide ? 'none' : '';
    deleteBtn.style.display = shouldHide ? 'none' : '';

    // Also hide delete button if it's the only regular set
    const regularSets = Object.keys(app.relayLists).filter(set => !isGlobalSet(set));
    if (regularSets.length <= 1) {
      deleteBtn.style.display = 'none';
    }
  }
}



////////////////////////////
// ALLOWED MEDIA SERVERS
////////////////////////////

function setupMediaWhitelistSettings(container) {
  renderWhitelistDomains(container);

  const addDomainBtn = container.querySelector(".add-domain-btn");
  const addDomainForm = container.querySelector(".add-domain-form");
  const domainInput = container.querySelector(".domain-input");
  const confirmAddBtn = container.querySelector(".confirm-add-btn");
  const cancelAddBtn = container.querySelector(".cancel-add-btn");

  addDomainBtn.addEventListener("click", () => {
    addDomainForm.style.display = "flex";
    domainInput.focus();
  });

  cancelAddBtn.addEventListener("click", () => {
    addDomainForm.style.display = "none";
    domainInput.value = "";
  });

  confirmAddBtn.addEventListener("click", () => {
    const domain = domainInput.value.trim().toLowerCase();
    if (addDomainToWhitelistManually(domain)) {
      renderWhitelistDomains(container);
      addDomainForm.style.display = "none";
      domainInput.value = "";
    }
  });

  domainInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      confirmAddBtn.click();
    } else if (e.key === "Escape") {
      cancelAddBtn.click();
    }
  });
}

function renderWhitelistDomains(container) {
  const domainsContainer = container.querySelector("#whitelistDomainsContainer");
  if (!domainsContainer) return;

  const domains = app.mediaServerWhitelist;

  if (domains.length === 0) {
    domainsContainer.innerHTML = '<div class="empty-whitelist">No trusted domains added yet.</div>';
    return;
  }

  domainsContainer.innerHTML = domains
    .map((domain, index) => createDomainItemHTML(domain, index))
    .join("");

  // Add remove event listeners
  domainsContainer.querySelectorAll(".remove-domain-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const domainItem = e.target.closest(".domain-item");
      const domain = domainItem.dataset.domain;
      removeDomainFromWhitelist(domain);
      renderWhitelistDomains(container);
    });
  });
}

function createDomainItemHTML(domain, index) {
  // Get ping data from dataset if available
  const domainElement = document.querySelector(`[data-domain="${domain}"]`);
  const pingTime = domainElement?.dataset.pingTime || '';
  const pingStatus = domainElement?.dataset.pingStatus || '';

  let statusHTML = '';
  if (pingStatus === 'checking') {
    statusHTML = '<span class="ping-status status-checking">Checking...</span>';
  } else if (pingTime) {
    const timeClass = getPingTimeClass(parseInt(pingTime));
    const statusClass = getStatusClassFromTime(parseInt(pingTime));
    statusHTML = `
      <span class="ping-status ${statusClass}">${getPingStatusText(statusClass)}</span>
      <span class="ping-time ${timeClass}">${pingTime}ms</span>
    `;
  }

  return `
    <div class="domain-item" data-domain="${escapeHtml(domain)}" data-index="${index}" data-ping-time="${pingTime}" data-ping-status="${pingStatus}">
      <div class="domain-info">
        <div class="domain-name-row">
          <span class="domain-name">${escapeHtml(domain)}</span>
          <span class="domain-index">#${index + 1}</span>
        </div>
        <div class="domain-ping-info">
          ${statusHTML}
        </div>
      </div>
      <div class="domain-actions">
        <button class="remove-domain-btn">Remove</button>
      </div>
    </div>
  `;
}

function getPingTimeClass(time) {
  if (time < 300) return 'ping-fast';
  if (time < 1000) return 'ping-medium';
  if (time < 2000) return 'ping-slow';
  return 'ping-very-slow';
}

function getStatusClassFromTime(time) {
  if (time < 1000) return 'status-online';
  if (time < 2000) return 'status-slow';
  return 'status-very-slow';
}

function getPingStatusText(statusClass) {
  switch (statusClass) {
    case 'status-online': return '✓ Fast';
    case 'status-slow': return '⚠ Slow';
    case 'status-very-slow': return '⚠ Very Slow';
    case 'status-offline': return '✗ Offline';
    default: return '';
  }
}

function addDomainToWhitelistManually(domain) {
  if (!domain) {
    showTemporaryNotification("Please enter a domain");
    return false;
  }

  const normalizedDomain = normalizeDomain(domain);

  if (!isValidDomain(normalizedDomain)) {
    showTemporaryNotification("Please enter a valid domain format (e.g., cdn.example.com)");
    return false;
  }

  if (app.mediaServerWhitelist.includes(normalizedDomain)) {
    showTemporaryNotification("Domain is already in the whitelist");
    return false;
  }

  app.mediaServerWhitelist.push(normalizedDomain);
  localStorage.setItem("mediaServerWhitelist", JSON.stringify(app.mediaServerWhitelist));
  showTemporaryNotification(`Added ${normalizedDomain} to whitelist`);
  return true;
}

function removeDomainFromWhitelist(domain) {
  const index = app.mediaServerWhitelist.indexOf(domain);
  if (index > -1) {
    app.mediaServerWhitelist.splice(index, 1);
    localStorage.setItem("mediaServerWhitelist", JSON.stringify(app.mediaServerWhitelist));
    showTemporaryNotification(`Removed ${domain} from whitelist`);
  }
}

function isValidDomain(domain) {
  domain = domain.trim().toLowerCase();
  domain = domain.replace(/^(https?:\/\/)?/, '');
  domain = domain.replace(/\/$/, '');

  if (domain.includes('/')) return false;

  const withPortRegex = /^([a-z0-9.-]+|\[[a-f0-9:]+\])(:\d+)?$/i;
  if (!withPortRegex.test(domain)) return false;

  const domainPart = domain.split(':')[0];
  const domainRegex = /^(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[[a-f0-9:]+\])$/i;

  if (!domainRegex.test(domainPart)) return false;

  if (domainPart.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    const parts = domainPart.split('.');
    if (parts.some(part => parseInt(part) > 255)) return false;
  }

  return true;
}

function normalizeDomain(domain) {
  let normalized = domain.trim().toLowerCase();
  normalized = normalized.replace(/^(https?:\/\/)?/, '');
  normalized = normalized.replace(/\/$/, '');
  normalized = normalized.split('/')[0];
  return normalized;
}

// Main check all function - pings and sorts automatically
async function checkAllServers() {
  const container = document.querySelector(".allowed-servers-container");
  if (!container) return;

  const domains = app.mediaServerWhitelist;
  if (domains.length === 0) {
    showTemporaryNotification("No servers to check");
    return;
  }

  const checkButton = document.getElementById("checkAllServersBtn");
  if (checkButton) {
    checkButton.disabled = true;
    checkButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinner">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
      Checking...
    `;
  }

  // Mark all as checking
  const domainItems = container.querySelectorAll('.domain-item');
  domainItems.forEach(item => {
    item.dataset.pingStatus = 'checking';
    const pingInfo = item.querySelector('.domain-ping-info');
    if (pingInfo) {
      pingInfo.innerHTML = '<span class="ping-status status-checking">Checking...</span>';
    }
  });

  // Ping all servers and update as results come in
  const results = [];
  for (const domain of domains) {
    try {
      const result = await pingServer(domain);
      results.push({ domain, ...result });

      // Update this specific domain immediately
      const domainItem = container.querySelector(`[data-domain="${domain}"]`);
      if (domainItem && result.time) {
        domainItem.dataset.pingTime = result.time;
        domainItem.dataset.pingStatus = result.status;
        const pingInfo = domainItem.querySelector('.domain-ping-info');
        const timeClass = getPingTimeClass(result.time);
        const statusClass = getStatusClassFromTime(result.time);
        if (pingInfo) {
          pingInfo.innerHTML = `
            <span class="ping-status ${statusClass}">${getPingStatusText(statusClass)}</span>
            <span class="ping-time ${timeClass}">${result.time}ms</span>
          `;
        }
      } else if (domainItem) {
        domainItem.dataset.pingStatus = 'offline';
        const pingInfo = domainItem.querySelector('.domain-ping-info');
        if (pingInfo) {
          pingInfo.innerHTML = '<span class="ping-status status-offline">✗ Offline</span>';
        }
      }
    } catch (error) {
      results.push({ domain, time: null, status: 'offline' });
      const domainItem = container.querySelector(`[data-domain="${domain}"]`);
      if (domainItem) {
        domainItem.dataset.pingStatus = 'offline';
        const pingInfo = domainItem.querySelector('.domain-ping-info');
        if (pingInfo) {
          pingInfo.innerHTML = '<span class="ping-status status-offline">✗ Offline</span>';
        }
      }
    }
  }

  // Sort the list
  sortDomainsByPing(container);

  // Re-enable button
  if (checkButton) {
    checkButton.disabled = false;
    checkButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
      </svg>
      Check All Servers
    `;
  }

  const onlineCount = results.filter(r => r.time !== null).length;
  showTemporaryNotification(`Check complete: ${onlineCount}/${domains.length} servers responding`);
}

async function pingServer(domain) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeout = 3000;
    let resolved = false;

    const protocols = ['https://', 'http://'];
    let currentProtocol = 0;

    const tryPing = () => {
      if (currentProtocol >= protocols.length) {
        if (!resolved) {
          resolved = true;
          resolve({ time: null, status: 'offline' });
        }
        return;
      }

      const url = protocols[currentProtocol] + domain;
      const controller = new AbortController();

      const timeoutId = setTimeout(() => {
        controller.abort();
        currentProtocol++;
        tryPing();
      }, timeout);

      fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache'
      })
        .then(() => {
          clearTimeout(timeoutId);
          if (!resolved) {
            resolved = true;
            const pingTime = Date.now() - startTime;
            let status = 'online';
            if (pingTime >= 1000) status = 'slow';
            if (pingTime >= 2000) status = 'very-slow';
            resolve({ time: pingTime, status });
          }
        })
        .catch(() => {
          clearTimeout(timeoutId);
          currentProtocol++;
          tryPing();
        });
    };

    tryPing();
  });
}

function sortDomainsByPing(container) {
  const domainsContainer = container.querySelector("#whitelistDomainsContainer");
  if (!domainsContainer) return;

  const items = Array.from(domainsContainer.querySelectorAll('.domain-item'));

  items.sort((a, b) => {
    const timeA = parseInt(a.dataset.pingTime) || 999999;
    const timeB = parseInt(b.dataset.pingTime) || 999999;
    const statusA = a.dataset.pingStatus;
    const statusB = b.dataset.pingStatus;

    // Offline items go to the end
    if (statusA === 'offline' && statusB !== 'offline') return 1;
    if (statusB === 'offline' && statusA !== 'offline') return -1;
    if (statusA === 'offline' && statusB === 'offline') return 0;

    // Sort by time
    return timeA - timeB;
  });

  // Re-append in sorted order and update indices
  items.forEach((item, index) => {
    item.dataset.index = index;
    const indexSpan = item.querySelector('.domain-index');
    if (indexSpan) {
      indexSpan.textContent = `#${index + 1}`;
    }
    domainsContainer.appendChild(item);
  });
}

function setupAllowedServersEventListeners() {
  const checkAllBtn = document.getElementById("checkAllServersBtn");

  if (checkAllBtn) {
    checkAllBtn.addEventListener("click", checkAllServers);
  }
}



//////////////
function loadLocalOutboxRelays() {
  try {
    const stored = localStorage.getItem("outboxRelays");
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("Error loading outbox relays:", e);
    return null;
  }
}

function saveLocalOutboxRelays(relays) {
  try {
    localStorage.setItem("outboxRelays", JSON.stringify(relays));
    console.log("Saved local outbox relays");
  } catch (e) {
    console.error("Error saving outbox relays:", e);
  }
}


function renderOutboxRelays() {
  const container = document.getElementById("outboxRelaysList");
  if (!container) return;

  const outboxRelays = loadLocalOutboxRelays();

  if (!outboxRelays || outboxRelays.length === 0) {
    container.innerHTML = '<p class="no-relays">No outbox relays configured.</p>';
    return;
  }

  container.innerHTML = outboxRelays
    .map((relay, index) => createOutboxRelayItemHTML(relay, index))
    .join("");
}

function createOutboxRelayItemHTML(relay, index) {
  const { url, marker } = relay;
  const markerBadge = marker
    ? `<span class="relay-marker-badge marker-${marker}">${marker}</span>`
    : '<span class="relay-marker-badge marker-both">read & write</span>';

  return `
    <div class="outbox-relay-item" data-relay="${url}" data-index="${index}">
      <div class="outbox-relay-header">
        <div class="outbox-relay-main-info">
          <div class="relay-url">${url}</div>
          ${markerBadge}
        </div>
      </div>
      
      <div class="outbox-relay-actions">
        <button class="btn btn-secondary change-marker-btn" data-index="${index}">
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
</svg>
          <span>Change Marker</span>
        </button>
        <button class="btn btn-danger remove-outbox-relay-btn" data-index="${index}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>        
          <span>Remove</span>
        </button>
      </div>
    </div>
  `;
}

function addOutboxRelay() {
  const input = document.getElementById("newOutboxRelayInput");
  const markerSelect = document.getElementById("outboxRelayMarker");
  const url = input.value.trim();
  const marker = markerSelect.value;

  if (!url) {
    showTemporaryNotification("Please enter a relay URL");
    return;
  }

  const normalizedUrl = normalizeRelayUrl(url);
  let outboxRelays = loadLocalOutboxRelays() || [];

  const isDuplicate = outboxRelays.some(r => isUrlEquivalent(r.url, normalizedUrl));

  if (isDuplicate) {
    showTemporaryNotification("Relay already exists in your outbox list");
    return;
  }

  outboxRelays.push({ url: normalizedUrl, marker: marker || null });
  saveLocalOutboxRelays(outboxRelays);
  renderOutboxRelays();
  setupOutboxEventListeners();
  input.value = "";
  markerSelect.value = "";
  showTemporaryNotification("Relay added successfully");
}

function removeOutboxRelay(index) {
  const outboxRelays = loadLocalOutboxRelays() || [];
  const relay = outboxRelays[index];

  if (confirm(`Remove relay: ${relay.url}?`)) {
    outboxRelays.splice(index, 1);
    saveLocalOutboxRelays(outboxRelays);
    renderOutboxRelays();
    setupOutboxEventListeners();
    showTemporaryNotification("Relay removed");
  }
}

function changeRelayMarker(index) {
  const outboxRelays = loadLocalOutboxRelays() || [];
  const relay = outboxRelays[index];

  const markers = [
    { value: null, label: "Read & Write" },
    { value: "read", label: "Read Only" },
    { value: "write", label: "Write Only" }
  ];

  const currentIndex = markers.findIndex(m => m.value === relay.marker);
  const nextIndex = (currentIndex + 1) % markers.length;

  relay.marker = markers[nextIndex].value;
  saveLocalOutboxRelays(outboxRelays);
  renderOutboxRelays();
  setupOutboxEventListeners();
  showTemporaryNotification(`Marker changed to: ${markers[nextIndex].label}`);
}

async function importOutboxRelays() {
  if (!app.myPk) {
    showTemporaryNotification("You must be logged in to import your outbox list");
    return;
  }

  showTemporaryNotification("Fetching your published outbox list...");

  try {
    const extendedRelays = await getExtendedRelaysForProfile(app.myPk);
    const allRelays = [...new Set([...app.globalRelays, ...extendedRelays])];

    const outboxEvents = await NostrClient.getEvents({
      kinds: [10002],
      authors: [app.myPk],
      limit: 1
    }, allRelays);

    if (!outboxEvents || outboxEvents.length === 0) {
      showTemporaryNotification("No published outbox list found");
      return;
    }

    const latestEvent = outboxEvents.sort((a, b) => b.created_at - a.created_at)[0];
    const relayTags = latestEvent.tags.filter(tag => tag[0] === 'r');

    const publishedRelays = relayTags.map(tag => ({
      url: tag[1],
      marker: tag[2] || null
    }));

    showImportOutboxModal(publishedRelays);

  } catch (error) {
    console.error("Error importing outbox relays:", error);
    showTemporaryNotification("Failed to import outbox relays: " + error.message);
  }
}

function showImportOutboxModal(publishedRelays) {
  const localRelays = loadLocalOutboxRelays() || [];

  const newRelays = publishedRelays.filter(pr =>
    !localRelays.some(lr => isUrlEquivalent(lr.url, pr.url))
  );

  const conflictingRelays = publishedRelays.filter(pr =>
    localRelays.some(lr => {
      if (!isUrlEquivalent(lr.url, pr.url)) return false;
      return lr.marker !== pr.marker;
    })
  );

  const hasConflicts = conflictingRelays.length > 0;

  const relaysList = publishedRelays.map(r => {
    const markerText = r.marker ? ` (${r.marker})` : ' (read & write)';
    return `<li><strong>${escapeHtml(r.url)}</strong>${markerText}</li>`;
  }).join('');

  const conflictsList = conflictingRelays.map(r => {
    const markerText = r.marker ? ` (${r.marker})` : ' (read & write)';
    const local = localRelays.find(lr => isUrlEquivalent(lr.url, r.url));
    const localMarkerText = local.marker ? ` (${local.marker})` : ' (read & write)';
    return `<li><strong>${escapeHtml(r.url)}</strong> - Local${localMarkerText} → Published${markerText}</li>`;
  }).join('');

  const content = `
    <div class="import-outbox-modal">
      <div class="import-summary">
        <p><strong>Found ${publishedRelays.length} relay${publishedRelays.length !== 1 ? 's' : ''} in your published list:</strong></p>
        
        ${newRelays.length > 0 ? `<p>✅ ${newRelays.length} new relay${newRelays.length !== 1 ? 's' : ''} will be imported</p>` : ''}
        
        ${hasConflicts ? `
          <div class="conflict-warning">
            <p>⚠️ ${conflictingRelays.length} relay${conflictingRelays.length !== 1 ? 's have' : ' has'} different markers:</p>
            <ul>${conflictsList}</ul>
            <p><strong>Do you want to overwrite local markers with published ones?</strong></p>
          </div>
        ` : ''}
        
        ${!hasConflicts && newRelays.length === 0 ? `
          <p>✓ Your local list is already in sync with your published list!</p>
        ` : ''}
      </div>
      <div class="import-actions">
        <button class="btn-secondary" id="modalCancelBtn">Cancel</button>
        ${hasConflicts ? `
          <button class="btn-secondary" id="modalImportNewOnlyBtn">Import New Only</button>
          <button class="btn-primary" id="modalImportAllBtn">Import All (Overwrite)</button>
        ` : newRelays.length > 0 ? `
          <button class="btn-primary" id="modalImportAllBtn">Import New</button>
        ` : ''}
      </div>
    </div>
  `;

  const modal = openModal({
    title: "Import Outbox Relays",
    content,
    size: "medium"
  });

  modal.querySelector("#modalCancelBtn").addEventListener("click", closeModal);

  const importAllBtn = modal.querySelector("#modalImportAllBtn");
  if (importAllBtn) {
    importAllBtn.addEventListener("click", () => {
      performOutboxImport(publishedRelays, true);
      closeModal();
    });
  }

  const importNewOnlyBtn = modal.querySelector("#modalImportNewOnlyBtn");
  if (importNewOnlyBtn) {
    importNewOnlyBtn.addEventListener("click", () => {
      performOutboxImport(publishedRelays, false);
      closeModal();
    });
  }
}

function performOutboxImport(publishedRelays, allowOverwrite) {
  const localRelays = loadLocalOutboxRelays() || [];
  let importedCount = 0;
  let updatedCount = 0;

  publishedRelays.forEach(pr => {
    const existingIndex = localRelays.findIndex(lr => isUrlEquivalent(lr.url, pr.url));

    if (existingIndex === -1) {
      // New relay
      localRelays.push(pr);
      importedCount++;
    } else if (allowOverwrite && localRelays[existingIndex].marker !== pr.marker) {
      // Update marker
      localRelays[existingIndex].marker = pr.marker;
      updatedCount++;
    }
  });

  saveLocalOutboxRelays(localRelays);
  renderOutboxRelays();
  setupOutboxEventListeners();

  let message = '';
  if (importedCount > 0) message += `Imported ${importedCount} new relay${importedCount !== 1 ? 's' : ''}`;
  if (updatedCount > 0) {
    if (message) message += ', ';
    message += `updated ${updatedCount} marker${updatedCount !== 1 ? 's' : ''}`;
  }
  if (!message) message = 'No changes needed';

  showTemporaryNotification(message);
}

async function shareOutboxRelays() {
  const outboxRelays = loadLocalOutboxRelays() || [];

  if (outboxRelays.length === 0) {
    showTemporaryNotification("No outbox relays to share");
    return;
  }

  publishOutboxToNostr(outboxRelays);

}


async function publishOutboxToNostr(outboxRelays) {
  try {
    //  showTemporaryNotification("Publishing outbox list...");

    const tags = outboxRelays.map(r => {
      const tag = ['r', r.url];
      if (r.marker) tag.push(r.marker);
      return tag;
    });

    const eventData = {
      kind: 10002,
      created_at: Math.floor(Date.now() / 1000),
      content: "",
      tags: tags
    };

    console.log("Outbox event data:", eventData);

    const signedEvent = await handleEventSigning(eventData);
    console.log("Outbox event signed successfully!");

    const result = await publishEvent(signedEvent, app.globalRelays, {
      successMessage: "✅ Outbox list shared successfully!",
      errorMessage: "Failed to publish outbox list"
    });

    if (result.success) {
      console.dir(signedEvent, { depth: null });
      showTemporaryNotification("Event published successfully!");
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error("Error publishing outbox list:", error);
    showTemporaryNotification("❌ Failed to publish outbox list: " + error.message);
  }
}

function setupOutboxEventListeners() {
  const container = document.getElementById("outboxRelaysList");
  if (!container) return;

  container.querySelectorAll(".remove-outbox-relay-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.closest("button").dataset.index);
      removeOutboxRelay(index);
    });
  });

  container.querySelectorAll(".change-marker-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.closest("button").dataset.index);
      changeRelayMarker(index);
    });
  });
}


///////////////////

function loadLocalBlossomServers() {
  try {
    const stored = localStorage.getItem("blossomServers");
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("Error loading blossom servers:", e);
    return null;
  }
}

function saveLocalBlossomServers(servers) {
  try {
    localStorage.setItem("blossomServers", JSON.stringify(servers));
    console.log("Saved local blossom servers");
  } catch (e) {
    console.error("Error saving blossom servers:", e);
  }
}

function renderBlossomServers() {
  const container = document.getElementById("blossomServersList");
  if (!container) return;

  const blossomServers = loadLocalBlossomServers();

  if (!blossomServers || blossomServers.length === 0) {
    container.innerHTML = '<p class="no-relays">No blossom servers configured.</p>';
    return;
  }

  container.innerHTML = blossomServers
    .map((server, index) => createBlossomServerItemHTML(server, index))
    .join("");

  // Auto-ping servers after rendering
  blossomServers.forEach((server, index) => {
    setTimeout(() => pingBlossomServer(server.url, index), 100 * index);
  });
}

function createBlossomServerItemHTML(server, index) {
  const { url } = server;

  return `
    <div class="blossom-server-item" data-server="${url}" data-index="${index}">
      <div class="blossom-server-header">
        <div class="blossom-server-main-info">
          <div class="server-url">${url}</div>
          <div class="server-ping-status" id="blossom-ping-${index}">
            <span class="ping-indicator">⏳</span>
            <span class="ping-latency"></span>
          </div>
        </div>
      </div>
      
      <div class="blossom-server-actions">
        <button class="btn btn-secondary ping-blossom-btn" data-index="${index}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>        
          <span>Ping</span>
        </button>
        <button class="btn btn-secondary visit-blossom-btn" data-index="${index}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 13.5V9M15 9H10.5M15 9L9.00019 14.9999M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
          </svg>        
          <span>Visit</span>
        </button>
        <button class="btn btn-danger remove-blossom-btn" data-index="${index}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>        
          <span>Remove</span>
        </button>
      </div>
    </div>
  `;
}

async function pingBlossomServer(url, index) {
  const statusContainer = document.getElementById(`blossom-ping-${index}`);
  if (!statusContainer) return;

  const indicator = statusContainer.querySelector('.ping-indicator');
  const latencySpan = statusContainer.querySelector('.ping-latency');

  if (indicator) {
    indicator.textContent = "⏳";
    indicator.title = "Pinging...";
  }
  if (latencySpan) {
    latencySpan.textContent = "";
  }

  try {
    const testHash = "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553";
    const testUrl = `${url}/${testHash}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const startTime = performance.now();
    const response = await fetch(testUrl, {
      method: "HEAD",
      signal: controller.signal,
    });
    const endTime = performance.now();

    clearTimeout(timeoutId);

    const pingTime = Math.round(endTime - startTime);

    if (indicator) {
      if (response.ok || response.status === 404) {
        indicator.textContent = "✓";
        indicator.title = `Online (${pingTime}ms)`;
        indicator.style.color = "#22c55e";
      } else if (response.status === 401 || response.status === 403) {
        indicator.textContent = "🔐";
        indicator.title = `Requires Authentication (${pingTime}ms)`;
        indicator.style.color = "#3b82f6";
      } else if (response.status === 402) {
        indicator.textContent = "💰";
        indicator.title = `Requires Payment (${pingTime}ms)`;
        indicator.style.color = "#f59e0b";
      } else {
        indicator.textContent = "⚠";
        const reason = response.headers.get("X-Reason") || `HTTP ${response.status}`;
        indicator.title = `${reason} (${pingTime}ms)`;
        indicator.style.color = "#f59e0b";
      }
    }

    if (latencySpan) {
      latencySpan.textContent = `${pingTime}ms`;
      if (pingTime < 300) {
        latencySpan.style.color = "#22c55e";
      } else if (pingTime < 1000) {
        latencySpan.style.color = "#f59e0b";
      } else {
        latencySpan.style.color = "#ef4444";
      }
    }

    console.log(`✓ Blossom ping result: ${url} (${pingTime}ms, status: ${response.status})`);
  } catch (error) {
    if (indicator) {
      indicator.textContent = "✗";
      indicator.title = `Offline or unreachable: ${error.message}`;
      indicator.style.color = "#ef4444";
    }
    if (latencySpan) {
      latencySpan.textContent = "";
    }
    console.log(`✗ Blossom ping failed: ${url} - ${error.message}`);
  }
}

function addBlossomServer() {
  const input = document.getElementById("newBlossomServerInput");
  const url = input.value.trim();

  if (!url) {
    showTemporaryNotification("Please enter a server URL");
    return;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    showTemporaryNotification("Invalid URL format");
    return;
  }

  // Ensure it's https
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    showTemporaryNotification("URL must start with https:// or http://");
    return;
  }

  let blossomServers = loadLocalBlossomServers() || [];

  const isDuplicate = blossomServers.some(s => s.url === url);

  if (isDuplicate) {
    showTemporaryNotification("Server already exists in your list");
    return;
  }

  blossomServers.push({ url });
  saveLocalBlossomServers(blossomServers);
  renderBlossomServers();
  setupBlossomEventListeners();
  input.value = "";
  showTemporaryNotification("Server added successfully");
}

function removeBlossomServer(index) {
  const blossomServers = loadLocalBlossomServers() || [];
  const server = blossomServers[index];

  if (confirm(`Remove server: ${server.url}?`)) {
    blossomServers.splice(index, 1);
    saveLocalBlossomServers(blossomServers);
    renderBlossomServers();
    setupBlossomEventListeners();
    showTemporaryNotification("Server removed");
  }
}

function visitBlossomServer(index) {
  const blossomServers = loadLocalBlossomServers() || [];
  const server = blossomServers[index];

  if (server && server.url) {
    window.open(server.url, '_blank');
  }
}

async function importBlossomServers() {
  if (!app.myPk) {
    showTemporaryNotification("You must be logged in to import your blossom servers");
    return;
  }

  showTemporaryNotification("Fetching your published blossom servers...");

  try {
    const extendedRelays = await getExtendedRelaysForProfile(app.myPk);
    const allRelays = [...new Set([...app.globalRelays, ...extendedRelays])];

    const blossomEvents = await NostrClient.getEvents({
      kinds: [10063],
      authors: [app.myPk],
      limit: 1
    }, allRelays);

    if (!blossomEvents || blossomEvents.length === 0) {
      showTemporaryNotification("No published blossom server list found");
      return;
    }

    const latestEvent = blossomEvents.sort((a, b) => b.created_at - a.created_at)[0];
    const serverTags = latestEvent.tags.filter(tag => tag[0] === 'server');

    const publishedServers = serverTags.map(tag => ({
      url: tag[1]
    }));

    if (publishedServers.length === 0) {
      showTemporaryNotification("No servers found in published event");
      return;
    }

    showImportBlossomModal(publishedServers);

  } catch (error) {
    console.error("Error importing blossom servers:", error);
    showTemporaryNotification("Failed to import blossom servers: " + error.message);
  }
}

function showImportBlossomModal(publishedServers) {
  const localServers = loadLocalBlossomServers() || [];

  const newServers = publishedServers.filter(ps =>
    !localServers.some(ls => ls.url === ps.url)
  );

  const serversList = publishedServers.map(s =>
    `<li><strong>${escapeHtml(s.url)}</strong></li>`
  ).join('');

  const content = `
    <div class="import-blossom-modal">
      <div class="import-summary">
        <p><strong>Found ${publishedServers.length} server${publishedServers.length !== 1 ? 's' : ''} in your published list:</strong></p>
        <ul>${serversList}</ul>
        
        ${newServers.length > 0 ? `
          <p>✅ ${newServers.length} new server${newServers.length !== 1 ? 's' : ''} will be imported</p>
        ` : `
          <p>✓ All servers from your published list are already in your local list!</p>
        `}
      </div>
      <div class="import-actions">
        <button class="btn-secondary" id="modalCancelBtn">Cancel</button>
        ${newServers.length > 0 ? `
          <button class="btn-primary" id="modalImportBtn">Import New Servers</button>
        ` : ''}
        <button class="btn-primary" id="modalOverwriteBtn">Overwrite Local List</button>
      </div>
    </div>
  `;

  const modal = openModal({
    title: "Import Blossom Servers",
    content,
    size: "medium"
  });

  modal.querySelector("#modalCancelBtn").addEventListener("click", closeModal);

  const importBtn = modal.querySelector("#modalImportBtn");
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      performBlossomImport(publishedServers, false);
      closeModal();
    });
  }

  const overwriteBtn = modal.querySelector("#modalOverwriteBtn");
  if (overwriteBtn) {
    overwriteBtn.addEventListener("click", () => {
      performBlossomImport(publishedServers, true);
      closeModal();
    });
  }
}

function performBlossomImport(publishedServers, overwrite) {
  if (overwrite) {
    // Replace entire local list
    saveLocalBlossomServers(publishedServers);
    renderBlossomServers();
    setupBlossomEventListeners();
    showTemporaryNotification(`Imported ${publishedServers.length} server${publishedServers.length !== 1 ? 's' : ''} (overwrite)`);
  } else {
    // Add only new servers
    const localServers = loadLocalBlossomServers() || [];
    let addedCount = 0;

    publishedServers.forEach(ps => {
      if (!localServers.some(ls => ls.url === ps.url)) {
        localServers.push(ps);
        addedCount++;
      }
    });

    saveLocalBlossomServers(localServers);
    renderBlossomServers();
    setupBlossomEventListeners();

    if (addedCount > 0) {
      showTemporaryNotification(`Imported ${addedCount} new server${addedCount !== 1 ? 's' : ''}`);
    } else {
      showTemporaryNotification("No new servers to import");
    }
  }
}

async function shareBlossomServers() {
  const blossomServers = loadLocalBlossomServers() || [];

  if (blossomServers.length === 0) {
    showTemporaryNotification("No blossom servers to share");
    return;
  }

  publishBlossomToNostr(blossomServers);
}



async function publishBlossomToNostr(blossomServers) {
  try {
    showTemporaryNotification("Publishing blossom server list...");

    const tags = blossomServers.map(s => ['server', s.url]);

    const eventData = {
      kind: 10063,
      created_at: Math.floor(Date.now() / 1000),
      content: "",
      tags: tags
    };

    console.log("Blossom event data:", eventData);

    const signedEvent = await handleEventSigning(eventData);
    console.log("Blossom event signed successfully!");

    const result = await publishEvent(signedEvent, app.globalRelays, {
      successMessage: "✅ Blossom server list shared successfully!",
      errorMessage: "Failed to publish blossom server list"
    });

    if (result.success) {
      console.dir(signedEvent, { depth: null });
      showTemporaryNotification("Event published successfully!");
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error("Error publishing blossom server list:", error);
    showTemporaryNotification("❌ Failed to publish blossom server list: " + error.message);
  }
}

function setupBlossomEventListeners() {
  const container = document.getElementById("blossomServersList");
  if (!container) return;

  container.querySelectorAll(".remove-blossom-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.closest("button").dataset.index);
      removeBlossomServer(index);
    });
  });

  container.querySelectorAll(".ping-blossom-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const index = parseInt(e.target.closest("button").dataset.index);
      const blossomServers = loadLocalBlossomServers() || [];
      const server = blossomServers[index];
      if (server) {
        await pingBlossomServer(server.url, index);
      }
    });
  });

  container.querySelectorAll(".visit-blossom-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.closest("button").dataset.index);
      visitBlossomServer(index);
    });
  });
}