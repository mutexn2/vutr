let newMessageCount = 0;
// Reply state management
let replyState = {
  isReplying: false,
  replyToEvent: null,
};
// Reaction tracking
const messageReactions = {
  reactions: new Map(), // eventId -> { likeCount: number, userLiked: boolean }

  async fetchReactionsForMessage(eventId) {
    if (!app.chatPool || !app.chatRelays) return;

    return new Promise((resolve) => {
      const reactions = [];
      let queryComplete = false;

      const timeout = setTimeout(() => {
        if (!queryComplete) {
          sub.close();
          resolve(reactions);
        }
      }, 2000);

      const sub = app.chatPool.subscribe(
        app.chatRelays,
        {
          kinds: [7],
          "#e": [eventId],
        },
        {
          onevent(event) {
            reactions.push(event);
          },
          oneose() {
            queryComplete = true;
            clearTimeout(timeout);
            sub.close();
            resolve(reactions);
          },
        }
      );
    });
  },

  processReactions(eventId, reactions) {
    // Count likes (content === "+")
    const likes = reactions.filter((r) => r.content === "+");
    const likeCount = likes.length;

    // Check if current user liked
    let userLiked = false;
    if (app.myPk) {
      userLiked = likes.some((r) => r.pubkey === app.myPk);
    }

    this.reactions.set(eventId, { likeCount, userLiked });
    return { likeCount, userLiked };
  },

  getReactionData(eventId) {
    return this.reactions.get(eventId) || { likeCount: 0, userLiked: false };
  },

  updateReactionData(eventId, likeCount, userLiked) {
    this.reactions.set(eventId, { likeCount, userLiked });
  },
};
// Enhanced event manager with robust chronological ordering
const eventManager = {
  allEvents: new Map(), // eventId -> event data
  missingEvents: new Set(), // eventIds we've tried to fetch but failed
  pendingQueries: new Map(), // eventId -> Promise (to avoid duplicate requests)

  processEvent(event) {
    this.allEvents.set(event.id, event);
    return { shouldDisplay: true };
  },

  getReferencedEvent(eventId) {
    return this.allEvents.get(eventId);
  },

  // Enhanced method to ensure chronological order when inserting messages
  insertMessageInChronologicalOrder(messageElement, event) {
    const messagesContainer = document.getElementById("messages-container");
    if (!messagesContainer) return;

    // Check if this event is already rendered
    const existingMessage = messagesContainer.querySelector(
      `[data-event-id="${event.id}"]`
    );
    if (existingMessage) {
      return existingMessage; // Already rendered, return existing element
    }

    const eventTimestamp = event.created_at;
    const existingMessages = Array.from(messagesContainer.children);

    // Find the correct insertion point
    let insertIndex = -1;

    // Binary search for more efficient insertion in large chat histories
    let left = 0;
    let right = existingMessages.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTimestamp = parseInt(existingMessages[mid].dataset.timestamp);

      if (midTimestamp === eventTimestamp) {
        // Same timestamp, insert after (newer events after older ones with same timestamp)
        insertIndex = mid + 1;
        break;
      } else if (midTimestamp < eventTimestamp) {
        left = mid + 1;
        insertIndex = left;
      } else {
        right = mid - 1;
        insertIndex = left;
      }
    }

    // Fallback to linear search if binary search didn't find a position
    if (insertIndex === -1) {
      insertIndex = existingMessages.length;
      for (let i = 0; i < existingMessages.length; i++) {
        const existingTimestamp = parseInt(
          existingMessages[i].dataset.timestamp
        );
        if (eventTimestamp < existingTimestamp) {
          insertIndex = i;
          break;
        }
      }
    }

    // Insert the message at the correct position
    if (insertIndex >= existingMessages.length) {
      messagesContainer.appendChild(messageElement);
    } else {
      messagesContainer.insertBefore(
        messageElement,
        existingMessages[insertIndex]
      );
    }

    return messageElement;
  },

  renderFetchedEventInChat(event) {
    const messagesContainer = document.getElementById("messages-container");
    if (!messagesContainer) return;

    // Check if this event is already rendered
    const existingMessage = messagesContainer.querySelector(
      `[data-event-id="${event.id}"]`
    );
    if (existingMessage) {
      return existingMessage; // Already rendered
    }

    // Create the message element
    const messageElement = createMessageElement(event);

    // Insert in chronological order
    const insertedElement = this.insertMessageInChronologicalOrder(
      messageElement,
      event
    );

    // Add visual indicator for newly fetched messages
    insertedElement.classList.add("fetched-message");
    setTimeout(() => {
      insertedElement.classList.remove("fetched-message");
    }, 2000);

    return insertedElement;
  },

  // Method to verify and fix chronological order if needed
  validateChronologicalOrder() {
    const messagesContainer = document.getElementById("messages-container");
    if (!messagesContainer) return;

    const messages = Array.from(messagesContainer.children);
    let isOrdered = true;

    // Check if messages are in chronological order
    for (let i = 1; i < messages.length; i++) {
      const prevTimestamp = parseInt(messages[i - 1].dataset.timestamp);
      const currentTimestamp = parseInt(messages[i].dataset.timestamp);

      if (prevTimestamp > currentTimestamp) {
        isOrdered = false;
        break;
      }
    }

    // If not ordered, re-sort all messages
    if (!isOrdered) {
      console.warn("Messages out of chronological order, re-sorting...");
      this.resortAllMessages();
    }

    return isOrdered;
  },

  // Method to resort all messages in the container
  resortAllMessages() {
    const messagesContainer = document.getElementById("messages-container");
    if (!messagesContainer) return;

    const messages = Array.from(messagesContainer.children);

    // Sort messages by timestamp
    messages.sort((a, b) => {
      const timestampA = parseInt(a.dataset.timestamp);
      const timestampB = parseInt(b.dataset.timestamp);
      return timestampA - timestampB;
    });

    // Clear container and re-append in correct order
    messagesContainer.innerHTML = "";
    messages.forEach((message) => {
      messagesContainer.appendChild(message);
    });

    console.log("Messages resorted chronologically");
  },

  async fetchMissingEvent(eventId) {
    // Return null if we already know this event doesn't exist
    if (this.missingEvents.has(eventId)) {
      return null;
    }

    // Return existing promise if already querying
    if (this.pendingQueries.has(eventId)) {
      return this.pendingQueries.get(eventId);
    }

    // Create new query promise
    const queryPromise = this.queryEvent(eventId);
    this.pendingQueries.set(eventId, queryPromise);

    try {
      const event = await queryPromise;
      this.pendingQueries.delete(eventId);

      if (event) {
        this.processEvent(event);

        // Render the fetched event as a proper message in the chat
        this.renderFetchedEventInChat(event);

        return event;
      } else {
        this.missingEvents.add(eventId);
        return null;
      }
    } catch (error) {
      this.pendingQueries.delete(eventId);
      this.missingEvents.add(eventId);
      console.warn(`Failed to fetch event ${eventId}:`, error);
      return null;
    }
  },

  async queryEvent(eventId) {
    return new Promise((resolve) => {
      if (!app.chatPool) {
        resolve(null);
        return;
      }

      let eventFound = false;
      const timeout = setTimeout(() => {
        if (!eventFound) {
          sub.close();
          resolve(null);
        }
      }, 3000);

      const sub = app.chatPool.subscribe(
        app.chatRelays,
        {
          ids: [eventId],
          kinds: [42],
          "#e": [
            "39c44dcdd67271483f1c5217bcfd214c8c34980fa55f0f6b834a3e253e296c15",
          ],
        },
        {
          onevent(event) {
            if (event.id === eventId) {
              eventFound = true;
              clearTimeout(timeout);
              sub.close();
              resolve(event);
            }
          },
          oneose() {
            if (!eventFound) {
              clearTimeout(timeout);
              sub.close();
              resolve(null);
            }
          },
          onclose() {
            if (!eventFound) {
              clearTimeout(timeout);
              resolve(null);
            }
          },
        }
      );
    });
  },
};


