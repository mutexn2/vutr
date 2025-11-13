/////////////////////////
// global UI

function updateTheme() {

const sunSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
</svg>
`;


const moonSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
</svg>
`;


  if (app.theme === "light") {
    body.classList.add("light-theme");
    toggleThemeButton.innerHTML = moonSvg;
  } else {
    body.classList.remove("light-theme");
    toggleThemeButton.innerHTML = sunSvg;
  }

  // Apply color palette if it exists
  if (app.colorPalette) {
    applyColorPalette(app.colorPalette);
  } else if (app.primaryColor) {
    // Generate palette from primary color if we don't have a full palette saved
    const palette = generateColorPalette(app.primaryColor);
    applyColorPalette(palette);
    app.colorPalette = palette;
  }
}

function toggleTheme() {
  body.classList.toggle("light-theme");
  if (body.classList.contains("light-theme")) {
    app.theme = "light";
    localStorage.setItem("theme", "light");
  } else {
    app.theme = "dark";
    localStorage.setItem("theme", "dark");
  }
  updateTheme();
}

function setupSidebarToggle() {
  let sidebarToggle = document.getElementById("sidebar-toggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      let sidebar = document.querySelector(".sidebar");
      sidebar.classList.toggle("collapsed");

      app.sidebarCollapsed = sidebar.classList.contains("collapsed");

      let main = document.querySelector("main");
      if (window.innerWidth > 768) {
        if (sidebar.classList.contains("collapsed")) {
          main.style.marginLeft = "0";
        } else {
          main.style.marginLeft = "0";
        }
      }
    });
  } else {
    console.error("Sidebar toggle button not found");
  }
}

function initNotifyMenuButton() {
  let notifyButton = document.getElementById("notify-menu-btn");

  notifyButton.addEventListener("click", () => {
    showNotifyMenu(notifyButton);
  });
}
///////////////////////////
// temporary notification
function showTemporaryNotification(message) {
  // Create notification element
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 30px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--surface);
    color: var(--text);
    padding: 16px 30px;
    border-radius: 8px;
    border: 1px solid var(--border);
    z-index: 1001;
    font-size: 16px;
    box-shadow: 0px 4px 8px var(--background);
    transition: opacity 0.3s ease;
    text-align: start;

    /* styles to control size */
    max-width: 90vw;  /* Never wider than 90% of viewport width */
    max-height: 50vh; /* Never taller than 50% of viewport height */
    overflow: auto;   /* Add scrollbars if content exceeds max size */
    word-wrap: break-word; /* Ensure long words break and wrap */
    white-space: normal;   /* Allow text to wrap */
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

///////////////////////////////

function forceScrollToTop() {
  // Force scroll everything that might be scrollable
  const scrollableElements = [
    window,
    document.documentElement,
    document.body,
    document.getElementById("main"),
    document.querySelector(".main-content"),
    document.querySelector(".page-container"),
    document.querySelector("main"),
  ].filter((el) => el); // Remove null elements

  scrollableElements.forEach((element) => {
    try {
      if (element === window) {
        element.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        element.scrollTo({ top: 0, behavior: "smooth" });
        element.scrollTop = 0; // Immediate fallback
      }
    } catch (e) {
      // Some elements might not support scrollTo
      if (element.scrollTop !== undefined) {
        element.scrollTop = 0;
      }
    }
  });

  // Final insurance
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, 100);
}

//////////////////////////////
// drag/scroll
function enableDragScroll(element) {
  let isDragging = false;
  let startX, scrollLeft;
  let hasMoved = false;

  element.addEventListener("mousedown", (event) => {
    isDragging = true;
    hasMoved = false;
    startX = event.pageX - element.offsetLeft;
    scrollLeft = element.scrollLeft;
    element.style.cursor = "grabbing";
    event.preventDefault();
  });

  element.addEventListener("mousemove", (event) => {
    if (!isDragging) return;

    // Track if actual movement occurred
    let x = event.pageX - element.offsetLeft;
    let walk = (x - startX) * 1;

    // If we've moved by at least a few pixels, set hasMoved to true
    if (Math.abs(walk) > 3) {
      hasMoved = true;
    }

    element.scrollLeft = scrollLeft - walk;
    event.preventDefault();
  });

  element.addEventListener("mouseup", (event) => {
    // If we've been dragging and have moved, prevent the click
    if (isDragging && hasMoved) {
      event.preventDefault();
      event.stopPropagation();

      // Add a one-time click interceptor
      let clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.removeEventListener("click", clickHandler, true);
      };

      element.addEventListener("click", clickHandler, true);
    }

    isDragging = false;
    element.style.cursor = "grab";
  });

  element.addEventListener("mouseleave", () => {
    isDragging = false;
    element.style.cursor = "grab";
  });
}

