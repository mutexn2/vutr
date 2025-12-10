
let settingsMenuControls = null;

async function showSettingsMenu(buttonElement) {
  // If menu exists, toggle it
  if (settingsMenuControls && settingsMenuControls.isOpen()) {
    settingsMenuControls.close();
    return;
  }

  // If menu doesn't exist, create it
  if (!settingsMenuControls) {
    await createSettingsMenu(buttonElement);
  }

  // Open the menu
  settingsMenuControls.open();
}

async function createSettingsMenu(buttonElement) {
  let appVersion = await getAppVersion();
  console.log('App Version:', appVersion);
  
  // Create overlay container
  let overlayElement = document.createElement('div');
  overlayElement.id = 'settings-overlay';
  overlayElement.classList.add('menu-overlay');
  
  let buttonRect = buttonElement.getBoundingClientRect();
  let currentTheme = document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
  
  let menuElement = document.createElement('div');
  menuElement.id = 'settings-menu';
  menuElement.classList.add('settings-menu');
  
  menuElement.innerHTML = `
    <div class="menu-container">
      <div class="menu-header">
        <div class="user-info">
          <div class="user-avatar">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Struthio_camelus_portrait_Whipsnade_Zoo.jpg/1280px-Struthio_camelus_portrait_Whipsnade_Zoo.jpg" alt="User Avatar">
          </div>
          <div class="user-details">
            <div class="user-name">${app.isLoggedIn ? 'Nostr User' : 'Guest'}</div>
            <div class="user-email">${app.isLoggedIn ? `${app.myNpub.substring(0, 17)}...` : 'Not logged in'}</div>
          </div>
        </div>
      </div>
      
      <div class="menu-items">
        <button class="menu-item profile-link-menu">
          <span class="item-icon">${app.isLoggedIn ? '👤' : '🔑'}</span>
          <span class="item-text">${app.isLoggedIn ? 'Profile' : 'Log In'}</span>
        </button>
        <button class="menu-item" data-route="settings">
          <span class="item-icon">⚙️</span>
          <span class="item-text">Settings</span>
        </button>
        <button class="menu-item" data-route="faq">
          <span class="item-icon">❓</span>
          <span class="item-text">About</span>
        </button>
        <button class="menu-item" data-route="contact">
          <span class="item-icon">💬</span>
          <span class="item-text">Feedback</span>
        </button>
        <button id="theme-toggle-menu" class="menu-item">
          <span class="item-icon">${currentTheme === 'light' ? '🌒' : '☀️'}</span>
          <span class="item-text">${currentTheme === 'light' ? 'Dark Theme' : 'Light Theme'}</span>
          <span class="toggle-switch ${currentTheme === 'light' ? '' : 'active'}"></span>
        </button>
        <button id="settings-color-picker" class="menu-item">
          <span class="item-icon">🎨</span>
          <span class="item-text">Change Primary Color</span>
        </button>        
        <button id="install-pwa-btn" class="menu-item" style="display: none;">
          <span class="item-icon">📱</span>
          <span class="item-text">Install App</span>
        </button>
        <div class="menu-separator"></div>
        <div class="app-version">
          <span class="item-text">${appVersion.split('-')[1]}</span>
        </div>
        <div class="menu-separator"></div>
        ${app.isLoggedIn ? `
        <button class="menu-item logout-btn">
          <span class="item-icon">🚪</span>
          <span class="item-text">Sign Out</span>
        </button>
        ` : ''}
      </div>
    </div>
  `;
  
  // Position the menu
  menuElement.style.top = `${buttonRect.bottom + 5}px`;
  menuElement.style.right = `${window.innerWidth - buttonRect.right + 5}px`;
  
  overlayElement.appendChild(menuElement);
  document.body.appendChild(overlayElement);
  
  // Create overlay controls
  settingsMenuControls = createOverlayControls("settings", overlayElement, {
    closeOnOutsideClick: true,
    closeOnEscape: true,
    preventBodyScroll: false // Don't prevent body scroll for dropdown menus
  });

  // Override the onOpen and onClose to handle menu-specific animations
  const originalOverlay = OverlayManager.overlays.get("settings");
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
      // Clean up - remove the overlay element
      if (overlayElement.parentNode) {
        overlayElement.remove();
      }
      settingsMenuControls = null; // Reset for next time
    }, 150);
  };

  // Set up event listeners
  setupSettingsMenuEvents(menuElement);
  
  // Store reference in app object (optional)
  if (app.overlayControls) {
    app.overlayControls.settings = settingsMenuControls;
  }
}