// PoW Configuration (hardcoded by developer)
const POW_DIFFICULTY = 0; // Set your desired difficulty here

// Helper function to get PoW from event
function getEventPow(event) {
  return window.NostrTools.nip13.getPow(event.id);
}


async function contactPageHandler() {
  // Clean up any existing chat subscription
  if (app.chatSubscription) {
    app.chatSubscription.close();
    app.chatSubscription = null;
  }
  if (app.chatPool) {
    app.chatPool.close(app.chatRelays);
    app.chatPool = null;
  }

  mainContent.innerHTML = `
    <div class="loading-indicator">
      <p>Loading recent messages...</p>
    </div>
    <div id="messages-container"></div>
    <div id="new-messages-indicator" class="new-messages-indicator hidden">
      <span>New messages</span>
      <button id="scroll-to-bottom-btn">Go to bottom</button>
    </div>
    <div class="chat-input-container">
      <div id="reply-indicator" class="reply-indicator hidden">
        <span id="reply-text">Replying to...</span>
        <button id="cancel-reply-btn">✕</button>
      </div>
      <div class="chat-input-wrapper">
        <textarea id="message-input" placeholder="Type your message..." rows="1"></textarea>
        <button id="send-button">Send</button>
      </div>
      <div class="chat-input-info">
        
      </div>
    </div>
  `;

  const messagesContainer = document.getElementById("messages-container");
  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");
  const scrollToBottomBtn = document.getElementById("scroll-to-bottom-btn");

  scrollToBottomBtn.addEventListener("click", () => {
    scrollToBottom();
    newMessageCount = 0;
    hideNewMessageIndicator();
  });

  messagesContainer.addEventListener("scroll", () => {
    if (isAtBottom()) {
      newMessageCount = 0;
      hideNewMessageIndicator();
    }
  });

  // Auto-resize textarea
  messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });

  // Send functionality
  sendButton.addEventListener("click", async () => {
    if (messageInput.value.trim()) {
      await sendChatMessage(messageInput.value.trim());
      messageInput.value = "";
      messageInput.style.height = "auto";
      setTimeout(() => scrollToBottom(), 100);
    }
  });

  // Enter key to send
  messageInput.addEventListener("keydown", async (e) => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (e.key === "Enter") {
      if (isMobile || e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        if (messageInput.value.trim()) {
          await sendChatMessage(messageInput.value.trim());
          messageInput.value = "";
          messageInput.style.height = "auto";
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    }
  });

  const cancelReplyBtn = document.getElementById("cancel-reply-btn");
  cancelReplyBtn?.addEventListener("click", () => {
    clearReplyState();
  });

  try {
    app.chatPool = new window.NostrTools.SimplePool();
    const existingEvents = new Set();
    let isInitialLoad = true;
    let initialLoadCount = 0;

    app.chatSubscription = app.chatPool.subscribe(
      app.chatRelays,
      {
        kinds: [42],
        limit: 21,
        "#e": [
          "39c44dcdd67271483f1c5217bcfd214c8c34980fa55f0f6b834a3e253e296c15",
        ],
      },
      {
        onevent(event) {
          console.log("got event:", event);

          if (existingEvents.has(event.id)) {
            return;
          }
          existingEvents.add(event.id);

          // Process through event manager
          eventManager.processEvent(event);

          // Check PoW requirement (silently filter)
          const meetsPow = eventMeetsPowRequirement(event);
          
          if (meetsPow) {
            if (isInitialLoad) {
              initialLoadCount++;
              setTimeout(() => renderInitialEvent(event, messagesContainer), 0);
            } else {
              appendNewMessage(event, messagesContainer);
            }
          } else {
            // Silently ignore messages that don't meet PoW requirement
            const eventPow = getEventPow(event);
            console.log(`Filtered out event with PoW ${eventPow} (required: ${POW_DIFFICULTY})`);
          }
        },

        oneose() {
          console.log(
            "End of stored events reached, got",
            initialLoadCount,
            "events"
          );
          isInitialLoad = false;
          hideLoadingIndicator();
          setTimeout(() => scrollToBottom(false), 100);

          setTimeout(() => {
            autoFetchMissingReferences();
            setTimeout(() => scrollToBottom(false), 300); 
          }, 500);
        },

        onclose() {
          console.log("Chat subscription closed");
        },
      }
    );
  } catch (error) {
    console.error("Error setting up chat:", error);
    showError(error);
  }
}

