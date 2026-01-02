async function networkSettingsPageHandler() {
  try {
    mainContent.innerHTML = `
<div class="network-container-container">
    <button class="relay-set-discovery-btn" id="relay-set-discovery-btn">
      Discover <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
</svg>

    </button>
<div class="network-container">
  <!-- Tab Navigation -->
  <div class="network-tab-nav">
    <button class="network-tab-button active" data-tab="active-set">
      Content relay sets
    </button>
    <button class="network-tab-button" data-tab="placeholder-1" style="display: none;">1</button>
    <button class="network-tab-button" data-tab="placeholder-2" style="display: none;">2</button>

  </div>

  <!-- Active Set Tab -->
  <div class="network-tab-content active" id="active-set-tab">
<div class="active-set-header">
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
  <button id="createNewSetBtn" class="btn-primary">Create New</button>
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

  <!-- Placeholder Tab 1 -->
  <div class="network-tab-content" id="placeholder-1-tab">
    <div class="placeholder-content">
      <p>Placeholder for future features</p>
    </div>
  </div>

  <!-- Placeholder Tab 2 -->
  <div class="network-tab-content" id="placeholder-2-tab">
    <div class="placeholder-content">
      <p>Placeholder for future features</p>
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

// New function to render set info (relay count and description)
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
  
  // Create new set button
  document.getElementById("createNewSetBtn").addEventListener("click", createNewEmptySet);

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
  if (relayDoc.supported_nips?.length > 0) {
    // Sort NIPs numerically for better display
    const sortedNips = [...relayDoc.supported_nips].sort((a, b) => a - b);
    
    // Show all NIPs with tooltips
    sortedNips.forEach(nip => {
      badges.push(`<span class="badge badge-info" title="NIP-${nip}">NIP-${nip}</span>`);
    });
  }
  
  // Add limitation badges
  if (relayDoc.limitation?.auth_required) {
    badges.push('<span class="badge badge-warning">Auth</span>');
  }
  if (relayDoc.limitation?.payment_required) {
    badges.push('<span class="badge badge-warning">Paid</span>');
  }
  if (relayDoc.limitation?.restricted_writes) {
    badges.push('<span class="badge badge-warning">Restricted</span>');
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



// Get relay information
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
      if (modalTitle) modalTitle.textContent = relayUrl;
      if (modalBody) modalBody.innerHTML = `<pre>${JSON.stringify(relayDoc, null, 2)}</pre>`;
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
      ["d", crypto.randomUUID().replace(/-/g, '').slice(0,15)],
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
  showShareRelaySetModal(app.activeRelayList, activeSet);
}

function showShareRelaySetModal(setName, setData) {
  const relays = setData.tags.filter(tag => tag[0] === "relay");
  const relayList = relays.map(relay => relay[1]).join('\n');
  
  // Extract description tag
  const descriptionTag = setData.tags.find(tag => tag[0] === "description");
  const description = descriptionTag ? descriptionTag[1] : "";
  
  const content = `
    <div class="share-relay-set-modal">
      <div class="set-preview">
        <h4>Relay Set: ${escapeHtml(setName)}</h4>
        ${description ? `<p><strong>Description:</strong> ${escapeHtml(description)}</p>` : ''}
        <p><strong>Relays (${relays.length}):</strong></p>
        <pre class="relay-list-preview">${relayList}</pre>
      </div>
      <div class="share-actions">
        <button class="btn-secondary" id="modalCancelBtn">Cancel</button>
        <button class="btn-primary" id="modalShareBtn">Share to Nostr</button>
      </div>
    </div>
  `;

  const modal = openModal({
    title: "Share Relay Set",
    content,
    size: "medium"
  });

  // Setup handlers
  modal.querySelector("#modalShareBtn").addEventListener("click", () => {
    publishRelaySetToNostr(setData);
    closeModal();
  });
  modal.querySelector("#modalCancelBtn").addEventListener("click", closeModal);
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
    tags: [...setData.tags] // Use the existing tags from the set
  };
}



// =============================================
// MODAL FUNCTIONS (using the simplified system)
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