const getValueFromTagsForNoteCard = (tags, key, defaultValue = "") => {
  let tag = tags?.find((t) => t[0] === key);
  return tag ? tag[1] : defaultValue;
};

const truncateNoteText = (text, maxLength = 280) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const extractImagesFromNote = (note) => {
  const images = [];
  const imetaTags = note.tags?.filter((tag) => tag[0] === "imeta") || [];
  
  imetaTags.forEach((tag) => {
    let imageUrl = null;
    let blurhash = null;
    let dim = null;
    
    tag.slice(1).forEach((item) => {
      if (item.startsWith('url ')) {
        imageUrl = item.substring(4);
      } else if (item.startsWith('blurhash ')) {
        blurhash = item.substring(9);
      } else if (item.startsWith('dim ')) {
        dim = item.substring(4);
      }
    });
    
    if (imageUrl) {
      images.push({ url: imageUrl, blurhash, dim });
    }
  });
  
  const imageTags = note.tags?.filter((tag) => tag[0] === "image") || [];
  imageTags.forEach((tag) => {
    if (tag[1] && !images.find(img => img.url === tag[1])) {
      images.push({ url: tag[1], blurhash: null, dim: null });
    }
  });
  
  return images;
};

const extractURLsFromContent = (content) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.match(urlRegex) || [];
};

const isVideoURL = (url) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m3u8'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('youtube.com') || 
         lowerUrl.includes('youtu.be');
};

const isImageURL = (url) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.endsWith(ext));
};

function createNoteCard(note) {
  if (!note || !note.id) return document.createElement('div');

  const contentWarnings = note.tags?.filter((tag) => tag[0] === "content-warning").map((t) => t[1]) || [];
  const hasContentWarning = contentWarnings.length > 0;
  const showContentWarning = localStorage.getItem("showContentWarning") !== "false";
  
  if (hasContentWarning && !showContentWarning) {
    return document.createElement('div');
  }

  let content = note.content?.trim() || "";
  let timeAgo = getRelativeTime(note.created_at);
  let hashtags = note.tags?.filter((tag) => tag[0] === "t").map((t) => t[1]) || [];
  
  const replyTags = note.tags?.filter((tag) => tag[0] === "e") || [];
  const isReply = replyTags.length > 0;
  
  // Check for media but don't load yet
  const images = extractImagesFromNote(note);
  const urlsInContent = extractURLsFromContent(content);
  const videoUrls = urlsInContent.filter(isVideoURL);
  const hasMedia = images.length > 0 || videoUrls.length > 0;


  const MAX_TEXT_LENGTH = 280;
  const isLongText = content.length > MAX_TEXT_LENGTH;
  let truncatedContent = isLongText ? content.substring(0, MAX_TEXT_LENGTH) : content;
  



  let card = document.createElement('div');
  card.className = 'note-card';
  card.dataset.noteId = note.id;
  card.dataset.pubkey = note.pubkey;
  
  card.innerHTML = `
    <div class="note-header">
      <div class="note-author">
        <div class="author-avatar"></div>
        <div class="author-info">
          <div class="author-name"></div>
          <div class="note-meta">
            <span class="note-time">${timeAgo}</span>
            ${isReply ? '<span class="reply-indicator">↩️</span>' : ''}
          </div>
        </div>
      </div>
      <button class="options-button" type="button" aria-label="Note options">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
    </div>
    
    <div class="note-content">
      <div class="note-text" data-full-text="${isLongText ? 'true' : 'false'}">
        ${isLongText ? truncatedContent + '...' : content}
      </div>
      ${isLongText ? '<button class="show-more-btn" type="button">Show more</button>' : ''}
      ${hasContentWarning ? `<div class="content-warning-badge">⚠️ ${contentWarnings.join(', ')}</div>` : ''}
    </div>
    
    ${hasMedia ? `
      <button class="show-media-btn" type="button">
        📷 Show Media (${images.length > 0 ? images.length + ' image' + (images.length > 1 ? 's' : '') : ''}${images.length > 0 && videoUrls.length > 0 ? ', ' : ''}${videoUrls.length > 0 ? '1 video' : ''})
      </button>
      <div class="note-media" style="display: none;"></div>
    ` : ''}
    
    ${hashtags.length > 0 ? `
      <div class="note-hashtags">
        ${hashtags.slice(0, 5).map(tag => `<span class="hashtag">#${tag}</span>`).join(' ')}
      </div>
    ` : ''}
    
    <div class="note-actions">
      <button class="action-btn reply-btn" title="Reply">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M17 9a7 7 0 0 1-7 7c-1.5 0-3-.5-4-1.5L3 17l1.5-3.5A7 7 0 1 1 17 9z"></path>
        </svg>
      </button>
      <button class="action-btn repost-btn" title="Repost">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="17 1 20 4 17 7"></polyline>
          <path d="M3 9V7a3 3 0 0 1 3-3h14"></path>
          <polyline points="3 19 0 16 3 13"></polyline>
          <path d="M17 11v2a3 3 0 0 1-3 3H0"></path>
        </svg>
      </button>
      <button class="action-btn like-btn" title="Like">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M17 3a4 4 0 0 0-5.7 0L10 4.3 8.7 3a4 4 0 1 0-5.7 5.7l1 1L10 16l6-6.3 1-1a4 4 0 0 0 0-5.7z"></path>
        </svg>
      </button>
      <button class="action-btn zap-btn" title="Zap">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polygon points="11 1 2 11 10 11 9 19 18 9 10 9 11 1"></polygon>
        </svg>
      </button>
    </div>
  `;

  // Populate dynamic content
  let authorAvatar = card.querySelector('.author-avatar');
  let authorName = card.querySelector('.author-name');
  let noteText = card.querySelector('.note-text');
  let noteMedia = card.querySelector('.note-media');
  let showMediaBtn = card.querySelector('.show-media-btn');
  let optionsButton = card.querySelector('.options-button');

  if (isLongText) {
    const showMoreBtn = card.querySelector('.show-more-btn');
    const noteTextEl = card.querySelector('.note-text');
    let isExpanded = false;
    
    showMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isExpanded = !isExpanded;
      noteTextEl.textContent = isExpanded ? content : truncatedContent + '...';
      showMoreBtn.textContent = isExpanded ? 'Show less' : 'Show more';
    });
  }

  // Author info
  let avatarElement = document.createElement('nostr-picture');
  avatarElement.className = 'avatar-image';
  avatarElement.setAttribute('pubkey', note.pubkey);
  avatarElement.setAttribute('data-lazy', 'true'); // Mark for lazy loading
  authorAvatar.appendChild(avatarElement);

  let nameElement = document.createElement('nostr-name');
  nameElement.className = 'author-name-text';
  nameElement.setAttribute('pubkey', note.pubkey);
  nameElement.setAttribute('data-lazy', 'true'); // Mark for lazy loading
  authorName.appendChild(nameElement);

  authorAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.hash = `#profile/${note.pubkey}`;
  });
  authorName.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.hash = `#profile/${note.pubkey}`;
  });

  noteText.textContent = content;

  // Lazy load media when button is clicked
