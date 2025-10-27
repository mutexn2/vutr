const PROFILE_LOAD_TIMEOUT = 5000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

async function profilePageHandler() {
  mainContent.innerHTML = `
  <div id="profilePage-container">
    <div class="loading-indicator">
        <p>Loading profile...</p>
    </div>
  </div>
  `;

  let profilePageContainer = document.getElementById("profilePage-container");

  try {

    const profileParam = window.location.hash.split("/")[1];

    if (!profileParam) {
      window.location.hash = "#";
      return;
    }

    const profile = await decodeProfileParam(profileParam);

    if (!profile) {
        profilePageContainer.innerHTML = `
    <div class="error-container">
      <h1>Invalid Profile</h1>
      <p>The profile ID you're trying to view is invalid or couldn't be decoded.</p>
      <a href="#" class="nav-link">Return to Home</a>
    </div>
  `;
      return;
    }

    // Load profile with timeout and retry logic
    const { kindZero, extendedRelays } = await loadProfileWithRetry(profile);

    if (!kindZero || !kindZero.content) {
      throw new Error("Profile data not found or incomplete");
    }

    const kindZeroContent = JSON.parse(kindZero.content);
    const profileNpub = getProfileNpub(profile);

    console.log("profileNpub:", profileNpub);

    // Render the complete profile page
  profilePageContainer.innerHTML = `
    <div class="profile-container" data-extended-relays='${JSON.stringify(extendedRelays)}'>
      ${app.myPk === profile ? '<div class="settings-section"></div>' : ''}
      <div class="profile-page">
        <div class="profile-banner">
          <img class="banner-image" alt="Banner">
        </div>
        <div class="profile-header">
          <div class="profile-picture">
            <img class="avatar" alt="Profile Picture">
          </div>
          <div class="profile-info">
            <h1 class="display-name"></h1>
            <p class="username"></p>
            <div class="about"></div>
            <div class="profile-links"></div>
          </div>
        </div>
      </div>
      
      <div class="profile-technical-info">
        <button class="technical-info-toggle">
          <span class="toggle-text">Show keys and relay hints</span>
          <span class="toggle-arrow">▼</span>
        </button>
        <div class="technical-info-content">
          <div class="profile-identifiers">
            <div class="identifier-item">
              <span class="identifier-label">npub:</span>
              <span class="identifier-value npub-value"></span>
              <button class="copy-btn" data-copy-type="npub">📋</button>
            </div>
            <div class="identifier-item">
              <span class="identifier-label">pubkey:</span>
              <span class="identifier-value pubkey-value"></span>
              <button class="copy-btn" data-copy-type="pubkey">📋</button>
            </div>
          </div>
          <div class="relay-hints-section">
            <h4>Relay Hints</h4>
            <div class="relay-hints-list"></div>
          </div>
        </div>
      </div>
      
<div class="profile-tabs">
  <div class="tab-scroll-container">
    <button class="profile-tab-button active" data-tab="videos">Videos</button>
    <button class="profile-tab-button" data-tab="extended-videos">Videos (Extended)</button>
    <button class="profile-tab-button" data-tab="playlists">Playlists</button>
    <button class="profile-tab-button" data-tab="relay-sets">Relay Sets</button>
    <button class="profile-tab-button" data-tab="posts">Posts</button>
  <!--  <button class="profile-tab-button" data-tab="media-servers">media servers</button> -->
  </div>
</div>

<div class="profile-tab-content">
  <div id="videos-tab" class="profile-tab-panel active">
    <div id="channelVideos">
      <h1>searching for videos</h1>
      <p>kind-21,22 video events</p>
    </div>
  </div>
  
  <div id="extended-videos-tab" class="profile-tab-panel">
    <div id="extendedChannelVideos">
      <h1>Extended video search</h1>
      <p>Searching across all discovered relays...</p>
    </div>
  </div>

  <div id="playlists-tab" class="profile-tab-panel">
    <div class="tab-placeholder">
      <h1>Playlists</h1>
      <p>Coming soon...</p>
    </div>
  </div>

  <div id="relay-sets-tab" class="profile-tab-panel">
    <div class="tab-placeholder">
      <h1>Relay Sets</h1>
      <p>Coming soon...</p>
    </div>
  </div>

  <div id="posts-tab" class="profile-tab-panel">
    <div class="tab-placeholder">
      <h1>Posts</h1>
      <p>Coming soon...</p>
    </div>
  </div>

  <div id="media-servers-tab" class="profile-tab-panel">
    <div class="tab-placeholder">
      <h1>Media Servers</h1>
      <p>...</p>
    </div>
  </div>
</div>
    </div>
  `;

  // Populate all data after DOM is ready
  populateProfileData(kindZeroContent, profile, profileNpub);

    // Setup all event listeners
    setupAllProfileEventListeners(profile, kindZeroContent, extendedRelays);

    // Load videos asynchronously
    loadProfileVideos(profile).catch((error) => {
      console.error("Error loading profile videos:", error);
      handleVideoLoadError();
    });
  } catch (error) {
    console.error("Error rendering profile page:", error);
      const errorMessage = error.message || "Unknown error occurred";
  profilePageContainer.innerHTML = `
    <div class="error-container">
      <h1>Profile Load Error</h1>
      <p>Failed to load profile: ${errorMessage}</p>
      <button class="retry-button">Retry</button>
      <a href="#" class="nav-link">Return to Home</a>
    </div>
  `;

  // Add event listener programmatically
  const retryButton = document.querySelector(".retry-button");
  if (retryButton) {
    retryButton.addEventListener("click", () => window.location.reload());
  }
  }
}