function enableWheelScroll(element) {
  element.addEventListener(
    "wheel",
    (event) => {
      //console.log('Wheel event detected');

      // Always prevent default to ensure we control the scrolling
      event.preventDefault();

      let scrollAmount = event.deltaY < 0 ? -20 : 20;
      //console.log('Scrolling by:', scrollAmount, 'Current scroll:', element.scrollLeft);

      element.scrollLeft += scrollAmount;
      //console.log('New scroll position:', element.scrollLeft);
    },
    { passive: false }
  ); // Important for preventDefault to work
}

//////////////////////////////
// appearance
// Generate a high-contrast color palette that preserves near-black backgrounds
function generateColorPalette(primaryColor) {
  // Convert primary to HSL for easier manipulation
  const hsl = hexToHSL(primaryColor);

  return {
    // Brand colors (using the selected primary)
    primary: primaryColor,
    primaryHover: adjustLightness(primaryColor, 15), // Lighter for hover
    secondary: adjustHue(primaryColor, 30), // Complementary color
    accent: adjustHue(primaryColor, 60), // Accent with different hue

    // Dark theme colors - maintaining high contrast with near-black background
    darkBackground: "#0b0e0c", // Almost black background
    darkSurface: "#1E1E1E", // Very dark surface
    darkText: "#ffffffff", // Almost white text
    darkBorder: "#333333", // Dark borders

    // Light theme colors - maintaining high contrast
    lightBackground: "#e7eff0", // Light background
    lightSurface: "#c2c2c2", // Surface color
    lightText: "#020202ff", // Very dark text
    lightBorder: "#4b4b4b", // Light borders
  };
}

function applyColorPalette(palette) {
  // Apply brand colors
  document.documentElement.style.setProperty("--primary", palette.primary);
  document.documentElement.style.setProperty(
    "--primary-hover",
    palette.primaryHover
  );
  document.documentElement.style.setProperty("--secondary", palette.secondary);
  document.documentElement.style.setProperty("--accent", palette.accent);

  // Apply theme-specific colors - these stay consistent regardless of primary color
  if (app.theme === "dark") {
    document.documentElement.style.setProperty(
      "--background",
      palette.darkBackground
    );
    document.documentElement.style.setProperty(
      "--surface",
      palette.darkSurface
    );
    document.documentElement.style.setProperty("--text", palette.darkText);
    document.documentElement.style.setProperty("--border", palette.darkBorder);
  } else {
    document.documentElement.style.setProperty(
      "--background",
      palette.lightBackground
    );
    document.documentElement.style.setProperty(
      "--surface",
      palette.lightSurface
    );
    document.documentElement.style.setProperty("--text", palette.lightText);
    document.documentElement.style.setProperty("--border", palette.lightBorder);
  }
}

// Convert hex color to HSL
function hexToHSL(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to hex
function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Adjust lightness of a color
function adjustLightness(color, amount) {
  const hsl = hexToHSL(color);
  return hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(100, hsl.l + amount)));
}

// Adjust hue of a color
function adjustHue(color, amount) {
  const hsl = hexToHSL(color);
  return hslToHex((hsl.h + amount) % 360, hsl.s, hsl.l);
}

// Generate background color that ensures good contrast with primary
function generateContrastBackground(primaryColor, theme) {
  const hsl = hexToHSL(primaryColor);

  if (theme === "dark") {
    // For dark theme, create a dark background with slight hue influence from primary
    return hslToHex(
      (hsl.h + 210) % 360,
      Math.min(hsl.s, 15),
      Math.min(10, 100 - hsl.l)
    );
  } else {
    // For light theme, create a light background with slight hue influence from primary
    return hslToHex(
      (hsl.h + 30) % 360,
      Math.min(hsl.s, 30),
      Math.max(90, 100 - hsl.l)
    );
  }
}

