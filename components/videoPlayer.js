const VideoPlayer = (() => {
  // Private state
  let state = {
    videoElement: null,
    videoUrl: null,
    videoId: null,
    videoData: null,
    pageHash: null, // Full URL hash that initiated this video
    isPlaying: false,
    isMiniplayerVisible: false,
    eventHandlers: null,
  };

  // DOM references (cached)
  let miniplayerEl = null;
  let miniplayerContainer = null;

  // Initialize once
  function init() {
    miniplayerEl = document.getElementById("miniplayer");
    miniplayerContainer = miniplayerEl.querySelector(
      ".miniplayer-video-container"
    );

    // Setup miniplayer controls
    miniplayerEl
      .querySelector(".miniplayer-close")
      .addEventListener("click", dispose);
    miniplayerEl
      .querySelector(".miniplayer-expand")
      .addEventListener("click", expandToSource);

const prevBtn = miniplayerEl.querySelector('.miniplayer-prev');
const nextBtn = miniplayerEl.querySelector('.miniplayer-next');
if (prevBtn) prevBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  playPreviousInPlaylist(); // This will call the global function
});
if (nextBtn) nextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  playNextInPlaylist(); // This will call the global function
});

    miniplayerContainer.addEventListener("click", (e) => {
      if (e.target === miniplayerContainer || e.target.tagName === "VIDEO") {
        expandToSource();
      }
    });

    initMiniplayerDrag(
      miniplayerEl,
      miniplayerEl.querySelector(".miniplayer-drag-handle")
    );

    console.log("VideoPlayer module initialized");
  }

  // Main public method - render video player
function render(
  container,
  videoUrl,
  videoId,
  videoData,
  pageHash,
  shouldAutoplay = false
) {
  console.log(`VideoPlayer.render called:`, {
    videoUrl,
    videoId,
    pageHash,
    currentPageHash: state.pageHash,
  });

  // Check if this is the exact same video (same page hash)
  if (state.pageHash === pageHash && state.videoElement) {
    console.log("Same video - moving from miniplayer to main player");
    moveToMainPlayer(container);
    return state.videoElement;
  }

  // Different video - clean up old one
  if (state.videoElement) {
    console.log("Different video - disposing old video");
    disposeVideo();
  }

  // Create new video element (this now includes the wrapper)
  const videoElement = createVideoElement(
    videoUrl,
    videoData,
    shouldAutoplay
  );

  // Update state
  state.videoElement = videoElement;
  state.videoUrl = videoUrl;
  state.videoId = videoId;
  state.videoData = videoData;
  state.pageHash = pageHash;
  state.isPlaying = false;

  // Setup event listeners
  attachVideoEventListeners(videoElement);

  // Add wrapper to container (not just video)
  container.innerHTML = "";
  container.appendChild(videoElement.controlsWrapper);

  // Attempt autoplay if requested
  if (shouldAutoplay) {
    videoElement.play().catch((err) => {
      console.warn("Autoplay prevented:", err);
    });
  }

  return videoElement;
}

  // Create video element with whitelist check
