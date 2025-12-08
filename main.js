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
  const savedLoginMethod = localStorage.getItem("preferredLoginMethod");

  if (savedLoginMethod === "extension") {
    await attemptExtensionLogin();
  } else if (savedLoginMethod === "guest") {
    await handleGuestLogin();
  } else if (savedLoginMethod === "bunker") {
    await attemptBunkerLogin();
  } else {
    await showLoginPrompt();
  }
}

async function attemptExtensionLogin() {
  console.log("%c[Extension] Attempting extension login", "color: green; font-weight: bold");
  
  if (typeof window.nostr !== "undefined" && window.nostr !== null) {
    try {
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
      renderNavLinks();
      updateSidebar();
      updateDrawerContent();
    } catch (err) {
      console.error("%c[Extension] ❌ Extension login failed:", "color: red; font-weight: bold", err);
      // Fallback to login prompt
      await fallbackToLoginPrompt("Extension login failed");
    }
  } else {
    console.warn("%c[Extension] Extension not available", "color: orange");
    // Fallback to login prompt
    await fallbackToLoginPrompt("Extension not available");
  }
}

async function showLoginPrompt() {
  return new Promise((resolve) => {
    const hasExtension =
      typeof window.nostr !== "undefined" && window.nostr !== null;

    if (hasExtension) {
      // Show modal asking if user wants to use extension
      showLoginChoiceModal(resolve);
    } else {
      // No extension, inform user about guest login
      showGuestInfoModal(resolve);
    }
  });
}