// New helper function to load profile with retry logic
async function loadProfileWithRetry(profile, attempts = 0) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Profile load timeout")),
        PROFILE_LOAD_TIMEOUT
      );
    });

    const loadPromise = Promise.all([
      NostrClient.getProfile(profile),
      getExtendedRelaysForProfile(profile),
    ]);

    const [kindZero, extendedRelays] = await Promise.race([
      loadPromise,
      timeoutPromise,
    ]);

    return { kindZero, extendedRelays };
  } catch (error) {
    if (attempts < RETRY_ATTEMPTS) {
      console.warn(
        `Profile load attempt ${attempts + 1} failed, retrying...`,
        error
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return loadProfileWithRetry(profile, attempts + 1);
    }
    throw error;
  }
}



// Consolidated event listener setup
function setupAllProfileEventListeners(profile, kindZeroContent, extendedRelays) {
  // Setup profile click handler for video navigation
  const profileContainer = document.querySelector(".profile-container");
  if (profileContainer) {
    profileContainer.addEventListener("click", handleProfileClicks);
  }

  // Setup tab event listeners
  setupTabEventListeners(profile, extendedRelays);

  // Setup technical info event listeners
  setupTechnicalInfoEventListeners();

  setTimeout(() => {
    const tabScrollContainer = document.querySelector(".tab-scroll-container");
  enableDragScroll(tabScrollContainer);
  enableWheelScroll(tabScrollContainer);
  }, 100);
}

function decodeProfileParam(profileParam) {
  if (!profileParam) return null;

  let profile = null;

  if (profileParam.startsWith("npub") || profileParam.startsWith("nprofile")) {
    try {
      const decoded = window.NostrTools.nip19.decode(profileParam);
      if (decoded.type === "npub") {
        profile = decoded.data;
      } else if (decoded.type === "nprofile") {
        profile = decoded.data.pubkey;
      }
    } catch (decodeError) {
      console.error("Failed to decode Nostr identifier:", decodeError);
      return null;
    }
  } else if (profileParam.length === 64 && /^[0-9a-f]+$/i.test(profileParam)) {
    profile = profileParam;
  }

  return profile;
}


function getProfileNpub(profile) {
  try {
    return window.NostrTools.nip19.npubEncode(profile);
  } catch (error) {
    console.error("Failed to encode npub:", error);
    return profile; // fallback to raw pubkey
  }
}

