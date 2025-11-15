function createVideoPlayer(video, shouldAutoplay = false) {
  let url = getValueFromTags(video, "url", "");
  let mimeType = getValueFromTags(video, "m", "video/mp4");
  
  if (!url) {
    return '<div class="video-error">No video URL provided</div>';
  }

  const autoplayAttr = shouldAutoplay ? 'autoplay' : '';

  return `
    <video controls ${autoplayAttr} class="custom-video-element">
      <source src="${escapeHtml(url)}" type="${escapeHtml(mimeType)}">
      Your browser does not support the video tag.
    </video>
  `;
}

///////////////////////////////////////////////////////////////
// video-manager.js
function initVideoManager() {
  const miniplayer = document.getElementById('miniplayer');
  const miniplayerVideoContainer = miniplayer.querySelector('.miniplayer-video-container');
  const dragHandle = miniplayer.querySelector('.miniplayer-drag-handle');
  
  miniplayer.querySelector('.miniplayer-close').addEventListener('click', stopVideoPlayback);
  miniplayer.querySelector('.miniplayer-expand').addEventListener('click', expandToVideoPage);
  
  // Playlist controls
  const prevBtn = miniplayer.querySelector('.miniplayer-prev');
  const nextBtn = miniplayer.querySelector('.miniplayer-next');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playPreviousInPlaylist();
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playNextInPlaylist();
    });
  }
  
  miniplayerVideoContainer.addEventListener('click', (e) => {
    if (e.target === miniplayerVideoContainer || e.target.tagName === 'VIDEO') {
      expandToVideoPage(e);
    }
  });
  
  initMiniplayerDrag(miniplayer, dragHandle);
  
  console.log("Video manager initialized");
}

function initMiniplayerDrag(miniplayer, dragHandle) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  let clickStartTime = 0;
  const DRAG_THRESHOLD = 5; // pixels movement to consider it a drag
  const CLICK_MAX_DURATION = 200; // ms to consider it a click vs drag

  // Load saved position from localStorage
  loadMiniplayerPosition(miniplayer);

  dragHandle.addEventListener('mousedown', startDrag);
  dragHandle.addEventListener('touchstart', startDragTouch);

  function startDrag(e) {
    isDragging = false; // Start as not dragging
    clickStartTime = Date.now();
    
    const rect = miniplayer.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to video container
  }

  function startDragTouch(e) {
    if (e.touches.length === 1) {
      isDragging = false;
      clickStartTime = Date.now();
      
      const touch = e.touches[0];
      const rect = miniplayer.getBoundingClientRect();
      startX = touch.clientX;
      startY = touch.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;
      
      document.addEventListener('touchmove', handleDragMoveTouch);
      document.addEventListener('touchend', handleDragEnd);
      
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleDragMove(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Check if movement exceeds threshold to consider it a drag
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      if (!isDragging) {
        // First time exceeding threshold - start dragging
        isDragging = true;
        miniplayer.classList.add('dragging');
      }
      
      updatePosition(miniplayer, initialLeft + dx, initialTop + dy);
    }
  }

  function handleDragMoveTouch(e) {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      if (!isDragging) {
        isDragging = true;
        miniplayer.classList.add('dragging');
      }
      
      updatePosition(miniplayer, initialLeft + dx, initialTop + dy);
    }
  }

  function handleDragEnd(e) {
    const wasDragging = isDragging;
    const clickDuration = Date.now() - clickStartTime;
    
    // Clean up
    isDragging = false;
    miniplayer.classList.remove('dragging');
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('touchmove', handleDragMoveTouch);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchend', handleDragEnd);
    
    // Only save position if it was a drag, not a click
    if (wasDragging) {
      saveMiniplayerPosition(miniplayer);
    } else if (clickDuration < CLICK_MAX_DURATION) {
      // It was a quick click on the drag handle - you could add handle-specific behavior here
      console.log("Quick click on drag handle");
    }
    
    e.stopPropagation();
  }