// Ensure text color has sufficient contrast with background
function ensureTextContrast(primaryColor, theme) {
  const hsl = hexToHSL(primaryColor);

  if (theme === "dark") {
    // For dark theme, bright text
    return hslToHex(hsl.h, Math.min(hsl.s, 10), 95);
  } else {
    // For light theme, dark text
    return hslToHex(hsl.h, Math.min(hsl.s, 10), 15);
  }
}

////////////////////////////////////////
//////////////////////////////////
// Universal overlay manager
const OverlayManager = {
  // Track all registered overlays
  overlays: new Map(),

  // Register a new overlay component
  register(id, config) {
    this.overlays.set(id, {
      id,
      isOpen: false,
      ...config,
    });

    // Set up the popstate listener only once
    if (this.overlays.size === 1) {
      window.addEventListener("popstate", this.handlePopState.bind(this));
    }
  },

  // Unregister an overlay (cleanup)
  unregister(id) {
    this.overlays.delete(id);

    // Remove popstate listener if no overlays remain
    if (this.overlays.size === 0) {
      window.removeEventListener("popstate", this.handlePopState.bind(this));
    }
  },

  // Open an overlay
  open(id) {
    const overlay = this.overlays.get(id);
    if (!overlay || overlay.isOpen) return;

    // Close any other open overlays first
    this.closeAll();

    // Push state for back button support
    history.pushState({ overlayOpen: id }, "", window.location.href);

    // Mark as open and call open callback
    overlay.isOpen = true;
    if (overlay.onOpen) {
      overlay.onOpen();
    }
  },

  // Close a specific overlay
  close(id, skipHistoryBack = false) {
    const overlay = this.overlays.get(id);
    if (!overlay || !overlay.isOpen) return;

    // Mark as closed and call close callback
    overlay.isOpen = false;
    if (overlay.onClose) {
      overlay.onClose();
    }

    // Handle history navigation
    if (!skipHistoryBack && history.state && history.state.overlayOpen === id) {
      history.back();
    }
  },

  // Close all overlays
  closeAll(skipHistoryBack = false) {
    this.overlays.forEach((overlay, id) => {
      if (overlay.isOpen) {
        this.close(id, skipHistoryBack);
      }
    });
  },

  // Handle back button presses
  handlePopState() {
    // Find any open overlay and close it
    const openOverlay = Array.from(this.overlays.values()).find(
      (overlay) => overlay.isOpen
    );
    if (openOverlay) {
      this.close(openOverlay.id, true); // Skip history.back() since we're already in popstate
    }
  },

  // Check if any overlay is open
  isAnyOpen() {
    return Array.from(this.overlays.values()).some((overlay) => overlay.isOpen);
  },

  // Get the currently open overlay
  getCurrentlyOpen() {
    return Array.from(this.overlays.values()).find((overlay) => overlay.isOpen);
  },
};

// Helper function to create overlay controls
function createOverlayControls(id, overlayElement, options = {}) {
  const {
    closeOnOutsideClick = true,
    closeOnEscape = true,
    preventBodyScroll = true,
  } = options;

  // Register the overlay
  OverlayManager.register(id, {
    onOpen() {
      overlayElement.classList.add("open");
      if (preventBodyScroll) {
        document.body.style.overflow = "hidden";
      }
    },

    onClose() {
      overlayElement.classList.remove("open");
      if (preventBodyScroll) {
        document.body.style.overflow = "";
      }
    },
  });

  // Set up outside click listener
  if (closeOnOutsideClick) {
    overlayElement.addEventListener("click", (e) => {
      if (e.target === overlayElement) {
        OverlayManager.close(id);
      }
    });
  }

  // Set up escape key listener
  if (closeOnEscape) {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && OverlayManager.overlays.get(id)?.isOpen) {
        OverlayManager.close(id);
      }
    });
  }

  // Return control functions
  return {
    open: () => OverlayManager.open(id),
    close: () => OverlayManager.close(id),
    toggle: () => {
      const overlay = OverlayManager.overlays.get(id);
      if (overlay?.isOpen) {
        OverlayManager.close(id);
      } else {
        OverlayManager.open(id);
      }
    },
    isOpen: () => OverlayManager.overlays.get(id)?.isOpen || false,
  };
}

/////////////////
// OFFLINE
let isOffline = false;

window.addEventListener("online", () => {
  isOffline = false;
  updateOfflineIndicator();
});

window.addEventListener("offline", () => {
  isOffline = true;
  updateOfflineIndicator();
});