// Unified profile data population
function populateProfileData(kindZeroContent, profile, profileNpub) {
  try {
    // Set banner image with fallback
    const bannerImg = document.querySelector(".banner-image");
    if (bannerImg) {
      bannerImg.src =
        kindZeroContent.banner ||
        "https://cdn.nostrcheck.me/a605827e09ea5be22a06ac2ec7e2be3985cac6b0322f7621881adbe21a7d7fb6.jpeg";
      bannerImg.onerror = () => {
        bannerImg.src =
          "https://cdn.nostrcheck.me/a605827e09ea5be22a06ac2ec7e2be3985cac6b0322f7621881adbe21a7d7fb6.jpeg";
      };
    }

    // Set profile picture with fallback
    const avatar = document.querySelector(".avatar");
    if (avatar) {
      avatar.src = kindZeroContent.picture || "";
      avatar.onerror = () => {
        avatar.style.display = "none";
      };
    }

    // Set text content safely
    const displayName = document.querySelector(".display-name");
    if (displayName) {
      displayName.textContent =
        kindZeroContent.display_name || kindZeroContent.name || "Unknown";
    }

    const username = document.querySelector(".username");
    if (username) {
      username.textContent = kindZeroContent.name || "";
    }

    const about = document.querySelector(".about");
if (about) {
  const content = kindZeroContent.about || "No description provided.";
  const processedContent = processMessageContent(content);
  
  // Clear existing content and append the processed div
  about.innerHTML = '';
  about.appendChild(processedContent);
}


  createProfileLinks(kindZeroContent, profile, profile);
    createEditButton(profile, kindZeroContent);
    
    populateTechnicalInfo(profile, profileNpub);
  } catch (error) {
    console.error("Error populating profile data:", error);
  }
}

// NIP-05 verification function - modified to return more detailed result
async function verifyNip05(nip05, pubkey) {
  try {
    // Split the identifier into local-part and domain
    const [localPart, domain] = nip05.split('@');
    if (!localPart || !domain) {
      return { verified: false, corsError: false };
    }
    // Make GET request to the well-known endpoint
    const response = await fetch(`https://${domain}/.well-known/nostr.json?name=${localPart}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) {
      return { verified: false, corsError: false };
    }
    const data = await response.json();
    
    // Check if the names object exists and contains the local part
    if (!data.names || !data.names[localPart]) {
      return { verified: false, corsError: false };
    }
    // Verify that the public key matches
    return { verified: data.names[localPart] === pubkey, corsError: false };
  } catch (error) {
    console.warn('NIP-05 verification failed:', error);
    // Check if it's likely a CORS error
    const isCorsError = error.name === 'TypeError' && error.message.includes('fetch');
    return { verified: false, corsError: isCorsError };
  }
}

// Helper function to create the CORS test URL
function createCorsTestUrl(nip05) {
  const [localPart, domain] = nip05.split('@');
  const wellKnownUrl = `https://${domain}/.well-known/nostr.json?name=${localPart.toLowerCase()}`;
  return `https://cors-test.codehappy.dev/?url=${encodeURIComponent(wellKnownUrl)}&method=get`;
}

async function createProfileLinks(kindZeroContent, pubkey, profile) {
  const linksContainer = document.querySelector(".profile-links");
  if (!linksContainer) return;
  
  // Clear existing content
  linksContainer.innerHTML = '';
  
  // Create main row container
  const linksRow = document.createElement('div');
  linksRow.className = 'profile-links-row';
  
  const links = [];
  
  // Follow button
  const followBtn = createProfileButton({
    icon: '👥', // Will be replaced with SVG
    text: isProfileFollowed(profile) ? "Following" : "Follow",
    className: isProfileFollowed(profile) ? "profile-btn following" : "profile-btn",
    onClick: () => handleFollowClick(followBtn, profile)
  });
  links.push(followBtn);
  
  // Website link
  if (kindZeroContent.website) {
    const websiteBtn = createProfileButton({
      icon: '🌐',
      text: "Website",
      className: "profile-btn",
      href: kindZeroContent.website,
      isExternal: true
    });
    links.push(websiteBtn);
  }
  
  // NIP-05 verification
  if (kindZeroContent.nip05) {
    const nip05Btn = createProfileButton({
      icon: '⏳',
      text: kindZeroContent.nip05,
      className: "profile-btn nip05-btn pending",
      isVerification: true
    });
    links.push(nip05Btn);
    
    // Verify in background
    verifyNip05(kindZeroContent.nip05, pubkey).then(result => {
      updateNip05Button(nip05Btn, result, kindZeroContent.nip05);
    });
  }
  
// Lightning address
function truncateText(text, maxLength = 40) {
  if (text.length <= maxLength) {
    return text;
  }
  const charsToShow = 13;
  return `${text.substring(0, charsToShow)}...${text.substring(text.length - charsToShow)}`;
}

if (kindZeroContent.lud16) {
  const lightningBtn = createProfileButton({
    icon: '⚡',
    text: truncateText(kindZeroContent.lud16, 40), // Display truncated version
    className: "profile-btn lightning-btn",
    onClick: () => handleLightningClick(kindZeroContent.lud16) // Still uses full address
  });
  links.push(lightningBtn);
}
  
  // Share profile link
  const shareBtn = createProfileButton({
    icon: '📋',
    text: "Copy Link",
    className: "profile-btn share-btn",
    onClick: () => handleShareClick()
  });
  links.push(shareBtn);
  
  // Add all buttons to row
  links.forEach(btn => linksRow.appendChild(btn));
  linksContainer.appendChild(linksRow);
}


// Unified button creation function
function createProfileButton({ icon, text, className, href = null, isExternal = false, isVerification = false, onClick = null }) {
  const button = document.createElement(href ? 'a' : 'button');
  button.className = className;
  
  // Create icon container (ready for SVG replacement)
  const iconContainer = document.createElement('span');
  iconContainer.className = 'profile-btn-icon';
  
  // For now use emoji, but structure is ready for SVG
  if (typeof icon === 'string') {
    iconContainer.textContent = icon;
  } else {
    // When you pass SVG element instead of emoji string
    iconContainer.appendChild(icon);
  }
  
  // Create text container
  const textContainer = document.createElement('span');
  textContainer.className = 'profile-btn-text';
  textContainer.textContent = text;
  
  button.appendChild(iconContainer);
  button.appendChild(textContainer);
  
  // Handle external links
  if (href && isExternal) {
    button.href = href;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
  }
  
  // Handle click events
  if (onClick) {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
  }
  
  return button;
}

// Helper function to create SVG icon (placeholder)
function createSvgIcon(type) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "currentColor");
  svg.classList.add('profile-icon');
  
  // Placeholder circle - replace with actual icon paths
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "8");
  circle.setAttribute("cy", "8");
  circle.setAttribute("r", "6");
  svg.appendChild(circle);
  
  return svg;
}

