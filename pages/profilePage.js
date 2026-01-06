const PROFILE_LOAD_TIMEOUT = 5000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

async function profilePageHandler() {
  mainContent.innerHTML = `
  <div id="profilePage-container">
    <div class="loading-indicator">
        <p>Loading profile...</p>
    </div>
  </div>
  `;

  let profilePageContainer = document.getElementById("profilePage-container");

  try {
    const profileParam = window.location.hash.split("/")[1];

    if (!profileParam) {
      window.location.hash = "#";
      return;
    }

    const profile = await decodeProfileParam(profileParam);

    if (!profile) {
      profilePageContainer.innerHTML = `
        <div class="error-container">
          <h1>Invalid Profile</h1>
          <p>The profile ID you're trying to view is invalid or couldn't be decoded.</p>
          <a href="#" class="nav-link">Return to Home</a>
        </div>
      `;
      return;
    }

    // Load profile with timeout and retry logic
    const { kindZero, extendedRelays } = await loadProfileWithRetry(profile);

    if (!kindZero || !kindZero.content) {
      throw new Error("Profile data not found or incomplete");
    }

    const kindZeroContent = JSON.parse(kindZero.content);
    const profileNpub = getProfileNpub(profile);

    console.log("profileNpub:", profileNpub);

    // Render the complete profile page with updated tabs
    profilePageContainer.innerHTML = `
    <div class="profile-container" data-extended-relays='${escapeHtml(JSON.stringify(extendedRelays))}'>
      ${app.myPk === profile ? '<div class="settings-section"></div>' : ''}
      <div class="profile-page">
        <div class="profile-banner">
          <img class="banner-image" alt="Banner">
        </div>
        <div class="profile-header">
          <div class="profile-picture">
            <img class="avatar" alt="Profile Picture">
          </div>
          <div class="profile-info">
            <h1 class="display-name"></h1>
            <p class="username"></p>
            <div class="about"></div>
            <div class="profile-links"></div>
          </div>
        </div>
      </div>
      
      <div class="profile-technical-info">
        <button class="technical-info-toggle">
          <span class="toggle-text">Show keys and relay hints</span>
          <span class="toggle-arrow">▼</span>
        </button>
        <div class="technical-info-content">
          <div class="profile-identifiers">
            <div class="identifier-item">
              <span class="identifier-label">npub:</span>
              <span class="identifier-value npub-value"></span>
              <button class="copy-btn" data-copy-type="npub">📋</button>
            </div>
            <div class="identifier-item">
              <span class="identifier-label">pubkey:</span>
              <span class="identifier-value pubkey-value"></span>
              <button class="copy-btn" data-copy-type="pubkey">📋</button>
            </div>
          </div>
          <div class="relay-hints-section">
            <h4>Relay Hints</h4>
            <div class="relay-hints-list"></div>
          </div>
        </div>
      </div>
      
      <div class="profile-tabs">
        <div class="tab-scroll-container">
          <button class="profile-tab-button active" data-tab="videos">Videos</button>
          <button class="profile-tab-button" data-tab="playlists">Playlists</button>
          <button class="profile-tab-button" data-tab="relay-sets">Relay Sets</button>
          <button class="profile-tab-button" data-tab="posts">Posts</button>
        </div>
      </div>

      <div class="profile-tab-content">
        <div id="videos-tab" class="profile-tab-panel active">
          <div id="channelVideos">
            <h1>Searching for videos</h1>
            <p>Loading kind-21 and kind-22 video events...</p>
          </div>
        </div>
        
        <div id="playlists-tab" class="profile-tab-panel">
          <div id="channelPlaylists">
            <h1>Searching for playlists</h1>
            <p>Loading kind-30005 playlist events...</p>
          </div>
        </div>

        <div id="relay-sets-tab" class="profile-tab-panel">
          <div class="tab-placeholder">
            <h1>Relay Sets</h1>
            <p>Coming soon...</p>
          </div>
        </div>

        <div id="posts-tab" class="profile-tab-panel">
          <div class="tab-placeholder">
            <h1>Posts</h1>
            <p>Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  `;
    populateProfileData(kindZeroContent, profile, profileNpub);

    setupAllProfileEventListeners(profile, kindZeroContent, extendedRelays);

    loadProfileVideosWithIntervals(profile, extendedRelays).catch((error) => {
      console.error("Error loading profile videos:", error);
      handleVideoLoadError();
    });
  } catch (error) {
    console.error("Error rendering profile page:", error);
    const errorMessage = error.message || "Unknown error occurred";
    profilePageContainer.innerHTML = `
      <div class="error-container">
        <h1>Profile Load Error</h1>
        <p>Failed to load profile: ${errorMessage}</p>
        <button class="retry-button">Retry</button>
        <a href="#" class="nav-link">Return to Home</a>
      </div>
    `;

    const retryButton = document.querySelector(".retry-button");
    if (retryButton) {
      retryButton.addEventListener("click", () => window.location.reload());
    }
  }
}

const profileTabState = {
  activeTab: null,
  cleanupFunctions: {},
};


