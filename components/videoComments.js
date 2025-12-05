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
    // Changed comparison: newer timestamps (higher values) come first
    if (eventTimestamp > existingTimestamp) {
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

async function renderComments(videoId, videoEvent) {
  if (app.commentSubscription) {
    app.commentSubscription.close();
    app.commentSubscription = null;
  }

  let commentsContainer = mainContent.querySelector('.comments-container');
  if (!commentsContainer) {
    console.error("Comments container not found");
    return;
  }

  commentsContainer.innerHTML = `
    <div class="comments-content">
      <div class="loading-indicator">
        <p>Loading comments...</p>
      </div>
      <div class="comments-list"></div>
    </div>
  `;

  const commentsList = commentsContainer.querySelector('.comments-list');

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
          if (existingEvents.has(event.id)) return;
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
          
          // Update comment count
          const countSpan = document.getElementById('comment-count');
          if (countSpan) {
            countSpan.textContent = initialLoadCount;
          }

          if (initialLoadCount === 0) {
            commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
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

// New function to open comment modal
function openCommentModal(videoId, videoEvent, replyToEvent = null) {
  const isReply = !!replyToEvent;
  const modalTitle = isReply ? "Reply to Comment" : "Add a Comment";
  
  let replyIndicatorHTML = '';
  if (isReply) {
    const authorDisplay = replyToEvent.pubkey.slice(0, 8) + "...";
    const contentPreview = replyToEvent.content.length > 50
      ? replyToEvent.content.slice(0, 50) + "..."
      : replyToEvent.content;
    
    replyIndicatorHTML = `
      <div class="modal-reply-indicator">
        <span class="reply-icon">↳</span>
        <span class="reply-text">Replying to ${authorDisplay}: "${contentPreview}"</span>
      </div>
    `;
  }

  const content = `
    <div class="comment-modal-content">
      ${replyIndicatorHTML}
      <textarea id="modal-comment-input" placeholder="${isReply ? 'Write your reply...' : 'Share your thoughts...'}" rows="4"></textarea>
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-comment-cancel">Cancel</button>
        <button class="btn-primary" id="modal-comment-send">Send</button>
      </div>
    </div>
  `;

  const modal = openModal({
    title: modalTitle,
    content,
    size: 'medium',
    customClass: 'comment-modal'
  });

  const textarea = modal.querySelector('#modal-comment-input');
  const sendBtn = modal.querySelector('#modal-comment-send');
  const cancelBtn = modal.querySelector('#modal-comment-cancel');

  // Auto-resize textarea
  textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
  });

  // Focus textarea
  setTimeout(() => textarea.focus(), 100);

  // Send button
  sendBtn.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) {
      showTemporaryNotification("❌ Please enter a comment");
      return;
    }

    await sendCommentFromModal(videoId, videoEvent, content, replyToEvent);
    closeModal();
  });

  // Cancel button
  cancelBtn.addEventListener('click', closeModal);

  // Enter to send (Ctrl+Enter or Cmd+Enter on mobile)
  textarea.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const content = textarea.value.trim();
      if (content) {
        await sendCommentFromModal(videoId, videoEvent, content, replyToEvent);
        closeModal();
      }
    }
  });
}

async function sendCommentFromModal(videoId, videoEvent, content, replyToEvent = null) {
  if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
    showTemporaryNotification("❌ Please log in to comment");
    return;
  }

  try {
    const relayHint = app.relays && app.relays.length > 0 ? app.relays[0] : "";
    const videoPubkey = videoEvent.pubkey;

    const commentEvent = {
      kind: 1111,
      created_at: Math.floor(Date.now() / 1000),
      content: content,
      tags: [],
    };

    if (replyToEvent) {
      commentEvent.tags = [
        ["E", videoId, relayHint, videoPubkey],
        ["K", "21"],
        ["P", videoPubkey, relayHint],
        ["e", replyToEvent.id, relayHint, replyToEvent.pubkey],
        ["k", "1111"],
        ["p", replyToEvent.pubkey, relayHint],
      ];
    } else {
      commentEvent.tags = [
        ["E", videoId, relayHint, videoPubkey],
        ["K", "21"],
        ["P", videoPubkey, relayHint],
        ["e", videoId, relayHint, videoPubkey],
        ["k", "21"],
        ["p", videoPubkey, relayHint],
      ];
    }

    const signedCommentEvent = await handleEventSigning(commentEvent);

    if (app.relays && app.relays.length > 0) {
      const result = await publishEvent(signedCommentEvent, app.relays, {
        successMessage: "Comment published successfully",
        errorMessage: "Failed to publish comment",
      });

      if (result.success) {
        showTemporaryNotification("✓ Comment sent!");
        
        // Update comment count
        const countSpan = document.getElementById('comment-count');
        if (countSpan) {
          const currentCount = parseInt(countSpan.textContent) || 0;
          countSpan.textContent = currentCount + 1;
        }
      } else {
        throw new Error(result.error);
      }
    }
  } catch (error) {
    console.error("Error creating comment:", error);
    showTemporaryNotification("❌ Failed to send comment: " + error.message);
  }
}


