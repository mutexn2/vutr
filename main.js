initializeFirstVisit();

let app = {
  // ========== USER & AUTH ==========
  isLoggedIn: false,
  myPk: null,
  myNpub: null,
  isGuest: false,
  guestSk: null,
  loginMethod: null, // 'extension' | 'guest' | 'bunker' | null
  currentEditingProfile: null,
  // ========== BUNKER (NIP-46) ==========
  bunkerSigner: null,
  bunkerLocalSk: null,
  bunkerPointer: null,
  bunkerPool: null,
  //
  loginState: {
  isAttemptingLogin: false,
  loginOverlayActive: true,
  lastAttemptMethod: null,
  attemptStartTime: null,
    },
  // ========== NAVIGATION ==========
  currentPage: null,
  currentSidebar: null,

  // ========== APPEARANCE ==========
  sidebarCollapsed: null,
  drawerClosed: true,
  theme: localStorage.getItem("theme") || config.defaultTheme,
  primaryColor: localStorage.getItem("primaryColor") || "#9200C7",

  overlayControls: {
    drawer: null,
    settings: null,
    notifications: null,
  },
  // ========== VIDEO & PLAYBACK ==========
  bookmarkedVideos: JSON.parse(
    localStorage.getItem("bookmarkedVideos") || "[]"
  ),
  playlists: JSON.parse(localStorage.getItem("playlists") || "[]"), // own local
  bookmarkedPlaylists: JSON.parse(
    localStorage.getItem("bookmarkedPlaylists") || "[]"
  ),
  playlistHistory: JSON.parse(localStorage.getItem("playlistHistory") || "[]"),

  mediaServerWhitelist: JSON.parse(
    localStorage.getItem("mediaServerWhitelist") || "[]"
  ),
  // for playlist page items
  playlistVideoCache: {
    videos: null,
    playlistId: null,
  },

  preferQuality: localStorage.getItem("preferQuality") || "lowest",
  // ======== Play all ==========
  currentPlaylist: null, // The full playlist event object
  currentPlaylistIndex: 0, // Current video index in playlist

  // ========== FOLLOWED PROFILES ==========
  followSet: JSON.parse(
    localStorage.getItem("followSet") || JSON.stringify(config.defaultFollowSet)
  ),

  favoriteChannels: JSON.parse(
    localStorage.getItem("favoriteChannels") ||
      JSON.stringify(config.favoriteChannels)
  ),

  muteSet: JSON.parse(
    localStorage.getItem("muteSet") || JSON.stringify(config.defaultMuteSet)
  ),

  // home sub
  homeSubscription: null,
  homePool: null,
  // comments sub
  commentSubscription: null,
  commentPool: null,
  // ========== CHAT ==========
  chatSubscription: null,
  chatPool: null,

  activeQuery: null, // Will store the current query controller
  isQuerying: false,
  // ========== MODAL ==========
  modal: null,

  // old modals for backward compatibility
  modals: {
    share: { open: false, videoId: null },
    login: { open: false },
    settings: { open: false },
  },

  // ========== NOTIFICATIONS ==========
  //  notifications: {
  //    list: [],
  //    unreadCount: 0,
  //    lastChecked: null,
  //  },

  /*   // ========== SUBSCRIPTION MANAGEMENT ==========
  // Single subscription at a time - no need for Map with IDs
  currentSubscription: null,
  subscriptionEvents: [], // Simple array of deduplicated events */

  // ========== SUBSCRIPTION MANAGEMENT ==========
  subscriptions: new Map(), // Key: subscriptionId, Value: subscription object
  subscriptionEvents: new Map(), // Key: subscriptionId, Value: array of events

  // ========== NOSTR ==========
  relayLists:
    JSON.parse(localStorage.getItem("relayLists")) || config.relayLists,
  activeRelayList:
    localStorage.getItem("activeRelayList") || config.defaultRelayList,
  //
  get relays() {
    if (isGlobalSet(this.activeRelayList)) {
      // Return all unique relays from all sets
      const allRelays = new Set();
      Object.values(this.relayLists).forEach((setData) => {
        setData.tags
          .filter((tag) => tag[0] === "relay")
          .forEach((tag) => allRelays.add(tag[1]));
      });
      return Array.from(allRelays);
    }

    let activeList = this.relayLists[this.activeRelayList];
    return activeList.tags
      .filter((tag) => tag[0] === "relay")
      .map((tag) => tag[1]);
  },

  get globalRelays() {
    const allRelays = new Set();
    Object.values(this.relayLists).forEach((setData) => {
      setData.tags
        .filter((tag) => tag[0] === "relay")
        .forEach((tag) => allRelays.add(tag[1]));
    });
    return Array.from(allRelays);
  },

  chatRelays: ["wss://nos.lol", "wss://relay.damus.io", "wss://nostr.mom"],

  // ========== CLEANUP MANAGEMENT ==========
  cleanupHandlers: [], // Array of cleanup functions to call on route change

  //
  eventListenerRegistry: new Map(),
  currentPageCleanupKey: null,
};

