async function blossomPageHandler() {
  mainContent.innerHTML = `
    <div id="blossomPage-container">
      <div class="loading-indicator">
        <p>Loading blossom servers...</p>
      </div>
    </div>
  `;

  let blossomPageContainer = document.getElementById("blossomPage-container");

  try {
    const pubkeyParam = window.location.hash.split("/")[1];

    let targetPubkey = null;
    let isCurrentUser = false;

    if (pubkeyParam) {
      targetPubkey = await decodePubkeyParam(pubkeyParam);

      if (!targetPubkey) {
        blossomPageContainer.innerHTML = `
          <div class="error-container">
            <h1>Invalid Pubkey</h1>
            <p>The pubkey you're trying to view is invalid or couldn't be decoded.</p>
            <a href="#blossom" class="nav-link">View My Servers</a>
          </div>
        `;
        return;
      }

      isCurrentUser = app.myPk === targetPubkey;
    } else {
      if (!app.myPk) {
        blossomPageContainer.innerHTML = `
          <div class="error-container">
            <h1>Not Logged In</h1>
            <p>Please log in to view your blossom servers.</p>
            <a href="#" class="nav-link">Return to Home</a>
          </div>
        `;
        return;
      }
      targetPubkey = app.myPk;
      isCurrentUser = true;
    }

    const targetNpub = getProfileNpub(targetPubkey);

blossomPageContainer.innerHTML = `
<div class="blossom-container">
  <div class="blossom-header">
    <h1>🌸 Blossom Servers</h1>
    <p class="blossom-current-pubkey">Current User: <code>${getProfileNpub(targetPubkey).substring(0, 16)}...${getProfileNpub(targetPubkey).slice(-8)}</code></p>
          
${
  app.isLoggedIn
    ? `
<div class="auth-controls">
  <label class="auth-controls-label">
    <input type="checkbox" id="autoAuthToggle" ${
      blossomAuthStore.getAutoAuth() ? "checked" : ""
    }>
    <span>🔐 Auto-authenticate with servers (when required)</span>
  </label>
  <p class="auth-controls-description">
    When enabled, automatically sign and send auth events to servers that require authentication.
  </p>
</div>
`
    : ""
}
<div class="blossom-pubkey-input">
            <input type="text" id="blossomPubkeyInput" placeholder="Enter npub or hex pubkey..." class="url-input">
            <button id="blossomPubkeyGoBtn" class="btn-small">Go</button>
          </div>
          <p class="blossom-viewing-label">
            ${
              isCurrentUser
                ? "Viewing your servers"
                : `Viewing servers for: <code>${targetNpub.substring(
                    0,
                    16
                  )}...${targetNpub.substring(targetNpub.length - 8)}</code>`
            }
          </p>
        </div>

        <div class="blossom-section">
          <h3>${
            isCurrentUser ? "My Blossom Servers" : "User's Blossom Servers"
          }</h3>
          <p class="tab-description">
            ${
              isCurrentUser
                ? "Manage your local server list. Use sync to fetch from relays or share to publish."
                : "Servers published by this user (kind:10063)."
            }
          </p>
          
          ${
            isCurrentUser
              ? `
            <div class="server-controls" style="margin-bottom: 20px;">
              <button id="syncServersBtn" class="btn">Sync from Relays</button>
              <button id="shareServersBtn" class="btn">Share to Relays</button>
            </div>
          `
              : ""
          }

          <div id="serverListContainer">
            <div class="loading-indicator">Loading servers...</div>
          </div>

          ${
            isCurrentUser
              ? `
            <div class="add-server-form">
              <input type="url" id="newServerUrl" placeholder="https://blossom.example.com" class="url-input">
              <button id="addServerBtn" class="btn-small">Add Server</button>
            </div>
          `
              : `
            <div class="server-controls" style="margin-top: 20px;">
              <button id="addAllToMyListBtn" class="btn">Add All to My List</button>
            </div>
          `
          }
        </div>

        <!-- Files Section -->
        <div class="blossom-section" id="filesSection">
          <h3>Files from ${isCurrentUser ? "My" : "User's"} Servers</h3>
          <p class="tab-description">
            Files published by this pubkey across ${
              isCurrentUser ? "enabled" : "all"
            } servers.
          </p>
          <button id="loadFilesBtn" class="btn">Load Files</button>
          <div id="filesContainer"></div>
        </div>

        <!-- Server Details Modal -->
        <div id="serverModal" class="modal" style="display:none;">
          <div class="modal-content">
            <span class="modal-close">&times;</span>
            <div id="serverModalContent"></div>
          </div>
        </div>

        <!-- Files Modal -->
        <div id="filesModal" class="modal" style="display:none;">
          <div class="modal-content">
            <span class="modal-close">&times;</span>
            <div id="filesModalContent"></div>
          </div>
        </div>
      </div>
    `;

    await initializeBlossomPage(targetPubkey, isCurrentUser);
  } catch (error) {
    console.error("Error rendering blossom page:", error);
    blossomPageContainer.innerHTML = `
      <div class="error-container">
        <h1>Blossom Page Error</h1>
        <p>Failed to load blossom page: ${error.message}</p>
        <button class="retry-button" onclick="window.location.reload()">Retry</button>
        <a href="#" class="nav-link">Return to Home</a>
      </div>
    `;
  }
}
async function initializeBlossomPage(targetPubkey, isCurrentUser) {
  let serverList = [];

  setupPubkeyInput();
  setupAutoAuthToggle();

  if (isCurrentUser) {
    serverList = loadLocalServerList();

    if (!serverList || serverList.length === 0) {
      serverList = [
        { url: "https://cdn.satellite.earth", enabled: true },
        { url: "https://blossom.primal.net", enabled: true },
        { url: "https://blossom.nostrmedia.com", enabled: true },
      ];
      saveLocalServerList(serverList);
    }

    renderServerList(serverList, isCurrentUser, targetPubkey);
    setupServerActions(serverList, isCurrentUser, targetPubkey);
    setupSyncButton(serverList, targetPubkey);
    setupShareButton(serverList);
  } else {
    serverList = await fetchKind10063(targetPubkey);

    if (serverList.length === 0) {
      document.getElementById("serverListContainer").innerHTML =
        '<p class="placeholder-text">This user has not published any blossom servers yet.</p>';
      return;
    }

    renderServerList(serverList, isCurrentUser, targetPubkey);
    setupServerActions(serverList, isCurrentUser, targetPubkey);
    setupAddAllToMyListButton(serverList);
  }

  // Add blob hash search feature
  setupBlobHashSearch(serverList, isCurrentUser);
  
  setupLoadFilesButton(serverList, targetPubkey, isCurrentUser);
}
// Add this new function
function setupAutoAuthToggle() {
  const toggle = document.getElementById("autoAuthToggle");
  if (!toggle) return;

  toggle.addEventListener("change", (e) => {
    blossomAuthStore.setAutoAuth(e.target.checked);
    console.log("Auto-auth", e.target.checked ? "enabled" : "disabled");
  });
}

function setupPubkeyInput() {
  const input = document.getElementById("blossomPubkeyInput");
  const goBtn = document.getElementById("blossomPubkeyGoBtn");

  const navigate = () => {
    const value = input.value.trim();
    if (!value) return;
    window.location.hash = `#blossom/${value}`;
  };

  goBtn.addEventListener("click", navigate);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") navigate();
  });
}

