async function videoPageHandler() {
//  logMemoryUsage();
  
  // Show loading
  mainContent.innerHTML = `
    <div id="videoPage-container">
      <h1>Discovering Videos</h1>
      <div class="loading-indicator">
        <p>Loading video...</p>
      </div>
    </div>
  `;
  
  // Clean up previous page listeners
  if (app.currentPageCleanupKey) {
    removeTrackedEventListeners(app.currentPageCleanupKey);
  }
  app.currentPageCleanupKey = `videoPage_${Date.now()}`;

  // Close menus
  if (shareMenuControls?.isOpen()) shareMenuControls.close();
  if (moreMenuControls?.isOpen()) moreMenuControls.close();

  try {
    // Parse URL and extract all parameters
    const urlParams = parseVideoURL();
    
    if (!urlParams.videoId) {
      window.location.hash = "#";
      return;
    }

    // Setup playlist if needed
    await setupPlaylistIfNeeded(urlParams.playlistPubkey, urlParams.playlistDTag, urlParams.videoId);

    // Fetch video data with progressive relay strategy
    const video = await fetchVideoDataProgressive(urlParams);
    
    // Determine autoplay
    const shouldAutoplay = !!app.currentPlaylist;
    
    if (!app.currentPlaylist) {
      addVideoToHistory(video);
    }



    // Render video page
    renderVideoPage(video, urlParams.videoId, window.location.hash, shouldAutoplay);
    
  } catch (error) {
    console.error("Error rendering video page:", error);
    showError(`Error rendering video page: ${formatErrorForDisplay(error)}`);
  }
}

/**
 * Parse video URL and extract all parameters
 * Handles both old format (#watch#videoid) and new format (#watch/params?v=videoid)
 */
function parseVideoURL() {
  const currentURL = window.location.hash;
  const urlParts = currentURL.split("/");
  let videoId = urlParts[1];
  
  const result = {
    videoId: null,
    authorPubkey: null,
    discoveryRelays: [],
    playlistPubkey: null,
    playlistDTag: null
  };

  if (!videoId) {
    return result;
  }

  // Check if we have query parameters
  if (videoId.includes("?")) {
    const [baseId, queryString] = videoId.split("?");
    const params = new URLSearchParams(queryString);
    
    // Extract video ID
    result.videoId = params.get("v") || baseId;
    
    // Extract author pubkey
    result.authorPubkey = params.get("author");
    
    // Extract discovery relays
    const discoveryParam = params.get("discovery");
    if (discoveryParam) {
      result.discoveryRelays = discoveryParam
        .split(",")
        .map(r => normalizeRelayURLForVideoPage(r.trim()))
        .filter(Boolean);
    }
    
    // Extract playlist parameters
    result.playlistPubkey = params.get("listp");
    result.playlistDTag = params.get("listd");
    
  } else {
    // Old format: #watch#videoid
    result.videoId = videoId;
  }

  // Handle nevent format
  if (result.videoId && result.videoId.startsWith("nevent1")) {
    try {
      const decoded = window.NostrTools.nip19.decode(result.videoId);
      if (decoded.type === "nevent") {
        result.videoId = decoded.data.id;
        // Extract relays from nevent if no discovery relays specified
        if (!result.discoveryRelays.length && decoded.data.relays) {
          result.discoveryRelays = decoded.data.relays.map(r => normalizeRelayURLForVideoPage(r));
        }
      }
    } catch (error) {
     // throw new Error(`Invalid video ID format: ${error.message}`);
        showError(`Invalid video ID format: ${formatErrorForDisplay(error)}`);
    }
  }

  return result;
}

/**
 * Normalize relay URL to proper wss:// format
 */
