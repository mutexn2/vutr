async function singleRelayPageHandler() {
  // Create static skeleton with innerHTML (safe static content only)
  mainContent.innerHTML = `
  <div id="singleRelayPage-container">
    <div class="page-header">
      <h1>Single Relay</h1>
    </div>
    <div class="relay-input-section">
      <div class="input-group">
        <label for="relayInput">Relay URL</label>
        <input 
          type="text" 
          id="relayInput" 
          name="relayInput" 
          class="relay-input" 
          placeholder="Enter relay URL (e.g., relay.damus.io)"
        >
        <button class="connect-btn">Connect</button>
      </div>
    </div>
    <div class="current-relay-section" style="display: none;">
<div class="single-relay-header">
  <h2 class="relay-title"></h2>
<div class="relay-actions">
  <button class="copy-relay-btn">Copy URL</button>
  <button class="add-to-set-btn">Add to Set</button>
  <button class="block-relay-btn">Block</button>
</div>
</div>
    </div>
    <div class="loading-indicator" style="display: none;">
      <p>Loading relay information...</p>
    </div>
    <div class="relay-info-container"></div>
    <div class="videos-section">
      <h2 class="videos-title" style="display: none;"></h2>
      <div class="videos-grid"></div>
    </div>
    <div class="no-content" style="display: none;">
      <p>No video events (kind 21) found on this relay.</p>
    </div>
    <div class="empty-state" style="display: none;">
      <div class="empty-state-content">
        <h2>Single Relay Explorer</h2>
        <p>Enter a relay URL above to explore its content and information.</p>
        <div class="example-relays">
          <h3>Popular Relays:</h3>
          <button class="example-relay-btn" data-relay="relay.damus.io">relay.damus.io</button>
          <button class="example-relay-btn" data-relay="nos.lol">nos.lol</button>
          <button class="example-relay-btn" data-relay="relay.nostr.band">relay.nostr.band</button>
        </div>
      </div>
    </div>
    <div class="error-message" style="display: none;"></div>
    </div>
  `;

  let pageContainer = document.getElementById("singleRelayPage-container");
  // Get DOM references
  const relayInput = pageContainer.querySelector(".relay-input");
  const connectBtn = pageContainer.querySelector(".connect-btn");
  const currentRelaySection = pageContainer.querySelector(
    ".current-relay-section"
  );
  const relayTitle = pageContainer.querySelector(".relay-title");
  const copyBtn = pageContainer.querySelector(".copy-relay-btn");
  const loadingIndicator = pageContainer.querySelector(".loading-indicator");
  const relayInfoContainer = pageContainer.querySelector(".relay-info-container");
  const videosSection = pageContainer.querySelector(".videos-section");
  const videosTitle = pageContainer.querySelector(".videos-title");
  const videosList = pageContainer.querySelector(".videos-grid");
  const noContentDiv = pageContainer.querySelector(".no-content");
  const emptyStateDiv = pageContainer.querySelector(".empty-state");
  const errorDiv = pageContainer.querySelector(".error-message");

  // Function to normalize relay URL for comparison
  function normalizeRelayUrl(url) {
    return url
      .replace(/^wss?:\/\//, "")
      .trim()
      .toLowerCase();
  }

  // Function to update connect button state
  function updateConnectButtonState() {
    const inputValue = relayInput.value.trim();
    const currentRelayFromHash =
      pathParts.length >= 2 ? pathParts.slice(1).join("/") : "";

    const normalizedInput = normalizeRelayUrl(inputValue);
    const normalizedCurrent = normalizeRelayUrl(currentRelayFromHash);

    if (normalizedInput === normalizedCurrent && normalizedInput !== "") {
      connectBtn.disabled = true;
    } else {
      connectBtn.disabled = false;
    }
  }

  // Add input event listener to check in real-time
  relayInput.addEventListener("input", updateConnectButtonState);

  // Set up event listeners
  const connectToRelay = (relayUrl) => {
    if (relayUrl.startsWith("wss://")) {
      relayUrl = relayUrl.slice(6);
    } else if (relayUrl.startsWith("ws://")) {
      relayUrl = relayUrl.slice(5);
    }
    let newRelayUrl = relayUrl;

    window.location.hash = `#singlerelay/${newRelayUrl}`;
  };

  connectBtn.addEventListener("click", () => {
    const inputValue = relayInput.value.trim();
    if (inputValue) {
      connectToRelay(inputValue);
    }
  });

  relayInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      connectBtn.click();
    }
  });

  // Example relay buttons
  const exampleRelayBtns = pageContainer.querySelectorAll(".example-relay-btn");
  exampleRelayBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const relayUrl = btn.dataset.relay;
      relayInput.value = relayUrl;
      connectToRelay(relayUrl);
    });
  });

  // Function to show error
  function showError(message) {
    loadingIndicator.style.display = "none";
    errorDiv.style.display = "block";
    errorDiv.textContent = `Error: ${message}`;
    relayInfoContainer.style.display = "none";
    videosSection.style.display = "none";
    noContentDiv.style.display = "none";
    emptyStateDiv.style.display = "none";
    currentRelaySection.style.display = "none";
  }

  // Function to create minimal relay info element
  function createRelayInfoElement(relayInfo, relayUrl) {
    const infoDiv = document.createElement("div");
    infoDiv.className = "relay-info";

    const header = document.createElement("div");
    header.className = "relay-info-header";

    const collapsedContent = document.createElement("div");
    collapsedContent.className = "relay-info-collapsed";

    // Create name container with icon
    const nameContainer = document.createElement("div");
    nameContainer.className = "relay-name-container";

    // Create icon element
    const icon = document.createElement("img");
    icon.className = "relay-icon";
    icon.alt = "Relay icon";
    icon.style.display = "none"; // Hide initially

    const fetchIconForRelay = async (relayUrl, iconElement) => {
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
    };

    // Call the function to fetch the icon
    fetchIconForRelay(relayUrl, icon);

    const name = document.createElement("div");
    name.className = "relay-name";
    name.textContent = relayInfo.name || "Unnamed Relay";

    nameContainer.appendChild(icon);
    nameContainer.appendChild(name);

    const description = document.createElement("div");
    description.className = "relay-description";
    description.textContent = relayInfo.description || "No Description found";

    const nipsInfo = document.createElement("div");
    nipsInfo.className = "relay-nips";
    if (relayInfo.supported_nips && relayInfo.supported_nips.length > 0) {
      nipsInfo.textContent = `Supports ${relayInfo.supported_nips.length} NIPs`;
    } else {
      nipsInfo.textContent = "NIPs not specified";
    }

    const expandIcon = document.createElement("span");
    expandIcon.className = "expand-icon";
    expandIcon.textContent = "▼";

    collapsedContent.appendChild(nameContainer);
    collapsedContent.appendChild(description);
    collapsedContent.appendChild(nipsInfo);
    header.appendChild(collapsedContent);
    header.appendChild(expandIcon);

    const expandedInfo = document.createElement("div");
    expandedInfo.className = "relay-info-expanded";
    expandedInfo.style.display = "none";

    // Basic info section
    const basicSection = document.createElement("div");
    basicSection.className = "info-section";

    const addField = (container, label, value, isLink = false) => {
      if (value) {
        const field = document.createElement("div");
        field.className = "info-field";

        const labelSpan = document.createElement("span");
        labelSpan.className = "field-label";
        labelSpan.textContent = label + ":";

        const valueSpan = document.createElement("span");
        valueSpan.className = "field-value";

        if (isLink) {
          const link = document.createElement("a");
          link.href = value;
          link.target = "_blank";
          link.textContent = value;
          valueSpan.appendChild(link);
        } else {
          valueSpan.textContent = value;
        }

        field.appendChild(labelSpan);
        field.appendChild(valueSpan);
        container.appendChild(field);
      }
    };

    // Basic information
    addField(basicSection, "Name", relayInfo.name);
    addField(basicSection, "Description", relayInfo.description);
    addField(basicSection, "Contact", relayInfo.contact);
    addField(basicSection, "Software", relayInfo.software);
    addField(basicSection, "Version", relayInfo.version);

    if (relayInfo.supported_nips && relayInfo.supported_nips.length > 0) {
      const nipsField = document.createElement("div");
      nipsField.className = "info-field";

      const label = document.createElement("span");
      label.className = "field-label";
      label.textContent = "Supported NIPs:";

      const value = document.createElement("span");
      value.className = "field-value nips-list";
      value.textContent = relayInfo.supported_nips.join(", ");

      nipsField.appendChild(label);
      nipsField.appendChild(value);
      basicSection.appendChild(nipsField);
    }

    expandedInfo.appendChild(basicSection);

    // Limitations section
    if (relayInfo.limitation && Object.keys(relayInfo.limitation).length > 0) {
      const limitationsSection = document.createElement("div");
      limitationsSection.className = "info-section";

      const limitationsTitle = document.createElement("h4");
      limitationsTitle.textContent = "Limitations";
      limitationsSection.appendChild(limitationsTitle);

      Object.entries(relayInfo.limitation).forEach(([key, value]) => {
        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        addField(limitationsSection, label, String(value));
      });

      expandedInfo.appendChild(limitationsSection);
    }

    // Community info
    const communityFields = ["relay_countries", "language_tags", "tags"];
    const hasCommunityInfo = communityFields.some(
      (field) =>
        relayInfo[field] &&
        Array.isArray(relayInfo[field]) &&
        relayInfo[field].length > 0
    );

    if (hasCommunityInfo || relayInfo.posting_policy) {
      const communitySection = document.createElement("div");
      communitySection.className = "info-section";

      const communityTitle = document.createElement("h4");
      communityTitle.textContent = "Community";
      communitySection.appendChild(communityTitle);

      if (relayInfo.relay_countries) {
        addField(
          communitySection,
          "Countries",
          relayInfo.relay_countries.join(", ")
        );
      }
      if (relayInfo.language_tags) {
        addField(
          communitySection,
          "Languages",
          relayInfo.language_tags.join(", ")
        );
      }
      if (relayInfo.tags && relayInfo.tags.length > 0) {
        addField(communitySection, "Tags", relayInfo.tags.join(", "));
      }
      addField(
        communitySection,
        "Posting Policy",
        relayInfo.posting_policy,
        true
      );

      expandedInfo.appendChild(communitySection);
    }

    // Payments section
    if (
      relayInfo.payments_url ||
      (relayInfo.fees && Object.keys(relayInfo.fees).length > 0)
    ) {
      const paymentsSection = document.createElement("div");
      paymentsSection.className = "info-section";

      const paymentsTitle = document.createElement("h4");
      paymentsTitle.textContent = "Payments";
      paymentsSection.appendChild(paymentsTitle);

      addField(paymentsSection, "Payments URL", relayInfo.payments_url, true);

      if (relayInfo.fees) {
        Object.entries(relayInfo.fees).forEach(([feeType, feeData]) => {
          const feeStr = Array.isArray(feeData)
            ? feeData
                .map(
                  (fee) =>
                    `${fee.amount} ${fee.unit}${
                      fee.period ? `/${fee.period}s` : ""
                    }`
                )
                .join(", ")
            : String(feeData);
          addField(
            paymentsSection,
            feeType.charAt(0).toUpperCase() + feeType.slice(1),
            feeStr
          );
        });
      }

      expandedInfo.appendChild(paymentsSection);
    }

    // Raw JSON section (always last)
    const rawJsonSection = document.createElement("div");
    rawJsonSection.className = "info-section raw-json-section";

    const jsonTitle = document.createElement("h4");
    jsonTitle.textContent = "Raw JSON Document";
    rawJsonSection.appendChild(jsonTitle);

    const jsonPre = document.createElement("pre");
    jsonPre.className = "json-display";
    jsonPre.textContent = JSON.stringify(relayInfo, null, 2);
    rawJsonSection.appendChild(jsonPre);

    expandedInfo.appendChild(rawJsonSection);

    // Add click handler for expand/collapse
    header.addEventListener("click", () => {
      if (expandedInfo.style.display === "none") {
        expandedInfo.style.display = "block";
        expandIcon.textContent = "▲";
        header.classList.add("expanded");
      } else {
        expandedInfo.style.display = "none";
        expandIcon.textContent = "▼";
        header.classList.remove("expanded");
      }
    });

    infoDiv.appendChild(header);
    infoDiv.appendChild(expandedInfo);

    return infoDiv;
  }

  // Check if we have a relay URL in the hash
  const hash = window.location.hash;
  const pathParts = hash.split("/");

  if (pathParts.length < 2 || !pathParts[1]) {
    // Show empty state
    emptyStateDiv.style.display = "block";
    return;
  }

  try {
    let relayUrl = pathParts.slice(1).join("/");

    // Auto-add wss:// if not present
    if (!relayUrl.startsWith("wss://") && !relayUrl.startsWith("ws://")) {
      relayUrl = "wss://" + relayUrl;
    }

    // Show current relay section and update UI
    currentRelaySection.style.display = "block";
    loadingIndicator.style.display = "block";
    emptyStateDiv.style.display = "none";

    relayTitle.textContent = `Relay: ${relayUrl}`;
    copyBtn.dataset.url = relayUrl;

    // Pre-fill input with current relay (without protocol for easier editing)
    relayInput.value = relayUrl.replace(/^wss?:\/\//, "");

    // Update button state after setting the value
    updateConnectButtonState();

    console.log("Querying relay:", relayUrl);

    // Create a simple pool for querying
    const pool = new window.NostrTools.SimplePool();

    // Query the single relay for kind 21 events
    const events = await pool.querySync([relayUrl], {
      kinds: [21],
      limit: 21,
    });

    // Sanitize and filter events
    let videos = events.map(sanitizeNostrEvent).filter((v) => v !== null);
    videos.sort((a, b) => b.created_at - a.created_at);

    // Try to get relay information document (NIP-11)
    let relayInfo = null;
    try {
      const infoUrl = relayUrl
        .replace("wss://", "https://")
        .replace("ws://", "http://");
      const response = await fetch(infoUrl, {
        headers: {
          Accept: "application/nostr+json",
        },
      });
      if (response.ok) {
        relayInfo = await response.json();
      }
    } catch (infoError) {
      console.log("Could not fetch relay info:", infoError);
    }

    // Hide loading indicator
    loadingIndicator.style.display = "none";

    // Show relay info
    if (relayInfo) {
      const relayInfoElement = createRelayInfoElement(relayInfo, relayUrl);
      relayInfoContainer.appendChild(relayInfoElement);
    } else {
      const noInfoDiv = document.createElement("div");
      noInfoDiv.className = "relay-info no-info";

      const title = document.createElement("h3");
      title.textContent = "No Relay Information Available";

      const message = document.createElement("p");
      message.textContent =
        "This relay does not provide a NIP-11 information document.";

      noInfoDiv.appendChild(title);
      noInfoDiv.appendChild(message);
      relayInfoContainer.appendChild(noInfoDiv);
    }

    // Add pubkey section after relay header (if pubkey exists)
    if (relayInfo && relayInfo.pubkey) {
      const operatorContainer = document.createElement("div");
      operatorContainer.className = "operator-container";

      // Make container clickable
      operatorContainer.style.cursor = "pointer";
      operatorContainer.addEventListener("click", () => {
        window.location.hash = `#profile/${relayInfo.pubkey}`;
      });

      const operatorLabel = document.createElement("span");
      operatorLabel.textContent = "Operator: ";
      operatorLabel.className = "operator-label";

      // Create profile picture component
      const profilePicture = document.createElement("nostr-picture");
      profilePicture.setAttribute("pubkey", relayInfo.pubkey);
      profilePicture.setAttribute("width", "24px");

      // Create name component
      const profileName = document.createElement("nostr-name");
      profileName.setAttribute("pubkey", relayInfo.pubkey);

      operatorContainer.appendChild(operatorLabel);
      operatorContainer.appendChild(profilePicture);
      operatorContainer.appendChild(profileName);

      // Insert operator container after relay header
      const videosSection = pageContainer.querySelector(".videos-section");
      videosSection.parentNode.insertBefore(operatorContainer, videosSection);
    }
    // Handle videos display
    if (videos.length === 0) {
      noContentDiv.style.display = "block";
    } else {
      videosTitle.textContent = `Videos (${videos.length})`;
      videosTitle.style.display = "block";

      videos.forEach((video) => {
        const card = createVideoCard(video);
        videosList.appendChild(card);
      });

      // Add click handler for navigation
      videosList.addEventListener("click", (event) => {
        const card = event.target.closest(".video-card");
        if (relayUrl.startsWith("wss://")) {
          relayUrl = relayUrl.slice(6);
        } else if (relayUrl.startsWith("ws://")) {
          relayUrl = relayUrl.slice(5);
        }
        if (card && card.dataset.videoId) {
          //  window.location.hash = `#watch/${card.dataset.videoId}`;
          window.location.hash = `#watch/params?v=${card.dataset.videoId}&discovery=${relayUrl}`;
        }
      });
    }

    // Set up copy button functionality
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(relayUrl);
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "Copy URL";
          copyBtn.classList.remove("copied");
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy URL";
        }, 2000);
      }
    });


    const addToSetBtn = pageContainer.querySelector(".add-to-set-btn");
    addToSetBtn?.addEventListener("click", () => {
      console.log(`Add relay to set: ${relayUrl}`);
      showRelaySetSelector(relayUrl);
    });