async function loadProfileVideosWithIntervals(profile, extendedRelays) {
  const videosContent = document.getElementById("channelVideos");
  if (!videosContent) return;

  // Check if already loaded
  if (videosContent.dataset.loaded === "true") {
    return;
  }

  const allRelays = [...new Set([...app.globalRelays, ...extendedRelays])];
  
  console.log(`Loading videos from ${allRelays.length} relays`);

  app.profileVideosPool = new window.NostrTools.SimplePool();

  // Register cleanup for this tab
  const cleanup = () => {
    console.log("Cleaning up profile videos resources");
    
    if (app.profileVideosSubscription) {
      app.profileVideosSubscription.close();
      app.profileVideosSubscription = null;
    }
    
    if (app.profileVideosPool) {
      app.profileVideosPool.close(allRelays);
      app.profileVideosPool = null;
    }
  };

  profileTabState.cleanupFunctions.videos = cleanup;
  
  // Also register global cleanup
  registerCleanup(cleanup);

  videosContent.innerHTML = `
    <h1>Published Videos</h1>
    <p>Searching for videos...</p>
    <div class="videos-grid"></div>
    <div class="load-more-container" style="text-align: center; padding: 20px;">
      <button id="profile-videos-load-more-btn" class="load-more-btn" style="display: none;">Load More Videos</button>
      <p id="profile-videos-load-more-status" style="display: none;"></p>
    </div>
  `;

  const grid = videosContent.querySelector(".videos-grid");
  const loadMoreBtn = document.getElementById("profile-videos-load-more-btn");
  const loadMoreStatus = document.getElementById("profile-videos-load-more-status");

  const scrollState = {
    currentTimestamp: Math.floor(Date.now() / 1000),
    oldestTimestamp: null,
    isLoading: false,
    hasMoreContent: true,
    eventsPerPage: 20,
    loadedEventsCount: 0,
    existingEventIds: new Set(),
    emptyPeriodCount: 0,
    maxEmptyPeriods: 3,
    currentPeriodSize: 24 * 60 * 60,
    periodSizes: [
      1 * 24 * 60 * 60,
      7 * 24 * 60 * 60,
      30 * 24 * 60 * 60,
      90 * 24 * 60 * 60,
      180 * 24 * 60 * 60,
      365 * 24 * 60 * 60,
    ],
    periodIndex: 0,
    useIntervalBased: false, // Flag to switch to interval-based loading
  };

  function renderEventImmediately(event) {
    const card = createVideoCard(event);
    grid.appendChild(card);
    
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    
    requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
    
    scrollState.loadedEventsCount++;
  }

  function increasePeriodSize() {
    if (scrollState.periodIndex < scrollState.periodSizes.length - 1) {
      scrollState.periodIndex++;
      scrollState.currentPeriodSize = scrollState.periodSizes[scrollState.periodIndex];
      return true;
    }
    return false;
  }

  // Simple request first (limit 100)
  async function loadInitialBatch() {
    return new Promise((resolve) => {
      const events = [];
      let isComplete = false;

      const filter = {
        kinds: [21, 22],
        authors: [profile],
        limit: 100,
      };

      const sub = app.profileVideosPool.subscribe(
        allRelays,
        filter,
        {
          onevent(event) {
            if (!scrollState.existingEventIds.has(event.id)) {
              const sanitizedEvent = sanitizeNostrEvent(event);
              if (sanitizedEvent) {
                scrollState.existingEventIds.add(event.id);
                events.push(sanitizedEvent);
              }
            }
          },
          oneose() {
            if (!isComplete) {
              isComplete = true;
              sub.close();
              resolve(events);
            }
          },
          onclose() {
            if (!isComplete) {
              isComplete = true;
              resolve(events);
            }
          },
        }
      );

      setTimeout(() => {
        if (!isComplete) {
          isComplete = true;
          sub.close();
          resolve(events);
        }
      }, 5000);
    });
  }

  async function loadEventsForPeriod(since, until, renderImmediately = false) {
    return new Promise((resolve) => {
      const events = [];
      let isComplete = false;

      const filter = {
        kinds: [21, 22],
        authors: [profile],
        since: since,
        until: until,
      };

      const sub = app.profileVideosPool.subscribe(
        allRelays,
        filter,
        {
          onevent(event) {
            if (!scrollState.existingEventIds.has(event.id)) {
              const sanitizedEvent = sanitizeNostrEvent(event);
              if (sanitizedEvent) {
                scrollState.existingEventIds.add(event.id);
                events.push(sanitizedEvent);
                
                if (renderImmediately) {
                  renderEventImmediately(sanitizedEvent);
                }
              }
            }
          },
          oneose() {
            if (!isComplete) {
              isComplete = true;
              sub.close();
              resolve(events);
            }
          },
          onclose() {
            if (!isComplete) {
              isComplete = true;
              resolve(events);
            }
          },
        }
      );

      setTimeout(() => {
        if (!isComplete) {
          isComplete = true;
          sub.close();
          resolve(events);
        }
      }, 5000);
    });
  }

  async function loadMoreEvents() {
    if (scrollState.isLoading || !scrollState.hasMoreContent) {
      return;
    }

    scrollState.isLoading = true;
    loadMoreBtn.style.display = 'none';
    loadMoreStatus.textContent = 'Loading more videos...';
    loadMoreStatus.style.display = 'block';

    const startLoadedCount = scrollState.loadedEventsCount;
    
    let currentUntil = scrollState.oldestTimestamp || scrollState.currentTimestamp;
    let currentSince = currentUntil - scrollState.currentPeriodSize;

    while ((scrollState.loadedEventsCount - startLoadedCount) < scrollState.eventsPerPage && scrollState.hasMoreContent) {
      const periodEvents = await loadEventsForPeriod(currentSince, currentUntil, true);
      
      if (periodEvents.length === 0) {
        scrollState.emptyPeriodCount++;
        
        if (scrollState.emptyPeriodCount >= 2) {
          const increased = increasePeriodSize();
          if (increased) {
            scrollState.emptyPeriodCount = 0;
            currentSince = currentUntil - scrollState.currentPeriodSize;
            continue;
          } else {
            if (scrollState.emptyPeriodCount >= scrollState.maxEmptyPeriods) {
              scrollState.hasMoreContent = false;
              break;
            }
          }
        }
        
        currentUntil = currentSince;
        currentSince = currentUntil - scrollState.currentPeriodSize;
        
        if (currentUntil < 0) {
          scrollState.hasMoreContent = false;
          break;
        }
        
        continue;
      }

      scrollState.emptyPeriodCount = 0;

      const oldestEvent = periodEvents.reduce((oldest, event) => 
        event.created_at < oldest.created_at ? event : oldest
      );
      scrollState.oldestTimestamp = oldestEvent.created_at;
      currentUntil = oldestEvent.created_at;
      currentSince = currentUntil - scrollState.currentPeriodSize;
      
      if ((scrollState.loadedEventsCount - startLoadedCount) < scrollState.eventsPerPage) {
        continue;
      } else {
        break;
      }
    }

    scrollState.isLoading = false;
    loadMoreStatus.style.display = 'none';

    const loadedThisBatch = scrollState.loadedEventsCount - startLoadedCount;
    
    if (scrollState.hasMoreContent && loadedThisBatch > 0) {
      loadMoreBtn.style.display = 'block';
    } else if (!scrollState.hasMoreContent) {
      loadMoreStatus.textContent = 'No more videos to load';
      loadMoreStatus.style.display = 'block';
    } else if (loadedThisBatch === 0) {
      loadMoreStatus.textContent = 'No more videos to load';
      loadMoreStatus.style.display = 'block';
      scrollState.hasMoreContent = false;
    } else {
      loadMoreBtn.style.display = 'block';
    }

    const headerP = videosContent.querySelector("h1 + p");
    if (headerP) {
      headerP.textContent = `Found ${scrollState.loadedEventsCount} video${scrollState.loadedEventsCount !== 1 ? 's' : ''}`;
    }
  }

  loadMoreBtn.addEventListener('click', () => {
    loadMoreEvents();
  });

  // Try simple request first
  console.log("Attempting simple batch request (limit 100)...");
  const initialEvents = await loadInitialBatch();
  
  console.log(`Simple request returned ${initialEvents.length} events`);
  
  if (initialEvents.length < 100) {
    // Less than 100 events means we got everything
    console.log("Profile has < 100 events, using simple approach");
    
    // Sort by newest first
    initialEvents.sort((a, b) => b.created_at - a.created_at);
    
    // Render first 20
    const toRender = initialEvents.slice(0, scrollState.eventsPerPage);
    toRender.forEach(event => renderEventImmediately(event));
    
    // Store remaining events for pagination
    const remaining = initialEvents.slice(scrollState.eventsPerPage);
    
    if (remaining.length > 0) {
      // We have more to show, but no need for complex loading
      scrollState.hasMoreContent = true;
      loadMoreBtn.style.display = 'block';
      
      // Simple load more handler
      const simpleLoadMore = async () => {
        const nextBatch = remaining.splice(0, scrollState.eventsPerPage);
        nextBatch.forEach(event => renderEventImmediately(event));
        
        if (remaining.length === 0) {
          scrollState.hasMoreContent = false;
          loadMoreBtn.style.display = 'none';
          loadMoreStatus.textContent = 'No more videos to load';
          loadMoreStatus.style.display = 'block';
        }
        
        const headerP = videosContent.querySelector("h1 + p");
        if (headerP) {
          headerP.textContent = `Found ${scrollState.loadedEventsCount} video${scrollState.loadedEventsCount !== 1 ? 's' : ''}`;
        }
      };
      
      // Replace the load more listener
      loadMoreBtn.removeEventListener('click', loadMoreEvents);
      loadMoreBtn.addEventListener('click', simpleLoadMore);
    } else {
      // No more events
      scrollState.hasMoreContent = false;
    }
    
    // Find oldest event for timestamp tracking
    if (initialEvents.length > 0) {
      scrollState.oldestTimestamp = initialEvents[initialEvents.length - 1].created_at;
    }
    
  } else {
    // Got 100 events, there are probably more
    console.log("Profile has >= 100 events, switching to interval-based approach");
    
    // Clear the simple batch (we'll re-fetch with interval approach for proper sorting)
    grid.innerHTML = '';
    scrollState.existingEventIds.clear();
    scrollState.loadedEventsCount = 0;
    
    // Use the interval-based approach
    scrollState.useIntervalBased = true;
    await loadMoreEvents();
  }

  const headerP = videosContent.querySelector("h1 + p");
  if (headerP) {
    if (scrollState.loadedEventsCount === 0) {
      headerP.textContent = 'No videos found';
    } else {
      headerP.textContent = `Found ${scrollState.loadedEventsCount} video${scrollState.loadedEventsCount !== 1 ? 's' : ''}`;
    }
  }

  app.profileVideosSubscription = app.profileVideosPool.subscribe(
    allRelays,
    {
      kinds: [21, 22],
      authors: [profile],
      since: scrollState.currentTimestamp,
    },
    {
      onevent(event) {
        if (!scrollState.existingEventIds.has(event.id)) {
          const sanitizedEvent = sanitizeNostrEvent(event);
          if (sanitizedEvent) {
            scrollState.existingEventIds.add(event.id);
            renderNewVideoAtTop(sanitizedEvent, grid);
            scrollState.loadedEventsCount++;
            
            const headerP = videosContent.querySelector("h1 + p");
            if (headerP) {
              headerP.textContent = `Found ${scrollState.loadedEventsCount} video${scrollState.loadedEventsCount !== 1 ? 's' : ''}`;
            }
          }
        }
      },
    }
  );

  videosContent.dataset.loaded = "true";
}

