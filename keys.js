async function handleNostrLogin() {
  console.log(
    "%c[Login] Starting login handler",
    "color: blue; font-weight: bold"
  );

  // CRITICAL: Always show login overlay initially
  showPersistentLoginOverlay();

  const savedLoginMethod = localStorage.getItem("preferredLoginMethod");

  try {
    if (savedLoginMethod === "extension") {
      await attemptLoginWithMethod("extension", attemptExtensionLogin);
    } else if (savedLoginMethod === "guest") {
      await attemptLoginWithMethod("guest", handleGuestLogin);
    } else if (savedLoginMethod === "bunker") {
      await attemptLoginWithMethod("bunker", attemptBunkerLogin);
    } else {
      // No saved method - show login prompt
      await showLoginPrompt();
    }
  } catch (error) {
    console.error(
      "%c[Login] Top-level login error:",
      "color: red; font-weight: bold",
      error
    );
    await handleLoginFailure("Unexpected login error", error);
  }
}

async function attemptLoginWithMethod(methodName, loginFunction) {
  console.log(
    `%c[Login] Attempting ${methodName} login`,
    "color: blue; font-weight: bold"
  );

  // Prevent concurrent login attempts
  if (app.loginState.isAttemptingLogin) {
    console.warn(
      "%c[Login] Login already in progress, ignoring duplicate attempt",
      "color: orange"
    );
    return;
  }

  app.loginState.isAttemptingLogin = true;
  app.loginState.lastAttemptMethod = methodName;
  app.loginState.attemptStartTime = Date.now();

  try {
    // Set a timeout for login attempts (30 seconds for bunker, 10 for others)
    const timeout = methodName === "bunker" ? 30000 : 10000;

    await Promise.race([
      loginFunction(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Login timeout")), timeout)
      ),
    ]);

    // Success - verify we're actually logged in
    if (!app.isLoggedIn || !app.myPk) {
      throw new Error("Login function completed but user not logged in");
    }

    console.log(
      `%c[Login] ✅ ${methodName} login successful`,
      "color: green; font-weight: bold"
    );
    console.log(`%c[Login] User: ${app.myNpub}`, "color: green");
    console.log(
      `%c[Login] isLoggedIn: ${app.isLoggedIn}, myPk: ${app.myPk}`,
      "color: green"
    );

    // CRITICAL: Force removal of ALL login UI after successful login
    console.log(
      "%c[Login] Closing login modal after successful login",
      "color: green; font-weight: bold"
    );
    removePersistentLoginOverlay();

    // Update UI
    renderNavLinks();
    updateSidebar();
    updateDrawerContent();

    // Double-check after a short delay (safety net)
    setTimeout(() => {
      if (app.isLoggedIn && app.myPk && app.loginState.loginOverlayActive) {
        console.log(
          "%c[Login] Overlay still active after login, forcing removal",
          "color: orange; font-weight: bold"
        );
        removePersistentLoginOverlay();
      }
    }, 500);
  } catch (error) {
    console.error(
      `%c[Login] ❌ ${methodName} login failed:`,
      "color: red; font-weight: bold",
      error
    );
    await handleLoginFailure(`${methodName} login failed`, error);
  } finally {
    app.loginState.isAttemptingLogin = false;
    app.loginState.attemptStartTime = null;
  }
}

async function handleLoginFailure(reason, error = null) {
  console.log(`%c[Login Failure] ${reason}`, "color: red; font-weight: bold");

  // Clean up any partial login state
  await cleanupPartialLoginState();

  // Show error to user (non-blocking)
  if (error && error.message !== "Login timeout") {
    showLoginError(reason, error.message);
  }

  // CRITICAL: Always return to login prompt
  await showLoginPrompt();
}

async function cleanupPartialLoginState() {
  console.log(
    "%c[Cleanup] Cleaning up partial login state",
    "color: orange; font-weight: bold"
  );

  // If bunker connection was started, clean it up
  if (app.bunkerSigner || app.bunkerPool) {
    console.log("%c[Cleanup] Cleaning up bunker resources", "color: orange");
    await cleanupBunkerConnection();
  }

  // Reset app login state
  updateApp({
    isLoggedIn: false,
    myPk: null,
    myNpub: null,
    isGuest: false,
    guestSk: null,
    loginMethod: null,
    bunkerSigner: null,
    bunkerLocalSk: null,
    bunkerPointer: null,
    bunkerPool: null,
  });

  console.log("%c[Cleanup] ✅ Cleanup complete", "color: green");
}

function showPersistentLoginOverlay() {
  console.log("%c[Login Overlay] Showing initial overlay", "color: blue");

  const overlay = document.createElement("div");
  overlay.id = "login-overlay";
  overlay.className = "login-overlay-persistent";
  overlay.innerHTML = `
    <div class="login-overlay-content">
      <div class="login-spinner"></div>
      <p>Initializing...</p>
    </div>
  `;

  document.body.appendChild(overlay);
  app.loginState.loginOverlayActive = true;
}