function renderServerList(servers, isCurrentUser, targetPubkey) {
  const container = document.getElementById("serverListContainer");

  if (!container) return;

  if (!servers || servers.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No servers in list</p>';
    return;
  }

  container.innerHTML = "";

  const serverListDiv = document.createElement("div");
  serverListDiv.className = "server-list";

  servers.forEach((server, index) => {
    const serverRow = createServerRow(
      server,
      index,
      isCurrentUser,
      targetPubkey
    );
    serverListDiv.appendChild(serverRow);
  });

  container.appendChild(serverListDiv);
}

function createServerRow(server, index, isCurrentUser, targetPubkey) {
  const serverRow = document.createElement("div");
  serverRow.className = "server-row";
  serverRow.dataset.index = index;

  const serverInfo = document.createElement("div");
  serverInfo.className = "server-info";

  // Server URL
  const urlSpan = document.createElement("span");
  urlSpan.className = "server-url";
  urlSpan.textContent = server.url;
  urlSpan.title = server.url;
  serverInfo.appendChild(urlSpan);

  // Auth status indicator (show for all when logged in)
  if (app.isLoggedIn) {
    const authStatus = document.createElement("span");
    authStatus.className = "server-auth-status";
    authStatus.dataset.url = server.url;
    authStatus.textContent = blossomAuthStore.has(server.url) ? "🔓" : "🔒";
    authStatus.title = blossomAuthStore.has(server.url)
      ? "Authenticated"
      : "Not authenticated";
    serverInfo.appendChild(authStatus);
  }

  // Ping status
  const pingStatus = document.createElement("span");
  pingStatus.className = "server-ping-status";
  pingStatus.dataset.url = server.url;

  const pingIndicator = document.createElement("span");
  pingIndicator.className = "ping-indicator";
  pingIndicator.textContent = "⏳";
  pingStatus.appendChild(pingIndicator);

  const pingLatency = document.createElement("span");
  pingLatency.className = "ping-latency";
  pingStatus.appendChild(pingLatency);

  serverInfo.appendChild(pingStatus);

  // Capabilities (if available)
  if (server.capabilities) {
    const capsSpan = document.createElement("span");
    capsSpan.className = "server-capabilities";
    capsSpan.title = formatCapabilities(server.capabilities);
    capsSpan.textContent = getCapabilityIcons(server.capabilities);
    serverInfo.appendChild(capsSpan);
  }

  serverRow.appendChild(serverInfo);

  // Actions
  const serverActions = document.createElement("div");
  serverActions.className = "server-actions";

  // Enable/Disable button (only for current user)
  if (isCurrentUser) {
    const enableBtn = document.createElement("button");
    enableBtn.className = "btn-tiny enable-btn";
    enableBtn.dataset.index = index;
    enableBtn.textContent = server.enabled ? "Disable" : "Enable";
    enableBtn.style.borderColor = server.enabled ? "#ef4444" : "#22c55e";
    serverActions.appendChild(enableBtn);
  }

  // Auth button (show for all when logged in)
  if (app.isLoggedIn) {
    const authBtn = document.createElement("button");
    authBtn.className = "btn-tiny auth-btn";
    authBtn.dataset.index = index;
    authBtn.textContent = blossomAuthStore.has(server.url) ? "Re-auth" : "Auth";
    authBtn.title = "Authenticate with this server";
    serverActions.appendChild(authBtn);
  }

  // Ping button
  const pingBtn = document.createElement("button");
  pingBtn.className = "btn-tiny ping-btn";
  pingBtn.dataset.index = index;
  pingBtn.textContent = "Ping";
  serverActions.appendChild(pingBtn);

  // Info button
  const infoBtn = document.createElement("button");
  infoBtn.className = "btn-tiny info-btn";
  infoBtn.dataset.index = index;
  infoBtn.textContent = "Info";
  serverActions.appendChild(infoBtn);

  // List Files button
  const listFilesBtn = document.createElement("button");
  listFilesBtn.className = "btn-tiny list-files-btn";
  listFilesBtn.dataset.index = index;
  listFilesBtn.textContent = "Files";
  serverActions.appendChild(listFilesBtn);

  // Add to My List button (only for viewing others)
  if (!isCurrentUser) {
    const addBtn = document.createElement("button");
    addBtn.className = "btn-tiny add-server-btn";
    addBtn.dataset.index = index;
    addBtn.textContent = "Add to My List";
    serverActions.appendChild(addBtn);
  }

  // Remove button (only for current user)
  if (isCurrentUser) {
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-tiny remove-btn";
    removeBtn.dataset.index = index;
    removeBtn.textContent = "Remove";
    serverActions.appendChild(removeBtn);
  }

  serverRow.appendChild(serverActions);

  // Auto-ping after creation
  setTimeout(() => pingServer(server), 100 * index);

  return serverRow;
}

function setupServerActions(serverList, isCurrentUser, targetPubkey) {
  const container = document.getElementById("serverListContainer");
  if (!container) return;

  // Enable/Disable buttons (current user only)
  if (isCurrentUser) {
    container.querySelectorAll(".enable-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        serverList[index].enabled = !serverList[index].enabled;
        saveLocalServerList(serverList);
        renderServerList(serverList, isCurrentUser, targetPubkey);
        setupServerActions(serverList, isCurrentUser, targetPubkey);
        console.log(
          `Server ${index} ${
            serverList[index].enabled ? "enabled" : "disabled"
          }`
        );
      });
    });
  }

  // Auth buttons
  if (app.isLoggedIn) {
    container.querySelectorAll(".auth-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const index = parseInt(e.target.dataset.index);
        const server = serverList[index];

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Authenticating...";

        try {
          const result = await authenticateWithBlossomServer(
            server.url,
            "list"
          );
          blossomAuthStore.set(server.url, result);

          // Update auth status indicator
          const authStatus = container.querySelector(
            `[data-url="${server.url}"].server-auth-status`
          );
          if (authStatus) {
            authStatus.textContent = "🔓";
            authStatus.title = `Authenticated - ${result.message}`;
          }

          btn.textContent = "Re-auth";

          // Show detailed notification
          let notificationMsg = `✓ Authenticated with ${
            new URL(server.url).hostname
          }`;
          if (result.verified) {
            notificationMsg += " (verified)";
          }
          if (result.requiresPayment) {
            notificationMsg += " - Payment required for operations";
          }

          showTemporaryNotification(notificationMsg);
          console.log("Auth result:", result);
        } catch (error) {
          console.error("Auth failed:", error);

          // Update auth status to show failure
          const authStatus = container.querySelector(
            `[data-url="${server.url}"].server-auth-status`
          );
          if (authStatus) {
            authStatus.textContent = "❌";
            authStatus.title = `Auth failed: ${error.message}`;
          }

          showTemporaryNotification(`❌ Auth failed: ${error.message}`);
          btn.textContent = originalText;
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  // Ping buttons
  container.querySelectorAll(".ping-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const index = parseInt(e.target.dataset.index);
      await pingServer(serverList[index]);
    });
  });

  // Info buttons
  container.querySelectorAll(".info-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const index = parseInt(e.target.dataset.index);
      await showServerInfo(serverList[index]);
    });
  });

  // List files buttons
  container.querySelectorAll(".list-files-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const index = parseInt(e.target.dataset.index);
      const pubkeyToUse = isCurrentUser ? app.myPk : targetPubkey;
      await listServerFiles(serverList[index], pubkeyToUse);
    });
  });

  // Add to My List buttons (viewing others only)
  if (!isCurrentUser) {
    container.querySelectorAll(".add-server-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        addSingleServerToMyList(serverList[index]);
      });
    });
  }

  // Remove buttons (current user only)
  if (isCurrentUser) {
    container.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        const server = serverList[index];

        if (confirm(`Remove server: ${server.url}?`)) {
          serverList.splice(index, 1);
          saveLocalServerList(serverList);
          renderServerList(serverList, isCurrentUser, targetPubkey);
          setupServerActions(serverList, isCurrentUser, targetPubkey);
          console.log(`Removed server: ${server.url}`);
        }
      });
    });

    // Add server button
    const addBtn = document.getElementById("addServerBtn");
    const input = document.getElementById("newServerUrl");

    if (addBtn && input) {
      const addServer = () => {
        const url = input.value.trim();
        if (!url) return;

        try {
          new URL(url);
        } catch (e) {
          alert("Invalid URL format");
          return;
        }

        if (serverList.some((s) => s.url === url)) {
          alert("Server already in list");
          return;
        }

        serverList.push({ url, enabled: true });
        saveLocalServerList(serverList);
        renderServerList(serverList, isCurrentUser, targetPubkey);
        setupServerActions(serverList, isCurrentUser, targetPubkey);
        input.value = "";
        console.log(`Added server: ${url}`);

        // Auto-ping the new server
        pingServer(serverList[serverList.length - 1]);
      };

      addBtn.addEventListener("click", addServer);
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") addServer();
      });
    }
  }
}

