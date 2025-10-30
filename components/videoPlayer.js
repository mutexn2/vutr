function createVideoPlayer(video) {
  let url = getValueFromTags(video, "url", "");
  let mimeType = getValueFromTags(video, "m", "video/mp4");
  
  if (!url) {
    return '<div class="video-error">No video URL provided</div>';
  }

  return `
    <video controls class="custom-video-element">
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
  
  // Setup event listeners - be more specific about what gets click handlers
  miniplayer.querySelector('.miniplayer-close').addEventListener('click', stopVideoPlayback);
  miniplayer.querySelector('.miniplayer-expand').addEventListener('click', expandToVideoPage);
  
  // Only make the video itself (not controls) clickable to expand
  miniplayerVideoContainer.addEventListener('click', (e) => {
    // Only expand if clicking directly on the video container (not on controls or drag handle)
    if (e.target === miniplayerVideoContainer || e.target.tagName === 'VIDEO') {
      expandToVideoPage(e);
    }
  });
  
  // Initialize dragging
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
    element.style.bottom = '11vh';
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
  
  if (app.videoPlayer.currentVideoId) {
    window.location.hash = `#watch/${app.videoPlayer.currentVideoId}`;
  }
}
function playVideo(videoElement, videoId, videoData) {
  // Stop any existing video first
  if (app.videoPlayer.currentVideo && app.videoPlayer.currentVideo !== videoElement) {
    stopVideoPlayback();
  }
  
  app.videoPlayer.currentVideo = videoElement;
  app.videoPlayer.currentVideoId = videoId;
  app.videoPlayer.currentVideoData = videoData;
  
  // Add event listeners to track play state
  setupVideoEventListeners(videoElement);
  
  // Update based on current route
  handleVideoRouteChange(window.location.hash);
}

function setupVideoEventListeners(videoElement) {
  // Remove existing listeners to avoid duplicates
  const newVideoElement = videoElement.cloneNode(true);
  videoElement.parentNode.replaceChild(newVideoElement, videoElement);
  
  // Update reference
  app.videoPlayer.currentVideo = newVideoElement;
  
  // Track when video actually starts playing
  newVideoElement.addEventListener('play', () => {
    app.videoPlayer.isPlaying = true;
    console.log("Video started playing");
  });
  
  newVideoElement.addEventListener('pause', () => {
    app.videoPlayer.isPlaying = false;
    console.log("Video paused");
  });
  
  newVideoElement.addEventListener('ended', () => {
    app.videoPlayer.isPlaying = false;
    console.log("Video ended");
  });
  
  newVideoElement.addEventListener('timeupdate', () => {
    // Track progress for our miniplayer decision
    app.videoPlayer.currentTime = newVideoElement.currentTime;
  });
  
  newVideoElement.addEventListener('error', (e) => {
    console.error('Video error:', e);
    stopVideoPlayback();
  });
}

function showMiniplayer() {
  if (!app.videoPlayer.currentVideo || !shouldShowMiniplayer()) {
    // If video shouldn't be in miniplayer, stop it completely
    stopVideoPlayback();
    return;
  }
  
  const miniplayer = document.getElementById('miniplayer');
  const miniplayerVideoContainer = miniplayer.querySelector('.miniplayer-video-container');
  
  // Clear any existing video in miniplayer (avoid duplicates)
  miniplayerVideoContainer.innerHTML = '';
  
  // Move video to miniplayer
  miniplayerVideoContainer.appendChild(app.videoPlayer.currentVideo);
  miniplayer.classList.remove('hidden');
  app.videoPlayer.isMiniplayerVisible = true;
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
  
  // Ensure app state is updated
  app.videoPlayer.isMiniplayerVisible = false;
  
  console.log("Video moved to main player, miniplayer should be hidden");
}

function stopVideoPlayback() {
  if (app.videoPlayer.currentVideo) {
    app.videoPlayer.currentVideo.pause();
    app.videoPlayer.currentVideo = null;
  }
  app.videoPlayer.currentVideoId = null;
  app.videoPlayer.currentVideoData = null;
  app.videoPlayer.isPlaying = false;
  hideMiniplayer();
}

function handleVideoRouteChange(newHash) {
  if (!app.videoPlayer.currentVideo) {
    console.log("No current video, skipping route change handling");
    return;
  }
  
  const isVideoPage = newHash.startsWith('#watch/');
  const currentVideoId = newHash.split('/')[1];
  
  console.log(`Route change: ${newHash}, isVideoPage: ${isVideoPage}, currentVideoId: ${currentVideoId}, appVideoId: ${app.videoPlayer.currentVideoId}`);
  
  if (isVideoPage && currentVideoId === app.videoPlayer.currentVideoId) {
    console.log("Same video page - moving to main player and hiding miniplayer");
    // Same video page - move to main player and HIDE miniplayer
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
      moveVideoToMainPlayer(videoContainer);
      hideMiniplayer(); // Ensure miniplayer is hidden
    } else {
      console.warn("Video container not found!");
    }
  } else if (isVideoPage && currentVideoId !== app.videoPlayer.currentVideoId) {
    console.log("Different video page - stopping current playback");
    // Different video - stop current
    stopVideoPlayback();
  } else {
    console.log("Non-video page - checking if miniplayer should show");
    // Non-video page - only show miniplayer if video is actually playing
    if (shouldShowMiniplayer()) {
      showMiniplayer();
    } else {
      // If video isn't really playing, stop it completely
      stopVideoPlayback();
    }
  }
}
// Updated cleanup function that respects miniplayer
function cleanupVideoResources() {
  // Only clean up videos that are NOT the current playing video
  let videos = document.querySelectorAll("video");
  videos.forEach(video => {
    if (video !== app.videoPlayer.currentVideo) {
      cleanupVideo(video);
    }
  });
}

function cleanupVideo(video) {
  try {
    // Don't cleanup if this is our current playing video
    if (video === app.videoPlayer.currentVideo) {
      return;
    }
    
    video.pause();
    let sources = Array.from(video.querySelectorAll("source"));
    sources.forEach((source) => source.remove());
    video.src = null;
    video.removeAttribute("src");
    video.load();
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