function removePersistentLoginOverlay() {
  console.log(
    "%c[Login Overlay] Removing all login overlays",
    "color: green; font-weight: bold"
  );

  // Remove initial loading overlay
  const overlay = document.getElementById("login-overlay");
  if (overlay) {
    overlay.remove();
  }

  // Remove dedicated login modal
  removeLoginModal();

  app.loginState.loginOverlayActive = false;
  console.log(
    "%c[Login Overlay] ✅ All login UI removed",
    "color: green; font-weight: bold"
  );
}
async function showLoginPrompt() {
  return new Promise((resolve) => {
    console.log(
      "%c[Login Prompt] Showing login choice",
      "color: blue; font-weight: bold"
    );

    // Remove initial loading overlay first
    const loadingOverlay = document.getElementById("login-overlay");
    if (loadingOverlay) {
      loadingOverlay.remove();
    }

    const hasExtension =
      typeof window.nostr !== "undefined" && window.nostr !== null;

    const content = `
      <p>${
        hasExtension ? "We detected a Nostr browser extension. " : ""
      }Choose your login method:</p>
      <div class="login-buttons">
        ${
          hasExtension
            ? `
          <button id="use-extension-btn" class="btn-primary">
            🔐 Use Browser Extension
          </button>
        `
            : ""
        }
        <button id="use-bunker-btn" class="btn-primary">
          🔗 Use Remote Signer (Bunker)
        </button>
        <button id="use-guest-btn" class="btn-secondary">
          👤 Use Guest Account
        </button>
      </div>
    `;

    const modal = createLoginModal("Choose Login Method", content);

    if (hasExtension) {
      modal
        .querySelector("#use-extension-btn")
        .addEventListener("click", async () => {
          localStorage.setItem("preferredLoginMethod", "extension");
          showLoginSpinner("Connecting to extension...");
          try {
            await attemptExtensionLogin();
            // Success - close modal
            console.log(
              "%c[Extension] Login successful, closing modal",
              "color: green; font-weight: bold"
            );
            removePersistentLoginOverlay();
            renderNavLinks();
            updateSidebar();
            updateDrawerContent();
            resolve();
          } catch (error) {
            console.error("%c[Extension] Login failed", "color: red", error);
            await handleLoginFailure("Extension login failed", error);
          }
        });
    }

    modal
      .querySelector("#use-bunker-btn")
      .addEventListener("click", async () => {
        await showBunkerLoginFlow(resolve);
      });

    modal
      .querySelector("#use-guest-btn")
      .addEventListener("click", async () => {
        localStorage.setItem("preferredLoginMethod", "guest");
        showLoginSpinner("Creating guest account...");
        try {
          await handleGuestLogin();
          // Success - close modal
          console.log(
            "%c[Guest] Login successful, closing modal",
            "color: green; font-weight: bold"
          );
          removePersistentLoginOverlay();
          renderNavLinks();
          updateSidebar();
          updateDrawerContent();
          resolve();
        } catch (error) {
          console.error("%c[Guest] Login failed", "color: red", error);
          await handleLoginFailure("Guest login failed", error);
        }
      });
  });
}
function showLoginError(title, message) {
  const overlay = document.getElementById("login-overlay");
  if (overlay) {
    const content = overlay.querySelector(".login-overlay-content");
    if (content) {
      content.innerHTML = `
        <div class="login-error">
          <h3>⚠️ ${title}</h3>
          <p>${message}</p>
          <p class="error-hint">Please try again or choose a different login method.</p>
        </div>
      `;

      // Auto-hide error after 3 seconds
      setTimeout(() => {
        if (app.loginState.loginOverlayActive) {
          content.innerHTML = `
            <div class="login-spinner"></div>
            <p>Preparing login options...</p>
          `;
        }
      }, 3000);
    }
  }
}

async function handleEventSigning(eventTemplate) {
  if (app.loginMethod === "extension") {
    return await signEventWithExtension(eventTemplate);
  } else if (app.loginMethod === "guest") {
    return signEventAsGuest(eventTemplate);
  } else if (app.loginMethod === "bunker") {
    return await signEventWithBunker(eventTemplate);
  } else {
    throw new Error("No login method available");
  }
}
/////////////////////
async function attemptExtensionLogin() {
  console.log(
    "%c[Extension] Attempting extension login",
    "color: green; font-weight: bold"
  );

  if (typeof window.nostr !== "undefined" && window.nostr !== null) {
    console.log(
      "%c[Extension] Extension detected, requesting public key",
      "color: green"
    );
    const pk = await window.nostr.getPublicKey();
    const myNpub = window.NostrTools.nip19.npubEncode(pk);

    updateApp({
      isLoggedIn: true,
      myPk: pk,
      myNpub: myNpub,
      isGuest: false,
      guestSk: null,
      loginMethod: "extension",
    });

    console.log(
      "%c[Extension] ✅ Logged in with extension:",
      "color: green; font-weight: bold",
      myNpub
    );

    // Don't update UI here - let attemptLoginWithMethod do it after modal closes
  } else {
    console.warn("%c[Extension] Extension not available", "color: orange");
    throw new Error("Extension not available");
  }
}

async function signEventWithExtension(eventTemplate) {
  if (typeof window.nostr === "undefined" || !app.myNpub) {
    throw new Error("Extension not available");
  }

  try {
    const signedEvent = await window.nostr.signEvent(eventTemplate);
    console.log(
      "%c Signed Event with Extension",
      "font-weight: bold; color: green;",
      JSON.stringify(signedEvent, null, 2)
    );
    return signedEvent;
  } catch (error) {
    console.error("Extension signing failed:", error);
    throw error;
  }
}
/////////////////////

