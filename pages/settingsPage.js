async function settingsPageHandler() {
  try {
    mainContent.innerHTML = `
      <div class="settings-container">
        <h1>Settings</h1>
        
        <div class="settings-group">
        
          <button id="networkButton" class="settings-btn">Network</button>
          <button id="websocketsButton" class="settings-btn">WebSocket Manager</button>
        </div>

<div class="settings-group">
 
  <div class="search-relay-section">
    <div class="relay-selector">
      <label for="active-relay-select">Active search relay:</label>
      <select id="active-relay-select" class="relay-select">
        <option value="">Select a relay...</option>
      </select>
    </div>
    <div class="relay-management">
      <button class="add-relay-btn settings-btn">Add New Relay</button>
      <div class="relay-list"></div>
    </div>
    <div class="add-relay-form" style="display: none;">
      <input type="text" class="relay-input" placeholder="Enter relay URL (e.g., wss://relay.example.com)">
      <button class="confirm-relay-btn">Add</button>
      <button class="cancel-relay-btn">Cancel</button>
    </div>
  </div>
</div>

        <div class="settings-group">
         
          <button id="clearMediaCacheBtn" class="settings-btn">Clear Media Cache</button>
          <button id="clearLocalStorageBtn" class="settings-btn warning">Clear Local Storage</button>
          <button id="clearEverythingBtn" class="settings-btn danger">Reset Everything</button>
        </div>

        <div class="settings-group debug">
          <h3>Debug</h3>
          <a href="#nak" class="settings-btn">NAK</a>
          <a href="#nak2" class="settings-btn">NAK2</a>
          <a href="#blob" class="settings-btn">Blob</a>
        </div>
      </div>
    `;

    const mediaWhitelistHtml = createMediaWhitelistSettings();
    const settingsContainer = document.querySelector(".settings-container");
    settingsContainer.insertAdjacentHTML("beforeend", mediaWhitelistHtml);

    // Setup the whitelist interactions
    const mediaSection = settingsContainer.querySelector(".media-whitelist-section");
    setupMediaWhitelistSettings(mediaSection);

const searchSection = settingsContainer.querySelector(".search-relay-section");
setupSearchRelaySettings(searchSection);

    // Event listeners (same as before)
    document.getElementById("networkButton").addEventListener("click", function () {
      window.location.hash = "#network";
    });

    document.getElementById("websocketsButton").addEventListener("click", function () {
      window.location.hash = "#websockets";
    });
      
    // Clear media cache
    document.getElementById("clearMediaCacheBtn").addEventListener("click", async function () {
      try {
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          let deletedCount = 0;

          for (const cacheName of cacheNames) {
            if (!cacheName.startsWith("vutr-v")) {
              await caches.delete(cacheName);
              deletedCount++;
            }
          }

          showTemporaryNotification(`Cleared ${deletedCount} media cache(s)`);
        }
      } catch (error) {
        console.error("Error clearing media cache:", error);
        showTemporaryNotification("Error clearing media cache");
      }
    });

    // Clear local storage
    document.getElementById("clearLocalStorageBtn").addEventListener("click", function () {
      if (confirm("This will clear all local data including guest key. Continue?")) {
        try {
          const itemCount = localStorage.length;
          localStorage.clear();
          sessionStorage.clear();

          showTemporaryNotification(`Cleared ${itemCount} items from local storage`);
          setTimeout(() => {
            window.location.reload(true);
          }, 1500);            
        } catch (error) {
          console.error("Error clearing local storage:", error);
          showTemporaryNotification("Error clearing local storage");
        }
      }
    });

    // Clear everything
    document.getElementById("clearEverythingBtn").addEventListener("click", async function () {
      if (confirm("WARNING: This will completely reset the app. All local data including guest keys will be deleted. A new guest key will be generated after reloading. Are you sure you want to continue?")) {
        try {
          if ("caches" in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              await caches.delete(cacheName);
            }
          }

          localStorage.clear();
          sessionStorage.clear();

          if ("serviceWorker" in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }

          showTemporaryNotification("All data cleared. Reloading...");

          setTimeout(() => {
            window.location.reload(true);
          }, 1500);
        } catch (error) {
          console.error("Error clearing everything:", error);
          showTemporaryNotification("Error during cleanup. Reloading anyway...");
          setTimeout(() => {
            window.location.reload(true);
          }, 1500);
        }
      }
    });
  } catch (error) {
    console.error("Error rendering settings page:", error);
    mainContent.innerHTML = `
      <h1>404</h1>
      <div class="loading-indicator">
          <p>${error}</p>
      </div>
    `;
  }
}