function addSingleServerToMyList(server) {
  if (!app.myPk) {
    alert("Please log in to add servers to your list");
    return;
  }

  const myList = loadLocalServerList() || [];

  if (myList.some((s) => s.url === server.url)) {
    alert("This server is already in your list!");
    return;
  }

  myList.push({ url: server.url, enabled: true });
  saveLocalServerList(myList);
  alert(`Added ${server.url} to your list!`);
}

async function showServerInfo(server) {
  const modal = document.getElementById("serverModal");
  const content = document.getElementById("serverModalContent");

  content.innerHTML =
    '<div class="loading-indicator">Loading server info...</div>';
  modal.style.display = "block";

  try {
    const info = await getServerInfo(server);

    // Check if we have auth for this server
    const authData = blossomAuthStore.get(server.url);

    content.innerHTML = `
      <h2>Server Information</h2>
      <div class="server-info-details">
        <p><strong>URL:</strong> ${server.url}</p>
        <p><strong>Status:</strong> ${
          info.online ? "✓ Online" : "✗ Offline"
        }</p>
        ${
          info.latency
            ? `<p><strong>Latency:</strong> ${info.latency}ms</p>`
            : ""
        }
        
${
  authData
    ? `
<div class="server-auth-active">
  <p><strong>🔓 Authentication Status:</strong> Active</p>
  <p>
    ${authData.message || "Authenticated"}<br>
    Expires: ${new Date(authData.expiresAt * 1000).toLocaleString()}
  </p>
</div>
`
    : info.capabilities.requiresAuth
    ? `
<div class="server-auth-required">
  <p><strong>🔒 Authentication:</strong> Required but not authenticated</p>
  <p>Use the Auth button to authenticate with this server</p>
</div>
`
    : ""
}
        
        <h3>Capabilities</h3>
        <ul>
          <li>Upload: ${info.capabilities.supportsUpload ? "✓" : "✗"}</li>
          <li>List: ${info.capabilities.supportsList ? "✓" : "✗"}</li>
          <li>Delete: ${info.capabilities.supportsDelete ? "✓" : "✗"}</li>
          <li>Mirror: ${info.capabilities.supportsMirror ? "✓" : "✗"}</li>
          <li>Media Optimization: ${
            info.capabilities.supportsMedia ? "✓" : "✗"
          }</li>
        </ul>
        
        <h3>Requirements</h3>
        <ul>
          <li>Authentication: ${
            info.capabilities.requiresAuth ? "Yes 🔐" : "No"
          }</li>
          <li>Payment: ${
            info.capabilities.requiresPayment ? "Yes 💰" : "No"
          }</li>
        </ul>
        
        ${info.cors ? `<p><strong>CORS:</strong> ${info.cors}</p>` : ""}
        ${
          info.authMethods && info.authMethods.length > 0
            ? `<p><strong>Payment Methods:</strong> ${info.authMethods.join(
                ", "
              )}</p>`
            : ""
        }
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<p class="error-text">Failed to load server info: ${error.message}</p>`;
  }

  setupModalClose(modal);
}
async function getServerInfo(server) {
  const testHash =
    "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553";
  const info = {
    online: false,
    latency: null,
    cors: null,
    authMethods: [],
    capabilities: {
      supportsUpload: false,
      supportsList: false,
      supportsDelete: false,
      supportsMirror: false,
      supportsMedia: false,
      requiresAuth: false,
      requiresPayment: false,
    },
  };

  try {
    // Test GET endpoint
    const startTime = performance.now();
    const getResponse = await fetch(`${server.url}/${testHash}`, {
      method: "HEAD",
    });
    const endTime = performance.now();

    info.online = true;
    info.latency = Math.round(endTime - startTime);
    info.cors =
      getResponse.headers.get("Access-Control-Allow-Origin") || "Not set";

    // Check for auth/payment requirements
    if (getResponse.status === 401 || getResponse.status === 403) {
      info.capabilities.requiresAuth = true;
    }
    if (getResponse.status === 402) {
      info.capabilities.requiresPayment = true;
      // Check for payment methods
      const xCashu = getResponse.headers.get("X-Cashu");
      const xLightning = getResponse.headers.get("X-Lightning");
      if (xCashu) info.authMethods.push("Cashu");
      if (xLightning) info.authMethods.push("Lightning");
    }

    // Test upload endpoint
    try {
      const uploadResponse = await fetch(`${server.url}/upload`, {
        method: "HEAD",
      });
      if (uploadResponse.status !== 404) {
        info.capabilities.supportsUpload = true;
        if (uploadResponse.status === 401 || uploadResponse.status === 403) {
          info.capabilities.requiresAuth = true;
        }
        if (uploadResponse.status === 402) {
          info.capabilities.requiresPayment = true;
          const xCashu = uploadResponse.headers.get("X-Cashu");
          const xLightning = uploadResponse.headers.get("X-Lightning");
          if (xCashu && !info.authMethods.includes("Cashu"))
            info.authMethods.push("Cashu");
          if (xLightning && !info.authMethods.includes("Lightning"))
            info.authMethods.push("Lightning");
        }
      }
    } catch (e) {}

    // Test list endpoint (only if we have pubkey)
    if (app.myPk) {
      try {
        const listResponse = await fetch(`${server.url}/list/${app.myPk}`, {
          method: "HEAD",
        });
        if (listResponse.status !== 404) {
          info.capabilities.supportsList = true;
        }
      } catch (e) {}
    }

    // Test mirror endpoint
    try {
      const mirrorResponse = await fetch(`${server.url}/mirror`, {
        method: "HEAD",
      });
      if (mirrorResponse.status !== 404) {
        info.capabilities.supportsMirror = true;
      }
    } catch (e) {}

    // Test media endpoint
    try {
      const mediaResponse = await fetch(`${server.url}/media`, {
        method: "HEAD",
      });
      if (mediaResponse.status !== 404) {
        info.capabilities.supportsMedia = true;
      }
    } catch (e) {}

    // Assume delete is supported if upload is supported
    info.capabilities.supportsDelete = info.capabilities.supportsUpload;
  } catch (error) {
    console.error(`Failed to get server info for ${server.url}:`, error);
  }

  return info;
}