function showLoginChoiceModal(resolve) {
  const hasExtension = typeof window.nostr !== "undefined" && window.nostr !== null;
  
  const modal = document.createElement("div");
  modal.className = "login-modal-overlay";
  modal.innerHTML = `
    <div class="login-modal">
      <h3>Choose Login Method</h3>
      <p>${hasExtension ? "We detected a Nostr browser extension. " : ""}How would you like to sign in?</p>
      <div class="login-buttons">
        ${hasExtension ? `
          <button id="use-extension-btn" class="primary-btn">
            🔐 Use Browser Extension
          </button>
        ` : ''}
        <button id="use-bunker-btn" class="primary-btn">
          🔗 Use Remote Signer (Bunker)
        </button>
        <button id="use-guest-btn" class="secondary-btn">
          👤 Use Guest Account
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (hasExtension) {
    document.getElementById("use-extension-btn").addEventListener("click", async () => {
      modal.remove();
      localStorage.setItem("preferredLoginMethod", "extension");
      await attemptExtensionLogin();
      resolve();
    });
  }

  document.getElementById("use-bunker-btn").addEventListener("click", async () => {
    modal.remove();
    await showBunkerLoginModal(resolve);
  });

  document.getElementById("use-guest-btn").addEventListener("click", async () => {
    modal.remove();
    localStorage.setItem("preferredLoginMethod", "guest");
    await handleGuestLogin();
    resolve();
  });
}

async function fallbackToLoginPrompt(reason = "Login failed") {
  console.log(`%c[Login Fallback] ${reason}, showing login prompt`, "color: orange; font-weight: bold");
  
  // Clear any saved login preferences
  localStorage.removeItem("preferredLoginMethod");
  
  // Clean up any partial bunker connections
  if (app.bunkerSigner || app.bunkerPool) {
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
        <button id="continue-guest-btn" class="primary-btn">
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

  try {
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
      console.log("%c[Guest] New guest account created", "color: blue");
    } else {
      try {
        console.log("%c[Guest] Loading existing guest account", "color: blue");
        const decryptedData = JSON.parse(atob(encryptedGuestData));
        guestSk = new Uint8Array(decryptedData.sk);
        console.log("%c[Guest] Existing guest account loaded", "color: blue");
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
      await publishGuestProfile(guestSk, pk);
    }

    renderNavLinks();
    updateSidebar();
    updateDrawerContent();
    
  } catch (error) {
    console.error("%c[Guest] ❌ Guest login failed:", "color: red; font-weight: bold", error);
    // Fallback to login prompt
    await fallbackToLoginPrompt("Guest login failed");
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
async function showBunkerLoginModal(resolve) {
  console.log("%c[Bunker] Starting bunker login flow", "color: purple; font-weight: bold");
  
  // Check if we have a saved bunker connection
  const savedBunkerData = localStorage.getItem("bunker_connection_data");
  
  if (savedBunkerData) {
    console.log("%c[Bunker] Found saved connection, attempting to reconnect", "color: purple");
    await attemptBunkerLogin();
    resolve();
    return;
  }

  console.log("%c[Bunker] No saved connection, showing method selection", "color: purple");

  // First time bunker login - show options
  const content = `
    <div class="bunker-login-modal">
      <p>Connect to a remote signer (bunker) using one of these methods:</p>
      <div class="bunker-methods">
        <button id="bunker-scan-qr" class="primary-btn">
          📱 Scan QR Code (Recommended)
        </button>
        <button id="bunker-enter-uri" class="secondary-btn">
          ⌨️ Enter Bunker URI
        </button>
      </div>
      <p class="bunker-info">First time? Use QR code for the best experience.</p>
    </div>
  `;

  const modal = openModal({
    title: "Connect Remote Signer",
    content: content,
    size: "medium",
  });

  console.log("%c[Bunker] Method selection modal opened", "color: purple");

  modal.querySelector("#bunker-scan-qr").addEventListener("click", async () => {
    console.log("%c[Bunker] QR method selected", "color: purple; font-weight: bold");
    // Don't close the modal yet, just replace its content
    await initiateBunkerQRFlow(resolve, modal);
  });

  modal.querySelector("#bunker-enter-uri").addEventListener("click", async () => {
    console.log("%c[Bunker] URI method selected", "color: purple; font-weight: bold");
    // Don't close the modal yet, just replace its content
    await initiateBunkerURIFlow(resolve, modal);
  });
}

async function initiateBunkerQRFlow(resolve, existingModal = null) {
  console.log("%c[Bunker QR] Starting QR flow", "color: blue; font-weight: bold");
  
  try {
    // Generate local secret key for communication
    console.log("%c[Bunker QR] Generating local secret key", "color: blue");
    const localSecretKey = window.NostrTools.generateSecretKey();
    const clientPubkey = window.NostrTools.getPublicKey(localSecretKey);
    console.log("%c[Bunker QR] Client pubkey:", "color: blue", clientPubkey);

    // Generate a random secret for verification
    const connectionSecret = window.NostrTools.generateSecretKey();
    const secretString = Array.from(connectionSecret).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
    console.log("%c[Bunker QR] Connection secret generated", "color: blue");

    // Create connection URI
    console.log("%c[Bunker QR] Creating nostrconnect URI", "color: blue");
    const connectionUri = createNostrConnectURI({
      clientPubkey,
      relays: ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol'],
      secret: secretString,
      name: 'Vutr'
    });
    
    console.log("%c[Bunker QR] Connection URI created:", "color: blue", connectionUri);
    console.log("%c[Bunker QR] Generating QR code", "color: blue");

    // Show QR code modal
    const qrContent = `
      <div class="bunker-qr-container">
        <p>Scan this QR code with your bunker app (e.g., Amber, nsec.app):</p>
        <div class="qr-display">
          ${generateQrCode(connectionUri)}
        </div>
        <div class="connection-status">
          <p id="connection-status">⏳ Waiting for connection...</p>
        </div>
        <details class="uri-details">
          <summary>Show URI (advanced)</summary>
          <input type="text" value="${connectionUri}" readonly class="uri-input">
          <button id="copy-uri-btn">Copy URI</button>
        </details>
      </div>
    `;

    let modal;
    if (existingModal) {
      // Replace content of existing modal
      console.log("%c[Bunker QR] Replacing existing modal content", "color: blue");
      const modalContent = existingModal.querySelector('.modal-body');
      const modalTitle = existingModal.querySelector('.modal-title');
      if (modalTitle) modalTitle.textContent = "Scan QR Code to Connect";
      if (modalContent) modalContent.innerHTML = qrContent;
      modal = existingModal;
    } else {
      // Create new modal
      console.log("%c[Bunker QR] Creating new modal", "color: blue");
      modal = openModal({
        title: "Scan QR Code to Connect",
        content: qrContent,
        size: "medium",
        closeOnOverlay: false,
      });
    }

    console.log("%c[Bunker QR] QR modal displayed", "color: blue");

    // Copy URI button handler
    const copyBtn = modal.querySelector("#copy-uri-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        console.log("%c[Bunker QR] Copy URI clicked", "color: blue");
        try {
          await navigator.clipboard.writeText(connectionUri);
          copyBtn.textContent = "Copied!";
          setTimeout(() => copyBtn.textContent = "Copy URI", 2000);
          console.log("%c[Bunker QR] URI copied to clipboard", "color: green");
        } catch (err) {
          console.error("%c[Bunker QR] Failed to copy:", "color: red", err);
        }
      });
    }

    // Wait for bunker to connect (Method 2 from docs)
    const statusEl = modal.querySelector("#connection-status");
    statusEl.textContent = "⏳ Connecting...";
    console.log("%c[Bunker QR] Waiting for bunker to scan and connect...", "color: blue; font-weight: bold");

    const pool = new window.NostrTools.SimplePool();
    console.log("%c[Bunker QR] SimplePool created", "color: blue");
    
    console.log("%c[Bunker QR] Calling BunkerSigner.fromURI (this will wait for connection)", "color: blue; font-weight: bold");
    const signer = await BunkerSigner.fromURI(
      localSecretKey,
      connectionUri,
      { pool }
    );

    console.log("%c[Bunker QR] ✅ Bunker connected!", "color: green; font-weight: bold");
    statusEl.textContent = "✅ Connected! Getting your public key...";

    // Get public key
    console.log("%c[Bunker QR] Requesting public key from bunker", "color: blue");
    const pubkey = await signer.getPublicKey();
    const npub = window.NostrTools.nip19.npubEncode(pubkey);
    console.log("%c[Bunker QR] Public key received:", "color: green", npub);

    // Save connection data for future sessions (Method 1)
    console.log("%c[Bunker QR] Saving connection data to localStorage", "color: blue");
    const bunkerData = {
      localSk: Array.from(localSecretKey),
      pubkey: pubkey,
      bunkerUri: connectionUri,
      connected: Date.now()
    };

    localStorage.setItem("bunker_connection_data", JSON.stringify(bunkerData));
    localStorage.setItem("preferredLoginMethod", "bunker");
    console.log("%c[Bunker QR] Connection data saved", "color: green");

    // Update app state
    console.log("%c[Bunker QR] Updating app state", "color: blue");
    updateApp({
      isLoggedIn: true,
      myPk: pubkey,
      myNpub: npub,
      isGuest: false,
      guestSk: null,
      loginMethod: "bunker",
      bunkerSigner: signer,
      bunkerLocalSk: localSecretKey,
      bunkerPool: pool
    });

    console.log("%c[Bunker QR] ✅ Logged in with bunker:", "color: green; font-weight: bold", npub);
    statusEl.textContent = "✅ Success! Logging you in...";

    // Close modal after a brief moment
    setTimeout(() => {
      closeModal();
      renderNavLinks();
      updateSidebar();
      updateDrawerContent();
      console.log("%c[Bunker QR] Login complete, UI updated", "color: green; font-weight: bold");
    }, 1000);

    if (resolve) resolve();

  } catch (error) {
    console.error("%c[Bunker QR] ❌ Error:", "color: red; font-weight: bold", error);
    console.error("%c[Bunker QR] Error stack:", "color: red", error.stack);
    closeModal();
    
    // Show error message
    await alertModal("Failed to connect to bunker: " + error.message, "Connection Error");
    
    // Fallback to login prompt
    await fallbackToLoginPrompt("Bunker QR connection failed");
    
    if (resolve) resolve();
  }
}

async function initiateBunkerURIFlow(resolve, existingModal = null) {
  console.log("%c[Bunker URI] Starting URI input flow", "color: orange; font-weight: bold");
  
  const content = `
    <div class="bunker-uri-input">
      <p>Enter your bunker URI or NIP-05 identifier:</p>
      <input type="text" id="bunker-uri-input" placeholder="bunker://... or user@domain.com" class="bunker-input">
      <button id="connect-bunker-btn" class="primary-btn">Connect</button>
      <p class="help-text">Get your bunker URI from your remote signer app (e.g., Amber, nsec.app)</p>
    </div>
  `;

  let modal;
  if (existingModal) {
    // Replace content of existing modal
    console.log("%c[Bunker URI] Replacing existing modal content", "color: orange");
    const modalContent = existingModal.querySelector('.modal-body');
    const modalTitle = existingModal.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = "Enter Bunker URI";
    if (modalContent) modalContent.innerHTML = content;
    modal = existingModal;
  } else {
    // Create new modal
    console.log("%c[Bunker URI] Creating new modal", "color: orange");
    modal = openModal({
      title: "Enter Bunker URI",
      content: content,
      size: "medium",
    });
  }

  console.log("%c[Bunker URI] URI input modal displayed", "color: orange");

  const connectBtn = modal.querySelector("#connect-bunker-btn");
  if (connectBtn) {
    connectBtn.addEventListener("click", async () => {
      const bunkerInput = modal.querySelector("#bunker-uri-input").value.trim();
      
      console.log("%c[Bunker URI] Connect button clicked", "color: orange; font-weight: bold");
      console.log("%c[Bunker URI] Input value:", "color: orange", bunkerInput);
      
      if (!bunkerInput) {
        console.warn("%c[Bunker URI] Empty input", "color: orange");
        alertModal("Please enter a bunker URI or NIP-05 identifier", "Invalid Input");
        return;
      }

      try {
        console.log("%c[Bunker URI] Parsing bunker input", "color: orange");
        
        // Show connecting status in the same modal
        const modalContent = modal.querySelector('.modal-body');
        if (modalContent) {
          modalContent.innerHTML = `<div class="connecting-status"><p>⏳ Connecting to bunker...</p></div>`;
        }
        console.log("%c[Bunker URI] Connecting status displayed", "color: orange");

        // Parse bunker input (handles both bunker:// URIs and NIP-05)
        const bunkerPointer = await parseBunkerInput(bunkerInput);
        
        if (!bunkerPointer) {
          throw new Error("Invalid bunker input");
        }
        
        console.log("%c[Bunker URI] Bunker pointer parsed:", "color: orange", bunkerPointer);

        // Generate local secret key
        console.log("%c[Bunker URI] Generating local secret key", "color: orange");
        const localSecretKey = window.NostrTools.generateSecretKey();
        const clientPubkey = window.NostrTools.getPublicKey(localSecretKey);
        console.log("%c[Bunker URI] Client pubkey:", "color: orange", clientPubkey);

        // Create bunker signer (Method 1 from docs)
        console.log("%c[Bunker URI] Creating SimplePool", "color: orange");
        const pool = new window.NostrTools.SimplePool();
        
        console.log("%c[Bunker URI] Creating BunkerSigner from bunker pointer", "color: orange");
        const bunker = BunkerSigner.fromBunker(
          localSecretKey,
          bunkerPointer,
          { pool }
        );

        // For first-time connection, explicitly connect
        console.log("%c[Bunker URI] Calling bunker.connect() for first-time connection", "color: orange; font-weight: bold");
        await bunker.connect();
        console.log("%c[Bunker URI] ✅ Bunker connected!", "color: green; font-weight: bold");

        // Get public key
        console.log("%c[Bunker URI] Requesting public key from bunker", "color: orange");
        const pubkey = await bunker.getPublicKey();
        const npub = window.NostrTools.nip19.npubEncode(pubkey);
        console.log("%c[Bunker URI] Public key received:", "color: green", npub);

        // Save connection data
        console.log("%c[Bunker URI] Saving connection data to localStorage", "color: orange");
        const bunkerData = {
          localSk: Array.from(localSecretKey),
          pubkey: pubkey,
          bunkerPointer: {
            pubkey: bunkerPointer.pubkey,
            relays: bunkerPointer.relays,
            secret: bunkerPointer.secret
          },
          connected: Date.now()
        };

        localStorage.setItem("bunker_connection_data", JSON.stringify(bunkerData));
        localStorage.setItem("preferredLoginMethod", "bunker");
        console.log("%c[Bunker URI] Connection data saved", "color: green");

        // Update app state
        console.log("%c[Bunker URI] Updating app state", "color: orange");
        updateApp({
          isLoggedIn: true,
          myPk: pubkey,
          myNpub: npub,
          isGuest: false,
          guestSk: null,
          loginMethod: "bunker",
          bunkerSigner: bunker,
          bunkerLocalSk: localSecretKey,
          bunkerPointer: bunkerPointer,
          bunkerPool: pool
        });

        console.log("%c[Bunker URI] ✅ Logged in with bunker:", "color: green; font-weight: bold", npub);

        // Show success message briefly
        if (modalContent) {
          modalContent.innerHTML = `<div class="connecting-status"><p>✅ Connected successfully!</p></div>`;
        }

        setTimeout(() => {
          closeModal();
          renderNavLinks();
          updateSidebar();
          updateDrawerContent();
          console.log("%c[Bunker URI] Login complete, UI updated", "color: green; font-weight: bold");
        }, 1000);

        if (resolve) resolve();

      } catch (error) {
        console.error("%c[Bunker URI] ❌ Error:", "color: red; font-weight: bold", error);
        console.error("%c[Bunker URI] Error stack:", "color: red", error.stack);
        closeModal();
        
        // Show error message
        await alertModal("Failed to connect: " + error.message, "Connection Error");
        
        // Fallback to login prompt
        await fallbackToLoginPrompt("Bunker URI connection failed");
        
        if (resolve) resolve();
      }
    });
  }
}
async function attemptBunkerLogin() {
  console.log("%c[Bunker Reconnect] Attempting to reconnect with saved data", "color: cyan; font-weight: bold");
  
  try {
    const savedBunkerData = localStorage.getItem("bunker_connection_data");
    
    if (!savedBunkerData) {
      console.warn("%c[Bunker Reconnect] No saved bunker connection found", "color: cyan");
      await fallbackToLoginPrompt("No saved bunker connection");
      return;
    }

    console.log("%c[Bunker Reconnect] Parsing saved bunker data", "color: cyan");
    const bunkerData = JSON.parse(savedBunkerData);
    const localSecretKey = new Uint8Array(bunkerData.localSk);
    console.log("%c[Bunker Reconnect] Local secret key restored", "color: cyan");
    console.log("%c[Bunker Reconnect] Saved pubkey:", "color: cyan", bunkerData.pubkey);

    // Reconnect using Method 1 (no need to call .connect() again)
    console.log("%c[Bunker Reconnect] Creating SimplePool", "color: cyan");
    const pool = new window.NostrTools.SimplePool();
    
    console.log("%c[Bunker Reconnect] Creating BunkerSigner from saved pointer", "color: cyan");
    const bunker = BunkerSigner.fromBunker(
      localSecretKey,
      bunkerData.bunkerPointer,
      { pool }
    );

    // Verify connection by getting public key (note: no .connect() needed for reconnection)
    console.log("%c[Bunker Reconnect] Verifying connection by requesting public key", "color: cyan");
    const pubkey = await bunker.getPublicKey();
    const npub = window.NostrTools.nip19.npubEncode(pubkey);
    console.log("%c[Bunker Reconnect] ✅ Connection verified, pubkey:", "color: green", npub);

    console.log("%c[Bunker Reconnect] Updating app state", "color: cyan");
    updateApp({
      isLoggedIn: true,
      myPk: pubkey,
      myNpub: npub,
      isGuest: false,
      guestSk: null,
      loginMethod: "bunker",
      bunkerSigner: bunker,
      bunkerLocalSk: localSecretKey,
      bunkerPointer: bunkerData.bunkerPointer,
      bunkerPool: pool
    });

    console.log("%c[Bunker Reconnect] ✅ Reconnected to bunker successfully:", "color: green; font-weight: bold", npub);
    renderNavLinks();
    updateSidebar();
    updateDrawerContent();

  } catch (error) {
    console.error("%c[Bunker Reconnect] ❌ Reconnection failed:", "color: red; font-weight: bold", error);
    console.error("%c[Bunker Reconnect] Error stack:", "color: red", error.stack);
    
    // Fallback to login prompt
    await fallbackToLoginPrompt("Bunker reconnection failed");
  }
}

async function signEventWithBunker(eventTemplate) {
  if (!app.bunkerSigner) {
    throw new Error("Bunker signer not available");
  }

  try {
    const signedEvent = await app.bunkerSigner.signEvent(eventTemplate);
    console.log(
      "%c Signed Event with Bunker",
      "font-weight: bold; color: purple;",
      JSON.stringify(signedEvent, null, 2)
    );
    return signedEvent;
  } catch (error) {
    console.error("Bunker signing failed:", error);
    throw error;
  }
}

async function clearBunkerConnection() {
  if (app.bunkerSigner) {
    try {
      await app.bunkerSigner.close();
    } catch (error) {
      console.error("Error closing bunker connection:", error);
    }
  }
  
  if (app.bunkerPool) {
    try {
      app.bunkerPool.close([]);
    } catch (error) {
      console.error("Error closing bunker pool:", error);
    }
  }

  localStorage.removeItem("bunker_connection_data");
  
  updateApp({
    bunkerSigner: null,
    bunkerLocalSk: null,
    bunkerPointer: null,
    bunkerPool: null,
    isLoggedIn: false,
    myPk: null,
    myNpub: null,
    loginMethod: null
  });
  
  console.log("Bunker connection cleared");
}