// Handle follow button click
function handleFollowClick(button, profile) {
  const currentlyFollowed = isProfileFollowed(profile);
  let success;
  
  if (currentlyFollowed) {
    success = removeFollowedPubkey(profile);
    if (success) {
      removeFavoriteChannel(profile);
      updateDrawerContent();
    }
  } else {
    success = addFollowedPubkey(profile);
  }
  
  if (success) {
    const textContainer = button.querySelector('.profile-btn-text');
    textContainer.textContent = currentlyFollowed ? "Follow" : "Following";
    button.classList.toggle("following", !currentlyFollowed);
    showTemporaryNotification(
      currentlyFollowed ? "Unfollowed (local)" : "Followed (local)"
    );
  }
}

// Update NIP-05 button after verification
function updateNip05Button(button, result, nip05Text) {
  const iconContainer = button.querySelector('.profile-btn-icon');
  const textContainer = button.querySelector('.profile-btn-text');
  
  button.classList.remove('pending');
  
  if (result.verified) {
    iconContainer.textContent = "✅";
    button.classList.add('verified');
    textContainer.title = "NIP-05 verified";
  } else {
    iconContainer.textContent = "❌";
    button.classList.add('failed');
    textContainer.title = "NIP-05 verification failed";
    
    if (result.corsError) {
      const corsNotice = document.createElement('div');
      corsNotice.className = 'cors-notice';
      corsNotice.textContent = 'Unable to verify due to CORS';
      
      const testButton = document.createElement('button');
      testButton.className = 'cors-test-btn';
      testButton.textContent = 'Test';
      testButton.onclick = (e) => {
        e.stopPropagation();
        window.open(createCorsTestUrl(nip05Text), '_blank');
      };
      
      button.appendChild(corsNotice);
      button.appendChild(testButton);
    }
  }
}

// Handle lightning button click
function handleLightningClick(lud16) {
  openQrModal({
    title: "Lightning Address QR Code",
    contentType: "direct-text",
    initialText: lud16,
    generateImmediately: true,
    size: "medium",
  });
}

// Handle share button click
function handleShareClick() {
  openQrModal({
    title: "Profile QR Code",
    contentType: "direct-text",
    initialText: window.location.href,
    generateImmediately: true,
    size: "medium",
  });
}

