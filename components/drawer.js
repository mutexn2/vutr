
// Initialize drawer with the new system
function initDrawer() {
  const drawerOverlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("drawer");
  const drawerToggleButton = document.getElementById("drawer-toggle");

  // Ensure drawer starts closed
  drawerOverlay.classList.remove("open");
  app.drawerClosed = true;

  // Clear and recreate drawer content
  drawer.innerHTML = "";
  drawer.appendChild(createDrawerContent());

  // Create overlay controls
  const drawerControls = createOverlayControls("drawer", drawerOverlay, {
    closeOnOutsideClick: true,
    closeOnEscape: true,
    preventBodyScroll: true
  });

  // Store controls for easy access
  app.drawerControls = drawerControls;

  // Update app.drawerClosed when overlay state changes
  const originalOverlay = OverlayManager.overlays.get("drawer");
  const originalOnOpen = originalOverlay.onOpen;
  const originalOnClose = originalOverlay.onClose;
  
  originalOverlay.onOpen = function() {
    originalOnOpen.call(this);
    app.drawerClosed = false;
    drawerToggleButton.setAttribute("aria-expanded", "true");
  };
  
  originalOverlay.onClose = function() {
    originalOnClose.call(this);
    app.drawerClosed = true;
    drawerToggleButton.setAttribute("aria-expanded", "false");
  };

  // Setup toggle button
  if (drawerToggleButton && !drawerToggleButton.hasAttribute("data-drawer-listener")) {
    drawerToggleButton.addEventListener("click", drawerControls.toggle);
    drawerToggleButton.setAttribute("data-drawer-listener", "true");
  }

  // Setup other events
  setupDrawerEventDelegation();
}

// Simplified drawer functions
function openDrawer() {
  app.drawerControls.open();
}

function closeDrawer() {
  app.drawerControls.close();
}

function toggleDrawer() {
  app.drawerControls.toggle();
}




function createDrawerContent() {
  const container = document.createElement("div");
  container.className = "drawer-content";

  // Static close button with innerHTML
  container.innerHTML = `
    <div class="drawer-logo-n-btn">
      <button class="drawer-close-btn"> X </button>
      <a class="drawer-logo">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg> 
        <span>Vutr</span>
      </a>
    </div>
    
    <!-- Relay Set Selector -->
    <div class="drawer-relay-selector">
      <select id="drawerRelaySetSelect" class="relay-set-select">
        <!-- Options will be populated dynamically -->
      </select>
    </div>
    
    <div class="drawer-menu"></div>
  `;

  // Add close event to the button
  container
    .querySelector(".drawer-close-btn")
    .addEventListener("click", closeDrawer);

  // Populate and setup relay set selector
  setupRelaySetSelector(container);

  // Build menu sections
  const menuElement = container.querySelector(".drawer-menu");
  buildDrawerSections(menuElement);

  return container;
}

function setupRelaySetSelector(container) {
  const select = container.querySelector("#drawerRelaySetSelect");

  // Populate options
  populateRelaySetOptions(select);

  // Set current active selection
  select.value = app.activeRelayList;

  // Add change event listener
  select.addEventListener("change", (e) => {
    const selectedSet = e.target.value;
    if (selectedSet && selectedSet !== app.activeRelayList) {
      setActiveRelaySetFromDrawer(selectedSet);
    }
  });
}

function setupDrawerEventDelegation() {
  const drawer = document.getElementById("drawer");
  drawer.removeEventListener("click", handleDrawerClick);
  drawer.addEventListener("click", handleDrawerClick);
}