async function handleGuestLogin() {
  console.log(
    "%c[Guest] Starting guest login",
    "color: blue; font-weight: bold"
  );

  let encryptedGuestData = localStorage.getItem("nostr_guest_data");
  let guestSk;
  let isNewAccount = false;

  if (!encryptedGuestData) {
    console.log("%c[Guest] Creating new guest account", "color: blue");
    guestSk = window.NostrTools.generateSecretKey();
    isNewAccount = true;

    const guestData = {
      sk: Array.from(guestSk),
      created: Date.now(),
    };

    const encryptedData = btoa(JSON.stringify(guestData));
    localStorage.setItem("nostr_guest_data", encryptedData);
    console.log(
      "%c[Guest] ✅ New guest account created and saved",
      "color: green; font-weight: bold"
    );
  } else {
    try {
      console.log("%c[Guest] Loading existing guest account", "color: blue");
      const decryptedData = JSON.parse(atob(encryptedGuestData));
      guestSk = new Uint8Array(decryptedData.sk);
      console.log(
        "%c[Guest] ✅ Existing guest account loaded",
        "color: green; font-weight: bold"
      );
    } catch (error) {
      console.error(
        "%c[Guest] Error decrypting guest data:",
        "color: red",
        error
      );
      console.log(
        "%c[Guest] Creating new account after decryption failure",
        "color: blue"
      );
      guestSk = window.NostrTools.generateSecretKey();
      isNewAccount = true;
      const guestData = {
        sk: Array.from(guestSk),
        created: Date.now(),
      };
      const encryptedData = btoa(JSON.stringify(guestData));
      localStorage.setItem("nostr_guest_data", encryptedData);
    }
  }

  let pk = window.NostrTools.getPublicKey(guestSk);
  let myNpub = window.NostrTools.nip19.npubEncode(pk);

  updateApp({
    isLoggedIn: true,
    myPk: pk,
    myNpub: myNpub,
    isGuest: true,
    guestSk: guestSk,
    loginMethod: "guest",
  });

  console.log(
    "%c[Guest] ✅ Logged in as guest:",
    "color: green; font-weight: bold",
    myNpub
  );

  if (isNewAccount) {
    publishGuestProfile(guestSk, pk).catch((err) =>
      console.error("Background profile publish failed:", err)
    );
  }
}

async function publishGuestProfile(secretKey, publicKey) {
  try {
    const randomNum = Math.floor(Math.random() * 10000);

    const profileData = {
      name: `guest-${randomNum}`,
      about: "A guest user exploring Nostr",
      lud16: "weakcode604@minibits.cash",
      picture: "https://robohash.org/" + publicKey.substring(0, 10) + ".png",
    };

    const profileEvent = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(profileData),
    };

    const signedEvent = window.NostrTools.finalizeEvent(
      profileEvent,
      secretKey
    );

    console.log("Publishing guest profile:", profileData);

    await publishEvent(signedEvent, null, {
      successMessage: "Guest profile published successfully",
      errorMessage: "Failed to publish guest profile",
    });
  } catch (error) {
    console.error("Error publishing guest profile:", error);
    // Don't throw error - login should still work even if profile publishing fails
  }
}

function signEventAsGuest(eventTemplate) {
  if (!app.isGuest || !app.guestSk) {
    throw new Error("Guest login not available");
  }

  const signedEvent = window.NostrTools.finalizeEvent(
    eventTemplate,
    app.guestSk
  );
  console.log(
    "%c Signed Event as Guest",
    "font-weight: bold; color: blue;",
    JSON.stringify(signedEvent, null, 2)
  );
  return signedEvent;
}

/////////////////////
async function showBunkerLoginFlow(resolve) {
  console.log(
    "%c[Bunker] Starting unified bunker flow",
    "color: purple; font-weight: bold"
  );

  const savedBunkerData = localStorage.getItem("bunker_connection_data");

  if (savedBunkerData) {
    console.log("%c[Bunker] Reconnecting with saved data", "color: purple");
    showLoginSpinner("Reconnecting to bunker...", true);
    
    try {
      await attemptBunkerLogin();
      resolve();
      return;
    } catch (error) {
      console.error("%c[Bunker] Reconnect failed:", "color: red", error);
      // Clear bad data and continue to show connection options
      await cleanupBunkerConnection();
      localStorage.removeItem("bunker_connection_data");
      localStorage.removeItem("preferredLoginMethod");
    }
  }

  // Show unified bunker connection interface
  const content = `
    <div class="bunker-unified-container">
     
      <div class="bunker-connection-area">
        <!-- QR Code Display -->
        <div class="qr-section" id="qr-section">
          <p class="section-label">Scan QR Code from your bunker app</p>
          <div class="qr-display" id="qr-display">
            <div class="qr-placeholder">Generating QR code...</div>
          </div>
          <button id="copy-client-uri-btn" class="btn-secondary btn-small">
            📋 Copy Connection URI
          </button>
        </div>

        <div class="or-divider">OR</div>

        <!-- URI Input -->
        <div class="uri-section">
          <p class="section-label">Paste bunker URI from your signer app</p>
          <input 
            type="text" 
            id="bunker-uri-input" 
            placeholder="bunker://... or user@domain.com" 
            class="bunker-input"
          >
          <button id="connect-bunker-uri-btn" class="btn-primary btn-small">
            Connect
          </button>
        </div>
      </div>

      <div class="connection-status" id="bunker-status">
        <p>⏳ Waiting for connection...</p>
      </div>

      <div class="bunker-actions">
        <button id="back-to-login-btn" class="btn-secondary">
          ← Back to Login Options
        </button>
      </div>

      <details class="help-section">
        <summary>Need help?</summary>
        <p class="help-text">
          • <strong>Method 1 (QR):</strong> Open your bunker app, select "Add Connection", and scan the QR code above.<br>
          • <strong>Method 2 (URI):</strong> Copy the bunker URI from your signer app and paste it in the input field.
        </p>
      </details>
    </div>
  `;

  updateLoginModalContent("Remote Signer", content);

  const modal = document.querySelector("#dedicated-login-overlay .login-modal");
  
  // Initialize QR flow in background
  initializeQRConnection(modal, resolve);

  // Back button - always works
  modal.querySelector("#back-to-login-btn").addEventListener("click", () => {
    cleanupBunkerAttempt();
    showLoginPrompt();
  });

  // URI connection button
  modal.querySelector("#connect-bunker-uri-btn").addEventListener("click", async () => {
    await handleURIConnection(modal, resolve);
  });
}
async function handleURIConnection(modal, resolve) {
  const input = modal.querySelector("#bunker-uri-input");
  const bunkerInput = input.value.trim();

  if (!bunkerInput) {
    updateBunkerStatus(modal, "❌ Please enter a bunker URI", true);
    return;
  }

  // Cancel any active QR connection
  cleanupBunkerAttempt();

  const statusEl = modal.querySelector("#bunker-status p");
  statusEl.textContent = "🔗 Connecting to bunker...";

  // Disable input during connection
  input.disabled = true;
  modal.querySelector("#connect-bunker-uri-btn").disabled = true;

  let pool = null;

  try {
    const bunkerPointer = await parseBunkerInput(bunkerInput);

    if (!bunkerPointer?.pubkey || !bunkerPointer?.relays?.length) {
      throw new Error("Invalid bunker URI or NIP-05 identifier");
    }

    console.log("%c[Bunker URI] Parsed:", "color: purple", {
      remotePubkey: bunkerPointer.pubkey.substring(0, 16) + "...",
      relays: bunkerPointer.relays,
    });

    const localSecretKey = window.NostrTools.generateSecretKey();
    pool = new window.NostrTools.SimplePool();

    const bunker = BunkerSigner.fromBunker(localSecretKey, bunkerPointer, { pool });

    statusEl.textContent = "🔐 Requesting authorization...";

    await Promise.race([
      bunker.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("CONNECTION_TIMEOUT")), 30000)
      ),
    ]);

    statusEl.textContent = "✅ Authorized! Getting public key...";

    const pubkey = await Promise.race([
      bunker.getPublicKey(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("PUBKEY_TIMEOUT")), 10000)
      ),
    ]);

    console.log("%c[Bunker URI] Success!", "color: green; font-weight: bold");

    await completeBunkerLogin(bunker, localSecretKey, pubkey, pool, bunkerPointer);
    resolve();

  } catch (error) {
    console.error("%c[Bunker URI] Failed:", "color: red", error);
    
    if (pool) {
      pool.close(bunkerPointer?.relays || []);
    }

    let errorMsg = "Connection failed";
    if (error.message.includes("TIMEOUT")) {
      errorMsg = "Connection timed out. Is your bunker app running?";
    } else if (error.message.includes("Invalid")) {
      errorMsg = "Invalid bunker URI format";
    } else {
      errorMsg = error.message;
    }

    updateBunkerStatus(modal, "❌ " + errorMsg, true);

    // Re-enable input
    input.disabled = false;
    input.value = "";
    modal.querySelector("#connect-bunker-uri-btn").disabled = false;
  }
}

