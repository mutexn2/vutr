//no
//no
//no
async function k1HomePageHandler() {
  mainContent.innerHTML = `
  <div id="homePage-container">
    <h1>Discovering Notes</h1>
    <div class="loading-indicator">
        <p>Searching for notes...</p>
    </div>
  </div>
  `;

  let pageContainer = document.getElementById("homePage-container");

  try {
    const filterParams = parseFilterUrl();
    console.log("Current filter params:", filterParams);

    pageContainer.innerHTML = `

<button id="show-new-notes-btn" class="show-new-notes-btn">
  Show <span class="new-notes-count">0</span> new notes
</button>

<div class="notes-feed"></div>
<div class="load-more-container" style="text-align: center; padding: 20px;">
  <button id="load-more-btn" class="load-more-btn" style="display: none;">Load More Notes</button>
  <p id="load-more-status" style="display: none;"></p>
</div>
    `;

    const feed = document.querySelector(".notes-feed");
    const loadMoreBtn = document.getElementById("load-more-btn");
    const loadMoreStatus = document.getElementById("load-more-status");
    const showNewNotesBtn = document.getElementById("show-new-notes-btn");
    const newNotesCount = document.querySelector(".new-notes-count");
    
    // State management
    const scrollState = {
      currentTimestamp: Math.floor(Date.now() / 1000),
      oldestTimestamp: null,
      isLoading: false,
      hasMoreContent: true,
      eventsPerPage: 40,
      loadedEventsCount: 0,
      existingEventIds: new Set(),
      filterParams: filterParams,
      pendingNewNotes: [],
      initialLoadComplete: false,
    };

    // Initialize SimplePool
    app.notesPool = new window.NostrTools.SimplePool();

    // ========== SET UP INTERSECTION OBSERVER ==========
    const observerOptions = {
      root: null,
      rootMargin: '200px',
      threshold: 0
    };

const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const card = entry.target;
      if (card.dataset.needsObserving === 'true') {
        card.dataset.needsObserving = 'false';
        
        // Trigger lazy loading of profile data
        const lazyElements = card.querySelectorAll('[data-lazy="true"]');
        lazyElements.forEach(el => {
          el.removeAttribute('data-lazy');
          // Your custom elements should fetch data when this attribute is removed
        });
      }
    }
  });
}, observerOptions);

    // ========== REGISTER CLEANUP ==========
    registerCleanup(() => {
      console.log("Cleaning up notes page resources");
      
      if (cardObserver) {
        cardObserver.disconnect();
      }
      
      if (app.notesSubscription) {
        app.notesSubscription.close();
        app.notesSubscription = null;
      }
      
      if (app.notesPool) {
        app.notesPool.close(app.relays);
        app.notesPool = null;
      }
    });

    // ========== RENDER FUNCTIONS ==========
