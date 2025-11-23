async function localMutedPageHandler() {
  mainContent.innerHTML = `
    <h1>Muted</h1>
    <div class="loading-indicator">
        <p>Loading muted channels...</p>
    </div>
  `;

  try {
    const mutedPubkeys = getMutedPubkeys();

    if (mutedPubkeys.length === 0) {
      mainContent.innerHTML = `
        <h1>No Muted Channels</h1>
        <p>You haven't muted any channels yet. Use the mute option in video menus to hide content from specific users.</p>
      `;
      return;
    }

    console.log("Loaded muted pubkeys:", mutedPubkeys);

    // Delay the rendering of the main content
    await new Promise((resolve) => setTimeout(resolve, 500));

    mainContent.innerHTML = `
  <div class="muted-header">
    <h2>Muted (local) (${mutedPubkeys.length})</h2>
    <div class="muted-actions">
      ${
        app.isLoggedIn
          ? `
        <button class="sync-muted-btn">🔄 Sync with Nostr</button>
        <button class="share-muted-btn">📤 Share Muted List</button>
      `
          : ""
      }
    </div>
  </div>
  <div class="profiles-listview"></div>
`;

    const profilesList = document.querySelector(".profiles-listview");

    // Create profile cards from muted pubkeys
    mutedPubkeys.forEach((pubkey) => {
      const card = createMutedPubkeyCard(pubkey);
      profilesList.appendChild(card);
    });

    // Handle profile card clicks
    profilesList.addEventListener("click", (event) => {
      const card = event.target.closest(".profile-card");
      if (card && card.dataset.pubkey) {
        window.location.hash = `#profile/${card.dataset.pubkey}`;
      }
    });

    // Handle muted action buttons
    if (app.isLoggedIn) {
      const syncBtn = document.querySelector(".sync-muted-btn");
      const shareBtn = document.querySelector(".share-muted-btn");

      syncBtn?.addEventListener("click", syncMutedWithNostr);
      shareBtn?.addEventListener("click", shareMutedList);
    }
  } catch (error) {
    console.error("Error rendering muted page:", error);
    let errorDiv = document.createElement("div");
    errorDiv.innerHTML = `
      <h1>Error</h1>
      <div class="loading-indicator">
        <p>Error loading muted channels: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
    mainContent.replaceChildren(errorDiv);
  }
}

function createMutedPubkeyCard(pubkey) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.dataset.pubkey = pubkey;
  
  const npub = window.NostrTools.nip19.npubEncode(pubkey);
  
  card.innerHTML = `
    <div class="profile-details">
      <nostr-picture pubkey="${npub}"></nostr-picture>
      <nostr-name pubkey="${npub}"></nostr-name>
    </div>
    <div class="profile-actions">
      <button class="unmute-btn" data-pubkey="${escapeHtml(pubkey)}">Unmute</button>
    </div>
  `;

  // Handle unmute button
  const unmuteBtn = card.querySelector('.unmute-btn');
  unmuteBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const pubkey = e.target.dataset.pubkey;
    
    if (confirm('Are you sure you want to unmute this channel?')) {
      const success = removeMutedPubkey(pubkey);
      if (success) {
        card.remove();
        showTemporaryNotification('Channel unmuted');
        
        // Update header count
        const header = document.querySelector('.muted-header h2');
        const newCount = document.querySelectorAll('.profile-card').length;
        if (header) {
          header.textContent = `Muted (local) (${newCount})`;
        }
        
        // Show empty state if no more profiles
        if (newCount === 0) {
          mainContent.innerHTML = `
            <h1>No Muted Channels</h1>
            <p>You haven't muted any channels yet. Use the mute option in video menus to hide content from specific users.</p>
          `;
        }
      }
    }
  });
  
  return card;
}

// Sync muted list with Nostr network (placeholder)
async function syncMutedWithNostr() {
  if (!app.isLoggedIn || !app.myPk) {
    alert("Please log in to sync muted list");
    return;
  }

  try {
    showTemporaryNotification("Muted list sync is not yet implemented");
  } catch (error) {
    console.error("Error syncing muted list:", error);
    showTemporaryNotification("Error syncing muted list");
  }
}

// Share muted list (placeholder)
async function shareMutedList() {
  if (!app.isLoggedIn || !app.myNpub) {
    alert("Please log in to share muted list");
    return;
  }

  try {
    showTemporaryNotification("Muted list sharing is not yet implemented");
  } catch (error) {
    console.error("Error sharing muted list:", error);
    showTemporaryNotification("Error creating shareable link");
  }
}


/////////
// Get all muted pubkeys
function getMutedPubkeys() {
  return app.muteSet.tags
    .filter((tag) => tag[0] === "p")
    .map((tag) => tag[1]);
}

// Save mute set to localStorage
function saveMuteSet() {
  localStorage.setItem("muteSet", JSON.stringify(app.muteSet));
}

// Add a pubkey to mutes
function addMutedPubkey(pubkey) {
  const existingIndex = app.muteSet.tags.findIndex(
    (tag) => tag[0] === "p" && tag[1] === pubkey
  );

  if (existingIndex === -1) {
    app.muteSet.tags.push(["p", pubkey]);
    saveMuteSet();
    return true;
  }
  return false;
}

// Remove a pubkey from mutes
function removeMutedPubkey(pubkey) {
  const initialLength = app.muteSet.tags.length;
  app.muteSet.tags = app.muteSet.tags.filter(
    (tag) => !(tag[0] === "p" && tag[1] === pubkey)
  );

  if (app.muteSet.tags.length < initialLength) {
    saveMuteSet();
    return true;
  }
  return false;
}

// Check if a pubkey is muted
function isProfileMuted(pubkey) {
  return app.muteSet?.tags?.some((tag) => tag[0] === "p" && tag[1] === pubkey) || false;
}