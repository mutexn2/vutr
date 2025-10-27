async function profileEditPageHandler() {
  // Check if user is logged in and has editing data
  if (!app.isLoggedIn || !app.currentEditingProfile) {
    window.location.hash = '#';
    return;
  }

  const { profileData } = app.currentEditingProfile;

  mainContent.innerHTML = `
    <div class="edit-profile-container">
      <div class="edit-header">
        <h1>Edit Profile</h1>
        <div class="edit-actions">
          <button id="cancel-edit" class="cancel-button">Cancel</button>
          <button id="save-profile" class="save-button">Save Changes</button>
        </div>
      </div>
      
      <div class="edit-content">
        <form id="profile-edit-form" class="profile-edit-form">
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <div class="form-group">
              <label for="edit-display-name">Display Name</label>
              <input type="text" id="edit-display-name" value="${profileData.display_name || ''}" maxlength="50" placeholder="Your display name">
            </div>
            
            <div class="form-group">
              <label for="edit-name">Username</label>
              <input type="text" id="edit-name" value="${profileData.name || ''}" maxlength="30" placeholder="username">
            </div>
            
            <div class="form-group">
              <label for="edit-about">About</label>
              <textarea id="edit-about" rows="4" maxlength="500" placeholder="Tell people about yourself...">${profileData.about || ''}</textarea>
            </div>
          </div>

          <div class="form-section">
            <h3>Images</h3>
            
            <div class="form-group">
              <label for="edit-picture">Profile Picture URL</label>
              <input type="url" id="edit-picture" value="${profileData.picture || ''}" placeholder="https://example.com/your-picture.jpg">
              <small class="form-help">Recommended: Square image, at least 400x400px</small>
            </div>
            
            <div class="form-group">
              <label for="edit-banner">Banner Image URL</label>
              <input type="url" id="edit-banner" value="${profileData.banner || ''}" placeholder="https://example.com/your-banner.jpg">
              <small class="form-help">Recommended: 1200x400px or similar aspect ratio</small>
            </div>
          </div>

          <div class="form-section">
            <h3>Links & Contact</h3>
            
            <div class="form-group">
              <label for="edit-website">Website</label>
              <input type="url" id="edit-website" value="${profileData.website || ''}" placeholder="https://yourwebsite.com">
            </div>
            
            <div class="form-group">
              <label for="edit-nip05">NIP-05 Identifier</label>
              <input type="text" id="edit-nip05" value="${profileData.nip05 || ''}" placeholder="username@domain.com">
              <small class="form-help">Verified identity (optional)</small>
            </div>
            
            <div class="form-group">
              <label for="edit-lud16">Lightning Address</label>
              <input type="text" id="edit-lud16" value="${profileData.lud16 || ''}" placeholder="username@domain.com">
              <small class="form-help">For receiving Bitcoin tips (optional)</small>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  // Add event listeners
  setupEditProfileEventListeners();
}

function setupEditProfileEventListeners() {
  // Cancel button
  document.getElementById('cancel-edit').addEventListener('click', () => {
    const profileNpub = window.NostrTools.nip19.npubEncode(app.currentEditingProfile.pubkey);
    window.location.hash = `#profile/${profileNpub}`;
  });

  // Save button
  document.getElementById('save-profile').addEventListener('click', handleSaveProfile);

  // Form validation on input
  const form = document.getElementById('profile-edit-form');
  form.addEventListener('input', validateForm);
}

function validateForm() {
  const displayName = document.getElementById('edit-display-name').value.trim();
  const name = document.getElementById('edit-name').value.trim();
  const saveButton = document.getElementById('save-profile');
  
  // Basic validation - at least display name or username should be filled
  const isValid = displayName.length > 0 || name.length > 0;
  
  saveButton.disabled = !isValid;
  if (!isValid) {
    saveButton.style.opacity = '0.5';
    saveButton.style.cursor = 'not-allowed';
  } else {
    saveButton.style.opacity = '1';
    saveButton.style.cursor = 'pointer';
  }
}

async function handleSaveProfile() {
  const saveButton = document.getElementById('save-profile');
  const originalButtonText = saveButton.textContent;
  
  try {
    // Show loading state
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    
    // Collect form data
    const updatedProfile = {
      display_name: document.getElementById('edit-display-name').value.trim(),
      name: document.getElementById('edit-name').value.trim(),
      about: document.getElementById('edit-about').value.trim(),
      picture: document.getElementById('edit-picture').value.trim(),
      banner: document.getElementById('edit-banner').value.trim(),
      website: document.getElementById('edit-website').value.trim(),
      nip05: document.getElementById('edit-nip05').value.trim(),
      lud16: document.getElementById('edit-lud16').value.trim()
    };
    
    // Remove empty fields
    Object.keys(updatedProfile).forEach(key => {
      if (updatedProfile[key] === '') {
        delete updatedProfile[key];
      }
    });
    
    // Validate required fields
    if (!updatedProfile.display_name && !updatedProfile.name) {
      throw new Error('Please provide at least a display name or username');
    }
    
    // Create profile event
    const profileEvent = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(updatedProfile)
    };
    
    let signedEvent;
    
    // Sign event based on login type
    if (app.isGuest) {
      signedEvent = signEventAsGuest(profileEvent);
    } else {
      // Use extension signing
      signedEvent = await window.nostr.signEvent(profileEvent);
    }
    
    console.log("signed event:", signedEvent);
    // Publish event
    await publishProfileEvent(signedEvent);
    
    // Show success and redirect
    showTemporaryNotification('Profile updated successfully! (it didnt)');
    
    // Clear editing data and redirect back to profile
    const profileNpub = window.NostrTools.nip19.npubEncode(app.currentEditingProfile.pubkey);
    app.currentEditingProfile = null;
    
    // Small delay to show success message
    setTimeout(() => {
      window.location.hash = `#profile/${profileNpub}`;
    }, 1000);
    
  } catch (error) {
    console.error('Error saving profile:', error);
    showTemporaryNotification('Error saving profile: ' + error.message);
    
    // Reset button state
    saveButton.textContent = originalButtonText;
    saveButton.disabled = false;
  }
}

async function publishProfileEvent(signedEvent) {
  try {
    if (app.relays && app.relays.length > 0) {
//      const simplePool = new window.NostrTools.SimplePool();
//      const publishPromises = app.relays.map(relay => 
//        simplePool.publish([relay], signedEvent)
//      );
      
      // Wait for at least one successful publish
      //await Promise.any(publishPromises);
      console.log("Profile updated and published successfully (no)");
      console.log("published:", signedEvent);
    } else {
      console.warn("No relays configured, profile event not published");
      throw new Error("No relays available for publishing");
    }
  } catch (error) {
    console.error("Error publishing profile event:", error);
    throw new Error("Failed to publish profile update");
  }
}