function updateOfflineIndicator() {
  let offlineIndicator = document.querySelector(".offline-indicator");
  if (isOffline) {
    if (!offlineIndicator) {
      offlineIndicator = document.createElement("span");
      offlineIndicator.classList.add("offline-indicator");
      offlineIndicator.textContent = "Offline";
      document.querySelector(".nav-links").appendChild(offlineIndicator);
    }
  } else {
    if (offlineIndicator) {
      offlineIndicator.remove();
    }
  }
}

//////////////////////////////
// HTML sanitation
// should just have 3 functions, 1-for a whole event 2-for text 3-for URLs 4-?
// should use just DOMPurify (prevent all tags and allow nostr:URIs)
// (shared app url - media server - relays - nostr events)
function sanitizeNostrEvent(event) {
  if (!event) return null;

  // a deep clone to avoid modifying the original
  let sanitized = JSON.parse(JSON.stringify(event));
  //console.log("sanitizing kind:", sanitized.kind, "id: ", sanitized.id);
  if (sanitized.content) {
    sanitized.content = DOMPurify.sanitize(sanitized.content, {
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM: false,
    });
  }

  if (Array.isArray(sanitized.tags)) {
    sanitized.tags = sanitized.tags.map((tag) => {
      if (!Array.isArray(tag)) return [];

      return tag.map((value, index) => {
        // First element is tag type, leave as is
        if (index === 0) return value;

        // For URL-containing tags, sanitize URLs
        if (
          (tag[0] === "r" ||
            (tag[0] === "imeta" &&
              (value.startsWith("url ") ||
                value.startsWith("fallback ") ||
                value.startsWith("image ") ||
                value.startsWith("thumb ")))) &&
          typeof value === "string"
        ) {
          // For imeta tags with URLs
          if (tag[0] === "imeta") {
            let parts = value.split(" ");
            if (parts.length >= 2) {
              let urlPart = parts.slice(1).join(" ");
              return `${parts[0]} ${sanitizeUrl(urlPart)}`;
            }
          }

          // For direct URL tags
          return sanitizeUrl(value);
        }

        // For other content, sanitize as text
        if (typeof value === "string") {
          return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
        }

        return value;
      });
    });
  }

  return sanitized;
}

function sanitizeUrl(url) {
  if (!url || typeof url !== "string") return "";

  // Handle data URLs for images
  if (url.startsWith("data:image/")) {
    // Basic validation for data URLs - ensure they follow the expected format
    const dataUrlPattern =
      /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/;
    if (dataUrlPattern.test(url)) {
      return url;
    }
    return ""; // Invalid data URL format
  }

  try {
    let parsed = new URL(url);
    // only allow https for regular URLs
    if (parsed.protocol !== "https:") {
      return ""; // may add default image URL here
    }
    return parsed.href;
  } catch (e) {
    return "";
  }
}

