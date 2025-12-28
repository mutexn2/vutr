// Helper functions at module level (outside createVideoCard)
const getValueFromTagsForVideoCard = (tags, key, defaultValue = "") => {
  let tag = tags?.find((t) => t[0] === key);
  return tag ? tag[1] : defaultValue;
};

const formatDurationForCard = (duration) => {
  if (!duration) return "";
  let durationFloat = parseFloat(duration);
  if (isNaN(durationFloat)) return "";
  let minutes = Math.floor(durationFloat / 60);
  let seconds = Math.floor(durationFloat % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const extractFromImetaForCard = (imetaTags, key) => {
  let values = [];
  imetaTags.forEach((tag) => {
    tag.slice(1).forEach((item) => {
      if (item.startsWith(`${key} `)) {
        values.push(item.substring(key.length + 1));
      }
    });
  });
  return values;
};

const truncateTextForCard = (text, maxLength = 80) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

function createVideoCard(video) {
  if (!video || !video.id) return document.createElement("div");

  // ===== CHECK CONTENT WARNING SETTINGS =====
  const contentWarnings =
    video.tags
      ?.filter((tag) => tag[0] === "content-warning")
      .map((t) => t[1]) || [];
  const hasContentWarning = contentWarnings.length > 0;

  const showContentWarning =
    localStorage.getItem("showContentWarning") !== "false"; // Default true
  const replaceThumbnail = localStorage.getItem("replaceThumbnail") !== "false"; // Default true

  // If content has warnings and user doesn't want to see them, return empty div
  if (hasContentWarning && !showContentWarning) {
    return document.createElement("div"); // Empty div, won't be displayed
  }

  // ===== CHECK THUMBNAIL SETTINGS =====
  const noThumbnail = localStorage.getItem("noThumbnail") === "true";

  // Extract all data first
  let title = getValueFromTagsForVideoCard(video.tags, "title", "Untitled");
  let content = video.content?.trim() || "";
  let timeAgo = getRelativeTime(video.created_at);
  let imetaTags = video.tags?.filter((tag) => tag[0] === "imeta") || [];

  // Extract thumbnail with proper priority
  let thumbnailSrc = "";
  let blurhashValue = getBlurhashFromVideoEvent(video);
  let blurhashDataUrl = null;

  // Generate blurhash data URL if blurhash exists
  if (blurhashValue) {
    blurhashDataUrl = createBlurhashDataUrl(blurhashValue);
  }

  // Priority 1: Standalone "thumb" tag
  let thumbTag = video.tags?.find((tag) => tag[0] === "thumb");
  if (thumbTag?.[1]) {
    thumbnailSrc = thumbTag[1];
  }

  // Priority 2: "image" in imeta tags
  if (!thumbnailSrc && imetaTags.length > 0) {
    let imagesFromImeta = extractFromImetaForCard(imetaTags, "image");
    thumbnailSrc = imagesFromImeta[0] || "";
  }

  // Priority 3: Standalone "image" tag (outside imeta)
  if (!thumbnailSrc) {
    let imageTag = video.tags?.find((tag) => tag[0] === "image");
    thumbnailSrc = imageTag?.[1] || "";
  }

  // Priority 4: "thumb" in imeta tags
  if (!thumbnailSrc && imetaTags.length > 0) {
    let imagesFromImeta = extractFromImetaForCard(imetaTags, "thumb");
    thumbnailSrc = imagesFromImeta[0] || "";
  }

  // Fallback: Use blurhash if no thumbnail found, otherwise default thumbnail
  if (!thumbnailSrc) {
    thumbnailSrc =
      blurhashDataUrl ||
      "https://image.nostr.build/662cb74c106987b87d85e3d55baf066049db91b03f866346677b11dc16b0c986.gif";
  }

  let originalThumbnailSrc = sanitizeUrl(thumbnailSrc);

  // Decide whether to replace thumbnail
  let shouldReplaceThumbnail = hasContentWarning && replaceThumbnail;
  let finalThumbnailSrc = shouldReplaceThumbnail
    ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect width='400' height='225' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23fff' font-size='20' font-family='Arial'%3E⚠️ Content Warning%3C/text%3E%3C/svg%3E"
    : originalThumbnailSrc;

  // Extract duration: check imeta first, then standalone tag
  let duration = extractFromImetaForCard(imetaTags, "duration")[0];
  if (!duration) {
    duration = getValueFromTagsForVideoCard(video.tags, "duration");
  }
  let formattedDuration = formatDurationForCard(duration || "");

  let dimensions = extractFromImetaForCard(imetaTags, "dim")[0] || "";
  let description = truncateTextForCard(content);

  // BLOSSOM VALIDATION
  let isValidBlossom = false;
  const imetaTag = video.tags?.find((tag) => tag[0] === "imeta");

  if (imetaTag) {
    const xHash = imetaTag.find((item) => item.startsWith("x "))?.substring(2);
    const directUrl = imetaTag
      .find((item) => item.startsWith("url "))
      ?.substring(4);

    if (xHash && directUrl) {
      try {
        const filename = new URL(directUrl).pathname
          .split("/")
          .pop()
          ?.split(".")[0];
        isValidBlossom = filename === xHash;
      } catch (e) {
        // Invalid URL, keep isValidBlossom as false
      }
    }
  }

  // EXTRACT SIZE FROM IMETA
  let fileSize = null;
  const sizeValues = extractFromImetaForCard(imetaTags, "size");
  if (sizeValues.length > 0) {
    const sizeBytes = parseInt(sizeValues[0]);
    if (!isNaN(sizeBytes)) {
      fileSize = formatBytes(sizeBytes);
    }
  }

  let participants =
    video.tags?.filter((tag) => tag[0] === "p").map((p) => p[1]) || [];
  let hashtags =
    video.tags?.filter((tag) => tag[0] === "t").map((t) => t[1]) || [];
  let referenceLinks =
    video.tags?.filter((tag) => tag[0] === "r").map((r) => r[1]) || [];
  let textTracks =
    video.tags
      ?.filter((tag) => tag[0] === "text-track")
      .map((track) => ({
        event: track[1],
        relay: track[2],
      })) || [];
  let segments =
    video.tags
      ?.filter((tag) => tag[0] === "segment")
      .map((segment) => ({
        start: segment[1],
        end: segment[2],
        title: segment[3],
        thumbnail: segment[4],
      })) || [];

  // Create the bottom right indicators HTML
  let bottomRightHTML = "";
  if (fileSize || isValidBlossom) {
    if (fileSize) {
      bottomRightHTML = `<span class="file-size">${fileSize}</span>`;
    }
    if (isValidBlossom) {
      bottomRightHTML += '<span class="blossom-indicator">🌸</span>';
    }
  }

  // Create static HTML skeleton
  let card = document.createElement("div");
  card.className = "video-card";
  card.dataset.videoId = video.id;
  card.dataset.pubkey = video.pubkey;
  card.innerHTML = `
    <div class="metadata">
       ${bottomRightHTML}
        <span class="time"></span>
    </div>
    ${
      !noThumbnail
        ? `<div class="thumbnail-container">
      ${
        shouldReplaceThumbnail
          ? `<div class="content-warning-overlay">${contentWarnings
              .map((w) => `⚠️ ${w}`)
              .join(" • ")}</div>`
          : ""
      }
      <img class="thumbnail" loading="lazy" />
    </div>`
        : ""
    }
    <div class="video-info">
      <h3 class="title"></h3>
      <div class="creator">
        <div class="creator-image"></div>
        <div class="creator-name"></div>
      </div>

      <button class="options-button" type="button" aria-label="Video options">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
    </div>
  `;

  // Get references to elements that need dynamic content
  let thumbnailImg = !noThumbnail ? card.querySelector(".thumbnail") : null;
  let titleElement = card.querySelector(".title");
  let creatorImageContainer = card.querySelector(".creator-image");
  let creatorNameContainer = card.querySelector(".creator-name");
  let timeElement = card.querySelector(".time");
  let metadataContainer = card.querySelector(".metadata");
  let videoInfoContainer = card.querySelector(".video-info");
  let optionsButton = card.querySelector(".options-button");
  let creatorSection = card.querySelector(".creator");

// Set dynamic content programmatically
// Only set thumbnail if thumbnails are enabled
if (!noThumbnail && thumbnailImg) {
  // Set blurhash as initial thumbnail if available, then load actual image
  if (blurhashDataUrl && finalThumbnailSrc !== blurhashDataUrl) {
    // Show blurhash first
    thumbnailImg.src = blurhashDataUrl;
    thumbnailImg.style.filter = 'blur(0px)'; // Blurhash is already blurred
    
    // Load actual thumbnail in background
    const actualImg = new Image();
    actualImg.onload = () => {
      thumbnailImg.src = finalThumbnailSrc;
      thumbnailImg.style.filter = ''; // Remove any filter when actual image loads
    };
    actualImg.onerror = () => {
      // Keep blurhash if actual image fails to load
      console.warn('Failed to load thumbnail, keeping blurhash');
    };
    actualImg.src = finalThumbnailSrc;
  } else {
    // No blurhash, load thumbnail directly
    thumbnailImg.src = finalThumbnailSrc;
  }
  thumbnailImg.alt = title;
}

  titleElement.textContent = truncateTextForCard(title, 50);
  titleElement.title = title;

  timeElement.textContent = timeAgo;

  if (formattedDuration && !noThumbnail) {
    let durationSpan = document.createElement("span");
    durationSpan.className = "duration";
    durationSpan.textContent = formattedDuration;
    card.querySelector(".thumbnail-container").appendChild(durationSpan);
  }

  let creatorImage = document.createElement("nostr-picture");
  creatorImage.className = "channel-image";
  creatorImage.setAttribute("pubkey", video.pubkey);
  creatorImageContainer.appendChild(creatorImage);

  let creatorName = document.createElement("nostr-name");
  creatorName.className = "channel-name";
  creatorName.setAttribute("pubkey", video.pubkey);
  creatorNameContainer.appendChild(creatorName);

  creatorSection.addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.hash = `#profile/${video.pubkey}`;
  });

  if (dimensions) {
    let qualitySpan = document.createElement("span");
    qualitySpan.className = "quality";
    qualitySpan.textContent = dimensions;
    metadataContainer.appendChild(qualitySpan);
  }

  if (description) {
    let descriptionP = document.createElement("p");
    descriptionP.className = "description";
    descriptionP.textContent = description;
    videoInfoContainer.appendChild(descriptionP);
  }

  if (participants.length) {
    let participantsDiv = document.createElement("div");
    participantsDiv.className = "participants";
    participantsDiv.appendChild(document.createTextNode("Participants: "));

    participants.forEach((pubkey, index) => {
      if (index > 0) participantsDiv.appendChild(document.createTextNode(", "));
      let participantName = document.createElement("nostr-name");
      participantName.setAttribute("pubkey", pubkey);
      participantsDiv.appendChild(participantName);
    });

    videoInfoContainer.appendChild(participantsDiv);
  }

  if (hashtags.length) {
    let hashtagsDiv = document.createElement("div");
    hashtagsDiv.className = "hashtags";
    hashtagsDiv.textContent = `Tags: ${hashtags
      .map((t) => `#${t}`)
      .join(", ")}`;
    videoInfoContainer.appendChild(hashtagsDiv);
  }

  if (referenceLinks.length) {
    let linksDiv = document.createElement("div");
    linksDiv.className = "links";
    linksDiv.appendChild(document.createTextNode("Links: "));

    referenceLinks.forEach((url, index) => {
      if (index > 0) linksDiv.appendChild(document.createTextNode(", "));
      let link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.textContent = url;
      linksDiv.appendChild(link);
    });

    videoInfoContainer.appendChild(linksDiv);
  }

  // Show content warnings in card info if present
  if (hasContentWarning) {
    let warningDiv = document.createElement("div");
    warningDiv.className = "content-warning";
    warningDiv.textContent = `⚠️`;
    metadataContainer.appendChild(warningDiv);
  }

  if (textTracks.length) {
    let textTracksDiv = document.createElement("div");
    textTracksDiv.className = "text-tracks";
    textTracksDiv.textContent = `Subtitles: ${textTracks.length}`;
    videoInfoContainer.appendChild(textTracksDiv);
  }

  if (segments.length) {
    let segmentsDiv = document.createElement("div");
    segmentsDiv.className = "segments";
    segmentsDiv.textContent = `Segments: ${segments.length}`;
    videoInfoContainer.appendChild(segmentsDiv);
  }

  // Options menu functionality
  optionsButton.addEventListener("click", (e) => {
    e.stopPropagation();
    showVideoCardMenu(optionsButton, video, title);
  });

  return card;
}


//////////////////////////////////////////////
//////////////////////////////////////
let videoCardMenuControls = null;
let currentVideoCardData = null;


async function showVideoCardMenu(buttonElement, video, title) {
  // If menu exists and it's for a different video, close it first
  if (videoCardMenuControls && videoCardMenuControls.isOpen() && currentVideoCardData?.id !== video.id) {
    videoCardMenuControls.close();
    videoCardMenuControls = null;
  }
  
  // If menu exists for same video, toggle it
  if (videoCardMenuControls && videoCardMenuControls.isOpen() && currentVideoCardData?.id === video.id) {
    videoCardMenuControls.close();
    return;
  }

  // If menu doesn't exist, create it
  if (!videoCardMenuControls || currentVideoCardData?.id !== video.id) {
    await createVideoCardMenu(buttonElement, video, title);
  }

  // Open the menu
  videoCardMenuControls.open();
}

async function createVideoCardMenu(buttonElement, video, title) {
  // Store current video data
  currentVideoCardData = video;
  
  // Create overlay container
  let overlayElement = document.createElement('div');
  overlayElement.id = 'video-card-overlay';
  overlayElement.classList.add('menu-overlay');
  
  let menuElement = document.createElement('div');
  menuElement.id = 'video-card-menu';
  menuElement.classList.add('settings-menu');
  
  menuElement.innerHTML = `
    <div class="menu-container">
      <div class="menu-header">
        <div class="user-info">
          ${title}
        </div>
      </div>
      
      <div class="menu-items">
        <button class="menu-item video-add-playlist">
          <span class="item-icon">📋</span>
          <span class="item-text">Add to Playlist</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item video-mute-user">
          <span class="item-icon">🔇</span>
          <span class="item-text">Mute User</span>
        </button>
        <button class="menu-item video-report">
          <span class="item-icon">🚩</span>
          <span class="item-text">Report</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item video-show-json">
          <span class="item-icon">📄</span>
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
  videoCardMenuControls = createOverlayControls("video-card", overlayElement, {
    closeOnOutsideClick: true,
    closeOnEscape: true,
    preventBodyScroll: false
  });

  // Override onOpen and onClose for animations
  const originalOverlay = OverlayManager.overlays.get("video-card");
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
      videoCardMenuControls = null;
      currentVideoCardData = null;
    }, 150);
  };

  setupVideoCardMenuEvents(menuElement, video);
  
  // Store reference in app object (optional)
  if (app.overlayControls) {
    app.overlayControls.videoCard = videoCardMenuControls;
  }
}