function renderInitialEvent(event, container) {
  const messageElement = createMessageElement(event);
  eventManager.insertMessageInChronologicalOrder(messageElement, event);
}

function appendNewMessage(event, container) {
  const wasAtBottom = isAtBottom();

  const messageElement = createMessageElement(event);
  container.appendChild(messageElement);

  requestAnimationFrame(() => {
    if (wasAtBottom) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 300);
    } else {
      newMessageCount++; // Increment counter
      showNewMessageIndicator(newMessageCount); // Pass count to function
    }
  });
}
function createMessageElement(event) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message";
  messageDiv.dataset.timestamp = event.created_at;
  messageDiv.dataset.eventId = event.id;

  // Check if this is a reply and create reference header
  const repliedToId = getRepliedToEventId(event);
  if (repliedToId) {
    const referenceHeader = createReferenceHeader(repliedToId);
    messageDiv.appendChild(referenceHeader);
  }

  // Create main message header
  const headerDiv = document.createElement("div");
  headerDiv.className = "message-header";

  const authorElement = createAuthorElement(event.pubkey);

  const timestampSpan = document.createElement("span");
  timestampSpan.className = "message-timestamp";
  timestampSpan.textContent = formatTimestamp(event.created_at);

  headerDiv.appendChild(authorElement);
  headerDiv.appendChild(timestampSpan);

  // Create content
  const contentDiv = createCompactContent(event.content);

  // Create tags if any
  const hashtags = event.tags
    .filter((tag) => tag[0] === "t")
    .map((tag) => "#" + tag[1]);

  let tagsDiv = null;
  if (hashtags.length > 0) {
    tagsDiv = document.createElement("div");
    tagsDiv.className = "message-tags";
    tagsDiv.textContent = hashtags.join(" ");
  }

  // Create footer with actions
  const footerDiv = createMessageFooter(event);

  // Assemble message
  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(contentDiv);
  if (tagsDiv) messageDiv.appendChild(tagsDiv);
  messageDiv.appendChild(footerDiv);

  return messageDiv;
}