function updateBunkerStatus(modal, message, isError = false) {
  const statusEl = modal.querySelector("#bunker-status");
  if (statusEl) {
    statusEl.innerHTML = `<p class="${isError ? 'error-text' : ''}">${message}</p>`;
  }
}
let activeQRConnection = null; // Track active connection attempt

function initializeQRConnection(modal, resolve) {
  console.log("%c[Bunker QR] Initializing QR connection", "color: blue");

  try {
    // Generate client keypair
    const localSecretKey = window.NostrTools.generateSecretKey();
    const clientPubkey = window.NostrTools.getPublicKey(localSecretKey);

    // Generate connection secret
    const connectionSecret = window.NostrTools.generateSecretKey();
    const secretString = Array.from(connectionSecret)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 32);

    const relays = [
      "wss://relay.damus.io",
      "wss://relay.primal.net",
      "wss://nos.lol",
    ];

    const connectionUri = createNostrConnectURI({
      clientPubkey,
      relays,
      secret: secretString,
      name: "Vutr",
    });

    // Display QR code
    const qrDisplay = modal.querySelector("#qr-display");
    qrDisplay.innerHTML = generateQrCode(connectionUri);

    // Copy button
    modal.querySelector("#copy-client-uri-btn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(connectionUri);
        const btn = modal.querySelector("#copy-client-uri-btn");
        const originalText = btn.textContent;
        btn.textContent = "✓ Copied!";
        setTimeout(() => (btn.textContent = originalText), 2000);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    });

    // Start listening for connection (non-blocking)
    activeQRConnection = {
      localSecretKey,
      connectionUri,
      relays,
      pool: new window.NostrTools.SimplePool(),
      cancelled: false
    };

    waitForQRConnection(activeQRConnection, modal, resolve);

  } catch (error) {
    console.error("%c[Bunker QR] Setup failed:", "color: red", error);
    updateBunkerStatus(modal, "❌ QR code generation failed", true);
  }
}

async function waitForQRConnection(connection, modal, resolve) {
  const statusEl = modal.querySelector("#bunker-status p");
  statusEl.textContent = "⏳ Waiting for your bunker app to scan...";

  try {
    console.log("%c[Bunker QR] Listening for connection (60s)", "color: blue");

    // Wait for connection with timeout
    const signer = await Promise.race([
      BunkerSigner.fromURI(connection.localSecretKey, connection.connectionUri, { 
        pool: connection.pool 
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("QR_TIMEOUT")), 60000)
      ),
      // Add cancellation promise
      new Promise((_, reject) => {
        const checkCancelled = setInterval(() => {
          if (connection.cancelled) {
            clearInterval(checkCancelled);
            reject(new Error("CANCELLED"));
          }
        }, 500);
      })
    ]);

    if (connection.cancelled) return;

    statusEl.textContent = "✅ Connected! Getting your public key...";

    const pubkey = await Promise.race([
      signer.getPublicKey(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("PUBKEY_TIMEOUT")), 10000)
      )
    ]);

    if (connection.cancelled) {
      connection.pool.close(connection.relays);
      return;
    }

    console.log("%c[Bunker QR] Success!", "color: green; font-weight: bold");

    const bunkerPointer = signer.bp;
    await completeBunkerLogin(
      signer,
      connection.localSecretKey,
      pubkey,
      connection.pool,
      bunkerPointer
    );
    
    activeQRConnection = null;
    resolve();

  } catch (error) {
    if (connection.cancelled) {
      console.log("%c[Bunker QR] Connection attempt cancelled", "color: orange");
      return;
    }

    console.error("%c[Bunker QR] Failed:", "color: red", error);
    connection.pool.close(connection.relays);
    
    if (error.message === "QR_TIMEOUT") {
      updateBunkerStatus(modal, "⏱️ QR code expired. Please try again.", true);
    } else {
      updateBunkerStatus(modal, "❌ Connection failed: " + error.message, true);
    }
    
    activeQRConnection = null;
  }
}

