async function renderComments(videoId) {
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