// Load profile playlists with intervals
async function loadProfilePlaylistsWithIntervals(profile, extendedRelays) {
  const playlistsContent = document.getElementById("channelPlaylists");
  if (!playlistsContent) return;

  // Check if already loaded
  if (playlistsContent.dataset.loaded === "true") {
    return;
  }

  const allRelays = [...new Set([...app.globalRelays, ...extendedRelays])];
  
  console.log(`Loading playlists from ${allRelays.length} relays`);

  app.profilePlaylistsPool = new window.NostrTools.SimplePool();

  // Register cleanup for this tab
  const cleanup = () => {
    console.log("Cleaning up profile playlists resources");
    
    if (app.profilePlaylistsSubscription) {
      app.profilePlaylistsSubscription.close();
      app.profilePlaylistsSubscription = null;
    }
    
    if (app.profilePlaylistsPool) {
      app.profilePlaylistsPool.close(allRelays);
      app.profilePlaylistsPool = null;
    }
  };

  profileTabState.cleanupFunctions.playlists = cleanup;
  
  // Also register global cleanup
  registerCleanup(cleanup);

  playlistsContent.innerHTML = `
    <h1>Published Playlists</h1>
    <p>Searching for playlists...</p>
    <div class="playlists-grid"></div>
    <div class="load-more-container" style="text-align: center; padding: 20px;">
      <button id="profile-playlists-load-more-btn" class="load-more-btn" style="display: none;">Load More Playlists</button>
      <p id="profile-playlists-load-more-status" style="display: none;"></p>
    </div>
  `;

  const grid = playlistsContent.querySelector(".playlists-grid");
  const loadMoreBtn = document.getElementById("profile-playlists-load-more-btn");
  const loadMoreStatus = document.getElementById("profile-playlists-load-more-status");

  const scrollState = {
    currentTimestamp: Math.floor(Date.now() / 1000),
    oldestTimestamp: null,
    isLoading: false,
    hasMoreContent: true,
    eventsPerPage: 20,
    loadedEventsCount: 0,
    existingEventIds: new Set(),
    existingDtags: new Map(), // Track d-tags for replaceable events
    emptyPeriodCount: 0,
    maxEmptyPeriods: 3,
    currentPeriodSize: 24 * 60 * 60,
    periodSizes: [
      1 * 24 * 60 * 60,
      7 * 24 * 60 * 60,
      30 * 24 * 60 * 60,
      90 * 24 * 60 * 60,
      180 * 24 * 60 * 60,
      365 * 24 * 60 * 60,
    ],
    periodIndex: 0,
  };

  function renderPlaylistImmediately(event) {
    const card = createPlaylistCard(event);
    grid.appendChild(card);
    
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    
    requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
    
    scrollState.loadedEventsCount++;
  }

  function increasePeriodSize() {
    if (scrollState.periodIndex < scrollState.periodSizes.length - 1) {
      scrollState.periodIndex++;
      scrollState.currentPeriodSize = scrollState.periodSizes[scrollState.periodIndex];
      return true;
    }
    return false;
  }

  // Get d-tag from event
  function getDtag(event) {
    const dTag = event.tags?.find(tag => tag[0] === 'd');
    return dTag ? dTag[1] : null;
  }

  async function loadEventsForPeriod(since, until, renderImmediately = false) {
    return new Promise((resolve) => {
      const events = [];
      let isComplete = false;

      const filter = {
        kinds: [30005], // Kind 30005 for playlists
        authors: [profile],
        since: since,
        until: until,
      };

      const sub = app.profilePlaylistsPool.subscribe(
        allRelays,
        filter,
        {
          onevent(event) {
            if (!scrollState.existingEventIds.has(event.id)) {
              const sanitizedEvent = sanitizeNostrEvent(event);
              if (sanitizedEvent) {
                const dtag = getDtag(sanitizedEvent);
                
                // Handle replaceable events: only keep the latest version
                if (dtag) {
                  const existingEvent = scrollState.existingDtags.get(dtag);
                  
                  if (existingEvent) {
                    // If we already have this d-tag, keep only the newer one
                    if (sanitizedEvent.created_at > existingEvent.created_at) {
                      // Remove old event from display
                      const oldCard = grid.querySelector(`[data-dtag="${dtag}"]`);
                      if (oldCard) {
                        oldCard.remove();
                        scrollState.loadedEventsCount--;
                      }
                      
                      // Remove old event ID
                      scrollState.existingEventIds.delete(existingEvent.id);
                      
                      // Add new event
                      scrollState.existingDtags.set(dtag, sanitizedEvent);
                      scrollState.existingEventIds.add(sanitizedEvent.id);
                      events.push(sanitizedEvent);
                      
                      if (renderImmediately) {
                        renderPlaylistImmediately(sanitizedEvent);
                      }
                    }
                    // If existing is newer, skip this one
                  } else {
                    // First time seeing this d-tag
                    scrollState.existingDtags.set(dtag, sanitizedEvent);
                    scrollState.existingEventIds.add(sanitizedEvent.id);
                    events.push(sanitizedEvent);
                    
                    if (renderImmediately) {
                      renderPlaylistImmediately(sanitizedEvent);
                    }
                  }
                } else {
                  // No d-tag (shouldn't happen for 30005, but handle gracefully)
                  scrollState.existingEventIds.add(sanitizedEvent.id);
                  events.push(sanitizedEvent);
                  
                  if (renderImmediately) {
                    renderPlaylistImmediately(sanitizedEvent);
                  }
                }
              }
            }
          },
          oneose() {
            if (!isComplete) {
              isComplete = true;
              sub.close();
              resolve(events);
            }
          },
          onclose() {
            if (!isComplete) {
              isComplete = true;
              resolve(events);
            }
          },
        }
      );

      setTimeout(() => {
        if (!isComplete) {
          isComplete = true;
          sub.close();
          resolve(events);
        }
      }, 5000);
    });
  }

async function loadInitialPlaylistBatch() {
  return new Promise((resolve) => {
    const events = [];
    let isComplete = false;

    const filter = {
      kinds: [30005],
      authors: [profile],
      limit: 100,
    };

    const sub = app.profilePlaylistsPool.subscribe(
      allRelays,
      filter,
      {
        onevent(event) {
          const sanitizedEvent = sanitizeNostrEvent(event);
          if (sanitizedEvent) {
            const dtag = getDtag(sanitizedEvent);
            
            if (dtag) {
              const existingEvent = scrollState.existingDtags.get(dtag);
              if (!existingEvent || sanitizedEvent.created_at > existingEvent.created_at) {
                if (existingEvent) {
                  scrollState.existingEventIds.delete(existingEvent.id);
                }
                scrollState.existingDtags.set(dtag, sanitizedEvent);
                scrollState.existingEventIds.add(sanitizedEvent.id);
                events.push(sanitizedEvent);
              }
            } else if (!scrollState.existingEventIds.has(event.id)) {
              scrollState.existingEventIds.add(sanitizedEvent.id);
              events.push(sanitizedEvent);
            }
          }
        },
        oneose() {
          if (!isComplete) {
            isComplete = true;
            sub.close();
            resolve(events);
          }
        },
        onclose() {
          if (!isComplete) {
            isComplete = true;
            resolve(events);
          }
        },
      }
    );

    setTimeout(() => {
      if (!isComplete) {
        isComplete = true;
        sub.close();
        resolve(events);
      }
    }, 5000);
  });
}


  async function loadMoreEvents() {
    if (scrollState.isLoading || !scrollState.hasMoreContent) {
      return;
    }

    scrollState.isLoading = true;
    loadMoreBtn.style.display = 'none';
    loadMoreStatus.textContent = 'Loading more playlists...';
    loadMoreStatus.style.display = 'block';

    const startLoadedCount = scrollState.loadedEventsCount;
    
    let currentUntil = scrollState.oldestTimestamp || scrollState.currentTimestamp;
    let currentSince = currentUntil - scrollState.currentPeriodSize;

    while ((scrollState.loadedEventsCount - startLoadedCount) < scrollState.eventsPerPage && scrollState.hasMoreContent) {
      const periodEvents = await loadEventsForPeriod(currentSince, currentUntil, true);
      
      if (periodEvents.length === 0) {
        scrollState.emptyPeriodCount++;
        
        if (scrollState.emptyPeriodCount >= 2) {
          const increased = increasePeriodSize();
          if (increased) {
            scrollState.emptyPeriodCount = 0;
            currentSince = currentUntil - scrollState.currentPeriodSize;
            continue;
          } else {
            if (scrollState.emptyPeriodCount >= scrollState.maxEmptyPeriods) {
              scrollState.hasMoreContent = false;
              break;
            }
          }
        }
        
        currentUntil = currentSince;
        currentSince = currentUntil - scrollState.currentPeriodSize;
        
        if (currentUntil < 0) {
          scrollState.hasMoreContent = false;
          break;
        }
        
        continue;
      }

      scrollState.emptyPeriodCount = 0;

      const oldestEvent = periodEvents.reduce((oldest, event) => 
        event.created_at < oldest.created_at ? event : oldest
      );
      scrollState.oldestTimestamp = oldestEvent.created_at;
      currentUntil = oldestEvent.created_at;
      currentSince = currentUntil - scrollState.currentPeriodSize;
      
      if ((scrollState.loadedEventsCount - startLoadedCount) < scrollState.eventsPerPage) {
        continue;
      } else {
        break;
      }
    }

    scrollState.isLoading = false;
    loadMoreStatus.style.display = 'none';

    const loadedThisBatch = scrollState.loadedEventsCount - startLoadedCount;
    
    if (scrollState.hasMoreContent && loadedThisBatch > 0) {
      loadMoreBtn.style.display = 'block';
    } else if (!scrollState.hasMoreContent) {
      loadMoreStatus.textContent = 'No more playlists to load';
      loadMoreStatus.style.display = 'block';
    } else if (loadedThisBatch === 0) {
      loadMoreStatus.textContent = 'No more playlists to load';
      loadMoreStatus.style.display = 'block';
      scrollState.hasMoreContent = false;
    } else {
      loadMoreBtn.style.display = 'block';
    }

    const headerP = playlistsContent.querySelector("h1 + p");
    if (headerP) {
      headerP.textContent = `Found ${scrollState.loadedEventsCount} playlist${scrollState.loadedEventsCount !== 1 ? 's' : ''}`;
    }
  }

  loadMoreBtn.addEventListener('click', () => {
    loadMoreEvents();
  });

  // Setup click handler for playlists
  grid.addEventListener("click", async (event) => {
    let card = event.target.closest(".video-card");
    if (card && card.dataset.playlistId) {
      const author = card.dataset.author;
      const dtag = card.dataset.dtag;
      
      // Use author parameter for profile playlists
      const playlistUrl = `#playlist/params?author=${author}&dtag=${dtag}&author=${profile}`;
      console.log("Navigating to playlist URL:", playlistUrl);
      window.location.hash = playlistUrl;
    }
  });

// Try simple request first
console.log("Attempting simple batch request for playlists (limit 100)...");
const initialPlaylists = await loadInitialPlaylistBatch();

console.log(`Simple request returned ${initialPlaylists.length} playlist events`);

if (initialPlaylists.length < 100) {
  // Less than 100 events means we got everything
  console.log("Profile has < 100 playlists, using simple approach");
  
  // Sort by newest first
  initialPlaylists.sort((a, b) => b.created_at - a.created_at);
  
  // Render first 20
  const toRender = initialPlaylists.slice(0, scrollState.eventsPerPage);
  toRender.forEach(event => {
    const card = createPlaylistCard(event);
    card.setAttribute('data-dtag', getDtag(event) || '');
    renderPlaylistImmediately(event);
  });
  
  // Store remaining events for pagination
  const remaining = initialPlaylists.slice(scrollState.eventsPerPage);
  
  if (remaining.length > 0) {
    scrollState.hasMoreContent = true;
    loadMoreBtn.style.display = 'block';
    
    const simpleLoadMore = async () => {
      const nextBatch = remaining.splice(0, scrollState.eventsPerPage);
      nextBatch.forEach(event => {
        const card = createPlaylistCard(event);
        card.setAttribute('data-dtag', getDtag(event) || '');
        renderPlaylistImmediately(event);
      });
      
      if (remaining.length === 0) {
        scrollState.hasMoreContent = false;
        loadMoreBtn.style.display = 'none';
        loadMoreStatus.textContent = 'No more playlists to load';
        loadMoreStatus.style.display = 'block';
      }
      
      const headerP = playlistsContent.querySelector("h1 + p");
      if (headerP) {
        headerP.textContent = `Found ${scrollState.loadedEventsCount} playlist${scrollState.loadedEventsCount !== 1 ? 's' : ''}`;
      }
    };
    
    loadMoreBtn.removeEventListener('click', loadMoreEvents);
    loadMoreBtn.addEventListener('click', simpleLoadMore);
  } else {
    scrollState.hasMoreContent = false;
  }
  
  if (initialPlaylists.length > 0) {
    scrollState.oldestTimestamp = initialPlaylists[initialPlaylists.length - 1].created_at;
  }
  
} else {
  // Got 100 events, there are probably more
  console.log("Profile has >= 100 playlists, switching to interval-based approach");
  
  // Clear the simple batch
  grid.innerHTML = '';
  scrollState.existingEventIds.clear();
  scrollState.existingDtags.clear();
  scrollState.loadedEventsCount = 0;
  
  await loadMoreEvents();
}

  const headerP = playlistsContent.querySelector("h1 + p");
  if (headerP) {
    if (scrollState.loadedEventsCount === 0) {
      headerP.textContent = 'No playlists found';
    } else {
      headerP.textContent = `Found ${scrollState.loadedEventsCount} playlist${scrollState.loadedEventsCount !== 1 ? 's' : ''}`;
    }
  }

  // Subscribe to new playlists (real-time updates)
  app.profilePlaylistsSubscription = app.profilePlaylistsPool.subscribe(
    allRelays,
    {
      kinds: [30005],
      authors: [profile],
      since: scrollState.currentTimestamp,
    },
    {
      onevent(event) {
        if (!scrollState.existingEventIds.has(event.id)) {
          const sanitizedEvent = sanitizeNostrEvent(event);
          if (sanitizedEvent) {
            const dtag = getDtag(sanitizedEvent);
            
            if (dtag) {
              const existingEvent = scrollState.existingDtags.get(dtag);
              
              if (existingEvent) {
                // Replace if newer
                if (sanitizedEvent.created_at > existingEvent.created_at) {
                  const oldCard = grid.querySelector(`[data-dtag="${dtag}"]`);
                  if (oldCard) {
                    oldCard.remove();
                    scrollState.loadedEventsCount--;
                  }
                  
                  scrollState.existingEventIds.delete(existingEvent.id);
                  scrollState.existingDtags.set(dtag, sanitizedEvent);
                  scrollState.existingEventIds.add(sanitizedEvent.id);
                  
                  renderNewPlaylistAtTopProfilePage(sanitizedEvent, grid);
                  scrollState.loadedEventsCount++;
                }
              } else {
                // New playlist
                scrollState.existingDtags.set(dtag, sanitizedEvent);
                scrollState.existingEventIds.add(sanitizedEvent.id);
                renderNewPlaylistAtTopProfilePage(sanitizedEvent, grid);
                scrollState.loadedEventsCount++;
              }
            } else {
              scrollState.existingEventIds.add(sanitizedEvent.id);
              renderNewPlaylistAtTopProfilePage(sanitizedEvent, grid);
              scrollState.loadedEventsCount++;
            }
            
            const headerP = playlistsContent.querySelector("h1 + p");
            if (headerP) {
              headerP.textContent = `Found ${scrollState.loadedEventsCount} playlist${scrollState.loadedEventsCount !== 1 ? 's' : ''}`;
            }
          }
        }
      },
    }
  );

  playlistsContent.dataset.loaded = "true";
}