function createMediaWhitelistSettings() {
  return `
    <div class="settings-group media-whitelist-section">
      <h3>Media Servers</h3>
      <button class="add-domain-btn settings-btn">Add Domain</button>
      <div class="whitelist-domains"></div>
      <div class="add-domain-form" style="display: none;">
        <input type="text" class="domain-input" placeholder="Enter domain">
        <button class="confirm-add-btn">Add</button>
        <button class="cancel-add-btn">Cancel</button>
      </div>
    </div>
  `;
}
function setupMediaWhitelistSettings(container) {
  // Render the domains list
  renderWhitelistDomains(container);

  // Setup event listeners
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
  const domainsContainer = container.querySelector(".whitelist-domains");

  if (app.mediaServerWhitelist.length === 0) {
    domainsContainer.innerHTML =
      '<div class="empty-whitelist">No trusted domains added yet.</div>';
    return;
  }

  domainsContainer.innerHTML = app.mediaServerWhitelist
    .map(
      (domain) => `
      <div class="domain-item" data-domain="${escapeHtml(domain)}">
        <span class="domain-name">${escapeHtml(domain)}</span>
        <button class="remove-domain-btn">Remove</button>
      </div>
    `
    )
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

function addDomainToWhitelistManually(domain) {
  if (!domain) {
    alert("Please enter a domain");
    return false;
  }

  if (!isValidDomain(domain)) {
    alert("Please enter a valid domain format (e.g., cdn.example.com)");
    return false;
  }

  if (app.mediaServerWhitelist.includes(domain)) {
    alert("Domain is already in the whitelist");
    return false;
  }

  app.mediaServerWhitelist.push(domain);
  localStorage.setItem(
    "mediaServerWhitelist",
    JSON.stringify(app.mediaServerWhitelist)
  );
  console.log(`Added ${domain} to media server whitelist`);
  return true;
}

function removeDomainFromWhitelist(domain) {
  const index = app.mediaServerWhitelist.indexOf(domain);
  if (index > -1) {
    app.mediaServerWhitelist.splice(index, 1);
    localStorage.setItem(
      "mediaServerWhitelist",
      JSON.stringify(app.mediaServerWhitelist)
    );
    console.log(`Removed ${domain} from media server whitelist`);
  }
}



//////////////////
function setupSearchRelaySettings(container) {
  renderSearchRelaySettings(container);
  
  const relaySelect = container.querySelector("#active-relay-select");
  const addRelayBtn = container.querySelector(".add-relay-btn");
  const addRelayForm = container.querySelector(".add-relay-form");
  const relayInput = container.querySelector(".relay-input");
  const confirmRelayBtn = container.querySelector(".confirm-relay-btn");
  const cancelRelayBtn = container.querySelector(".cancel-relay-btn");

  // Handle relay selection change
  relaySelect.addEventListener("change", (e) => {
    const selectedRelay = e.target.value;
    if (selectedRelay) {
      setActiveSearchRelay(selectedRelay);
      showTemporaryNotification(`Active search relay set to: ${selectedRelay}`);
    }
  });

  // Add relay form controls
  addRelayBtn.addEventListener("click", () => {
    addRelayForm.style.display = "flex";
    relayInput.focus();
  });

  cancelRelayBtn.addEventListener("click", () => {
    addRelayForm.style.display = "none";
    relayInput.value = "";
  });

  confirmRelayBtn.addEventListener("click", () => {
    const relayUrl = relayInput.value.trim();
    if (addSearchRelay(relayUrl)) {
      renderSearchRelaySettings(container);
      addRelayForm.style.display = "none";
      relayInput.value = "";
      showTemporaryNotification(`Added relay: ${relayUrl}`);
    }
  });

  relayInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      confirmRelayBtn.click();
    } else if (e.key === "Escape") {
      cancelRelayBtn.click();
    }
  });
}

