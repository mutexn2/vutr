async function profileEditPageHandler() {
  // Extract pubkey from URL
  const urlParts = window.location.hash.split("/");
  const pubkeyParam = urlParts[1]; // Could be npub, hex, or undefined
  
  let targetPubkey = null;
  let profileData = null;
  let loadedFromRelay = false;
  
  // Decode pubkey from URL if provided
  if (pubkeyParam) {
    targetPubkey = await decodeProfileParam(pubkeyParam);
  }
  
  // If we have editing data from navigation, use it
  if (app.currentEditingProfile) {
    targetPubkey = app.currentEditingProfile.pubkey;
    profileData = app.currentEditingProfile.profileData;
  }
  
  // Check if user is logged in
  if (!app.isLoggedIn) {
    showTemporaryNotification('⚠️ Please log in to edit your profile');
    window.location.hash = '#';
    return;
  }
  
  // If no pubkey found, use current user's pubkey
  if (!targetPubkey) {
    targetPubkey = app.myPk;
    const npub = window.NostrTools.nip19.npubEncode(targetPubkey);
    // Update URL to include pubkey
    window.location.hash = `#editprofile/${npub}`;
    return; // Let it reload with the new hash
  }
  
  // Security check: only allow editing own profile
  if (targetPubkey !== app.myPk) {
    showTemporaryNotification('⚠️ You can only edit your own profile');
    const ownNpub = window.NostrTools.nip19.npubEncode(app.myPk);
    window.location.hash = `#profile/${ownNpub}`;
    return;
  }
  
  // If we don't have profile data, try to load it from relays
  if (!profileData) {
    mainContent.innerHTML = `
      <div class="edit-profile-container">
        <div class="loading-indicator">
          <p>Loading profile data...</p>
        </div>
      </div>
    `;
    
    try {
      const kindZero = await NostrClient.getProfile(targetPubkey);
      if (kindZero && kindZero.content) {
        profileData = JSON.parse(kindZero.content);
        loadedFromRelay = true;
      }
    } catch (error) {
      console.warn("No existing profile found:", error);
      // It's okay, new user
    }
  }
  
  // If still no profile data, create empty object (new user)
  if (!profileData) {
    profileData = {};
    loadedFromRelay = false;
  }

  // Check if this is a guest account
  const isGuestAccount = app.isGuest;

  mainContent.innerHTML = `
    <div class="edit-profile-container">
      <div class="edit-header">
        <h1>Edit Profile</h1>
        <div class="edit-actions">
          <button id="cancel-edit" class="cancel-button">Cancel</button>
          <button id="save-profile" class="save-button">Save Changes</button>
        </div>
      </div>
      
      ${!loadedFromRelay && !app.currentEditingProfile ? `
        <div class="info-notice">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <span>No existing profile found. This is normal for new users or if your profile hasn't been published yet. Fill out the form below to create your profile!</span>
        </div>
      ` : ''}
      
      ${isGuestAccount ? `
        <div class="guest-warning">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span>You're using a locally generated key. This is great for testing, but your key is stored locally and WILL be lost. Consider using a proper Nostr signing method for permanent use.</span>
        </div>
      ` : ''}
      
      <div class="edit-content">
        <form id="profile-edit-form" class="profile-edit-form">
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <div class="form-group">
              <label for="edit-display-name">Display Name</label>
              <input type="text" id="edit-display-name" value="${escapeHtml(profileData.display_name || '')}" maxlength="50" placeholder="Your display name">
              <small class="form-help char-counter"><span id="display-name-count">0</span>/50</small>
            </div>
            
            <div class="form-group">
              <label for="edit-name">Username</label>
              <input type="text" id="edit-name" value="${escapeHtml(profileData.name || '')}" maxlength="30" placeholder="username">
              <small class="form-help char-counter"><span id="name-count">0</span>/30</small>
            </div>
            
            <div class="form-group">
              <label for="edit-about">About</label>
              <textarea id="edit-about" rows="4" maxlength="500" placeholder="Tell people about yourself...">${escapeHtml(profileData.about || '')}</textarea>
              <small class="form-help char-counter"><span id="about-count">0</span>/500</small>
            </div>
          </div>

          <div class="form-section">
            <h3>Images</h3>
            
            <div class="form-group">
              <label for="edit-picture">Profile Picture URL</label>
              <input type="url" id="edit-picture" value="${escapeHtml(profileData.picture || '')}" placeholder="https://example.com/your-picture.jpg">
              <small class="form-help">Recommended: Square image, at least 400x400px</small>
              <div class="validation-message" id="picture-validation"></div>
            </div>
            
            <div class="form-group">
              <label for="edit-banner">Banner Image URL</label>
              <input type="url" id="edit-banner" value="${escapeHtml(profileData.banner || '')}" placeholder="https://example.com/your-banner.jpg">
              <small class="form-help">Recommended: 1200x400px or similar aspect ratio</small>
              <div class="validation-message" id="banner-validation"></div>
            </div>
          </div>

          <div class="form-section">
            <h3>Links & Contact</h3>
            
            <div class="form-group">
              <label for="edit-website">Website</label>
              <input type="url" id="edit-website" value="${escapeHtml(profileData.website || '')}" placeholder="https://yourwebsite.com">
              <div class="validation-message" id="website-validation"></div>
            </div>
            
            <div class="form-group">
              <label for="edit-nip05">NIP-05 Identifier</label>
              <input type="text" id="edit-nip05" value="${escapeHtml(profileData.nip05 || '')}" placeholder="username@domain.com">
              <small class="form-help">Verified identity (optional)</small>
              <div class="validation-message" id="nip05-validation"></div>
            </div>
            
            <div class="form-group">
              <label for="edit-lud16">Lightning Address</label>
              <input type="text" id="edit-lud16" value="${escapeHtml(profileData.lud16 || '')}" placeholder="username@domain.com">
              <small class="form-help">For receiving Bitcoin tips (optional)</small>
              <div class="validation-message" id="lud16-validation"></div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  // Store pubkey for save function
  app.currentEditingProfile = {
    pubkey: targetPubkey,
    profileData: profileData
  };

  // Add event listeners
  setupEditProfileEventListeners();
  
  // Initialize character counters
  updateCharCounter('edit-display-name', 'display-name-count');
  updateCharCounter('edit-name', 'name-count');
  updateCharCounter('edit-about', 'about-count');
}

function setupEditProfileEventListeners() {
  // Cancel button
  document.getElementById('cancel-edit').addEventListener('click', () => {
    const profileNpub = window.NostrTools.nip19.npubEncode(app.currentEditingProfile.pubkey);
    window.location.hash = `#profile/${profileNpub}`;
  });

  // Save button
  document.getElementById('save-profile').addEventListener('click', handleSaveProfile);

  // Character counters
  document.getElementById('edit-display-name').addEventListener('input', (e) => {
    updateCharCounter('edit-display-name', 'display-name-count');
    validateForm();
  });
  
  document.getElementById('edit-name').addEventListener('input', (e) => {
    updateCharCounter('edit-name', 'name-count');
    validateForm();
  });
  
  document.getElementById('edit-about').addEventListener('input', (e) => {
    updateCharCounter('edit-about', 'about-count');
    validateForm();
  });

  // URL validation
  document.getElementById('edit-picture').addEventListener('blur', () => {
    validateUrl('edit-picture', 'picture-validation');
  });
  
  document.getElementById('edit-banner').addEventListener('blur', () => {
    validateUrl('edit-banner', 'banner-validation');
  });
  
  document.getElementById('edit-website').addEventListener('blur', () => {
    validateUrl('edit-website', 'website-validation');
  });

  // NIP-05 validation
  document.getElementById('edit-nip05').addEventListener('blur', async () => {
    await validateNip05Input();
  });

  // Lightning address validation
  document.getElementById('edit-lud16').addEventListener('blur', () => {
    validateLightningAddress();
  });

  // Form validation on any input
  const form = document.getElementById('profile-edit-form');
  form.addEventListener('input', validateForm);
}