function escapeHtml(text, options = {}) {
  if (typeof text !== "string") return String(text);

  const {
    escapeQuotes = false, // Only escape quotes if explicitly needed
  } = options;

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(escapeQuotes ? /"/g : /a^/, "&quot;")
    .replace(escapeQuotes ? /'/g : /a^/, "&#039;");
}

// Usage examples:
// Minimal escaping (just HTML tags)
//const safeText1 = escapeHtml(userInput);

// With quote escaping when needed
//const safeText2 = escapeHtml(userInput, { escapeQuotes: true });

function sanitizeHTML(text) {
  if (text === null || text === undefined) return "";
  return escapeHtml(String(text));
}

// Helper for creating safe HTML from template literals
function safeHtml(strings, ...values) {
  return strings.reduce((result, string, i) => {
    let value = values[i - 1];
    if (value instanceof HTMLElement) {
      let div = document.createElement("div");
      div.appendChild(value.cloneNode(true));
      return result + div.innerHTML + string;
    }
    return result + string + (i < values.length ? sanitizeHTML(values[i]) : "");
  });
}

// For text that should have no HTML tags
function sanitizeText(text) {
  if (text === null || text === undefined) return "";
  return DOMPurify.sanitize(String(text), { ALLOWED_TAGS: [] });
}

// For HTML content that should be sanitized but can contain some tags
function sanitizeHtml(html) {
  if (html === null || html === undefined) return "";
  return DOMPurify.sanitize(String(html));
}

function sanitizeTextPreservingNostrUris(text) {
  if (text === null || text === undefined) return "";

  // First, temporarily replace nostr URIs with placeholders
  const nostorUriRegex = /nostr:(npub1[a-z0-9]+|nprofile1[a-z0-9]+)/g;
  const uriPlaceholders = [];
  let placeholderIndex = 0;

  const textWithPlaceholders = text.replace(nostorUriRegex, (match) => {
    const placeholder = `__NOSTR_URI_PLACEHOLDER_${placeholderIndex}__`;
    uriPlaceholders.push({ placeholder, original: match });
    placeholderIndex++;
    return placeholder;
  });

  // Sanitize the text with placeholders
  const sanitized = DOMPurify.sanitize(String(textWithPlaceholders), {
    ALLOWED_TAGS: [],
  });

  // Restore the original nostr URIs
  let result = sanitized;
  uriPlaceholders.forEach(({ placeholder, original }) => {
    result = result.replace(placeholder, original);
  });

  return result;
}

let createElementFromHTML = (html) => {
  let template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstChild;
};

function formatErrorForDisplay(error) {
  if (!error) return "Unknown error occurred";
  let message = String(error.message || error);
  return sanitizeHTML(message.substring(0, 500)); // Limit length
}

//////////////////////////////
// cleaners
// Helper to register cleanup handlers
function registerCleanup(cleanupFn) {
  if (typeof cleanupFn === 'function') {
    app.cleanupHandlers.push(cleanupFn);
  }
}

// Helper to run all cleanup handlers
function runCleanup() {
  console.log(`Running ${app.cleanupHandlers.length} cleanup handlers`);
  
  app.cleanupHandlers.forEach((handler, index) => {
    try {
      handler();
    } catch (error) {
      console.error(`Error in cleanup handler ${index}:`, error);
    }
  });
  
  // Clear the array for the next page
  app.cleanupHandlers = [];
}



// Helper to track event listeners
function addTrackedEventListener(element, event, handler, key) {
  if (!key) {
    key = `${Date.now()}_${Math.random()}`;
  }
  
  element.addEventListener(event, handler);
  
  if (!app.eventListenerRegistry.has(key)) {
    app.eventListenerRegistry.set(key, []);
  }
  
  app.eventListenerRegistry.get(key).push({
    element,
    event,
    handler
  });
  
  return key;
}

// Cleanup function for tracked listeners
function removeTrackedEventListeners(key) {
  if (!app.eventListenerRegistry.has(key)) {
    return;
  }
  
  const listeners = app.eventListenerRegistry.get(key);
  listeners.forEach(({ element, event, handler }) => {
    try {
      element.removeEventListener(event, handler);
    } catch (e) {
      console.warn("Error removing event listener:", e);
    }
  });
  
  app.eventListenerRegistry.delete(key);
  console.log(`Removed ${listeners.length} tracked event listeners for key: ${key}`);
}

// Cleanup all tracked listeners
function cleanupAllTrackedEventListeners() {
  console.log(`Cleaning up ${app.eventListenerRegistry.size} listener groups`);
  app.eventListenerRegistry.forEach((listeners, key) => {
    removeTrackedEventListeners(key);
  });
}
/* function cleanupVideoResources() {
  let videos = document.querySelectorAll("video");
  videos.forEach(cleanupVideo);
}

function cleanupVideo(video) {
  try {
    video.pause();
    let sources = Array.from(video.querySelectorAll("source"));
    sources.forEach((source) => source.remove());
    video.src = null;
    video.removeAttribute("src");
    video.load();
    //console.log("Cleaned video elements");
  } catch (e) {
    console.warn("Error cleaning up video:", e);
  }
}
 */
function cleanupChatResources() {
  if (app.chatSubscription) {
    app.chatSubscription.close();
    app.chatSubscription = null;
  }
  if (app.chatPool) {
    app.chatPool.close(app.relays);
    app.chatPool = null;
  }
}

// Helper function to clean relay URLs
const cleanRelayUrl = (url) => {
  return url.replace(/^wss?:\/\//, "");
};

//////////////////////////////
// data manipulation
function getValueFromTags(data, fieldName, defaultValue = null) {
  if (!data || !data.tags) return defaultValue;

  let metaTags = data.tags.filter((tag) => tag[0] === "imeta");
  for (let metaTag of metaTags) {
    let index = metaTag.findIndex((item) => item.startsWith(fieldName));
    if (index !== -1) {
      return metaTag[index].split(" ")[1];
    }
  }
  // Check other tags
  let tag = data.tags.find((tag) => tag[0] === fieldName);
  return tag ? tag[1] : defaultValue;
}

function getRelativeTime(timestamp) {
  let now = Date.now();
  let diffInSeconds = (timestamp * 1000 - now) / 1000;
  let formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffInSeconds) < 60) {
    return formatter.format(Math.round(diffInSeconds), "second");
  } else if (Math.abs(diffInSeconds) < 3600) {
    return formatter.format(Math.round(diffInSeconds / 60), "minute");
  } else if (Math.abs(diffInSeconds) < 86400) {
    return formatter.format(Math.round(diffInSeconds / 3600), "hour");
  } else if (Math.abs(diffInSeconds) < 2592000) {
    return formatter.format(Math.round(diffInSeconds / 86400), "day");
  } else if (Math.abs(diffInSeconds) < 31536000) {
    return formatter.format(Math.round(diffInSeconds / 2592000), "month");
  } else {
    return formatter.format(Math.round(diffInSeconds / 31536000), "year");
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds === "Unknown duration") return "";
  seconds = parseInt(seconds);
  let hrs = Math.floor(seconds / 3600);
  let mins = Math.floor((seconds % 3600) / 60);
  let secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

////////////////////////////////
function getBaseHash(hash) {
  const hashWithoutPrefix = hash.startsWith("#") ? hash.slice(1) : hash;
  return "#" + hashWithoutPrefix.split("/")[0];
}

///////////////////////////////////
// Helper function to check if a set is the global set
function isGlobalSet(setName) {
  return setName === GLOBAL_SET_NAME;
}


///////////////////////////////////
// to help browser with cleanup
function forceGarbageCollection() {
  console.log("Running garbage collection helpers");
  
  // Clear temporarily allowed videos more aggressively
  if (app.videoPlayer.temporarilyAllowedVideos?.size > 10) {
    console.log("Clearing temporarily allowed videos cache");
    app.videoPlayer.temporarilyAllowedVideos.clear();
  }
  
  // Clean up event listeners more aggressively
  if (app.eventListenerRegistry?.size > 5) {
    const keysToRemove = [];
    const currentKey = app.currentPageCleanupKey;
    
    app.eventListenerRegistry.forEach((listeners, key) => {
      if (key !== currentKey && !key.includes('permanent')) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      removeTrackedEventListeners(key);
    });
    
    console.log(`Cleaned up ${keysToRemove.length} old listener groups`);
  }
  
  // Force cleanup of any disconnected videos
  const allVideos = document.querySelectorAll('video');
  allVideos.forEach(video => {
    if (!document.body.contains(video)) {
      console.log("Cleaning up disconnected video");
      cleanupVideo(video);
    }
  });
  
  // Clear old videoData references
  if (app.videoPlayer.currentVideoData && !app.videoPlayer.currentVideo) {
    app.videoPlayer.currentVideoData = null;
  }
}

// Call this periodically or when memory pressure is detected
setInterval(forceGarbageCollection, 60000); // Every 1 minute

// to help detect memory issues
let videoLoadCounter = 0;

function logMemoryUsage() {
  videoLoadCounter++;
  
  if (videoLoadCounter % 5 === 0 && performance.memory) {
    const usedMemoryMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
    const totalMemoryMB = (performance.memory.totalJSHeapSize / 1048576).toFixed(2);
    const limitMemoryMB = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2);
    
    console.log(`Memory usage after ${videoLoadCounter} videos:`);
    console.log(`  Used: ${usedMemoryMB} MB`);
    console.log(`  Total: ${totalMemoryMB} MB`);
    console.log(`  Limit: ${limitMemoryMB} MB`);
    
    // If memory is getting high, force more aggressive cleanup
    if (performance.memory.usedJSHeapSize > performance.memory.jsHeapSizeLimit * 0.9) {
      console.warn("High memory usage detected! Forcing aggressive cleanup...");
      cleanupVideoResources();
      forceGarbageCollection();
      
      // Remove all tracked listeners except current page
      const currentKey = app.currentPageCleanupKey;
      app.eventListenerRegistry.forEach((listeners, key) => {
        if (key !== currentKey) {
          removeTrackedEventListeners(key);
        }
      });
    }
  }
}
