let notificationsMenuControls = null;

async function showNotifyMenu(buttonElement) {
  // If menu exists, toggle it
  if (notificationsMenuControls && notificationsMenuControls.isOpen()) {
    notificationsMenuControls.close();
    return;
  }

  // If menu doesn't exist, create it
  if (!notificationsMenuControls) {
    await createNotificationsMenu(buttonElement);
  }

  // Open the menu
  notificationsMenuControls.open();
}

async function createNotificationsMenu(buttonElement) {
  // Create overlay container
  let overlayElement = document.createElement('div');
  overlayElement.id = 'notifications-overlay';
  overlayElement.classList.add('menu-overlay');
  
  let buttonRect = buttonElement.getBoundingClientRect();
  
  let menuElement = document.createElement('div');
  menuElement.id = 'notifications-menu';
  menuElement.classList.add('settings-menu'); // Reusing same styles
  
  menuElement.innerHTML = `
    <div class="menu-container">
      <div class="menu-header">
        <div class="user-info">
          Notifications
        </div>
      </div>
      
      <div class="menu-items">
        <button class="menu-item" data-route="notify">
          <span class="item-icon">🔔</span>
          <span class="item-text">Notifications</span>
        </button>
        <div class="menu-separator"></div>
      </div>
      <p>no new notifications.</p>
    </div>
  `;
  
  // Position the menu
  menuElement.style.top = `${buttonRect.bottom + 5}px`;
  menuElement.style.right = `${window.innerWidth - buttonRect.right - 45}px`;
  
  overlayElement.appendChild(menuElement);
  document.body.appendChild(overlayElement);
  
  // Create overlay controls
  notificationsMenuControls = createOverlayControls("notifications", overlayElement, {
    closeOnOutsideClick: true,
    closeOnEscape: true,
    preventBodyScroll: false
  });

  // Override onOpen and onClose for animations
  const originalOverlay = OverlayManager.overlays.get("notifications");
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
      if (overlayElement.parentNode) {
        overlayElement.remove();
      }
      notificationsMenuControls = null;
    }, 150);
  };

  // Set up event listeners
  setupNotificationsMenuEvents(menuElement);
  
  // Store reference in app object (optional)
  if (app.overlayControls) {
    app.overlayControls.notifications = notificationsMenuControls;
  }
}

function setupNotificationsMenuEvents(menuElement) {
  // Navigation buttons
  let navigationButtons = menuElement.querySelectorAll('.menu-item[data-route]');
  navigationButtons.forEach(button => {
    button.addEventListener('click', () => {
      let route = button.getAttribute('data-route');
      window.location.hash = route;
      notificationsMenuControls.close();
    });
  });
}