function createVideoElement(url, videoData, shouldAutoplay) {
  const mimeType = getValueFromTags(videoData, "m", "video/mp4");

  const video = document.createElement("video");
  video.controls = false; // Always false - we use custom controls
  video.className = "custom-video-element";
  video.playsInline = true; // Important for mobile
  if (shouldAutoplay) video.autoplay = true;

  const source = document.createElement("source");
  source.src = url;
  source.type = mimeType;
  video.appendChild(source);

  // Create custom controls wrapper immediately
  const wrapper = createCustomVideoControls(video);
  
  // Store wrapper reference
  video.controlsWrapper = wrapper;

  return video;
}
  // Attach event listeners to video
  function attachVideoEventListeners(videoElement) {
    if (videoElement.dataset.listenersAttached === "true") {
      console.warn("Listeners already attached");
      return;
    }

    const handlers = {
      play: () => {
        state.isPlaying = true;
        console.log("Video playing");
      },
      pause: () => {
        state.isPlaying = false;
        console.log("Video paused");
      },
      ended: () => {
        state.isPlaying = false;
        console.log("Video ended");
        playNextInPlaylist();
      },
      error: (e) => {
        console.error("Video error:", e);
        dispose();
      },
    };

    state.eventHandlers = handlers;
    videoElement.dataset.listenersAttached = "true";

    videoElement.addEventListener("play", handlers.play);
    videoElement.addEventListener("pause", handlers.pause);
    videoElement.addEventListener("ended", handlers.ended);
    videoElement.addEventListener("error", handlers.error);
  }

  // Remove event listeners
  function detachVideoEventListeners(videoElement) {
    if (!state.eventHandlers) return;

    videoElement.removeEventListener("play", state.eventHandlers.play);
    videoElement.removeEventListener("pause", state.eventHandlers.pause);
    videoElement.removeEventListener("ended", state.eventHandlers.ended);
    videoElement.removeEventListener("error", state.eventHandlers.error);

    delete videoElement.dataset.listenersAttached;
    state.eventHandlers = null;
    console.log("Video event listeners removed");
  }

  // Move video to miniplayer
function moveToMiniplayer() {
  if (!state.videoElement || !shouldShowMiniplayer()) {
    console.log("Cannot move to miniplayer - no video or shouldn't show");
    return false;
  }

  console.log("Moving video to miniplayer");
  
  // Move the entire wrapper to miniplayer
  miniplayerContainer.innerHTML = "";
  if (state.videoElement.controlsWrapper) {
    miniplayerContainer.appendChild(state.videoElement.controlsWrapper);
  } else {
    // Fallback if wrapper doesn't exist for some reason
    miniplayerContainer.appendChild(state.videoElement);
  }

  updateMiniplayerPlaylistInfo();
  miniplayerEl.classList.remove("hidden");
  state.isMiniplayerVisible = true;

  return true;
}

  // Move video to main player
function moveToMainPlayer(container) {
  if (!state.videoElement) {
    console.warn("No video to move to main player");
    return false;
  }

  console.log("Moving video to main player");

  // Hide miniplayer first
  miniplayerEl.classList.add("hidden");
  state.isMiniplayerVisible = false;

  // Move wrapper to container
  container.innerHTML = "";
  if (state.videoElement.controlsWrapper) {
    container.appendChild(state.videoElement.controlsWrapper);
  } else {
    // Fallback
    container.appendChild(state.videoElement);
  }

  return true;
}


  // Check if miniplayer should be shown
  function shouldShowMiniplayer() {
    if (!state.videoElement) return false;

    const video = state.videoElement;
    const isPlaying = !video.paused && !video.ended;
    const hasMeaningfulProgress = video.currentTime > 2;

    return isPlaying || hasMeaningfulProgress;
  }

  // Handle route changes - called from router
  function handleRouteChange(newHash) {
/*     console.log(`VideoPlayer.handleRouteChange:`, {
      newHash,
      hasVideo: !!state.videoElement,
      currentHash: state.pageHash,
    }); */

    // No active video - nothing to do
    if (!state.videoElement) {
      return;
    }

    const isVideoPage = newHash.startsWith("#watch/");

    // If navigating to the same video page, ensure it's in main player
    if (isVideoPage && newHash === state.pageHash) {
      console.log("Same video page - ensuring main player");
      const videoContainer = document.querySelector(".video-container");
      if (videoContainer && !videoContainer.contains(state.videoElement)) {
        moveToMainPlayer(videoContainer);
      }
      return;
    }

    // If navigating to a different video page, dispose will be handled by new render() call
    if (isVideoPage) {
      console.log("Different video page - will be handled by new render");
      return;
    }

    // Navigating away from video page - show miniplayer
    console.log("Navigating away - attempting to show miniplayer");
    if (!moveToMiniplayer()) {
      // If can't show miniplayer, dispose
      dispose();
    }
  }

  // Expand miniplayer back to video page
  function expandToSource() {
    if (state.pageHash) {
      window.location.hash = state.pageHash;
    } else if (state.videoId) {
      window.location.hash = `#watch/${state.videoId}`;
    }
  }

  // Clean up video element