function updatePosition(element, left, top) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const elementWidth = element.offsetWidth;
  const elementHeight = element.offsetHeight;
  
  left = Math.max(0, Math.min(left, viewportWidth - elementWidth));
  top = Math.max(0, Math.min(top, viewportHeight - elementHeight));
  
  element.style.left = left + 'px';
  element.style.top = top + 'px';
  element.style.right = 'auto';
  element.style.bottom = 'auto';
}

  // Double-click to reset position
  dragHandle.addEventListener('dblclick', () => {
    resetMiniplayerPosition();
  });  
}

function saveMiniplayerPosition(miniplayer) {
  const position = {
    left: miniplayer.style.left,
    top: miniplayer.style.top
  };
  localStorage.setItem('miniplayerPosition', JSON.stringify(position));
}

function loadMiniplayerPosition(miniplayer) {
  try {
    const saved = localStorage.getItem('miniplayerPosition');
    if (saved) {
      const position = JSON.parse(saved);
      if (position.left && position.top) {
        miniplayer.style.left = position.left;
        miniplayer.style.top = position.top;
        miniplayer.style.right = 'auto';
        miniplayer.style.bottom = 'auto';
      }
    }
  } catch (e) {
    console.warn('Failed to load miniplayer position:', e);
  }
}

function resetMiniplayerPosition() {
  const miniplayer = document.getElementById('miniplayer');
  miniplayer.style.left = '';
  miniplayer.style.top = '';
  miniplayer.style.right = '20px';
  miniplayer.style.bottom = '11vh';
  localStorage.removeItem('miniplayerPosition');
}

function expandToVideoPage(e) {
  // If this was triggered from a drag operation, don't navigate
  if (e && (e.defaultPrevented || e.target.closest('.miniplayer-drag-handle'))) {
    return;
  }
  
  // Use the saved URL if available, otherwise fall back to simple ID-based URL
  if (app.videoPlayer.currentVideoURL) {
    window.location.hash = app.videoPlayer.currentVideoURL;
    console.log("expandToVideoPage using saved URL:", app.videoPlayer.currentVideoURL);
  } else if (app.videoPlayer.currentVideoId) {
    window.location.hash = `#watch/${app.videoPlayer.currentVideoId}`;
    console.log("expandToVideoPage using fallback ID:", app.videoPlayer.currentVideoId);
  }
}
function playVideo(videoElement, videoId, videoData) {
  // If trying to register the same video element again, just update route handling
  if (app.videoPlayer.currentVideo === videoElement && 
      app.videoPlayer.currentVideoId === videoId) {
    console.log("Same video element already registered, just updating route");
    handleVideoRouteChange(window.location.hash);
    return;
  }
  
  // Stop any DIFFERENT existing video first
  if (app.videoPlayer.currentVideo && 
      app.videoPlayer.currentVideo !== videoElement) {
    console.log("Stopping and cleaning up different video before playing new one");
    
    // Get reference before clearing
    const oldVideo = app.videoPlayer.currentVideo;
    
    // Remove listeners
    removeVideoEventListeners(oldVideo);
    
    // Pause
    oldVideo.pause();
    
    // Clear references
    app.videoPlayer.currentVideo = null;
    app.videoPlayer.currentVideoId = null;
    app.videoPlayer.currentVideoData = null;
    
    // Clean up the old video after a brief delay
    setTimeout(() => {
      cleanupVideo(oldVideo);
    }, 100);
  }
  
  // Set new video
  app.videoPlayer.currentVideo = videoElement;
  app.videoPlayer.currentVideoId = videoId;
  app.videoPlayer.currentVideoData = videoData;
  
  // Add event listeners to track play state
  setupVideoEventListeners(videoElement);
  
  // Update based on current route
  handleVideoRouteChange(window.location.hash);
}

function setupVideoEventListeners(videoElement) {
  // Check if listeners are already set up
  if (videoElement.dataset.listenersAttached === 'true') {
    console.log("Listeners already attached to this video element");
    return;
  }
  
  // Mark that we've attached listeners
  videoElement.dataset.listenersAttached = 'true';
  
  // Create handlers that we can reference for removal
  const handlers = {
    play: () => {
      app.videoPlayer.isPlaying = true;
      console.log("Video started playing");
    },
    pause: () => {
      app.videoPlayer.isPlaying = false;
      console.log("Video paused");
    },
    ended: () => {
      app.videoPlayer.isPlaying = false;
      console.log("Video ended");
      playNextInPlaylist();
    },
    timeupdate: () => {
      app.videoPlayer.currentTime = videoElement.currentTime;
    },
    error: (e) => {
      console.error('Video error:', e);
      stopVideoPlayback();
    }
  };
  
  // Store handlers on the element for later cleanup
  videoElement._eventHandlers = handlers;
  
  // Add event listeners
  videoElement.addEventListener('play', handlers.play);
  videoElement.addEventListener('pause', handlers.pause);
  videoElement.addEventListener('ended', handlers.ended);
  videoElement.addEventListener('timeupdate', handlers.timeupdate);
  videoElement.addEventListener('error', handlers.error);
}