if (showMediaBtn && noteMedia) {
  let mediaLoaded = false;
  
  showMediaBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Only load once
    if (mediaLoaded) {
      noteMedia.style.display = 'block';
      showMediaBtn.style.display = 'none';
      return;
    }
    
    mediaLoaded = true;
    
    // Load media on demand with proper lazy loading
    if (images.length > 0) {
      images.slice(0, 4).forEach((img, index) => {
        let imgContainer = document.createElement('div');
        imgContainer.className = 'note-image-container';
        
        let imgElement = document.createElement('img');
        imgElement.className = 'note-image';
        imgElement.loading = 'lazy'; // Native lazy loading
        imgElement.decoding = 'async'; // Async decoding
        imgElement.src = sanitizeUrl(img.url);
        imgElement.alt = `Note image ${index + 1}`;
        
        // Add loading placeholder
        imgElement.style.minHeight = '200px';
        imgElement.style.backgroundColor = 'var(--surface)';
        
        imgElement.addEventListener('load', () => {
          imgElement.style.minHeight = 'auto';
        });
        
        imgContainer.appendChild(imgElement);
        noteMedia.appendChild(imgContainer);
      });
    }
    
    if (videoUrls.length > 0 && images.length === 0) {
      let videoContainer = document.createElement('div');
      videoContainer.className = 'note-video-container';
      
      let videoElement = document.createElement('video');
      videoElement.className = 'note-video';
      videoElement.controls = true;
      videoElement.preload = 'none'; // Changed from 'metadata' to 'none'
      videoElement.src = sanitizeUrl(videoUrls[0]);
      
      videoContainer.appendChild(videoElement);
      noteMedia.appendChild(videoContainer);
    }
    
    // Show media, hide button
    noteMedia.style.display = 'block';
    showMediaBtn.style.display = 'none';
  });
}

  optionsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    showNoteCardMenu(optionsButton, note);
  });

  // Simplified action buttons
  card.querySelector('.reply-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Reply to note:', note.id);
  });

  card.querySelector('.repost-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Repost note:', note.id);
  });

  card.querySelector('.like-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Like note:', note.id);
  });

  card.querySelector('.zap-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Zap note:', note.id);
  });

  return card;
}

