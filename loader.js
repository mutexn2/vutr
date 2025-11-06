(function () {
  console.log("running loader");

  ///////////////////////
  ///////////////////////
  ///////////////////////
  // service worker before the loader

  if ("serviceWorker" in navigator) {
    const swPath = new URL("service-worker.js", window.location.href).pathname;

    console.log("Registering service worker at:", swPath);

    navigator.serviceWorker
      .register(swPath)
      .then((registration) => {
        console.log(
          "Service Worker registered with scope:",
          registration.scope
        );

        setupServiceWorkerManager(registration);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  }

  function setupServiceWorkerManager(registration) {
    window.swManager = {
      registration: registration,
      updateNotificationShown: false,

      checkCacheStatus() {
        if ("caches" in window) {
          // Get the current cache version from the service worker
          caches.keys().then((cacheNames) => {
            const currentCache = cacheNames.find((name) =>
              name.startsWith("vutr-")
            );
            if (currentCache) {
              caches.open(currentCache).then((cache) => {
                cache.keys().then((keys) => {
                  console.log(
                    `Cache ${currentCache} populated with`,
                    keys.length,
                    "resources"
                  );
                });
              });
            } else {
              console.log(
                "No app cache found, initial load may require network"
              );
            }
          });
        }
      },

      setupUpdateDetection() {
        console.log("Setting up update detection");
        console.log("Current SW state:", this.registration.active?.state);
        console.log("Waiting SW:", this.registration.waiting);
        console.log("Installing SW:", this.registration.installing);

        // Check for existing waiting worker
        if (this.registration.waiting) {
          console.log("Found waiting worker on setup");
          this.showUpdateNotification();
        }

        // Listen for new workers
        this.registration.addEventListener("updatefound", () => {
          console.log("Update found event triggered");
          const newWorker = this.registration.installing;
          console.log("New worker state:", newWorker.state);

          newWorker.addEventListener("statechange", () => {
            console.log("SW state changed to:", newWorker.state);
            console.log(
              "Has controller:",
              !!navigator.serviceWorker.controller
            );

            // When the service worker is installed and waiting
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("New service worker installed and waiting");
              this.showUpdateNotification();
            }
          });
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener("message", (event) => {
          console.log("Message from SW:", event.data);
          if (event.data && event.data.type === "UPDATE_AVAILABLE") {
            this.showUpdateNotification();
          }
        });
      },

      showUpdateNotification() {
        if (this.updateNotificationShown) {
          console.log("Update notification already shown, skipping");
          return;
        }

        console.log("Update available, showing notification");
        this.updateNotificationShown = true;
        // Remove any existing notification
        const existingNotification = document.querySelector(
          ".update-notification"
        );
        if (existingNotification) {
          existingNotification.remove();
        }

        // notification element
        const updateNotification = document.createElement("div");
        updateNotification.className = "update-notification";
        updateNotification.innerHTML = `
          <p>New version available!</p>
          <button id="update-button">Refresh to update</button>
        `;

        document.body.appendChild(updateNotification);

        document
          .getElementById("update-button")
          .addEventListener("click", () => {
            if (this.registration.waiting) {
              this.registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
            // Clear the flag before reload
            this.updateNotificationShown = false;
            window.location.reload();
          });
      },
    };
    window.swManager.checkCacheStatus();

    window.swManager.setupUpdateDetection();
  }

  ///////////////////////
  ///////////////////////
  ///////////////////////
  // Loader
  let scriptGroups = [
    // core libraries
    // normally imported via CDN if possible then saved locally, all statically served within app
    // uncomment to get latest version and manually update (cope/paste to local file)
    [
      //"https://unpkg.com/nostr-tools/lib/nostr.bundle.js",
      // 8-2025
      "lib/nostr.bundle.js",

      // manual download: https://dompurify.com
      //"https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.4/purify.min.js",
      // 8-2025
      "lib/purify.min.js",

      // no url, has to do it custom from npm to single js
      // @nostr/gadgets@0.0.39 | latest: 0.0.39 | versions: 38
      "lib/nostr-gadgets.js",


      //"https://cdn.jsdelivr.net/npm/nostr-web-components/dist/index.js",
      // 9-2025
      "lib/nostr-web-components.js",


      //"https://unpkg.com/window.nostr.js/dist/window.nostr.js",
      //
      //"lib/window.nostr.js",

      // - visit https://github.com/danielgjackson/qrcodejs - great lib with direct download as a .js file
      "lib/qrcode.js",
    ],

    // components
    [
      "components/sidebar.js",
      "components/drawer.js",
      "components/search.js",
      "components/settingsMenu.js",
      "components/notifyMenu.js",
      "components/filterForm.js",
      "components/modal.js",
      "components/videoCard.js",
      "components/playlistCard.js",
      "components/videoPlayer.js",
      "components/defaultPlayer.js",
      "components/videoComments.js",
      "components/zapButton.js",
      "config.js",
 //     "indexeddb.js",
    ],

    // page handlers and nostr
    [
      "pages/videoPage.js",
      "pages/faqPage.js",
      "pages/blobPage.js",
      "pages/fafoPage.js",
      "pages/postingPage.js",
      "pages/contactPage.js",
      "pages/settingsPage.js",
      "pages/networkSettingsPage.js",
      "pages/websocketsPage.js",
      "pages/singleRelayPage.js",
      "pages/relaySetsDiscoveryPage.js",
      "pages/playlistPage.js",
      "pages/playlistsPage.js",
    //  "pages/queueHistoryPage.js",
      "pages/localPlaylistsPage.js",
      "pages/localPlaylistPage.js",
      "pages/profilePage.js",
      "pages/profileEditPage.js",
      "pages/notifyPage.js",
      "pages/listPage.js",
      "pages/likedPage.js",
      "pages/kind1FollowsPage.js",
      "pages/localFollowsPage.js",
      "pages/followsFeedPage.js",
      "pages/bookmarksPage.js",
      "pages/bookmarkedListsPage.js",
      "pages/tagPage.js",
      "pages/nakPage.js",
      "pages/shortsPage.js",
      "pages/homePage.js",
 //     "pages/newHomePage.js",
      "pages/offlinePage.js",
      "pages/aboutPage.js",
      "nostr.js",
      "helpers.js",
    ],

    // main app script - always loaded last
    ["main.js"],
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      let script = document.createElement("script");
      script.src = src;
     

      if (src.startsWith("http")) {
        script.defer = true;
      }

      script.onload = () => {
        //console.log(`Loaded: ${src}`);
        resolve(src);
      };
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

      document.body.appendChild(script);
    });
  }

  // scripts within a group loads in parallel
  function loadScriptGroup(group) {
    return Promise.all(group.map((src) => loadScript(src)));
  }

  // groups loaded sequentially
  async function loadAllScripts() {
    for (let i = 0; i < scriptGroups.length; i++) {
      let group = scriptGroups[i];
      console.log(
        `Loading script group ${i + 1}/${scriptGroups.length} (${
          group.length
        } scripts)`
      );

      try {
        await loadScriptGroup(group);
        //console.log(`Completed loading group ${i + 1}`);
      } catch (error) {
        console.error(`Error in script group ${i + 1}:`, error);
      }
    }

    console.log("All scripts loaded");

    // init app if needed
    if (document.readyState === "loading") {
      console.log("DOM still loading, waiting for DOMContentLoaded");
    } else {
      console.log("DOM already loaded, manually triggering initialization");
      if (typeof initializeApp === "function") {
        initializeApp();
      } else {
        console.error("initializeApp function not found!");
      }
    }
  }

  loadAllScripts();
})();








//////////////////////////
//////////////////////////
// websocket interceptor
(function() {
  const originalWebSocket = window.WebSocket;
  const activeConnections = new Map();
  const urlConnections = new Map(); // Track connections by normalized URL
  let blockedURLs = new Set();
  const connectionStats = {
    totalCreated: 0,
    totalClosed: 0,
    totalErrors: 0
  };
  
  // Normalize WebSocket URLs to prevent duplicates
  function normalizeWebSocketURL(url) {
    try {
      const urlObj = new URL(url);
      // Remove trailing slash unless it's the root path
      if (urlObj.pathname.endsWith('/') && urlObj.pathname.length > 1) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      return urlObj.toString();
    } catch (error) {
      // If URL parsing fails, just remove trailing slash if present
      return url.endsWith('/') && url.length > url.indexOf('://') + 4 ? url.slice(0, -1) : url;
    }
  }
  
  // Determine if a connection is truly working
  function isConnectionWorking(connectionInfo) {
    // Connection is working if:
    // 1. It's in OPEN state, OR
    // 2. It has successfully sent/received messages, OR  
    // 3. It's still connecting and hasn't had errors yet
    
    if (connectionInfo.readyState === 1) return true; // OPEN
    if (connectionInfo.messageCount > 0) return true; // Has messages
    if (connectionInfo.readyState === 0 && connectionInfo.errorCount === 0) return true; // Still connecting without errors
    
    return false;
  }
  
  // Load blocked URLs from localStorage on startup
  function loadBlockedURLs() {
    try {
      const stored = localStorage.getItem('websocket-blocked-urls');
      if (stored) {
        const urls = JSON.parse(stored);
        blockedURLs = new Set(urls.map(url => normalizeWebSocketURL(url)));
      }
    } catch (error) {
      console.warn('Failed to load blocked WebSocket URLs from localStorage:', error);
    }
  }
  
  // Save blocked URLs to localStorage
  function saveBlockedURLs() {
    try {
      localStorage.setItem('websocket-blocked-urls', JSON.stringify([...blockedURLs]));
    } catch (error) {
      console.warn('Failed to save blocked WebSocket URLs to localStorage:', error);
    }
  }
  
  // Initialize blocked URLs from localStorage
  loadBlockedURLs();
  
  window.WebSocket = function(url, protocols) {
    const normalizedURL = normalizeWebSocketURL(url);
    
    // Check if normalized URL is blocked
    if (blockedURLs.has(normalizedURL)) {
      throw new Error(`WebSocket connection blocked: ${normalizedURL}`);
    }
    
    const ws = new originalWebSocket(url, protocols);
    const id = Date.now() + Math.random();
    
    connectionStats.totalCreated++;
    
    // Track this connection
    const connectionInfo = {
      id,
      url: url, // Keep original URL
      normalizedURL: normalizedURL,
      protocols: protocols || [],
      websocket: ws,
      createdAt: new Date(),
      readyState: ws.readyState,
      lastActivity: new Date(),
      messageCount: 0,
      errorCount: 0,
      isActive: true,
      hasBeenOpen: false, // Track if connection was ever successfully opened
      connectionStatus: 'connecting' // connecting, open, failed, closed
    };
    
    activeConnections.set(id, connectionInfo);
    
    // Track by normalized URL for aggregation
    if (!urlConnections.has(normalizedURL)) {
      urlConnections.set(normalizedURL, {
        url: normalizedURL,
        originalURLs: new Set([url]), // Track all original URLs that map to this normalized URL
        connections: [],
        totalMessages: 0,
        totalErrors: 0,
        firstConnected: new Date(),
        lastActivity: new Date(),
        activeCount: 0,
        workingCount: 0 // Count of connections that are actually working
      });
    }
    
    const urlInfo = urlConnections.get(normalizedURL);
    urlInfo.originalURLs.add(url);
    urlInfo.connections.push(connectionInfo);
    urlInfo.activeCount++;
    urlInfo.lastActivity = new Date();
    
    // Update working count
    function updateWorkingCount() {
      urlInfo.workingCount = urlInfo.connections.filter(c => c.isActive && isConnectionWorking(c)).length;
    }
    
    // Monitor all WebSocket events
    const originalAddEventListener = ws.addEventListener.bind(ws);
    
    // Override addEventListener to track all events
    ws.addEventListener = function(type, listener, options) {
      const wrappedListener = function(event) {
        connectionInfo.lastActivity = new Date();
        connectionInfo.readyState = ws.readyState;
        urlInfo.lastActivity = new Date();
        
        if (type === 'open') {
          connectionInfo.hasBeenOpen = true;
          connectionInfo.connectionStatus = 'open';
        }
        
        if (type === 'message') {
          connectionInfo.messageCount++;
          urlInfo.totalMessages++;
        }
        
        if (type === 'error') {
          connectionInfo.errorCount++;
          urlInfo.totalErrors++;
          connectionStats.totalErrors++;
          
          // If we get errors without ever being open, mark as failed
          if (!connectionInfo.hasBeenOpen && connectionInfo.readyState !== 1) {
            connectionInfo.connectionStatus = 'failed';
          }
        }
        
        if (type === 'close') {
          connectionInfo.isActive = false;
          connectionInfo.connectionStatus = connectionInfo.hasBeenOpen ? 'closed' : 'failed';
          urlInfo.activeCount = Math.max(0, urlInfo.activeCount - 1);
          connectionStats.totalClosed++;
          
          // Clean up after 30 seconds
          setTimeout(() => {
            activeConnections.delete(id);
            // Remove connection from URL tracking
            const urlInfo = urlConnections.get(normalizedURL);
            if (urlInfo) {
              urlInfo.connections = urlInfo.connections.filter(c => c.id !== id);
              if (urlInfo.connections.length === 0) {
                urlConnections.delete(normalizedURL);
              }
            }
          }, 30000);
        }
        
        // Update working count after any state change
        updateWorkingCount();
        
        return listener.call(this, event);
      };
      
      return originalAddEventListener.call(this, type, wrappedListener, options);
    };
    
    // Also override the on* properties
    ['onopen', 'onclose', 'onerror', 'onmessage'].forEach(prop => {
      let originalHandler = null;
      Object.defineProperty(ws, prop, {
        get() { return originalHandler; },
        set(handler) {
          originalHandler = handler;
          if (handler) {
            const eventType = prop.slice(2); // remove 'on' prefix
            ws.addEventListener(eventType, handler);
          }
        }
      });
    });
    
    return ws;
  };
  
  // Copy static properties
  Object.setPrototypeOf(window.WebSocket, originalWebSocket);
  Object.defineProperty(window.WebSocket, 'prototype', {
    value: originalWebSocket.prototype
  });
  
  // API for the websockets page
  window.WebSocketManager = {
    getActiveConnections() {
      return Array.from(activeConnections.values());
    },
    
    // Get aggregated connections by normalized URL
    getAggregatedConnections() {
      return Array.from(urlConnections.values()).map(urlInfo => ({
        url: urlInfo.url,
        originalURLs: Array.from(urlInfo.originalURLs),
        activeCount: urlInfo.activeCount,
        workingCount: urlInfo.workingCount,
        totalConnections: urlInfo.connections.length,
        totalMessages: urlInfo.totalMessages,
        totalErrors: urlInfo.totalErrors,
        firstConnected: urlInfo.firstConnected,
        lastActivity: urlInfo.lastActivity,
        isActive: urlInfo.activeCount > 0,
        isWorking: urlInfo.workingCount > 0,
        connections: urlInfo.connections.filter(c => c.isActive), // Only active connections
        status: urlInfo.workingCount > 0 ? 'working' : 
                urlInfo.activeCount > 0 ? 'connecting' : 'failed'
      }));
    },
    
    closeConnection(id) {
      const conn = activeConnections.get(id);
      if (conn && conn.websocket.readyState <= 1) {
        conn.websocket.close(1000, 'Closed by user');
        return true;
      }
      return false;
    },
    
    closeConnectionsByURL(url) {
      const normalizedURL = normalizeWebSocketURL(url);
      let closed = 0;
      const urlInfo = urlConnections.get(normalizedURL);
      if (urlInfo) {
        urlInfo.connections.forEach(conn => {
          if (conn.isActive && conn.websocket.readyState <= 1) {
            conn.websocket.close(1000, 'Closed by user');
            closed++;
          }
        });
      }
      return closed;
    },
    
    blockURL(url) {
      const normalizedURL = normalizeWebSocketURL(url);
      blockedURLs.add(normalizedURL);
      saveBlockedURLs();
      // Close existing connections to this URL
      this.closeConnectionsByURL(normalizedURL);
    },
    
    unblockURL(url) {
      const normalizedURL = normalizeWebSocketURL(url);
      blockedURLs.delete(normalizedURL);
      saveBlockedURLs();
    },
    
    getBlockedURLs() {
      return Array.from(blockedURLs);
    },
    
  normalizeWebSocketURL(url) {
    return normalizeWebSocketURL(url);
  },
  
  isURLBlocked(url) {
    const normalizedURL = normalizeWebSocketURL(url);
    return blockedURLs.has(normalizedURL);
  },

    getStats() {
      const active = Array.from(activeConnections.values()).filter(c => c.isActive).length;
      const working = Array.from(activeConnections.values()).filter(c => c.isActive && isConnectionWorking(c)).length;
      const uniqueURLs = urlConnections.size;
      const workingURLs = Array.from(urlConnections.values()).filter(u => u.workingCount > 0).length;
      
      return {
        ...connectionStats,
        activeConnections: active,
        workingConnections: working,
        totalConnections: activeConnections.size,
        uniqueURLs,
        workingURLs,
        blockedURLs: blockedURLs.size
      };
    },
    
    clearClosedConnections() {
      const toRemove = [];
      activeConnections.forEach((conn, id) => {
        if (!conn.isActive) {
          toRemove.push(id);
        }
      });
      toRemove.forEach(id => activeConnections.delete(id));
      
      // Clean up URL connections with no active connections
      urlConnections.forEach((urlInfo, url) => {
        urlInfo.connections = urlInfo.connections.filter(c => c.isActive);
        if (urlInfo.connections.length === 0) {
          urlConnections.delete(url);
        } else {
          // Update counts
          urlInfo.activeCount = urlInfo.connections.filter(c => c.isActive).length;
          urlInfo.workingCount = urlInfo.connections.filter(c => c.isActive && isConnectionWorking(c)).length;
        }
      });
      
      return toRemove.length;
    }
  };
})();