function createEditButton(profile, kindZeroContent) {
//  console.log("🔧 createEditButton called for profile:", profile);
//  console.log("🔧 Current app.myPk:", app.myPk);

  const checkAndCreateButton = () => {
  //  console.log("🔍 app.myPk:", app.myPk);
  //  console.log("🔍 profile:", profile);
    console.log("🔍 my profile:", app.myPk === profile);
    
    if (app.myPk && app.myPk === profile) {
      // First, make sure we're still on the right profile page
      const currentHash = window.location.hash;
      if (!currentHash.includes('#profile/')) {
        console.log("❌ No longer on profile page");
        return false;
      }
      
      // Look for settings section
      let settingsSection = document.querySelector(".settings-section");
    //  console.log("🔍 Settings section found:", !!settingsSection);
      
      // If settings section doesn't exist, try to recreate it
      if (!settingsSection) {
      //  console.log("🔧 Settings section missing, trying to recreate...");
        
        // Find the profile container
        const profileContainer = document.querySelector(".profile-container");
        if (profileContainer) {
          // Check if settings section should exist (when myPk matches profile)
          const existingSettingsSection = profileContainer.querySelector(".settings-section");
          if (!existingSettingsSection) {
            // Create the settings section
            const newSettingsSection = document.createElement("div");
            newSettingsSection.className = "settings-section";
            
            // Insert it at the beginning of profile container
            profileContainer.insertBefore(newSettingsSection, profileContainer.firstChild);
            settingsSection = newSettingsSection;
          //  console.log("🔧 Created new settings section");
          }
        }
      }
      
      if (settingsSection && !settingsSection.querySelector(".edit-profile-button")) {
      //  console.log("✅ Creating edit button!");
        
        const editBtn = document.createElement("button");
        editBtn.className = "edit-profile-button";
        editBtn.textContent = "🛠️ edit";

        editBtn.addEventListener("click", () => {
          app.currentEditingProfile = {
            pubkey: profile,
            profileData: kindZeroContent,
          };
          window.location.hash = "#editprofile";
        });

        settingsSection.appendChild(editBtn);
        return true;
      } else {
        console.log("❌ Settings section not found or button already exists");
      }
    } else {
    //  console.log("❌ No match - myPk:", app.myPk, "profile:", profile);
    }
    return false;
  };

  // Try immediately
  if (checkAndCreateButton()) {
    return;
  }

  // If failed, wait for login
//  console.log("⏳ Starting interval to wait for login...");
  let attemptCount = 0;
  
  const checkInterval = setInterval(() => {
    attemptCount++;
  //  console.log(`⏳ Attempt ${attemptCount} - app.myPk:`, app.myPk);
    
    if (app.myPk !== null) {
    // console.log("🎉 Login detected! Attempting to create button...");
      clearInterval(checkInterval);
      checkAndCreateButton();
    }
    
    // Also check if we're still on the right page
    if (!window.location.hash.includes('#profile/')) {
      console.log("🚪 Left profile page, stopping checks");
      clearInterval(checkInterval);
    }
  }, 500);

  // Stop checking after 10 seconds
  setTimeout(() => {
  //  console.log("⏰ Timeout reached, stopping button creation attempts");
    clearInterval(checkInterval);
  }, 10000);
}
function handleProfileClicks(event) {
  const target = event.target;
  const card = target.closest(".video-card");

  if (!card || !card.dataset.videoId) return;

  try {
    // Determine active tab
    const activeTab = document.querySelector(".profile-tab-button.active");
    const isExtendedTab = activeTab?.dataset.tab === "extended-videos";

    let watchUrl;

    if (isExtendedTab) {
      // For extended tab: use author parameter instead of discovery
      const profileParam = window.location.hash.split("/")[1];
      const profile = decodeProfileParam(profileParam);
      
      watchUrl = `#watch/params?v=${card.dataset.videoId}&author=${profile}`;
    } else {
      // For default tab: use discovery relays as before
      const profileContainer = document.querySelector(".profile-container");
      let extendedRelays = [];

      if (profileContainer?.dataset.extendedRelays) {
        try {
          extendedRelays = JSON.parse(profileContainer.dataset.extendedRelays);
        } catch (e) {
          console.warn("Could not parse extended relays from DOM:", e);
        }
      }

      const discoveryRelays = buildDiscoveryRelays(false, extendedRelays);
      const discoveryParam = discoveryRelays.join(",");
      watchUrl = `#watch/params?v=${card.dataset.videoId}&discovery=${discoveryParam}`;
    }

    console.log("Navigating to watch URL:", watchUrl);
    window.location.hash = watchUrl;
  } catch (error) {
    console.error("Error handling profile click:", error);
  }
}