let routes = {
  "#home": homePageHandler,
  //  "#newhome": newHomePageHandler,
  "#shorts": shortsPageHandler,
  "#list": listPageHandler,
  "#liked": likedPageHandler,
  "#saved": bookmarksPageHandler,
  "#bookmarkedplaylists": bookmarkedListsPageHandler,
  "#historyplaylists": historyListsPageHandler,
  "#localfollows": localFollowsPageHandler,
  "#localmuted": localMutedPageHandler,
  "#kind1follows": kind1FollowsPageHandler,
  "#kind1home": k1HomePageHandler,
  "#followsfeed": followsFeedPageHandler,
  "#tag": tagPageHandler,
  "#watch": videoPageHandler,
  "#profile": profilePageHandler,
  "#editprofile": profileEditPageHandler,
  "#localplaylist": localPlaylistPageHandler,
  "#localplaylists": localPlaylistsPageHandler,
  "#playlist": playlistPageHandler,
  "#playlists": playlistsPageHandler,
  //"#queue": queueHistoryPageHandler,
  "#post": postingPageHandler,
  "#singlerelay": singleRelayPageHandler,
  "#contact": contactPageHandler,
  "#faq": faqPageHandler,
  "#blob": blobPageHandler,
  "#blossom": blossomPageHandler,
  "#nak": fafoPageHandler,
  "#nak2": nakPageHandler,
  "#settings": settingsPageHandler,
  "#network": networkSettingsPageHandler,
  "#websockets": websocketsPageHandler,
  "#singlerelay": singleRelayPageHandler,
  "#relaysetsdiscover": relaySetsDiscoveryPageHandler,
  "#offline": offlinePageHandler,
  "#about": aboutPageHandler,
  "#notify": notifyPageHandler,
  "*": () => {
    console.error("Invalid route");
    window.location.hash = "#home";
  },
  "#": () => {
    window.location.hash = "#home";
  },
};

let mainContent = document.querySelector("#main");

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
  if (!navigator.onLine) {
    window.location.hash = "#offline";
  }
  mainContent.innerHTML = `
    <h1>Welcome</h1>
    <div class="loading-indicator">
        <p>Initializing the app...</p>
    </div>
  `;

  ////////////////////////////////////////////////
  if (!window.NostrTools) {
    console.log("Could not load NostrTools....");
    mainContent.innerHTML = `
    <h1>Couldn't connect to Nostr-Tools</h1>
    <div class="loading-indicator">
        <p>Could not load NostrTools....</p>
    </div>
  `;
  }

  console.log(
    "%cNostrTools loaded. Initializing app...",
    "color:rgb(27, 179, 32); font-weight: bold; background:rgb(7, 8, 7); padding: 8px; border-radius: 3px;"
  );
  console.log("Available in NostrTools:", window.NostrTools);


    if (BunkerSigner) {
    console.log(
      "%cBunkerSigner loaded successfully!",
      "color:rgba(25, 31, 25, 1); font-weight: bold; background:rgba(63, 143, 63, 1); padding: 8px; border-radius: 3px;"
    );
  }

  
  ////////////////////////////////////////////////
  ////////////////////////////////////////////////
  if (window.NostrGadgets) {
    console.log(
      "%cNostrGadgets loaded successfully!",
      "color:rgb(27, 179, 32); font-weight: bold; background:rgb(7, 8, 7); padding: 8px; border-radius: 3px;"
    );
    console.log("Available in NostrGadgets:", window.NostrGadgets);
    //    console.log("Available in NostrGadgets:", NostrGadgets); // same thing

    if (NostrGadgets.global) {
      console.log("Global module exists:", NostrGadgets.global);
    }

    if (NostrGadgets.lists) {
      console.log("lists module exists:", NostrGadgets.lists);
    }

    if (NostrGadgets.sets) {
      console.log("sets module exists:", NostrGadgets.sets);
    }
  } else {
    console.error("NostrGadgets not loaded! Check your script import.");
  }

  ////////////////////////////////////////////////
  // Initialize VideoPlayer module
  VideoPlayer.init();
  ////////////////////////////////////////////////
  initializeSidebar();
  setupSidebarToggle();
  initDrawer();
  initSearch();
  initNotifyMenuButton();
  updateSidebar();
  updateDrawerContent();

  //initSubscriptionsManager();

  handleRoute();

  window.addEventListener("hashchange", handleRoute);
  window.addEventListener("load", handleNostrLogin);
}

