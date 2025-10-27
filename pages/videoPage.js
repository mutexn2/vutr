async function videoPageHandler() {
  // Parse the URL to extract videoId and optional parameters
  const urlParts = window.location.hash.split("/");
  let videoId = urlParts[1];
  let discoveryRelays = [];
  let authorPubkey = null;

  console.log("video ID:", videoId);

  if (!videoId) {
    window.location.hash = "#";
    return;
  }

  // Check if the videoId contains URL parameters (new format)
  if (videoId && videoId.includes("?")) {
    const [baseId, queryString] = videoId.split("?");

    // Manual parsing to handle URLs with protocols correctly
    const params = new Map();
    const pairs = queryString.split("&");

    for (const pair of pairs) {
      const equalIndex = pair.indexOf("=");
      if (equalIndex > 0) {
        const key = decodeURIComponent(pair.slice(0, equalIndex));
        const value = decodeURIComponent(pair.slice(equalIndex + 1));
        params.set(key, value);
      }
    }

    // Extract the actual video ID from 'v' parameter
    const vParam = params.get("v");
    if (vParam) {
      videoId = vParam;
    }

    // Extract discovery relays from 'discovery' parameter
    const discoveryParam = params.get("discovery");
    if (discoveryParam) {
      discoveryRelays = discoveryParam.split(",").map((relay) => relay.trim());
      console.log("Discovery relays found:", discoveryRelays);
    }

    // Extract author parameter
    const authorParam = params.get("author");
    if (authorParam) {
      authorPubkey = authorParam;
      console.log("Author pubkey found:", authorPubkey);
    }
  }

  // Handle nevent1 format
  if (videoId.startsWith("nevent1")) {
    try {
      let decoded = window.NostrTools.nip19.decode(videoId);
      if (decoded.type === "nevent") {
        videoId = decoded.data.id;
      }
    } catch (error) {
      showError(`Invalid video ID format: ${escapeHtml(error.message)}`);
      return;
    }
  }

  console.log("Final video ID:", videoId);
  if (discoveryRelays.length > 0) {
    console.log("Will use discovery relays:", discoveryRelays);
  }
  if (authorPubkey) {
    console.log("Will use author-based relay discovery for:", authorPubkey);
  }

  // Show loading state
  mainContent.innerHTML = `
  <div id="videoPage-container">
    <h1>Discovering Videos</h1>
    <div class="loading-indicator">
      <p>Loading video...</p>
    </div>
  </div>
`;
  let videoPageContainer = document.getElementById("videoPage-container");

  try {
    let video;

    if (authorPubkey) {
      // Use author-based relay discovery (same logic as profile page)
      console.log("Getting extended relays for author:", authorPubkey);
      const extendedRelays = await getExtendedRelaysForProfile(authorPubkey);

      video = await NostrClient.getEventsFromRelays(extendedRelays, {
        kinds: [21, 22],
        limit: 1,
        id: videoId,
      });
    } else if (discoveryRelays.length > 0) {
      // Use discovery relays if available (existing logic)
      const formattedDiscoveryRelays = discoveryRelays.map((relay) => {
        let cleanRelay = relay.trim();
        cleanRelay = cleanRelay.replace(/^wss?::\/\//, "wss://");
        if (cleanRelay.startsWith("wss://")) {
          cleanRelay = cleanRelay.slice(6);
        } else if (cleanRelay.startsWith("ws://")) {
          cleanRelay = cleanRelay.slice(5);
        }
        return `wss://${cleanRelay}`;
      });

      const appRelays = (app.relays || []).map((relay) => {
        let cleanRelay = relay.trim();
        cleanRelay = cleanRelay.replace(/^wss?::\/\//, "wss://");
        if (
          !cleanRelay.startsWith("ws://") &&
          !cleanRelay.startsWith("wss://")
        ) {
          cleanRelay = `wss://${cleanRelay}`;
        }
        return cleanRelay;
      });

      const allRelays = [
        ...new Set([...formattedDiscoveryRelays, ...appRelays]),
      ];
      console.log("Combined relay list:", allRelays);

      video = await NostrClient.getEventsFromRelays(allRelays, {
        kinds: [21, 22],
        limit: 1,
        id: videoId,
      });
    } else {
      // Use regular getEvents
      video = await NostrClient.getEvents({
        kinds: [21, 22],
        limit: 1,
        id: videoId,
      });
    }

    if (video) {
      video = sanitizeNostrEvent(video);
      console.log(JSON.stringify(video, null, 2));
      // console.log(JSON.parse(JSON.stringify(video)));
    }

    if (!video) {
      // Show "video not found" message with extensive search button
      videoPageContainer.innerHTML = `
        <div class="video-not-found">
          <h1>Video Not Found</h1>
          <p>The video with ID "${escapeHtml(videoId)}" was not found on the ${
        discoveryRelays.length > 0
          ? "discovery"
          : authorPubkey
          ? "author-based"
          : "connected"
      } relays.</p>
          <div class="not-found-actions">
            <button class="btn-primary extensive-search-btn">Try Extensive Search</button>
          </div>
        </div>
      `;

      const extensiveSearchBtn = videoPageContainer.querySelector(
        ".extensive-search-btn"
      );
      extensiveSearchBtn?.addEventListener("click", async () => {
        console.log("Extensive search clicked for video ID:", videoId);
        let staticRelays = ["relay.nostr.band", "nos.lol", "nostr.mom"];
        const watchUrl = `#watch/params?v=${videoId}&discovery=${staticRelays}`;
        console.log("Navigating to watch URL:", watchUrl);
        window.location.hash = watchUrl;
      });

      return;
    }

    renderVideoPage(video, videoId);
  } catch (error) {
    console.error("Error rendering vid page:", error);
    showError(`Error rendering vid page: ${formatErrorForDisplay(error)}`);
  }
}

function showError(message) {
  videoPageContainer.innerHTML = `
    <div class="error">
      <h1>404</h1>
      <div class="loading-indicator">
        <p>${message}</p>
      </div>
    </div>
  `;
}

function renderVideoPage(video, videoId) {
  // Extract and sanitize data
  let url = getValueFromTags(video, "url", "No URL found");
  let mimeType = getValueFromTags(video, "m", "Unknown MIME type");
  let title = escapeHtml(getValueFromTags(video, "title", "Untitled"));
  let content = escapeHtml(video.content);
  let relativeTime = escapeHtml(getRelativeTime(video.created_at));
  let pubkey = escapeHtml(video.pubkey);

  // Check if we should use default player (from URL hash or toggle state)
  let useDefaultPlayer = true;

  // Create static skeleton
  mainContent.innerHTML = `
<div class="video-page-layout">
  <div class="video-container"></div>

  <div class="scrollable-content">
    <div class="video-info-bar">
      <div class="channel-info">
        <div></div>
        <div></div>
      </div>
      <div class="video-action-tabs">
        <div class="tab-scroll-container">
          <button id="action-like-btn" class="video-action-tab-button">
            <span class="like-icon">👍</span>
            <span class="like-text">Like</span>
            <span class="like-count">0</span>
          </button>
          <button id="action-share-btn" class="video-action-tab-button">📨 Share</button>
          <button id="action-bookmark-btn" class="video-action-tab-button">🔖 Bookmark</button>
          <button id="action-playlist-btn" class="video-action-tab-button">📋 Add to Playlist</button>
          <button id="action-more-btn" class="video-action-tab-button">⋯ More</button>
        </div>
      </div>
    </div>


    <div class="info-containers">
      <div class="info-container social-info">
        <details>
          <summary class="video-title">
            <span class="arrow">!</span>
          </summary>
          <div class="video-content">
            <div class="social-data">
              <div class="content-section">
                <h4>Description:</h4>
                <p class="video-description"></p>
              </div>
              <div class="tags-section">
                <h4>Tags:</h4>
                <p class="video-tags"></p>
              </div>
              <div class="relays-section">
                <h4>Originally published on:</h4>
                <p class="video-relays"></p>
              </div>
              <div class="time-section">
                <h4>Published:</h4>
                <p class="video-time"></p>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div class="info-container technical-info">
        <details>
          <summary class="technical-title">
            <span class="technical-summary"></span>
            <span class="arrow">!</span>
          </summary>
          <div class="technical-content">
            <div class="technical-data">
              <div class="url-section">
                <h4>Direct URL:</h4>
                <p class="technical-url"></p>
              </div>
              <div class="filename-section">
                <h4>File Name:</h4>
                <p class="technical-filename"></p>
              </div>
              <div class="hash-section">
                <h4>Content Hash (x tag):</h4>
                <p class="technical-hash"></p>
              </div>
              <div class="validation-section">
                <button class="validate-blossom-btn">Validate Metadata</button>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>



    <div class="player-toggle">
      <button class="toggle-player-btn"></button>
    </div>
    <div class="comments-container"></div>
  </div>
</div>

  `;

// Get references to containers
let videoContainer = mainContent.querySelector(".video-container");
let channelInfo = mainContent.querySelector(".channel-info");
let videoTitle = mainContent.querySelector(".video-title");
let videoDescription = mainContent.querySelector(".video-description");
let videoTags = mainContent.querySelector(".video-tags");
let videoRelays = mainContent.querySelector(".video-relays");
let videoTime = mainContent.querySelector(".video-time");
let toggleBtn = mainContent.querySelector(".toggle-player-btn");

// Technical info references
let technicalSummary = mainContent.querySelector(".technical-summary");
let technicalUrl = mainContent.querySelector(".technical-url");
let technicalFilename = mainContent.querySelector(".technical-filename");
let technicalHash = mainContent.querySelector(".technical-hash");
let validateBtn = mainContent.querySelector(".validate-blossom-btn");

// Render the appropriate video player
renderVideoPlayer(videoContainer, video, useDefaultPlayer);

// Set toggle button text and handler
updateToggleButton(toggleBtn, useDefaultPlayer);
toggleBtn.addEventListener("click", () => {
  let newPlayerState = !useDefaultPlayer;
  sessionStorage.setItem(`useDefaultPlayer_${videoId}`, newPlayerState.toString());
  renderVideoPlayer(videoContainer, video, newPlayerState);
  updateToggleButton(toggleBtn, newPlayerState);
  useDefaultPlayer = newPlayerState;
  console.log(`Switched to ${newPlayerState ? "default" : "custom"} video player`);
});

// Channel info with custom elements
let channelImage = document.createElement("nostr-picture");
channelImage.className = "channel-image";
channelImage.setAttribute("pubkey", pubkey);

let channelName = document.createElement("nostr-name");
channelName.className = "channel-name";
channelName.setAttribute("pubkey", pubkey);

channelInfo.children[0].appendChild(channelImage);
channelInfo.children[1].appendChild(channelName);

// Add click handler to channel info
channelInfo.addEventListener("click", () => {
  window.location.hash = `#profile/${pubkey}`;
});

// Social info - Video title and content
let titleSpan = document.createElement("span");
titleSpan.textContent = title;
videoTitle.insertBefore(titleSpan, videoTitle.querySelector(".arrow"));

videoDescription.textContent = content;
videoTime.textContent = relativeTime;

// Extract and display tags (make them clickable)
const tTags = video.tags.filter(tag => tag[0] === 't').map(tag => tag[1]);
if (tTags.length > 0) {
  // Create clickable tag elements
  videoTags.innerHTML = '';
  tTags.forEach((tag, index) => {
    const tagSpan = document.createElement('span');
    tagSpan.textContent = tag;
    tagSpan.className = 'clickable-tag';
    tagSpan.style.cursor = 'pointer';
    tagSpan.addEventListener('click', () => {
      window.location.hash = `#tag/params?tags=${tag}`;
    });
    
    videoTags.appendChild(tagSpan);
    
    // Add comma separator except for last tag
    if (index < tTags.length - 1) {
      const separator = document.createTextNode(', ');
      videoTags.appendChild(separator);
    }
  });
} else {
  videoTags.textContent = 'No tags';
}

// Extract and display relays (make them clickable)
const relayTags = video.tags.filter(tag => tag[0] === 'relay').map(tag => tag[1]);
if (relayTags.length > 0) {
  // Create clickable relay elements
  videoRelays.innerHTML = '';
  relayTags.forEach((relay, index) => {
    const relaySpan = document.createElement('span');
    relaySpan.textContent = relay;
    relaySpan.className = 'clickable-relay';
    relaySpan.style.cursor = 'pointer';
    relaySpan.addEventListener('click', () => {
      window.location.hash = `#singlerelay/${relay}`;
    });
    
    videoRelays.appendChild(relaySpan);
    
    // Add comma separator except for last relay
    if (index < relayTags.length - 1) {
      const separator = document.createTextNode(', ');
      videoRelays.appendChild(separator);
    }
  });
} else {
  videoRelays.textContent = 'No relays specified';
}

// Technical info processing
const imetaTag = video.tags.find(tag => tag[0] === 'imeta');
if (imetaTag) {
  // Parse imeta tag
  let mimeType = '';
  let dimensions = '';
  let xHash = '';
  let fileSize = '';
  let directUrl = url; // Use the existing url variable
  
  // Extract data from imeta tag
  for (let i = 1; i < imetaTag.length; i++) {
    const item = imetaTag[i];
    if (item.startsWith('m ')) {
      mimeType = item.substring(2); // Remove 'm ' prefix
    } else if (item.startsWith('dim ')) {
      dimensions = item.substring(4); // Remove 'dim ' prefix
    } else if (item.startsWith('x ')) {
      xHash = item.substring(2); // Remove 'x ' prefix
    } else if (item.startsWith('url ')) {
      directUrl = item.substring(4); // Remove 'url ' prefix
    } else if (item.startsWith('size ')) {
      const sizeBytes = parseInt(item.substring(5));
      if (!isNaN(sizeBytes)) {
        fileSize = formatBytes(sizeBytes);
      }
    }
  }
  
  // Extract filename from URL
  let filename = '';
  try {
    const urlObj = new URL(directUrl);
    filename = urlObj.pathname.split('/').pop() || 'Unknown';
  } catch (e) {
    filename = 'Invalid URL';
  }
  
  // Validate blossom (check if filename without extension matches x hash)
  const filenameWithoutExt = filename.split('.')[0];
  const isValidBlossom = filenameWithoutExt === xHash;
  
  // Set technical summary (collapsed state)
  const fileExtension = mimeType.split('/')[1] || 'unknown';
  const blossomStatus = isValidBlossom ? 'blossom (?)' : ' ';
  
  // Build the summary with optional file size
  let summaryParts = [fileExtension, dimensions, blossomStatus];
  if (fileSize) {
    summaryParts.push(fileSize);
  }
  technicalSummary.textContent = summaryParts.join(' - ');

  // Set expanded technical data
  technicalUrl.textContent = directUrl;
  technicalFilename.textContent = filename;
  technicalHash.textContent = xHash;

// Validate button handler (navigate to blob page)
validateBtn.addEventListener('click', () => {
  console.log('Validating blossom for x hash:', xHash);
  console.log('Filename without extension:', filenameWithoutExt);
  console.log('Is claiming valid blossom:', isValidBlossom);
  
  // Navigate to blob page with the direct video URL
  window.location.hash = `#blob/${directUrl}`;
});
} else {
  // No imeta tag found
  technicalSummary.textContent = 'No technical data available';
  technicalUrl.textContent = url;
  technicalFilename.textContent = 'N/A';
  technicalHash.textContent = 'N/A';
  
validateBtn.addEventListener('click', () => {
  console.log('No x tag found for validation');
  // Navigate to blob page with the main video URL
  window.location.hash = `#blob/${encodeURIComponent(url)}`;
});
}


//////////////////////////
// video actions
//////////////////
  setTimeout(() => {
    const tabScrollContainer = document.querySelector(".tab-scroll-container");
    enableDragScroll(tabScrollContainer);
    enableWheelScroll(tabScrollContainer);
  }, 100);

  // Event listeners for action buttons
  let likeBtn = mainContent.querySelector("#action-like-btn");
  let likeCountSpan = mainContent.querySelector(".like-count");
  let likeTextSpan = mainContent.querySelector(".like-text");

  let bookmarkBtn = mainContent.querySelector("#action-bookmark-btn");
  let playlistBtn = mainContent.querySelector("#action-playlist-btn");

  // Load reaction count
  getVideoReactionCount(videoId)
    .then((count) => {
      if (likeCountSpan) {
        likeCountSpan.textContent = count > 0 ? count : "";
        // Update button text based on count
        if (count > 0) {
          likeTextSpan.textContent = count === 1 ? "Like" : "Likes";
        }
      }
    })
    .catch((error) => {
      console.error("Error loading reaction count:", error);
    });

  // Set initial like button state and add event listener
  if (app.isLoggedIn && (app.myPk || app.guestSk)) {
    // Check if user has already liked this video
    checkIfVideoLiked(videoId, video.pubkey)
      .then((isLiked) => {
        if (isLiked) {
          likeTextSpan.textContent = "Liked";
          likeBtn.classList.add("liked");
          likeBtn.disabled = true;
        }
      })
      .catch((error) => {
        console.error("Error checking like status:", error);
      });



likeBtn?.addEventListener("click", async () => {
  console.log(`Liked video: ${videoId} - ${title}`);

  // Check if user is logged in
  if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
    showTemporaryNotification("❌ Please log in to like videos");
    return;
  }

  // Show confirmation modal before proceeding
  const confirmed = await confirmModal(
    "Likes are public and permanent. Once published, they cannot be undone.",
    "Publish Kind-7 Event"
  );

  // If user canceled, exit early
  if (!confirmed) {
    console.log("User canceled the like action");
    return;
  }

  try {
    // Disable button to prevent double-clicking
    likeBtn.disabled = true;
    likeTextSpan.textContent = "Liking...";

    // Get a relay hint (use first connected relay)
    const relayHint =
      app.relays && app.relays.length > 0 ? app.relays[0] : "";

    // Create the reaction event (kind-7)
    const reactionEvent = {
      kind: 7,
      created_at: Math.floor(Date.now() / 1000),
      content: "+", // "+" indicates a like/upvote
      tags: [
        ["e", videoId, relayHint], // Reference to the video event with relay hint
        ["p", video.pubkey, relayHint], // Author of the video with relay hint
        ["k", video.kind.toString()], // Kind of the event being reacted to
      ],
    };

    console.log("Creating reaction event:", reactionEvent);

    // Sign the event using your existing signing function
    const signedReactionEvent = await handleEventSigning(reactionEvent);

    console.log("Reaction event signed successfully:", signedReactionEvent);

    // Publish to connected relays
    if (app.relays && app.relays.length > 0) {
      const pool = new window.NostrTools.SimplePool();

      try {
        const result = await publishEvent(signedReactionEvent, null, {
          successMessage: "Like reaction published successfully",
          errorMessage: "Failed to publish like reaction",
        });

        if (result.success) {
          // Update UI to liked state
          likeTextSpan.textContent = "Liked";
          likeBtn.classList.add("liked");
          likeBtn.disabled = true;

          const currentCount = parseInt(likeCountSpan.textContent) || 0;
          likeCountSpan.textContent = currentCount + 1;

          showTemporaryNotification("👍 Like published successfully!");
        } else {
          throw new Error(result.error);
        }
      } catch (publishError) {
        console.error("Error publishing reaction event:", publishError);
        showTemporaryNotification("❌ Failed to publish like reaction");

        // Re-enable button on publish failure
        likeBtn.disabled = false;
        likeTextSpan.textContent = "Like";
      }
    } else {
      console.warn("No relays configured, reaction event not published");
      showTemporaryNotification("❌ No relays configured");
      likeBtn.disabled = false;
      likeTextSpan.textContent = "Like";
    }
  } catch (error) {
    console.error("Error creating reaction event:", error);
    showTemporaryNotification(
      "❌ Failed to create like reaction: " + error.message
    );

    // Re-enable button on error
    likeBtn.disabled = false;
    likeTextSpan.textContent = "Like";
  }
});


  } else {
    // User not logged in, show login prompt on click
    likeBtn?.addEventListener("click", () => {
      showTemporaryNotification("❌ Please log in to like videos");
    });
  }

  bookmarkBtn?.addEventListener("click", () => {
    console.log(`Bookmark video: ${videoId} - ${title}`);

    const isSaved = isVideoBookmarked(videoId);

    if (isSaved) {
      // Remove from bookmarks
      const success = removeVideoFromBookmarks(videoId);
      if (success) {
        bookmarkBtn.textContent = "🔖 Bookmark";
        bookmarkBtn.classList.remove("saved");
        showTemporaryNotification("Video removed from your local bookmarks");
      }
    } else {
      // Add to bookmarks
      const success = addVideoToBookmarks(video, videoId);
      if (success) {
        bookmarkBtn.textContent = "🔖 Bookmarked";
        bookmarkBtn.classList.add("saved");
        showTemporaryNotification("Video added to your local bookmarks");
      }
    }
  });

  // Add to Playlist button (new functionality)
  playlistBtn?.addEventListener("click", () => {
    console.log(`Add to playlist: ${videoId} - ${title}`);
    showPlaylistSelector(video, videoId, {
      title: title,
      url: url,
      mimeType: mimeType,
      content: content,
      relativeTime: relativeTime,
      pubkey: pubkey,
    });
  });

  // Set initial bookmark button state
  if (isVideoBookmarked(videoId)) {
    bookmarkBtn.textContent = "🔖 Bookmarked";
    bookmarkBtn.classList.add("saved");
  } else {
    bookmarkBtn.textContent = "🔖 Bookmark";
    bookmarkBtn.classList.remove("saved");
  }



let shareBtn = mainContent.querySelector("#action-share-btn");
let moreBtn = mainContent.querySelector("#action-more-btn");

shareBtn?.addEventListener("click", (e) => {
  console.log('Share button clicked');
  showShareMenu(shareBtn, video, videoId, url);
});

moreBtn?.addEventListener("click", (e) => {
  console.log('More button clicked');  
  showMoreMenu(moreBtn, video, videoId);
});


  // Load comments after delay
  setTimeout(() => {
    renderComments(videoId);
  }, 1000);
}

//////////////////////////
////////////////////////////

let shareMenuControls = null;
let moreMenuControls = null;


async function showShareMenu(buttonElement, video, videoId, url) {
  if (shareMenuControls && shareMenuControls.isOpen()) {
    shareMenuControls.close();
    return;
  }

  if (!shareMenuControls) {
    await createShareMenu(buttonElement, video, videoId, url);
  }

  shareMenuControls.open();
}


async function createShareMenu(buttonElement, video, videoId, url) {
  // Create overlay container
  let overlayElement = document.createElement('div');
  overlayElement.id = 'share-overlay';
  overlayElement.classList.add('menu-overlay');
  
  let menuElement = document.createElement('div');
  menuElement.id = 'share-menu';
  menuElement.classList.add('settings-menu'); // Reusing same styles
  
  menuElement.innerHTML = `
    <div class="menu-container">
      <div class="menu-header">
        <div class="user-info">
          Share
        </div>
      </div>
      
      <div class="menu-items">
        <button class="menu-item share-page-link">
          <span class="item-icon">🔗</span>
          <span class="item-text">Copy App Link</span>
        </button>
        <button class="menu-item share-copy-url">
          <span class="item-icon">📺</span>
          <span class="item-text">Copy Media URL</span>
        </button>
        <button class="menu-item share-nevent">
          <span class="item-icon">🆔</span>
          <span class="item-text">Copy Event id</span>
        </button>
        <button class="menu-item share-nostr">
          <span class="item-icon">🐦</span>
          <span class="item-text">Share Nostr Note</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item share-download">
          <span class="item-icon">⬇️</span>
          <span class="item-text">Download Video</span>
        </button>
      </div>
    </div>
  `;
  
  // Center the menu on screen
  menuElement.style.position = 'fixed';
  menuElement.style.top = '50%';
  menuElement.style.left = '50%';
  menuElement.style.transform = 'translate(-50%, -50%)';
  menuElement.style.zIndex = '9999';
  
  overlayElement.appendChild(menuElement);
  document.body.appendChild(overlayElement);
  
  // Create overlay controls
  shareMenuControls = createOverlayControls("share", overlayElement, {
    closeOnOutsideClick: true,
    closeOnEscape: true,
    preventBodyScroll: false
  });

  // Override onOpen and onClose for animations
  const originalOverlay = OverlayManager.overlays.get("share");
  const originalOnOpen = originalOverlay.onOpen;
  const originalOnClose = originalOverlay.onClose;
  
  originalOverlay.onOpen = function() {
    originalOnOpen.call(this);
    setTimeout(() => {
      menuElement.classList.add('visible');
    }, 10);
  };
  
  originalOverlay.onClose = function() {
    menuElement.classList.remove('visible');
    setTimeout(() => {
      originalOnClose.call(this);
      if (overlayElement.parentNode) {
        overlayElement.remove();
      }
      shareMenuControls = null;
    }, 150);
  };

  // Set up event listeners
  setupShareMenuEvents(menuElement, video, videoId, url);
  
  // Store reference in app object
  if (app.overlayControls) {
    app.overlayControls.share = shareMenuControls;
  }
}

async function showMoreMenu(buttonElement, video, videoId) {
  if (moreMenuControls && moreMenuControls.isOpen()) {
    moreMenuControls.close();
    return;
  }

  if (!moreMenuControls) {
    await createMoreMenu(buttonElement, video, videoId);
  }

  moreMenuControls.open();
}

async function createMoreMenu(buttonElement, video, videoId) {
  // Create overlay container
  let overlayElement = document.createElement('div');
  overlayElement.id = 'more-overlay';
  overlayElement.classList.add('menu-overlay');
  
  let menuElement = document.createElement('div');
  menuElement.id = 'more-menu';
  menuElement.classList.add('settings-menu'); // Reusing same styles
  
menuElement.innerHTML = `
  <div class="menu-container">
    <div class="menu-header">
      <div class="user-info">
        More
      </div>
    </div>
    
    <div class="menu-items">
      <button class="menu-item more-report">
        <span class="item-icon">🚩</span>
        <span class="item-text">Report Video</span>
      </button>
      <button class="menu-item more-block-user">
        <span class="item-icon">🚫</span>
        <span class="item-text">Block User</span>
      </button>
      <button class="menu-item more-block-server">
        <span class="item-icon">🔒</span>
        <span class="item-text">Block Media Server</span>
      </button>

      <div class="menu-separator"></div>
      <button class="menu-item more-video-json">
        <span class="item-icon">📊</span>
        <span class="item-text">Show JSON</span>
      </button>

    </div>
  </div>
`;
  
  // Center the menu on screen
  menuElement.style.position = 'fixed';
  menuElement.style.top = '50%';
  menuElement.style.left = '50%';
  menuElement.style.transform = 'translate(-50%, -50%)';
  menuElement.style.zIndex = '9999';
  
  overlayElement.appendChild(menuElement);
  document.body.appendChild(overlayElement);
  
  // Create overlay controls
  moreMenuControls = createOverlayControls("more", overlayElement, {
    closeOnOutsideClick: true,
    closeOnEscape: true,
    preventBodyScroll: false
  });

  // Override onOpen and onClose for animations
  const originalOverlay = OverlayManager.overlays.get("more");
  const originalOnOpen = originalOverlay.onOpen;
  const originalOnClose = originalOverlay.onClose;
  
  originalOverlay.onOpen = function() {
    originalOnOpen.call(this);
    setTimeout(() => {
      menuElement.classList.add('visible');
    }, 10);
  };
  
  originalOverlay.onClose = function() {
    menuElement.classList.remove('visible');
    setTimeout(() => {
      originalOnClose.call(this);
      if (overlayElement.parentNode) {
        overlayElement.remove();
      }
      moreMenuControls = null;
    }, 150);
  };

  // Set up event listeners
  setupMoreMenuEvents(menuElement, video, videoId);
  
  // Store reference in app object
  if (app.overlayControls) {
    app.overlayControls.more = moreMenuControls;
  }
}

function setupShareMenuEvents(menuElement, video, videoId, url) {
  menuElement.querySelector('.share-page-link')?.addEventListener('click', () => {
    console.log('Copy link clicked');
    handleShareOption('page-link', video, videoId, url);
    shareMenuControls?.close();
  });
  
  menuElement.querySelector('.share-copy-url')?.addEventListener('click', () => {
    console.log('Copy url clicked');
    handleShareOption('media-url', video, videoId, url);
    shareMenuControls?.close();
  });
  
  menuElement.querySelector('.share-nevent')?.addEventListener('click', () => {
    console.log('Share nevent clicked');
    handleShareOption('event-id', video, videoId, url);
    shareMenuControls?.close();
  });
  
  
  menuElement.querySelector('.share-nostr')?.addEventListener('click', () => {
    console.log('Share on Nostr clicked');
    shareMenuControls?.close();
  });
  
  menuElement.querySelector('.share-download')?.addEventListener('click', () => {
    console.log('Download video clicked');
    shareMenuControls?.close();
  });
}

function setupMoreMenuEvents(menuElement, video, videoId) {
  menuElement.querySelector('.more-video-json')?.addEventListener('click', () => {
    console.log('Video JSON clicked');
    handleMoreOption('show-json', video, videoId);
    moreMenuControls?.close();
  });
  
  menuElement.querySelector('.more-report')?.addEventListener('click', () => {
    console.log('Report video clicked');
    moreMenuControls?.close();
  });
  
  menuElement.querySelector('.more-block-user')?.addEventListener('click', () => {
    console.log('Block user clicked');
    moreMenuControls?.close();
  });
  

  menuElement.querySelector('.more-block-server')?.addEventListener('click', () => {
    console.log('Block media server clicked');
    handleMoreOption('block-server', video, videoId);
    moreMenuControls?.close();
  });
  
  
}





/////////////////////
/////////////////////

function addVideoToBookmarks(video, videoId) {
  try {
    if (!app.bookmarkPlaylist) {
      // Initialize bookmark playlist if it doesn't exist
      app.bookmarkPlaylist = {
        ...config.defaultBookmarkPlaylist,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const aTag = ["a", `${video.kind}:${videoId}`];

    // Check if video is already bookmarked
    const existingIndex = app.bookmarkPlaylist.tags.findIndex(
      (tag) => tag[0] === "a" && tag[1] === aTag[1]
    );

    if (existingIndex === -1) {
      // Add the video reference
      app.bookmarkPlaylist.tags.push(aTag);

      // Save to localStorage
      localStorage.setItem(
        "bookmarkPlaylist",
        JSON.stringify(app.bookmarkPlaylist)
      );

      console.log("Added video to bookmarks:", videoId);
      return true;
    }

    return false; // Already bookmarked
  } catch (error) {
    console.error("Error adding video to bookmarks:", error);
    return false;
  }
}

function removeVideoFromBookmarks(videoId) {
  try {
    if (!app.bookmarkPlaylist) return false;

    const initialLength = app.bookmarkPlaylist.tags.length;

    // Remove the "a" tag for this video
    app.bookmarkPlaylist.tags = app.bookmarkPlaylist.tags.filter(
      (tag) => !(tag[0] === "a" && tag[1].includes(videoId))
    );

    if (app.bookmarkPlaylist.tags.length < initialLength) {
      localStorage.setItem(
        "bookmarkPlaylist",
        JSON.stringify(app.bookmarkPlaylist)
      );
      console.log("Removed video from bookmarks:", videoId);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error removing video from bookmarks:", error);
    return false;
  }
}

function isVideoBookmarked(videoId) {
  if (!app.bookmarkPlaylist) return false;

  return app.bookmarkPlaylist.tags.some(
    (tag) => tag[0] === "a" && tag[1].includes(videoId)
  );
}

function showPlaylistSelector(video, videoId, additionalData) {
  const playlists = app.playlists || [];

  const content = `
    <div class="playlist-selector-modal">
      ${
        playlists.length > 0
          ? `
        <div class="existing-playlists">
          <h4>Select a playlist:</h4>
          <div class="playlist-list">
            ${playlists
              .map((playlist) => {
                const dTag = getValueFromTags(playlist, "d", "");
                const title = getValueFromTags(
                  playlist,
                  "title",
                  "Untitled Playlist"
                );
                const videoCount = playlist.tags.filter(
                  (tag) => tag[0] === "a"
                ).length;

                // Check if video is already in this playlist
                const hasVideo = playlist.tags.some(
                  (tag) => tag[0] === "a" && tag[1] === `21:${videoId}`
                );

                return `
                <div class="playlist-item ${hasVideo ? 'already-added' : ''}" data-d-tag="${escapeHtml(dTag)}">
                  <span class="playlist-name">${escapeHtml(title)}</span>
                  <span class="playlist-count">(${videoCount} videos)</span>
                  ${hasVideo ? '<span class="already-added-indicator">✓ Already added</span>' : ''}
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
      <div class="create-playlist-section">
        <h4>Create new playlist:</h4>
        <div class="create-playlist-form">
          <input type="text" class="form-input playlist-name-input" placeholder="Enter playlist name" maxlength="50">
          <div class="modal-actions">
            <button class="btn-primary create-playlist-btn">Create & Add</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modal = openModal({
    title: "Add to Playlist",
    content,
    size: "medium",
    customClass: "playlist-selector-modal",
  });

  const nameInput = modal.querySelector(".playlist-name-input");
  const createBtn = modal.querySelector(".create-playlist-btn");
  const playlistItems = modal.querySelectorAll(".playlist-item:not(.already-added)"); // Exclude already-added items

  createBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }

    const playlist = createPlaylist(name);
    const dTag = getValueFromTags(playlist, "d", "");
    const success = addVideoToPlaylist(dTag, videoId);

    if (success) {
      showTemporaryNotification(`Video added to "${name}"`);
      closeModal();
    }
  });

  nameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      createBtn.click();
    }
  });

  playlistItems.forEach((item) => {
    item.addEventListener("click", () => {
      const dTag = item.dataset.dTag;
      const playlistName = item.querySelector(".playlist-name").textContent;

      const success = addVideoToPlaylist(dTag, videoId);

      if (success) {
        showTemporaryNotification(`Video added to "${playlistName}"`);
        closeModal();
      }
    });
  });

  // Focus the input when modal opens
  //  nameInput?.focus();
}

async function checkIfVideoLiked(videoId, videoPubkey) {
  // Check if user is logged in
  if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
    return false;
  }

  // Get current user's public key
  const currentUserPk =
    app.myPk ||
    (app.guestSk ? window.NostrTools.getPublicKey(app.guestSk) : null);

  if (!currentUserPk) {
    return false;
  }

  try {
    const pool = new window.NostrTools.SimplePool();

    // Query for reaction events (kind 7) by current user for this video
    const reactionEvents = await pool.querySync(app.relays || [], {
      kinds: [7],
      authors: [currentUserPk],
      "#e": [videoId], // Filter by the video event ID
      limit: 1,
    });

    // Don't close the pool - let it stay open for other operations

    // Check if we found any like reactions (content "+" or empty)
    const hasLike = reactionEvents.some(
      (event) => event.content === "+" || event.content === ""
    );

    console.log(
      `User ${
        app.isGuest ? "guest" : "extension"
      } like status for video ${videoId}:`,
      hasLike
    );

    return hasLike;
  } catch (error) {
    console.error("Error checking like status:", error);
    return false;
  }
}

async function getVideoReactionCount(videoId) {
  try {
    const pool = new window.NostrTools.SimplePool();

    // Query for all reaction events (kind 7) for this video
    const reactionEvents = await pool.querySync(app.relays || [], {
      kinds: [7],
      "#e": [videoId], // Filter by the video event ID
      limit: 1000, // Reasonable limit to avoid too many results
    });

    // Filter for like reactions (content "+" or empty string)
    const likeReactions = reactionEvents.filter(
      (event) => event.content === "+" || event.content === ""
    );

    console.log(
      `Found ${likeReactions.length} like reactions for video ${videoId}`
    );

    return likeReactions.length;
  } catch (error) {
    console.error("Error getting reaction count:", error);
    return 0;
  }
}


function handleShareOption(shareType, video, videoId, url) {
  let shareData = {};

  switch (shareType) {
    case "page-link":
      shareData = {
        title: "Share Page Link",
        contentType: "current-url",
        initialUrl: window.location.href,
        generateImmediately: true,
      };
      break;

    case "event-id":
      // Create nevent1 format for the event ID
      let neventId;
      try {
        neventId = window.NostrTools.nip19.neventEncode({
          id: videoId,
          relays: [], // Add relay URLs if needed
          author: video.pubkey,
        });
      } catch (error) {
        console.error("Error encoding nevent:", error);
        neventId = videoId; // Fallback to raw ID
      }

      shareData = {
        title: "Share Event ID",
        contentType: "direct-text",
        initialText: neventId,
        generateImmediately: true,
      };
      break;

    case "media-url":
      shareData = {
        title: "Share Direct Media URL",
        contentType: "direct-text",
        initialText: url, // This is the media URL from the video tags
        generateImmediately: true,
      };
      break;

    default:
      console.error("Unknown share type:", shareType);
      return;
  }

  console.log(
    `Share ${shareType}: ${videoId} - ${getValueFromTags(
      video,
      "title",
      "Untitled"
    )}`
  );
  openQrModal(shareData);
}

function handleMoreOption(optionType, video, videoId) {
  switch (optionType) {
    case "show-json":
      console.log("Show JSON for video:", videoId);
      showVideoJsonModal(video);
      break;

    case "report":
      console.log("Report video:", videoId);
      console.log("Video to report:", video);
      break;

    case "mute":
      console.log("Mute video/author:", videoId, video.pubkey);
      break;

    case "block-server":
      console.log("Block media server for video:", videoId);
      blockMediaServer(video);
      break;

    default:
      console.error("Unknown more option:", optionType);
      return;
  }
}

////////////////////
// video player

// Enhanced renderVideoPlayer with loading state
function renderVideoPlayer(container, video, useDefault) {
  // Show loading state first
  container.innerHTML = `
    <div class="loading-spinner">
      <p>Loading video...</p>
    </div>
  `;
  
  // Get the URL
  let url = getValueFromTags(video, "url", "");
  
  // Add a small delay to show loading (optional)
  setTimeout(() => {
    if (!url) {
      container.innerHTML = '<div class="video-error">No video URL provided</div>';
      return;
    }
    
    // Rest of your existing logic...
    if (!isDomainWhitelisted(url)) {
      container.innerHTML = createBlockedVideoUI(url, container, video, useDefault);
      setupBlockedVideoInteractions(container, url, video, useDefault);
      return;
    }
    
    // Clear loading and render player
    container.innerHTML = '';
    
    if (useDefault) {
      let mimeType = getValueFromTags(video, "m", "video/mp4");
      container.innerHTML = `
        <video controls class="default-video-player">
          <source src="${escapeHtml(url)}" type="${escapeHtml(mimeType)}">
          Your browser does not support the video tag.
        </video>
      `;
    } else {
      container.innerHTML = createVideoPlayer(video);
    }
    
    // Add error handling
    const videoElement = container.querySelector('video');
    if (videoElement) {
      videoElement.addEventListener('error', (e) => {
        console.error('Video failed to load:', e);
        container.innerHTML = `
          <div class="video-error">
            <p>Failed to load video</p>
            <p>URL: ${escapeHtml(url)}</p>
          </div>
        `;
      });
    }
  }, 100);
}


// Helper function to update toggle button text
function updateToggleButton(button, useDefault) {
  button.textContent = useDefault
    ? "🎬 Switch to Custom Player"
    : "📺 Switch to Default Player";
}
////////////////////
// Utility functions for media server whitelist
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch (error) {
    return null;
  }
}

function isDomainWhitelisted(url) {
  const domain = extractDomain(url);
  if (!domain) return false;
  
  return app.mediaServerWhitelist.some(whitelistedDomain => 
    domain === whitelistedDomain.toLowerCase()
  );
}

function addDomainToWhitelist(url) {
  const domain = extractDomain(url);
  if (!domain) return false;
  
  // Check if domain is already in whitelist
  if (!isDomainWhitelisted(url)) {
    app.mediaServerWhitelist.push(domain);
    localStorage.setItem("mediaServerWhitelist", JSON.stringify(app.mediaServerWhitelist));
    return true;
  }
  return false;
}

function isValidDomain(domain) {
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) && domain.length <= 253;
}

function createBlockedVideoUI(url, container, video, useDefault) {
  return `
    <div class="blocked-video-container">
      <div class="blocked-video-icon">🔒</div>
      <h3 class="blocked-video-title">Video Blocked for Safety</h3>
      <p class="blocked-video-domain">
        This video is hosted on: <strong class="blocked-domain"></strong>
      </p>
      <p class="blocked-video-description">
        This domain is not in your trusted media servers list. You can allow it once or add it to your whitelist.
      </p>
      <div class="blocked-video-actions">
        <button class="allow-once-btn">Allow Once</button>
        <button class="add-to-whitelist-btn">Add to Whitelist</button>
      </div>
    </div>
  `;
}

function allowVideoOnce(url, container, video, useDefault) {
  // Simply render the video player without adding to whitelist
  if (useDefault) {
    let mimeType = getValueFromTags(video, "m", "video/mp4");
    container.innerHTML = `
      <video controls class="default-video-player">
        <source src="${escapeHtml(url)}" type="${escapeHtml(mimeType)}">
        Your browser does not support the video tag.
      </video>
    `;
  } else {
    container.innerHTML = createVideoPlayer(video);
  }
}

function addToWhitelistAndPlay(url, container, video, useDefault) {
  const domain = extractDomain(url);
  
  if (!domain || !isValidDomain(domain)) {
    alert('Invalid domain format');
    return;
  }
  
  // Add domain to whitelist
  const added = addDomainToWhitelist(url);
  
  if (added) {
    console.log(`Added ${domain} to media server whitelist`);
  }
  
  // Play the video
  allowVideoOnce(url, container, video, useDefault);
}


function setupBlockedVideoInteractions(container, url, video, useDefault) {
  const domain = extractDomain(url);
  
  // Set dynamic content
  const domainElement = container.querySelector('.blocked-domain');
  if (domainElement) {
    domainElement.textContent = domain || 'unknown domain';
  }
  
  // Add event listeners
  const allowOnceBtn = container.querySelector('.allow-once-btn');
  const addToWhitelistBtn = container.querySelector('.add-to-whitelist-btn');
  
  if (allowOnceBtn) {
    allowOnceBtn.addEventListener('click', () => {
      allowVideoOnce(url, container, video, useDefault);
    });
  }
  
  if (addToWhitelistBtn) {
    addToWhitelistBtn.addEventListener('click', () => {
      addToWhitelistAndPlay(url, container, video, useDefault);
    });
  }
}


function blockMediaServer(video) {
  const url = getValueFromTags(video, "url", "");
  if (!url) {
    console.error("No URL found for video");
    return;
  }

  const domain = extractDomain(url);
  if (!domain) {
    console.error("Could not extract domain from URL");
    return;
  }

  // Remove domain from whitelist if it exists
  const domainLower = domain.toLowerCase();
  const initialLength = app.mediaServerWhitelist.length;
  app.mediaServerWhitelist = app.mediaServerWhitelist.filter(
    whitelistedDomain => whitelistedDomain.toLowerCase() !== domainLower
  );

  // Update localStorage
  localStorage.setItem("mediaServerWhitelist", JSON.stringify(app.mediaServerWhitelist));

  const wasRemoved = app.mediaServerWhitelist.length < initialLength;
  if (wasRemoved) {
    console.log(`Removed ${domain} from media server whitelist`);
  } else {
    console.log(`${domain} was not in whitelist (may have been allowed once)`);
  }

  // Find the video container and re-render with blocked UI
  const videoContainer = document.querySelector('.video-player-container') || 
                        document.querySelector('[data-video-container]') ||
                        document.querySelector('video')?.parentElement;

  if (videoContainer) {
    // Determine if we're using default player (you may need to adjust this logic)
    const useDefault = videoContainer.querySelector('.default-video-player') !== null;
    
    // Re-render the video player which will now show the blocked UI
    renderVideoPlayer(videoContainer, video, useDefault);
  } else {
    console.warn("Could not find video container to re-render");
    // Optionally show a message to the user
    alert(`Media server ${domain} has been blocked. Please refresh the page to see the changes.`);
  }
}

function removeDomainFromWhitelist(url) {
  const domain = extractDomain(url);
  if (!domain) return false;
  
  const domainLower = domain.toLowerCase();
  const initialLength = app.mediaServerWhitelist.length;
  
  app.mediaServerWhitelist = app.mediaServerWhitelist.filter(
    whitelistedDomain => whitelistedDomain.toLowerCase() !== domainLower
  );
  
  if (app.mediaServerWhitelist.length < initialLength) {
    localStorage.setItem("mediaServerWhitelist", JSON.stringify(app.mediaServerWhitelist));
    return true;
  }
  return false;
}