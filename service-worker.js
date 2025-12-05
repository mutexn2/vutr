const CACHE_VERSION = "vutr-v0.000214272";

const BASE_PATH = self.location.pathname.replace("service-worker.js", "");

const normalizedBasePath = BASE_PATH.endsWith("/")
  ? BASE_PATH
  : BASE_PATH + "/";

const APP_SHELL_PATHS = [
  "/",
  "/index.html",
  "/style.css",
  "/lib/nostr.bundle.js",
  "/lib/nostr-gadgets.js",
  "/lib/purify.min.js",
  "lib/nostr-web-components.js",
  //"lib/window.nostr.js",
  "/lib/qrcode.js",
  "/lib/blurhash.js",
  "/loader.js",
  "/main.js",
  "/favicon.svg",

  "/assets/pwa-icon.png",
  "/assets/pwa-icon-512.png",
  
  "/components/settingsMenu.js",
  "/components/notifyMenu.js",
  "/components/sidebar.js",
  "/components/drawer.js",
  "/components/search.js",
  "/components/filterForm.js",
  "/components/modal.js",
  "/components/videoCard.js",
  "/components/noteCard.js",
  "/components/playlistCard.js",
  "/components/videoPlayer.js",
  "/components/videoComments.js",
  "/components/zapButton.js",
  "/config.js",
//  "/indexeddb.js",
  "/helpers.js",
  "/pages/videoPage.js",
  "/pages/faqPage.js",
  "/pages/blobPage.js",
  "/pages/fafoPage.js",
  "/pages/playlistPage.js",
  "/pages/playlistHistoryPage.js",
  "/pages/playlistsPage.js",
 // "/pages/queueHistoryPage.js",
  "/pages/localPlaylistsPage.js",
  "/pages/localPlaylistPage.js",
  "/pages/postingPage.js",
  "/pages/contactPage.js",
  "/pages/settingsPage.js",
  "/pages/networkSettingsPage.js",
  "/pages/websocketsPage.js",
  "/pages/singleRelayPage.js",
  "/pages/relaySetsDiscoveryPage.js",
  "/pages/profilePage.js",
  "/pages/profileEditPage.js",
  "/pages/notifyPage.js",
  "/pages/listPage.js",
  "/pages/likedPage.js",
  "/pages/kind1FollowsPage.js",
  "/pages/kindOnesHomePage.js",
  "/pages/localFollowsPage.js",
  "/pages/localMutedPage.js",
  "/pages/followsFeedPage.js",
  "/pages/bookmarksPage.js",
  "/pages/bookmarkedListsPage.js",
  "/pages/tagPage.js",
  "/pages/nakPage.js",
  "/pages/shortsPage.js",
  "/pages/homePage.js",
//  "/pages/newHomePage.js",
  "/pages/offlinePage.js",
  "/pages/aboutPage.js",
  "/nostr.js",
];

const APP_SHELL = APP_SHELL_PATHS.map((path) => {
  return path === "/" ? normalizedBasePath : normalizedBasePath + path.slice(1);
});

self.caches.open("version-cache").then((cache) => {
  cache.put("version", new Response(CACHE_VERSION));
});

self.addEventListener("install", (event) => {
  console.log("Service Worker installing with cache version:", CACHE_VERSION);

  // Take control immediately
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => {
        console.log("Caching app shell files");
        return cache.addAll(APP_SHELL).then(() => {
          console.log("All app shell files cached successfully");
        });
      })
      .catch((error) => {
        console.error("Failed to cache app shell:", error);
        // Don't fail installation if some resources can't be cached
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating");

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName.startsWith("vutr-") && cacheName !== CACHE_VERSION
              );
            })
            .map((cacheName) => {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ]).then(() => {
      console.log("Service Worker now controlling all pages");
    })
  );
});

// Fetch event - simplified without background update detection
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const isAppShellRequest = APP_SHELL.some((shellUrl) => {
    const shellUrlObj = new URL(shellUrl, self.location.origin);
    return shellUrlObj.pathname === url.pathname;
  });

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // For app shell resources, always prefer cache
      if (isAppShellRequest && cachedResponse) {
        console.log("Serving from cache (app shell):", event.request.url);
        return cachedResponse;
      }

      // For other cached resources, serve from cache
      if (cachedResponse) {
        console.log("Serving from cache:", event.request.url);
        return cachedResponse;
      }

      // Not in cache, try network
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            throw new Error(`Network response not ok: ${response.status}`);
          }

          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          console.log("Serving from network and caching:", event.request.url);
          return response;
        })
        .catch((error) => {
          console.error("Network fetch failed:", error);

          // For HTML requests, serve the main index.html from cache
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match(normalizedBasePath).then((indexResponse) => {
              if (indexResponse) {
                console.log("Serving index.html from cache for HTML request");
                return indexResponse;
              }
              return new Response("App unavailable offline", {
                status: 503,
                headers: { "Content-Type": "text/html" },
              });
            });
          }

          return new Response("Resource unavailable offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        });
    })
  );
});

// Listen for the skip waiting message
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("Service Worker: Received skip waiting message");
    self.skipWaiting();
  }
});