function setupVideoCardMenuEvents(menuElement, video) {
  menuElement.querySelector('.video-add-playlist')?.addEventListener('click', () => {
    console.log('Add to Playlist clicked for video:', video.id);
    
    let title = getValueFromTagsForVideoCard(video.tags, "title", "Untitled");
    let url = getValueFromTagsForVideoCard(video.tags, "url", "No URL found");
    let mimeType = getValueFromTagsForVideoCard(video.tags, "m", "Unknown MIME type");
    let content = video.content?.trim() || "";
    let relativeTime = getRelativeTime(video.created_at);
    let pubkey = video.pubkey;
    
    // Check if video has a "relay" tag, use the first one if it exists, if not then a random from app.relays
    const relayTag = video.tags?.find(tag => tag[0] === "relay");
    const relayUrl = relayTag && relayTag[1] 
      ? relayTag[1] 
      : (app.relays && app.relays.length > 0 
          ? app.relays[Math.floor(Math.random() * app.relays.length)] 
          : null);

    showPlaylistSelector(video, video.id, {
      title: title,
      url: url,
      mimeType: mimeType,
      content: content,
      relativeTime: relativeTime,
      pubkey: pubkey,
    }, relayUrl);
    
    videoCardMenuControls?.close();
  });
  
menuElement.querySelector('.video-mute-user')?.addEventListener('click', () => {
  console.log('Mute User clicked for video:', video.id, 'pubkey:', video.pubkey);
  
  if (confirm('Are you sure you want to mute this user? Their content will be hidden from your feed.')) {
    const success = addMutedPubkey(video.pubkey);
    if (success) {
      showTemporaryNotification('User muted successfully');
      
      // Remove ALL video cards from this author
      const authorCards = document.querySelectorAll('.video-card');
      authorCards.forEach(card => {
        const cardVideoId = card.dataset.videoId;
        if (card.dataset.pubkey === video.pubkey) {
          card.style.transition = 'opacity 0.3s ease';
          card.style.opacity = '0';
          setTimeout(() => card.remove(), 300);
        }
      });
    } else {
      showTemporaryNotification('User is already muted');
    }
  }
  
  videoCardMenuControls?.close();
});
  
  menuElement.querySelector('.video-report')?.addEventListener('click', () => {
    console.log('Report clicked for video:', video.id);
    videoCardMenuControls?.close();
  });
  
  menuElement.querySelector('.video-show-json')?.addEventListener('click', () => {
    console.log('Show JSON clicked for video:', video.id);
    showVideoJsonModal(video);
    videoCardMenuControls?.close();
  });
}



///////////////
const getBlurhashFromVideoEvent = (video) => {
  // Priority 1: Check for standalone "blurhash" tag
  let blurhashTag = video.tags?.find((tag) => tag[0] === "blurhash");
  if (blurhashTag?.[1]) {
    return blurhashTag[1];
  }
  
  // Priority 2: Check for blurhash in imeta tags
  let imetaTags = video.tags?.filter((tag) => tag[0] === "imeta") || [];
  if (imetaTags.length > 0) {
    let blurhashFromImeta = extractFromImetaForCard(imetaTags, "blurhash");
    if (blurhashFromImeta[0]) {
      return blurhashFromImeta[0];
    }
  }
  
  return null;
};
const createBlurhashDataUrl = (blurhashString, width = 32, height = 32) => {
  try {
    // Decode blurhash to pixels
    const pixels = blurhash.decode(blurhashString, width, height, 1);
    
    // Use the library's helper to create canvas and get data URL
    const canvas = blurhash.drawImageDataOnNewCanvas(pixels, width, height);
    
    return canvas.toDataURL();
  } catch (error) {
    console.error('Error creating blurhash:', error);
    return null;
  }
};