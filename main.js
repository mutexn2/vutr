initializeFirstVisit();

let app = {
  // ========== USER & AUTH ==========
  isLoggedIn: false,
  myPk: null,
  myNpub: null,
  isGuest: false,
  guestSk: null,
  loginMethod: null, // 'extension' | 'guest' | null
  currentEditingProfile: null,

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
  forceGarbageCollection();

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
  // Check if user has a saved preference
  const savedLoginMethod = localStorage.getItem("preferredLoginMethod");

  if (savedLoginMethod === "extension") {
    // User previously chose extension, try to use it
    await attemptExtensionLogin();
  } else if (savedLoginMethod === "guest") {
    // User previously chose guest, use guest login
    await handleGuestLogin();
  } else {
    // First time or after sign out - show login prompt
    await showLoginPrompt();
  }
}

async function attemptExtensionLogin() {
  if (typeof window.nostr !== "undefined" && window.nostr !== null) {
    try {
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

      console.log("Logged in with extension:", myNpub);
      renderNavLinks();
      updateSidebar();
      updateDrawerContent();
    } catch (err) {
      console.error("Extension login failed:", err);
      // Extension failed, clear preference and show prompt
      localStorage.removeItem("preferredLoginMethod");
      await showLoginPrompt();
    }
  } else {
    // Extension not available, clear preference and show prompt
    localStorage.removeItem("preferredLoginMethod");
    await showLoginPrompt();
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
  const modal = document.createElement("div");
  modal.className = "login-modal-overlay";
  modal.innerHTML = `
    <div class="login-modal">
      <h3>Choose Login Method</h3>
      <p>We detected a Nostr browser extension. How would you like to sign in?</p>
      <div class="login-buttons">
        <button id="use-extension-btn" class="primary-btn">
          🔐 Use Browser Extension
        </button>
        <button id="use-guest-btn" class="secondary-btn">
          👤 Use Guest Account
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("use-extension-btn")
    .addEventListener("click", async () => {
      modal.remove();
      localStorage.setItem("preferredLoginMethod", "extension");
      await attemptExtensionLogin();
      resolve();
    });

  document
    .getElementById("use-guest-btn")
    .addEventListener("click", async () => {
      modal.remove();
      localStorage.setItem("preferredLoginMethod", "guest");
      await handleGuestLogin();
      resolve();
    });
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
  let encryptedGuestData = localStorage.getItem("nostr_guest_data");
  let guestSk;
  let isNewAccount = false;

  if (!encryptedGuestData) {
    guestSk = window.NostrTools.generateSecretKey();
    isNewAccount = true;

    const guestData = {
      sk: Array.from(guestSk),
      created: Date.now(),
    };

    const encryptedData = btoa(JSON.stringify(guestData));
    localStorage.setItem("nostr_guest_data", encryptedData);
    console.log("Created new guest account");
  } else {
    try {
      const decryptedData = JSON.parse(atob(encryptedGuestData));
      guestSk = new Uint8Array(decryptedData.sk);
      console.log("Using existing guest account");
    } catch (error) {
      console.error(
        "Error decrypting guest data, creating new account:",
        error
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

  console.log("Logged in as guest:", myNpub);

  if (isNewAccount) {
    await publishGuestProfile(guestSk, pk);
  }

  renderNavLinks();
  updateSidebar();
  updateDrawerContent();
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