const blockBtn = pageContainer.querySelector(".block-relay-btn");

function updateBlockButtonState() {
  const isBlocked = window.WebSocketManager && window.WebSocketManager.isURLBlocked(relayUrl);
  
  if (isBlocked) {
    blockBtn.textContent = "Blocked";
    blockBtn.classList.add("blocked");
    blockBtn.classList.remove("unblocked");
  } else {
    blockBtn.textContent = "Block";
    blockBtn.classList.add("unblocked");
    blockBtn.classList.remove("blocked");
  }
}

blockBtn?.addEventListener("click", () => {
  const hostname = relayUrl.replace(/^wss?:\/\//, '');
  const isCurrentlyBlocked = window.WebSocketManager && window.WebSocketManager.isURLBlocked(relayUrl);
  
  if (isCurrentlyBlocked) {
    if (confirm(`Unblock connections to:\n${hostname}?\n\nThis will allow the app to connect to this relay again.`)) {
      window.WebSocketManager.unblockURL(relayUrl);
      updateBlockButtonState();
      showTemporaryNotification(`Relay ${hostname} has been unblocked`);
setTimeout(() => {
    location.reload();
}, 100);      
    }
  } else {
    if (confirm(`Block all future connections to:\n${hostname}?\n\nThis will prevent the app from connecting to this relay until you unblock it.`)) {
      window.WebSocketManager.blockURL(relayUrl);
      updateBlockButtonState();
      showTemporaryNotification(`Relay ${hostname} has been blocked`);
      
      const closed = window.WebSocketManager.closeConnectionsByURL(relayUrl);
      if (closed > 0) {
        console.log(`Closed ${closed} existing connections to ${relayUrl}`);
      }

setTimeout(() => {
    location.reload();
}, 100);

    }
  }
});

updateBlockButtonState();


  } catch (error) {
    console.error("Error rendering single relay page:", error);
    showError(error.message || "Unknown error occurred");
  }
}