function removeVideoEventListeners(videoElement) {
  if (!videoElement._eventHandlers) {
    return;
  }
  
  const handlers = videoElement._eventHandlers;
  
  videoElement.removeEventListener('play', handlers.play);
  videoElement.removeEventListener('pause', handlers.pause);
  videoElement.removeEventListener('ended', handlers.ended);
  videoElement.removeEventListener('timeupdate', handlers.timeupdate);
  videoElement.removeEventListener('error', handlers.error);
  
  delete videoElement._eventHandlers;
  delete videoElement.dataset.listenersAttached;
  
  console.log("Removed video event listeners");
}

function showMiniplayer() {
  if (!app.videoPlayer.currentVideo || !shouldShowMiniplayer()) {
    stopVideoPlayback();
    return;
  }
  
  const miniplayer = document.getElementById('miniplayer');
  const miniplayerVideoContainer = miniplayer.querySelector('.miniplayer-video-container');
  
  miniplayerVideoContainer.innerHTML = '';
  miniplayerVideoContainer.appendChild(app.videoPlayer.currentVideo);
  
  // Update playlist info
  updateMiniplayerPlaylistInfo();
  
  miniplayer.classList.remove('hidden');
  app.videoPlayer.isMiniplayerVisible = true;
}

function updateMiniplayerPlaylistInfo() {
  const playlistInfo = document.querySelector('.miniplayer-playlist-info');
  const prevBtn = document.querySelector('.miniplayer-prev');
  const nextBtn = document.querySelector('.miniplayer-next');
  
  if (!app.currentPlaylist) {
    playlistInfo.innerHTML = '<div style="opacity: 0.5; font-size: 11px;">Playing video</div>';
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    return;
  }
  
  const title = getValueFromTags(app.currentPlaylist, "title", "Playlist");
  // OLD: const videoTags = app.currentPlaylist.tags.filter(tag => tag[0] === "a");
  // NEW:
  const videoTags = app.currentPlaylist.tags.filter(tag => tag[0] === "e");
  const totalVideos = videoTags.length;
  const currentPosition = app.currentPlaylistIndex + 1;
  
  playlistInfo.innerHTML = `
    <div class="playlist-badge">
      <div class="playlist-title" title="${escapeHtml(title)}">
        📋 ${escapeHtml(title)}
      </div>
      <div class="playlist-position">
        ${currentPosition} of ${totalVideos}
      </div>
    </div>
  `;
  
  // Show/hide prev/next buttons
  if (prevBtn) {
    prevBtn.style.display = app.currentPlaylistIndex > 0 ? 'flex' : 'none';
  }
  if (nextBtn) {
    nextBtn.style.display = app.currentPlaylistIndex < totalVideos - 1 ? 'flex' : 'none';
  }
}

