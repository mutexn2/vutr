async function bookmarkedListsPageHandler() {
  mainContent.innerHTML = `
    <div id="bookmarkedPlaylistsPage-container">
      <h1>Bookmarked Playlists</h1>
      <div class="loading-indicator">
        <p>Loading your bookmarked playlists...</p>
      </div>
    </div>
  `;

  let pageContainer = document.getElementById("bookmarkedPlaylistsPage-container");

  try {
    // ONLY use bookmarkedPlaylists - no filtering needed
    const bookmarkedPlaylists = app.bookmarkedPlaylists || [];
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    if (bookmarkedPlaylists.length === 0) {
      pageContainer.innerHTML = `
        <div class="empty-state">
          <h1>No Bookmarked Playlists</h1>
          <p>You haven't bookmarked any playlists yet. Browse playlists and bookmark ones you like!</p>
          <a href="#playlists" class="nav-link">Browse Playlists</a>
        </div>
      `;
      return;
    }

    bookmarkedPlaylists.sort((a, b) => b.created_at - a.created_at);
    
    pageContainer.innerHTML = `
      <div class="playlists-header">
        <h1>Bookmarked Playlists</h1>
        <div class="playlists-actions">
          <button class="sync-all-bookmarks-btn btn-secondary">Sync All Bookmarks</button>
        </div>
      </div>
      
      <div class="playlists-section">
        <div class="playlists-grid bookmarked-playlists-grid"></div>
      </div>
    `;
    
    const grid = document.querySelector('.bookmarked-playlists-grid');
    bookmarkedPlaylists.forEach(playlist => {
      const card = createPlaylistCard(playlist, {
        showEditControls: false,
        showAuthor: true,
        badgeText: 'Bookmarked',
        badgeIcon: '🔖'
      });
      grid.appendChild(card);
    });
    
    setupBookmarkedPlaylistsEventListeners();
    
  } catch (error) {
    console.error("Error rendering bookmarked playlists page:", error);
    pageContainer.innerHTML = `
      <h1>Error</h1>
      <div class="error-message">
        <p>Error loading bookmarked playlists: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
  }
}

function setupBookmarkedPlaylistsEventListeners() {
  const grid = document.querySelector('.bookmarked-playlists-grid');
  
  if (grid) {
    grid.addEventListener('click', (event) => {
      let card = event.target.closest('.playlist-card');
      if (card && card.dataset.playlistId) {
        if (event.target.closest('.playlist-edit-overlay')) return;
        
        const author = card.dataset.author;
        const dtag = card.dataset.dtag;
        const discoveryRelays = app.relays.slice(0, 3).map(cleanRelayUrl);
        const uniqueDiscoveryRelays = [...new Set(discoveryRelays)];
        const discoveryParam = uniqueDiscoveryRelays.join(",");
        
        window.location.hash = `#playlist/params?author=${author}&dtag=${dtag}&discovery=${discoveryParam}`;
      }
    });
  }
  
  // Sync all bookmarks button
  const syncAllBtn = document.querySelector('.sync-all-bookmarks-btn');
  if (syncAllBtn) {
    syncAllBtn.addEventListener('click', handleSyncAllBookmarks);
  }
}

async function handleSyncAllBookmarks() {
  const syncAllBtn = document.querySelector('.sync-all-bookmarks-btn');
  const originalText = syncAllBtn.textContent;
  syncAllBtn.textContent = 'Syncing...';
  syncAllBtn.disabled = true;
  
  const bookmarkedPlaylists = app.bookmarkedPlaylists || [];
  let updatedCount = 0;
  
  for (const playlist of bookmarkedPlaylists) {
    try {
      const updatedPlaylist = await syncNetworkPlaylist(playlist);
      if (updatedPlaylist) {
        const index = app.bookmarkedPlaylists.findIndex(
          p => p.pubkey === playlist.pubkey && 
               getValueFromTags(p, "d", "") === getValueFromTags(playlist, "d", "")
        );
        if (index !== -1) {
          app.bookmarkedPlaylists[index] = { ...updatedPlaylist };
          updatedCount++;
        }
      }
    } catch (error) {
      console.error('Error syncing bookmarked playlist:', error);
    }
  }
  
  if (updatedCount > 0) {
    saveBookmarkedPlaylistsToStorage();
    showTemporaryNotification(`Updated ${updatedCount} bookmark(s)`);
    setTimeout(() => location.reload(), 1000);
  } else {
    showTemporaryNotification('All bookmarks are up to date');
    syncAllBtn.textContent = originalText;
    syncAllBtn.disabled = false;
  }
}