//////////////////////////////
//////////////////////////////

function showRelaySetSelector(relayUrl) {
  const relaySets = Object.entries(app.relayLists || {});

  const content = `
    <div class="relay-set-selector-modal">
      ${
        relaySets.length > 0
          ? `
        <div class="existing-sets">
          <h4>Select a relay set:</h4>
          <div class="set-list">
            ${relaySets
              .map(([setName, setData]) => {
                const relayCount = setData.tags.filter(
                  (tag) => tag[0] === "relay"
                ).length;
                
                // Check if relay is already in this set
                const hasRelay = setData.tags.some(
                  (tag) => tag[0] === "relay" && tag[1] === relayUrl
                );

                return `
                <div class="set-item ${hasRelay ? 'already-added' : ''}" data-set-name="${escapeHtml(setName)}">
                  <span class="set-name">${escapeHtml(setName)}</span>
                  <span class="set-count">(${relayCount} relays)</span>
                  ${hasRelay ? '<span class="already-added-indicator">✓ Already added</span>' : ''}
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
        <div class="divider">or</div>
      `
          : ""
      }
      <div class="create-set-section">
        <h4>Create new relay set:</h4>
        <div class="create-set-form">
          <input type="text" class="form-input set-name-input" placeholder="Enter set name" maxlength="50">
          <div class="modal-actions">
            <button class="btn-primary create-set-btn">Create & Add</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modal = openModal({
    title: "Add to Relay Set",
    content,
    size: "medium",
    customClass: "relay-set-selector-modal",
  });

  const nameInput = modal.querySelector(".set-name-input");
  const createBtn = modal.querySelector(".create-set-btn");
  const setItems = modal.querySelectorAll(".set-item:not(.already-added)");

  createBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }

    // Check if set name already exists
    if (app.relayLists[name]) {
      showTemporaryNotification(`Relay set "${name}" already exists`);
      return;
    }

    const success = createRelaySetAndAdd(name, relayUrl);

    if (success) {
      showTemporaryNotification(`Relay added to new set "${name}"`);
      closeModal();
    }
  });

  nameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      createBtn.click();
    }
  });

  setItems.forEach((item) => {
    item.addEventListener("click", () => {
      const setName = item.dataset.setName;
      const success = addRelayToSet(setName, relayUrl);

      if (success) {
        showTemporaryNotification(`Relay added to "${setName}"`);
        closeModal();
      }
    });
  });
}