// Keep the menu functions as they were...
let noteCardMenuControls = null;
let currentNoteCardData = null;

async function showNoteCardMenu(buttonElement, note) {
  if (noteCardMenuControls && noteCardMenuControls.isOpen() && currentNoteCardData?.id !== note.id) {
    noteCardMenuControls.close();
    noteCardMenuControls = null;
  }
  
  if (noteCardMenuControls && noteCardMenuControls.isOpen() && currentNoteCardData?.id === note.id) {
    noteCardMenuControls.close();
    return;
  }

  if (!noteCardMenuControls || currentNoteCardData?.id !== note.id) {
    await createNoteCardMenu(buttonElement, note);
  }

  noteCardMenuControls.open();
}

async function createNoteCardMenu(buttonElement, note) {
  currentNoteCardData = note;
  
  let overlayElement = document.createElement('div');
  overlayElement.id = 'note-card-overlay';
  overlayElement.classList.add('menu-overlay');
  
  let menuElement = document.createElement('div');
  menuElement.id = 'note-card-menu';
  menuElement.classList.add('settings-menu');
  
  const notePreview = truncateNoteText(note.content, 50);
  
  menuElement.innerHTML = `
    <div class="menu-container">
      <div class="menu-header">
        <div class="user-info">
          ${notePreview || 'Note'}
        </div>
      </div>
      
      <div class="menu-items">
        <button class="menu-item note-copy-link">
          <span class="item-icon">🔗</span>
          <span class="item-text">Copy Link</span>
        </button>
        <button class="menu-item note-copy-id">
          <span class="item-icon">🆔</span>
          <span class="item-text">Copy Note ID</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item note-mute-user">
          <span class="item-icon">🔇</span>
          <span class="item-text">Mute User</span>
        </button>
        <button class="menu-item note-report">
          <span class="item-icon">🚩</span>
          <span class="item-text">Report</span>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item note-show-json">
          <span class="item-icon">📄</span>
          <span class="item-text">Show JSON</span>
        </button>
      </div>
    </div>
  `;
  
  menuElement.style.position = 'fixed';
  menuElement.style.top = '50%';
  menuElement.style.left = '50%';
  menuElement.style.transform = 'translate(-50%, -50%)';
  menuElement.style.zIndex = '9999';
  
  overlayElement.appendChild(menuElement);
  document.body.appendChild(overlayElement);
  
  noteCardMenuControls = createOverlayControls("note-card", overlayElement, {
    closeOnOutsideClick: true,
    closeOnEscape: true,
    preventBodyScroll: false
  });

  const originalOverlay = OverlayManager.overlays.get("note-card");
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
      noteCardMenuControls = null;
      currentNoteCardData = null;
    }, 150);
  };

  setupNoteCardMenuEvents(menuElement, note);
}

function setupNoteCardMenuEvents(menuElement, note) {
  menuElement.querySelector('.note-copy-link')?.addEventListener('click', () => {
    const noteLink = `${window.location.origin}${window.location.pathname}#note/${note.id}`;
    navigator.clipboard.writeText(noteLink).then(() => {
      showTemporaryNotification('Note link copied to clipboard');
    });
    noteCardMenuControls?.close();
  });

  menuElement.querySelector('.note-copy-id')?.addEventListener('click', () => {
    navigator.clipboard.writeText(note.id).then(() => {
      showTemporaryNotification('Note ID copied to clipboard');
    });
    noteCardMenuControls?.close();
  });
  
  menuElement.querySelector('.note-mute-user')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to mute this user? Their content will be hidden from your feed.')) {
const success = addMutedPubkey(note.pubkey);
if (success) {
showTemporaryNotification('User muted successfully');
    const authorCards = document.querySelectorAll('.note-card');
    authorCards.forEach(card => {
      if (card.dataset.pubkey === note.pubkey) {
        card.style.transition = 'opacity 0.3s ease';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
      }
    });
  } else {
    showTemporaryNotification('User is already muted');
  }
}
noteCardMenuControls?.close();
});
menuElement.querySelector('.note-report')?.addEventListener('click', () => {
console.log('Report note:', note.id);
noteCardMenuControls?.close();
});
menuElement.querySelector('.note-show-json')?.addEventListener('click', () => {
showVideoJsonModal(note);
noteCardMenuControls?.close();
});
}