function handleDrawerClick(e) {
  const drawerItem = e.target.closest(".drawer-item[data-id]");
  if (!drawerItem) return;

  e.preventDefault();
  e.stopPropagation();

  const itemId = drawerItem.dataset.id;
  console.log("Drawer item clicked:", itemId);

  // Handle profile clicks
  if (itemId === "profile") {
    const profilePath = app.isLoggedIn ? app.myPk : "123";
    window.location.hash = `#profile/${profilePath}`;
    closeDrawer();
    return;
  }

  // Handle tag clicks
  if (itemId.startsWith("tag-")) {
    const tagValue = itemId.replace("tag-", "");
    window.location.hash = `#tag/params?tags=${tagValue}`;
    closeDrawer();
    return;
  }

  // Handle favorite channel clicks
  if (itemId.startsWith("favorite-")) {
    const pubkey = itemId.replace("favorite-", "");
    window.location.hash = `#profile/${pubkey}`;
    closeDrawer();
    return;
  }

  // Handle info items (like "No favorites yet")
  if (itemId === "no-favorites") {
    // Do nothing or maybe navigate to follows page
    window.location.hash = `#localfollows`;
    closeDrawer();
    return;
  }

  // Handle channel clicks (legacy - if you still have any)
  if (itemId.startsWith("channel-")) {
    const channelValue = itemId.replace("channel-", "");
    window.location.hash = `#channel/${channelValue}`;
    closeDrawer();
    return;
  }

  // Handle regular page navigation
  app.currentPage = itemId;
  window.location.hash = `#${itemId}`;

  if (
    !itemId.startsWith("channel-") &&
    !itemId.startsWith("tag-") &&
    !itemId.startsWith("group-") &&
    !itemId.startsWith("favorite-")
  ) {
    updateSidebar();
    updateDrawerContent();
  }

  closeDrawer();
}

function updateDrawerContent() {
  const menuContent = document.querySelector("#drawer .drawer-menu");
  const relaySelector = document.querySelector("#drawerRelaySetSelect");

  if (!menuContent) return;

  // Update menu sections
  menuContent.innerHTML = "";
  buildDrawerSections(menuContent);

  // Update relay set selector if it exists
  if (relaySelector) {
    populateRelaySetOptions(relaySelector);
    relaySelector.value = app.activeRelayList;
  }
}



///////////////////////////////////////

