async function localFollowsPageHandler() {
  mainContent.innerHTML = `
    <h1>Following</h1>
    <div class="loading-indicator">
        <p>Loading followed channels...</p>
    </div>
  `;

  try {
    const followedPubkeys = getFollowedPubkeys();

    if (followedPubkeys.length === 0) {
      mainContent.innerHTML = `
        <h1>No Followed Channels</h1>
        <p>You haven't followed any channels yet. Visit profile pages and click the follow button to start following channels!</p>
      `;
      return;
    }

    console.log("Loaded followed pubkeys:", followedPubkeys);

    // Delay the rendering of the main content
    await new Promise((resolve) => setTimeout(resolve, 500));

    mainContent.innerHTML = `
  <div class="following-header">
    <h2>Following (local) (${followedPubkeys.length})</h2>
    <div class="following-actions">
      <button class="follows-feed-btn">📺 View Feed</button>
      ${
        app.isLoggedIn
          ? `
        <button class="sync-following-btn">🔄 Sync with Nostr</button>
        <button class="share-following-btn">📤 Share Following List</button>
      `
          : ""
      }
    </div>
  </div>
  <div class="profiles-listview"></div>
`;

    const profilesList = document.querySelector(".profiles-listview");

    // Create profile cards from followed pubkeys
    followedPubkeys.forEach((pubkey) => {
      const card = createFollowedPubkeyCard(pubkey);
      profilesList.appendChild(card);
    });

    // Handle profile card clicks
    profilesList.addEventListener("click", (event) => {
      const card = event.target.closest(".profile-card");
      if (card && card.dataset.pubkey) {
        window.location.hash = `#profile/${card.dataset.pubkey}`;
      }
    });

    // Handle following action buttons
    if (app.isLoggedIn) {
      const syncBtn = document.querySelector(".sync-following-btn");
      const shareBtn = document.querySelector(".share-following-btn");

      syncBtn?.addEventListener("click", syncFollowingWithNostr);
      shareBtn?.addEventListener("click", shareFollowingList);
    }

    // Handle follows feed button
    const followsFeedBtn = document.querySelector(".follows-feed-btn");
    followsFeedBtn?.addEventListener("click", () => {
      window.location.hash = "#followsfeed";
    });
  } catch (error) {
    console.error("Error rendering following page:", error);
    let errorDiv = document.createElement("div");
    errorDiv.innerHTML = `
      <h1>Error</h1>
      <div class="loading-indicator">
        <p>Error loading followed channels: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
    mainContent.replaceChildren(errorDiv);
  }
}


function createFollowedPubkeyCard(pubkey) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.dataset.pubkey = pubkey;
  
  const npub = window.NostrTools.nip19.npubEncode(pubkey);
  const isFavorite = isFavoriteChannel(pubkey);
  
  card.innerHTML = `
    <div class="profile-details">
      <nostr-picture pubkey="${npub}"></nostr-picture>
      <nostr-name pubkey="${npub}"></nostr-name>
    </div>
    <div class="profile-actions">
      <button class="favorite-toggle-btn ${isFavorite ? 'favorited' : ''}" 
              data-pubkey="${escapeHtml(pubkey)}" 
              title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
        ${isFavorite ? '★' : '☆'}
      </button>
      <button class="unfollow-btn" data-pubkey="${escapeHtml(pubkey)}">Unfollow</button>
    </div>
  `;

  // Handle favorite toggle button
  const favoriteBtn = card.querySelector('.favorite-toggle-btn');
  favoriteBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const pubkey = e.target.dataset.pubkey;
    const isCurrentlyFavorite = isFavoriteChannel(pubkey);
    
    if (isCurrentlyFavorite) {
      const success = removeFavoriteChannel(pubkey);
      if (success) {
        e.target.textContent = '☆';
        e.target.classList.remove('favorited');
        e.target.title = 'Add to favorites';
        showTemporaryNotification('Removed from favorites');
        updateDrawerContent();
      }
    } else {
      const success = addFavoriteChannel(pubkey);
      if (success) {
        e.target.textContent = '★';
        e.target.classList.add('favorited');
        e.target.title = 'Remove from favorites';
        showTemporaryNotification('Added to favorites');
        updateDrawerContent();
      }
    }
  });

  // Handle unfollow button (existing code)
  const unfollowBtn = card.querySelector('.unfollow-btn');
  unfollowBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const pubkey = e.target.dataset.pubkey;
    
    if (confirm('Are you sure you want to unfollow this channel?')) {
      const success = removeFollowedPubkey(pubkey);
      if (success) {
        // Also remove from favorites if unfollowed
        removeFavoriteChannel(pubkey);
        
        card.remove();
        showTemporaryNotification('Channel unfollowed');
        
        // Update header count
        const header = document.querySelector('.following-header h2');
        const newCount = document.querySelectorAll('.profile-card').length;
        if (header) {
          header.textContent = `Following (${newCount})`;
        }
        
        updateDrawerContent();
        
        // Show empty state if no more profiles
        if (newCount === 0) {
          mainContent.innerHTML = `
            <h1>No Followed Channels</h1>
            <p>You haven't followed any channels yet. Visit profile pages and click the follow button to start following channels!</p>
          `;
        }
      }
    }
  });
  
  return card;
}
// Sync following list with Nostr network (placeholder - implement based on your Nostr integration)
async function syncFollowingWithNostr() {
  if (!app.isLoggedIn || !app.myPk) {
    alert("Please log in to sync following list");
    return;
  }

  try {
    // Here you would create a proper kind 30000 event with your private key
    // const event = await window.NostrTools.finalizeEvent(app.followSet, app.myPrivateKey);
    // await NostrClient.publishEvent(event);

    showTemporaryNotification("Following list sync is not yet implemented");
  } catch (error) {
    console.error("Error syncing following list:", error);
    showTemporaryNotification("Error syncing following list");
  }
}

// Share following list (placeholder - implement based on your needs)
async function shareFollowingList() {
  if (!app.isLoggedIn || !app.myNpub) {
    alert("Please log in to share following list");
    return;
  }

  try {
    const followedPubkeys = getFollowedPubkeys();
    const shareText = `My followed channels (${
      followedPubkeys.length
    } channels):\n${followedPubkeys
      .map((pk) => window.NostrTools.nip19.npubEncode(pk))
      .join("\n")}`;

    showTemporaryNotification("Following list sharing is not yet implemented");
  } catch (error) {
    console.error("Error sharing following list:", error);
    showTemporaryNotification("Error creating shareable link");
  }
}

////////////////////////////////////
///////////////////////////////////
// helpers
//////////////////////////////////
// Get all followed pubkeys
function getFollowedPubkeys() {
  return app.followSet.tags
    .filter((tag) => tag[0] === "p")
    .map((tag) => tag[1]);
}

// Save follow set to localStorage
function saveFollowSet() {
  localStorage.setItem("followSet", JSON.stringify(app.followSet));
}

// Add a pubkey to follows
function addFollowedPubkey(pubkey) {
  const existingIndex = app.followSet.tags.findIndex(
    (tag) => tag[0] === "p" && tag[1] === pubkey
  );

  if (existingIndex === -1) {
    app.followSet.tags.push(["p", pubkey]);
    saveFollowSet();
    return true;
  }
  return false;
}

// Remove a pubkey from follows
function removeFollowedPubkey(pubkey) {
  const initialLength = app.followSet.tags.length;
  app.followSet.tags = app.followSet.tags.filter(
    (tag) => !(tag[0] === "p" && tag[1] === pubkey)
  );

  if (app.followSet.tags.length < initialLength) {
    saveFollowSet();
    return true;
  }
  return false;
}

// Check if pubkey is followed
/* function isProfileFollowed(pubkey) {
  return app.followSet.tags.some((tag) => tag[0] === "p" && tag[1] === pubkey);
}
 */

function isProfileFollowed(pubkey) {
  return app.followSet?.tags?.some((tag) => tag[0] === "p" && tag[1] === pubkey) || false;
}


// Helper functions for favorite channels
function getFavoriteChannelPubkeys() {
  return app.favoriteChannels.tags
    .filter(tag => tag[0] === 'p')
    .map(tag => tag[1]);
}

function saveFavoriteChannels() {
  localStorage.setItem('favoriteChannels', JSON.stringify(app.favoriteChannels));
}

function addFavoriteChannel(pubkey) {
  // Check if already in favorites
  const existingIndex = app.favoriteChannels.tags.findIndex(
    tag => tag[0] === 'p' && tag[1] === pubkey
  );
  
  if (existingIndex === -1) {
    // Only add if user is in follow list
    if (isProfileFollowed(pubkey)) {
      app.favoriteChannels.tags.push(['p', pubkey]);
      saveFavoriteChannels();
      return true;
    }
  }
  return false;
}

function removeFavoriteChannel(pubkey) {
  const initialLength = app.favoriteChannels.tags.length;
  app.favoriteChannels.tags = app.favoriteChannels.tags.filter(
    tag => !(tag[0] === 'p' && tag[1] === pubkey)
  );
  
  if (app.favoriteChannels.tags.length < initialLength) {
    saveFavoriteChannels();
    return true;
  }
  return false;
}

function isFavoriteChannel(pubkey) {
  return app.favoriteChannels.tags.some(
    tag => tag[0] === 'p' && tag[1] === pubkey
  );
}