function cleanupVideoElement(videoElement) {
  try {
    detachVideoEventListeners(videoElement);

    videoElement.pause();
    videoElement.currentTime = 0;

    // Clear sources
    const sources = Array.from(videoElement.querySelectorAll("source"));
    sources.forEach((source) => {
      source.removeAttribute("src");
      source.remove();
    });

    // Revoke blob URLs
    if (videoElement.src && videoElement.src.startsWith("blob:")) {
      URL.revokeObjectURL(videoElement.src);
    }

    videoElement.removeAttribute("src");
    videoElement.src = "";
    videoElement.load();

    // Remove wrapper from DOM
    if (videoElement.controlsWrapper && videoElement.controlsWrapper.parentNode) {
      videoElement.controlsWrapper.parentNode.removeChild(videoElement.controlsWrapper);
    } else if (videoElement.parentNode) {
      videoElement.parentNode.removeChild(videoElement);
    }

    console.log("Video element cleaned up");
  } catch (e) {
    console.error("Error cleaning up video:", e);
  }
}
// Dispose current video
function disposeVideo() {
  if (!state.videoElement) return;

  console.log("Disposing video");
  const videoToClean = state.videoElement;
  
  // Clear state first
  state.videoElement = null;
  state.videoUrl = null;
  state.videoId = null;
  state.videoData = null;
  state.pageHash = null;
  state.isPlaying = false;
  state.isMiniplayerVisible = false; // Add this line

  // Hide miniplayer immediately
  if (miniplayerEl) {
    miniplayerEl.classList.add('hidden');
  }

  // Clean up video element
  cleanupVideoElement(videoToClean);
}
  // Public dispose method (for close button)
  function dispose() {
    disposeVideo();

    // Hide miniplayer
    if (miniplayerEl) {
      miniplayerEl.classList.add("hidden");
      state.isMiniplayerVisible = false;
    }

    // Handle playlist history
    if (app.currentPlaylist) {
      addPlaylistToHistory(app.currentPlaylist);
      app.currentPlaylist = null;
      app.currentPlaylistIndex = 0;
    }

    console.log("VideoPlayer disposed");
  }

  // Get current state (for debugging/integration)
  function getState() {
    return {
      isActive: !!state.videoElement,
      videoId: state.videoId,
      pageHash: state.pageHash,
      isPlaying: state.isPlaying,
      isMiniplayerVisible: state.isMiniplayerVisible,
    };
  }

  // Update miniplayer playlist info
  function updateMiniplayerPlaylistInfo() {
    const playlistInfo = miniplayerEl.querySelector(
      ".miniplayer-playlist-info"
    );
    const prevBtn = miniplayerEl.querySelector(".miniplayer-prev");
    const nextBtn = miniplayerEl.querySelector(".miniplayer-next");

    if (!app.currentPlaylist) {
      playlistInfo.innerHTML =
        '<div style="opacity: 0.5; font-size: 11px;">Playing video</div>';
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
      return;
    }

    const title = getValueFromTags(app.currentPlaylist, "title", "Playlist");
    const videoTags = app.currentPlaylist.tags.filter((tag) => tag[0] === "e");
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

    if (prevBtn)
      prevBtn.style.display = app.currentPlaylistIndex > 0 ? "flex" : "none";
    if (nextBtn)
      nextBtn.style.display =
        app.currentPlaylistIndex < totalVideos - 1 ? "flex" : "none";
  }

  // Miniplayer drag functionality (keep as is)
  function initMiniplayerDrag(miniplayer, dragHandle) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let clickStartTime = 0;
    const DRAG_THRESHOLD = 5; // pixels movement to consider it a drag
    const CLICK_MAX_DURATION = 200; // ms to consider it a click vs drag

    // Load saved position from localStorage
    loadMiniplayerPosition(miniplayer);

    dragHandle.addEventListener("mousedown", startDrag);
    dragHandle.addEventListener("touchstart", startDragTouch);

    function startDrag(e) {
      isDragging = false; // Start as not dragging
      clickStartTime = Date.now();

      const rect = miniplayer.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;

      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);

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

        document.addEventListener("touchmove", handleDragMoveTouch);
        document.addEventListener("touchend", handleDragEnd);

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
          miniplayer.classList.add("dragging");
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
          miniplayer.classList.add("dragging");
        }

        updatePosition(miniplayer, initialLeft + dx, initialTop + dy);
      }
    }

    function handleDragEnd(e) {
      const wasDragging = isDragging;
      const clickDuration = Date.now() - clickStartTime;

      // Clean up
      isDragging = false;
      miniplayer.classList.remove("dragging");

      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("touchmove", handleDragMoveTouch);
      document.removeEventListener("mouseup", handleDragEnd);
      document.removeEventListener("touchend", handleDragEnd);

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

      element.style.left = left + "px";
      element.style.top = top + "px";
      element.style.right = "auto";
      element.style.bottom = "auto";
    }

    // Double-click to reset position
    dragHandle.addEventListener("dblclick", () => {
      resetMiniplayerPosition();
    });
  }