// Load profile relay sets
async function loadProfileRelaySets(profile, extendedRelays) {
  const relaySetsContent = document.getElementById("relay-sets-tab");
  if (!relaySetsContent) return;

  // Check if already loaded
  if (relaySetsContent.dataset.loaded === "true") {
    return;
  }

  const allRelays = [...new Set([...app.globalRelays, ...extendedRelays])];
  
  console.log(`Loading relay sets from ${allRelays.length} relays`);

  app.profileRelaySetsPool = new window.NostrTools.SimplePool();

  // Register cleanup for this tab
  const cleanup = () => {
    console.log("Cleaning up profile relay sets resources");
    
    if (app.profileRelaySetsSubscription) {
      app.profileRelaySetsSubscription.close();
      app.profileRelaySetsSubscription = null;
    }
    
    if (app.profileRelaySetsPool) {
      app.profileRelaySetsPool.close(allRelays);
      app.profileRelaySetsPool = null;
    }
  };

  profileTabState.cleanupFunctions['relay-sets'] = cleanup;
  registerCleanup(cleanup);

  relaySetsContent.innerHTML = `
    <h1>Published Relay Sets</h1>
    <p>Searching for relay sets...</p>
    <div class="relay-sets-container"></div>
  `;

  const container = relaySetsContent.querySelector(".relay-sets-container");
  const receivedEvents = new Map();

  // Get d-tag from event
  function getDtag(event) {
    const dTag = event.tags?.find(tag => tag[0] === 'd');
    return dTag ? dTag[1] : null;
  }

  try {
    const filter = {
      kinds: [30002],
      authors: [profile],
    };

    const subscription = app.profileRelaySetsPool.subscribe(
      allRelays,
      filter,
      {
        onevent(event) {
          const sanitizedEvent = sanitizeNostrEvent(event);
          if (sanitizedEvent) {
            const dtag = getDtag(sanitizedEvent);
            const eventKey = `${sanitizedEvent.pubkey}:${dtag || ''}`;
            
            const existingEvent = receivedEvents.get(eventKey);
            
            if (!existingEvent || sanitizedEvent.created_at > existingEvent.created_at) {
              receivedEvents.set(eventKey, sanitizedEvent);
              
              // Remove old card if exists
              if (existingEvent) {
                const oldCard = container.querySelector(`[data-event-id="${existingEvent.id}"]`);
                if (oldCard) oldCard.remove();
              }
              
              // Create and append new card
              const card = createRelaySetCard(sanitizedEvent);
              renderRelaySetCardContent(card, sanitizedEvent);
              container.appendChild(card);
            }
          }
        },
        oneose() {
          console.log('EOSE received for relay sets');
          updateRelaySetsLoadingState();
        }
      }
    );

    app.profileRelaySetsSubscription = subscription;

    function updateRelaySetsLoadingState() {
      const headerP = relaySetsContent.querySelector("h1 + p");
      if (headerP) {
        if (receivedEvents.size === 0) {
          headerP.textContent = 'No relay sets found';
        } else {
          headerP.textContent = `Found ${receivedEvents.size} relay set${receivedEvents.size !== 1 ? 's' : ''}`;
        }
      }
    }

    setTimeout(() => {
      updateRelaySetsLoadingState();
    }, 5000);

  } catch (error) {
    console.error("Error loading relay sets:", error);
    const headerP = relaySetsContent.querySelector("h1 + p");
    if (headerP) {
      headerP.textContent = 'Error loading relay sets';
    }
  }

  relaySetsContent.dataset.loaded = "true";
}