function renderSearchRelaySettings(container) {
  const relaySelect = container.querySelector("#active-relay-select");
  const relayListContainer = container.querySelector(".relay-list");
  
  const searchRelays = getSearchRelays();
  const activeRelay = getActiveSearchRelay();
  
  // Update the select dropdown
  relaySelect.innerHTML = '<option value="">Select a relay...</option>';
  
  searchRelays.forEach(relay => {
    const option = document.createElement('option');
    option.value = relay;
    option.textContent = relay;
    option.selected = relay === activeRelay;
    relaySelect.appendChild(option);
  });

  // Render the relay list for management
  if (searchRelays.length === 0) {
    relayListContainer.innerHTML = '<div class="empty-relays">No search relays added yet. Add one to get started.</div>';
    return;
  }

  relayListContainer.innerHTML = `
    <div class="relay-list-header">
      <span>Saved Relays:</span>
    </div>
    ${searchRelays.map(relay => `
      <div class="relay-item ${relay === activeRelay ? 'active' : ''}" data-relay="${escapeHtml(relay)}">
        <span class="relay-url" title="${escapeHtml(relay)}">${escapeHtml(relay)}</span>
        <div class="relay-actions">
          ${relay === activeRelay ? '<span class="active-indicator">●</span>' : ''}
          <button class="remove-relay-btn" title="Remove relay">×</button>
        </div>
      </div>
    `).join('')}
  `;

  // Add remove event listeners
  relayListContainer.querySelectorAll(".remove-relay-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const relayItem = e.target.closest(".relay-item");
      const relayUrl = relayItem.dataset.relay;
      
      if (confirm(`Remove relay "${relayUrl}"?`)) {
        removeSearchRelay(relayUrl);
        renderSearchRelaySettings(container);
        showTemporaryNotification(`Removed relay: ${relayUrl}`);
      }
    });
  });
}

// Updated search relay management functions
function getSearchRelays() {
  const relays = localStorage.getItem("searchRelays");
  const defaultRelays = ["wss://relay.nostr.band"]; // Default relay
  
  if (!relays) {
    // Initialize with default relay if none exist
    localStorage.setItem("searchRelays", JSON.stringify(defaultRelays));
    return defaultRelays;
  }
  
  return JSON.parse(relays);
}

function getActiveSearchRelay() {
  const activeRelay = localStorage.getItem("activeSearchRelay");
  
  // If no active relay is set, use the first available relay or default
  if (!activeRelay) {
    const relays = getSearchRelays();
    const defaultRelay = relays.length > 0 ? relays[0] : "wss://relay.nostr.band";
    setActiveSearchRelay(defaultRelay);
    return defaultRelay;
  }
  
  return activeRelay;
}

function setActiveSearchRelay(relayUrl) {
  localStorage.setItem("activeSearchRelay", relayUrl);
  console.log(`Set active search relay to: ${relayUrl}`);
}

function addSearchRelay(relayUrl) {
  if (!relayUrl) {
    alert("Please enter a relay URL");
    return false;
  }

  if (!isValidRelayUrl(relayUrl)) {
    alert("Please enter a valid WebSocket URL (must start with ws:// or wss://)");
    return false;
  }

  const searchRelays = getSearchRelays();
  if (searchRelays.includes(relayUrl)) {
    alert("This relay is already in your list");
    return false;
  }

  searchRelays.push(relayUrl);
  localStorage.setItem("searchRelays", JSON.stringify(searchRelays));
  
  console.log(`Added search relay: ${relayUrl}`);
  return true;
}

function removeSearchRelay(relayUrl) {
  const searchRelays = getSearchRelays();
  const index = searchRelays.indexOf(relayUrl);
  
  if (index > -1) {
    searchRelays.splice(index, 1);
    localStorage.setItem("searchRelays", JSON.stringify(searchRelays));
    
    // If we removed the active relay, set a new one
    const activeRelay = getActiveSearchRelay();
    if (activeRelay === relayUrl) {
      if (searchRelays.length > 0) {
        setActiveSearchRelay(searchRelays[0]);
      } else {
        // Add back the default relay if list becomes empty
        const defaultRelay = "wss://relay.nostr.band";
        searchRelays.push(defaultRelay);
        localStorage.setItem("searchRelays", JSON.stringify(searchRelays));
        setActiveSearchRelay(defaultRelay);
      }
    }
    
    console.log(`Removed search relay: ${relayUrl}`);
  }
}

function isValidRelayUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:';
  } catch {
    return false;
  }
}