async function listServerFiles(server, pubkey) {
  const modal = document.getElementById("filesModal");
  const content = document.getElementById("filesModalContent");

  if (!pubkey) {
    alert("Cannot list files: no pubkey available");
    return;
  }

  content.innerHTML = '<div class="loading-indicator">Loading files...</div>';
  modal.style.display = "block";

  try {
    const files = await fetchServerFiles(server.url, pubkey);

    content.innerHTML = "";

    const header = document.createElement("h2");
    header.textContent = `Files on ${server.url}`;
    content.appendChild(header);

    if (files.length === 0) {
      const emptyMsg = document.createElement("p");
      emptyMsg.textContent = "No files found for this pubkey.";
      content.appendChild(emptyMsg);
    } else {
      const fileListDiv = document.createElement("div");
      fileListDiv.className = "file-list";

      files.forEach((file) => {
        const fileItem = createFileItem(file);
        fileListDiv.appendChild(fileItem);
      });

      content.appendChild(fileListDiv);

      const totalP = document.createElement("p");
      totalP.innerHTML = `<strong>Total:</strong> ${files.length} file(s)`;
      content.appendChild(totalP);
    }
  } catch (error) {
    content.innerHTML = "";
    const errorP = document.createElement("p");
    errorP.className = "error-text";
    errorP.textContent = `Failed to load files: ${error.message}`;
    content.appendChild(errorP);
  }

  setupModalClose(modal);
}

function createFileItem(file) {
  const fileItem = document.createElement("div");
  fileItem.className = "file-item";

  const sha256P = document.createElement("p");
  sha256P.innerHTML = `<strong>SHA-256:</strong> <code>${file.sha256.substring(
    0,
    16
  )}...</code>`;
  fileItem.appendChild(sha256P);

  const sizeP = document.createElement("p");
  sizeP.innerHTML = `<strong>Size:</strong> ${formatBytes(file.size)}`;
  fileItem.appendChild(sizeP);

  const typeP = document.createElement("p");
  typeP.innerHTML = `<strong>Type:</strong> ${file.type}`;
  fileItem.appendChild(typeP);

  const uploadedP = document.createElement("p");
  uploadedP.innerHTML = `<strong>Uploaded:</strong> ${new Date(
    file.uploaded * 1000
  ).toLocaleString()}`;
  fileItem.appendChild(uploadedP);

  const openBtn = document.createElement("a");
  openBtn.href = file.url;
  openBtn.target = "_blank";
  openBtn.className = "btn-tiny";
  openBtn.textContent = "Open";
  fileItem.appendChild(openBtn);

  return fileItem;
}

