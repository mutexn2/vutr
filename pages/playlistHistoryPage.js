async function historyListsPageHandler() {
  mainContent.innerHTML = `
    <div id="historyPlaylistsPage-container">
      <h1>Playlist History</h1>
      <div class="loading-indicator">
        <p>Loading your playlist history...</p>
      </div>
    </div>
  `;

  let pageContainer = document.getElementById("historyPlaylistsPage-container");

  try {
    const historyPlaylists = app.playlistHistory || [];
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    if (historyPlaylists.length === 0) {
      pageContainer.innerHTML = `
        <div class="empty-state">
          <h1>No Playlist History</h1>
          <p>You haven't played any playlists yet. Your playlist viewing history will appear here.</p>
        </div>
      `;
      return;
    }

    // Sort by most recent first
    historyPlaylists.sort((a, b) => b.created_at - a.created_at);
    
    pageContainer.innerHTML = `
      <div class="playlists-header">
        <h1>Playlist History</h1>
      </div>
      
      <div class="playlists-section">
        <div class="playlists-grid history-playlists-grid"></div>
      </div>
    `;
    
    const grid = document.querySelector('.history-playlists-grid');
    historyPlaylists.forEach(playlist => {
      // Check if this playlist is local or bookmarked
      const isLocal = isLocalPlaylist(playlist);
      const isBookmarked = !isLocal && isPlaylistInLocalLibrary(playlist);
      
      const card = createPlaylistCard(playlist, {
        showEditControls: false,  // History is read-only
        showAuthor: !isLocal,     // Show author for non-local playlists
        badgeText: isLocal ? 'Local' : (isBookmarked ? 'Bookmarked' : 'History'),
        badgeIcon: isLocal ? '💾' : (isBookmarked ? '🔖' : '🕐')
      });
      grid.appendChild(card);
    });
    
    setupHistoryPlaylistsEventListeners();
    
  } catch (error) {
    console.error("Error rendering history playlists page:", error);
    pageContainer.innerHTML = `
      <h1>Error</h1>
      <div class="error-message">
        <p>Error loading playlist history: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
  }
}

function setupHistoryPlaylistsEventListeners() {
  const grid = document.querySelector('.history-playlists-grid');
  
  if (grid) {
    grid.addEventListener('click', (event) => {
      let card = event.target.closest('.playlist-card');
      if (card && card.dataset.playlistId) {
        if (event.target.closest('.playlist-edit-overlay')) return;
        
        const playlist = app.playlistHistory.find(p => p.id === card.dataset.playlistId);
        if (!playlist) return;
        
        // Check if it's a local playlist
        if (isLocalPlaylist(playlist)) {
          const dtag = card.dataset.dtag;
          window.location.hash = `#localplaylist/${dtag}`;
        } else {
          // It's a network playlist
          const author = card.dataset.author;
          const dtag = card.dataset.dtag;
          const discoveryRelays = app.relays.slice(0, 3).map(cleanRelayUrl);
          const uniqueDiscoveryRelays = [...new Set(discoveryRelays)];
          const discoveryParam = uniqueDiscoveryRelays.join(",");
          
          window.location.hash = `#playlist/params?author=${author}&dtag=${dtag}&discovery=${discoveryParam}`;
        }
      }
    });
  }
}