function processMessageContent(content) {
  const sanitizedContent = sanitizeTextPreservingNostrUris(content);
  const nostrUriRegex = /nostr:(npub1[a-z0-9]+|nprofile1[a-z0-9]+)/g;

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  let lastIndex = 0;
  let match;

  while ((match = nostrUriRegex.exec(sanitizedContent)) !== null) {
    if (match.index > lastIndex) {
      const textNode = document.createTextNode(
        sanitizedContent.slice(lastIndex, match.index)
      );
      contentDiv.appendChild(textNode);
    }

    const nostrName = document.createElement("nostr-name");
    const nostrId = match[1];
    const hexPubkey = decodeProfileParam(nostrId);

    if (hexPubkey) {
      let pubkeyForComponent;
      if (nostrId.startsWith("npub1")) {
        pubkeyForComponent = nostrId;
      } else {
        try {
          pubkeyForComponent = window.NostrTools.nip19.npubEncode(hexPubkey);
        } catch (error) {
          console.warn("Failed to encode npub:", error);
          pubkeyForComponent = hexPubkey;
        }
      }

      nostrName.setAttribute("pubkey", pubkeyForComponent);
      nostrName.style.cursor = "pointer";
      nostrName.addEventListener("click", () => {
        window.location.hash = `#profile/${hexPubkey}`;
      });

      contentDiv.appendChild(nostrName);
    } else {
      const textNode = document.createTextNode(match[0]);
      contentDiv.appendChild(textNode);
    }

    lastIndex = nostrUriRegex.lastIndex;
  }

  if (lastIndex < sanitizedContent.length) {
    const textNode = document.createTextNode(sanitizedContent.slice(lastIndex));
    contentDiv.appendChild(textNode);
  }

  return contentDiv;
}

// Helper function to get the replied-to event ID following NIP-10
function getRepliedToEventId(event) {
  const eTags = event.tags.filter((tag) => tag[0] === "e");

  if (eTags.length === 0) {
    return null;
  }

  // Look for "reply" marker first (NIP-10)
  const replyTag = eTags.find((tag) => tag[3] === "reply");
  if (replyTag) {
    return replyTag[1];
  }

  // Skip the root tag (it's the chat room itself)
  // Only return null since we don't want to show the chat room as a reference
  return null;
}
// Add this property to track the current handler
function createReferenceHeader(repliedToId) {
  const referenceDiv = document.createElement("div");
  referenceDiv.className = "message-reference";
  referenceDiv.dataset.referencedId = repliedToId;
  referenceDiv._currentHandler = null; // Track current event handler

  const referencedEvent = eventManager.getReferencedEvent(repliedToId);

  if (referencedEvent) {
    renderReferenceContent(referenceDiv, referencedEvent, repliedToId);
  } else {
    renderReferenceClickToLoad(referenceDiv, repliedToId);
  }

  return referenceDiv;
}

function renderReferenceClickToLoad(referenceDiv, repliedToId) {
  referenceDiv.innerHTML = `
    <div class="reference-content reference-click-to-load">
      <span class="reference-icon">↳</span>
      <span class="reference-text">Replying to ${repliedToId.slice(
        0,
        8
      )}... <span class="reference-action">(click to load)</span></span>
    </div>
  `;

  // Remove previous handler if it exists
  if (referenceDiv._currentHandler) {
    referenceDiv.removeEventListener("click", referenceDiv._currentHandler);
  }

  referenceDiv.style.cursor = "pointer";
  referenceDiv.classList.add("reference-clickable");

  // Create and store the new handler
  referenceDiv._currentHandler = async () => {
    renderReferenceLoading(referenceDiv, repliedToId);
    const fetchedEvent = await eventManager.fetchMissingEvent(repliedToId);

    if (fetchedEvent) {
      updateAllReferencesToEvent(repliedToId, fetchedEvent);
    } else {
      renderReferenceNotFound(referenceDiv, repliedToId);
    }
  };

  referenceDiv.addEventListener("click", referenceDiv._currentHandler);
}

async function autoFetchMissingReferences() {
  const messagesContainer = document.getElementById("messages-container");
  if (!messagesContainer) return;

  // Find all "click to load" references
  const clickToLoadRefs = messagesContainer.querySelectorAll(
    ".reference-click-to-load"
  );

  if (clickToLoadRefs.length === 0) {
    console.log("No missing references to fetch");
    return;
  }

  console.log(`Auto-fetching ${clickToLoadRefs.length} missing references...`);

  // Collect unique event IDs to fetch
  const missingIds = new Set();
  clickToLoadRefs.forEach((ref) => {
    const referenceDiv = ref.closest(".message-reference");
    if (referenceDiv) {
      const referencedId = referenceDiv.dataset.referencedId;
      if (referencedId) {
        missingIds.add(referencedId);
      }
    }
  });

  // Fetch all missing events
  const fetchPromises = Array.from(missingIds).map(async (eventId) => {
    const referenceDiv = messagesContainer.querySelector(
      `[data-referenced-id="${eventId}"]`
    );
    if (referenceDiv) {
      renderReferenceLoading(referenceDiv, eventId);
    }

    const fetchedEvent = await eventManager.fetchMissingEvent(eventId);

    if (fetchedEvent) {
      updateAllReferencesToEvent(eventId, fetchedEvent);
    } else {
      // Update all references to show "not found"
      const allRefs = messagesContainer.querySelectorAll(
        `[data-referenced-id="${eventId}"]`
      );
      allRefs.forEach((ref) => renderReferenceNotFound(ref, eventId));
    }
  });

  await Promise.all(fetchPromises);
  console.log("Finished auto-fetching missing references");
  setTimeout(() => scrollToBottom(false), 200); 
}

