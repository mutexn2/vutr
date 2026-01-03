async function historyPageHandler() {
  mainContent.innerHTML = `
    <div id="historyPage-container">
      <h1>Video History</h1>
      <div class="loading-indicator">
        <p>Loading your video history...</p>
      </div>
    </div>
  `;

  let pageContainer = document.getElementById("historyPage-container");

  try {
    const historyVideos = app.history || [];
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    if (historyVideos.length === 0) {
      pageContainer.innerHTML = `
        <div class="empty-state">
          <h1>No Video History</h1>
          <p>You haven't watched any videos yet. Your viewing history will appear here.</p>
        </div>
      `;
      return;
    }

    // Sort by most recent first
    historyVideos.sort((a, b) => (b.addedToHistoryAt || b.created_at) - (a.addedToHistoryAt || a.created_at));
    
    pageContainer.innerHTML = `
      <div class="history-header">
        <h1>Video History</h1>
      </div>
      
      <div class="history-section">
        <div class="videos-grid history-videos-grid"></div>
      </div>
    `;
    
    const grid = document.querySelector('.history-videos-grid');
    historyVideos.forEach(video => {
      const card = createVideoCard(video);
      grid.appendChild(card);
    });
    
    setupHistoryVideosEventListeners();
    
  } catch (error) {
    console.error("Error rendering history page:", error);
    pageContainer.innerHTML = `
      <h1>Error</h1>
      <div class="error-message">
        <p>Error loading video history: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
  }
}


function setupHistoryVideosEventListeners() {
  const grid = document.querySelector('.history-videos-grid');
  
  if (grid) {
    grid.addEventListener('click', (event) => {
      let card = event.target.closest('.video-card');
      if (card && card.dataset.videoId) {
        // Don't navigate if clicking on options button or creator section
        if (event.target.closest('.options-button')) return;
        if (event.target.closest('.creator')) return;
        
        const videoId = card.dataset.videoId;
        const author = card.dataset.pubkey;
        
        // Navigate to video page
        window.location.hash = `#watch/params?v=${videoId}&author=${author}`;
      }
    });
  }
}





function addVideoToHistory(video) {
  if (!video || !video.id) return;
  
  const history = app.history || [];
  
  // Check if video already exists in history
  const existingIndex = history.findIndex(v => v.id === video.id);
  
  if (existingIndex !== -1) {
    // Remove the existing entry
    history.splice(existingIndex, 1);
  }
  
  // Add video with new timestamp
  history.push({
    ...video,
    addedToHistoryAt: Math.floor(Date.now() / 1000)
  });
  
  // Keep only last 50 videos in history
  if (history.length > 50) {
    history.splice(0, history.length - 50);
  }
  
  app.history = history;
  localStorage.setItem("history", JSON.stringify(history));
}