function updatePlaylistInfo() {
  if (state.isMiniplayerVisible) {
    updateMiniplayerPlaylistInfo();
  }
}

  // Public API
  return {
    init,
    render,
    handleRouteChange,
    dispose,
    getState,
  updatePlaylistInfo,
  };







// Video control helper functions
function formatTime(seconds) {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function togglePlayPause(videoElement) {
  if (!videoElement) return;
  if (videoElement.paused) {
    videoElement.play();
  } else {
    videoElement.pause();
  }
}

function toggleFullscreen(container) {
  if (!document.fullscreenElement) {
    container.requestFullscreen?.() || 
    container.webkitRequestFullscreen?.() || 
    container.mozRequestFullScreen?.();
  } else {
    document.exitFullscreen?.() || 
    document.webkitExitFullscreen?.() || 
    document.mozCancelFullScreen?.();
  }
}

function toggleMute(videoElement) {
  if (!videoElement) return;
  videoElement.muted = !videoElement.muted;
}

function setVolume(videoElement, value) {
  if (!videoElement) return;
  videoElement.volume = value;
  videoElement.muted = false;
}

function seekTo(videoElement, time) {
  if (!videoElement) return;
  videoElement.currentTime = time;
}

function createCustomVideoControls(videoElement) {
  // Create wrapper that will contain both video and controls
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-video-wrapper';
  
  // Create custom controls overlay
  const controlsHTML = `
    <div class="custom-video-controls">
      <div class="video-progress-container">
        <div class="video-progress-bar">
          <div class="video-progress-filled"></div>
        </div>
      </div>
      <div class="video-controls-bottom">
        <button class="video-control-btn play-pause-btn" aria-label="Play/Pause">
          <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        </button>
        <div class="video-time">
          <span class="current-time">0:00</span>
          <span class="time-separator">/</span>
          <span class="duration-time">0:00</span>
        </div>
        <div class="video-volume-control">
          <button class="video-control-btn volume-btn" aria-label="Mute/Unmute">
            <svg class="volume-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <svg class="mute-icon" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          </button>
          <input type="range" class="volume-slider" min="0" max="1" step="0.01" value="1">
        </div>
        <button class="video-control-btn fullscreen-btn" aria-label="Fullscreen">
          <svg class="fullscreen-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
          </svg>
          <svg class="exit-fullscreen-icon" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Add video to wrapper
  wrapper.appendChild(videoElement);
  
  // Add controls
  wrapper.insertAdjacentHTML('beforeend', controlsHTML);

  // Get control elements
  const controls = wrapper.querySelector('.custom-video-controls');
  const playPauseBtn = controls.querySelector('.play-pause-btn');
  const playIcon = controls.querySelector('.play-icon');
  const pauseIcon = controls.querySelector('.pause-icon');
  const currentTimeEl = controls.querySelector('.current-time');
  const durationTimeEl = controls.querySelector('.duration-time');
  const progressBar = controls.querySelector('.video-progress-bar');
  const progressFilled = controls.querySelector('.video-progress-filled');
  const volumeBtn = controls.querySelector('.volume-btn');
  const volumeIcon = controls.querySelector('.volume-icon');
  const muteIcon = controls.querySelector('.mute-icon');
  const volumeSlider = controls.querySelector('.volume-slider');
  const fullscreenBtn = controls.querySelector('.fullscreen-btn');
  const fullscreenIcon = controls.querySelector('.fullscreen-icon');
  const exitFullscreenIcon = controls.querySelector('.exit-fullscreen-icon');

  let controlsTimeout;
  let isSeeking = false;

  // Update UI functions
  function updatePlayPauseUI() {
    if (videoElement.paused) {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    } else {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    }
  }

  function updateVolumeUI() {
    if (videoElement.muted || videoElement.volume === 0) {
      volumeIcon.style.display = 'none';
      muteIcon.style.display = 'block';
    } else {
      volumeIcon.style.display = 'block';
      muteIcon.style.display = 'none';
    }
    volumeSlider.value = videoElement.muted ? 0 : videoElement.volume;
  }

  function updateProgress() {
    if (isSeeking) return;
    const percent = (videoElement.currentTime / videoElement.duration) * 100 || 0;
    progressFilled.style.width = percent + '%';
  }

  function updateTime() {
    currentTimeEl.textContent = formatTime(videoElement.currentTime);
    durationTimeEl.textContent = formatTime(videoElement.duration);
  }

  function showControls() {
    controls.classList.add('visible');
    clearTimeout(controlsTimeout);
    if (!videoElement.paused) {
      controlsTimeout = setTimeout(() => {
        controls.classList.remove('visible');
      }, 3000);
    }
  }

  function adjustVolume(delta) {
    const newVolume = Math.max(0, Math.min(1, videoElement.volume + delta));
    setVolume(videoElement, newVolume);
    showControls();
  }

  // Play/Pause button
  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause(videoElement);
  });

  // Video event listeners
  videoElement.addEventListener('play', () => {
    updatePlayPauseUI();
    showControls();
  });

  videoElement.addEventListener('pause', () => {
    updatePlayPauseUI();
    controls.classList.add('visible');
    clearTimeout(controlsTimeout);
  });

  videoElement.addEventListener('timeupdate', () => {
    updateProgress();
    updateTime();
  });

  videoElement.addEventListener('loadedmetadata', () => {
    updateTime();
  });

  videoElement.addEventListener('volumechange', updateVolumeUI);

  // Progress bar seeking
  progressBar.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    isSeeking = true;
    seek(e);
  });

  progressBar.addEventListener('mousemove', (e) => {
    if (!isSeeking) return;
    e.stopPropagation();
    seek(e);
  });

  document.addEventListener('mouseup', () => {
    isSeeking = false;
  });

  progressBar.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  function seek(e) {
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = percent * videoElement.duration;
    seekTo(videoElement, time);
    progressFilled.style.width = (percent * 100) + '%';
  }

  // Volume controls
  volumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMute(videoElement);
  });

  volumeSlider.addEventListener('input', (e) => {
    e.stopPropagation();
    setVolume(videoElement, e.target.value);
  });

  volumeSlider.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Fullscreen
  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen(wrapper);
  });

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      fullscreenIcon.style.display = 'none';
      exitFullscreenIcon.style.display = 'block';
    } else {
      fullscreenIcon.style.display = 'block';
      exitFullscreenIcon.style.display = 'none';
    }
  });

  // Show/hide controls on mouse movement
  wrapper.addEventListener('mousemove', showControls);
  wrapper.addEventListener('mouseenter', showControls);
  wrapper.addEventListener('mouseleave', () => {
    if (!videoElement.paused) {
      controls.classList.remove('visible');
    }
  });

  // Click on video to play/pause
  videoElement.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause(videoElement);
  });

  // Keyboard shortcuts
  wrapper.addEventListener('keydown', (e) => {
    switch(e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlayPause(videoElement);
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen(wrapper);
        break;
      case 'm':
        e.preventDefault();
        toggleMute(videoElement);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seekTo(videoElement, videoElement.currentTime - 5);
        showControls();
        break;
      case 'ArrowRight':
        e.preventDefault();
        seekTo(videoElement, videoElement.currentTime + 5);
        showControls();
        break;
      case 'ArrowUp':
        e.preventDefault();
        adjustVolume(0.05); // Increase volume by 5%
        break;
      case 'ArrowDown':
        e.preventDefault();
        adjustVolume(-0.05); // Decrease volume by 5%
        break;
    }
  });

  wrapper.setAttribute('tabindex', '0');

  // Initial UI update
  updatePlayPauseUI();
  updateVolumeUI();
  showControls();

  // Store reference on video element
  videoElement.controlsWrapper = wrapper;

  return wrapper;
}
  
})();



function playNextInPlaylist() {
  if (!app.currentPlaylist) return;

  const videoTags = app.currentPlaylist.tags.filter(tag => tag[0] === "e");

  if (app.currentPlaylistIndex >= videoTags.length - 1) {
    console.log("Already at last video");
    return;
  }

  app.currentPlaylistIndex++;
  const nextVideoTag = videoTags[app.currentPlaylistIndex];
  const videoId = nextVideoTag[1];
  const relayHint = nextVideoTag[2]; // Extract relay hint (third element)
  const dTag = getValueFromTags(app.currentPlaylist, "d", "");
  const pubkey = app.currentPlaylist.pubkey;

  // Construct URL with optional discover parameter
  let url = `#watch/params?v=${videoId}&listp=${pubkey}&listd=${dTag}`;
  if (relayHint) {
    const cleanRelay = cleanRelayUrl(relayHint);
    if (cleanRelay) {
      url += `&discovery=${cleanRelay}`;
    }
  }
  
  window.location.hash = url;
}

function playPreviousInPlaylist() {
  if (!app.currentPlaylist) return;

  if (app.currentPlaylistIndex <= 0) {
    console.log("Already at first video");
    return;
  }

  app.currentPlaylistIndex--;
  const videoTags = app.currentPlaylist.tags.filter(tag => tag[0] === "e");
  const prevVideoTag = videoTags[app.currentPlaylistIndex];
  const videoId = prevVideoTag[1];
  const relayHint = prevVideoTag[2]; // Extract relay hint (third element)
  const dTag = getValueFromTags(app.currentPlaylist, "d", "");
  const pubkey = app.currentPlaylist.pubkey;

  // Construct URL with optional discover parameter
  let url = `#watch/params?v=${videoId}&listp=${pubkey}&listd=${dTag}`;
  if (relayHint) {
    const cleanRelay = cleanRelayUrl(relayHint);
    if (cleanRelay) {
      url += `&discovery=${cleanRelay}`;
    }
  }
  
  window.location.hash = url;
}

///////

function saveMiniplayerPosition(miniplayer) {
  const position = {
    left: miniplayer.style.left,
    top: miniplayer.style.top,
  };
  localStorage.setItem("miniplayerPosition", JSON.stringify(position));
}

function loadMiniplayerPosition(miniplayer) {
  try {
    const saved = localStorage.getItem("miniplayerPosition");
    if (saved) {
      const position = JSON.parse(saved);
      if (position.left && position.top) {
        miniplayer.style.left = position.left;
        miniplayer.style.top = position.top;
        miniplayer.style.right = "auto";
        miniplayer.style.bottom = "auto";
      }
    }
  } catch (e) {
    console.warn("Failed to load miniplayer position:", e);
  }
}

function resetMiniplayerPosition() {
  const miniplayer = document.getElementById("miniplayer");
  miniplayer.style.left = "";
  miniplayer.style.top = "";
  miniplayer.style.right = "20px";
  miniplayer.style.bottom = "11vh";
  localStorage.removeItem("miniplayerPosition");
}








/* 


Space / K = Play/Pause
F = Fullscreen
M = Mute/Unmute
Arrow Left = Rewind 5 seconds
Arrow Right = Forward 5 seconds
Arrow Up = Volume up 5%
Arrow Down = Volume down 5% */