function renderReferenceContent(referenceDiv, referencedEvent, repliedToId) {
  const authorElement = createAuthorElement(referencedEvent.pubkey);
  const contentPreview =
    referencedEvent.content.length > 50
      ? referencedEvent.content.slice(0, 50) + "..."
      : referencedEvent.content;

  referenceDiv.innerHTML = `
    <div class="reference-content">
      <span class="reference-icon">↳</span>
      <span class="reference-text">Replying to <span class="reference-author"></span>: "${contentPreview}"</span>
    </div>
  `;

  const authorContainer = referenceDiv.querySelector(".reference-author");
  authorContainer.appendChild(authorElement);

  // Remove previous handler if it exists
  if (referenceDiv._currentHandler) {
    referenceDiv.removeEventListener("click", referenceDiv._currentHandler);
  }

  referenceDiv.style.cursor = "pointer";
  referenceDiv.classList.add("reference-clickable");

  // Create and store the new handler for scrolling to message
  referenceDiv._currentHandler = () => {
    const targetElement = document.querySelector(
      `[data-event-id="${repliedToId}"]`
    );
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      targetElement.classList.add("highlighted");
      setTimeout(() => targetElement.classList.remove("highlighted"), 2000);
    } else {
      console.log("Referenced message not visible in current view");
    }
  };

  referenceDiv.addEventListener("click", referenceDiv._currentHandler);
}

function renderReferenceLoading(referenceDiv, repliedToId) {
  referenceDiv.innerHTML = `
    <div class="reference-content reference-loading">
      <span class="reference-icon">↳</span>
      <span class="reference-text">Loading referenced message...</span>
      <span class="reference-spinner">⟳</span>
    </div>
  `;

  referenceDiv.classList.remove("reference-clickable");
  referenceDiv.style.cursor = "wait";
}

function renderReferenceNotFound(referenceDiv, repliedToId) {
  referenceDiv.innerHTML = `
    <div class="reference-content reference-not-found">
      <span class="reference-icon">↳</span>
      <span class="reference-text">Replying to ${repliedToId} (message not found)</span>
      <button class="copy-ref-id-btn" title="Copy referenced ID">⎘ copy id</button>
    </div>
  `;

  // Add click handler for the copy button
  const copyBtn = referenceDiv.querySelector(".copy-ref-id-btn");
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent triggering any parent click handlers
    copyToClipboard(repliedToId, copyBtn);
  });

  referenceDiv.classList.remove("reference-clickable");
  referenceDiv.style.cursor = "default";
}

// Update all visible references to a newly loaded event
function updateAllReferencesToEvent(eventId, event) {
  const references = document.querySelectorAll(
    `[data-referenced-id="${eventId}"]`
  );
  references.forEach((referenceDiv) => {
    renderReferenceContent(referenceDiv, event, eventId);
  });
}

function createCompactContent(content, maxLength = 140) {
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  if (content.length <= maxLength) {
    const processedContent = processMessageContent(content);
    contentDiv.appendChild(processedContent);
  } else {
    const truncated = content.slice(0, maxLength) + "...";
    const processedTruncated = processMessageContent(truncated);

    const seeMoreDiv = document.createElement("div");
    seeMoreDiv.className = "see-more-section";

    const seeMoreBtn = document.createElement("button");
    seeMoreBtn.className = "see-more-btn";
    seeMoreBtn.textContent = "See more";
    seeMoreBtn.addEventListener("click", () =>
      toggleFullContent(contentDiv, content)
    );

    seeMoreDiv.appendChild(seeMoreBtn);

    contentDiv.appendChild(processedTruncated);
    contentDiv.appendChild(seeMoreDiv);
  }

  return contentDiv;
}

function toggleFullContent(contentDiv, fullContent) {
  const seeMoreSection = contentDiv.querySelector(".see-more-section");
  const btn = seeMoreSection.querySelector(".see-more-btn");

  if (btn.textContent === "See more") {
    contentDiv.innerHTML = "";
    const processedFull = processMessageContent(fullContent);
    contentDiv.appendChild(processedFull);

    const seeLessDiv = document.createElement("div");
    seeLessDiv.className = "see-more-section";
    const seeLessBtn = document.createElement("button");
    seeLessBtn.className = "see-more-btn";
    seeLessBtn.textContent = "See less";
    seeLessBtn.addEventListener("click", () => {
      const newContent = createCompactContent(fullContent);
      contentDiv.parentNode.replaceChild(newContent, contentDiv);
    });
    seeLessDiv.appendChild(seeLessBtn);
    contentDiv.appendChild(seeLessDiv);
  }
}