function renderInitialComment(event, container) {
  const commentElement = createCommentElement(event);
  commentEventManager.insertCommentInChronologicalOrder(commentElement, event);
}

function appendNewComment(event, container) {
  const commentElement = createCommentElement(event);
  // Changed from appendChild to prepend to add at the top
  container.prepend(commentElement);
  
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

  const likeSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="like-icon">
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



  scrollContainer.appendChild(replyButton);
  scrollContainer.appendChild(likeButton);
  scrollContainer.appendChild(zapButton);
  scrollContainer.appendChild(showJsonButton);

  actionsDiv.appendChild(scrollContainer);
  footerDiv.appendChild(actionsDiv);

/*   setTimeout(() => {
    enableDragScroll(scrollContainer);
    enableWheelScroll(scrollContainer);
  }, 100); */

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
  
  // Get video ID from the comment's tags (E tag contains the root video event ID)
  const videoIdTag = event.tags.find(t => t[0] === 'E');
  const videoId = videoIdTag ? videoIdTag[1] : null;
  
  if (!videoId) {
    showTemporaryNotification("❌ Unable to determine video ID");
    return;
  }
  
  // Get video pubkey from the comment's tags (P tag contains the video author)
  const videoPubkeyTag = event.tags.find(t => t[0] === 'P');
  const videoPubkey = videoPubkeyTag ? videoPubkeyTag[1] : '';
  
  // Create a minimal video event object
  const videoEvent = { 
    pubkey: videoPubkey,
    id: videoId
  };
  
  openCommentModal(videoId, videoEvent, event);
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
    
    // Optimistic update (existing code)
    const currentCount = parseInt(likeCountSpan.textContent) || 0;
    const newCount = currentCount + 1;
    likeButton.innerHTML = `${likeSvg} <span class="like-count" data-like-count="${event.id}">${newCount > 0 ? newCount : ""}</span>`;
    commentReactions.updateReactionData(event.id, newCount, true);
    
    showTemporaryNotification("👍 Like published successfully!");
    
    // ✨ NEW: Recheck actual like count after a brief delay
    setTimeout(async () => {
      const reactions = await commentReactions.fetchReactionsForComment(event.id);
      const actualData = commentReactions.processReactions(event.id, reactions);
      
      // Update UI with actual count from relays
      const updatedCountSpan = document.querySelector(`[data-like-count="${event.id}"]`);
      if (updatedCountSpan) {
        updatedCountSpan.textContent = actualData.likeCount > 0 ? actualData.likeCount : "";
      }
    }, 2000); // Wait 2 seconds for relays to propagate
    
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
/*   container.innerHTML = `
    <div class="comments-content">
      <div class="error-message">Failed to load comments. Please try again later.</div>
    </div>
  `; */
   showError(`Error rendering follows feed page:  ${formatErrorForDisplay(error)}`);
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

function collapseCommentInput() {
  const chatInputContainer = document.querySelector(".chat-input-container");
  const commentInput = document.getElementById("comment-input");
  
  if (chatInputContainer) {
    chatInputContainer.classList.add('collapsed');
  }
  
  // Clear input and reset state
  if (commentInput) {
    commentInput.value = '';
    commentInput.style.height = 'auto';
  }
  
  // Clear reply state when collapsing
  clearCommentReplyState();
}