async function fetchServerFiles(serverUrl, pubkey, useAuth = true) {
  try {
    const authData = useAuth ? blossomAuthStore.get(serverUrl) : null;
    const autoAuth = blossomAuthStore.getAutoAuth(); // Use global setting

    let response;

    if (authData) {
      // Try with stored auth
      console.log(`Using stored auth for ${serverUrl}`);
      response = await authenticatedBlossomRequest(
        `${serverUrl}/list/${pubkey}`,
        { method: "GET" },
        authData.authEvent
      );

      // If stored auth failed (401/403), it might be expired, remove it and retry
      if (
        (response.status === 401 || response.status === 403) &&
        autoAuth &&
        app.isLoggedIn
      ) {
        console.log(
          `Stored auth failed for ${serverUrl}, clearing and retrying...`
        );
        blossomAuthStore.set(serverUrl, null); // Clear invalid auth
        authData = null; // Force re-auth below
      }
    }

    if (!authData) {
      // Try without auth first
      response = await fetch(`${serverUrl}/list/${pubkey}`);
    }

    // If 401/403 and auto-auth is enabled, try to authenticate
    if (
      (response.status === 401 || response.status === 403) &&
      autoAuth &&
      app.isLoggedIn
    ) {
      console.log(
        `Server requires auth, auto-authenticating with ${serverUrl}...`
      );
      try {
        const authResult = await authenticateWithBlossomServer(
          serverUrl,
          "list"
        );
        blossomAuthStore.set(serverUrl, authResult);

        if (authResult.verified) {
          console.log(`✓ Auto-auth verified for ${serverUrl}`);
        } else {
          console.log(
            `⚠ Auto-auth completed but not verified for ${serverUrl}: ${authResult.message}`
          );
        }

        // Retry with auth
        response = await authenticatedBlossomRequest(
          `${serverUrl}/list/${pubkey}`,
          { method: "GET" },
          authResult.authEvent
        );

        // Check if it worked this time
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Authentication was created but server still rejected it: ${
              response.headers.get("X-Reason") || "Unknown reason"
            }`
          );
        }
      } catch (authError) {
        console.error("Auto-auth failed:", authError);
        throw new Error(`Auto-auth failed: ${authError.message}`);
      }
    }

    if (response.status === 401 || response.status === 403) {
      const reason =
        response.headers.get("X-Reason") || "Authentication required";
      throw new Error(reason);
    }

    if (response.status === 402) {
      const reason = response.headers.get("X-Reason") || "Payment required";
      throw new Error(reason);
    }

    if (!response.ok) {
      const reason = response.headers.get("X-Reason");
      throw new Error(reason || `HTTP ${response.status}`);
    }

    const files = await response.json();
    return files;
  } catch (error) {
    console.error(`Failed to fetch files from ${serverUrl}:`, error);
    throw error;
  }
}

async function pingServer(server) {
  const url = server.url;
  console.log(`Pinging: ${url}`);

  const statusSpan = document.querySelector(
    `[data-url="${url}"] .ping-indicator`
  );
  const latencySpan = document.querySelector(
    `[data-url="${url}"] .ping-latency`
  );

  if (statusSpan) {
    statusSpan.textContent = "⏳";
    statusSpan.title = "Pinging...";
  }
  if (latencySpan) {
    latencySpan.textContent = "";
  }

  try {
    const testHash =
      "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553";
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

    if (statusSpan) {
      if (response.ok || response.status === 404) {
        statusSpan.textContent = "✓";
        statusSpan.title = `Online (${pingTime}ms)`;
        statusSpan.style.color = "#22c55e";
      } else if (response.status === 401 || response.status === 403) {
        statusSpan.textContent = "🔐";
        statusSpan.title = `Requires Authentication (${pingTime}ms)`;
        statusSpan.style.color = "#3b82f6";
      } else if (response.status === 402) {
        statusSpan.textContent = "💰";
        statusSpan.title = `Requires Payment (${pingTime}ms)`;
        statusSpan.style.color = "#f59e0b";
      } else {
        statusSpan.textContent = "⚠";
        const reason =
          response.headers.get("X-Reason") || `HTTP ${response.status}`;
        statusSpan.title = `${reason} (${pingTime}ms)`;
        statusSpan.style.color = "#f59e0b";
      }
    }

    if (latencySpan) {
      latencySpan.textContent = `${pingTime}ms`;
    }

    console.log(
      `✓ Ping result: ${url} (${pingTime}ms, status: ${response.status})`
    );
  } catch (error) {
    if (statusSpan) {
      statusSpan.textContent = "✗";
      statusSpan.title = `Offline or unreachable: ${error.message}`;
      statusSpan.style.color = "#ef4444";
    }
    if (latencySpan) {
      latencySpan.textContent = "";
    }
    console.log(`✗ Ping failed: ${url} - ${error.message}`);
  }
}

function setupLoadFilesButton(serverList, targetPubkey, isCurrentUser) {
  const loadFilesBtn = document.getElementById("loadFilesBtn");
  const filesContainer = document.getElementById("filesContainer");

  if (!loadFilesBtn || !filesContainer) return;

  loadFilesBtn.addEventListener("click", async () => {
    loadFilesBtn.disabled = true;
    loadFilesBtn.textContent = "Loading...";
    filesContainer.innerHTML =
      '<div class="loading-indicator">Loading files from servers...</div>';

    try {
      const serversToQuery = isCurrentUser
        ? serverList.filter((s) => s.enabled)
        : serverList;

      if (serversToQuery.length === 0) {
        filesContainer.innerHTML =
          '<p class="placeholder-text">No enabled servers to query.</p>';
        return;
      }

      const allFiles = new Map(); // Use Map to deduplicate by sha256

      for (const server of serversToQuery) {
        try {
          const files = await fetchServerFiles(server.url, targetPubkey);
          files.forEach((file) => {
            if (!allFiles.has(file.sha256)) {
              allFiles.set(file.sha256, { ...file, servers: [server.url] });
            } else {
              allFiles.get(file.sha256).servers.push(server.url);
            }
          });
        } catch (error) {
          console.warn(`Failed to fetch from ${server.url}:`, error.message);
        }
      }

      filesContainer.innerHTML = "";

      if (allFiles.size === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "placeholder-text";
        emptyMsg.textContent = "No files found across servers.";
        filesContainer.appendChild(emptyMsg);
      } else {
        const fileListDiv = document.createElement("div");
        fileListDiv.className = "file-list";
        allFiles.forEach((file) => {
          const fileItem = createFileItem(file);

          // Add server count info
          const serversInfo = document.createElement("p");
          serversInfo.innerHTML = `<strong>Available on:</strong> ${file.servers.length} server(s)`;
          serversInfo.style.fontSize = "0.9em";
          fileItem.appendChild(serversInfo);

          fileListDiv.appendChild(fileItem);
        });

        filesContainer.appendChild(fileListDiv);

        const totalP = document.createElement("p");
        totalP.innerHTML = `<strong>Total:</strong> ${allFiles.size} unique file(s) across ${serversToQuery.length} server(s)`;
        filesContainer.appendChild(totalP);
      }
    } catch (error) {
      filesContainer.innerHTML = "";
      const errorP = document.createElement("p");
      errorP.className = "error-text";
      errorP.textContent = `Failed to load files: ${error.message}`;
      filesContainer.appendChild(errorP);
    } finally {
      loadFilesBtn.disabled = false;
      loadFilesBtn.textContent = "Load Files";
    }
  });
}

async function fetchKind10063(pubkey) {
  console.log(`[FETCH] Fetching kind:10063 for pubkey: ${pubkey}`);
  try {
    const allRelays = [...app.globalRelays];
    const pool = new window.NostrTools.SimplePool();
    const filter = {
      kinds: [10063],
      authors: [pubkey],
      limit: 1,
    };

    const events = await pool.querySync(allRelays, filter);
    pool.close(allRelays);

    if (events.length === 0) {
      console.log("[FETCH] No kind:10063 event found");
      return [];
    }

    const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
    console.log("[FETCH] Found kind:10063 event:", latestEvent);

    const serverTags = latestEvent.tags.filter((tag) => tag[0] === "server");
    const servers = serverTags.map((tag) => ({
      url: tag[1],
      enabled: true,
    }));

    console.log(`[FETCH] Extracted ${servers.length} servers:`, servers);
    return servers;
  } catch (error) {
    console.error("[FETCH] Error fetching kind:10063:", error);
    return [];
  }
}
function setupSyncButton(serverList, targetPubkey) {
  const syncBtn = document.getElementById("syncServersBtn");
  if (!syncBtn) return;
  syncBtn.addEventListener("click", async () => {
    console.log("[SYNC] Syncing servers from relays...");
    if (!app.myPk) {
      alert("Not logged in");
      return;
    }

    syncBtn.disabled = true;
    syncBtn.textContent = "Syncing...";

    try {
      const publishedServers = await fetchKind10063(app.myPk);

      if (publishedServers.length === 0) {
        alert("No published server list found on relays.");
        return;
      }

      const newServers = publishedServers.filter(
        (ps) => !serverList.some((ls) => ls.url === ps.url)
      );

      const removedServers = serverList.filter(
        (ls) => !publishedServers.some((ps) => ps.url === ls.url)
      );

      if (newServers.length === 0 && removedServers.length === 0) {
        alert("Your local list is already in sync!");
        return;
      }

      let message = "Sync differences found:\n\n";
      if (newServers.length > 0) {
        message += `New servers to add:\n${newServers
          .map((s) => "+ " + s.url)
          .join("\n")}\n\n`;
      }
      if (removedServers.length > 0) {
        message += `Servers to remove:\n${removedServers
          .map((s) => "- " + s.url)
          .join("\n")}\n\n`;
      }
      message += "Apply these changes?";

      if (confirm(message)) {
        const syncedList = publishedServers.map((ps) => ({
          url: ps.url,
          enabled: serverList.find((ls) => ls.url === ps.url)?.enabled ?? true,
        }));

        saveLocalServerList(syncedList);
        window.location.reload();
      }
    } catch (error) {
      console.error("[SYNC] Error:", error);
      alert("Failed to sync: " + error.message);
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = "Sync from Relays";
    }
  });
}
function setupShareButton(serverList) {
  const shareBtn = document.getElementById("shareServersBtn");
  if (!shareBtn) return;
  shareBtn.addEventListener("click", async () => {
    console.log("[SHARE] Sharing servers to relays...");
    if (!app.myPk) {
      alert("Not logged in");
      return;
    }

    const enabledServers = serverList.filter((s) => s.enabled);

    if (enabledServers.length === 0) {
      alert("No enabled servers to share");
      return;
    }

    shareBtn.disabled = true;
    shareBtn.textContent = "Sharing...";

    try {
      const eventTemplate = {
        kind: 10063,
        content: "",
        created_at: Math.floor(Date.now() / 1000),
        tags: enabledServers.map((s) => ["server", s.url]),
      };

      console.log("[SHARE] Event template:", eventTemplate);

      const signedEvent = await handleEventSigning(eventTemplate);
      console.log("[SHARE] Event signed:", signedEvent);

      const result = await publishEvent(signedEvent, null, {
        successMessage: "Server list published successfully",
        errorMessage: "Failed to publish server list",
      });

      if (result.success) {
        alert(
          `✓ Published to ${result.successCount}/${result.totalCount} relays`
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("[SHARE] Error:", error);
      alert("Failed to publish: " + error.message);
    } finally {
      shareBtn.disabled = false;
      shareBtn.textContent = "Share to Relays";
    }
  });
}
function setupAddAllToMyListButton(serverList) {
  const addBtn = document.getElementById("addAllToMyListBtn");
  if (!addBtn || !app.myPk) return;
  addBtn.addEventListener("click", () => {
    const myList = loadLocalServerList() || [];
    const newServers = serverList.filter(
      (s) => !myList.some((ms) => ms.url === s.url)
    );

    if (newServers.length === 0) {
      alert("All servers from this list are already in your list!");
      return;
    }

    const message = `Add these servers to your list?\n\n${newServers
      .map((s) => s.url)
      .join("\n")}`;

    if (confirm(message)) {
      newServers.forEach((s) => {
        myList.push({ url: s.url, enabled: true });
      });

      saveLocalServerList(myList);
      alert(`Added ${newServers.length} server(s) to your list!`);
    }
  });
}
function setupModalClose(modal) {
  const closeBtn = modal.querySelector(".modal-close");
  closeBtn.onclick = () => {
    modal.style.display = "none";
  };
  window.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  };
}
function formatCapabilities(caps) {
  const features = [];
  if (caps.requiresAuth) features.push("Auth Required");
  if (caps.requiresPayment) features.push("Payment Required");
  if (caps.supportsUpload) features.push("Upload");
  if (caps.supportsList) features.push("List");
  if (caps.supportsDelete) features.push("Delete");
  if (caps.supportsMirror) features.push("Mirror");
  return features.join(", ");
}
function getCapabilityIcons(caps) {
  let icons = "";
  if (caps.requiresAuth) icons += "🔐 ";
  if (caps.requiresPayment) icons += "💰 ";
  if (caps.supportsUpload) icons += "⬆️ ";
  return icons.trim();
}

function loadLocalServerList() {
  try {
    const stored = localStorage.getItem("blossomServerList");
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("Error loading local server list:", e);
    return null;
  }
}
function saveLocalServerList(list) {
  try {
    localStorage.setItem("blossomServerList", JSON.stringify(list));
    console.log("Saved local server list");
  } catch (e) {
    console.error("Error saving local server list:", e);
  }
}
async function decodePubkeyParam(pubkeyParam) {
  if (!pubkeyParam) return null;
  let pubkey = null;
  if (pubkeyParam.startsWith("npub") || pubkeyParam.startsWith("nprofile")) {
    try {
      const decoded = window.NostrTools.nip19.decode(pubkeyParam);
      if (decoded.type === "npub") {
        pubkey = decoded.data;
      } else if (decoded.type === "nprofile") {
        pubkey = decoded.data.pubkey;
      }
    } catch (decodeError) {
      console.error("Failed to decode Nostr identifier:", decodeError);
      return null;
    }
  } else if (pubkeyParam.length === 64 && /^[0-9a-f]+$/i.test(pubkeyParam)) {
    pubkey = pubkeyParam;
  }
  return pubkey;
}

// helper functions

/**
 * Creates a Blossom auth event for a specific action
 * @param {string} action - The action type: 'get', 'upload', 'list', or 'delete'
 * @param {string} serverUrl - The server URL (optional)
 * @param {Array<string>} hashes - Array of sha256 hashes (optional)
 * @param {string} description - Human-readable description
 * @returns {Object} Event template
 */
function createBlossomAuthEvent(
  action,
  serverUrl = null,
  hashes = [],
  description = ""
) {
  const tags = [
    ["t", action],
    ["expiration", (Math.floor(Date.now() / 1000) + 86400).toString()], // 24 hours from now, as string
  ];

  if (serverUrl) {
    tags.push(["server", serverUrl]);
  }

  if (hashes && hashes.length > 0) {
    hashes.forEach((hash) => tags.push(["x", hash]));
  }

  return {
    kind: 24242,
    content: description || `Blossom ${action} authorization`,
    created_at: Math.floor(Date.now() / 1000),
    tags: tags,
    pubkey: app.myPk || "", // This will be set by handleEventSigning, but include it for completeness
  };
}

/**
 * Sends authenticated request to Blossom server
 * @param {string} url - The endpoint URL
 * @param {Object} options - Fetch options
 * @param {Object} authEvent - Signed auth event
 * @returns {Promise<Response>}
 */
async function authenticatedBlossomRequest(url, options = {}, authEvent) {
  const headers = {
    ...options.headers,
    Authorization: `Nostr ${btoa(JSON.stringify(authEvent))}`,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Authenticates with a Blossom server and verifies it works
 * @param {string} serverUrl - The server URL
 * @param {string} action - The action type (get, upload, list, delete)
 * @returns {Promise<Object>} Result object with success status and auth event
 */
async function authenticateWithBlossomServer(serverUrl, action = "get") {
  if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
    throw new Error("Not logged in");
  }

  try {
    const eventTemplate = createBlossomAuthEvent(
      action,
      serverUrl,
      [],
      `Authenticate with ${new URL(serverUrl).hostname} for ${action}`
    );

    console.log("Auth event template:", eventTemplate);

    const signedEvent = await handleEventSigning(eventTemplate);

    console.log("Signed auth event:", signedEvent);

    // Test the auth with the server
    let testEndpoint;
    let testMethod = "HEAD";

    if (action === "list") {
      // Test with /list endpoint
      testEndpoint = `${serverUrl}/list/${app.myPk || signedEvent.pubkey}`;
    } else if (action === "upload") {
      // Test with /upload endpoint
      testEndpoint = `${serverUrl}/upload`;
    } else if (action === "get") {
      // Test with a dummy hash
      const testHash =
        "b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553";
      testEndpoint = `${serverUrl}/${testHash}`;
    } else if (action === "delete") {
      // Can't really test delete without a hash, just verify signing worked
      return {
        success: true,
        authEvent: signedEvent,
        expiresAt: parseInt(
          signedEvent.tags.find((t) => t[0] === "expiration")?.[1] || "0"
        ),
        verified: false,
        message:
          "Auth event signed (delete action cannot be tested without a file hash)",
      };
    }

    console.log(`Testing auth with ${testEndpoint}...`);

    const response = await authenticatedBlossomRequest(
      testEndpoint,
      { method: testMethod },
      signedEvent
    );

    console.log("Server response status:", response.status);
    console.log("Server response headers:", [...response.headers.entries()]);

    // Check if auth was successful
    if (response.status === 401 || response.status === 403) {
      const reason =
        response.headers.get("X-Reason") || "Authentication rejected by server";
      throw new Error(`Auth rejected: ${reason}`);
    }

    // 402 means payment required (but auth was accepted)
    if (response.status === 402) {
      return {
        success: true,
        authEvent: signedEvent,
        expiresAt: parseInt(
          signedEvent.tags.find((t) => t[0] === "expiration")?.[1] || "0"
        ),
        verified: true,
        requiresPayment: true,
        message: "Authentication accepted but payment required",
      };
    }

    // 200, 404, or other non-auth errors mean auth was accepted
    const verified = response.ok || response.status === 404;

    return {
      success: true,
      authEvent: signedEvent,
      expiresAt: parseInt(
        signedEvent.tags.find((t) => t[0] === "expiration")?.[1] || "0"
      ),
      verified: verified,
      message: verified
        ? "Authentication verified by server"
        : `Server returned ${response.status} (auth may have been accepted)`,
    };
  } catch (error) {
    console.error("Failed to authenticate with server:", error);
    throw error;
  }
}

// Storage for auth events (per server) and auto-auth setting
const blossomAuthStore = {
  _store: new Map(),

  set(serverUrl, authData) {
    this._store.set(serverUrl, authData);
  },

  get(serverUrl) {
    const data = this._store.get(serverUrl);
    if (!data) return null;

    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    if (data.expiresAt && data.expiresAt < now) {
      this._store.delete(serverUrl);
      return null;
    }

    return data;
  },

  has(serverUrl) {
    return this.get(serverUrl) !== null;
  },

  clear() {
    this._store.clear();
  },

  // Auto-auth settings
  getAutoAuth() {
    try {
      const stored = localStorage.getItem("blossomAutoAuth");
      return stored === "true";
    } catch (e) {
      return false;
    }
  },

  setAutoAuth(enabled) {
    try {
      localStorage.setItem("blossomAutoAuth", enabled ? "true" : "false");
    } catch (e) {
      console.error("Failed to save auto-auth setting:", e);
    }
  },
};

// ============================================
// BLOSSOM HELPER FUNCTIONS (for use by other pages)
// ============================================
async function getBlossomServersForPubkey(pubkey) {
  return await fetchKind10063(pubkey);
}
function getEnabledBlossomServers() {
  const list = loadLocalServerList();
  if (!list) return [];
  return list.filter((s) => s.enabled).map((s) => s.url);
}
function extractSha256FromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const hexPattern = /[a-f0-9]{64}/gi;
    const matches = pathname.match(hexPattern);
    if (matches && matches.length > 0) {
      return matches[matches.length - 1].toLowerCase();
    }

    return null;
  } catch (e) {
    return null;
  }
}


////
/**
 * Check if a blob exists on a server
 * @param {string} serverUrl - The server URL
 * @param {string} sha256 - The blob hash
 * @returns {Promise<Object>} Result with exists status and metadata
 */
async function checkBlobOnServer(serverUrl, sha256) {
  try {
    const authData = blossomAuthStore.get(serverUrl);
    const autoAuth = blossomAuthStore.getAutoAuth();

    let response;

    // Try with auth if available
    if (authData) {
      response = await authenticatedBlossomRequest(
        `${serverUrl}/${sha256}`,
        { method: "HEAD" },
        authData.authEvent
      );

      // If auth failed and auto-auth is enabled, clear and retry
      if (
        (response.status === 401 || response.status === 403) &&
        autoAuth &&
        app.isLoggedIn
      ) {
        blossomAuthStore.set(serverUrl, null);
        authData = null;
      }
    }

    // Try without auth
    if (!authData) {
      response = await fetch(`${serverUrl}/${sha256}`, { method: "HEAD" });
    }

    // Auto-authenticate if needed
    if (
      (response.status === 401 || response.status === 403) &&
      autoAuth &&
      app.isLoggedIn
    ) {
      try {
        const authResult = await authenticateWithBlossomServer(serverUrl, "get");
        blossomAuthStore.set(serverUrl, authResult);
        
        response = await authenticatedBlossomRequest(
          `${serverUrl}/${sha256}`,
          { method: "HEAD" },
          authResult.authEvent
        );
      } catch (authError) {
        console.error(`Auto-auth failed for ${serverUrl}:`, authError);
      }
    }

    const result = {
      serverUrl,
      exists: false,
      status: response.status,
      error: null,
      metadata: {}
    };

    if (response.ok) {
      result.exists = true;
      result.metadata = {
        contentType: response.headers.get("Content-Type"),
        contentLength: response.headers.get("Content-Length"),
        acceptRanges: response.headers.get("Accept-Ranges"),
      };
    } else if (response.status === 401 || response.status === 403) {
      result.error = response.headers.get("X-Reason") || "Authentication required";
    } else if (response.status === 402) {
      result.error = response.headers.get("X-Reason") || "Payment required";
    } else if (response.status === 404) {
      result.exists = false;
      result.error = "Blob not found";
    } else {
      result.error = response.headers.get("X-Reason") || `HTTP ${response.status}`;
    }

    return result;
  } catch (error) {
    return {
      serverUrl,
      exists: false,
      status: null,
      error: error.message,
      metadata: {}
    };
  }
}

/**
 * Check a blob across multiple servers
 * @param {string} sha256 - The blob hash
 * @param {Array<Object>} servers - Array of server objects with url property
 * @returns {Promise<Array>} Array of check results
 */
async function checkBlobAcrossServers(sha256, servers) {
  const results = await Promise.all(
    servers.map(server => checkBlobOnServer(server.url, sha256))
  );
  return results;
}

/**
 * Render blob check results in the UI
 * @param {string} sha256 - The blob hash
 * @param {Array} results - Array of check results
 */
function renderBlobCheckResults(sha256, results) {
  const container = document.getElementById("blobCheckResults");
  if (!container) return;

  container.innerHTML = "";

  // Summary
  const foundServers = results.filter(r => r.exists);
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "blob-check-summary";
  summaryDiv.innerHTML = `
    <h4>Blob Check Results</h4>
    <p><strong>Hash:</strong> <code>${sha256}</code></p>
    <p><strong>Found on:</strong> ${foundServers.length} / ${results.length} server(s)</p>
    <div id="blobPublishers" class="blob-publishers">
      <p><em>Searching for publishers...</em></p>
    </div>
  `;
  container.appendChild(summaryDiv);

  // Find and display publishers
  findBlobPublishers(sha256).then(pubkeys => {
    const publishersDiv = document.getElementById("blobPublishers");
    if (!publishersDiv) return;

    if (pubkeys.length === 0) {
      publishersDiv.innerHTML = `<p><strong>Publishers:</strong> <em>None found on relays</em></p>`;
    } else {
      const publishersList = pubkeys.map(pk => {
        const npub = getProfileNpub(pk);
        return `<span class="publisher-item"><code>${npub.substring(0, 16)}...${npub.slice(-8)}</code></span>`;
      }).join(", ");
      
      publishersDiv.innerHTML = `<p><strong>Publishers (${pubkeys.length}):</strong> ${publishersList}</p>`;
    }
  });

  // Individual results
  const resultsDiv = document.createElement("div");
  resultsDiv.className = "blob-check-list";

  results.forEach(result => {
    const resultRow = document.createElement("div");
    resultRow.className = "blob-check-row";

    const serverSpan = document.createElement("span");
    serverSpan.className = "server-url";
    serverSpan.textContent = new URL(result.serverUrl).hostname;
    serverSpan.title = result.serverUrl;
    resultRow.appendChild(serverSpan);

    const statusSpan = document.createElement("span");
    statusSpan.className = "blob-check-status";
    
    if (result.exists) {
      statusSpan.innerHTML = "✓ Found";
      statusSpan.style.color = "#22c55e";
      statusSpan.title = `${result.metadata.contentType || 'unknown type'} - ${formatBytes(parseInt(result.metadata.contentLength) || 0)}`;
    } else if (result.error) {
      if (result.status === 401 || result.status === 403) {
        statusSpan.innerHTML = "🔐 Auth Required";
        statusSpan.style.color = "#3b82f6";
      } else if (result.status === 402) {
        statusSpan.innerHTML = "💰 Payment Required";
        statusSpan.style.color = "#f59e0b";
      } else {
        statusSpan.innerHTML = "✗ " + result.error;
        statusSpan.style.color = "#ef4444";
      }
      statusSpan.title = result.error;
    }
    
    resultRow.appendChild(statusSpan);

    // Add open button if blob exists
    if (result.exists) {
      const openBtn = document.createElement("a");
      openBtn.href = `${result.serverUrl}/${sha256}`;
      openBtn.target = "_blank";
      openBtn.className = "btn-tiny";
      openBtn.textContent = "Open";
      openBtn.style.marginLeft = "10px";
      resultRow.appendChild(openBtn);
    }

    resultsDiv.appendChild(resultRow);
  });

  container.appendChild(resultsDiv);

  // If blob was found, try to render it
  const firstFound = foundServers[0];
  if (firstFound) {
    renderBlobPreview(sha256, firstFound);
  }
}

/**
 * Render a preview of the blob
 * @param {string} sha256 - The blob hash
 * @param {Object} result - The check result with metadata
 */
function renderBlobPreview(sha256, result) {
  const previewContainer = document.getElementById("blobPreview");
  if (!previewContainer) return;

  const contentType = result.metadata.contentType || "";
  const blobUrl = `${result.serverUrl}/${sha256}`;

  previewContainer.innerHTML = `<h4>Blob Preview</h4>`;

  const previewDiv = document.createElement("div");
  previewDiv.className = "blob-preview-content";

  if (contentType.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = blobUrl;
    img.alt = "Blob preview";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "500px";
    previewDiv.appendChild(img);
  } else if (contentType.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = blobUrl;
    video.controls = true;
    video.style.maxWidth = "100%";
    video.style.maxHeight = "500px";
    previewDiv.appendChild(video);
  } else if (contentType.startsWith("audio/")) {
    const audio = document.createElement("audio");
    audio.src = blobUrl;
    audio.controls = true;
    audio.style.width = "100%";
    previewDiv.appendChild(audio);
  } else if (contentType === "application/pdf") {
    const embed = document.createElement("embed");
    embed.src = blobUrl;
    embed.type = "application/pdf";
    embed.style.width = "100%";
    embed.style.height = "500px";
    previewDiv.appendChild(embed);
  } else if (contentType.startsWith("text/")) {
    const pre = document.createElement("pre");
    pre.textContent = "Loading...";
    previewDiv.appendChild(pre);
    
    fetch(blobUrl)
      .then(r => r.text())
      .then(text => {
        pre.textContent = text.substring(0, 5000); // Limit text preview
        if (text.length > 5000) {
          pre.textContent += "\n\n... (truncated)";
        }
      })
      .catch(err => {
        pre.textContent = `Failed to load: ${err.message}`;
      });
  } else {
    const info = document.createElement("p");
    info.innerHTML = `
      <strong>Type:</strong> ${contentType || "Unknown"}<br>
      <strong>Size:</strong> ${formatBytes(parseInt(result.metadata.contentLength) || 0)}<br>
      <a href="${blobUrl}" target="_blank" class="btn-small">Download</a>
    `;
    previewDiv.appendChild(info);
  }

  previewContainer.appendChild(previewDiv);
}

/**
 * Setup the blob hash search UI and handlers
 * @param {Array} serverList - The server list
 * @param {boolean} isCurrentUser - Whether viewing own servers
 */
function setupBlobHashSearch(serverList, isCurrentUser) {
  const searchContainer = document.createElement("div");
  searchContainer.className = "blossom-section";
  searchContainer.innerHTML = `
    <h3>Search Blob by Hash</h3>
    <p class="tab-description">
      Check if a specific blob exists on ${isCurrentUser ? "your enabled" : "these"} servers.
    </p>
    <div class="blob-search-form">
      <input 
        type="text" 
        id="blobHashInput" 
        placeholder="Enter 64-character SHA-256 hash..." 
        class="url-input"
        pattern="[a-fA-F0-9]{64}"
        maxlength="64"
      >
      <button id="checkBlobBtn" class="btn-small">Check Blob</button>
    </div>
    <div id="blobCheckResults"></div>
    <div id="blobPreview"></div>
  `;

  const filesSection = document.getElementById("filesSection");
  if (filesSection) {
    filesSection.parentNode.insertBefore(searchContainer, filesSection);
  }

  const input = document.getElementById("blobHashInput");
  const checkBtn = document.getElementById("checkBlobBtn");

  const checkBlob = async () => {
    const hash = input.value.trim().toLowerCase();
    
    if (!hash) {
      showTemporaryNotification("Please enter a blob hash");
      return;
    }

    if (!/^[a-f0-9]{64}$/.test(hash)) {
      showTemporaryNotification("Invalid hash format (must be 64 hex characters)");
      return;
    }

    checkBtn.disabled = true;
    checkBtn.textContent = "Checking...";

    const resultsContainer = document.getElementById("blobCheckResults");
    const previewContainer = document.getElementById("blobPreview");
    resultsContainer.innerHTML = '<div class="loading-indicator">Checking servers...</div>';
    previewContainer.innerHTML = "";

    try {
      const serversToCheck = isCurrentUser 
        ? serverList.filter(s => s.enabled)
        : serverList;

      if (serversToCheck.length === 0) {
        resultsContainer.innerHTML = '<p class="placeholder-text">No servers to check.</p>';
        return;
      }

      const results = await checkBlobAcrossServers(hash, serversToCheck);
      renderBlobCheckResults(hash, results);

      const foundCount = results.filter(r => r.exists).length;
      showTemporaryNotification(
        foundCount > 0 
          ? `✓ Blob found on ${foundCount} server(s)`
          : "Blob not found on any server"
      );
    } catch (error) {
      console.error("Error checking blob:", error);
      resultsContainer.innerHTML = `<p class="error-text">Error: ${error.message}</p>`;
      showTemporaryNotification("❌ Failed to check blob");
    } finally {
      checkBtn.disabled = false;
      checkBtn.textContent = "Check Blob";
    }
  };

  checkBtn.addEventListener("click", checkBlob);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkBlob();
  });
}

/**
 * Find publishers of a specific blob by searching for kind 1063 events
 * @param {string} sha256 - The blob hash
 * @returns {Promise<Array>} Array of pubkeys
 */
async function findBlobPublishers(sha256) {
  try {
    const allRelays = [...app.globalRelays];
    const pool = new window.NostrTools.SimplePool();
    const filter = {
      kinds: [1063], // Media events
      "#x": [sha256],
      limit: 50
    };

    const events = await pool.querySync(allRelays, filter);
    pool.close(allRelays);

    // Extract unique pubkeys
    const pubkeys = [...new Set(events.map(e => e.pubkey))];
    console.log(`Found ${pubkeys.length} publisher(s) for blob ${sha256}`);
    
    return pubkeys;
  } catch (error) {
    console.error("Error finding blob publishers:", error);
    return [];
  }
}

//console.log("🌸 Blossom page loaded with enhanced capabilities");