function createMessageFooter(event) {
  const footerDiv = document.createElement("div");
  footerDiv.className = "message-footer";
  footerDiv.dataset.eventId = event.id; // Add this for easy updates

  // Create the same structure as video page actions
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "video-action-tabs"; // Reuse video page class

  const scrollContainer = document.createElement("div");
  scrollContainer.className = "tab-scroll-container"; // Reuse video page class

  const replyButton = document.createElement("button");
  replyButton.className = "video-action-tab-button";
  replyButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
</svg>
  `;
  replyButton.addEventListener("click", () => handleReply(event));

  const likeSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="like-icon">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>`;

  // Create like button
  const likeButton = document.createElement("button");
  likeButton.className = "video-action-tab-button";
  likeButton.dataset.likeBtn = event.id;
  likeButton.innerHTML = `${likeSvg} <span class="like-count" data-like-count="${event.id}"></span>`;

  const likeCountSpan = likeButton.querySelector(".like-count");

  // Fetch and display reactions
  loadReactionsForButton(event.id, likeButton, likeCountSpan);

  likeButton.addEventListener("click", () =>
    handleLikeWithUI(event, likeButton, likeCountSpan)
  );

  const zapButton = document.createElement("button");
  zapButton.className = "video-action-tab-button";
  zapButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
</svg>

  `;
  zapButton.addEventListener("click", () => handleZap(event));

  const showJsonButton = document.createElement("button");
  showJsonButton.className = "video-action-tab-button";
  showJsonButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
</svg>
  `;
  showJsonButton.addEventListener("click", () => showRawData(event));



  // Append buttons to scroll container
  scrollContainer.appendChild(replyButton);
  scrollContainer.appendChild(likeButton);
  scrollContainer.appendChild(zapButton);
  scrollContainer.appendChild(showJsonButton);

  // Assemble structure
  actionsDiv.appendChild(scrollContainer);
  footerDiv.appendChild(actionsDiv);

  // Enable drag and wheel scrolling like in video page
/*   setTimeout(() => {
    enableDragScroll(scrollContainer);
    enableWheelScroll(scrollContainer);
  }, 100); */

  return footerDiv;
}

async function loadReactionsForButton(eventId, likeButton, likeCountSpan) {
  try {
    // Check if we already have cached data
    let reactionData = messageReactions.getReactionData(eventId);

    // If not cached or is initial load, fetch from relays
    if (
      reactionData.likeCount === 0 &&
      !messageReactions.reactions.has(eventId)
    ) {
      const reactions = await messageReactions.fetchReactionsForMessage(
        eventId
      );
      reactionData = messageReactions.processReactions(eventId, reactions);
    }

    // Update UI - only show count if > 0
    if (reactionData.likeCount > 0) {
      likeCountSpan.textContent = reactionData.likeCount;
    } else {
      likeCountSpan.textContent = ""; // Hide when zero
    }

    if (reactionData.userLiked) {
      // Update to liked state
      likeButton.classList.add("liked");
      likeButton.disabled = true;
      //  likeButton.innerHTML = likeButton.innerHTML.replace('Like', 'Liked');
    }
  } catch (error) {
    console.error("Error loading reactions:", error);
  }
}
////////////
function createAuthorElement(hexPubkey) {
  // Create a container div that will be the clickable element
  const authorContainer = document.createElement("div");
  authorContainer.className = "author-container";
  authorContainer.setAttribute("pubkey", hexPubkey);
  authorContainer.style.cursor = "pointer";
  authorContainer.addEventListener("click", () => {
    window.location.hash = `#profile/${hexPubkey}`;
  });

  // Create nostr-picture element
  const nostrPicture = document.createElement("nostr-picture");
  nostrPicture.setAttribute("pubkey", hexPubkey);

  // Create nostr-name element
  const nostrName = document.createElement("nostr-name");
  nostrName.setAttribute("pubkey", hexPubkey);

  // Append both elements to the container
  authorContainer.appendChild(nostrPicture);
  authorContainer.appendChild(nostrName);

  return authorContainer;
}

function isAtBottom() {
  const messagesContainer = document.getElementById("messages-container");
  if (!messagesContainer) return true;

  const threshold = 300;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
  return scrollTop + clientHeight >= scrollHeight - threshold;
}

function scrollToBottom(smooth = true) {
  const messagesContainer = document.getElementById("messages-container");
  if (!messagesContainer) return;

  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: smooth ? "smooth" : "instant",
  });
}

function showNewMessageIndicator(count = null) {
  const indicator = document.getElementById("new-messages-indicator");
  if (indicator) {
    const span = indicator.querySelector("span");
    if (count !== null && count > 0) {
      span.textContent = `(${count}) New messages`;
    } else {
      span.textContent = "New messages";
    }
    indicator.classList.remove("hidden");
  }
}

function hideNewMessageIndicator() {
  const indicator = document.getElementById("new-messages-indicator");
  if (indicator) {
    indicator.classList.add("hidden");
  }
}