// Helper function to render relay set card content
function renderRelaySetCardContent(card, event) {
  const getValueFromTags = (tags, key, defaultValue = "") => {
    const tag = tags?.find((t) => t[0] === key);
    return tag ? tag[1] : defaultValue;
  };

  const wsUrls = extractWebSocketUrls(event);
  const title = getValueFromTags(event.tags, "title");
  const description = getValueFromTags(event.tags, "description");
  
  const titleHtml = title ? `<div class="relay-set-title">${escapeHtml(title)}</div>` : '';
  const descriptionHtml = description ? `<div class="relay-set-description">${escapeHtml(description)}</div>` : '';

  const npub = window.NostrTools.nip19.npubEncode(event.pubkey);
  
  card.innerHTML = `
    ${titleHtml}
    ${descriptionHtml}
    <div class="relay-set-main">
      <div class="relay-set-info">
        <div class="relay-count">
          <span class="relay-count-number">${wsUrls.length}</span>
          <span class="relay-count-label">relays</span>
        </div>
        <div class="publish-time">${getRelativeTime(event.created_at)}</div>
      </div>
      <div class="relay-urls">
        ${wsUrls.map((url, index) => {
          const iconId = `profile-relay-icon-${sanitizeForId(event.id)}-${index}`;
          return `
            <div class="relay-item" data-relay="${escapeHtml(url)}">
              <div class="relay-url-text">
                <img id="${iconId}" class="relay-icon" alt="" style="display: none; width: 20px; height: 20px; margin-right: 8px;">
                <span class="relay-url">${escapeHtml(url)}</span>
              </div>
              <div class="relay-item-actions">
                <button class="btn btn-sm btn-secondary relay-info-btn" title="Get relay info">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <circle cx="12" cy="8" r="1" fill="currentColor"/>
                  </svg>
                  <span>Info</span>
                </button>
                <button class="btn btn-sm btn-primary relay-add-to-set-btn" title="Add to local relay set">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>Add to Set</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  // Add event listeners for the buttons and load icons
  const relayItems = card.querySelectorAll('.relay-item');
  relayItems.forEach((item, index) => {
    const relayUrl = item.dataset.relay;
    const iconId = `profile-relay-icon-${sanitizeForId(event.id)}-${index}`;
    
    // Load relay icon asynchronously
    setTimeout(() => loadRelayIcon(relayUrl, iconId), 0);
    
    // Info button
    const infoBtn = item.querySelector('.relay-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        getRelayInfo(relayUrl);
      });
    }
    
    // Add to set button
    const addBtn = item.querySelector('.relay-add-to-set-btn');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showRelaySetSelector(relayUrl);
      });
    }
  });
  
  card.dataset.rendered = "true";
}




// Render new playlist at top (for real-time updates)
function renderNewPlaylistAtTopProfilePage(playlist, grid) {
  let card = createPlaylistCard(playlist);
  
  if (grid.firstChild) {
    grid.insertBefore(card, grid.firstChild);
  } else {
    grid.appendChild(card);
  }
  
  card.classList.add("new-video");
  setTimeout(() => {
    card.classList.remove("new-video");
  }, 2000);
}

function renderNewVideoAtTopProfilePage(video, grid) {
  let card = createVideoCard(video);
  
  if (grid.firstChild) {
    grid.insertBefore(card, grid.firstChild);
  } else {
    grid.appendChild(card);
  }
  
  card.classList.add("new-video");
  setTimeout(() => {
    card.classList.remove("new-video");
  }, 2000);
}