function cleanupBunkerAttempt() {
  console.log("%c[Bunker] Cleaning up active connection attempt", "color: orange");
  
  if (activeQRConnection) {
    activeQRConnection.cancelled = true;
    if (activeQRConnection.pool) {
      activeQRConnection.pool.close(activeQRConnection.relays);
    }
    activeQRConnection = null;
  }
}
async function initiateBunkerQRFlow(resolve) {
  console.log(
    "%c[Bunker QR] Starting QR flow",
    "color: blue; font-weight: bold"
  );

  let pool = null;
  let localSecretKey = null;

  try {
    // Generate client keypair
    localSecretKey = window.NostrTools.generateSecretKey();
    const clientPubkey = window.NostrTools.getPublicKey(localSecretKey);

    // Generate connection secret
    const connectionSecret = window.NostrTools.generateSecretKey();
    const secretString = Array.from(connectionSecret)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 32);

    // Define relays for the connection
    const relays = [
      "wss://relay.damus.io",
      "wss://relay.primal.net",
      "wss://nos.lol",
    ];

    // Create nostrconnect URI for QR code
    const connectionUri = createNostrConnectURI({
      clientPubkey,
      relays,
      secret: secretString,
      name: "Vutr",
    });

    const qrContent = `
      <div class="bunker-qr-container">
        <p>Scan this QR code with your bunker app:</p>
        <div class="qr-display">
          ${generateQrCode(connectionUri)}
        </div>
        <div class="connection-status">
          <p id="connection-status">⏳ Waiting for connection...</p>
        </div>
        <div class="bunker-qr-actions">
          <button id="cancel-bunker-qr-btn" class="btn-secondary">← Back</button>
          <button id="copy-uri-btn" class="btn-secondary">Copy URI</button>
        </div>
        <details class="uri-details">
          <summary>Show URI</summary>
          <input type="text" value="${connectionUri}" readonly class="uri-input">
        </details>
      </div>
    `;

    updateLoginModalContent("Scan QR Code", qrContent);

    const modal = document.querySelector(
      "#dedicated-login-overlay .login-modal"
    );
    const statusEl = modal.querySelector("#connection-status");

    // Cancel button
    modal
      .querySelector("#cancel-bunker-qr-btn")
      .addEventListener("click", () => {
        if (pool) pool.close(relays);
        showBunkerLoginFlow(resolve);
      });

    // Copy button
    modal.querySelector("#copy-uri-btn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(connectionUri);
        const btn = modal.querySelector("#copy-uri-btn");
        btn.textContent = "✓ Copied!";
        setTimeout(() => (btn.textContent = "Copy URI"), 2000);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    });

    // Create pool for connection
    pool = new window.NostrTools.SimplePool();
    statusEl.textContent = "⏳ Connecting...";

    console.log(
      "%c[Bunker QR] Waiting for bunker to scan QR code (60s timeout)",
      "color: blue"
    );

    // Wait for bunker to scan and connect
    // fromURI is ASYNC and returns a Promise that resolves when connection is established
    const signer = await Promise.race([
      BunkerSigner.fromURI(localSecretKey, connectionUri, { pool }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("QR code not scanned within 60 seconds")),
          60000
        )
      ),
    ]);

    statusEl.textContent = "✅ Connected! Getting your public key...";
    console.log("%c[Bunker QR] Connection established!", "color: green");

    // Get user's public key
    const pubkey = await Promise.race([
      signer.getPublicKey(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout getting public key")), 10000)
      ),
    ]);

    console.log("%c[Bunker QR] User pubkey retrieved:", "color: green", pubkey);

    // CRITICAL: Extract the bunkerPointer from the signer
    // After fromURI completes, signer.bp contains the bunkerPointer we need
    const bunkerPointer = signer.bp;

    console.log("%c[Bunker QR] Extracted bunkerPointer:", "color: purple", {
      remotePubkey: bunkerPointer.pubkey.substring(0, 16) + "...",
      relays: bunkerPointer.relays,
      hasSecret: !!bunkerPointer.secret,
    });

    // Complete login and save for persistence
    await completeBunkerLogin(
      signer,
      localSecretKey,
      pubkey,
      pool,
      bunkerPointer
    );
    resolve();
  } catch (error) {
    console.error(
      "%c[Bunker QR] Error:",
      "color: red; font-weight: bold",
      error
    );
    if (pool) {
      pool.close([
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://nos.lol",
      ]);
    }

    await alertModal(
      error.message.includes("timeout") || error.message.includes("60 seconds")
        ? "Connection timed out. Please try again."
        : "Failed to connect: " + error.message,
      "Connection Error"
    );

    await showBunkerLoginFlow(resolve);
  }
}