function handleReply(event) {
  console.log("Reply to event:", event.id);

  // Set the reply state and show indicator
  setReplyState(event);

  // Scroll to input area
  const chatInputContainer = document.querySelector(".chat-input-container");
  if (chatInputContainer) {
    chatInputContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

async function handleLikeWithUI(event, likeButton, likeCountSpan) {
  console.log("Like event:", event.id);

  // Check if user is logged in
  if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
    showTemporaryNotification("❌ Please log in to like messages");
    return;
  }

  // Check if already liked
  const reactionData = messageReactions.getReactionData(event.id);
  if (reactionData.userLiked) {
    showTemporaryNotification("You already liked this message");
    return;
  }

  try {
    // Disable button and show loading state
    likeButton.disabled = true;
    const originalHTML = likeButton.innerHTML;
    const likeSvg = likeButton.querySelector(".like-icon").outerHTML;
    likeButton.innerHTML = `${likeSvg} Liking... <span class="like-count" data-like-count="${event.id}"></span>`;

    // Get a relay hint (use first chat relay)
    const relayHint =
      app.chatRelays && app.chatRelays.length > 0 ? app.chatRelays[0] : "";

    // Create the reaction event (kind-7)
    const reactionEvent = {
      kind: 7,
      created_at: Math.floor(Date.now() / 1000),
      content: "+", // "+" indicates a like/upvote
      tags: [
        ["e", event.id, relayHint], // Reference to the message event with relay hint
        ["p", event.pubkey, relayHint], // Author of the message with relay hint
        ["k", "42"], // Kind of the event being reacted to
      ],
    };

    console.log("Creating reaction event:", reactionEvent);

    // Sign the event
    const signedReactionEvent = await handleEventSigning(reactionEvent);

    console.log("Reaction event signed successfully:", signedReactionEvent);

    // Publish to chat relays
    if (app.chatRelays && app.chatRelays.length > 0) {
      try {
        const result = await publishEvent(signedReactionEvent, app.chatRelays, {
          successMessage: "Like reaction published successfully",
          errorMessage: "Failed to publish like reaction",
        });

        if (result.success) {
          // Update to liked state
          likeButton.classList.add("liked");
          likeButton.disabled = true;

          const currentCount = parseInt(likeCountSpan.textContent) || 0;
          const newCount = currentCount + 1;

          // Update button with liked state
          likeButton.innerHTML = `${likeSvg} <span class="like-count" data-like-count="${
            event.id
          }">${newCount > 0 ? newCount : ""}</span>`;

          // Update cached reaction data
          messageReactions.updateReactionData(event.id, newCount, true);

          showTemporaryNotification("👍 Like published successfully!");
        } else {
          throw new Error(result.error);
        }
      } catch (publishError) {
        console.error("Error publishing reaction event:", publishError);
        showTemporaryNotification("❌ Failed to publish like reaction");

        // Restore original state on publish failure
        likeButton.disabled = false;
        likeButton.innerHTML = originalHTML;
      }
    } else {
      console.warn("No chat relays configured, reaction event not published");
      showTemporaryNotification("❌ No relays configured");
      likeButton.disabled = false;
      likeButton.innerHTML = originalHTML;
    }
  } catch (error) {
    console.error("Error creating reaction event:", error);
    showTemporaryNotification(
      "❌ Failed to create like reaction: " + error.message
    );

    // Restore original state on error
    likeButton.disabled = false;
    const likeSvg = likeButton.querySelector(".like-icon")?.outerHTML || "";
    likeButton.innerHTML = `${likeSvg} Like <span class="like-count" data-like-count="${event.id}">${likeCountSpan.textContent}</span>`;
  }
}

function handleZap(event) {
  console.log("Zap event:", event.id);
  console.log("Would initiate Lightning Network payment flow");
  console.log("Would create kind 9734 zap request");
}

///////////////////////////////

function formatTimestamp(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function hideLoadingIndicator() {
  const indicator = document.querySelector(".loading-indicator");
  if (indicator) indicator.style.display = "none";
}

/* function showError(error) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-container";

  const title = document.createElement("h1");
  title.textContent = "Error";

  const message = document.createElement("p");
  message.textContent = `Error loading messages: ${error.message || error}`;

  errorDiv.appendChild(title);
  errorDiv.appendChild(message);
  mainContent.replaceChildren(errorDiv);
} */

function showRawData(event) {
  const modal = openModal({
    title: `Event JSON - ${event.id}`,
    content: `<pre>${JSON.stringify(event, null, 2)}</pre>`,
    size: "large",
    customClass: "video-json-modal",
    onClose: () => {
      // Any specific cleanup for this modal
    },
  });

  // Add custom close button handler if needed
  const closeBtn = modal.querySelector(".close-modal");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }
}

function copyToClipboard(text, buttonElement) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // Show success feedback
      const originalText = buttonElement.textContent;
      buttonElement.textContent = "Copied!";
      buttonElement.classList.add("copied");

      // Revert after 2 seconds
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.classList.remove("copied");
      }, 2000);

      console.log("Copied to clipboard:", text);
    })
    .catch((err) => {
      // Show error feedback
      const originalText = buttonElement.textContent;
      buttonElement.textContent = "Error";
      buttonElement.classList.add("copy-error");

      // Revert after 2 seconds
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.classList.remove("copy-error");
      }, 2000);

      console.error("Failed to copy:", err);
    });
}

