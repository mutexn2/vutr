async function settingsPageHandler() {
  try {
    mainContent.innerHTML = `
      <div class="settings-container">
        <h1>Settings</h1>
        
        <!-- Account Section -->
        <div class="settings-section strikethrough" style="display: none;">
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

<!-- Appearance Section -->
<div class="settings-section">
  <h2>Appearance</h2>
  <div class="settings-group">
    <div class="setting-item setting-toggle">
      <div class="setting-info">
        <label for="no-thumbnail-toggle">Hide All Thumbnails</label>
        <span class="setting-description">Don't display video thumbnails in the feed</span>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" id="no-thumbnail-toggle">
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>
</div>

        <!-- Playback Section -->
        <div class="settings-section "strikethrough" style="display: none;">
          <h2>Playback</h2>
          <div class="settings-group">
<div class="setting-item">
  <div class="setting-info">
    <label for="video-quality">Preferred Video Quality</label>
    <span class="setting-description">Preferred video quality for playback</span>
  </div>
  <select id="video-quality" class="settings-select">
    <option value="lowest">Lowest</option>
    <option value="highest">Highest</option>
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


<!-- Content Warnings Section -->
<div class="settings-section">
  <h2>Content Warnings</h2>
  <div class="settings-group">
    <div class="setting-item setting-toggle">
      <div class="setting-info">
        <label for="show-content-warning-toggle">Show Sensitive Content</label>
        <span class="setting-description">Display videos that have content warnings</span>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" id="show-content-warning-toggle" checked>
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="setting-item setting-toggle">
      <div class="setting-info">
        <label for="replace-thumbnail-toggle">Replace Thumbnails</label>
        <span class="setting-description">Replace thumbnails with placeholder for warned content</span>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" id="replace-thumbnail-toggle" checked>
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>
</div>

<!-- Tags Management Section -->
<div class="settings-section">
  <h2>Tags Management</h2>
  <div class="settings-group">
    <div class="tags-management-section">
      <div class="setting-info">
        <label>Manage Content Tags</label>
        <span class="setting-description">Add, remove, and organize tags used throughout the app</span>
      </div>
      
      <!-- Tags Grid -->
      <div class="tags-grid" id="settings-tags-grid">
        <!-- Tags will be rendered here -->
      </div>
      
      <!-- Add Tag Form -->
      <div class="add-tag-controls">
        <input
          type="text"
          id="settings-tag-input"
          placeholder="Add new tag..."
          class="settings-input"
        />
        <button type="button" id="settings-add-tag-btn" class="settings-btn primary">
          Add Tag
        </button>
      </div>
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
        <div class="settings-section">
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

<!-- Blossom Section -->
<div class="settings-section" style="display: none;">
  <h2>Blossom</h2>
  <div class="settings-group">
    <div class="setting-item setting-toggle">
      <div class="setting-info">
        <label for="auto-blossom-toggle">Auto Validation</label>
        <span class="setting-description">Automatically validate Blossom URLs when video is buffered</span>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" id="auto-blossom-toggle" checked>
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>
</div>    

        <!-- Notifications Section -->
        <div class="settings-section strikethrough" style="display: none;">
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

    // Setup collapsible sections
    setupCollapsibleSections();

    // Setup media whitelist
    const mediaSection = mainContent.querySelector(".media-whitelist-section");
    setupMediaWhitelistSettings(mediaSection);

    // Setup search relay
    const searchSection = mainContent.querySelector(".search-relay-section");
    setupSearchRelaySettings(searchSection);

    // Setup tags management
    setupTagsManagement();

    // Load saved settings
    loadSettings();

    // Navigation buttons
    document.getElementById("networkButton").addEventListener("click", () => {
      window.location.hash = "#network";
    });

    document
      .getElementById("websocketsButton")
      .addEventListener("click", () => {
        window.location.hash = "#websockets";
      });

    // Video quality
    document.getElementById("video-quality").addEventListener("change", (e) => {
      localStorage.setItem("preferQuality", e.target.value);
      app.preferQuality = e.target.value;
      showTemporaryNotification("Video quality preference saved");
    });

    // Playback speed
    document
      .getElementById("playback-speed")
      .addEventListener("change", (e) => {
        localStorage.setItem("playbackSpeed", e.target.value);
        showTemporaryNotification("Playback speed preference saved");
      });

    // Toggles
// Appearance - No thumbnail toggle
document
  .getElementById("no-thumbnail-toggle")
  .addEventListener("change", (e) => {
    localStorage.setItem("noThumbnail", e.target.checked);
    showTemporaryNotification(
      `Thumbnails ${e.target.checked ? "hidden" : "shown"}`
    );
  });

// Blossom auto-validation toggle
document
  .getElementById("auto-blossom-toggle")
  .addEventListener("change", (e) => {
    localStorage.setItem("autoBlossomValidation", e.target.checked);
    showTemporaryNotification(
      `Auto Blossom validation ${e.target.checked ? "enabled" : "disabled"}`
    );
  });

    document
      .getElementById("autoplay-toggle")
      .addEventListener("change", (e) => {
        localStorage.setItem("autoplay", e.target.checked);
        showTemporaryNotification(
          `Autoplay ${e.target.checked ? "enabled" : "disabled"}`
        );
      });

    document
      .getElementById("muted-autoplay")
      .addEventListener("change", (e) => {
        localStorage.setItem("mutedAutoplay", e.target.checked);
        showTemporaryNotification(
          `Muted autoplay ${e.target.checked ? "enabled" : "disabled"}`
        );
      });

    // Content warning toggles
    document
      .getElementById("show-content-warning-toggle")
      .addEventListener("change", (e) => {
        localStorage.setItem("showContentWarning", e.target.checked);
        showTemporaryNotification(
          `Content warnings ${e.target.checked ? "shown" : "hidden"}`
        );
      });

    document
      .getElementById("replace-thumbnail-toggle")
      .addEventListener("change", (e) => {
        localStorage.setItem("replaceThumbnail", e.target.checked);
        showTemporaryNotification(
          `Thumbnail replacement ${e.target.checked ? "enabled" : "disabled"}`
        );
      });

    document
      .getElementById("notifications-enabled")
      .addEventListener("change", (e) => {
        localStorage.setItem("notifications", e.target.checked);
        showTemporaryNotification(
          `Notifications ${e.target.checked ? "enabled" : "disabled"}`
        );
      });

    document
      .getElementById("desktop-notifications")
      .addEventListener("change", (e) => {
        localStorage.setItem("desktopNotifications", e.target.checked);
        if (e.target.checked && "Notification" in window) {
          Notification.requestPermission();
        }
        showTemporaryNotification(
          `Desktop notifications ${e.target.checked ? "enabled" : "disabled"}`
        );
      });

    // Clear cache buttons
    document
      .getElementById("clearMediaCacheBtn")
      .addEventListener("click", async () => {
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

    document
      .getElementById("clearLocalStorageBtn")
      .addEventListener("click", () => {
        if (
          confirm(
            "This will clear all local data including guest key. Continue?"
          )
        ) {
          try {
            const itemCount = localStorage.length;
            localStorage.clear();
            sessionStorage.clear();

            showTemporaryNotification(
              `Cleared ${itemCount} items from local storage`
            );
            setTimeout(() => {
              window.location.reload(true);
            }, 1500);
          } catch (error) {
            console.error("Error clearing local storage:", error);
            showTemporaryNotification("Error clearing local storage");
          }
        }
      });

    document
      .getElementById("clearEverythingBtn")
      .addEventListener("click", async () => {
        if (
          confirm(
            "WARNING: This will completely reset the app. All local data including guest keys will be deleted. A new guest key will be generated after reloading. Are you sure you want to continue?"
          )
        ) {
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
              const registrations =
                await navigator.serviceWorker.getRegistrations();
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
            showTemporaryNotification(
              "Error during cleanup. Reloading anyway..."
            );
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
  const savedQuality = localStorage.getItem("preferQuality") || "lowest";
  document.getElementById("video-quality").value = savedQuality;

  // Load playback speed
  const savedSpeed = localStorage.getItem("playbackSpeed") || "1";
  document.getElementById("playback-speed").value = savedSpeed;

  // Load toggles
  document.getElementById("no-thumbnail-toggle").checked =
    localStorage.getItem("noThumbnail") === "true";  
  document.getElementById("autoplay-toggle").checked =
    localStorage.getItem("autoplay") === "true";
  document.getElementById("muted-autoplay").checked =
    localStorage.getItem("mutedAutoplay") === "true";
  document.getElementById("notifications-enabled").checked =
    localStorage.getItem("notifications") === "true";
  document.getElementById("desktop-notifications").checked =
    localStorage.getItem("desktopNotifications") === "true";
// Load blossom settings
document.getElementById("auto-blossom-toggle").checked =
  localStorage.getItem("autoBlossomValidation") !== "false"; // Default true

  // Load content warning settings
  document.getElementById("show-content-warning-toggle").checked =
    localStorage.getItem("showContentWarning") !== "false"; // Default true

  document.getElementById("replace-thumbnail-toggle").checked =
    localStorage.getItem("replaceThumbnail") !== "false"; // Default true
}

function getAllTags() {
  try {
    const allTags = localStorage.getItem("allTags");
    return allTags ? JSON.parse(allTags) : [];
  } catch (error) {
    console.error("Error loading tags:", error);
    return [];
  }
}

function saveAllTags(tags) {
  try {
    localStorage.setItem("allTags", JSON.stringify(tags));
    // Update drawer if you have that function
    if (typeof updateDrawerContent === "function") {
      updateDrawerContent();
    }
  } catch (error) {
    console.error("Error saving tags:", error);
  }
}

function setupTagsManagement() {
  const tagsGrid = document.getElementById("settings-tags-grid");
  const tagInput = document.getElementById("settings-tag-input");
  const addTagBtn = document.getElementById("settings-add-tag-btn");

  // Render existing tags
  renderSettingsTags();

  // Handle add tag
  const handleAddTag = () => {
    const tagValue = tagInput.value.trim().toLowerCase();
    if (!tagValue) return;

    const allTags = getAllTags();

    // Check if tag already exists
    if (allTags.some((tag) => tag.value === tagValue)) {
      showTemporaryNotification("Tag already exists!");
      tagInput.value = "";
      return;
    }

    // Add new tag
    const newTag = {
      value: tagValue,
      displayName: tagValue.charAt(0).toUpperCase() + tagValue.slice(1),
      isStatic: false,
    };

    const updatedTags = [...allTags, newTag];
    saveAllTags(updatedTags);
    renderSettingsTags();
    tagInput.value = "";
    showTemporaryNotification(`Tag "${newTag.displayName}" added`);
  };

  addTagBtn.addEventListener("click", handleAddTag);

  tagInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleAddTag();
    }
  });
}

function renderSettingsTags() {
  const tagsGrid = document.getElementById("settings-tags-grid");
  const allTags = getAllTags();

  if (allTags.length === 0) {
    tagsGrid.innerHTML =
      '<div class="empty-tags">No tags added yet. Add your first tag above.</div>';
    return;
  }

  tagsGrid.innerHTML = allTags
    .map((tag) => {
      const value = escapeHtml(tag.value);
      const displayName = escapeHtml(tag.displayName);

      return `
        <div class="settings-tag-item" data-value="${value}">
          <span class="tag-name">${displayName}</span>
          <button class="remove-tag-btn" data-value="${value}" title="Remove tag">×</button>
        </div>
      `;
    })
    .join("");

  // Add remove event listeners
  tagsGrid.querySelectorAll(".remove-tag-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tagValue = e.target.dataset.value;
      removeTag(tagValue);
    });
  });
}

function removeTag(tagValue) {
  const allTags = getAllTags();
  const tag = allTags.find((t) => t.value === tagValue);

  if (confirm(`Remove tag "${tag ? tag.displayName : tagValue}"?`)) {
    const filteredTags = allTags.filter((tag) => tag.value !== tagValue);
    saveAllTags(filteredTags);
    renderSettingsTags();
    showTemporaryNotification(
      `Tag "${tag ? tag.displayName : tagValue}" removed`
    );
  }
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

  searchRelays.forEach((relay) => {
    const option = document.createElement("option");
    option.value = relay;
    option.textContent = relay;
    option.selected = relay === activeRelay;
    relaySelect.appendChild(option);
  });

  // Render the relay list for management
  if (searchRelays.length === 0) {
    relayListContainer.innerHTML =
      '<div class="empty-relays">No search relays added yet. Add one to get started.</div>';
    return;
  }

  relayListContainer.innerHTML = `
    <div class="relay-list-header">
      <span>Saved Relays:</span>
    </div>
    ${searchRelays
      .map(
        (relay) => `
      <div class="relay-item ${
        relay === activeRelay ? "active" : ""
      }" data-relay="${escapeHtml(relay)}">
        <span class="relay-url" title="${escapeHtml(relay)}">${escapeHtml(
          relay
        )}</span>
        <div class="relay-actions">
          ${
            relay === activeRelay
              ? '<span class="active-indicator">●</span>'
              : ""
          }
          <button class="remove-relay-btn" title="Remove relay">×</button>
        </div>
      </div>
    `
      )
      .join("")}
  `;

  // Add remove event listeners
  relayListContainer.querySelectorAll(".remove-relay-btn").forEach((btn) => {
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
  const defaultRelays = ["wss://index.hzrd149.com"]; // Default relay

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
    const defaultRelay =
      relays.length > 0 ? relays[0] : "wss://index.hzrd149.com";
    setActiveSearchRelay(defaultRelay);
    return defaultRelay;
  }

  return activeRelay;
}

function setActiveSearchRelay(relayUrl) {
  localStorage.setItem("activeSearchRelay", relayUrl);
  console.log(`Set active search relay to: ${relayUrl}`);
//  location.reload();
}

function addSearchRelay(relayUrl) {
  if (!relayUrl) {
    alert("Please enter a relay URL");
    return false;
  }

  if (!isValidRelayUrl(relayUrl)) {
    alert(
      "Please enter a valid WebSocket URL (must start with ws:// or wss://)"
    );
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
        const defaultRelay = "wss://index.hzrd149.com";
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
    return urlObj.protocol === "ws:" || urlObj.protocol === "wss:";
  } catch {
    return false;
  }
}

function setupCollapsibleSections() {
  const sections = document.querySelectorAll(".settings-section");

  sections.forEach((section) => {
    const header = section.querySelector("h2");
    const content = section.querySelector(
      ".settings-group, .tags-management-section, .search-relay-section, .media-whitelist-section"
    );

    // Make header clickable
    header.style.cursor = "pointer";
    header.style.userSelect = "none";

    // Add collapse indicator
    const indicator = document.createElement("span");
    indicator.className = "collapse-indicator";
    indicator.textContent = "▼";
    header.appendChild(indicator);

    // Start collapsed
    if (content) {
      content.style.display = "none";
      section.classList.add("collapsed");
    }

    // Toggle on click
    header.addEventListener("click", () => {
      if (content) {
        const isCollapsed = section.classList.contains("collapsed");

        if (isCollapsed) {
          content.style.display = "block";
          section.classList.remove("collapsed");
        } else {
          content.style.display = "none";
          section.classList.add("collapsed");
        }
      }
    });
  });
}