async function loadProfileWithRetry(profile, attempts = 0) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Profile load timeout")),
        PROFILE_LOAD_TIMEOUT
      );
    });

    const loadPromise = Promise.all([
      NostrClient.getProfile(profile),
      getExtendedRelaysForProfile(profile),
    ]);

    const [kindZero, extendedRelays] = await Promise.race([
      loadPromise,
      timeoutPromise,
    ]);

    return { kindZero, extendedRelays };
  } catch (error) {
    if (attempts < RETRY_ATTEMPTS) {
      console.warn(
        `Profile load attempt ${attempts + 1} failed, retrying...`,
        error
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return loadProfileWithRetry(profile, attempts + 1);
    }
    throw error;
  }
}

// Consolidated event listener setup
function setupAllProfileEventListeners(profile, kindZeroContent, extendedRelays) {
  // Setup profile click handler for video navigation
  const profileContainer = document.querySelector(".profile-container");
  if (profileContainer) {
    profileContainer.addEventListener("click", handleProfileClicks);
  }

  // Setup tab event listeners
  setupProfileTabEventListeners(profile, extendedRelays);

  // Setup technical info event listeners
  setupTechnicalInfoEventListeners();

  setTimeout(() => {
    const tabScrollContainer = document.querySelector(".tab-scroll-container");
  enableDragScroll(tabScrollContainer);
  enableWheelScroll(tabScrollContainer);
  }, 100);
}

function decodeProfileParam(profileParam) {
  if (!profileParam) return null;

  let profile = null;

  if (profileParam.startsWith("npub") || profileParam.startsWith("nprofile")) {
    try {
      const decoded = window.NostrTools.nip19.decode(profileParam);
      if (decoded.type === "npub") {
        profile = decoded.data;
      } else if (decoded.type === "nprofile") {
        profile = decoded.data.pubkey;
      }
    } catch (decodeError) {
      console.error("Failed to decode Nostr identifier:", decodeError);
      return null;
    }
  } else if (profileParam.length === 64 && /^[0-9a-f]+$/i.test(profileParam)) {
    profile = profileParam;
  }

  return profile;
}


function getProfileNpub(profile) {
  try {
    return window.NostrTools.nip19.npubEncode(profile);
  } catch (error) {
    console.error("Failed to encode npub:", error);
    return profile; // fallback to raw pubkey
  }
}

// Unified profile data population
/**
 * Populates profile page with user data
 */
function populateProfileData(kindZeroContent, profile, profileNpub) {
  try {
    // Set banner image with fallback
    const bannerImg = document.querySelector(".banner-image");
    if (bannerImg) {
      const bannerUrl = validateImageUrl(kindZeroContent.banner);
      bannerImg.src = bannerUrl || 
        "https://image.nostr.build/477d78313a37287eb5613424772a14f051288ad1cbf2cdeec60e1c3052a839d4.jpg";
      
      bannerImg.onerror = () => {
        bannerImg.src = 
          "https://image.nostr.build/477d78313a37287eb5613424772a14f051288ad1cbf2cdeec60e1c3052a839d4.jpg";
      };
    }

    // Set profile picture with fallback
    const avatar = document.querySelector(".avatar");
    if (avatar) {
      const pictureUrl = validateImageUrl(kindZeroContent.picture);
      avatar.src = pictureUrl || "";
      avatar.onerror = () => {
        avatar.style.display = "none";
      };
    }

    // Set text content safely (no HTML, just plain text)
    const displayName = document.querySelector(".display-name");
    if (displayName) {
      displayName.textContent =
        kindZeroContent.display_name || kindZeroContent.name || "Unknown";
    }

    const username = document.querySelector(".username");
    if (username) {
      displayName.textContent = kindZeroContent.name || "";
    }

    // Set about content (with HTML links, so use innerHTML)
    const about = document.querySelector(".about");
    if (about) {
      const content = kindZeroContent.about || "No description provided.";
      const processedContent = processMessageContent(content);
      
      about.innerHTML = ""; // Clear existing content
      about.appendChild(processedContent);
    }

createProfileLinks(kindZeroContent, profile, profileNpub);
// profile should be the hex pubkey, profileNpub is the encoded version
    createEditButton(profile, kindZeroContent);
    populateTechnicalInfo(profile, profileNpub);
    
  } catch (error) {
    console.error("Error populating profile data:", error);
  }
}


