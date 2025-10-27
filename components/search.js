function initSearch() {
  const searchContainer = document.getElementById('search-container');
  const searchToggle = document.getElementById('searchToggle');
  
  let searchControls = null;

function createSearchOverlay() {
  const activeRelay = getActiveSearchRelay();
  
  return `
    <div id="search-overlay" class="search-overlay">
      <div class="search-wrapper">
        <div class="search-content">
          <nostr-user-search 
            id="main-search"
            relays="${activeRelay}"
            template="custom-search-template"
            placeholder="Search users..." 
            limit="8"
            >
          </nostr-user-search>
          <button type="button" class="close-search" aria-label="Close search">✕</button>
        </div>
      </div>
    </div>
  `;
}

  // Initialize the search overlay
  function initSearchOverlay() {
    if (!searchContainer.querySelector('#search-overlay')) {
      searchContainer.innerHTML = createSearchOverlay();
      setupOverlayControls();
      setupSearchEventListeners();
    }
  }

  // Setup overlay controls using OverlayManager
  function setupOverlayControls() {
    const searchOverlay = searchContainer.querySelector('#search-overlay');
    
    // Create overlay controls with back button support
    searchControls = createOverlayControls('search-overlay', searchOverlay, {
      closeOnOutsideClick: true,
      closeOnEscape: true,
      preventBodyScroll: false // Search doesn't need to prevent body scroll
    });
  }


function setupSearchEventListeners() {
  const closeSearch = searchContainer.querySelector('.close-search');
  const mainSearch = searchContainer.querySelector('#main-search');

  // Close search button
  closeSearch?.addEventListener('click', () => {
    searchControls?.close();
  });

  // Handle user selection
  mainSearch?.addEventListener('selected', handleUserSelected);

  // Add loading state handling
  mainSearch?.addEventListener('search-start', () => {
    mainSearch.classList.add('searching');
  });

  mainSearch?.addEventListener('search-end', () => {
    mainSearch.classList.remove('searching');
  });
}

  // Handle user selection from search results
  function handleUserSelected(event) {
    const { pubkey, npub, metadata } = event.detail;
    console.log('User selected:', { pubkey, npub, metadata });
    
    // Navigate to profile page
    window.location.hash = `#profile/${pubkey}`;
    
    // Close search
    searchControls?.close();
  }

  // Search toggle button handler
  searchToggle?.addEventListener('click', () => {
    // Initialize overlay if not already done
    if (!searchControls) {
      initSearchOverlay();
    }
    
    // Toggle search
    searchControls?.toggle();
    
    // Focus on search input when opening
    if (searchControls?.isOpen()) {
      setTimeout(() => {
        const searchInput = searchContainer.querySelector('#main-search')
          ?.shadowRoot?.querySelector('input[part="input"]');
        searchInput?.focus();
      }, 100);
    }
  });

  // Cleanup function (call this if you need to destroy the search component)
  function cleanup() {
    if (searchControls) {
      OverlayManager.unregister('search-overlay');
      searchControls = null;
    }
  }

  // Return cleanup function in case it's needed
  return { cleanup };
}