async function initiateBunkerURIFlow(resolve) {
  const content = `
    <div class="bunker-uri-input">
      <p>Enter your bunker URI or NIP-05:</p>
      <input type="text" id="bunker-uri-input" placeholder="bunker://... or user@domain.com" class="bunker-input">
      <div class="bunker-uri-actions">
        <button id="cancel-bunker-uri-btn" class="btn-secondary">← Back</button>
        <button id="connect-bunker-btn" class="btn-primary">Connect</button>
      </div>
      <p class="help-text">Get your bunker URI from your remote signer app</p>
    </div>
  `;

  updateLoginModalContent("Enter Bunker URI", content);

  const modal = document.querySelector("#dedicated-login-overlay .login-modal");

  // Cancel button
  modal
    .querySelector("#cancel-bunker-uri-btn")
    .addEventListener("click", () => {
      showBunkerLoginFlow(resolve);
    });

  // Connect button
  modal
    .querySelector("#connect-bunker-btn")
    .addEventListener("click", async () => {
      const bunkerInput = modal.querySelector("#bunker-uri-input").value.trim();

      if (!bunkerInput) {
        alertModal(
          "Please enter a bunker URI or NIP-05 identifier",
          "Invalid Input"
        );
        return;
      }

      let pool = null;

      try {
        showLoginSpinner("Connecting to bunker...");

        // Parse the bunker input (supports both bunker:// URIs and NIP-05)
        const bunkerPointer = await parseBunkerInput(bunkerInput);

        if (
          !bunkerPointer ||
          !bunkerPointer.pubkey ||
          !bunkerPointer.relays ||
          bunkerPointer.relays.length === 0
        ) {
          throw new Error("Invalid bunker URI or NIP-05 identifier");
        }

        console.log("%c[Bunker URI] Parsed bunker pointer:", "color: purple", {
          remotePubkey: bunkerPointer.pubkey.substring(0, 16) + "...",
          relays: bunkerPointer.relays,
          hasSecret: !!bunkerPointer.secret,
        });

        // Generate local keypair for this connection
        const localSecretKey = window.NostrTools.generateSecretKey();

        // Create pool
        pool = new window.NostrTools.SimplePool();

        // Create bunker signer using fromBunker
        const bunker = BunkerSigner.fromBunker(localSecretKey, bunkerPointer, {
          pool,
        });

        console.log(
          "%c[Bunker URI] Signer created, calling connect() for first-time connection",
          "color: purple"
        );

        // IMPORTANT: For first-time connection with bunker URI, call .connect()
        // This establishes the connection and gets authorization from the bunker
        await Promise.race([
          bunker.connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 30000)
          ),
        ]);

        console.log(
          "%c[Bunker URI] Connection established, getting public key",
          "color: purple"
        );

        // Get user's public key
        const pubkey = await Promise.race([
          bunker.getPublicKey(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout getting public key")),
              10000
            )
          ),
        ]);

        console.log(
          "%c[Bunker URI] User pubkey retrieved:",
          "color: green",
          pubkey
        );

        // Complete login and save for persistence
        await completeBunkerLogin(
          bunker,
          localSecretKey,
          pubkey,
          pool,
          bunkerPointer
        );
        resolve();
      } catch (error) {
        console.error(
          "%c[Bunker URI] Error:",
          "color: red; font-weight: bold",
          error
        );
        if (pool && error.bunkerPointer?.relays) {
          pool.close(error.bunkerPointer.relays);
        }

        await alertModal(
          "Failed to connect: " + error.message,
          "Connection Error"
        );
        await showBunkerLoginFlow(resolve);
      }
    });
}

// Shared completion logic for interactive bunker login (QR/URI)
async function completeBunkerLogin(
  signer,
  localSecretKey,
  pubkey,
  pool,
  bunkerPointer
) {
  const npub = window.NostrTools.nip19.npubEncode(pubkey);

  console.log(
    "%c[Bunker] Saving connection data for persistence",
    "color: purple; font-weight: bold"
  );

  // Save EVERYTHING needed for reconnection
  const bunkerData = {
    localSk: Array.from(localSecretKey), // Client's local secret key
    pubkey: pubkey, // User's public key (for display)
    bunkerPointer: {
      // The critical data for reconnection
      pubkey: bunkerPointer.pubkey, // Remote signer's pubkey
      relays: bunkerPointer.relays, // Relays to communicate with bunker
      secret: bunkerPointer.secret || null, // Optional secret (usually null after first connect)
    },
    connected: Date.now(),
    lastUsed: Date.now(),
  };

  // Validate before saving
  if (
    !bunkerData.bunkerPointer.pubkey ||
    !bunkerData.bunkerPointer.relays ||
    bunkerData.bunkerPointer.relays.length === 0
  ) {
    console.error(
      "%c[Bunker] ⚠️ Invalid bunkerPointer! Future reconnection will fail",
      "color: red; font-weight: bold"
    );
    throw new Error("Invalid bunker connection data");
  }

  localStorage.setItem("bunker_connection_data", JSON.stringify(bunkerData));
  localStorage.setItem("preferredLoginMethod", "bunker");

  console.log(
    "%c[Bunker] ✅ Connection data saved successfully",
    "color: green; font-weight: bold"
  );

  // Update app state
  updateApp({
    isLoggedIn: true,
    myPk: pubkey,
    myNpub: npub,
    isGuest: false,
    guestSk: null,
    loginMethod: "bunker",
    bunkerSigner: signer,
    bunkerLocalSk: localSecretKey,
    bunkerPointer: bunkerPointer,
    bunkerPool: pool,
  });

  console.log(
    "%c[Bunker] ✅ Login complete:",
    "color: green; font-weight: bold",
    npub
  );

  // Show success message
  showLoginSpinner("Success! Loading app...");

  // Close login UI and update app
  setTimeout(() => {
    removePersistentLoginOverlay();
    renderNavLinks();
    updateSidebar();
    updateDrawerContent();
    console.log("%c[Bunker] ✅ UI updated", "color: green; font-weight: bold");
  }, 1000);
}