// Helper function to build discovery relays
function buildDiscoveryRelays(isExtendedTab, extendedRelays) {
  let discoveryRelays = [];

  if (isExtendedTab) {
    // For extended tab: combine active and extended relays
    const activeRelays = app.relays.slice(0, 2).map(cleanRelayUrl);
    discoveryRelays.push(...activeRelays);

    const extendedRelaysClean = extendedRelays.map(cleanRelayUrl);
    const activeRelaysClean = app.relays.map(cleanRelayUrl);
    const uniqueExtended = extendedRelaysClean.filter(
      (relay) => !activeRelaysClean.includes(relay)
    );
    discoveryRelays.push(...uniqueExtended.slice(0, 2));
  } else {
    // For default tab: use active relays only
    discoveryRelays = app.relays.slice(0, 2).map(cleanRelayUrl);
  }

  return [...new Set(discoveryRelays)];
}



function handleVideoLoadError() {
  const videosContent = document.getElementById("channelVideos");
  if (videosContent) {
    videosContent.innerHTML = `
      <h1>Error Loading Videos</h1>
      <p>Failed to load videos for this profile.</p>
      <button class="retry-button">Retry</button>
    `;

    // Add event listener programmatically
    const retryButton = videosContent.querySelector(".retry-button");
    if (retryButton) {
      retryButton.addEventListener("click", () => {
        const profileParam = window.location.hash.split("/")[1];
        const profile = decodeProfileParam(profileParam);
        if (profile) {
          loadProfileVideos(profile);
        }
      });
    }
  }
}


async function loadProfileVideos(profile) {
  try {
    const kinds = [21];
    const limit = 40;

    const channelVideos = await fetchAndProcessVideos(profile, kinds, limit);

    if (channelVideos.length === 0) {
      renderNoVideosFound();
      return;
    }

    channelVideos.sort((a, b) => b.created_at - a.created_at);

    setTimeout(() => {
      renderProfileVideos(channelVideos);
    }, 1000);

    // Add lightning button after a delay
    setTimeout(() => {
      addLightningButtonToProfile();
    }, 1500);
  } catch (error) {
    console.error("Error loading profile videos:", error);
    handleVideoLoadError();
  }
}

// Helper function to fetch and process videos
async function fetchAndProcessVideos(profile, kinds, limit) {
  const channelVideos = await NostrClient.getEvents({
    kinds: kinds,
    limit: limit,
    author: profile,
  });

  const processedVideos = channelVideos
    .map(sanitizeNostrEvent)
    .filter((v) => v !== null);

  console.log(
    "Active relay search results:",
    processedVideos.length,
    "videos found"
  );
  return processedVideos;
}

function renderNoVideosFound() {
  const videosContent = document.getElementById("channelVideos");
  if (videosContent) {
    videosContent.innerHTML = `
      <h1>No Videos Found</h1>
      <p>No kind-21 video events were found on the active relays.</p>
    `;
  }
}

function addLightningButtonToProfile() {
  const profileLinks = document.querySelector(".profile-links");
  if (profileLinks) {
    profileLinks.appendChild(createLightningButton("profile-links"));
  }
}

function renderProfileVideos(channelVideos) {
  const videosContent = document.getElementById("channelVideos");
  if (!videosContent) return;

  videosContent.innerHTML = `
    <h1>published videos</h1>
    <p>Found ${channelVideos.length} videos on active relays</p>
    <div class="videos-grid"></div>
  `;

  const videosGrid = videosContent.querySelector(".videos-grid");
  if (videosGrid) {
    channelVideos.forEach((video) => {
      const card = createVideoCard(video);
      videosGrid.appendChild(card);
    });
  }
}