function populateRelaySetOptions(select) {
  select.innerHTML = "";

  const regularSets = Object.keys(app.relayLists).sort();
  const allSets = [...regularSets, GLOBAL_SET_NAME];

  allSets.forEach((setName) => {
    const option = document.createElement("option");
    option.value = setName;
    option.textContent = setName;
    if (setName === app.activeRelayList) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function setActiveRelaySetFromDrawer(setName) {
  // Same logic as in network settings but simplified
  app.activeRelayList = setName;
  saveRelayLists();

  // Update the drawer content to reflect the change
  updateDrawerContent();

  // Show notification
  //showTemporaryNotification(`Active relay set changed to: ${setName}`);
  location.reload();
}

function buildDrawerSections(menuElement) {
  const sections = getDrawerSections();

  sections.forEach((section) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "drawer-section";

    if (section.isDynamic) {
      // Create dynamic sections programmatically
      sectionDiv.appendChild(createDynamicSection(section));
    } else {
      // Use innerHTML for static sections
      sectionDiv.innerHTML = generateStaticSectionHTML(section);
    }

    menuElement.appendChild(sectionDiv);
  });
}

function getDrawerSections() {
  return [
    {
      items: getSectionOneItems(),
      id: "",
      title: "",
      isDynamic: true,
    },
    {
      items: getSectionTwoItems(),
      id: "",
      title: "",
      isDynamic: false,
    },
    {
      items: getChannelItems(),
      id: "drawer-channels",
      title: "Favorite Channels", // Changed title
      isDynamic: true,
    },
    {
      items: getTagItems(),
      id: "drawer-tags",
      title: "My Tags",
      isDynamic: true,
    },
    {
      items: getAppPageItems(),
      id: "drawer-app-pages",
      title: "More",
      isDynamic: false,
    },
  ];
}

function createDynamicSection(section) {
  const container = document.createElement("div");
  container.className = "drawer-section-content";
  if (section.id) container.id = section.id;

  // Add title if present
  if (section.title) {
    const titleDiv = document.createElement("div");
    titleDiv.className = "drawer-section-title collapsible-title";
    titleDiv.textContent = section.title;
    titleDiv.setAttribute("data-collapsed", "false");
    container.appendChild(titleDiv);

    // Add click handler for collapsible functionality
    titleDiv.addEventListener("click", () => {
      const isCollapsed = titleDiv.getAttribute("data-collapsed") === "true";
      const itemsContainer = container.querySelector(".drawer-items-container");

      if (isCollapsed) {
        itemsContainer.style.display = "block";
        titleDiv.setAttribute("data-collapsed", "false");
        titleDiv.classList.remove("collapsed");
      } else {
        itemsContainer.style.display = "none";
        titleDiv.setAttribute("data-collapsed", "true");
        titleDiv.classList.add("collapsed");
      }
    });
  }

  // Create items container
  const itemsContainer = document.createElement("div");
  itemsContainer.className = "drawer-items-container";

  // Create items programmatically
  section.items.forEach((item) => {
    const itemDiv = createDrawerItem(item);
    itemsContainer.appendChild(itemDiv);
  });

  container.appendChild(itemsContainer);
  return container;
}

function createDrawerItem(item) {
  const itemDiv = document.createElement("div");
  const isActive = determineItemActiveState(item);

  // Add user-tag class if it's a user-created tag
  const userTagClass = item.isUserTag ? "user-tag" : "";

  itemDiv.className = `drawer-item ${isActive ? "active" : ""} ${
    item.type ? `drawer-${item.type}` : ""
  } ${userTagClass}`;
  itemDiv.setAttribute("data-id", item.id);

  if (item.customContent) {
    itemDiv.innerHTML = item.customContent;
  } else {
    // Create standard item structure
    const iconSpan = document.createElement("span");
    iconSpan.className = "drawer-icon";
    iconSpan.textContent = item.icon;

    const textSpan = document.createElement("span");
    textSpan.className = "drawer-text";
    textSpan.textContent = item.text;

    itemDiv.appendChild(iconSpan);
    itemDiv.appendChild(textSpan);
  }

  return itemDiv;
}

function generateStaticSectionHTML(section) {
  const itemsHTML = section.items
    .map((item) => {
      const isActive = item.id === app.currentPage;
      return `
        <div class="drawer-item ${isActive ? "active" : ""}" data-id="${
        item.id
      }">
          <span class="drawer-icon">${item.icon}</span>
          <span class="drawer-text">${item.text}</span>
        </div>
      `;
    })
    .join("");

  return `
    <div class="drawer-section-content" ${
      section.id ? `id="${section.id}"` : ""
    }>
      ${
        section.title
          ? `<div class="drawer-section-title">${section.title}</div>`
          : ""
      }
      ${itemsHTML}
    </div>
  `;
}

// Data functions - first two sections remain the same
function getSectionOneItems() {
  const profileText = app.isLoggedIn
    ? `${app.myNpub.substring(0, 7)}...`
    : "Log In";
  const profileContent = `<span class="drawer-icon">🪪</span><span class="drawer-text">${profileText}</span>`;

  return [
    { id: "home", icon: "🏠", text: `${app.activeRelayList.substring(0, 13)}` },
    { id: "playlists", icon: "📑", text: "Playlists" },
    { id: "network", icon: "📡", text: "Network" },
    { id: "followsfeed", icon: "✨", text: "Subscriptions" },
    { id: "profile", customContent: profileContent },
  ];
}

function getSectionTwoItems() {
  return [
    { id: "saved", icon: "🔖", text: "Bookmarks" },
    { id: "bookmarkedplaylists", icon: "🔖", text: "Playlist Bookmarks" },
    { id: "localfollows", icon: "📺", text: "Following" },
    { id: "localplaylists", icon: "📒", text: "Local Playlists" },
    { id: "liked", icon: "👍", text: "liked" },
    { id: "history", icon: "👍", text: "history" },
    { id: "historyplaylists", icon: "👍", text: "playlist history" },
    { id: "kind1follows", icon: "🫂", text: "kind:3" },
  //  { id: "singlerelay", icon: "🔭", text: "Relay" },    
  //  { id: "tag", icon: "🧩", text: "tags" },
  //  { id: "contact", icon: "💬", text: "Help" },
  ];
}

function getTagItems() {
  // Get all tags from localStorage (includes both static and user-added)
  function getAllTags() {
    try {
      const allTags = localStorage.getItem("allTags");
      return allTags ? JSON.parse(allTags) : [];
    } catch (error) {
      console.error("Error loading tags from localStorage:", error);
      return [];
    }
  }

  const allTags = getAllTags();

  // Show ALL tags
  return allTags.map((tag) => ({
    id: `tag-${tag.value}`,
    icon: getTagIcon(tag.value),
    text: tag.displayName,
    type: "tag",
    tagValue: tag.value,
    isUserTag: !tag.isStatic, // User tags are those that are NOT static
  }));
}

function getChannelItems() {
  const favoritePubkeys = getFavoriteChannelPubkeys();

  if (favoritePubkeys.length === 0) {
    return [
      {
        id: "no-favorites",
        icon: "☆",
        text: "No favorites yet",
        type: "info",
        disabled: true,
      },
    ];
  }

  return favoritePubkeys.map((pubkey) => {
    const npub = window.NostrTools.nip19.npubEncode(pubkey);
    return {
      id: `favorite-${pubkey}`,
      icon: "★",
      // Instead of text, use customContent with the nostr-name component
      customContent: `<span class="drawer-icon">★</span><nostr-name pubkey="${npub}"></nostr-name>`,
      type: "favorite-channel",
      pubkey: pubkey,
    };
  });
}

function getAppPageItems() {
  const appPageCategories = config.appPages.find((cat) => cat.title === "App");
  if (!appPageCategories) return [];

  return appPageCategories.items.map((page) => ({
    id: page.name,
    icon: page.icon,
    text: page.displayName,
    type: "app-page",
  }));
}

// Helper function to assign icons to tags
function getTagIcon(tagName) {
  const iconMap = {
    music: "🎵",
    gaming: "🎮",
    news: "📰",
    cooking: "🍳",
    art: "🎨",
    education: "📚",
    crafts: "✂️",
    fitness: "💪",
    vehicles: "🚗",
    entertainment: "🎭",
    pets: "🐾",
    movies: "🎬",
    "tv-shows": "📺",
    comedy: "😂",
    sports: "⚽",
    vlogging: "📹",
    dance: "💃",
    fashion: "👗",
    beauty: "💄",
    politics: "🏛️",
    science: "🔬",
    technology: "💻",
    tutorials: "📖",
    "how-to": "🔧",
    documentaries: "🎞️",
    history: "📜",
    travel: "✈️",
    health: "🏥",
    parenting: "👶",
    "home-decor": "🏠",
    diy: "🔨",
    automotive: "🔧",
    outdoors: "🏕️",
    bitcoin: "₿",
  };

  // Return specific icon if found, otherwise return generic tag icon
  return iconMap[tagName] || "🏷️";
}

function determineItemActiveState(item) {
  if (item.id === "profile") {
    const isProfilePage = app.currentPage === "profile";
    const hash = window.location.hash;
    const isViewingOwnProfile =
      hash.startsWith("#profile/") &&
      (hash.includes(app.myPk) || hash.includes(app.myNpub));
    return isProfilePage && isViewingOwnProfile;
  }

  // Handle tag active state
  if (item.type === "tag") {
    const hash = window.location.hash;
    if (hash.startsWith("#tag/params?")) {
      const queryStart = hash.indexOf("?");
      const queryString = queryStart !== -1 ? hash.slice(queryStart + 1) : "";
      const params = new URLSearchParams(queryString);
      const selectedTags = params.get("tags")
        ? params
            .get("tags")
            .split(",")
            .map((tag) => tag.trim())
        : [];
      return selectedTags.includes(item.tagValue);
    }
    return false;
  }

  return item.id === app.currentPage;
}
