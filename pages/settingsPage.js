async function settingsPageHandler() {
  try {
    mainContent.innerHTML = `
      <div class="settings-container">
        <h1>Settings</h1>
        
        <!-- Account Section -->
        <div class="settings-section strikethrough">
          <h2>Account</h2>
          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-info">
                <label>Profile</label>
                <span class="setting-description">Manage your Nostr identity and profile information</span>
              </div>
              <button class="settings-btn secondary">Edit Profile</button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Keys & Security</label>
                <span class="setting-description">Manage your Nostr keys and authentication</span>
              </div>
              <button class="settings-btn secondary">Manage Keys</button>
            </div>
          </div>
        </div>



        <!-- Playback Section -->
        <div class="settings-section strikethrough">
          <h2>Playback</h2>
          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-info">
                <label for="video-quality">Default Video Quality</label>
                <span class="setting-description">Preferred video quality for playback</span>
              </div>
              <select id="video-quality" class="settings-select">
                <option value="auto">Auto</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
            </div>
            <div class="setting-item setting-toggle">
              <div class="setting-info">
                <label for="autoplay-toggle">Autoplay</label>
                <span class="setting-description">Automatically play next video</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="autoplay-toggle">
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item setting-toggle">
              <div class="setting-info">
                <label for="muted-autoplay">Muted Autoplay</label>
                <span class="setting-description">Start videos muted when autoplaying</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="muted-autoplay">
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label for="playback-speed">Default Playback Speed</label>
                <span class="setting-description">Preferred playback speed</span>
              </div>
              <select id="playback-speed" class="settings-select">
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1" selected>Normal</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="1.75">1.75x</option>
                <option value="2">2x</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Network Section -->
        <div class="settings-section">
          <h2>Network & Relays</h2>
          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-info">
                <label>Relay Management</label>
                <span class="setting-description">Configure Nostr relays and connections</span>
              </div>
              <button id="networkButton" class="settings-btn secondary">Network Settings</button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>WebSocket Connections</label>
                <span class="setting-description">Monitor and manage active connections</span>
              </div>
              <button id="websocketsButton" class="settings-btn secondary">WebSocket Manager</button>
            </div>
          </div>
        </div>

        <!-- Search Relay Section -->
        <div class="settings-section">
          <h2>Search Settings</h2>
          <div class="settings-group">
            <div class="search-relay-section">
              <div class="setting-item">
                <div class="setting-info">
                  <label for="active-relay-select">Active Search Relay</label>
                  <span class="setting-description">Select the relay to use for content discovery</span>
                </div>
                <select id="active-relay-select" class="settings-select">
                  <option value="">Select a relay...</option>
                </select>
              </div>
              <div class="relay-management">
                <button class="add-relay-btn settings-btn secondary">Add New Relay</button>
                <div class="relay-list"></div>
              </div>
              <div class="add-relay-form" style="display: none;">
                <input type="text" class="relay-input" placeholder="Enter relay URL (e.g., wss://relay.example.com)">
                <div class="form-actions">
                  <button class="confirm-relay-btn settings-btn primary">Add</button>
                  <button class="cancel-relay-btn settings-btn secondary">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Media Servers Section -->
        <div class="settings-section" style="display: none;">
          <h2>Media Servers</h2>
          <div class="settings-group">
            <div class="media-whitelist-section">
              <div class="setting-info">
                <label>Trusted Domains</label>
                <span class="setting-description">Manage domains allowed to serve video content</span>
              </div>
              <button class="add-domain-btn settings-btn secondary">Add Domain</button>
              <div class="whitelist-domains"></div>
              <div class="add-domain-form" style="display: none;">
                <input type="text" class="domain-input" placeholder="Enter domain (e.g., cdn.example.com)">
                <div class="form-actions">
                  <button class="confirm-add-btn settings-btn primary">Add</button>
                  <button class="cancel-add-btn settings-btn secondary">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>


        <!-- Notifications Section -->
        <div class="settings-section strikethrough">
          <h2>Notifications</h2>
          <div class="settings-group">
            <div class="setting-item setting-toggle">
              <div class="setting-info">
                <label for="notifications-enabled">Enable Notifications</label>
                <span class="setting-description">Receive notifications about new content</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="notifications-enabled">
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item setting-toggle">
              <div class="setting-info">
                <label for="desktop-notifications">Desktop Notifications</label>
                <span class="setting-description">Show notifications on your desktop</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="desktop-notifications">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Storage Section -->
        <div class="settings-section">
          <h2>Storage & Cache</h2>
          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-info">
                <label>Media Cache</label>
                <span class="setting-description">Clear cached media files to free up space</span>
              </div>
              <button id="clearMediaCacheBtn" class="settings-btn secondary">Clear Cache</button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Local Storage</label>
                <span class="setting-description">Clear all local data including guest keys</span>
              </div>
              <button id="clearLocalStorageBtn" class="settings-btn secondary">Clear Local Storage</button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Reset Application</label>
                <span class="setting-description">Complete reset - removes all data and settings</span>
              </div>
              <button id="clearEverythingBtn" class="settings-btn secondary">Reset Everything</button>
            </div>
          </div>
        </div>


        <!-- Debug Section (hidden by default) -->
        <div class="settings-section debug">
          <h2>Debug</h2>
          <div class="settings-group">
            <a href="#nak" class="settings-btn secondary">NAK</a>
            <a href="#nak2" class="settings-btn secondary">NAK2</a>
            <a href="#blob" class="settings-btn secondary">Blob</a>
          </div>
        </div>
      </div>
    `;

    // Setup media whitelist
    const mediaSection = mainContent.querySelector(".media-whitelist-section");
    setupMediaWhitelistSettings(mediaSection);

    // Setup search relay
    const searchSection = mainContent.querySelector(".search-relay-section");
    setupSearchRelaySettings(searchSection);

    // Load saved settings
    loadSettings();

  // Navigation buttons
  document.getElementById("networkButton").addEventListener("click", () => {
    window.location.hash = "#network";
  });

  document.getElementById("websocketsButton").addEventListener("click", () => {
    window.location.hash = "#websockets";
  });


  // Video quality
  document.getElementById("video-quality").addEventListener("change", (e) => {
    localStorage.setItem("videoQuality", e.target.value);
    showTemporaryNotification("Video quality preference saved");
  });

  // Playback speed
  document.getElementById("playback-speed").addEventListener("change", (e) => {
    localStorage.setItem("playbackSpeed", e.target.value);
    showTemporaryNotification("Playback speed preference saved");
  });

  // Toggles
  document.getElementById("autoplay-toggle").addEventListener("change", (e) => {
    localStorage.setItem("autoplay", e.target.checked);
    showTemporaryNotification(`Autoplay ${e.target.checked ? "enabled" : "disabled"}`);
  });

  document.getElementById("muted-autoplay").addEventListener("change", (e) => {
    localStorage.setItem("mutedAutoplay", e.target.checked);
    showTemporaryNotification(`Muted autoplay ${e.target.checked ? "enabled" : "disabled"}`);
  });


  document.getElementById("notifications-enabled").addEventListener("change", (e) => {
    localStorage.setItem("notifications", e.target.checked);
    showTemporaryNotification(`Notifications ${e.target.checked ? "enabled" : "disabled"}`);
  });

  document.getElementById("desktop-notifications").addEventListener("change", (e) => {
    localStorage.setItem("desktopNotifications", e.target.checked);
    if (e.target.checked && "Notification" in window) {
      Notification.requestPermission();
    }
    showTemporaryNotification(`Desktop notifications ${e.target.checked ? "enabled" : "disabled"}`);
  });

  // Clear cache buttons
  document.getElementById("clearMediaCacheBtn").addEventListener("click", async () => {
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

  document.getElementById("clearLocalStorageBtn").addEventListener("click", () => {
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

  document.getElementById("clearEverythingBtn").addEventListener("click", async () => {
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

function loadSettings() {




  // Load video quality
  const savedQuality = localStorage.getItem("videoQuality") || "auto";
  document.getElementById("video-quality").value = savedQuality;

  // Load playback speed
  const savedSpeed = localStorage.getItem("playbackSpeed") || "1";
  document.getElementById("playback-speed").value = savedSpeed;

  // Load toggles
  document.getElementById("autoplay-toggle").checked = 
    localStorage.getItem("autoplay") === "true";
  document.getElementById("muted-autoplay").checked = 
    localStorage.getItem("mutedAutoplay") === "true";
  document.getElementById("notifications-enabled").checked = 
    localStorage.getItem("notifications") === "true";
  document.getElementById("desktop-notifications").checked = 
    localStorage.getItem("desktopNotifications") === "true";
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
  location.reload();
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