function updateCharCounter(inputId, counterId) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (input && counter) {
    counter.textContent = input.value.length;
  }
}

function validateUrl(inputId, validationId) {
  const input = document.getElementById(inputId);
  const validation = document.getElementById(validationId);
  const value = input.value.trim();
  
  if (!value) {
    validation.textContent = '';
    validation.className = 'validation-message';
    return true;
  }
  
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      validation.textContent = '⚠️ URL must use http:// or https://';
      validation.className = 'validation-message error';
      return false;
    }
    validation.textContent = '✓ Valid URL';
    validation.className = 'validation-message success';
    return true;
  } catch (e) {
    validation.textContent = '⚠️ Invalid URL format';
    validation.className = 'validation-message error';
    return false;
  }
}

async function validateNip05Input() {
  const input = document.getElementById('edit-nip05');
  const validation = document.getElementById('nip05-validation');
  const value = input.value.trim();
  
  if (!value) {
    validation.textContent = '';
    validation.className = 'validation-message';
    return true;
  }
  
  // Check format: username@domain.com
  const nip05Regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!nip05Regex.test(value)) {
    validation.textContent = '⚠️ Invalid format. Use: username@domain.com';
    validation.className = 'validation-message error';
    return false;
  }
  
  // Try to verify NIP-05
  validation.textContent = '🔄 Verifying...';
  validation.className = 'validation-message';
  
  try {
    const result = await verifyNip05(value, app.currentEditingProfile.pubkey);
    
    if (result.verified) {
      validation.textContent = '✓ NIP-05 verified';
      validation.className = 'validation-message success';
      return true;
    } else if (result.corsError) {
      validation.textContent = '⚠️ Cannot verify due to CORS (will still be saved)';
      validation.className = 'validation-message warning';
      return true;
    } else {
      validation.textContent = '⚠️ NIP-05 not verified for this pubkey (will still be saved)';
      validation.className = 'validation-message warning';
      return true;
    }
  } catch (error) {
    validation.textContent = '⚠️ Verification failed (will still be saved)';
    validation.className = 'validation-message warning';
    return true;
  }
}

