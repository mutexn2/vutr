async function kind1FollowsPageHandler() {
  mainContent.innerHTML = `
  <div id="kind1followsPage-container">
    <h1>Following</h1>
    <div class="loading-indicator">
      <p>Loading kind-3 event...</p>
    </div>
    </div>
  `;
  
  let pageContainer = document.getElementById("kind1followsPage-container");
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const kindThreeEvents = await NostrClient.getEvents({
      kinds: [3],
      authors: [app.myPk],
    });
    
    if (!kindThreeEvents || kindThreeEvents.length === 0) {
      pageContainer.innerHTML = `
        <h1>No Followed Pubkeys</h1>
        <p>the list of pubkeys you followed on kind-1 clients</p>
      `;
      return;
    }
    
    const latestEvent = kindThreeEvents.reduce((latest, current) => 
      current.created_at > latest.created_at ? current : latest
    );
    
    const followedPubkeys = latestEvent.tags
      .filter(tag => tag[0] === 'p' && tag[1])
      .map(tag => tag[1]);
    
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    pageContainer.innerHTML = `
      <div class="following-header">
        <h2>Following from kind-1 (${followedPubkeys.length})</h2>
      </div>
      <div class="profiles-listview"></div>
    `;
    
    const profilesContainer = pageContainer.querySelector('.profiles-listview');
    
    // Create all skeleton cards first
    followedPubkeys.forEach(pubkey => {
      const skeletonCard = createSkeletonProfileCard(pubkey);
      profilesContainer.appendChild(skeletonCard);
    });
    
    // Set up lazy loading
    setupLazyLoading(profilesContainer, followedPubkeys);
    
  } catch (error) {
    console.error("Error rendering following page:", error);
    let errorDiv = document.createElement("div");
    errorDiv.innerHTML = `
      <h1>Error</h1>
      <div class="loading-indicator">
        <p>Error loading followed pubkeys</p>
      </div>
    `;
    pageContainer.replaceChildren(errorDiv);
  }
}

function setupLazyLoading(container, pubkeys) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const skeletonCard = entry.target;
        const pubkey = skeletonCard.dataset.pubkey;
        
        // Replace skeleton with real card
        const realCard = createClickableFollowedPubkeyCard(pubkey);
        container.replaceChild(realCard, skeletonCard);
        
        // Stop observing this element
        observer.unobserve(skeletonCard);
      }
    });
  }, {
    rootMargin: '100px' // Start loading 100px before the element becomes visible
  });
  
  // Observe all skeleton cards
  const skeletonCards = container.querySelectorAll('.skeleton');
  skeletonCards.forEach(card => observer.observe(card));
}

// Your existing functions remain the same
function createSkeletonProfileCard(pubkey) {
  const card = document.createElement('div');
  card.className = 'profile-item skeleton';
  card.dataset.pubkey = pubkey;
  
  card.innerHTML = `
    <div class="profile-details">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-name"></div>
    </div>
  `;
  
  return card;
}

function createClickableFollowedPubkeyCard(pubkey) {
  const card = document.createElement('div');
  card.className = 'profile-item';
  card.dataset.pubkey = pubkey;
  
  const npub = window.NostrTools.nip19.npubEncode(pubkey);
  
  card.innerHTML = `
    <div class="profile-details">
      <nostr-picture pubkey="${npub}"></nostr-picture>
      <nostr-name pubkey="${npub}"></nostr-name>
    </div>
    <div class="profile-actions">
      <!-- Follow button will be added here -->
    </div>
  `;
  
  // Add click handler for the profile details (not the entire card)
  const profileDetails = card.querySelector('.profile-details');
  profileDetails.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = `#profile/${npub}`;
  });
  
  profileDetails.style.cursor = 'pointer';
  
  // Add follow/unfollow button
  createFollowButton(card, pubkey);
  
  return card;
}

function createFollowButton(cardElement, pubkey) {
  const actionsContainer = cardElement.querySelector(".profile-actions");
  if (!actionsContainer) return;

  const followBtn = document.createElement("button");
  const isFollowed = isProfileFollowed(pubkey);
  followBtn.className = isFollowed ? "action-follow-btn following" : "action-follow-btn";
  followBtn.textContent = isFollowed ? "👥 Following" : "👥 Follow";
  
  followBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent triggering the profile navigation
    
    const currentlyFollowed = isProfileFollowed(pubkey);
    let success;
    
    if (currentlyFollowed) {
      success = removeFollowedPubkey(pubkey);
      if (success) {
        // Also remove from favorites when unfollowing
        removeFavoriteChannel(pubkey);
        updateDrawerContent(); // Update any UI that shows favorites
      }
    } else {
      success = addFollowedPubkey(pubkey);
    }

    if (success) {
      followBtn.textContent = currentlyFollowed ? "👥 Follow" : "👥 Following";
      followBtn.classList.toggle("following", !currentlyFollowed);
      showTemporaryNotification(
        currentlyFollowed ? "Unfollowed (local)" : "Followed (local)"
      );
    }
  });

  actionsContainer.appendChild(followBtn);
}