function createVideoCard(video) {
  if (!video || !video.id) return document.createElement('div');
  
  let getValueFromTags = (tags, key, defaultValue = "") => {
    let tag = tags?.find((t) => t[0] === key);
    return tag ? tag[1] : defaultValue;
  };

  let formatDuration = (duration) => {
    if (!duration) return "";
    let durationFloat = parseFloat(duration);
    if (isNaN(durationFloat)) return "";
    let minutes = Math.floor(durationFloat / 60);
    let seconds = Math.floor(durationFloat % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  let extractFromImeta = (imetaTags, key) => {
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

  let truncateText = (text, maxLength = 80) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Extract all data first
  let title = getValueFromTags(video.tags, "title", "Untitled");
  let content = video.content?.trim() || "";
  let timeAgo = getRelativeTime(video.created_at);
  let imetaTags = video.tags?.filter((tag) => tag[0] === "imeta") || [];
  
  let thumbnailSrc = sanitizeUrl(
    extractFromImeta(imetaTags, "image")[0] ||
    extractFromImeta(imetaTags, "thumb")[0] ||
    "https://i.postimg.cc/wB2qSW-MM/tn.jpg"
   
  );

let duration = extractFromImeta(imetaTags, "duration")[0] || "1";

  let formattedDuration = formatDuration(duration);

  let dimensions = extractFromImeta(imetaTags, "dim")[0] || "";
  let description = truncateText(content);

  // BLOSSOM VALIDATION
  let isValidBlossom = false;
  const imetaTag = video.tags?.find(tag => tag[0] === 'imeta');
  if (imetaTag) {
    let xHash = '';
    let directUrl = '';

    // Extract x hash and url from imeta tag
    for (let i = 1; i < imetaTag.length; i++) {
      const item = imetaTag[i];
      if (item.startsWith('x ')) {
        xHash = item.substring(2);
      } else if (item.startsWith('url ')) {
        directUrl = item.substring(4);
      }
    }

    // Extract filename from URL and validate
    if (xHash && directUrl) {
      try {
        const urlObj = new URL(directUrl);
        const filename = urlObj.pathname.split('/').pop() || '';
        const filenameWithoutExt = filename.split('.')[0];
        isValidBlossom = filenameWithoutExt === xHash;
      } catch (e) {
        // Invalid URL, keep isValidBlossom as false
      }
    }
  }

  // EXTRACT SIZE FROM IMETA
  let fileSize = null;
  const sizeValues = extractFromImeta(imetaTags, "size");
  if (sizeValues.length > 0) {
    const sizeBytes = parseInt(sizeValues[0]);
    if (!isNaN(sizeBytes)) {
      fileSize = formatBytes(sizeBytes);
    }
  }
  
  let participants = video.tags?.filter((tag) => tag[0] === "p").map((p) => p[1]) || [];
  let hashtags = video.tags?.filter((tag) => tag[0] === "t").map((t) => t[1]) || [];
  let referenceLinks = video.tags?.filter((tag) => tag[0] === "r").map((r) => r[1]) || [];
  let contentWarning = getValueFromTags(video.tags, "content-warning", "");
  let textTracks = video.tags?.filter((tag) => tag[0] === "text-track").map((track) => ({
    event: track[1],
    relay: track[2],
  })) || [];
  let segments = video.tags?.filter((tag) => tag[0] === "segment").map((segment) => ({
    start: segment[1],
    end: segment[2],
    title: segment[3],
    thumbnail: segment[4],
  })) || [];

  // Create the bottom right indicators HTML
  let bottomRightHTML = '';
  if (fileSize || isValidBlossom) {
    if (fileSize) {
      bottomRightHTML = `<span class="file-size">${fileSize}</span>`;
    }
    if (isValidBlossom) {
      bottomRightHTML += '<span class="blossom-indicator">🌸</span>';
    }
  }

  // Create static HTML skeleton
  let card = document.createElement('div');
  card.className = 'video-card';
  card.dataset.videoId = video.id;
  
card.innerHTML = `
    <div class="metadata">
     
       ${bottomRightHTML}
        <span class="time"></span>
    </div>
  <div class="thumbnail-container">
    <img class="thumbnail" loading="lazy" />
  </div>
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
  let thumbnailImg = card.querySelector('.thumbnail');
  let titleElement = card.querySelector('.title');
  let creatorImageContainer = card.querySelector('.creator-image');
  let creatorNameContainer = card.querySelector('.creator-name');
  let timeElement = card.querySelector('.time');
  let metadataContainer = card.querySelector('.metadata');
  let videoInfoContainer = card.querySelector('.video-info');
  let optionsButton = card.querySelector('.options-button');
  let creatorSection = card.querySelector('.creator');

  // Set dynamic content programmatically
  thumbnailImg.src = thumbnailSrc;
  thumbnailImg.alt = title;
  
  titleElement.textContent = truncateText(title, 50);
  titleElement.title = title;
  
  timeElement.textContent = timeAgo;

  if (formattedDuration) {
    let durationSpan = document.createElement('span');
    durationSpan.className = 'duration';
    durationSpan.textContent = formattedDuration;
    card.querySelector('.thumbnail-container').appendChild(durationSpan);
  }

  let creatorImage = document.createElement('nostr-picture');
  creatorImage.className = 'channel-image';
  creatorImage.setAttribute('pubkey', video.pubkey);
  creatorImageContainer.appendChild(creatorImage);

  let creatorName = document.createElement('nostr-name');
  creatorName.className = 'channel-name';
  creatorName.setAttribute('pubkey', video.pubkey);
  creatorNameContainer.appendChild(creatorName);

  creatorSection.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.hash = `#profile/${video.pubkey}`;
  });

  if (dimensions) {
    let qualitySpan = document.createElement('span');
    qualitySpan.className = 'quality';
    qualitySpan.textContent = dimensions;
    metadataContainer.appendChild(qualitySpan);
  }

  if (description) {
    let descriptionP = document.createElement('p');
    descriptionP.className = 'description';
    descriptionP.textContent = description;
    videoInfoContainer.appendChild(descriptionP);
  }

  if (participants.length) {
    let participantsDiv = document.createElement('div');
    participantsDiv.className = 'participants';
    participantsDiv.appendChild(document.createTextNode('Participants: '));
    
    participants.forEach((pubkey, index) => {
      if (index > 0) participantsDiv.appendChild(document.createTextNode(', '));
      let participantName = document.createElement('nostr-name');
      participantName.setAttribute('pubkey', pubkey);
      participantsDiv.appendChild(participantName);
    });
    
    videoInfoContainer.appendChild(participantsDiv);
  }

  if (hashtags.length) {
    let hashtagsDiv = document.createElement('div');
    hashtagsDiv.className = 'hashtags';
    hashtagsDiv.textContent = `Tags: ${hashtags.map(t => `#${t}`).join(', ')}`;
    videoInfoContainer.appendChild(hashtagsDiv);
  }

  if (referenceLinks.length) {
    let linksDiv = document.createElement('div');
    linksDiv.className = 'links';
    linksDiv.appendChild(document.createTextNode('Links: '));
    
    referenceLinks.forEach((url, index) => {
      if (index > 0) linksDiv.appendChild(document.createTextNode(', '));
      let link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.textContent = url;
      linksDiv.appendChild(link);
    });
    
    videoInfoContainer.appendChild(linksDiv);
  }

  if (contentWarning) {
    let warningDiv = document.createElement('div');
    warningDiv.className = 'content-warning';
    warningDiv.textContent = `⚠️ ${contentWarning}`;
    videoInfoContainer.appendChild(warningDiv);
  }

  if (textTracks.length) {
    let textTracksDiv = document.createElement('div');
    textTracksDiv.className = 'text-tracks';
    textTracksDiv.textContent = `Subtitles: ${textTracks.length}`;
    videoInfoContainer.appendChild(textTracksDiv);
  }

  if (segments.length) {
    let segmentsDiv = document.createElement('div');
    segmentsDiv.className = 'segments';
    segmentsDiv.textContent = `Segments: ${segments.length}`;
    videoInfoContainer.appendChild(segmentsDiv);
  }

// Options menu functionality
optionsButton.addEventListener('click', (e) => {
  e.stopPropagation();
//  console.log('Options button clicked for video:', video.id);
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
  menuElement.classList.add('settings-menu'); // Reusing same styles
  
  menuElement.innerHTML = `
    <div class="menu-container">
      <div class="menu-header">
        <div class="user-info">
          ${title}
        </div>
      </div>
      
      <div class="menu-items">
        <button class="menu-item video-queue">
          <span class="item-icon">📋</span>
          <span class="item-text">Add to Queue</span>
        </button>
        <button class="menu-item video-watch-later">
          <span class="item-icon">⏰</span>
          <span class="item-text">Watch Later</span>
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
  menuElement.querySelector('.video-queue')?.addEventListener('click', () => {
    console.log('Add to Queue clicked for video:', video.id);
    videoCardMenuControls?.close();
  });
  
  menuElement.querySelector('.video-watch-later')?.addEventListener('click', () => {
    console.log('Watch Later clicked for video:', video.id);
    videoCardMenuControls?.close();
  });
  
  menuElement.querySelector('.video-mute-user')?.addEventListener('click', () => {
    console.log('Mute User clicked for video:', video.id, 'pubkey:', video.pubkey);
    videoCardMenuControls?.close();
  });
  
  menuElement.querySelector('.video-report')?.addEventListener('click', () => {
    console.log('Report clicked for video:', video.id);
    videoCardMenuControls?.close();
  });
  
  menuElement.querySelector('.video-show-json')?.addEventListener('click', () => {
    console.log('Show JSON clicked for video:', video.id);
    showVideoJsonModal(video); // Keep your existing function
    videoCardMenuControls?.close();
  });
}