async function getExtendedRelaysForProfile(pk) {
  try {
    const staticRelays = [
      "wss://relay.nostr.band",
      "wss://nos.lol",
      "wss://nostr.mom",
    ];

    let topRelayHints = [];
    try {
      const hints = window.NostrGadgets?.global?.hints;
      if (hints) {
        topRelayHints = await hints.topN(pk, 7);
//        console.log("🌟 Top Relay Hints:", 
//          topRelayHints.map(relay => `\n  - ${relay}`).join('')
//        );
      }
    } catch (error) {
      console.warn("❌ Failed to get relay hints for profile:", error);
    }

    const normalizeUrl = (url) => {
      try {
        return url.toLowerCase().replace(/\/+$/, "");
      } catch (e) {
        return url;
      }
    };

    const allRelays = [
      ...topRelayHints.map(normalizeUrl),
      ...NostrClient.relays.map(normalizeUrl),
      ...staticRelays.map(normalizeUrl),
    ];

//    console.log("📡 All Relays:", 
//      allRelays.map(relay => `\n  - ${relay}`).join('')
//    );

    const combinedRelays = [...new Set(allRelays)];
//    console.log(`🔗 Extended Relays for Profile (${combinedRelays.length}):`, 
//      combinedRelays.map(relay => `\n  - ${relay}`).join('')
//    );

    return combinedRelays;
  } catch (error) {
    console.error("❌ Error getting extended relays:", error);
    return NostrClient.relays;
  }
}

function setupTabEventListeners(profile, extendedRelays) {
  
  const tabButtons = document.querySelectorAll(".profile-tab-button");
  const tabPanels = document.querySelectorAll(".profile-tab-panel");

  tabButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const tabName = button.dataset.tab;

      // Update active states
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanels.forEach((panel) => panel.classList.remove("active"));

      button.classList.add("active");
      const targetPanel = document.getElementById(`${tabName}-tab`);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }

      // Handle tab-specific logic
      switch (tabName) {
        case "extended-videos":
          try {
            await loadExtendedProfileVideos(profile, extendedRelays);
          } catch (error) {
            console.error("Error loading extended videos:", error);
          }
          break;
        case "playlists":
          // Future: Load playlists
          console.log("Playlists tab selected");
          break;
        case "relay-sets":
          // Future: Load relay sets
          console.log("Relay sets tab selected");
          break;
        case "posts":
          // Future: Load posts
          console.log("Posts tab selected");
          break;
        case "media-servers":
          // Future: Load media servers content
          console.log("Media servers tab selected");
          break;
      }



      // Scroll the active button into view (useful for mobile)
      button.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    });
  });
}

async function loadExtendedProfileVideos(profile, extendedRelays) {
  const extendedVideosContent = document.getElementById(
    "extendedChannelVideos"
  );
  if (!extendedVideosContent) return;

  // Check if already loaded
  if (extendedVideosContent.dataset.loaded === "true") {
    return;
  }

  try {
    extendedVideosContent.innerHTML = `
      <h1>searching extended relays...</h1>
      <p>Querying ${extendedRelays.length} relays for kind-21 events</p>
    `;

    const kinds = [21];
    const limit = 40;

    const channelVideos = await fetchAndProcessExtendedVideos(
      profile,
      extendedRelays,
      kinds,
      limit
    );

    if (channelVideos.length === 0) {
      renderNoExtendedVideosFound(extendedVideosContent);
      return;
    }

    channelVideos.sort((a, b) => b.created_at - a.created_at);

    setTimeout(() => {
      renderExtendedProfileVideos(channelVideos);
      extendedVideosContent.dataset.loaded = "true";
    }, 1000);
  } catch (error) {
    console.error("Error loading extended profile videos:", error);
    renderExtendedVideosError(extendedVideosContent);
  }
}

// Helper function to fetch extended videos
async function fetchAndProcessExtendedVideos(
  profile,
  extendedRelays,
  kinds,
  limit
) {
  const channelVideos = await NostrClient.getEventsFromRelays(extendedRelays, {
    kinds: kinds,
    limit: limit,
    author: profile,
  });

  const processedVideos = channelVideos
    .map(sanitizeNostrEvent)
    .filter((v) => v !== null);

  console.log(
    "Extended search results:",
    processedVideos.length,
    "videos found"
  );
  return processedVideos;
}

function renderNoExtendedVideosFound(container) {
  container.innerHTML = `
    <h1>No Additional Videos Found</h1>
    <p>No additional kind-21 video events were found across the extended relay set.</p>
  `;
  container.dataset.loaded = "true";
}

function renderExtendedVideosError(container) {
  container.innerHTML = `
    <h1>Error Loading Extended Videos</h1>
    <p>Failed to load videos from extended relay search.</p>
  `;
}