function normalizeRelayURLForVideoPage(relay) {
  if (!relay) return null;
  
  let clean = relay.trim();
  
  // Remove malformed protocol prefixes
  clean = clean.replace(/^wss?::\/\//, "wss://");
  
  // Add wss:// if missing
  if (!clean.startsWith("ws://") && !clean.startsWith("wss://")) {
    clean = `wss://${clean}`;
  }
  
  return clean;
}

/**
 * Fetch video data with progressive relay strategy
 * Tries relays in order of likelihood: discovery → author → global → fallback
 */
async function fetchVideoDataProgressive(urlParams) {
  const { videoId, authorPubkey, discoveryRelays } = urlParams;
  
  const filter = {
    kinds: [21, 22],
    limit: 1,
    id: videoId,
  };

  // Strategy 1: Try with discovery relays + app relays (fastest, most specific)
  if (discoveryRelays.length > 0) {
    console.log(`Trying discovery relays: ${discoveryRelays.join(", ")}`);
    const combinedRelays = [...new Set([...discoveryRelays, ...app.relays])];
    const video = await NostrClient.getEventsFromRelays(combinedRelays, filter);
    if (video) {
      console.log("✓ Found video via discovery relays");
      return sanitizeNostrEvent(video);
    }
  }

// Strategy 2: Try with author's extended relays (if author pubkey provided)
if (authorPubkey) {
  console.log(`Trying author relays for: ${authorPubkey.slice(0, 8)}...`);
  try {
    const extendedRelays = await getExtendedRelaysForProfile(authorPubkey);
    
    // Skip if no relays found
    if (extendedRelays && extendedRelays.length > 0) {
      const video = await NostrClient.getEventsFromRelays(extendedRelays, filter);
      if (video) {
        console.log("✓ Found video via author relays");
        return sanitizeNostrEvent(video);
      }
    } else {
      console.log("⊘ No author relays found, skipping strategy 2");
    }
  } catch (error) {
    console.warn("Error fetching from author relays:", error);
  }
}

  // Strategy 3: Try with app relays only (if not already tried with discovery)
  if (discoveryRelays.length === 0) {
    console.log("Trying app relays");
    const video = await NostrClient.getEvents(filter);
    if (video) {
      console.log("✓ Found video via app relays");
      return sanitizeNostrEvent(video);
    }
  }

  // Strategy 4: Try with global relays
  if (app.globalRelays && app.globalRelays.length > 0) {
    console.log("Trying global relays");
    const video = await NostrClient.getEventsFromRelays(app.globalRelays, filter);
    if (video) {
      console.log("✓ Found video via global relays");
      return sanitizeNostrEvent(video);
    }
  }

  // Strategy 5: Last resort - try popular static relays
  console.log("Trying fallback relays (last resort)");
  const fallbackRelays = [
    "wss://relay.nostr.band",
    "wss://nos.lol",
    "wss://nostr.mom"
  ];
  const video = await NostrClient.getEventsFromRelays(fallbackRelays, filter);
  
  if (video) {
    console.log("✓ Found video via fallback relays");
    return sanitizeNostrEvent(video);
  }

  // Not found anywhere
  console.warn("✗ Video not found on any relays");
  return createNotFoundVideoPlaceholder(videoId);
}

function showError(message) {
showTemporaryNotification(message);
}

function renderVideoPage(video, videoId, pageHash, shouldAutoplay = false) {
  let url = getValueFromTags(video, "url", "No URL found");
  let mimeType = getValueFromTags(video, "m", "Unknown MIME type");
  let title = escapeHtml(getValueFromTags(video, "title", "Untitled"));
  let content = escapeHtml(video.content);
  let relativeTime = escapeHtml(getRelativeTime(video.created_at));
  let pubkey = escapeHtml(video.pubkey);

  mainContent.innerHTML = `
<div class="video-page-layout">
  <div id="video-page-playlist" class="video-page-playlist hidden"></div>
  <div class="video-container"></div>
  <div class="scrollable-content">
    <div class="video-info-bar">
      <div class="channel-info">
        <div class="creator-image"></div>
        <div class="creator-name"></div>
      </div>
      <div class="video-action-tabs">
        <div class="tab-scroll-container">
          <button id="action-like-btn" class="video-action-tab-button">
            <span class="like-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                stroke-width="1.5" stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </span>
            <span class="like-text">Like</span>
            <span class="like-count">0</span>
          </button>
          <button id="action-comment-btn" class="video-action-tab-button">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            Comment
          </button>
          <button id="action-share-btn" class="video-action-tab-button"><svg xmlns="http://www.w3.org/2000/svg"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
            </svg>
            Share</button>
          <button id="action-bookmark-btn" class="video-action-tab-button"><svg xmlns="http://www.w3.org/2000/svg"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
            Bookmark</button>
          <button id="action-playlist-btn" class="video-action-tab-button"><svg xmlns="http://www.w3.org/2000/svg"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122" />
            </svg>
            Add to Playlist</button>
          <button id="action-more-btn" class="video-action-tab-button"><svg xmlns="http://www.w3.org/2000/svg"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            More</button>
        </div>
      </div>
    </div>

<div class="info-tabs-wrapper">
  <div class="info-tabs-header">
    <button class="info-tab-button active" data-tab="social-info">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
      About
    </button>
    <button class="info-tab-button" data-tab="technical-info">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Blob
    </button>
    <button class="info-tab-button" data-tab="comments-info">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
      Comments (<span id="comment-count">0</span>)
    </button>
  </div>
  
  <div class="info-tabs-content">
    <div class="info-tab-panel active" data-panel="social-info">
      <div class="social-data">
        <div class="video-title-header">
          <h3 class="video-title-text"></h3>
        </div>
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

<div class="extra-tags-section">
  <h4>Additional Information:</h4>
  <div class="extra-tags-content"></div>
</div>        
      </div>
    </div>

    <div class="info-tab-panel" data-panel="technical-info">
      <div class="technical-data">
        <div class="technical-summary-header">
          <h3 class="technical-summary"></h3>
        </div>
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
          <button class="validate-blossom-btn">Validate Blossom</button>
          <button class="full-check-btn" style="display: none;">Full Metadata Check</button>
          <div id="validationResults" class="validation-results"></div>
        </div>
      </div>
    </div>

    <div class="info-tab-panel" data-panel="comments-info">
      <div class="comments-container"></div>
    </div>
  </div>
</div>
  </div>
</div>
  `;

  let videoContainer = mainContent.querySelector(".video-container");
  handleVideoPlayback(videoContainer, url, videoId, video, pageHash, shouldAutoplay);
  setupVideoPageContent(video, videoId, title, content, relativeTime, pubkey, mimeType, url);
  
  // Load comments after delay
  setTimeout(() => {
    renderComments(videoId, video);
  }, 1000);

  updateVideoPagePlaylistInfo();
}

function setupVideoPageContent(video, videoId, title, content, relativeTime, pubkey, mimeType, url) {
  const pageKey = app.currentPageCleanupKey || 'videoPage_default';
  
  // Channel info
  let channelInfo = mainContent.querySelector(".channel-info");
  let channelImage = document.createElement("nostr-picture");
  channelImage.className = "channel-image";
  channelImage.setAttribute("pubkey", pubkey);
  
  let channelName = document.createElement("nostr-name");
  channelName.className = "channel-name";
  channelName.setAttribute("pubkey", pubkey);
  
  channelInfo.children[0].appendChild(channelImage);
  channelInfo.children[1].appendChild(channelName);

  // Add zap button
  const zapContainer = document.createElement('div');
  zapContainer.className = 'channel-zap-container';
  channelInfo.appendChild(zapContainer);
  setupVideoZapButton(zapContainer, video, videoId, pubkey);

  // Click handlers
  addTrackedEventListener(channelImage, 'click', () => {
    window.location.hash = `#profile/${pubkey}`;
  }, pageKey);

  addTrackedEventListener(channelName, 'click', () => {
    window.location.hash = `#profile/${pubkey}`;
  }, pageKey);

  // Social info - using new tab structure
  mainContent.querySelector(".video-title-text").textContent = title;
  mainContent.querySelector(".video-description").textContent = content;
  mainContent.querySelector(".video-time").textContent = relativeTime;

  let videoTags = mainContent.querySelector(".video-tags");
  let videoRelays = mainContent.querySelector(".video-relays");

  // Extract and display tags (make them clickable)
  const tTags = video.tags.filter(tag => tag[0] === 't').map(tag => tag[1]);
  if (tTags.length > 0) {
    videoTags.innerHTML = '';
    tTags.forEach((tag, index) => {
      const tagSpan = document.createElement('span');
      tagSpan.textContent = tag;
      tagSpan.className = 'clickable-tag';
      tagSpan.style.cursor = 'pointer';
      
      // Tracked event listener
      const tagHandler = () => {
        window.location.hash = `#tag/params?tags=${tag}`;
      };
      addTrackedEventListener(tagSpan, 'click', tagHandler, pageKey);
      
      videoTags.appendChild(tagSpan);
      
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
    videoRelays.innerHTML = '';
    relayTags.forEach((relay, index) => {
      const relaySpan = document.createElement('span');
      relaySpan.textContent = relay;
      relaySpan.className = 'clickable-relay';
      relaySpan.style.cursor = 'pointer';
      
      // Tracked event listener
      const relayHandler = () => {
        window.location.hash = `#singlerelay/${relay}`;
      };
      addTrackedEventListener(relaySpan, 'click', relayHandler, pageKey);
      
      videoRelays.appendChild(relaySpan);
      
      if (index < relayTags.length - 1) {
        const separator = document.createTextNode(', ');
        videoRelays.appendChild(separator);
      }
    });
  } else {
    videoRelays.textContent = 'No relays specified';
  }

// Extract and display extra tags (after the relays section code)
const displayedTagTypes = ['title', 'thumb', 'published_at', 'alt', 'imeta', 't', 'relay', 'url', 'm', 'x', 'dim', 'size', 'image', 'fallback', 'duration', 'bitrate'];

const extraTags = video.tags.filter(tag => 
  tag[0] && // Has a tag name
  !displayedTagTypes.includes(tag[0]) && // Not already displayed
  tag[1] !== undefined && // Has a value
  tag[1] !== '' // Value is not empty
);

const extraTagsContent = mainContent.querySelector(".extra-tags-content");
const extraTagsSection = mainContent.querySelector(".extra-tags-section");

if (extraTags.length > 0) {
  extraTagsContent.innerHTML = '';
  
  extraTags.forEach(tag => {
    const tagName = tag[0];
    const tagValue = tag.slice(1).join(', '); // Join all values after tag name
    
    const tagRow = document.createElement('div');
    tagRow.className = 'extra-tag-row';
    tagRow.innerHTML = `
      <span class="extra-tag-key">${escapeHtml(tagName)}:</span>
      <span class="extra-tag-value">${escapeHtml(tagValue)}</span>
    `;
    
    extraTagsContent.appendChild(tagRow);
  });
  
  extraTagsSection.style.display = 'block';
} else {
  extraTagsSection.style.display = 'none';
}

  // Technical info processing
  const imetaTag = video.tags.find(tag => tag[0] === 'imeta');
  let directUrl = url;
  
  if (imetaTag) {
    // Parse imeta tag
    let mimeType = '';
    let dimensions = '';
    let xHash = '';
    let fileSize = '';
    
    // Extract data from imeta tag
    for (let i = 1; i < imetaTag.length; i++) {
      const item = imetaTag[i];
      if (item.startsWith('m ')) {
        mimeType = item.substring(2);
      } else if (item.startsWith('dim ')) {
        dimensions = item.substring(4);
      } else if (item.startsWith('x ')) {
        xHash = item.substring(2);
      } else if (item.startsWith('url ')) {
        directUrl = item.substring(4);
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
    
    // Check if this is a Blossom URL
    const isBlossomUrl = isBlosomUrl(directUrl);
    
    // Set technical summary (collapsed state)
    const fileExtension = mimeType.split('/')[1] || 'unknown';
    
    // Build summary with validation status
    let summaryParts = [fileExtension, dimensions];
    
    // Check if we already have validation results cached
/*     const cachedValidation = blossomValidationCache.get(directUrl);
    if (cachedValidation) {
      summaryParts.push(cachedValidation.isValid ? '🌸 verified' : '⚠ hash mismatch');
    } else if (isBlossomUrl) {
      summaryParts.push('blossom');
    }
     */
    /* if (isBlossomUrl) {
      summaryParts.push('blossom');
    } */
    if (fileSize) {
      summaryParts.push(fileSize);
    }
    
    let technicalSummary = mainContent.querySelector(".technical-summary");
    technicalSummary.textContent = summaryParts.join(' - ');

    // Set expanded technical data
    let technicalUrl = mainContent.querySelector(".technical-url");
    let technicalFilename = mainContent.querySelector(".technical-filename");
    let technicalHash = mainContent.querySelector(".technical-hash");
    
    technicalUrl.textContent = directUrl;
    technicalFilename.textContent = filename;
    technicalHash.textContent = xHash;

    let validateBtn = mainContent.querySelector(".validate-blossom-btn");
    let fullCheckBtn = mainContent.querySelector(".full-check-btn");
    let validationResults = mainContent.querySelector("#validationResults");

    validateBtn.textContent = 'Validate Blossom';
    // Update button text based on whether it's a Blossom URL
/*     if (isBlossomUrl) {
      validateBtn.textContent = 'Validate Blossom';
    } else {
      validateBtn.textContent = 'no blossom URL';
    } */

    // Validate button handler - tracked
const validateBtnHandler = async () => {
/*   if (!isBlossomUrl) {
    console.log("not a blossom URL");
    return;
  } */
  
  console.log('Manual Blossom validation triggered for:', directUrl);
  
  // Show loading state
  validationResults.innerHTML = '<div class="result loading">Preparing validation...</div>';
  validateBtn.disabled = true;
  
  // Download and validate with progress
  const updateProgress = (progress) => {
    if (progress.indeterminate) {
      validationResults.innerHTML = `
        <div class="result loading">
          <div class="progress-message">Downloading video...</div>
          <div class="progress-bar-container">
            <div class="progress-bar indeterminate">
              <div class="progress-fill"></div>
            </div>
          </div>
        </div>
      `;
    } else {
      validationResults.innerHTML = `
        <div class="result loading">
          <div class="progress-message">Downloading video...</div>
          <div class="progress-info">
            <span class="progress-size">${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress.percentage}%"></div>
            </div>
          </div>
        </div>
      `;
    }
  };
  
  const result = await validateBlossomInPlace(directUrl, updateProgress);
  
  // Display results with save button
  displayValidationResultWithSave(result, validationResults, mimeType);
  validateBtn.disabled = false;
};
    addTrackedEventListener(validateBtn, 'click', validateBtnHandler, pageKey);

    // Full check button handler - tracked
    const fullCheckBtnHandler = () => {
    // window.location.hash = `#blob/${encodeURIComponent(directUrl)}`;
    console.log("cclicked full checkk!");
    };
    addTrackedEventListener(fullCheckBtn, 'click', fullCheckBtnHandler, pageKey);
    
  } else {
    // No imeta tag found
    let technicalSummary = mainContent.querySelector(".technical-summary");
    let technicalUrl = mainContent.querySelector(".technical-url");
    let technicalFilename = mainContent.querySelector(".technical-filename");
    let technicalHash = mainContent.querySelector(".technical-hash");
    
    technicalSummary.textContent = 'No technical data available';
    technicalUrl.textContent = url;
    technicalFilename.textContent = 'N/A';
    technicalHash.textContent = 'N/A';
    
    let validateBtn = mainContent.querySelector(".validate-blossom-btn");
    validateBtn.textContent = 'Full Metadata Check';
    const validateBtnHandler = () => {
    //  window.location.hash = `#blob/${encodeURIComponent(url)}`;
    console.log("full metadata clicked!");
    };
    addTrackedEventListener(validateBtn, 'click', validateBtnHandler, pageKey);
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

    // Like button handler - tracked
    const likeBtnHandler = async () => {
      console.log(`Liked video: ${videoId} - ${title}`);

      if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
        showTemporaryNotification("❌ Please log in to like videos...");
        return;
      }

/*       const confirmed = await confirmModal(
        "Likes are public and permanent. Once published, they cannot be undone.",
        "Publish Kind-7 Event"
      );

      if (!confirmed) {
        console.log("User canceled the like action");
        return;
      } */

      try {
        likeBtn.disabled = true;
        likeTextSpan.textContent = "Liking...";

        const relayHint = app.relays && app.relays.length > 0 ? app.relays[0] : "";

        const reactionEvent = {
          kind: 7,
          created_at: Math.floor(Date.now() / 1000),
          content: "+",
          tags: [
            ["e", videoId, relayHint],
            ["p", video.pubkey, relayHint],
            ["k", video.kind.toString()],
          ],
        };

        console.log("Creating reaction event:", reactionEvent);

        const signedReactionEvent = await handleEventSigning(reactionEvent);

        console.log("Reaction event signed successfully:", signedReactionEvent);

        if (app.relays && app.relays.length > 0) {
          const pool = new window.NostrTools.SimplePool();

          try {
            const result = await publishEvent(signedReactionEvent, null, {
              successMessage: "Like reaction published successfully",
              errorMessage: "Failed to publish like reaction",
            });

            if (result.success) {
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

        likeBtn.disabled = false;
        likeTextSpan.textContent = "Like";
      }
    };
    addTrackedEventListener(likeBtn, 'click', likeBtnHandler, pageKey);

  } else {
    // User not logged in - tracked handler
    const likeLoginHandler = () => {
      showTemporaryNotification("❌ Please log in to like videos!!");
    };
    addTrackedEventListener(likeBtn, 'click', likeLoginHandler, pageKey);
  }

  let commentBtn = mainContent.querySelector("#action-comment-btn");
  const commentBtnHandler = () => {
    // Switch to comments tab
    const commentsTabButton = document.querySelector('[data-tab="comments-info"]');
    if (commentsTabButton) {
      commentsTabButton.click();
    }
    // Open comment modal
    openCommentModal(videoId, video);
  };
  addTrackedEventListener(commentBtn, 'click', commentBtnHandler, pageKey);
  
  // Bookmark button handler - tracked
  const bookmarkBtnHandler = () => {
    console.log(`Bookmark video: ${videoId} - ${title}`);

    const isSaved = isVideoBookmarked(videoId);

    if (isSaved) {
      const success = removeVideoFromBookmarks(videoId);
      if (success) {
        bookmarkBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
          Bookmark
        `;
        bookmarkBtn.classList.remove("saved");
        showTemporaryNotification("Video removed from your local bookmarks");
      }
    } else {
      const success = addVideoToBookmarks(video, videoId);
      if (success) {
        bookmarkBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
          Bookmarked
        `;
        bookmarkBtn.classList.add("saved");
        showTemporaryNotification("Video added to your local bookmarks");
      }
    }
  };
  addTrackedEventListener(bookmarkBtn, 'click', bookmarkBtnHandler, pageKey);

  // Playlist button handler - tracked
  const playlistBtnHandler = () => {
    console.log(`Add to playlist: ${videoId} - ${title}`);
    showPlaylistSelector(video, videoId, {
      title: title,
      url: url,
      mimeType: mimeType,
      content: content,
      relativeTime: relativeTime,
      pubkey: pubkey,
    });
  };
  addTrackedEventListener(playlistBtn, 'click', playlistBtnHandler, pageKey);

  // Set initial bookmark button state
  if (isVideoBookmarked(videoId)) {
    bookmarkBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
      Bookmarked
    `;
    bookmarkBtn.classList.add("saved");
  } else {
    bookmarkBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
      Bookmark
    `;
    bookmarkBtn.classList.remove("saved");
  }

  let shareBtn = mainContent.querySelector("#action-share-btn");
  let moreBtn = mainContent.querySelector("#action-more-btn");

  // Share button handler - tracked
  const shareBtnHandler = (e) => {
    console.log('Share button clicked');
    showShareMenu(shareBtn, video, videoId, url);
  };
  addTrackedEventListener(shareBtn, 'click', shareBtnHandler, pageKey);

  // More button handler - tracked
  const moreBtnHandler = (e) => {
    console.log('More button clicked');  
    showMoreMenu(moreBtn, video, videoId, url);
  };
  addTrackedEventListener(moreBtn, 'click', moreBtnHandler, pageKey);

  // Setup info tabs
  setupInfoTabs();
}

function setupInfoTabs() {
  const pageKey = app.currentPageCleanupKey || 'videoPage_default';
  const tabButtons = document.querySelectorAll('.info-tab-button');
  const tabPanels = document.querySelectorAll('.info-tab-panel');

  tabButtons.forEach(button => {
    const tabClickHandler = () => {
      const targetTab = button.dataset.tab;
      
      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      const targetPanel = document.querySelector(`[data-panel="${targetTab}"]`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    };
    
    addTrackedEventListener(button, 'click', tabClickHandler, pageKey);
  });
}
//////////////////////////
////////////////////////////
function extractHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error("Invalid URL:", url);
    return null;
  }
}

// Helper function to check whitelist and handle video playback
function handleVideoPlayback(videoContainer, url, videoId, video, pageHash, shouldAutoplay) {
  const hostname = extractHostname(url);
  
  if (!hostname) {
    showError("Invalid video URL");
    return;
  }
  
  // Check if server is in whitelist
  const isWhitelisted = app.mediaServerWhitelist.includes(hostname);
  
  if (isWhitelisted) {
    // Server is whitelisted, play video directly
    VideoPlayer.render(videoContainer, url, videoId, video, pageHash, shouldAutoplay);
  } else {
    // Server is not whitelisted, show prompt
    renderWhitelistPrompt(videoContainer, hostname, url, videoId, video, pageHash, shouldAutoplay);
  }
}

// Render the whitelist prompt
function renderWhitelistPrompt(videoContainer, hostname, url, videoId, video, pageHash, shouldAutoplay) {
  videoContainer.innerHTML = `
    <div class="whitelist-prompt">
      <div class="whitelist-prompt-content">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="whitelist-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p>This video is hosted on <strong>${escapeHtml(hostname)}</strong>, which is not in your trusted media servers list.</p>
        <div class="whitelist-prompt-actions">
          <button id="add-to-whitelist-btn" class="btn-primary">Add to Whitelist & Play</button>
          <button id="cancel-whitelist-btn" class="btn-secondary" style="display: none;">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  const addBtn = videoContainer.querySelector("#add-to-whitelist-btn");
  const cancelBtn = videoContainer.querySelector("#cancel-whitelist-btn");
  
  addTrackedEventListener(
    addBtn,
    "click",
    () => {
      // Add server to whitelist
      app.mediaServerWhitelist.push(hostname);
      localStorage.setItem("mediaServerWhitelist", JSON.stringify(app.mediaServerWhitelist));
      
      // Clear the prompt and render video player
      videoContainer.innerHTML = "";
      VideoPlayer.render(videoContainer, url, videoId, video, pageHash, shouldAutoplay);
      
      showTemporaryNotification(`${hostname} has been added to your whitelist`);
    },
    app.currentPageCleanupKey
  );
  
  addTrackedEventListener(
    cancelBtn,
    "click",
    () => {
      window.location.hash = "#";
    },
    app.currentPageCleanupKey
  );
}

function removeServerFromWhitelist(url) {
  const hostname = extractHostname(url);
  
  if (!hostname) {
    console.log("Invalid video URL");
    return false;
  }
  
  // Check if server is in whitelist
  const index = app.mediaServerWhitelist.indexOf(hostname);
  
  if (index === -1) {
    showTemporaryNotification(`${hostname} is not in your whitelist`);
    return false;
  }
  
  // Remove from whitelist
  app.mediaServerWhitelist.splice(index, 1);
  localStorage.setItem("mediaServerWhitelist", JSON.stringify(app.mediaServerWhitelist));
  
  showTemporaryNotification(`${hostname} has been removed from your whitelist`);
  return true;
}


/////////////////////
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
async function showMoreMenu(buttonElement, video, videoId, url) {
  if (moreMenuControls && moreMenuControls.isOpen()) {
    moreMenuControls.close();
    return;
  }

  if (!moreMenuControls) {
    await createMoreMenu(buttonElement, video, videoId, url);
  }

  moreMenuControls.open();
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
    // Clean up tracked listeners
    const cleanupKey = menuElement.dataset.cleanupKey;
    if (cleanupKey) {
      removeTrackedEventListeners(cleanupKey);
    }
    
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
async function createMoreMenu(buttonElement, video, videoId, url) {
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
    // Clean up tracked listeners
    const cleanupKey = menuElement.dataset.cleanupKey;
    if (cleanupKey) {
      removeTrackedEventListeners(cleanupKey);
    }
    
    originalOnClose.call(this);
    if (overlayElement.parentNode) {
      overlayElement.remove();
    }
    moreMenuControls = null;
  }, 150);
};

  // Set up event listeners
  setupMoreMenuEvents(menuElement, video, videoId, url);
  
  // Store reference in app object
  if (app.overlayControls) {
    app.overlayControls.more = moreMenuControls;
  }
}

function setupShareMenuEvents(menuElement, video, videoId, url) {
    const menuKey = `shareMenu_${Date.now()}`;

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

    // Store key for cleanup
  menuElement.dataset.cleanupKey = menuKey;
}
function setupMoreMenuEvents(menuElement, video, videoId, url) {
    const menuKey = `moreMenu_${Date.now()}`;

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
    removeServerFromWhitelist(url);
    moreMenuControls?.close();
  });
  
    // Store key for cleanup
  menuElement.dataset.cleanupKey = menuKey;
  
}

/////////////////////

function addVideoToBookmarks(video, videoId) {
  try {
    if (!app.bookmarkedVideos) {
      app.bookmarkedVideos = {
        ...config.defaultBookmarkedVideos,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const eTag = ["e", videoId];

    const existingIndex = app.bookmarkedVideos.tags.findIndex(
      (tag) => tag[0] === "e" && tag[1] === videoId
    );

    if (existingIndex === -1) {

      app.bookmarkedVideos.tags.push(eTag);

      localStorage.setItem(
        "bookmarkedVideos",
        JSON.stringify(app.bookmarkedVideos)
      );

      console.log("Added video to bookmarks:", videoId);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error adding video to bookmarks:", error);
    return false;
  }
}

function removeVideoFromBookmarks(videoId) {
  try {
    if (!app.bookmarkedVideos) return false;

    const initialLength = app.bookmarkedVideos.tags.length;

    app.bookmarkedVideos.tags = app.bookmarkedVideos.tags.filter(
      (tag) => !(tag[0] === "e" && tag[1] === videoId)
    );

    if (app.bookmarkedVideos.tags.length < initialLength) {
      localStorage.setItem(
        "bookmarkedVideos",
        JSON.stringify(app.bookmarkedVideos)
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
  if (!app.bookmarkedVideos) return false;

  return app.bookmarkedVideos.tags.some(
    (tag) => tag[0] === "e" && tag[1] === videoId
  );
}

function showPlaylistSelector(video, videoId, additionalData, relayUrl = null) {
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

                const videoCount = playlist.tags.filter((tag) => tag[0] === "e").length;

                const hasVideo = playlist.tags.some(
                  (tag) => tag[0] === "e" && tag[1] === videoId
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
  const success = addVideoToPlaylist(dTag, videoId, relayUrl); // Pass relayUrl

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

    const success = addVideoToPlaylist(dTag, videoId, relayUrl); // Pass relayUrl

    if (success) {
      showTemporaryNotification(`Video added to "${playlistName}"`);
      closeModal();
    }
  });
});

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
    
    const reactionEvents = await pool.querySync(app.relays || [], {
      kinds: [7],
      authors: [currentUserPk],
      "#e": [videoId],
      limit: 1,
    });

//    pool.close(app.relays || []);
    
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




//////////////////////////
async function setupPlaylistIfNeeded(playlistPubkey, playlistDTag, currentVideoId) {
  // If no playlist params, clear current playlist
  if (!playlistPubkey || !playlistDTag) {
    if (app.currentPlaylist) {
      console.log("No playlist params - moving current playlist to history");
      addPlaylistToHistory(app.currentPlaylist);
      app.currentPlaylist = null;
      app.currentPlaylistIndex = 0;
    }
    return;
  }

  // Try to find the playlist
  let playlist = null;
  
  if (playlistPubkey === 'local') {
    // Find in local playlists
    playlist = (app.playlists || []).find(p => 
      getValueFromTags(p, "d", "") === playlistDTag && 
      (p.pubkey === "local" || p.sig === "local")
    );
  } else {
    // Find in bookmarked playlists first
    playlist = (app.bookmarkedPlaylists || []).find(p => 
      p.pubkey === playlistPubkey && 
      getValueFromTags(p, "d", "") === playlistDTag
    );
    
    // If not bookmarked, try to fetch from network
    if (!playlist) {
      try {
        const extendedRelays = await getExtendedRelaysForProfile(playlistPubkey);
        const result = await NostrClient.getEventsFromRelays(extendedRelays, {
          kinds: [30005],
          authors: [playlistPubkey],
          tags: { d: [playlistDTag] },
          limit: 1,
        });
        playlist = Array.isArray(result) ? result[0] : result;
      } catch (error) {
        console.error("Error fetching playlist from network:", error);
      }
    }
  }

  if (!playlist) {
    console.warn("Playlist not found, continuing without playlist");
    return;
  }

  const videoTags = playlist.tags.filter(tag => tag[0] === "e");
  
  const videoIndex = videoTags.findIndex(tag => tag[1] === currentVideoId);

  if (videoIndex === -1) {
    console.warn("Current video not found in playlist");
    return;
  }

  // Check if this is a different playlist
  const currentIdentifier = app.currentPlaylist ? 
    `${app.currentPlaylist.pubkey}:${getValueFromTags(app.currentPlaylist, "d", "")}` : null;
  const newIdentifier = `${playlist.pubkey}:${getValueFromTags(playlist, "d", "")}`;

  if (currentIdentifier && currentIdentifier !== newIdentifier) {
    console.log("Different playlist - moving current to history");
    addPlaylistToHistory(app.currentPlaylist);
  }

  // Set as current playlist
  app.currentPlaylist = playlist;
  app.currentPlaylistIndex = videoIndex;
  
  console.log(`Playlist set: ${getValueFromTags(playlist, "title", "Untitled")} (${videoIndex + 1}/${videoTags.length})`);
}

function addPlaylistToHistory(playlist) {
  if (!playlist) return;
  
  const history = app.playlistHistory || [];
  const identifier = `${playlist.pubkey}:${getValueFromTags(playlist, "d", "")}`;
  
  // Check if playlist already exists in history
  const existingIndex = history.findIndex(p => 
    `${p.pubkey}:${getValueFromTags(p, "d", "")}` === identifier
  );
  
  if (existingIndex !== -1) {
    // Remove the existing entry
    history.splice(existingIndex, 1);
  }
  
  // Add playlist with new timestamp
  history.push({
    ...playlist,
    addedToHistoryAt: Math.floor(Date.now() / 1000)
  });
  
  // Keep only last 50 playlists in history
  if (history.length > 50) {
    history.splice(0, history.length - 50);
  }
  
  app.playlistHistory = history;
  localStorage.setItem("playlistHistory", JSON.stringify(history));
}

function updateVideoPagePlaylistInfo() {
  const playlistElement = document.getElementById('video-page-playlist');
  
  if (!playlistElement) return;
  
  if (!app.currentPlaylist) {
    playlistElement.classList.add('hidden');
    // Reset chat input position when no playlist
    updateChatInputPosition(0);
    return;
  }
  
  const title = getValueFromTags(app.currentPlaylist, "title", "Playlist");
  const videoTags = app.currentPlaylist.tags.filter(tag => tag[0] === "e");
  const totalVideos = videoTags.length;
  const currentPosition = app.currentPlaylistIndex + 1;
  
  playlistElement.innerHTML = `
    <div class="playlist-content">
      <div class="playlist-title">📋 ${escapeHtml(title)}</div>
      <div class="playlist-position">${currentPosition}/${totalVideos}</div>
      <div class="playlist-controls">
        <button class="playlist-prev-btn" ${app.currentPlaylistIndex === 0 ? 'disabled' : ''}>⏮</button>
        <button class="playlist-next-btn" ${app.currentPlaylistIndex >= totalVideos - 1 ? 'disabled' : ''}>⏭</button>
      </div>
    </div>
  `;
  
  playlistElement.classList.remove('hidden');
  
  // Update chat input position to account for playlist height
  setTimeout(() => {
    const playlistHeight = playlistElement.offsetHeight;
    updateChatInputPosition(playlistHeight);
  }, 0);
  
  // Add event listeners for the buttons
  const prevBtn = playlistElement.querySelector('.playlist-prev-btn');
  const nextBtn = playlistElement.querySelector('.playlist-next-btn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', playPreviousInPlaylist);
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', playNextInPlaylist);
  }
}

function updateChatInputPosition(playlistHeight) {
  const chatInputContainer = document.querySelector('.video-page-layout .chat-input-container');
  if (chatInputContainer) {
    chatInputContainer.style.setProperty('--playlist-height', `${playlistHeight}px`);
    chatInputContainer.style.top = `${playlistHeight}px`;
  }
}

function createNotFoundVideoPlaceholder(videoId) {
  return {
    id: videoId,
    pubkey: "0000000000000000000000000000000000000000000000000000000000000000",
    created_at: Math.floor(Date.now() / 1000),
    kind: 21,
    content: "This video could not be found on the connected relays.",
    tags: [
      ["title", "Video Not Found"],
      ["url", "not-found"], // Special marker
      ["m", "video/mp4"],
      ["t", "not-found"]
    ],
    sig: "placeholder"
  };
}