function handleRoute() {
  const newHash = window.location.hash || "#";

  // FIRST: Handle video player route change (miniplayer logic)
  VideoPlayer.handleRouteChange(newHash);

  // THEN: Run normal cleanup
  runCleanup();
  cleanupChatResources();
  cancelActiveQueries();
  stopAllSubscriptions();

  let baseHash = newHash.split("/")[0];
  console.log("Route:", baseHash);

  let handler = routes[baseHash] || routes["*"];

  mainContent.classList.remove("visible");
  mainContent.classList.add("hiding");
  mainContent.innerHTML = "";

  updateApp({ currentPage: baseHash.slice(1) });
  updateSidebar();
  updateDrawerContent();
//  forceGarbageCollection();

  handler();

  forceScrollToTop();

  setTimeout(() => {
    mainContent.classList.remove("hiding");
    mainContent.classList.add("visible");
    forceScrollToTop();
  }, 300);
}

function updateApp(newState) {
  Object.assign(app, newState);
}

function initializeFirstVisit() {
  // Check if this is the first visit
  if (!localStorage.getItem("hasVisited")) {
    // Mark as visited
    localStorage.setItem("hasVisited", "true");

    if (!localStorage.getItem("bookmarkedVideos")) {
      localStorage.setItem(
        "bookmarkedVideos",
        JSON.stringify(config.defaultBookmarkedVideos)
      );
    }

    if (!localStorage.getItem("playlists")) {
      localStorage.setItem(
        "playlists",
        JSON.stringify(config.defaultPlaylists)
      );
    }

    if (!localStorage.getItem("bookmarkedPlaylists")) {
      localStorage.setItem(
        "bookmarkedPlaylists",
        JSON.stringify(config.defaultBookmarkedPlaylists)
      );
    }

    if (!localStorage.getItem("followSet")) {
      localStorage.setItem(
        "followSet",
        JSON.stringify(config.defaultFollowSet)
      );
    }

    if (!localStorage.getItem("muteSet")) {
      localStorage.setItem("muteSet", JSON.stringify(config.defaultMuteSet));
    }

    if (!localStorage.getItem("favoriteChannels")) {
      localStorage.setItem(
        "favoriteChannels",
        JSON.stringify(config.favoriteChannels)
      );
    }

    // Initialize tags from config
    if (!localStorage.getItem("allTags")) {
      initializeTagsFromConfig();
    }

    // Initialize media server whitelist
    if (!localStorage.getItem("mediaServerWhitelist")) {
      localStorage.setItem(
        "mediaServerWhitelist",
        JSON.stringify(config.defaultMediaServerWhitelist)
      );
    }

    console.log("First visit detected - initialized with starter data");
  }
}

function initializeTagsFromConfig() {
  // Get static tags from config
  let staticTags = [];
  if (config.categories && config.categories.length > 0) {
    let tagCategory = config.categories.find((cat) => cat.title === "Tag");
    if (tagCategory && tagCategory.items) {
      staticTags = tagCategory.items.map((item) => ({
        value: item.name || item.displayName.toLowerCase(),
        displayName: item.displayName,
        isStatic: true, // Mark as originally static
      }));
    }
  }

  // Save to localStorage
  try {
    localStorage.setItem("allTags", JSON.stringify(staticTags));
    console.log("Initialized tags from config:", staticTags.length, "tags");
  } catch (error) {
    console.error("Error initializing tags:", error);
  }
}

document.getElementById("create-button").addEventListener("click", function () {
  window.location.hash = "post";
});
////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////

async function handleNostrLogin() {
  console.log("%c[Login] Starting login handler", "color: blue; font-weight: bold");
  
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
    console.error("%c[Login] Top-level login error:", "color: red; font-weight: bold", error);
    await handleLoginFailure("Unexpected login error", error);
  }
}

