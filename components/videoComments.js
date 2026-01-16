const commentState = {
  currentSubscription: null,
  reactionsSubscription: null,
  currentVideoId: null,
  allComments: new Map(), // eventId -> event
  reactionCache: new Map(), // eventId -> {likeCount, userLiked}
};

function cleanupCommentSubscription() {
  if (commentState.currentSubscription) {
    commentState.currentSubscription.close();
    commentState.currentSubscription = null;
  }
  if (commentState.reactionsSubscription) {
    commentState.reactionsSubscription.close();
    commentState.reactionsSubscription = null;
  }
  commentState.allComments.clear();
  commentState.reactionCache.clear();
}

async function renderComments(videoId, videoEvent) {
  // Clean up any previous subscription
  cleanupCommentSubscription();
  commentState.currentVideoId = videoId;

  const commentsContainer = mainContent.querySelector('.comments-container');
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

    let initialLoadComplete = false;
    const commentIds = new Set();

    // Single subscription for comments
    commentState.currentSubscription = app.commentPool.subscribe(
      app.relays,
      {
        kinds: [1111],
        "#E": [videoId],
      },
      {
        onevent(event) {
          // Store the comment
          if (!commentState.allComments.has(event.id)) {
            commentState.allComments.set(event.id, event);
            commentIds.add(event.id);

            if (initialLoadComplete) {
              // Live update: render new comment immediately
              renderCommentUpdate(event, commentsList, videoId);
              // Fetch reactions for this new comment
              fetchReactionsForSingleComment(event.id);
            }
          }
        },

        oneose() {
          if (!initialLoadComplete) {
            initialLoadComplete = true;
            hideCommentsLoadingIndicator();

            // Fetch all reactions in one subscription
            if (commentIds.size > 0) {
              fetchReactionsForAllComments(Array.from(commentIds));
            }

            renderAllComments(commentsList, videoId);
            console.log(`Initial comments loaded (${commentIds.size} comments), subscription staying open for live updates...`);
          }
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

function fetchReactionsForAllComments(eventIds) {
  if (!app.commentPool || !app.relays || eventIds.length === 0) return;

  // Close previous reactions subscription if exists
  if (commentState.reactionsSubscription) {
    commentState.reactionsSubscription.close();
  }

  const reactionsByEvent = new Map();

  commentState.reactionsSubscription = app.commentPool.subscribe(
    app.relays,
    {
      kinds: [7],
      "#e": eventIds,
    },
    {
      onevent(reaction) {
        const eventId = reaction.tags.find(t => t[0] === 'e')?.[1];
        if (!eventId) return;

        if (!reactionsByEvent.has(eventId)) {
          reactionsByEvent.set(eventId, []);
        }
        reactionsByEvent.get(eventId).push(reaction);
        
        // Live update: process and update UI immediately for new reactions
        const allReactionsForEvent = reactionsByEvent.get(eventId);
        const likes = allReactionsForEvent.filter(r => r.content === "+");
        const likeCount = likes.length;
        const userLiked = app.myPk ? likes.some(r => r.pubkey === app.myPk) : false;
        
        commentState.reactionCache.set(eventId, { likeCount, userLiked });
        updateReactionUI(eventId, likeCount, userLiked);
      },

      oneose() {
        // Process all reactions at the end of initial load
        reactionsByEvent.forEach((reactions, eventId) => {
          const likes = reactions.filter(r => r.content === "+");
          const likeCount = likes.length;
          const userLiked = app.myPk ? likes.some(r => r.pubkey === app.myPk) : false;

          commentState.reactionCache.set(eventId, { likeCount, userLiked });
          updateReactionUI(eventId, likeCount, userLiked);
        });

        console.log(`Loaded reactions for ${reactionsByEvent.size} comments`);
        
        // Keep subscription open for live reaction updates
      },
    }
  );
}


async function fetchReactionsForSingleComment(eventId) {
  if (!app.commentPool || !app.relays) return;

  return new Promise((resolve) => {
    const reactions = [];
    const timeout = setTimeout(() => {
      sub.close();
      processAndUpdateReaction(eventId, reactions);
      resolve();
    }, 1500);

    const sub = app.commentPool.subscribe(
      app.relays,
      { kinds: [7], "#e": [eventId] },
      {
        onevent(event) {
          reactions.push(event);
        },
        oneose() {
          clearTimeout(timeout);
          sub.close();
          processAndUpdateReaction(eventId, reactions);
          resolve();
        },
      }
    );
  });
}


function processAndUpdateReaction(eventId, reactions) {
  const likes = reactions.filter(r => r.content === "+");
  const likeCount = likes.length;
  const userLiked = app.myPk ? likes.some(r => r.pubkey === app.myPk) : false;

  commentState.reactionCache.set(eventId, { likeCount, userLiked });
  updateReactionUI(eventId, likeCount, userLiked);
}

function updateReactionUI(eventId, likeCount, userLiked) {
  const likeButton = document.querySelector(`[data-like-btn="${eventId}"]`);
  const likeCountSpan = document.querySelector(`[data-like-count="${eventId}"]`);

  if (likeCountSpan) {
    likeCountSpan.textContent = likeCount > 0 ? likeCount : '';
  }

  if (likeButton && userLiked) {
    likeButton.classList.add("liked");
    likeButton.disabled = true;
  }
}








function renderAllComments(commentsList, videoId) {
  const comments = Array.from(commentState.allComments.values());

  // Organize into threads
  const { threads, rootComments } = organizeCommentsIntoThreads(comments);

  // Update count
  const countSpan = document.getElementById('comment-count');
  if (countSpan) {
    countSpan.textContent = rootComments.length;
  }

  if (rootComments.length === 0) {
    commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
    return;
  }

  // Clear and render
  commentsList.innerHTML = '';

  // Sort root comments (newest first)
  rootComments.sort((a, b) => b.created_at - a.created_at);

  rootComments.forEach(rootComment => {
    const replies = threads.get(rootComment.id)?.replies || [];
    const threadElement = createThreadElement(rootComment, replies, videoId);
    commentsList.appendChild(threadElement);
  });
}


function renderCommentUpdate(event, commentsList, videoId) {
  const repliedToId = getCommentRepliedToEventId(event);

  // Remove "no comments" message if it exists
  const noCommentsDiv = commentsList.querySelector('.no-comments');
  if (noCommentsDiv) {
    noCommentsDiv.remove();
  }

  if (!repliedToId) {
    // New root comment - add at top
    const threadElement = createThreadElement(event, [], videoId);
    commentsList.prepend(threadElement);

    // Update count
    const countSpan = document.getElementById('comment-count');
    if (countSpan) {
      const currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount + 1;
    }

    // Highlight briefly
    threadElement.classList.add("fetched-message");
    setTimeout(() => threadElement.classList.remove("fetched-message"), 2000);
  } else {
    // Reply to existing comment
    addReplyToThread(event, repliedToId, commentsList);
  }
}


function addReplyToThread(replyEvent, parentId, commentsList) {
  const parentThread = commentsList.querySelector(`[data-thread-id="${parentId}"]`);

  if (!parentThread) {
    console.warn(`Parent comment ${parentId} not found, reply might be orphaned`);
    return;
  }

  let repliesContainer = parentThread.querySelector(`[data-parent-id="${parentId}"]`);
  let expandButton = parentThread.querySelector('.expand-replies-button');

  if (!repliesContainer) {
    // Create replies structure
    expandButton = document.createElement("button");
    expandButton.className = "expand-replies-button";

    repliesContainer = document.createElement("div");
    repliesContainer.className = "replies-container";
    repliesContainer.dataset.parentId = parentId;

    parentThread.appendChild(expandButton);
    parentThread.appendChild(repliesContainer);
  }

  // Add the reply
  const replyElement = createCommentElement(replyEvent, true);
  repliesContainer.appendChild(replyElement);

  // Highlight
  replyElement.classList.add("fetched-message");
  setTimeout(() => replyElement.classList.remove("fetched-message"), 2000);

  // Update button
  const replyCount = repliesContainer.children.length;
  updateExpandButton(expandButton, repliesContainer, replyCount);

  // Auto-expand to show new reply
  if (repliesContainer.classList.contains('collapsed')) {
    repliesContainer.classList.remove('collapsed');
    updateExpandButton(expandButton, repliesContainer, replyCount);
  }
}


function updateExpandButton(button, container, count) {
  const isCollapsed = container.classList.contains('collapsed');

  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="expand-icon ${isCollapsed ? '' : 'rotate'}">
      <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
    <span class="expand-text">${isCollapsed ? 'Show' : 'Hide'} ${count} ${count === 1 ? 'reply' : 'replies'}</span>
  `;

  // Set up click handler only once
  if (!button.hasAttribute('data-handler-set')) {
    button.addEventListener("click", () => {
      container.classList.toggle('collapsed');
      updateExpandButton(button, container, count);
    });
    button.setAttribute('data-handler-set', 'true');
  }
}

function createThreadElement(rootComment, replies, videoId) {
  const threadDiv = document.createElement("div");
  threadDiv.className = "comment-thread";
  threadDiv.dataset.threadId = rootComment.id;

  const rootCommentElement = createCommentElement(rootComment, false);
  threadDiv.appendChild(rootCommentElement);

  if (replies.length > 0) {
    replies.sort((a, b) => a.created_at - b.created_at);

    const repliesContainer = document.createElement("div");
    repliesContainer.className = "replies-container collapsed";
    repliesContainer.dataset.parentId = rootComment.id;

    const expandButton = document.createElement("button");
    expandButton.className = "expand-replies-button";

    replies.forEach(reply => {
      const replyElement = createCommentElement(reply, true);
      repliesContainer.appendChild(replyElement);
    });

    threadDiv.appendChild(expandButton);
    threadDiv.appendChild(repliesContainer);

    updateExpandButton(expandButton, repliesContainer, replies.length);
  }

  return threadDiv;
}


function organizeCommentsIntoThreads(comments) {
  const threads = new Map();
  const rootComments = [];

  comments.forEach(comment => {
    const repliedToId = getCommentRepliedToEventId(comment);

    if (!repliedToId) {
      rootComments.push(comment);
      if (!threads.has(comment.id)) {
        threads.set(comment.id, { comment, replies: [] });
      }
    } else {
      if (!threads.has(repliedToId)) {
        threads.set(repliedToId, { comment: null, replies: [] });
      }
      threads.get(repliedToId).replies.push(comment);
    }
  });

  return { threads, rootComments };
}


function getCommentRepliedToEventId(event) {
  const eTags = event.tags.filter((tag) => tag[0] === "e");
  const ETags = event.tags.filter((tag) => tag[0] === "E");
  const kTags = event.tags.filter((tag) => tag[0] === "k");

  if (eTags.length === 0) {
    return null;
  }

  const rootId = ETags.length > 0 ? ETags[0][1] : null;
  const parentKind = kTags.length > 0 ? kTags[0][1] : null;

  // If parent kind is 1111, this is a reply to a comment
  // But we only support one level, so we need to find the ROOT comment
  if (parentKind === "1111") {
    // Find the parent comment event ID (lowercase 'e' that's not the video ID)
    const parentCommentTag = eTags.find((tag) => tag[1] !== rootId);
    if (parentCommentTag) {
      const parentCommentId = parentCommentTag[1];

      // Check if the parent is itself a reply (nested reply scenario)
      const parentComment = commentState.allComments.get(parentCommentId);
      if (parentComment) {
        const parentIsReply = getCommentRepliedToEventId(parentComment);
        if (parentIsReply) {
          // Parent is a reply, so return the root comment it's replying to
          return parentIsReply;
        }
      }

      // Parent is a root comment, return it
      return parentCommentId;
    }
  }

  return null;
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
      tags: [
        // Root scope (always the video)
        ["E", videoId, relayHint, videoPubkey],
        ["K", "21"],
        ["P", videoPubkey, relayHint],
      ],
    };

    if (replyToEvent) {
      // Find the root comment to reply to
      const replyToId = getCommentRepliedToEventId(replyToEvent);
      let rootCommentId;
      let rootCommentPubkey;

      if (replyToId) {
        // replyToEvent is itself a reply, so we need to reply to its root
        rootCommentId = replyToId;
        const rootComment = commentState.allComments.get(rootCommentId);
        rootCommentPubkey = rootComment ? rootComment.pubkey : replyToEvent.pubkey;
      } else {
        // replyToEvent is a root comment
        rootCommentId = replyToEvent.id;
        rootCommentPubkey = replyToEvent.pubkey;
      }

      // Add mention to the person we're directly replying to if it's not already in content
      const mentionUri = `@nostr:${window.NostrTools.nip19.npubEncode(replyToEvent.pubkey)}`;
      if (!content.startsWith(mentionUri) && !content.startsWith('nostr:')) {
        commentEvent.content = `${mentionUri} ${content}`;
      }

      // Reply to the root comment
      commentEvent.tags.push(
        ["e", rootCommentId, relayHint, rootCommentPubkey],
        ["k", "1111"],
        ["p", rootCommentPubkey, relayHint]
      );

      // Also tag the person we're mentioning (if different from root)
      if (replyToEvent.pubkey !== rootCommentPubkey) {
        commentEvent.tags.push(["p", replyToEvent.pubkey, relayHint]);
      }

    } else {
      // Root comment - parent is also the video
      commentEvent.tags.push(
        ["e", videoId, relayHint, videoPubkey],
        ["k", "21"],
        ["p", videoPubkey, relayHint]
      );
    }

    const signedCommentEvent = await handleEventSigning(commentEvent);

    if (app.relays && app.relays.length > 0) {
      const result = await publishEvent(signedCommentEvent, app.globalRelays, {
        successMessage: "Comment published successfully",
        errorMessage: "Failed to publish comment",
      });

      if (result.success) {
        showTemporaryNotification("✓ Comment sent!");
        // Don't manually add to UI - it will come through the subscription
      } else {
        throw new Error(result.error);
      }
    }
  } catch (error) {
    console.error("Error creating comment:", error);
    showTemporaryNotification("❌ Failed to send comment: " + error.message);
  }
}


function createCommentElement(event, isReply = false) {
  const commentDiv = document.createElement("div");
  commentDiv.className = isReply ? "message comment-card reply-comment" : "message comment-card";
  commentDiv.dataset.timestamp = event.created_at;
  commentDiv.dataset.eventId = event.id;

  const headerDiv = document.createElement("div");
  headerDiv.className = "message-header";

  const authorElement = createAuthorElement(event.pubkey);
  const timestampSpan = document.createElement("span");
  timestampSpan.className = "message-timestamp";
  timestampSpan.textContent = formatTimestamp(event.created_at);

  headerDiv.appendChild(authorElement);
  headerDiv.appendChild(timestampSpan);

  const contentDiv = createCompactContent(event.content);
  const footerDiv = createCommentFooter(event);

  commentDiv.appendChild(headerDiv);
  commentDiv.appendChild(contentDiv);
  commentDiv.appendChild(footerDiv);

  return commentDiv;
}


function createCommentFooter(event) {
  const footerDiv = document.createElement("div");
  footerDiv.className = "message-footer";

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "video-action-tabs";

  const scrollContainer = document.createElement("div");
  scrollContainer.className = "tab-scroll-container";

  // Reply button
  const replyButton = document.createElement("button");
  replyButton.className = "video-action-tab-button";
  replyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  `;
  replyButton.addEventListener("click", () => handleCommentReply(event));

  // Like button
  const likeButton = document.createElement("button");
  likeButton.className = "video-action-tab-button";
  likeButton.dataset.likeBtn = event.id; // Add this for easy selection
  likeButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="like-icon">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
    <span class="like-count" data-like-count="${event.id}"></span>
  `;

  const likeCountSpan = likeButton.querySelector(".like-count");
  loadReactionsForComment(event.id, likeButton, likeCountSpan);
  likeButton.addEventListener("click", () => handleCommentLike(event, likeButton, likeCountSpan));

  // Zap button
  const zapButton = document.createElement("button");
  zapButton.className = "video-action-tab-button";
  zapButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  `;
  zapButton.addEventListener("click", () => handleZap(event));

  // Info button
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

  return footerDiv;
}


function loadReactionsForComment(eventId, likeButton, likeCountSpan) {
  // Check cache
  if (commentState.reactionCache.has(eventId)) {
    const { likeCount, userLiked } = commentState.reactionCache.get(eventId);
    if (likeCount > 0) likeCountSpan.textContent = likeCount;
    if (userLiked) {
      likeButton.classList.add("liked");
      likeButton.disabled = true;
    }
  }
  // Don't fetch here - reactions are fetched in bulk after initial load
}



async function handleCommentLike(event, likeButton, likeCountSpan) {
  if (!app.isLoggedIn || (!app.myPk && !app.guestSk)) {
    showTemporaryNotification("❌ Please log in to like comments");
    return;
  }

  const cached = commentState.reactionCache.get(event.id);
  if (cached?.userLiked) {
    showTemporaryNotification("You already liked this comment");
    return;
  }

  try {
    likeButton.disabled = true;
    
    const relayHint = app.relays?.[0] || "";
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
    const result = await publishEvent(signedReactionEvent, app.globalRelays);

    if (result.success) {
      // Optimistic update
      const currentCount = parseInt(likeCountSpan.textContent) || 0;
      const newCount = currentCount + 1;
      likeCountSpan.textContent = newCount;
      likeButton.classList.add("liked");
      
      commentState.reactionCache.set(event.id, { likeCount: newCount, userLiked: true });
      showTemporaryNotification("👍 Liked!");
      
      // The reaction will also come through the live subscription and update again
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Error liking comment:", error);
    showTemporaryNotification("❌ Failed to like comment");
    likeButton.disabled = false;
  }
}


function handleCommentReply(event) {
  const videoIdTag = event.tags.find(t => t[0] === 'E');
  const videoId = videoIdTag?.[1];

  if (!videoId) {
    showTemporaryNotification("❌ Unable to determine video ID");
    return;
  }

  const videoPubkeyTag = event.tags.find(t => t[0] === 'P');
  const videoPubkey = videoPubkeyTag?.[1] || '';

  const videoEvent = { pubkey: videoPubkey, id: videoId };
  openCommentModal(videoId, videoEvent, event);
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














function openCommentModal(videoId, videoEvent, replyToEvent = null) {
  const isReply = !!replyToEvent;
  const modalTitle = isReply ? "Reply to Comment" : "Add a Comment";

  let replyIndicatorHTML = '';
  if (isReply) {
    // Try to get profile name, fallback to npub
    let authorDisplay;
    try {
      const npub = window.NostrTools.nip19.npubEncode(replyToEvent.pubkey);
      authorDisplay = npub.slice(0, 12) + "...";
    } catch {
      authorDisplay = replyToEvent.pubkey.slice(0, 8) + "...";
    }

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
  textarea.addEventListener('input', function () {
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

  // Enter to send (Ctrl+Enter or Cmd+Enter)
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