function renderEventsBatch(events) {
  // Limit the number of cards in DOM
  const MAX_CARDS_IN_DOM = 100;
  
  const fragment = document.createDocumentFragment();
  events.forEach(event => {
    if (shouldDisplayNote(event)) {
      const card = createNoteCard(event);
      card.dataset.needsObserving = 'true';
      fragment.appendChild(card);
      scrollState.loadedEventsCount++;
    }
  });
  
  feed.appendChild(fragment);
  
  // Remove old cards if too many
  const allCards = feed.querySelectorAll('.note-card');
  if (allCards.length > MAX_CARDS_IN_DOM) {
    const cardsToRemove = Array.from(allCards).slice(0, allCards.length - MAX_CARDS_IN_DOM);
    cardsToRemove.forEach(card => {
      cardObserver.unobserve(card);
      card.remove();
    });
  }
}
    function renderEventImmediately(event) {
      if (!shouldDisplayNote(event)) {
        return;
      }
      
      const card = createNoteCard(event);
      card.dataset.needsObserving = 'true';
      feed.appendChild(card);
      
      cardObserver.observe(card);
      
      // Add entrance animation
      card.style.opacity = '0';
      card.style.transform = 'translateY(-10px)';
      
      requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
      
      scrollState.loadedEventsCount++;
    }

    // ========== LOAD EVENTS FUNCTION ==========
    async function loadInitialEvents() {
      return new Promise((resolve) => {
        const events = [];
        let isComplete = false;

        const sub = app.notesPool.subscribe(
          app.relays,
          {
            kinds: [1],
            limit: scrollState.eventsPerPage,
          },
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

    async function loadMoreEvents() {
      if (scrollState.isLoading || !scrollState.hasMoreContent) {
        return;
      }

      scrollState.isLoading = true;
      loadMoreBtn.style.display = 'none';
      loadMoreStatus.textContent = 'Loading more notes...';
      loadMoreStatus.style.display = 'block';

      const events = [];
      let isComplete = false;

      // Get the oldest timestamp from current feed
      const until = scrollState.oldestTimestamp || scrollState.currentTimestamp;

      const sub = app.notesPool.subscribe(
        app.relays,
        {
          kinds: [1],
          until: until,
          limit: scrollState.eventsPerPage,
        },
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
            }
          },
          onclose() {
            if (!isComplete) {
              isComplete = true;
            }
          },
        }
      );

      setTimeout(() => {
        if (!isComplete) {
          isComplete = true;
          sub.close();
        }
      }, 5000);

      // Wait for subscription to complete
      await new Promise(resolve => {
        const checkComplete = setInterval(() => {
          if (isComplete) {
            clearInterval(checkComplete);
            resolve();
          }
        }, 100);
      });

      scrollState.isLoading = false;
      loadMoreStatus.style.display = 'none';

      if (events.length > 0) {
        // Sort by created_at descending
        events.sort((a, b) => b.created_at - a.created_at);
        
        // Update oldest timestamp
        const oldestEvent = events[events.length - 1];
        scrollState.oldestTimestamp = oldestEvent.created_at;
        
        // Render all at once
        renderEventsBatch(events);
        
        loadMoreBtn.style.display = 'block';
      } else {
        scrollState.hasMoreContent = false;
        loadMoreStatus.textContent = 'No more notes to load';
        loadMoreStatus.style.display = 'block';
      }
    }

    // ========== SET UP EVENT LISTENERS ==========

    feed.addEventListener("click", (event) => {
      let card = event.target.closest(".note-card");
      if (card && card.dataset.noteId && !event.target.closest('.note-actions') && !event.target.closest('.options-button')) {
      //  window.location.hash = `#note/${card.dataset.noteId}`;
      }
    });

    loadMoreBtn.addEventListener('click', () => {
      loadMoreEvents();
    });

    showNewNotesBtn.addEventListener('click', () => {
      const notesToRender = [...scrollState.pendingNewNotes];
      scrollState.pendingNewNotes = [];
      
      notesToRender.reverse().forEach(note => {
        if (shouldDisplayNote(note)) {
          let card = createNoteCard(note);
          card.dataset.needsObserving = 'true';
          
          if (feed.firstChild) {
            feed.insertBefore(card, feed.firstChild);
          } else {
            feed.appendChild(card);
          }
          
          cardObserver.observe(card);
          
          card.classList.add("new-note");
          setTimeout(() => {
            card.classList.remove("new-note");
          }, 2000);
        }
      });
      
      showNewNotesBtn.classList.remove('visible');
      newNotesCount.textContent = '0';
    });

    // ========== INITIAL LOAD ==========
    
    console.log("Loading initial events...");
    const initialEvents = await loadInitialEvents();
    
    if (initialEvents.length > 0) {
      // Sort by created_at descending (newest first)
      initialEvents.sort((a, b) => b.created_at - a.created_at);
      
      // Update oldest timestamp
      const oldestEvent = initialEvents[initialEvents.length - 1];
      scrollState.oldestTimestamp = oldestEvent.created_at;
      
      // Render all at once
      renderEventsBatch(initialEvents);
      
      scrollState.initialLoadComplete = true;
      loadMoreBtn.style.display = 'block';
    } else {
      loadMoreStatus.textContent = 'No notes found';
      loadMoreStatus.style.display = 'block';
    }

    // Hide loading indicator
    const loadingIndicator = document.querySelector(".loading-indicator");
    if (loadingIndicator) {
      loadingIndicator.remove();
    }

    // ========== START REAL-TIME SUBSCRIPTION (AFTER INITIAL LOAD) ==========
    
    app.notesSubscription = app.notesPool.subscribe(
      app.relays,
      {
        kinds: [1],
        since: scrollState.currentTimestamp,
        limit: 100,
      },
      {
        onevent(event) {
          if (!scrollState.existingEventIds.has(event.id)) {
            const sanitizedEvent = sanitizeNostrEvent(event);
            if (sanitizedEvent) {
              scrollState.existingEventIds.add(event.id);
              
              // Always add to pending for new notes that arrive after initial load
              scrollState.pendingNewNotes.push(sanitizedEvent);
              newNotesCount.textContent = scrollState.pendingNewNotes.length;
              showNewNotesBtn.classList.add('visible');
            }
          }
        },
      }
    );

  } catch (error) {
    console.error("Error rendering notes page:", error);
    let errorDiv = document.createElement("div");
    errorDiv.innerHTML = safeHtml`
      <h1>Error</h1>
      <div class="loading-indicator">
        <p>Error rendering notes page: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
    pageContainer.replaceChildren(errorDiv);
  }
}

function shouldDisplayNote(event) {
  if (isProfileMuted(event.pubkey)) {
    return false;
  }
  
  const contentWarnings = event.tags?.filter((tag) => tag[0] === "content-warning") || [];
  const hasContentWarning = contentWarnings.length > 0;
  const showContentWarning = localStorage.getItem("showContentWarning") !== "false";
  
  if (hasContentWarning && !showContentWarning) {
    return false;
  }
  
  return true;
}