async function verifyNip05(nip05, pubkey) {
  try {
    // Split the identifier into local-part and domain
    const [localPart, domain] = nip05.split('@');
    if (!localPart || !domain) {
      return { verified: false, corsError: false };
    }
    // Make GET request to the well-known endpoint
    const response = await fetch(`https://${domain}/.well-known/nostr.json?name=${localPart}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) {
      return { verified: false, corsError: false };
    }
    const data = await response.json();
    
    // Check if the names object exists and contains the local part
    if (!data.names || !data.names[localPart]) {
      return { verified: false, corsError: false };
    }
    // Verify that the public key matches
    return { verified: data.names[localPart] === pubkey, corsError: false };
  } catch (error) {
    console.warn('NIP-05 verification failed:', error);
    // Check if it's likely a CORS error
    const isCorsError = error.name === 'TypeError' && error.message.includes('fetch');
    return { verified: false, corsError: isCorsError };
  }
}


function createCorsTestUrl(nip05) {
  const [localPart, domain] = nip05.split('@');
  const wellKnownUrl = `https://${domain}/.well-known/nostr.json?name=${localPart.toLowerCase()}`;
  return `https://cors-test.codehappy.dev/?url=${encodeURIComponent(wellKnownUrl)}&method=get`;
}

async function createProfileLinks(kindZeroContent, pubkey, profileNpub) {
  const linksContainer = document.querySelector(".profile-links");
  if (!linksContainer) return;
  
  linksContainer.innerHTML = '';
  
  const linksRow = document.createElement('div');
  linksRow.className = 'profile-links-row';
  
  const links = [];
  
  // FIXED: Use pubkey (hex format) instead of profileNpub
  const followBtn = createProfileButton({
    icon: FOLLOW_ICON,
    text: isProfileFollowed(pubkey) ? "Following" : "Follow",
    className: isProfileFollowed(pubkey) ? "profile-btn following" : "profile-btn",
    onClick: () => handleFollowClick(followBtn, pubkey) // Pass pubkey, not profile
  });
  links.push(followBtn);
  
  // Website link
  if (kindZeroContent.website) {
    const websiteBtn = createProfileButton({
      icon: WEBSITE_ICON,
      text: "Website",
      className: "profile-btn",
      href: kindZeroContent.website,
      isExternal: true
    });
    links.push(websiteBtn);
  }
  
  // NIP-05 verification
  if (kindZeroContent.nip05) {
    const nip05Btn = createProfileButton({
      icon: VERIFICATION_ICON, // Your SVG string here
      text: kindZeroContent.nip05,
      className: "profile-btn nip05-btn pending",
      isVerification: true
    });
    links.push(nip05Btn);
    
    // Verify in background
    verifyNip05(kindZeroContent.nip05, pubkey).then(result => {
      updateNip05Button(nip05Btn, result, kindZeroContent.nip05);
    });
  }
  
  // Lightning address
  function truncateText(text, maxLength = 40) {
    if (text.length <= maxLength) {
      return text;
    }
    const charsToShow = 13;
    return `${text.substring(0, charsToShow)}...${text.substring(text.length - charsToShow)}`;
  }

if (kindZeroContent.lud16) {
  const lightningBtn = createProfileButton({
    icon: LIGHTNING_ICON,
    text: truncateText(kindZeroContent.lud16, 40),
    className: "profile-btn lightning-btn",
    onClick: () => handleLightningClick(kindZeroContent.lud16, pubkey)
  });
  links.push(lightningBtn);
}
  const shareBtn = createProfileButton({
    icon: SHARE_ICON,
    text: "Copy Link",
    className: "profile-btn share-btn",
    onClick: () => handleShareClick()
  });
  links.push(shareBtn);
  
  links.forEach(btn => linksRow.appendChild(btn));
  linksContainer.appendChild(linksRow);
}

function createProfileButton({ icon, text, className, href = null, isExternal = false, isVerification = false, onClick = null }) {
  const button = document.createElement(href ? 'a' : 'button');
  button.className = className;
  
  // Create icon container for SVG
  const iconContainer = document.createElement('span');
  iconContainer.className = 'profile-btn-icon';
  
  // Handle SVG insertion
  if (typeof icon === 'string' && icon.includes('<svg')) {
    // If it's an SVG string, parse and insert it
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(icon, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    
    // Ensure SVG inherits styles properly
    svgElement.setAttribute('width', '16');
    svgElement.setAttribute('height', '16');
    svgElement.classList.add('profile-btn-svg');
    
    iconContainer.appendChild(svgElement);
  } else if (typeof icon === 'string') {
    // Fallback for emoji or text icons
    iconContainer.textContent = icon;
  } else {
    // If you pass an actual SVG element
    iconContainer.appendChild(icon);
  }
  
  // Create text container
  const textContainer = document.createElement('span');
  textContainer.className = 'profile-btn-text';
  textContainer.textContent = text;
  
  button.appendChild(iconContainer);
  button.appendChild(textContainer);
  
  // Handle external links
  if (href && isExternal) {
    button.href = href;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
  }
  
  // Handle click events
  if (onClick) {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
  }
  
  return button;
}
const FOLLOW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
</svg>
`;
const WEBSITE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
</svg>
`;
const VERIFICATION_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
</svg>
`;
const VERIFIED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
</svg>
`;
const FAILED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
</svg>
`;
const LIGHTNING_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
</svg>
`;
const SHARE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
</svg>
`;

function handleFollowClick(button, pubkey) {
  // Validate that pubkey is in hex format (64 characters, hex only)
  if (!pubkey || pubkey.length !== 64 || !/^[0-9a-f]+$/i.test(pubkey)) {
    console.error("Invalid pubkey format:", pubkey);
    showTemporaryNotification("Error: Invalid profile format");
    return;
  }
  
  const currentlyFollowed = isProfileFollowed(pubkey);
  let success;
  
  if (currentlyFollowed) {
    success = removeFollowedPubkey(pubkey);
    if (success) {
      removeFavoriteChannel(pubkey);
      updateDrawerContent();
    }
  } else {
    success = addFollowedPubkey(pubkey);
  }
  
  if (success) {
    const textContainer = button.querySelector('.profile-btn-text');
    textContainer.textContent = currentlyFollowed ? "Follow" : "Following";
    button.classList.toggle("following", !currentlyFollowed);
    showTemporaryNotification(
      currentlyFollowed ? "Unfollowed (local)" : "Followed (local)"
    );
  }
}
function setButtonIcon(iconContainer, svgString) {
  iconContainer.innerHTML = '';
  const svg = new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.classList.add('profile-btn-svg');
  iconContainer.appendChild(svg);
}

function updateNip05Button(button, result, nip05Text) {
  const iconContainer = button.querySelector('.profile-btn-icon');
  const textContainer = button.querySelector('.profile-btn-text');
  
  button.classList.remove('pending');
  
  if (result.verified) {
    setButtonIcon(iconContainer, VERIFIED_ICON);
    button.classList.add('verified');
    textContainer.title = "NIP-05 verified";
  } else {
    setButtonIcon(iconContainer, FAILED_ICON);
    button.classList.add('failed');
    textContainer.title = "NIP-05 verification failed";
    
    if (result.corsError) {
      const corsNotice = document.createElement('div');
      corsNotice.className = 'cors-notice';
      corsNotice.textContent = 'Unable to verify due to CORS';
      
      const testButton = document.createElement('button');
      testButton.className = 'cors-test-btn';
      testButton.textContent = 'Test';
      testButton.onclick = (e) => {
        e.stopPropagation();
        window.open(createCorsTestUrl(nip05Text), '_blank');
      };
      
      button.appendChild(corsNotice);
      button.appendChild(testButton);
    }
  }
}

function handleLightningClick(lud16, pubkey) {
  // Create zap params
  const zapParams = {
    pubkey: pubkey,
    lud16: lud16,
    relays: app.relays.slice(0, 5) // Use first 5 relays
  };
  
  handleZapClick(zapParams);
}

function handleShareClick() {
  openQrModal({
    title: "Profile QR Code",
    contentType: "direct-text",
    initialText: window.location.href,
    generateImmediately: true,
    size: "medium",
  });
}

function createEditButton(profile, kindZeroContent) {
//  console.log("🔧 createEditButton called for profile:", profile);
//  console.log("🔧 Current app.myPk:", app.myPk);

  const checkAndCreateButton = () => {
  //  console.log("🔍 app.myPk:", app.myPk);
  //  console.log("🔍 profile:", profile);
    console.log("🔍 my profile:", app.myPk === profile);
    
    if (app.myPk && app.myPk === profile) {
      // First, make sure we're still on the right profile page
      const currentHash = window.location.hash;
      if (!currentHash.includes('#profile/')) {
        console.log("❌ No longer on profile page");
        return false;
      }
      
      // Look for settings section
      let settingsSection = document.querySelector(".settings-section");
    //  console.log("🔍 Settings section found:", !!settingsSection);
      
      // If settings section doesn't exist, try to recreate it
      if (!settingsSection) {
      //  console.log("🔧 Settings section missing, trying to recreate...");
        
        // Find the profile container
        const profileContainer = document.querySelector(".profile-container");
        if (profileContainer) {
          // Check if settings section should exist (when myPk matches profile)
          const existingSettingsSection = profileContainer.querySelector(".settings-section");
          if (!existingSettingsSection) {
            // Create the settings section
            const newSettingsSection = document.createElement("div");
            newSettingsSection.className = "settings-section";
            
            // Insert it at the beginning of profile container
            profileContainer.insertBefore(newSettingsSection, profileContainer.firstChild);
            settingsSection = newSettingsSection;
          //  console.log("🔧 Created new settings section");
          }
        }
      }
      
      if (settingsSection && !settingsSection.querySelector(".edit-profile-button")) {
      //  console.log("✅ Creating edit button!");
        
        const editBtn = document.createElement("button");
        editBtn.className = "edit-profile-button";
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
</svg>
 edit`;

        editBtn.addEventListener("click", () => {
          app.currentEditingProfile = {
            pubkey: profile,
            profileData: kindZeroContent,
          };
          window.location.hash = "#editprofile";
        });

        settingsSection.appendChild(editBtn);
        return true;
      } else {
        console.log("❌ Settings section not found or button already exists");
      }
    } else {
    //  console.log("❌ No match - myPk:", app.myPk, "profile:", profile);
    }
    return false;
  };

  // Try immediately
  if (checkAndCreateButton()) {
    return;
  }

  // If failed, wait for login
//  console.log("⏳ Starting interval to wait for login...");
  let attemptCount = 0;
  
  const checkInterval = setInterval(() => {
    attemptCount++;
  //  console.log(`⏳ Attempt ${attemptCount} - app.myPk:`, app.myPk);
    
    if (app.myPk !== null) {
    // console.log("🎉 Login detected! Attempting to create button...");
      clearInterval(checkInterval);
      checkAndCreateButton();
    }
    
    // Also check if we're still on the right page
    if (!window.location.hash.includes('#profile/')) {
      console.log("🚪 Left profile page, stopping checks");
      clearInterval(checkInterval);
    }
  }, 500);

  // Stop checking after 10 seconds
  setTimeout(() => {
  //  console.log("⏰ Timeout reached, stopping button creation attempts");
    clearInterval(checkInterval);
  }, 10000);
}