function validateLightningAddress() {
  const input = document.getElementById('edit-lud16');
  const validation = document.getElementById('lud16-validation');
  const value = input.value.trim();
  
  if (!value) {
    validation.textContent = '';
    validation.className = 'validation-message';
    return true;
  }
  
  // Lightning address format: username@domain.com
  const lud16Regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!lud16Regex.test(value)) {
    validation.textContent = '⚠️ Invalid format. Use: username@domain.com';
    validation.className = 'validation-message error';
    return false;
  }
  
  validation.textContent = '✓ Valid format';
  validation.className = 'validation-message success';
  return true;
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
  
  return isValid;
}

async function handleSaveProfile() {
  const saveButton = document.getElementById('save-profile');
  const originalButtonText = saveButton.textContent;
  
  try {
    // Validate form first
    if (!validateForm()) {
      showTemporaryNotification('⚠️ Please provide at least a display name or username');
      return;
    }
    
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
    
    // Create profile event (kind:0)
    const profileEvent = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(updatedProfile)
    };
    
    console.log("Creating profile event:", profileEvent);
    
    // Sign event using the unified signing handler
    const signedEvent = await handleEventSigning(profileEvent);
    
    console.log("Signed profile event:", signedEvent);
    
    // Publish event
    const result = await publishEvent(signedEvent, null, {
      successMessage: "Profile updated successfully",
      errorMessage: "Failed to publish profile update"
    });
    
    if (result.success) {
      showTemporaryNotification(`✅ Profile published to ${result.successCount}/${result.totalCount} relays`);
      
      // Clear editing data and redirect back to profile
      const profileNpub = window.NostrTools.nip19.npubEncode(app.currentEditingProfile.pubkey);
      app.currentEditingProfile = null;
      
      // Small delay to show success message
      setTimeout(() => {
        window.location.hash = `#profile/${profileNpub}`;
      }, 1500);
    } else {
      throw new Error(result.error || 'Failed to publish profile');
    }
    
  } catch (error) {
    console.error('Error saving profile:', error);
    showTemporaryNotification('❌ Error saving profile: ' + error.message);
    
    // Reset button state
    saveButton.textContent = originalButtonText;
    saveButton.disabled = false;
  }
}