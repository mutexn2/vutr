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

    // Create new video element
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

    // Add to container
    container.innerHTML = "";
    container.appendChild(videoElement);

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

    // Check whitelist logic here if needed
    // For now, proceeding with video creation

    const video = document.createElement("video");
    video.controls = true;
    video.className = "custom-video-element";
    if (shouldAutoplay) video.autoplay = true;

    const source = document.createElement("source");
    source.src = url;
    source.type = mimeType;
    video.appendChild(source);

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
    miniplayerContainer.innerHTML = "";
    miniplayerContainer.appendChild(state.videoElement);

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

    // Move video to container
    container.innerHTML = "";
    container.appendChild(state.videoElement);

    // Ensure correct styling
    state.videoElement.className = "custom-video-element";
    state.videoElement.controls = true;

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
    console.log(`VideoPlayer.handleRouteChange:`, {
      newHash,
      hasVideo: !!state.videoElement,
      currentHash: state.pageHash,
    });

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

      // Remove from DOM
      if (videoElement.parentNode) {
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
  const dTag = getValueFromTags(app.currentPlaylist, "d", "");
  const pubkey = app.currentPlaylist.pubkey;

  window.location.hash = `#watch/params?v=${videoId}&listp=${pubkey}&listd=${dTag}`;
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
  const dTag = getValueFromTags(app.currentPlaylist, "d", "");
  const pubkey = app.currentPlaylist.pubkey;

  window.location.hash = `#watch/params?v=${videoId}&listp=${pubkey}&listd=${dTag}`;
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