async function attemptBunkerLogin() {
  console.log("%c[Bunker Reconnect] Starting", "color: cyan; font-weight: bold");

  const savedBunkerData = localStorage.getItem("bunker_connection_data");

  if (!savedBunkerData) {
    throw new Error("NO_SAVED_DATA");
  }

  let bunkerData;
  try {
    bunkerData = JSON.parse(savedBunkerData);
  } catch (e) {
    console.error("%c[Bunker Reconnect] Invalid JSON", "color: red");
    localStorage.removeItem("bunker_connection_data");
    throw new Error("INVALID_SAVED_DATA");
  }

  // Validate structure
  if (!bunkerData.localSk || !bunkerData.bunkerPointer?.pubkey || 
      !bunkerData.bunkerPointer?.relays?.length) {
    console.error("%c[Bunker Reconnect] Invalid structure", "color: red");
    localStorage.removeItem("bunker_connection_data");
    throw new Error("CORRUPTED_DATA");
  }

  const bp = bunkerData.bunkerPointer;
  const localSecretKey = new Uint8Array(bunkerData.localSk);
  const pool = new window.NostrTools.SimplePool();

  console.log("%c[Bunker Reconnect] Attempting connection", "color: cyan");

  try {
    const bunker = BunkerSigner.fromBunker(localSecretKey, bp, { pool });

    // Shorter timeout for reconnection
    const pubkey = await Promise.race([
      bunker.getPublicKey(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("RECONNECT_TIMEOUT")), 10000)
      ),
    ]);

    const npub = window.NostrTools.nip19.npubEncode(pubkey);
    console.log("%c[Bunker Reconnect] ✅ Success", "color: green; font-weight: bold");

    // Update last used
    bunkerData.lastUsed = Date.now();
    localStorage.setItem("bunker_connection_data", JSON.stringify(bunkerData));

    updateApp({
      isLoggedIn: true,
      myPk: pubkey,
      myNpub: npub,
      isGuest: false,
      guestSk: null,
      loginMethod: "bunker",
      bunkerSigner: bunker,
      bunkerLocalSk: localSecretKey,
      bunkerPointer: bp,
      bunkerPool: pool,
    });

  } catch (error) {
    console.error("%c[Bunker Reconnect] Failed:", "color: red", error);
    pool.close(bp.relays);
    
    // Clean up bad data on timeout
    if (error.message === "RECONNECT_TIMEOUT") {
      console.log("%c[Bunker Reconnect] Timeout - clearing data", "color: orange");
      localStorage.removeItem("bunker_connection_data");
      localStorage.removeItem("preferredLoginMethod");
    }
    
    throw error;
  }
}
async function signEventWithBunker(eventTemplate) {
  if (!app.bunkerSigner) {
    console.error("%c[Bunker Sign] Bunker signer not available", "color: red");
    throw new Error("Bunker signer not available");
  }

  try {
    console.log("%c[Bunker Sign] Signing event with bunker", "color: purple");

    // Add timeout to prevent hanging
    const signedEvent = await Promise.race([
      app.bunkerSigner.signEvent(eventTemplate),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Bunker signing timeout (30s)")),
          30000
        )
      ),
    ]);

    console.log(
      "%c✅ Signed Event with Bunker",
      "font-weight: bold; color: purple;",
      JSON.stringify(signedEvent, null, 2)
    );

    // Update last used timestamp
    try {
      const bunkerData = JSON.parse(
        localStorage.getItem("bunker_connection_data")
      );
      if (bunkerData) {
        bunkerData.lastUsed = Date.now();
        localStorage.setItem(
          "bunker_connection_data",
          JSON.stringify(bunkerData)
        );
      }
    } catch (e) {
      console.warn("Could not update lastUsed timestamp:", e);
    }

    return signedEvent;
  } catch (error) {
    console.error(
      "%c[Bunker Sign] Signing failed:",
      "color: red; font-weight: bold",
      error
    );

    // If signing fails due to connection issues, offer to reconnect
    if (
      error.message.includes("timeout") ||
      error.message.includes("not open")
    ) {
      const shouldReconnect = confirm(
        "Bunker connection seems to be lost. Would you like to reconnect?"
      );

      if (shouldReconnect) {
        try {
          console.log(
            "%c[Bunker Sign] Attempting to reconnect...",
            "color: orange"
          );

          // Clean up old connection
          if (app.bunkerPool) {
            app.bunkerPool.close(app.bunkerPointer?.relays || []);
          }

          // Attempt reconnection
          await attemptBunkerLogin();

          // Retry signing after reconnection
          console.log(
            "%c[Bunker Sign] Reconnected, retrying sign",
            "color: green"
          );
          return await app.bunkerSigner.signEvent(eventTemplate);
        } catch (reconnectError) {
          console.error(
            "%c[Bunker Sign] Reconnection failed:",
            "color: red",
            reconnectError
          );
          throw new Error(
            "Failed to reconnect to bunker: " + reconnectError.message
          );
        }
      }
    }

    throw error;
  }
}

async function cleanupBunkerConnection() {
  console.log("%c[Bunker Cleanup] Starting cleanup", "color: red");

  if (app.bunkerSigner) {
    try {
      console.log("%c[Bunker Cleanup] Closing bunker signer", "color: red");
      await app.bunkerSigner.close();
      console.log("%c[Bunker Cleanup] ✅ Bunker signer closed", "color: green");
    } catch (error) {
      console.error(
        "%c[Bunker Cleanup] Error closing bunker signer:",
        "color: red",
        error
      );
    }
  }

  if (app.bunkerPool && app.bunkerPointer?.relays) {
    try {
      console.log("%c[Bunker Cleanup] Closing bunker pool", "color: red");
      app.bunkerPool.close(app.bunkerPointer.relays);
      console.log("%c[Bunker Cleanup] ✅ Bunker pool closed", "color: green");
    } catch (error) {
      console.error(
        "%c[Bunker Cleanup] Error closing bunker pool:",
        "color: red",
        error
      );
    }
  }

  console.log(
    "%c[Bunker Cleanup] Removing bunker data from localStorage",
    "color: red"
  );
  localStorage.removeItem("bunker_connection_data");

  console.log(
    "%c[Bunker Cleanup] ✅ Cleanup complete",
    "color: green; font-weight: bold"
  );
}