function setupSettingsMenuEvents(menuElement) {
  // Navigation buttons
  let navigationButtons = menuElement.querySelectorAll('.menu-item[data-route]');
  navigationButtons.forEach(button => {
    button.addEventListener('click', () => {
      let route = button.getAttribute('data-route');
      window.location.hash = route;
      settingsMenuControls.close();
    });
  });
  
  // Profile link
  let profileLinkMenu = menuElement.querySelector('.profile-link-menu');
  profileLinkMenu.addEventListener('click', () => {
    if (app.isLoggedIn) {
      window.location.hash = `#profile/${app.myPk}`;
    } else {
      window.location.hash = '#profile/123';
    }
    settingsMenuControls.close();
  });
  
  // Theme toggle
  let themeToggleInMenu = menuElement.querySelector('#theme-toggle-menu');
  themeToggleInMenu.addEventListener('click', () => {
    let toggleEvent = new Event('click');
    document.getElementById('toggleTheme').dispatchEvent(toggleEvent);
    
    let currentTheme = document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
    themeToggleInMenu.querySelector('.item-icon').textContent = currentTheme === 'light' ? '🌒' : '☀️';
    themeToggleInMenu.querySelector('.item-text').textContent = currentTheme === 'light' ? 'Dark Theme' : 'Light Theme';
    themeToggleInMenu.querySelector('.toggle-switch').classList.toggle('active', currentTheme !== 'light');
  });
  
  // Color picker
  let settingsColorPicker = menuElement.querySelector('#settings-color-picker');
  settingsColorPicker.addEventListener('click', () => {
    colorPickerButton.click();
  });  

  // Logout button
  if (app.isLoggedIn) {
    let logoutButton = menuElement.querySelector('.logout-btn');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        handleSignOut();
        settingsMenuControls.close();
      });
    }
  }

  // PWA Install Button
  let installButton = menuElement.querySelector('#install-pwa-btn');
  
  if (window.deferredPrompt) {
    installButton.style.display = 'block';
  }
  
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true) {
    installButton.style.display = 'none';
  }

  installButton.addEventListener('click', async () => {
    if (!window.deferredPrompt) {
      console.log('No install prompt available');
      return;
    }
    
    try {
      window.deferredPrompt.prompt();
      const { outcome } = await window.deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      window.deferredPrompt = null;
      installButton.style.display = 'none';
      
      settingsMenuControls.close();
    } catch (error) {
      console.error('Install prompt error:', error);
    }
  });
}

async function handleSignOut() {
  const confirmSignOut = confirm('Are you sure you want to sign out?');
  
  if (confirmSignOut) {
    console.log("%c[Sign Out] User confirmed sign out", "color: red; font-weight: bold");
    
    // Clean up bunker connection if it exists
    if (app.loginMethod === 'bunker') {
      console.log("%c[Sign Out] Cleaning up bunker connection", "color: red");
      await cleanupBunkerConnection();
    }
    
    // Remove login preferences
    localStorage.removeItem('preferredLoginMethod');
    
    // Only remove bunker data on logout (not guest data)
    if (app.loginMethod === 'bunker') {
      localStorage.removeItem('bunker_connection_data');
    }
    
    // IMPORTANT: DO NOT remove guest data - preserve for reuse
    // Guest keys stay in localStorage permanently unless explicitly deleted
    console.log("%c[Sign Out] Guest keys preserved for future use", "color: blue");
    
    console.log("%c[Sign Out] Updating app state", "color: red");
    updateApp({
      isLoggedIn: false,
      myPk: null,
      myNpub: null,
      isGuest: false,
      guestSk: null,
      loginMethod: null,
      bunkerSigner: null,
      bunkerLocalSk: null,
      bunkerPointer: null,
      bunkerPool: null
    });
    
    console.log("%c[Sign Out] ✅ Sign out complete, reloading page", "color: red; font-weight: bold");
    window.location.reload();
  }
}

async function getAppVersion() {
  try {
    const cache = await self.caches.open('version-cache');
    const response = await cache.match('version');
    if (response) {
      const version = await response.text();
      return version;
    } else {
      return 'v0.0.0';
    }
  } catch (error) {
    console.error('Error getting app version:', error);
    return 'v0.0';
  }
}