function createRelaySetAndAdd(setName, relayUrl) {
  try {
    // Create new relay set structure
    const newSet = {
      kind: 30002,
      tags: [
        ["d", crypto.randomUUID().replace(/-/g, '').slice(0,15)],
        ["title", setName],
        ["relay", relayUrl]
      ]
    };

    // Add to app.relayLists
    app.relayLists[setName] = newSet;

    // Save to localStorage
    saveRelayListsFromSingleRelay();
    updateSidebar();
    updateDrawerContent();
    return true;
  } catch (error) {
    console.error("Error creating relay set:", error);
    showTemporaryNotification("Error creating relay set");
    return false;
  }
}

function addRelayToSet(setName, relayUrl) {
  try {
    const relaySet = app.relayLists[setName];
    if (!relaySet) {
      showTemporaryNotification("Relay set not found");
      return false;
    }

    // Check if relay already exists in the set
    const relayExists = relaySet.tags.some(
      (tag) => tag[0] === "relay" && tag[1] === relayUrl
    );

    if (relayExists) {
      showTemporaryNotification("Relay already exists in this set");
      return false;
    }

    // Add the relay to the set
    relaySet.tags.push(["relay", relayUrl]);

    // Save to localStorage
    saveRelayListsFromSingleRelay();

    return true;
  } catch (error) {
    console.error("Error adding relay to set:", error);
    showTemporaryNotification("Error adding relay to set");
    return false;
  }
}

function saveRelayListsFromSingleRelay() {
  try {
    localStorage.setItem("relayLists", JSON.stringify(app.relayLists));
  } catch (error) {
    console.error("Error saving relay lists:", error);
    showTemporaryNotification("Error saving relay lists");
  }
}