async function sendChatMessage(content) {
  // Check if user is logged in
  if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
    showTemporaryNotification("❌ Please log in to send messages");
    return;
  }

  const sendButton = document.getElementById("send-button");
  const messageInput = document.getElementById("message-input");

  try {
    // Disable button to prevent double-sending
    sendButton.disabled = true;
    sendButton.textContent = "Sending...";

    const chatRoomId =
      "39c44dcdd67271483f1c5217bcfd214c8c34980fa55f0f6b834a3e253e296c15";

    const relayHint =
      app.chatRelays && app.chatRelays.length > 0 ? app.chatRelays[0] : "";

    // Create the base message event (WITHOUT pubkey for extension method)
    const messageEvent = {
      kind: 42,
      created_at: Math.floor(Date.now() / 1000),
      content: content,
      tags: [],
    };

    // Check if this is a reply
    if (replyState.isReplying && replyState.replyToEvent) {
      messageEvent.tags = [
        ["e", chatRoomId, relayHint, "root"],
        ["e", replyState.replyToEvent.id, relayHint, "reply"],
        ["p", replyState.replyToEvent.pubkey, relayHint],
      ];
    } else {
      messageEvent.tags = [["e", chatRoomId, relayHint, "root"]];
    }

    let eventToSign;

    // Handle PoW mining based on login method
    if (app.loginMethod === 'guest') {
      // For guest: we can mine directly because we have the secret key
      console.log(`Mining PoW ${POW_DIFFICULTY} for message (guest)...`);
      
      // Add pubkey for guest mining
      messageEvent.pubkey = window.NostrTools.getPublicKey(app.guestSk);
      
      // Mine PoW
      const minedEvent = window.NostrTools.nip13.minePow(
        messageEvent,
        POW_DIFFICULTY
      );
      console.log(`PoW mined: ${window.NostrTools.nip13.getPow(minedEvent.id)}`);
      
      eventToSign = minedEvent;
      
    } else if (app.loginMethod === 'extension') {
      // For extension: we need to mine with the pubkey from extension
      console.log(`Mining PoW ${POW_DIFFICULTY} for message (extension)...`);
      
      // Add pubkey for extension mining
      messageEvent.pubkey = app.myPk;
      
      // Mine PoW
      const minedEvent = window.NostrTools.nip13.minePow(
        messageEvent,
        POW_DIFFICULTY
      );
      console.log(`PoW mined: ${window.NostrTools.nip13.getPow(minedEvent.id)}`);
      
      eventToSign = minedEvent;
      
    } else {
      throw new Error('No login method available');
    }

    // Sign the mined event (this will work correctly for both methods now)
    const signedMessageEvent = await handleEventSigning(eventToSign);

    console.log("Message event signed successfully:", signedMessageEvent);

    // Publish to chat relays
    if (app.chatRelays && app.chatRelays.length > 0) {
      try {
        const result = await publishEvent(signedMessageEvent, app.chatRelays, {
          successMessage: "Message published successfully",
          errorMessage: "Failed to publish message",
        });

        if (result.success) {
          showTemporaryNotification("✓ Message sent!");
          clearReplyState();
          sendButton.disabled = false;
          sendButton.textContent = "Send";
        } else {
          throw new Error(result.error);
        }
      } catch (publishError) {
        console.error("Error publishing message event:", publishError);
        showTemporaryNotification("❌ Failed to send message");
        sendButton.disabled = false;
        sendButton.textContent = "Send";
      }
    } else {
      console.warn("No chat relays configured, message not published");
      showTemporaryNotification("❌ No relays configured");
      sendButton.disabled = false;
      sendButton.textContent = "Send";
    }
  } catch (error) {
    console.error("Error creating message event:", error);
    showTemporaryNotification("❌ Failed to send message: " + error.message);
    sendButton.disabled = false;
    sendButton.textContent = "Send";
  }
}

function setReplyState(event) {
  replyState.isReplying = true;
  replyState.replyToEvent = event;

  const replyIndicator = document.getElementById("reply-indicator");
  const replyText = document.getElementById("reply-text");
  const messageInput = document.getElementById("message-input");

  if (replyIndicator && replyText) {
    // Get author display name
    const authorDisplay = event.pubkey.slice(0, 8) + "...";
    const contentPreview =
      event.content.length > 50
        ? event.content.slice(0, 50) + "..."
        : event.content;

    replyText.textContent = `Replying to ${authorDisplay}: "${contentPreview}"`;
    replyIndicator.classList.remove("hidden");

    // Focus the input
    if (messageInput) {
      messageInput.focus();
    }
  }
}

function clearReplyState() {
  replyState.isReplying = false;
  replyState.replyToEvent = null;

  const replyIndicator = document.getElementById("reply-indicator");
  if (replyIndicator) {
    replyIndicator.classList.add("hidden");
  }
}



///////////////////////////
// Check if event meets PoW requirements
function eventMeetsPowRequirement(event) {
  const eventPow = getEventPow(event);
  return eventPow >= POW_DIFFICULTY;
}

// Refilter all displayed messages by current PoW setting
function refilterMessagesByPow() {
  const messagesContainer = document.getElementById("messages-container");
  if (!messagesContainer) return;

  const messages = Array.from(messagesContainer.children);
  let hiddenCount = 0;

  messages.forEach((messageElement) => {
    const eventId = messageElement.dataset.eventId;
    const event = eventManager.allEvents.get(eventId);
    
    if (event) {
      const meetsPow = eventMeetsPowRequirement(event);
      if (meetsPow) {
        messageElement.style.display = '';
      } else {
        messageElement.style.display = 'none';
        hiddenCount++;
      }
    }
  });

  const powInfo = document.getElementById('pow-info');
  if (powInfo) {
    powInfo.textContent = hiddenCount > 0 ? `(${hiddenCount} messages hidden)` : '';
  }
}