function renderExtendedProfileVideos(channelVideos) {
  const videosContent = document.getElementById("extendedChannelVideos");
  if (!videosContent) return;

  videosContent.innerHTML = `
    <h1>extended search results</h1>
    <p>Found ${channelVideos.length} videos across all relays</p>
    <div class="videos-grid"></div>
  `;

  const videosGrid = videosContent.querySelector(".videos-grid");
  if (videosGrid) {
    channelVideos.forEach((video) => {
      const card = createVideoCard(video);
      videosGrid.appendChild(card);
    });
  }
}



// function to populate technical info section
async function populateTechnicalInfo(profile, profileNpub) {
  // Set profile identifiers
  const npubValue = document.querySelector(".npub-value");
  const pubkeyValue = document.querySelector(".pubkey-value");
  
  if (npubValue) npubValue.textContent = profileNpub;
  if (pubkeyValue) pubkeyValue.textContent = profile;

  // Get and populate relay hints
  try {
    const hints = window.NostrGadgets?.global?.hints;
    if (hints) {
      const topRelayHints = await hints.topN(profile, 11);
      populateRelayHints(topRelayHints);
    } else {
      hideRelayHintsSection();
    }
  } catch (error) {
    console.warn("Failed to get relay hints for profile:", error);
    hideRelayHintsSection();
  }
}

function populateRelayHints(relayHints) {
  const relayHintsList = document.querySelector(".relay-hints-list");
  const relayHintsSection = document.querySelector(".relay-hints-section");
  
  if (!relayHintsList || !relayHintsSection) return;
  if (relayHints && relayHints.length > 0) {
    relayHintsSection.style.display = "block";
    relayHintsList.innerHTML = "";
    
    relayHints.forEach(relay => {
      const relayButton = document.createElement("button"); // Create button instead of div
      relayButton.className = "relay-hint-item";
      relayButton.setAttribute("data-relay", relay);
      relayButton.type = "button"; // Explicitly set type
      
      relayButton.innerHTML = `
        <span class="relay-url">${relay}</span>
        <span>🡕</span>
      `;
      
      relayHintsList.appendChild(relayButton);
    });
  } else {
    hideRelayHintsSection();
  }
}


function hideRelayHintsSection() {
  const relayHintsSection = document.querySelector(".relay-hints-section");
  if (relayHintsSection) {
    relayHintsSection.style.display = "none";
  }
}



function setupTechnicalInfoEventListeners() {
  // Toggle button event listener
  const toggleButton = document.querySelector(".technical-info-toggle");
  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      const content = document.querySelector(".technical-info-content");
      const arrow = document.querySelector(".toggle-arrow");
      const text = document.querySelector(".toggle-text");
      
      if (content && arrow && text) {
        const isExpanded = content.classList.contains("expanded");
        
        if (isExpanded) {
          content.classList.remove("expanded");
          arrow.textContent = "▼";
          text.textContent = "Show keys and relay hints";
        } else {
          content.classList.add("expanded");
          arrow.textContent = "▲";
          text.textContent = "Hide keys and relay hints";
        }
      }
    });
  }

  // Copy button event listeners
  const copyButtons = document.querySelectorAll('.copy-btn');
  
  copyButtons.forEach(button => {
    // Clone and replace to remove existing listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add direct event listener
    newButton.addEventListener('click', function(event) {
      event.preventDefault();
      
      const copyType = this.getAttribute('data-copy-type');
      let textToCopy = "";
      
      if (copyType === "npub") {
        textToCopy = document.querySelector(".npub-value")?.textContent || "";
      } else if (copyType === "pubkey") {
        textToCopy = document.querySelector(".pubkey-value")?.textContent || "";
      }
      
      if (textToCopy) {
        copyToClipboard(textToCopy, this);
      }
    });
  });

  // Relay button event listeners
document.addEventListener("click", (event) => {
  const relayItem = event.target.closest(".relay-hint-item");
  if (relayItem) {
    const relay = relayItem.getAttribute("data-relay");
    if (relay) {
      console.log("Relay clicked:", relay);
      const cleanUrl = relay.replace(/^(wss?:\/\/|https?:\/\/)/, '');
      window.location.hash = `#singlerelay/${cleanUrl}`;
    }
  }
});
}

