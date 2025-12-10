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

//////////////////
// (index.html elements)
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