// Update the position function to not mess with bottom
function updatePosition(element, left, top) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const elementWidth = element.offsetWidth;
  const elementHeight = element.offsetHeight;
  
  left = Math.max(0, Math.min(left, viewportWidth - elementWidth));
  top = Math.max(0, Math.min(top, viewportHeight - elementHeight));
  
  element.style.left = left + 'px';
  element.style.top = top + 'px';
  element.style.right = 'auto';
  element.style.bottom = 'auto';
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function playNextInPlaylist() {
  if (!app.currentPlaylist) return;
  
  // OLD: const videoTags = app.currentPlaylist.tags.filter(tag => tag[0] === "a");
  // NEW:
  const videoTags = app.currentPlaylist.tags.filter(tag => tag[0] === "e");
  
  if (app.currentPlaylistIndex >= videoTags.length - 1) {
    console.log("Already at last video in playlist");
    return;
  }
  
  console.log("Playing next video in playlist - cleaning up current video");
  
  // Clean up current video before navigating
  if (app.videoPlayer.currentVideo) {
    removeVideoEventListeners(app.videoPlayer.currentVideo);
    // Don't pause - let the navigation handle it
  }
  
  app.currentPlaylistIndex++;
  const nextVideoTag = videoTags[app.currentPlaylistIndex];
  
  // OLD: const [kind, videoId] = nextVideoTag[1].split(':');
  // NEW: Just get the video ID directly
  const videoId = nextVideoTag[1];
  
  const dTag = getValueFromTags(app.currentPlaylist, "d", "");
  const pubkey = app.currentPlaylist.pubkey;
  
  window.location.hash = `#watch/params?v=${videoId}&listp=${pubkey}&listd=${dTag}`;
}

function playPreviousInPlaylist() {
  if (!app.currentPlaylist) return;
  
  if (app.currentPlaylistIndex <= 0) {
    console.log("Already at first video in playlist");
    return;
  }
  
  console.log("Playing previous video in playlist - cleaning up current video");
  
  // Clean up current video before navigating
  if (app.videoPlayer.currentVideo) {
    removeVideoEventListeners(app.videoPlayer.currentVideo);
    // Don't pause - let the navigation handle it
  }
  
  app.currentPlaylistIndex--;
  
  // OLD: const videoTags = app.currentPlaylist.tags.filter(tag => tag[0] === "a");
  // NEW:
  const videoTags = app.currentPlaylist.tags.filter(tag => tag[0] === "e");
  
  const prevVideoTag = videoTags[app.currentPlaylistIndex];
  
  // OLD: const [kind, videoId] = prevVideoTag[1].split(':');
  // NEW: Just get the video ID directly
  const videoId = prevVideoTag[1];
  
  const dTag = getValueFromTags(app.currentPlaylist, "d", "");
  const pubkey = app.currentPlaylist.pubkey;
  
  window.location.hash = `#watch/params?v=${videoId}&listp=${pubkey}&listd=${dTag}`;
}
function hideMiniplayer() {
  const miniplayer = document.getElementById('miniplayer');
  if (miniplayer) {
    miniplayer.classList.add('hidden');
    app.videoPlayer.isMiniplayerVisible = false;
    console.log("Miniplayer hidden");
  }
}

function moveVideoToMainPlayer(container) {
  if (!app.videoPlayer.currentVideo) {
    console.log("No video to move to main player");
    return;
  }
  
  console.log("Moving video to main player and hiding miniplayer");
  
  // Hide miniplayer FIRST
  hideMiniplayer();
  
  // Clear container and add video
  container.innerHTML = '';
  container.appendChild(app.videoPlayer.currentVideo);
  
  // Make sure it has the right classes for main player
  app.videoPlayer.currentVideo.className = 'custom-video-element';
  app.videoPlayer.currentVideo.controls = true;
  
  // Ensure app state is updated
  app.videoPlayer.isMiniplayerVisible = false;
  
  console.log("Video moved to main player, miniplayer hidden");
}

