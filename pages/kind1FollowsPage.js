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
        <p>the list of pubkeys you followed on <a href="https://spatianostra.com/clients/">kind:1 clients</a></p>

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
        <button id="followAllBtn" class="action-follow-btn">👥 Follow All</button>
      </div>
      <div class="profiles-listview"></div>
    `;
    
    const profilesContainer = pageContainer.querySelector('.profiles-listview');
    
    // Add Follow All button handler
    setupFollowAllButton(followedPubkeys, profilesContainer);
    
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

function setupFollowAllButton(pubkeys, profilesContainer) {
  const followAllBtn = document.getElementById('followAllBtn');
  if (!followAllBtn) return;
  
  // Check if all pubkeys are already followed
  const updateFollowAllButtonState = () => {
    const allFollowed = pubkeys.every(pubkey => isProfileFollowed(pubkey));
    followAllBtn.textContent = allFollowed ? "✓ All Followed" : "👥 Follow All";
    followAllBtn.classList.toggle("following", allFollowed);
  };
  
  // Initial state check
  updateFollowAllButtonState();
  
  followAllBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    let newFollowCount = 0;
    
    // Follow all pubkeys that aren't already followed
    pubkeys.forEach(pubkey => {
      if (!isProfileFollowed(pubkey)) {
        const success = addFollowedPubkey(pubkey);
        if (success) {
          newFollowCount++;
          
          // Update the individual button if the card exists
          const card = profilesContainer.querySelector(`[data-pubkey="${pubkey}"]`);
          if (card && !card.classList.contains('skeleton')) {
            const followBtn = card.querySelector('.action-follow-btn');
            if (followBtn) {
              followBtn.textContent = "👥 Following";
              followBtn.classList.add("following");
            }
          }
        }
      }
    });
    
    // Update the Follow All button state
    updateFollowAllButtonState();
    
    // Show notification
    if (newFollowCount > 0) {
      showTemporaryNotification(`Followed ${newFollowCount} profile${newFollowCount !== 1 ? 's' : ''} (local)`);
    } else {
      showTemporaryNotification("All profiles already followed");
    }
  });
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
    rootMargin: '100px'
  });
  
  const skeletonCards = container.querySelectorAll('.skeleton');
  skeletonCards.forEach(card => observer.observe(card));
}

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
  
  const profileDetails = card.querySelector('.profile-details');
  profileDetails.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = `#profile/${npub}`;
  });
  
  profileDetails.style.cursor = 'pointer';
  
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
    e.stopPropagation();
    
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
      followBtn.textContent = currentlyFollowed ? "👥 Follow" : "👥 Following";
      followBtn.classList.toggle("following", !currentlyFollowed);
      showTemporaryNotification(
        currentlyFollowed ? "Unfollowed (local)" : "Followed (local)"
      );
      
      // Update Follow All button state
      const followAllBtn = document.getElementById('followAllBtn');
      if (followAllBtn) {
        const container = cardElement.closest('.profiles-listview');
        if (container) {
          const allCards = container.querySelectorAll('.profile-item:not(.skeleton)');
          const allFollowed = Array.from(allCards).every(card => {
            const pk = card.dataset.pubkey;
            return isProfileFollowed(pk);
          });
          followAllBtn.textContent = allFollowed ? "✓ All Followed" : "👥 Follow All";
          followAllBtn.classList.toggle("following", allFollowed);
        }
      }
    }
  });

  actionsContainer.appendChild(followBtn);
}