async function resetBunkerConnection() {
  console.log("%c[Bunker Reset] Starting bunker reset", "color: orange; font-weight: bold");
  
  // Show confirmation
  const confirmReset = confirm(
    "This will remove your saved bunker connection and you'll need to reconnect. Continue?"
  );
  
  if (!confirmReset) {
    console.log("%c[Bunker Reset] User cancelled reset", "color: orange");
    return;
  }
  
  try {
    // Clean up bunker connection
    await cleanupBunkerConnection();
    
    // Remove preferred login method
    localStorage.removeItem('preferredLoginMethod');
    
    console.log("%c[Bunker Reset] ✅ Bunker reset complete, reloading", "color: green; font-weight: bold");
    
    // Reload page to start fresh
    window.location.reload(true);
  } catch (error) {
    console.error("%c[Bunker Reset] Error during reset:", "color: red", error);
    alert("Error resetting bunker connection. Reloading page...");
    window.location.reload(true);
  }
}

/**
 * Dedicated login modal system - completely separate from universal modals
 * Only closes when login succeeds or user explicitly cancels
 */
function createLoginModal(title, content) {
  // Remove any existing login modal first
  removeLoginModal();
  
  const overlay = document.createElement("div");
  overlay.id = "dedicated-login-overlay";
  overlay.className = "login-modal-overlay";
  
  const modal = document.createElement("div");
  modal.className = "login-modal";
  modal.innerHTML = `
    <h3 class="login-modal-title">${title}</h3>
    <div class="login-modal-body">${content}</div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // CRITICAL: Prevent closing on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      // Do nothing - login modal must stay open
      console.log("%c[Login Modal] Overlay click prevented - login required", "color: orange");
    }
  });
  
  return modal;
}

function updateLoginModalContent(title, content) {
  const modal = document.querySelector("#dedicated-login-overlay .login-modal");
  if (modal) {
    const titleEl = modal.querySelector(".login-modal-title");
    const bodyEl = modal.querySelector(".login-modal-body");
    
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = content;
  }
}

function removeLoginModal() {
  const overlay = document.getElementById("dedicated-login-overlay");
  if (overlay) {
    overlay.remove();
  }
}

function showLoginSpinner(message = "Connecting...", showResetButton = false) {
  const resetButtonHtml = showResetButton ? `
    <button id="reset-bunker-btn" class="btn-secondary" style="margin-top: 20px;">
      🔄 Reset Bunker Connection
    </button>
  ` : '';
  
  updateLoginModalContent("Authenticating", `
    <div class="connecting-status">
      <div class="login-spinner"></div>
      <p>${message}</p>
      ${resetButtonHtml}
    </div>
  `);
  
  // Add event listener if button was added
  if (showResetButton) {
    setTimeout(() => {
      const resetBtn = document.getElementById("reset-bunker-btn");
      if (resetBtn) {
        resetBtn.addEventListener("click", async () => {
          console.log("%c[Bunker Reset] User requested bunker reset", "color: orange; font-weight: bold");
          await resetBunkerConnection();
        });
      }
    }, 100);
  }
}
///////////

async function handleSignOut() {
  const confirmSignOut = confirm('Are you sure you want to sign out?');
  
  if (confirmSignOut) {
    console.log("%c[Sign Out] User confirmed sign out", "color: red; font-weight: bold");
    
    // Clean up bunker connection if it exists
    if (app.loginMethod === 'bunker') {
      console.log("%c[Sign Out] Cleaning up bunker connection", "color: red");
      await cleanupBunkerConnection();
    }
    
    // Remove login preferences
    localStorage.removeItem('preferredLoginMethod');
    
    // Only remove bunker data on logout (not guest data)
    if (app.loginMethod === 'bunker') {
      localStorage.removeItem('bunker_connection_data');
    }
    
    // IMPORTANT: DO NOT remove guest data - preserve for reuse
    // Guest keys stay in localStorage permanently unless explicitly deleted
    console.log("%c[Sign Out] Guest keys preserved for future use", "color: blue");
    
    console.log("%c[Sign Out] Updating app state", "color: red");
    updateApp({
      isLoggedIn: false,
      myPk: null,
      myNpub: null,
      isGuest: false,
      guestSk: null,
      loginMethod: null,
      bunkerSigner: null,
      bunkerLocalSk: null,
      bunkerPointer: null,
      bunkerPool: null
    });
    
    console.log("%c[Sign Out] ✅ Sign out complete, reloading page", "color: red; font-weight: bold");
  //  window.location.reload();
 //window.location.href = window.location.href + '?forceReload=' + Date.now();
            setTimeout(() => {
              window.location.reload(true);
            }, 1500);

  }
}


/* 
function clearGuestAccount() {
  localStorage.removeItem("nostr_guest_data");
  updateApp({
    isLoggedIn: false,
    myPk: null,
    myNpub: null,
    isGuest: false,
    guestSk: null,
  });
  console.log("Guest account cleared");
}
 */

/* async function checkBunkerHealth() {
  if (!app.bunkerSigner || app.loginMethod !== 'bunker') {
    return false;
  }
  
  try {
    console.log("%c[Bunker Health] Checking connection health", "color: cyan");
    await Promise.race([
      app.bunkerSigner.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Ping timeout")), 5000)
      )
    ]);
    console.log("%c[Bunker Health] ✅ Connection healthy", "color: green");
    return true;
  } catch (error) {
    console.warn("%c[Bunker Health] ⚠️ Connection unhealthy:", "color: orange", error);
    return false;
  }
}

// Optional: Run periodic health checks
function startBunkerHealthMonitoring() {
  if (app.loginMethod === 'bunker') {
    // Check every 5 minutes
    const healthCheckInterval = setInterval(async () => {
      if (app.loginMethod !== 'bunker') {
        clearInterval(healthCheckInterval);
        return;
      }
      
      const isHealthy = await checkBunkerHealth();
      if (!isHealthy) {
        console.warn("%c[Bunker Monitor] Connection appears unhealthy", "color: orange");
        // Optionally show a notification to the user
      }
    }, 5 * 60 * 1000);
    
    return healthCheckInterval;
  }
} */