function stopVideoPlayback() {
  if (app.videoPlayer.currentVideo) {
    console.log("Stopping video playback and cleaning up");
    
    // Remove event listeners
    removeVideoEventListeners(app.videoPlayer.currentVideo);
    
    // Get reference to the video before clearing
    const videoToClean = app.videoPlayer.currentVideo;
    
    // Pause the video
    videoToClean.pause();
    
    // Clear app references first
    app.videoPlayer.currentVideo = null;
    app.videoPlayer.currentVideoId = null;
    app.videoPlayer.currentVideoData = null;
    app.videoPlayer.currentVideoURL = null; // ADD THIS LINE
    app.videoPlayer.isPlaying = false;
    
    // Now it's safe to clean up the video
    setTimeout(() => {
      cleanupVideo(videoToClean);
    }, 100);
  }
  
  // Move current playlist to history when stopping
  if (app.currentPlaylist) {
    addPlaylistToHistory(app.currentPlaylist);
    app.currentPlaylist = null;
    app.currentPlaylistIndex = 0;
  }
  
  hideMiniplayer();
}
function handleVideoRouteChange(newHash) {
  if (!app.videoPlayer.currentVideo) {
    console.log("No current video, skipping route change handling");
    return;
  }
  
  const isVideoPage = newHash.startsWith('#watch/');
  const currentVideoId = newHash.split('/')[1]?.split('?')[0]; // Handle query params
  
  console.log(`Route change: ${newHash}, isVideoPage: ${isVideoPage}, currentVideoId: ${currentVideoId}, appVideoId: ${app.videoPlayer.currentVideoId}`);
  
  if (isVideoPage && currentVideoId === app.videoPlayer.currentVideoId) {
    console.log("Same video page - ensuring video is in main player and miniplayer is hidden");
    // Same video page - ensure it's in main player
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer && !videoContainer.contains(app.videoPlayer.currentVideo)) {
      moveVideoToMainPlayer(videoContainer);
    }
    hideMiniplayer(); // Make sure miniplayer is hidden
  } else if (isVideoPage && currentVideoId !== app.videoPlayer.currentVideoId) {
    console.log("Different video page - stopping current playback");
    // Different video - stop current
    stopVideoPlayback();
  } else {
    console.log("Non-video page - checking if miniplayer should show");
    // Non-video page - show miniplayer if video is playing
    if (shouldShowMiniplayer()) {
      showMiniplayer();
    } else {
      // If video isn't really playing, stop it completely
      stopVideoPlayback();
    }
  }
}
function cleanupVideoResources() {
  console.log("Cleaning up video resources");
  
  // Only clean up videos that are NOT the current playing video
  let videos = document.querySelectorAll("video");
  
  console.log(`Found ${videos.length} video elements, current video exists: ${!!app.videoPlayer.currentVideo}`);
  
  videos.forEach(video => {
    if (video !== app.videoPlayer.currentVideo) {
      console.log("Cleaning up non-current video element");
      cleanupVideo(video);
    }
  });
  
  // Also clean up any orphaned video elements that might be in the miniplayer
  const miniplayerContainer = document.querySelector('.miniplayer-video-container');
  if (miniplayerContainer && !app.videoPlayer.isMiniplayerVisible) {
    const miniplayerVideos = miniplayerContainer.querySelectorAll('video');
    miniplayerVideos.forEach(video => {
      if (video !== app.videoPlayer.currentVideo) {
        console.log("Cleaning up orphaned miniplayer video");
        cleanupVideo(video);
      }
    });
  }
}

function cleanupVideo(video) {
  try {
    if (video === app.videoPlayer.currentVideo) {
      console.log("Skipping cleanup of current video");
      return;
    }
    
    // Remove event listeners first
    removeVideoEventListeners(video);
    
    video.pause();
    video.currentTime = 0;
    
    // Clear source before removing src
    const sources = Array.from(video.querySelectorAll("source"));
    sources.forEach(source => {
      source.removeAttribute('src');
      source.remove();
    });
    
    // Handle blob URLs
    if (video.src && video.src.startsWith('blob:')) {
      URL.revokeObjectURL(video.src);
    }
    
    video.removeAttribute('src');
    video.src = '';
    video.load();
    
    // Remove from DOM
    if (video.parentNode) {
      video.parentNode.removeChild(video);
    }
    
    // CRITICAL: Clear the object reference
    video = null;
    
  } catch (e) {
    console.warn("Error cleaning up video:", e);
  }
}

function shouldShowMiniplayer() {
  if (!app.videoPlayer.currentVideo) return false;
  
  const video = app.videoPlayer.currentVideo;
  
  // Check if video is actually playing (not paused and has meaningful progress)
  const isPlaying = !video.paused && !video.ended;
  const hasMeaningfulProgress = video.currentTime > 2; // More than 2 seconds watched
  
  // Also check if video duration is reasonable (not a very short video)
  const isReasonableDuration = video.duration > 10 || video.duration === 0; // 0 means still loading
  
  return isPlaying || hasMeaningfulProgress;
}

function isVideoActuallyPlaying() {
  if (!app.videoPlayer.currentVideo) return false;
  
  const video = app.videoPlayer.currentVideo;
  return !video.paused && !video.ended && video.currentTime > 0;
}