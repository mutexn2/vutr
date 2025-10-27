async function likedPageHandler() {
  mainContent.innerHTML = `
    <h1>Liked Videos</h1>
    <div class="loading-indicator">
      <p>Loading your liked videos...</p>
    </div>
  `;
  
  try {
    // Wait for login with retry logic
    const maxRetries = 3;
    const retryDelay = 1500; // 1.5 seconds
    let attempt = 0;
    
    while (attempt < maxRetries) {
      if (app.isLoggedIn && app.myPk) {
        break; // Login successful, proceed
      }
      
      attempt++;
      if (attempt < maxRetries) {
        // Update loading message to show we're waiting for login
        const loadingIndicator = document.querySelector('.loading-indicator p');
        if (loadingIndicator) {
          loadingIndicator.textContent = `Waiting for login... (${attempt}/${maxRetries})`;
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // Final check after retries
    if (!app.isLoggedIn || !app.myPk) {
      mainContent.innerHTML = `
        <div class="error-state">
          <h1>Unable to Load Liked Videos</h1>
          <p>Login is taking longer than expected. Please try refreshing the page.</p>
          <button class="retry-button">Retry</button>
        </div>
      `;
      
      // Add event listener for retry button
      const retryButton = document.querySelector('.retry-button');
      retryButton.addEventListener('click', () => {
        likedPageHandler();
      });
      
      return;
    }
    
    // Update loading message for video fetching
    const loadingIndicator = document.querySelector('.loading-indicator p');
    if (loadingIndicator) {
      loadingIndicator.textContent = 'Searching for liked video events...';
    }
    
    console.log(`Loading liked videos for user: ${app.myPk.slice(0, 8)}... (${app.isGuest ? 'guest' : 'extension'})`);
    
    let videos = await NostrClient.getLikedVideosByUser(app.myPk);
    videos = videos.map(sanitizeNostrEvent).filter(v => v !== null);
    
    if (videos.length === 0) {
      mainContent.innerHTML = `
        <div class="empty-state">
          <h1>No Liked Videos Yet</h1>
          <p>Videos you like will appear here. Start exploring to find content you enjoy!</p>
          <button class="explore-button">Explore Videos</button>
        </div>
      `;
      
      // Add event listener for explore button
      const exploreButton = document.querySelector('.explore-button');
      exploreButton.addEventListener('click', () => {
        window.location.hash = '#home';
      });
      
      return;
    }
    
    console.log(`Displaying ${videos.length} liked videos`);
    
    // Render the videos with improved layout
    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Liked Videos</h1>
        <div class="listv-spacer"></div>
        <p class="video-count">${videos.length} video${videos.length !== 1 ? 's' : ''}</p>
      </div>
      <!-- <div class="videos-listview"></div> -->
      <div class="videos-grid"></div>
    `;
    
  //  const vlist = document.querySelector('.videos-listview');
    const vlist = document.querySelector('.videos-grid');
    // Add videos with a slight stagger for better perceived performance
    videos.forEach((video, index) => {
      setTimeout(() => {
        const card = createVideoCard(video);
        vlist.appendChild(card);
      }, index * 50); // 50ms stagger
    });
    
    // Event delegation for video clicks
    vlist.addEventListener('click', (event) => {
      const card = event.target.closest('.video-card');
      if (card && card.dataset.videoId) {
        window.location.hash = `#watch/${card.dataset.videoId}`;
      }
    });
    
  } catch (error) {
    console.error("Error rendering liked videos page:", error);
    
    mainContent.innerHTML = `
      <div class="error-state">
        <h1>Something Went Wrong</h1>
        <p>We couldn't load your liked videos right now.</p>
        <details>
          <summary>Error details</summary>
          <p>${formatErrorForDisplay(error)}</p>
        </details>
        <button class="retry-button">Try Again</button>
      </div>
    `;
    
    // Add event listener for error retry button
    const retryButton = document.querySelector('.retry-button');
    retryButton.addEventListener('click', () => {
      likedPageHandler();
    });
  }
}