function handleProfileClicks(event) {
  const target = event.target;
  const card = target.closest(".video-card");

  if (!card || !card.dataset.videoId) return;

  try {
    const profileParam = window.location.hash.split("/")[1];
    const profile = decodeProfileParam(profileParam);
    
    // Use author parameter for profile videos
    const watchUrl = `#watch/params?v=${card.dataset.videoId}&author=${profile}`;

    console.log("Navigating to watch URL:", watchUrl);
    window.location.hash = watchUrl;
  } catch (error) {
    console.error("Error handling profile click:", error);
  }
}

function handleVideoLoadError() {
  const videosContent = document.getElementById("channelVideos");
  if (videosContent) {
    videosContent.innerHTML = `
      <h1>Error Loading Videos</h1>
      <p>Failed to load videos for this profile.</p>
      <button class="retry-button">Retry</button>
    `;

    const retryButton = videosContent.querySelector(".retry-button");
    if (retryButton) {
      retryButton.addEventListener("click", () => {
        window.location.reload();
      });
    }
  }
}

async function getExtendedRelaysForProfile(pk) {
  try {

    let topRelayHints = [];
    try {
      const hints = window.NostrGadgets?.global?.hints;
      if (hints) {
        topRelayHints = await hints.topN(pk, 7);
//        console.log("🌟 Top Relay Hints:", 
//          topRelayHints.map(relay => `\n  - ${relay}`).join('')
//        );
      }
    } catch (error) {
      console.warn("❌ Failed to get relay hints for profile:", error);
    }

    const normalizeUrl = (url) => {
      try {
        return url.toLowerCase().replace(/\/+$/, "");
      } catch (e) {
        return url;
      }
    };

    const allRelays = [
      ...topRelayHints.map(normalizeUrl),
      ...NostrClient.relays.map(normalizeUrl),
    ];

//    console.log("📡 All Relays:", 
//      allRelays.map(relay => `\n  - ${relay}`).join('')
//    );

    const combinedRelays = [...new Set(allRelays)];
//    console.log(`🔗 Extended Relays for Profile (${combinedRelays.length}):`, 
//      combinedRelays.map(relay => `\n  - ${relay}`).join('')
//    );

    return combinedRelays;
  } catch (error) {
    console.error("❌ Error getting extended relays:", error);
    return NostrClient.relays;
  }
}

function setupProfileTabEventListeners(profile, extendedRelays) {
  const tabButtons = document.querySelectorAll(".profile-tab-button");
  const tabPanels = document.querySelectorAll(".profile-tab-panel");

  tabButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const tabName = button.dataset.tab;

      // Cleanup previous tab before switching
      if (profileTabState.activeTab && profileTabState.activeTab !== tabName) {
        await cleanupCurrentTab(profileTabState.activeTab);
      }

      // Update active states
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanels.forEach((panel) => panel.classList.remove("active"));

      button.classList.add("active");
      const targetPanel = document.getElementById(`${tabName}-tab`);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }

      profileTabState.activeTab = tabName;

      // Handle tab-specific logic
      switch (tabName) {
        case "videos":
          console.log("Videos tab selected");
          // Videos already loaded on page load, but can reload if needed
          const videosContent = document.getElementById("channelVideos");
          if (videosContent && !videosContent.dataset.loaded) {
            await loadProfileVideosWithIntervals(profile, extendedRelays);
          }
          break;

        case "playlists":
          console.log("Playlists tab selected");
          const playlistsContent = document.getElementById("channelPlaylists");
          if (playlistsContent && !playlistsContent.dataset.loaded) {
            await loadProfilePlaylistsWithIntervals(profile, extendedRelays);
          }
          break;

        case "relay-sets":
          console.log("Relay sets tab selected");
          const relaySetsContent = document.getElementById("relay-sets-tab");
          if (relaySetsContent && !relaySetsContent.dataset.loaded) {
            await loadProfileRelaySets(profile, extendedRelays);
          }
          break;

        case "posts":
          console.log("Posts tab selected (placeholder)");
          break;
      }

      // Scroll the active button into view
      button.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    });
  });

  // Mark videos tab as active on initial load
  profileTabState.activeTab = "videos";
}

async function cleanupCurrentTab(tabName) {
  console.log(`Cleaning up ${tabName} tab`);
  
  if (profileTabState.cleanupFunctions[tabName]) {
    try {
      await profileTabState.cleanupFunctions[tabName]();
      delete profileTabState.cleanupFunctions[tabName];
    } catch (error) {
      console.error(`Error cleaning up ${tabName} tab:`, error);
    }
  }
}

async function populateTechnicalInfo(profile, profileNpub) {
  // Set profile identifiers
  const npubValue = document.querySelector(".npub-value");
  const pubkeyValue = document.querySelector(".pubkey-value");
  
  if (npubValue) npubValue.textContent = profileNpub;
  if (pubkeyValue) pubkeyValue.textContent = profile;

  // Get and populate relay hints
  try {
    const hints = window.NostrGadgets?.global?.hints;
    if (hints) {
      const topRelayHints = await hints.topN(profile, 11);
      populateRelayHints(topRelayHints);
    } else {
      hideRelayHintsSection();
    }
  } catch (error) {
    console.warn("Failed to get relay hints for profile:", error);
    hideRelayHintsSection();
  }
}

function populateRelayHints(relayHints) {
  const relayHintsList = document.querySelector(".relay-hints-list");
  const relayHintsSection = document.querySelector(".relay-hints-section");
  
  if (!relayHintsList || !relayHintsSection) return;
  if (relayHints && relayHints.length > 0) {
    relayHintsSection.style.display = "block";
    relayHintsList.innerHTML = "";
    
    relayHints.forEach(relay => {
      const relayButton = document.createElement("button"); // Create button instead of div
      relayButton.className = "relay-hint-item";
      relayButton.setAttribute("data-relay", relay);
      relayButton.type = "button"; // Explicitly set type
      
      relayButton.innerHTML = `
        <span class="relay-url">${relay}</span>
        <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
</svg>
</span>
      `;
      
      relayHintsList.appendChild(relayButton);
    });
  } else {
    hideRelayHintsSection();
  }
}

function hideRelayHintsSection() {
  const relayHintsSection = document.querySelector(".relay-hints-section");
  if (relayHintsSection) {
    relayHintsSection.style.display = "none";
  }
}

function setupTechnicalInfoEventListeners() {
  // Toggle button event listener
  const toggleButton = document.querySelector(".technical-info-toggle");
  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      const content = document.querySelector(".technical-info-content");
      const arrow = document.querySelector(".toggle-arrow");
      const text = document.querySelector(".toggle-text");
      
      if (content && arrow && text) {
        const isExpanded = content.classList.contains("expanded");
        
        if (isExpanded) {
          content.classList.remove("expanded");
          arrow.textContent = "▼";
          text.textContent = "Show keys and relay hints";
        } else {
          content.classList.add("expanded");
          arrow.textContent = "▲";
          text.textContent = "Hide keys and relay hints";
        }
      }
    });
  }

  // Copy button event listeners
  const copyButtons = document.querySelectorAll('.copy-btn');
  
  copyButtons.forEach(button => {
    // Clone and replace to remove existing listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add direct event listener
    newButton.addEventListener('click', function(event) {
      event.preventDefault();
      
      const copyType = this.getAttribute('data-copy-type');
      let textToCopy = "";
      
      if (copyType === "npub") {
        textToCopy = document.querySelector(".npub-value")?.textContent || "";
      } else if (copyType === "pubkey") {
        textToCopy = document.querySelector(".pubkey-value")?.textContent || "";
      }
      
      if (textToCopy) {
        copyToClipboard(textToCopy, this);
      }
    });
  });

  // Relay button event listeners
document.addEventListener("click", (event) => {
  const relayItem = event.target.closest(".relay-hint-item");
  if (relayItem) {
    const relay = relayItem.getAttribute("data-relay");
    if (relay) {
      console.log("Relay clicked:", relay);
      const cleanUrl = relay.replace(/^(wss?:\/\/|https?:\/\/)/, '');
      window.location.hash = `#singlerelay/${cleanUrl}`;
    }
  }
});
}
