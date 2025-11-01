// Comment state management (similar to chat)
const commentReplyState = {
  isReplying: false,
  replyToEvent: null,
};

// Reaction tracking for comments
const commentReactions = {
  reactions: new Map(),

  async fetchReactionsForComment(eventId) {
    if (!app.commentPool || !app.relays) return [];

    return new Promise((resolve) => {
      const reactions = [];
      let queryComplete = false;

      const timeout = setTimeout(() => {
        if (!queryComplete) {
          sub.close();
          resolve(reactions);
        }
      }, 2000);

      const sub = app.commentPool.subscribe(
        app.relays,
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
    const likes = reactions.filter((r) => r.content === "+");
    const likeCount = likes.length;

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

// Event manager for comments
const commentEventManager = {
  allEvents: new Map(),
  missingEvents: new Set(),
  pendingQueries: new Map(),

  processEvent(event) {
    this.allEvents.set(event.id, event);
    return { shouldDisplay: true };
  },

  getReferencedEvent(eventId) {
    return this.allEvents.get(eventId);
  },

  insertCommentInChronologicalOrder(commentElement, event) {
    const commentsList = document.querySelector('.comments-list');
    if (!commentsList) return;

    const existingComment = commentsList.querySelector(
      `[data-event-id="${event.id}"]`
    );
    if (existingComment) {
      return existingComment;
    }

    const eventTimestamp = event.created_at;
    const existingComments = Array.from(commentsList.children);

    let insertIndex = 0;
    for (let i = 0; i < existingComments.length; i++) {
      const existingTimestamp = parseInt(
        existingComments[i].dataset.timestamp
      );
      if (eventTimestamp < existingTimestamp) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    if (insertIndex >= existingComments.length) {
      commentsList.appendChild(commentElement);
    } else {
      commentsList.insertBefore(commentElement, existingComments[insertIndex]);
    }

    return commentElement;
  },

  renderFetchedEventInComments(event) {
    const commentsList = document.querySelector('.comments-list');
    if (!commentsList) return;

    const existingComment = commentsList.querySelector(
      `[data-event-id="${event.id}"]`
    );
    if (existingComment) {
      return existingComment;
    }

    const commentElement = createCommentElement(event);
    const insertedElement = this.insertCommentInChronologicalOrder(
      commentElement,
      event
    );

    insertedElement.classList.add("fetched-message");
    setTimeout(() => {
      insertedElement.classList.remove("fetched-message");
    }, 2000);

    return insertedElement;
  },

  async fetchMissingEvent(eventId, videoEventId) {
    if (this.missingEvents.has(eventId)) {
      return null;
    }

    if (this.pendingQueries.has(eventId)) {
      return this.pendingQueries.get(eventId);
    }

    const queryPromise = this.queryEvent(eventId, videoEventId);
    this.pendingQueries.set(eventId, queryPromise);

    try {
      const event = await queryPromise;
      this.pendingQueries.delete(eventId);

      if (event) {
        this.processEvent(event);
        this.renderFetchedEventInComments(event);
        return event;
      } else {
        this.missingEvents.add(eventId);
        return null;
      }
    } catch (error) {
      this.pendingQueries.delete(eventId);
      this.missingEvents.add(eventId);
      console.warn(`Failed to fetch comment ${eventId}:`, error);
      return null;
    }
  },

  async queryEvent(eventId, videoEventId) {
    return new Promise((resolve) => {
      if (!app.commentPool) {
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

      const sub = app.commentPool.subscribe(
        app.relays,
        {
          ids: [eventId],
          kinds: [1111],
          "#E": [videoEventId],
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

async function renderComments(videoId) {
  // Clean up any existing comment subscription
  if (app.commentSubscription) {
    app.commentSubscription.close();
    app.commentSubscription = null;
  }

  let commentsContainer = mainContent.querySelector('.comments-container');
  
  if (!commentsContainer) {
    console.error("Comments container not found");
    return;
  }

  // Create the structure similar to chat
  commentsContainer.innerHTML = `
    <div class="comments-content">

      <h3 class="comments-header">Comments</h3>
      <div class="comments-list"></div>
      <div class="chat-input-container">
        <div id="comment-reply-indicator" class="reply-indicator hidden">
          <span id="comment-reply-text">Replying to...</span>
          <button id="comment-cancel-reply-btn">✕</button>
        </div>
      <div class="loading-indicator">
        <p>Loading comments...</p>
      </div>        
        <div class="chat-input-wrapper">
          <textarea id="comment-input" placeholder="Add a comment..." rows="1"></textarea>
          <button id="comment-send-button">Send</button>
        </div>
      </div>
    </div>
  `;

  const commentsList = commentsContainer.querySelector('.comments-list');
  const commentInput = document.getElementById('comment-input');
  const sendButton = document.getElementById('comment-send-button');
  const cancelReplyBtn = document.getElementById('comment-cancel-reply-btn');

  // Auto-resize textarea
  commentInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  // Send functionality
  sendButton.addEventListener('click', async () => {
    if (commentInput.value.trim()) {
      await sendComment(videoId, commentInput.value.trim());
      commentInput.value = '';
      commentInput.style.height = 'auto';
    }
  });

  // Enter key to send
  commentInput.addEventListener('keydown', async (e) => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    if (e.key === 'Enter') {
      if (isMobile || e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        if (commentInput.value.trim()) {
          await sendComment(videoId, commentInput.value.trim());
          commentInput.value = '';
          commentInput.style.height = 'auto';
        }
      }
    }
  });

  cancelReplyBtn?.addEventListener('click', () => {
    clearCommentReplyState();
  });

  try {
    if (!app.commentPool) {
      app.commentPool = new window.NostrTools.SimplePool();
    }

    const existingEvents = new Set();
    let isInitialLoad = true;
    let initialLoadCount = 0;

    app.commentSubscription = app.commentPool.subscribe(
      app.relays,
      {
        kinds: [1111],
        "#E": [videoId],
        "#K": ["21"],
        limit: 50,
      },
      {
        onevent(event) {
          console.log("got comment:", event);

          if (existingEvents.has(event.id)) {
            return;
          }
          existingEvents.add(event.id);

          commentEventManager.processEvent(event);

          if (isInitialLoad) {
            initialLoadCount++;
            setTimeout(() => renderInitialComment(event, commentsList), 0);
          } else {
            appendNewComment(event, commentsList);
          }
        },

        oneose() {
          console.log("End of stored comments, got", initialLoadCount, "comments");
          isInitialLoad = false;
          hideCommentsLoadingIndicator();
          
          const header = commentsContainer.querySelector('.comments-header');
          if (header) {
            header.textContent = initialLoadCount > 0 ? 
              `Comments (${initialLoadCount})` : 
              "No comments yet";
          }

          setTimeout(() => {
            autoFetchMissingCommentReferences(videoId);
          }, 500);
        },

        onclose() {
          console.log("Comment subscription closed");
        },
      }
    );
  } catch (error) {
    console.error("Error loading comments:", error);
    showCommentsError(commentsContainer);
  }
}

function renderInitialComment(event, container) {
  const commentElement = createCommentElement(event);
  commentEventManager.insertCommentInChronologicalOrder(commentElement, event);
}

function appendNewComment(event, container) {
  const commentElement = createCommentElement(event);
  container.appendChild(commentElement);
  
  // Update comment count
  const header = document.querySelector('.comments-header');
  if (header) {
    const currentCount = container.children.length;
    header.textContent = `Comments (${currentCount})`;
  }
}

function createCommentElement(event) {
  const commentDiv = document.createElement("div");
  commentDiv.className = "message comment-card";
  commentDiv.dataset.timestamp = event.created_at;
  commentDiv.dataset.eventId = event.id;

  // Check if this is a reply to another comment
  const repliedToId = getCommentRepliedToEventId(event);
  if (repliedToId) {
    const referenceHeader = createCommentReferenceHeader(repliedToId);
    commentDiv.appendChild(referenceHeader);
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

  // Create footer with actions
  const footerDiv = createCommentFooter(event);

  // Assemble comment
  commentDiv.appendChild(headerDiv);
  commentDiv.appendChild(contentDiv);
  commentDiv.appendChild(footerDiv);

  return commentDiv;
}

function getCommentRepliedToEventId(event) {
  const eTags = event.tags.filter((tag) => tag[0] === "e");

  if (eTags.length === 0) {
    return null;
  }

  // Look for lowercase "e" tag (parent comment)
  const replyTag = eTags.find((tag) => tag[0] === "e");
  
  // Make sure it's not the root video event (which would be uppercase "E")
  // The parent comment reference should be different from the root
  const ETags = event.tags.filter((tag) => tag[0] === "E");
  const rootId = ETags.length > 0 ? ETags[0][1] : null;
  
  if (replyTag && replyTag[1] !== rootId) {
    return replyTag[1];
  }

  return null;
}

function createCommentReferenceHeader(repliedToId) {
  const referenceDiv = document.createElement("div");
  referenceDiv.className = "message-reference";
  referenceDiv.dataset.referencedId = repliedToId;
  referenceDiv._currentHandler = null;

  const referencedEvent = commentEventManager.getReferencedEvent(repliedToId);

  if (referencedEvent) {
    renderCommentReferenceContent(referenceDiv, referencedEvent, repliedToId);
  } else {
    renderCommentReferenceClickToLoad(referenceDiv, repliedToId);
  }

  return referenceDiv;
}

function renderCommentReferenceClickToLoad(referenceDiv, repliedToId) {
  referenceDiv.innerHTML = `
    <div class="reference-content reference-click-to-load">
      <span class="reference-icon">↳</span>
      <span class="reference-text">Replying to ${repliedToId.slice(0, 8)}... <span class="reference-action">(click to load)</span></span>
    </div>
  `;

  if (referenceDiv._currentHandler) {
    referenceDiv.removeEventListener("click", referenceDiv._currentHandler);
  }

  referenceDiv.style.cursor = "pointer";
  referenceDiv.classList.add("reference-clickable");

  referenceDiv._currentHandler = async () => {
    renderCommentReferenceLoading(referenceDiv, repliedToId);
    
    // Get the video ID from the page
    const videoId = getCurrentVideoId();
    const fetchedEvent = await commentEventManager.fetchMissingEvent(repliedToId, videoId);

    if (fetchedEvent) {
      updateAllCommentReferencesToEvent(repliedToId, fetchedEvent);
    } else {
      renderCommentReferenceNotFound(referenceDiv, repliedToId);
    }
  };

  referenceDiv.addEventListener("click", referenceDiv._currentHandler);
}

async function autoFetchMissingCommentReferences(videoId) {
  const commentsList = document.querySelector('.comments-list');
  if (!commentsList) return;

  const clickToLoadRefs = commentsList.querySelectorAll(".reference-click-to-load");

  if (clickToLoadRefs.length === 0) {
    return;
  }

  console.log(`Auto-fetching ${clickToLoadRefs.length} missing comment references...`);

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

  const fetchPromises = Array.from(missingIds).map(async (eventId) => {
    const referenceDiv = commentsList.querySelector(`[data-referenced-id="${eventId}"]`);
    if (referenceDiv) {
      renderCommentReferenceLoading(referenceDiv, eventId);
    }

    const fetchedEvent = await commentEventManager.fetchMissingEvent(eventId, videoId);

    if (fetchedEvent) {
      updateAllCommentReferencesToEvent(eventId, fetchedEvent);
    } else {
      const allRefs = commentsList.querySelectorAll(`[data-referenced-id="${eventId}"]`);
      allRefs.forEach((ref) => renderCommentReferenceNotFound(ref, eventId));
    }
  });

  await Promise.all(fetchPromises);
  console.log("Finished auto-fetching missing comment references");
}

function renderCommentReferenceContent(referenceDiv, referencedEvent, repliedToId) {
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

  if (referenceDiv._currentHandler) {
    referenceDiv.removeEventListener("click", referenceDiv._currentHandler);
  }

  referenceDiv.style.cursor = "pointer";
  referenceDiv.classList.add("reference-clickable");

  referenceDiv._currentHandler = () => {
    const targetElement = document.querySelector(`[data-event-id="${repliedToId}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      targetElement.classList.add("highlighted");
      setTimeout(() => targetElement.classList.remove("highlighted"), 2000);
    }
  };

  referenceDiv.addEventListener("click", referenceDiv._currentHandler);
}

function renderCommentReferenceLoading(referenceDiv, repliedToId) {
  referenceDiv.innerHTML = `
    <div class="reference-content reference-loading">
      <span class="reference-icon">↳</span>
      <span class="reference-text">Loading referenced comment...</span>
      <span class="reference-spinner">⟳</span>
    </div>
  `;

  referenceDiv.classList.remove("reference-clickable");
  referenceDiv.style.cursor = "wait";
}

function renderCommentReferenceNotFound(referenceDiv, repliedToId) {
  referenceDiv.innerHTML = `
    <div class="reference-content reference-not-found">
      <span class="reference-icon">↳</span>
      <span class="reference-text">Replying to ${repliedToId} (comment not found)</span>
      <button class="copy-ref-id-btn" title="Copy referenced ID">⎘ copy id</button>
    </div>
  `;

  const copyBtn = referenceDiv.querySelector(".copy-ref-id-btn");
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    copyToClipboard(repliedToId, copyBtn);
  });

  referenceDiv.classList.remove("reference-clickable");
  referenceDiv.style.cursor = "default";
}

function updateAllCommentReferencesToEvent(eventId, event) {
  const references = document.querySelectorAll(`[data-referenced-id="${eventId}"]`);
  references.forEach((referenceDiv) => {
    renderCommentReferenceContent(referenceDiv, event, eventId);
  });
}

function createCommentFooter(event) {
  const footerDiv = document.createElement("div");
  footerDiv.className = "message-footer";
  footerDiv.dataset.eventId = event.id;

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "video-action-tabs";

  const scrollContainer = document.createElement("div");
  scrollContainer.className = "tab-scroll-container";

  const replyButton = document.createElement("button");
  replyButton.className = "video-action-tab-button";
  replyButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
</svg>
  `;
  replyButton.addEventListener("click", () => handleCommentReply(event));

  const likeSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="like-icon">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>`;

  const likeButton = document.createElement("button");
  likeButton.className = "video-action-tab-button";
  likeButton.dataset.likeBtn = event.id;
  likeButton.innerHTML = `${likeSvg} <span class="like-count" data-like-count="${event.id}"></span>`;

  const likeCountSpan = likeButton.querySelector(".like-count");

  loadReactionsForComment(event.id, likeButton, likeCountSpan);

  likeButton.addEventListener("click", () =>
    handleCommentLikeWithUI(event, likeButton, likeCountSpan)
  );

  const showJsonButton = document.createElement("button");
  showJsonButton.className = "video-action-tab-button";
  showJsonButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
</svg>
  `;
  showJsonButton.addEventListener("click", () => showRawData(event));

  const copyIdButton = document.createElement("button");
  copyIdButton.className = "video-action-tab-button";
  copyIdButton.innerHTML = `Copy ID`;
  copyIdButton.addEventListener("click", () =>
    copyToClipboard(event.id, copyIdButton)
  );

  scrollContainer.appendChild(replyButton);
  scrollContainer.appendChild(likeButton);
  scrollContainer.appendChild(showJsonButton);
  scrollContainer.appendChild(copyIdButton);

  actionsDiv.appendChild(scrollContainer);
  footerDiv.appendChild(actionsDiv);

  setTimeout(() => {
    enableDragScroll(scrollContainer);
    enableWheelScroll(scrollContainer);
  }, 100);

  return footerDiv;
}

async function loadReactionsForComment(eventId, likeButton, likeCountSpan) {
  try {
    let reactionData = commentReactions.getReactionData(eventId);

    if (reactionData.likeCount === 0 && !commentReactions.reactions.has(eventId)) {
      const reactions = await commentReactions.fetchReactionsForComment(eventId);
      reactionData = commentReactions.processReactions(eventId, reactions);
    }

    if (reactionData.likeCount > 0) {
      likeCountSpan.textContent = reactionData.likeCount;
    } else {
      likeCountSpan.textContent = "";
    }

    if (reactionData.userLiked) {
      likeButton.classList.add("liked");
      likeButton.disabled = true;
    }
  } catch (error) {
    console.error("Error loading comment reactions:", error);
  }
}

function handleCommentReply(event) {
  console.log("Reply to comment:", event.id);
  setCommentReplyState(event);

  const chatInputContainer = document.querySelector(".chat-input-container");
  if (chatInputContainer) {
    chatInputContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const commentInput = document.getElementById('comment-input');
  if (commentInput) {
    commentInput.focus();
  }
}

async function handleCommentLikeWithUI(event, likeButton, likeCountSpan) {
  console.log("Like comment:", event.id);

  if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
    showTemporaryNotification("❌ Please log in to like comments");
    return;
  }

  const reactionData = commentReactions.getReactionData(event.id);
  if (reactionData.userLiked) {
    showTemporaryNotification("You already liked this comment");
    return;
  }

  try {
    likeButton.disabled = true;
    const likeSvg = likeButton.querySelector(".like-icon").outerHTML;
    likeButton.innerHTML = `${likeSvg} Liking... <span class="like-count" data-like-count="${event.id}"></span>`;

    const relayHint = app.relays && app.relays.length > 0 ? app.relays[0] : "";

    const reactionEvent = {
      kind: 7,
      created_at: Math.floor(Date.now() / 1000),
      content: "+",
      tags: [
        ["e", event.id, relayHint],
        ["p", event.pubkey, relayHint],
        ["k", "1111"],
      ],
    };

    const signedReactionEvent = await handleEventSigning(reactionEvent);

    if (app.relays && app.relays.length > 0) {
      try {
        const result = await publishEvent(signedReactionEvent, app.relays, {
          successMessage: "Like published successfully",
          errorMessage: "Failed to publish like",
        });

        if (result.success) {
          likeButton.classList.add("liked");
          likeButton.disabled = true;

          const currentCount = parseInt(likeCountSpan.textContent) || 0;
          const newCount = currentCount + 1;

          likeButton.innerHTML = `${likeSvg} <span class="like-count" data-like-count="${event.id}">${newCount > 0 ? newCount : ""}</span>`;

          commentReactions.updateReactionData(event.id, newCount, true);

          showTemporaryNotification("👍 Like published successfully!");
        } else {
          throw new Error(result.error);
        }
      } catch (publishError) {
        console.error("Error publishing reaction:", publishError);
        showTemporaryNotification("❌ Failed to publish like");
        likeButton.disabled = false;
        likeButton.innerHTML = `${likeSvg} <span class="like-count" data-like-count="${event.id}">${likeCountSpan.textContent}</span>`;
      }
    }
  } catch (error) {
    console.error("Error creating reaction:", error);
    showTemporaryNotification("❌ Failed to like comment: " + error.message);
    likeButton.disabled = false;
  }
}

function hideCommentsLoadingIndicator() {
  const indicator = document.querySelector('.comments-content .loading-indicator');
  if (indicator) indicator.style.display = 'none';
}

function showCommentsError(container) {
  container.innerHTML = `
    <div class="comments-content">
      <div class="error-message">Failed to load comments. Please try again later.</div>
    </div>
  `;
}

async function sendComment(videoId, content) {
  if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
    showTemporaryNotification("❌ Please log in to comment");
    return;
  }

  const sendButton = document.getElementById("comment-send-button");
  const commentInput = document.getElementById("comment-input");

  try {
    sendButton.disabled = true;
    sendButton.textContent = "Sending...";

    const relayHint = app.relays && app.relays.length > 0 ? app.relays[0] : "";

    // Get video event to get author pubkey
    const videoEvent = await getVideoEvent(videoId);
    const videoPubkey = videoEvent ? videoEvent.pubkey : "";

    const commentEvent = {
      kind: 1111,
      created_at: Math.floor(Date.now() / 1000),
      content: content,
      tags: [],
    };

    if (commentReplyState.isReplying && commentReplyState.replyToEvent) {
      // Reply to a comment
      commentEvent.tags = [
        ["E", videoId, relayHint, videoPubkey],["K", "21"],
        ["P", videoPubkey, relayHint],
        ["e", commentReplyState.replyToEvent.id, relayHint, commentReplyState.replyToEvent.pubkey],
        ["k", "1111"],
        ["p", commentReplyState.replyToEvent.pubkey, relayHint],
      ];
    } else {
      // Top-level comment
      commentEvent.tags = [
        ["E", videoId, relayHint, videoPubkey],
        ["K", "21"],
        ["P", videoPubkey, relayHint],
        ["e", videoId, relayHint, videoPubkey],
        ["k", "21"],
        ["p", videoPubkey, relayHint],
      ];
    }

    console.log("Creating comment event:", commentEvent);

    const signedCommentEvent = await handleEventSigning(commentEvent);

    console.log("Comment event signed successfully:", signedCommentEvent);

    if (app.relays && app.relays.length > 0) {
      try {
        const result = await publishEvent(signedCommentEvent, app.relays, {
          successMessage: "Comment published successfully",
          errorMessage: "Failed to publish comment",
        });

        if (result.success) {
          showTemporaryNotification("✓ Comment sent!");

          clearCommentReplyState();

          sendButton.disabled = false;
          sendButton.textContent = "Send";
        } else {
          throw new Error(result.error);
        }
      } catch (publishError) {
        console.error("Error publishing comment:", publishError);
        showTemporaryNotification("❌ Failed to send comment");

        sendButton.disabled = false;
        sendButton.textContent = "Send";
      }
    } else {
      console.warn("No relays configured, comment not published");
      showTemporaryNotification("❌ No relays configured");
      sendButton.disabled = false;
      sendButton.textContent = "Send";
    }
  } catch (error) {
    console.error("Error creating comment:", error);
    showTemporaryNotification("❌ Failed to send comment: " + error.message);

    sendButton.disabled = false;
    sendButton.textContent = "Send";
  }
}

function setCommentReplyState(event) {
  commentReplyState.isReplying = true;
  commentReplyState.replyToEvent = event;

  const replyIndicator = document.getElementById("comment-reply-indicator");
  const replyText = document.getElementById("comment-reply-text");
  const commentInput = document.getElementById("comment-input");

  if (replyIndicator && replyText) {
    const authorDisplay = event.pubkey.slice(0, 8) + "...";
    const contentPreview =
      event.content.length > 50
        ? event.content.slice(0, 50) + "..."
        : event.content;

    replyText.textContent = `Replying to ${authorDisplay}: "${contentPreview}"`;
    replyIndicator.classList.remove("hidden");

    if (commentInput) {
      commentInput.focus();
    }
  }
}

function clearCommentReplyState() {
  commentReplyState.isReplying = false;
  commentReplyState.replyToEvent = null;

  const replyIndicator = document.getElementById("comment-reply-indicator");
  if (replyIndicator) {
    replyIndicator.classList.add("hidden");
  }
}

// Helper function to get current video ID from the page
function getCurrentVideoId() {
  // You may need to adjust this based on how you store the current video ID
  // This is a common pattern - extract from hash or from a data attribute
  const hash = window.location.hash;
  const match = hash.match(/#video\/([^\/]+)/);
  return match ? match[1] : null;
}

// Helper function to get video event (you may already have this)
async function getVideoEvent(videoId) {
  if (!app.commentPool) {
    app.commentPool = new window.NostrTools.SimplePool();
  }

  return new Promise((resolve) => {
    let eventFound = false;
    const timeout = setTimeout(() => {
      if (!eventFound) {
        sub.close();
        resolve(null);
      }
    }, 3000);

    const sub = app.commentPool.subscribe(
      app.relays,
      {
        ids: [videoId],
        kinds: [21],
      },
      {
        onevent(event) {
          if (event.id === videoId) {
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
      }
    );
  });
}










/* async function renderComments(videoId) {
  // Target the comments container that's already in the DOM
  let commentsContainer = mainContent.querySelector('.comments-container');
  
  if (!commentsContainer) {
    console.error("Comments container not found");
    return;
  }

  // Show loading state
  showCommentsLoading(commentsContainer);

  try {
    const comments = await NostrClient.getComments(videoId);
    const sanitizedComments = comments.map(sanitizeNostrEvent).filter(v => v !== null);
    
    renderCommentsContent(commentsContainer, sanitizedComments);
    
  } catch (error) {
    console.error("Error loading comments:", error);
    showCommentsError(commentsContainer);
  }
}

// Helper functions for different comment states
function showCommentsLoading(container) {
  container.innerHTML = `
    <div class="comments-content">
      <div class="loading-message">Loading comments...</div>
    </div>
  `;
}

function showCommentsError(container) {
  container.innerHTML = `
    <div class="comments-content">
      <div class="error-message">Failed to load comments. Please try again later.</div>
    </div>
  `;
}

function renderCommentsContent(container, sanitizedComments) {
  // Create static skeleton
  container.innerHTML = `
    <div class="comments-content">
      <h3 class="comments-header"></h3>
      <div class="comments-list"></div>
    </div>
  `;

  // Get references
  const header = container.querySelector('.comments-header');
  const commentsList = container.querySelector('.comments-list');

  // Set header text
  header.textContent = sanitizedComments.length > 0 ? 
    `Comments (${sanitizedComments.length})` : 
    "No comments yet";

  // Early return if no comments
  if (sanitizedComments.length === 0) {
    return;
  }

  // Sort comments by date (newest first)
  sanitizedComments.sort((a, b) => b.created_at - a.created_at);

  // Render each comment
  sanitizedComments.forEach(comment => {
    try {
      renderSingleComment(commentsList, comment);
    } catch (error) {
      console.error("Error rendering comment:", error, comment);
    }
  });
}

function renderSingleComment(commentsList, comment) {
  // Create comment card with static structure
  const commentCard = document.createElement("div");
  commentCard.className = "comment-card";
  commentCard.dataset.noteId = comment.id;

  commentCard.innerHTML = `
    <div class="comment-header">
      <nostr-name pubkey="" class="comment-author"></nostr-name>
      <span class="comment-date"></span>
    </div>
    <div class="comment-content">
      <div class="comment-text"></div>
      <button class="see-more-btn" style="display: none;">See more</button>
    </div>
  `;
  
  // Get references and add dynamic content safely
  const authorName = commentCard.querySelector('.comment-author');
  const dateSpan = commentCard.querySelector('.comment-date');
  const contentDiv = commentCard.querySelector('.comment-text');
  const seeMoreBtn = commentCard.querySelector('.see-more-btn');
  
  const dateString = new Date(comment.created_at * 1000).toLocaleString();
  const commentNpub = window.NostrTools.nip19.npubEncode(comment.pubkey);
  
  authorName.setAttribute('pubkey', commentNpub);
  dateSpan.textContent = dateString;
  
  // Make the nostr-name clickable
  authorName.style.cursor = 'pointer';
  authorName.addEventListener('click', () => {
    // Navigate to profile page using hash routing
    window.location.hash = `#profile/${commentNpub}`;
  });
  
  // Rest of the existing code for content truncation...
  
  // Handle long content with truncation
  const maxLines = 3;
  const fullText = comment.content;
  const lines = fullText.split('\n');
  
  if (lines.length > maxLines) {
    const truncatedText = lines.slice(0, maxLines).join('\n');
    let isExpanded = false;
    
    // Initially show truncated text
    contentDiv.textContent = truncatedText + '...';
    seeMoreBtn.style.display = 'inline-block';
    seeMoreBtn.textContent = 'See more';
    
    // Add click handler for see more/less toggle
    seeMoreBtn.addEventListener('click', function() {
      if (!isExpanded) {
        contentDiv.textContent = fullText;
        seeMoreBtn.textContent = 'See less';
        isExpanded = true;
      } else {
        contentDiv.textContent = truncatedText + '...';
        seeMoreBtn.textContent = 'See more';
        isExpanded = false;
      }
    });
  } else {
    // Short content, show as is
    contentDiv.textContent = fullText;
  }
  
  // Append to comments list
  commentsList.appendChild(commentCard);
}
 */