async function attemptLoginWithMethod(methodName, loginFunction) {
  console.log(`%c[Login] Attempting ${methodName} login`, "color: blue; font-weight: bold");
  
  // Prevent concurrent login attempts
  if (app.loginState.isAttemptingLogin) {
    console.warn("%c[Login] Login already in progress, ignoring duplicate attempt", "color: orange");
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
      )
    ]);
    
    // Success - verify we're actually logged in
    if (!app.isLoggedIn || !app.myPk) {
      throw new Error("Login function completed but user not logged in");
    }
    
    console.log(`%c[Login] ✅ ${methodName} login successful`, "color: green; font-weight: bold");
    console.log(`%c[Login] User: ${app.myNpub}`, "color: green");
    console.log(`%c[Login] isLoggedIn: ${app.isLoggedIn}, myPk: ${app.myPk}`, "color: green");
    
    // CRITICAL: Force removal of ALL login UI after successful login
    console.log("%c[Login] Closing login modal after successful login", "color: green; font-weight: bold");
    removePersistentLoginOverlay();
    
    // Update UI
    renderNavLinks();
    updateSidebar();
    updateDrawerContent();
    
    // Double-check after a short delay (safety net)
    setTimeout(() => {
      if (app.isLoggedIn && app.myPk && app.loginState.loginOverlayActive) {
        console.log("%c[Login] Overlay still active after login, forcing removal", "color: orange; font-weight: bold");
        removePersistentLoginOverlay();
      }
    }, 500);
    
  } catch (error) {
    console.error(`%c[Login] ❌ ${methodName} login failed:`, "color: red; font-weight: bold", error);
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
  console.log("%c[Cleanup] Cleaning up partial login state", "color: orange; font-weight: bold");
  
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
    bunkerPool: null
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
  console.log("%c[Login Overlay] Removing all login overlays", "color: green; font-weight: bold");
  
  // Remove initial loading overlay
  const overlay = document.getElementById("login-overlay");
  if (overlay) {
    overlay.remove();
  }
  
  // Remove dedicated login modal
  removeLoginModal();
  
  app.loginState.loginOverlayActive = false;
  console.log("%c[Login Overlay] ✅ All login UI removed", "color: green; font-weight: bold");
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

async function attemptExtensionLogin() {
  console.log("%c[Extension] Attempting extension login", "color: green; font-weight: bold");
  
  if (typeof window.nostr !== "undefined" && window.nostr !== null) {
    console.log("%c[Extension] Extension detected, requesting public key", "color: green");
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

    console.log("%c[Extension] ✅ Logged in with extension:", "color: green; font-weight: bold", myNpub);
    
    // Don't update UI here - let attemptLoginWithMethod do it after modal closes
    
  } else {
    console.warn("%c[Extension] Extension not available", "color: orange");
    throw new Error("Extension not available");
  }
}
async function showLoginPrompt() {
  return new Promise((resolve) => {
    console.log("%c[Login Prompt] Showing login choice", "color: blue; font-weight: bold");
    
    // Remove initial loading overlay first
    const loadingOverlay = document.getElementById("login-overlay");
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
    
    const hasExtension = typeof window.nostr !== "undefined" && window.nostr !== null;
    
    const content = `
      <p>${hasExtension ? "We detected a Nostr browser extension. " : ""}Choose your login method:</p>
      <div class="login-buttons">
        ${hasExtension ? `
          <button id="use-extension-btn" class="btn-primary">
            🔐 Use Browser Extension
          </button>
        ` : ''}
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
      modal.querySelector("#use-extension-btn").addEventListener("click", async () => {
        localStorage.setItem("preferredLoginMethod", "extension");
        showLoginSpinner("Connecting to extension...");
        try {
          await attemptExtensionLogin();
          // Success - close modal
          console.log("%c[Extension] Login successful, closing modal", "color: green; font-weight: bold");
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
    
    modal.querySelector("#use-bunker-btn").addEventListener("click", async () => {
      await showBunkerLoginFlow(resolve);
    });
    
    modal.querySelector("#use-guest-btn").addEventListener("click", async () => {
      localStorage.setItem("preferredLoginMethod", "guest");
      showLoginSpinner("Creating guest account...");
      try {
        await handleGuestLogin();
        // Success - close modal
        console.log("%c[Guest] Login successful, closing modal", "color: green; font-weight: bold");
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

async function fallbackToLoginPrompt(reason = "Login failed") {
  console.log(`%c[Login Fallback] ${reason}, returning to login prompt`, "color: orange; font-weight: bold");
  
  // Clear any saved login preferences that failed
  if (app.loginState.lastAttemptMethod) {
    console.log(`%c[Login Fallback] Clearing failed ${app.loginState.lastAttemptMethod} preference`, "color: orange");
    localStorage.removeItem("preferredLoginMethod");
  }
  
  // Clean up any partial state
  await cleanupPartialLoginState();
  
  // Ensure overlay is visible
  if (!app.loginState.loginOverlayActive) {
    showPersistentLoginOverlay();
  }
  
  // Show the login prompt
  await showLoginPrompt();
}

function showGuestInfoModal(resolve) {
  const modal = document.createElement("div");
  modal.className = "login-modal-overlay";
  modal.innerHTML = `
    <div class="login-modal">
      <h3>Guest Login</h3>
      <p>No Nostr extension detected. You'll be logged in with a guest account that's stored locally on your device.</p>
      <div class="login-buttons">
        <button id="continue-guest-btn" class="btn-primary">
          👤 Continue as Guest
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("continue-guest-btn")
    .addEventListener("click", async () => {
      modal.remove();
      localStorage.setItem("preferredLoginMethod", "guest");
      await handleGuestLogin();
      resolve();
    });
}

async function handleGuestLogin() {
  console.log("%c[Guest] Starting guest login", "color: blue; font-weight: bold");
  
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
    console.log("%c[Guest] ✅ New guest account created and saved", "color: green; font-weight: bold");
  } else {
    try {
      console.log("%c[Guest] Loading existing guest account", "color: blue");
      const decryptedData = JSON.parse(atob(encryptedGuestData));
      guestSk = new Uint8Array(decryptedData.sk);
      console.log("%c[Guest] ✅ Existing guest account loaded", "color: green; font-weight: bold");
    } catch (error) {
      console.error("%c[Guest] Error decrypting guest data:", "color: red", error);
      console.log("%c[Guest] Creating new account after decryption failure", "color: blue");
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

  console.log("%c[Guest] ✅ Logged in as guest:", "color: green; font-weight: bold", myNpub);

  if (isNewAccount) {
    publishGuestProfile(guestSk, pk).catch(err => 
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

function signEventAsGuest(eventTemplate) {
  if (!app.isGuest || !app.guestSk) {
    throw new Error("Guest login not available");
  }

  if (confirm("Sign event with guest key?")) {
    // If event already has an id (from mining), just sign it
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
}

// Usage
async function someEventHandler() {
  try {
    const eventTemplate = {
      /* event template */
    };
    const signedEvent = await handleEventSigning(eventTemplate);
    // Proceed with publishing or further processing
  } catch (error) {
    console.error("Event signing failed:", error);
    // Handle signing failure (e.g., show error to user)
  }
}

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
//////////////////
// global UI (index.html elements)
function renderNavLinks() {
  let navContainer = document.getElementById("login-container");
  let existingProfileLink = document.getElementById("profile-link");
  if (existingProfileLink) {
    existingProfileLink.remove();
  }
  let profileLink = document.createElement("button");
  profileLink.id = "profile-link";
  profileLink.className = "nav-link";
  if (app.isLoggedIn) {
    //  profileLink.innerHTML = `<span>${app.myNpub.substring(0, 10)}...</span>`;
    profileLink.innerHTML = `<nostr-picture pubkey="${app.myNpub}"></nostr-picture>`;
    profileLink.onclick = function () {
      //window.location.hash = `#profile/${app.myPk}`;
      showSettingsMenu(profileLink);
    };
  } else {
    profileLink.innerHTML = `<span>Log In</span>`;
    profileLink.onclick = function () {
      window.location.hash = `#profile/123`;
    };
  }
  navContainer.appendChild(profileLink);
}

let toggleThemeButton = document.getElementById("toggleTheme");
let body = document.documentElement;

updateTheme();

toggleThemeButton.addEventListener("click", toggleTheme);

const colorPickerButton = document.getElementById("colorPicker");

colorPickerButton.addEventListener("click", () => {
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();

  colorInput.click();

  colorInput.addEventListener("input", (e) => {
    const primaryColor = e.target.value;

    // Generate a complete color palette based on the primary color
    const palette = generateColorPalette(primaryColor);

    // Apply all colors from the palette
    applyColorPalette(palette);

    // Update app state and save to localStorage
    app.primaryColor = primaryColor;
    app.colorPalette = palette;
    localStorage.setItem("primaryColor", primaryColor);
    localStorage.setItem("colorPalette", JSON.stringify(palette));
  });
});

////////////////////////////////////
// Global PWA Install Prompt Handler
window.deferredPrompt = null;

// Listen for the beforeinstallprompt event
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("Install prompt available");
  e.preventDefault(); // Prevent the mini-infobar
  window.deferredPrompt = e;
});

// Hide install option if app gets installed
window.addEventListener("appinstalled", () => {
  console.log("PWA was installed");
  window.deferredPrompt = null;
});




/////////////////////////
async function showBunkerLoginFlow(resolve) {
  console.log("%c[Bunker] Starting bunker flow", "color: purple; font-weight: bold");
  
  const savedBunkerData = localStorage.getItem("bunker_connection_data");
  
  if (savedBunkerData) {
    console.log("%c[Bunker] Reconnecting with saved data", "color: purple");
    showLoginSpinner("Reconnecting to bunker...");
    await attemptBunkerLogin();
    resolve();
    return;
  }
  
  // Show method selection
  const content = `
    <p>Connect to a remote signer (bunker):</p>
    <div class="bunker-methods">
      <button id="bunker-scan-qr" class="btn-primary">
        📱 Scan QR Code
      </button>
      <button id="bunker-enter-uri" class="btn-primary">
        ⌨️ Enter Bunker URI
      </button>
      <button id="bunker-back-btn" class="btn-secondary">
        ← Back to Login Options
      </button>
    </div>
  `;
  
  updateLoginModalContent("Connect Remote Signer", content);
  
  const modal = document.querySelector("#dedicated-login-overlay .login-modal");
  
  modal.querySelector("#bunker-scan-qr").addEventListener("click", async () => {
    await initiateBunkerQRFlow(resolve);
  });
  
  modal.querySelector("#bunker-enter-uri").addEventListener("click", async () => {
    await initiateBunkerURIFlow(resolve);
  });
  
  modal.querySelector("#bunker-back-btn").addEventListener("click", async () => {
    await showLoginPrompt();
  });
}


async function initiateBunkerQRFlow(resolve) {
  console.log("%c[Bunker QR] Starting QR flow", "color: blue; font-weight: bold");
  
  let pool = null;
  let localSecretKey = null;
  
  try {
    // Generate client keypair
    localSecretKey = window.NostrTools.generateSecretKey();
    const clientPubkey = window.NostrTools.getPublicKey(localSecretKey);
    
    // Generate connection secret
    const connectionSecret = window.NostrTools.generateSecretKey();
    const secretString = Array.from(connectionSecret)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32);
    
    // Define relays for the connection
    const relays = ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol'];
    
    // Create nostrconnect URI for QR code
    const connectionUri = createNostrConnectURI({
      clientPubkey,
      relays,
      secret: secretString,
      name: 'Vutr'
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
    
    const modal = document.querySelector("#dedicated-login-overlay .login-modal");
    const statusEl = modal.querySelector("#connection-status");
    
    // Cancel button
    modal.querySelector("#cancel-bunker-qr-btn").addEventListener("click", () => {
      if (pool) pool.close(relays);
      showBunkerLoginFlow(resolve);
    });
    
    // Copy button
    modal.querySelector("#copy-uri-btn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(connectionUri);
        const btn = modal.querySelector("#copy-uri-btn");
        btn.textContent = "✓ Copied!";
        setTimeout(() => btn.textContent = "Copy URI", 2000);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    });
    
    // Create pool for connection
    pool = new window.NostrTools.SimplePool();
    statusEl.textContent = "⏳ Connecting...";
    
    console.log("%c[Bunker QR] Waiting for bunker to scan QR code (60s timeout)", "color: blue");
    
    // Wait for bunker to scan and connect
    // fromURI is ASYNC and returns a Promise that resolves when connection is established
    const signer = await Promise.race([
      BunkerSigner.fromURI(localSecretKey, connectionUri, { pool }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("QR code not scanned within 60 seconds")), 60000)
      )
    ]);
    
    statusEl.textContent = "✅ Connected! Getting your public key...";
    console.log("%c[Bunker QR] Connection established!", "color: green");
    
    // Get user's public key
    const pubkey = await Promise.race([
      signer.getPublicKey(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout getting public key")), 10000)
      )
    ]);
    
    console.log("%c[Bunker QR] User pubkey retrieved:", "color: green", pubkey);
    
    // CRITICAL: Extract the bunkerPointer from the signer
    // After fromURI completes, signer.bp contains the bunkerPointer we need
    const bunkerPointer = signer.bp;
    
    console.log("%c[Bunker QR] Extracted bunkerPointer:", "color: purple", {
      remotePubkey: bunkerPointer.pubkey.substring(0, 16) + "...",
      relays: bunkerPointer.relays,
      hasSecret: !!bunkerPointer.secret
    });
    
    // Complete login and save for persistence
    await completeBunkerLogin(signer, localSecretKey, pubkey, pool, bunkerPointer);
    resolve();
    
  } catch (error) {
    console.error("%c[Bunker QR] Error:", "color: red; font-weight: bold", error);
    if (pool) {
      pool.close(['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol']);
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


async function extractBunkerPointerFromSigner(signer, userPubkey, pool) {
  console.log("%c[Bunker] Extracting bunker pointer for persistence", "color: purple");
  
  // The signer object should contain the remote signer pubkey
  // We need to construct a bunkerPointer object for future reconnections
  
  // Get remote signer pubkey from the signer instance
  // This varies by implementation - check nostr-tools BunkerSigner structure
  const remoteSignerPubkey = signer.remotePubkey || signer.signerPubkey;
  
  if (!remoteSignerPubkey) {
    console.error("%c[Bunker] Could not extract remote signer pubkey", "color: red");
    // Fallback: use user pubkey as remote signer (some bunkers use same key)
    // This is a workaround - ideally we should get this from the signer
    return {
      pubkey: userPubkey,
      relays: ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol']
    };
  }
  
  return {
    pubkey: remoteSignerPubkey,
    relays: ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol'] // Use the relays from QR
  };
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
  modal.querySelector("#cancel-bunker-uri-btn").addEventListener("click", () => {
    showBunkerLoginFlow(resolve);
  });
  
  // Connect button
  modal.querySelector("#connect-bunker-btn").addEventListener("click", async () => {
    const bunkerInput = modal.querySelector("#bunker-uri-input").value.trim();
    
    if (!bunkerInput) {
      alertModal("Please enter a bunker URI or NIP-05 identifier", "Invalid Input");
      return;
    }
    
    let pool = null;
    
    try {
      showLoginSpinner("Connecting to bunker...");
      
      // Parse the bunker input (supports both bunker:// URIs and NIP-05)
      const bunkerPointer = await parseBunkerInput(bunkerInput);
      
      if (!bunkerPointer || !bunkerPointer.pubkey || !bunkerPointer.relays || bunkerPointer.relays.length === 0) {
        throw new Error("Invalid bunker URI or NIP-05 identifier");
      }
      
      console.log("%c[Bunker URI] Parsed bunker pointer:", "color: purple", {
        remotePubkey: bunkerPointer.pubkey.substring(0, 16) + "...",
        relays: bunkerPointer.relays,
        hasSecret: !!bunkerPointer.secret
      });
      
      // Generate local keypair for this connection
      const localSecretKey = window.NostrTools.generateSecretKey();
      
      // Create pool
      pool = new window.NostrTools.SimplePool();
      
      // Create bunker signer using fromBunker
      const bunker = BunkerSigner.fromBunker(localSecretKey, bunkerPointer, { pool });
      
      console.log("%c[Bunker URI] Signer created, calling connect() for first-time connection", "color: purple");
      
      // IMPORTANT: For first-time connection with bunker URI, call .connect()
      // This establishes the connection and gets authorization from the bunker
      await Promise.race([
        bunker.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout")), 30000)
        )
      ]);
      
      console.log("%c[Bunker URI] Connection established, getting public key", "color: purple");
      
      // Get user's public key
      const pubkey = await Promise.race([
        bunker.getPublicKey(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout getting public key")), 10000)
        )
      ]);
      
      console.log("%c[Bunker URI] User pubkey retrieved:", "color: green", pubkey);
      
      // Complete login and save for persistence
      await completeBunkerLogin(bunker, localSecretKey, pubkey, pool, bunkerPointer);
      resolve();
      
    } catch (error) {
      console.error("%c[Bunker URI] Error:", "color: red; font-weight: bold", error);
      if (pool && error.bunkerPointer?.relays) {
        pool.close(error.bunkerPointer.relays);
      }
      
      await alertModal("Failed to connect: " + error.message, "Connection Error");
      await showBunkerLoginFlow(resolve);
    }
  });
}


// Shared completion logic for interactive bunker login (QR/URI)
async function completeBunkerLogin(signer, localSecretKey, pubkey, pool, bunkerPointer) {
  const npub = window.NostrTools.nip19.npubEncode(pubkey);
  
  console.log("%c[Bunker] Saving connection data for persistence", "color: purple; font-weight: bold");
  
  // Save EVERYTHING needed for reconnection
  const bunkerData = {
    localSk: Array.from(localSecretKey),           // Client's local secret key
    pubkey: pubkey,                                 // User's public key (for display)
    bunkerPointer: {                                // The critical data for reconnection
      pubkey: bunkerPointer.pubkey,                // Remote signer's pubkey
      relays: bunkerPointer.relays,                // Relays to communicate with bunker
      secret: bunkerPointer.secret || null         // Optional secret (usually null after first connect)
    },
    connected: Date.now(),
    lastUsed: Date.now()
  };
  
  // Validate before saving
  if (!bunkerData.bunkerPointer.pubkey || !bunkerData.bunkerPointer.relays || bunkerData.bunkerPointer.relays.length === 0) {
    console.error("%c[Bunker] ⚠️ Invalid bunkerPointer! Future reconnection will fail", "color: red; font-weight: bold");
    throw new Error("Invalid bunker connection data");
  }
  
  localStorage.setItem("bunker_connection_data", JSON.stringify(bunkerData));
  localStorage.setItem("preferredLoginMethod", "bunker");
  
  console.log("%c[Bunker] ✅ Connection data saved successfully", "color: green; font-weight: bold");
  
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
    bunkerPool: pool
  });
  
  console.log("%c[Bunker] ✅ Login complete:", "color: green; font-weight: bold", npub);
  
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
  console.log("%c[Bunker Reconnect] Attempting to reconnect with saved data", "color: cyan; font-weight: bold");
  
  const savedBunkerData = localStorage.getItem("bunker_connection_data");
  
  if (!savedBunkerData) {
    console.warn("%c[Bunker Reconnect] No saved bunker connection found", "color: cyan");
    throw new Error("No saved bunker connection");
  }

  const bunkerData = JSON.parse(savedBunkerData);
  
  // Validate saved data - MUST have these fields
  if (!bunkerData.localSk || !bunkerData.bunkerPointer) {
    console.error("%c[Bunker Reconnect] Invalid saved bunker data", "color: red");
    localStorage.removeItem("bunker_connection_data");
    throw new Error("Invalid saved bunker data");
  }
  
  // Validate bunkerPointer structure
  const bp = bunkerData.bunkerPointer;
  if (!bp.pubkey || !bp.relays || bp.relays.length === 0) {
    console.error("%c[Bunker Reconnect] Invalid bunkerPointer", "color: red");
    localStorage.removeItem("bunker_connection_data");
    throw new Error("Invalid bunkerPointer structure");
  }
  
  console.log("%c[Bunker Reconnect] Restoring connection:", "color: cyan", {
    remotePubkey: bp.pubkey.substring(0, 16) + "...",
    relays: bp.relays,
    hasSecret: !!bp.secret
  });
  
  const localSecretKey = new Uint8Array(bunkerData.localSk);
  const pool = new window.NostrTools.SimplePool();
  
  // Create bunker signer using fromBunker (for reconnection)
  // This is SYNCHRONOUS and sets up subscription immediately
  const bunker = BunkerSigner.fromBunker(localSecretKey, bp, { pool });
  
  console.log("%c[Bunker Reconnect] Signer created, verifying connection (15s timeout)", "color: cyan");
  
  try {
    // Verify connection by getting public key
    // No need to call .connect() - fromBunker already set up subscription
    const pubkey = await Promise.race([
      bunker.getPublicKey(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Bunker verification timeout")), 15000)
      )
    ]);
    
    const npub = window.NostrTools.nip19.npubEncode(pubkey);
    console.log("%c[Bunker Reconnect] ✅ Connection verified:", "color: green; font-weight: bold", npub);

    // Update app state
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
      bunkerPool: pool
    });

    console.log("%c[Bunker Reconnect] ✅ Reconnected successfully", "color: green; font-weight: bold");
    
  } catch (error) {
    // Clean up pool on error
    console.error("%c[Bunker Reconnect] Failed:", "color: red", error);
    pool.close(bp.relays);
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
        setTimeout(() => reject(new Error("Bunker signing timeout (30s)")), 30000)
      )
    ]);
    
    console.log(
      "%c✅ Signed Event with Bunker",
      "font-weight: bold; color: purple;",
      JSON.stringify(signedEvent, null, 2)
    );
    
    // Update last used timestamp
    try {
      const bunkerData = JSON.parse(localStorage.getItem("bunker_connection_data"));
      if (bunkerData) {
        bunkerData.lastUsed = Date.now();
        localStorage.setItem("bunker_connection_data", JSON.stringify(bunkerData));
      }
    } catch (e) {
      console.warn("Could not update lastUsed timestamp:", e);
    }
    
    return signedEvent;
    
  } catch (error) {
    console.error("%c[Bunker Sign] Signing failed:", "color: red; font-weight: bold", error);
    
    // If signing fails due to connection issues, offer to reconnect
    if (error.message.includes("timeout") || error.message.includes("not open")) {
      const shouldReconnect = confirm(
        "Bunker connection seems to be lost. Would you like to reconnect?"
      );
      
      if (shouldReconnect) {
        try {
          console.log("%c[Bunker Sign] Attempting to reconnect...", "color: orange");
          
          // Clean up old connection
          if (app.bunkerPool) {
            app.bunkerPool.close(app.bunkerPointer?.relays || []);
          }
          
          // Attempt reconnection
          await attemptBunkerLogin();
          
          // Retry signing after reconnection
          console.log("%c[Bunker Sign] Reconnected, retrying sign", "color: green");
          return await app.bunkerSigner.signEvent(eventTemplate);
          
        } catch (reconnectError) {
          console.error("%c[Bunker Sign] Reconnection failed:", "color: red", reconnectError);
          throw new Error("Failed to reconnect to bunker: " + reconnectError.message);
        }
      }
    }
    
    throw error;
  }
}


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