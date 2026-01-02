async function postingPageHandler() {
  mainContent.innerHTML = `
    <div class="posting-container">
      <h1 class="posting-title">Create Video Event</h1>
      <p class="subtitle">publish kind-21 video event</p>
      <div class="loading-indicator">
        <p>Loading...</p>
      </div>
    </div>
  `;

  try {
    renderWizardForm();
    initializePostingPage();
  } catch (error) {
    console.error("Error rendering posting page:", error);
    mainContent.innerHTML = `
      <div class="posting-container">
        <h1>Error</h1>
        <p>Unable to load posting page. Please try again.</p>
      </div>
    `;
  }
}

function renderWizardForm() {
  mainContent.innerHTML = `
    <div class="posting-container">
      <p class="subtitle">publish kind:21 event</p>
      
      <!-- Progress Indicator -->
      <div class="wizard-progress">
        <div class="progress-step active" data-step="1">
          <div class="step-number">1</div>
          <div class="step-label">Video</div>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="2">
          <div class="step-number">2</div>
          <div class="step-label">Details</div>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="3">
          <div class="step-number">3</div>
          <div class="step-label">Metadata</div>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="4">
          <div class="step-number">4</div>
          <div class="step-label">Custom</div>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="5">
          <div class="step-number">5</div>
          <div class="step-label">Relays</div>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="6">
          <div class="step-number">6</div>
          <div class="step-label">Review</div>
        </div>
      </div>

      <div class="wizard-form">
        <form id="post-form">
          
          <!-- Step 1: Video Sources -->
          <div class="wizard-step active" data-step="1">
            <h2 class="step-title">Video Sources</h2>
            <p class="step-description">Add one or more video URLs. (lower quality, fallback)</p>
            
            <div class="video-tabs">
              <button type="button" class="tab-button active" data-tab="url">Add URL</button>
              <button type="button" class="tab-button" data-tab="upload">Upload File</button>
            </div>
            
            <div class="tab-content active" id="url-tab">
              <div class="input-group">
                <input type="text" id="video-url" placeholder="Enter video URL (mp4, webm, etc.)">
                <button type="button" id="add-video">Add Video</button>
              </div>
              <div class="validation-options" style="display: none;">
                <label>
                  <input type="checkbox" id="lightweight-mode">
                  Skip blossom validation (faster, less accurate)
                </label>
              </div>
              <div id="video-progress" class="progress-container" style="display: none;"></div>
            </div>

            <div class="tab-content" id="upload-tab">
              <div class="upload-area">
                <input type="file" id="video-upload" accept="video/*" style="display: none;">
                <button type="button" id="upload-video" class="upload-button" style="display: none;">Choose Video File</button>
                <p class="help-text">*Blossom servers management in development*</p>
                <p class="help-text">the event needs a publicly exposed direct media URL, you can use any hosting service you know or self-host then add URL</p>
                <p class="help-text">also check:</p>
                <div class="external-upload-services">
                  <a href="https://blossomservers.com/" target="_blank" class="upload-service-link">Blossom Servers</a>
                  <a href="https://bouquet.slidestr.net/" target="_blank" class="upload-service-link">Bouquet</a>
                  <a href="https://npub19sstws4x9t7nua2sh6cxkeez25y6lvvnq6fqpmyzwnthsjap5tqqkdsghg.nsite.lol/" target="_blank" class="upload-service-link">Cherry Tree</a>
                </div>
              </div>
            </div>

            <div class="video-counter">
              <span id="total-items-counter">Videos added: 0</span>
            </div>
            <div id="video-metadata-list"></div>
          </div>

<!-- Step 2: Basic Information -->
<div class="wizard-step" data-step="2">
  <h2 class="step-title">Basic Information</h2>
  <p class="step-description">Provide essential details about your video</p>
  
  <div class="form-group">
    <label for="title">Title *</label>
    <input type="text" id="title" placeholder="Enter a descriptive title" required>
  </div>
  
  <div class="form-group">
    <label for="content">Description *</label>
    <textarea id="content" placeholder="Describe your video content in detail" required rows="6"></textarea>
    <span class="char-count" id="content-count">0 characters</span>
  </div>
  
  <div class="form-group">
    <label for="summary">Summary *</label>
    <textarea id="summary" placeholder="Brief summary (1-2 sentences for accessibility)" required rows="3"></textarea>
    <span class="help-text">This helps with accessibility and previews</span>
  </div>

  <div class="form-group">
    <label>Thumbnail *</label>
    <p class="help-text">Select an image from your videos or add a custom URL</p>
    <div id="thumbnail-picker" class="thumbnail-picker"></div>
    <div class="thumbnail-custom-input">
      <input type="text" id="custom-thumbnail-url" placeholder="Or enter custom thumbnail URL">
      <button type="button" id="add-custom-thumbnail">Add Custom</button>
    </div>
  </div>
</div>

          <!-- Step 3: Metadata -->
          <div class="wizard-step" data-step="3">
            <h2 class="step-title">Metadata & Categories</h2>
            <p class="step-description">Add tags and metadata to help people discover your video</p>
            
            <div class="form-group">
              <label>Tags *</label>
              <div class="tags-input-group">
                <select id="tags">
                  <option value="">Select a category</option>
                </select>
                <button type="button" id="add-selected-tag">Add</button>
              </div>
              <div class="tags-input-group">
                <input type="text" id="custom-category" placeholder="Or type a custom tag">
                <button type="button" id="add-custom-tag">Add</button>
              </div>
              <div id="selected-tags-container">
                <div id="selected-tags-list"></div>
              </div>
            </div>

            <div class="form-group">
              <label for="language">Language</label>
              <select id="language">
                <option value="">Select language</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="ru">Russian</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label for="license">Content License</label>
              <select id="license">
                <option value="">Select a license</option>
                <option value="CC0">CC0 (Public Domain)</option>
                <option value="CC-BY">CC BY (Attribution)</option>
                <option value="CC-BY-SA">CC BY-SA (Attribution-ShareAlike)</option>
                <option value="CC-BY-NC">CC BY-NC (Attribution-NonCommercial)</option>
                <option value="CC-BY-NC-SA">CC BY-NC-SA (Attribution-NonCommercial-ShareAlike)</option>
                <option value="CC-BY-ND">CC BY-ND (Attribution-NoDerivatives)</option>
                <option value="all-rights-reserved">All Rights Reserved</option>
                <option value="custom">Custom License</option>
              </select>
              <input type="text" id="custom-license" placeholder="Enter custom license" style="display: none; margin-top: 0.5rem;">
            </div>

<div class="form-group">
  <label>Content Warnings</label>
  <div class="content-warnings">
    <label class="checkbox-label">
      <input type="checkbox" name="content-warning" value="nsfw">
      <span>NSFW (Not Safe For Work)</span>
    </label>
    <label class="checkbox-label">
      <input type="checkbox" name="content-warning" value="violence">
      <span>Violence</span>
    </label>
    <label class="checkbox-label">
      <input type="checkbox" name="content-warning" value="sensitive">
      <span>Sensitive Content</span>
    </label>
    <label class="checkbox-label">
      <input type="checkbox" id="content-warning-other-checkbox" name="content-warning" value="other">
      <span>Other</span>
    </label>
    <input 
      type="text" 
      id="content-warning-other-input" 
      class="content-warning-other-input" 
      placeholder="Specify custom warning..."
      style="display: none; margin-top: 8px; width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
    >
  </div>
</div>
          </div>

          <!-- Step 4: Additional Fields -->
          <div class="wizard-step" data-step="4">
            <h2 class="step-title">Additional Fields</h2>
            <p class="step-description">Add any custom fields (optional)</p>
            
            <div id="field-container"></div>
            <button type="button" id="add-field" class="secondary-button">
              <span>+ Add Custom Field</span>
            </button>
            
            <p class="help-text">Custom fields can include things like: genre, series, episode number, credits, etc.</p>
          </div>

          <!-- Step 5: Relay Selection -->
          <div class="wizard-step" data-step="5">
            <h2 class="step-title">Relay Selection</h2>
            <p class="step-description">Choose where to publish your video event</p>
            
            <div class="form-group">
              <label>Publishing Relay Sets *</label>
              <p class="help-text">Select which relay sets to publish to (minimum 1 required)</p>
              <div class="relay-sets-selection">
                <div id="relay-sets-list"></div>
              </div>
            </div>

            <div class="selected-relays-info">
              <p><strong>Publishing to <span id="relay-count">0</span> relays</strong></p>
              <div id="relay-preview" class="relay-preview"></div>
            </div>

            <div class="form-group">
              <label>Event Discovery Relays</label>
              <p class="help-text">Select relays to include in the event tags for discovery:</p>
              <p>only select relays you are sure will accept the event</p>
              <div id="event-relay-selection" class="event-relay-selection"></div>
              <p class="relay-count-info"><span id="event-relay-count">0</span> relays selected</p>
            </div>
          </div>

          <!-- Step 6: Review & Publish -->
          <div class="wizard-step" data-step="6">
            <h2 class="step-title">Review & Publish</h2>
            <p class="step-description">Review your event before publishing</p>
            
            <div class="event-preview">
              <h3>Event Summary</h3>
              <div id="event-summary"></div>
              
              <h3>Event JSON</h3>
              <div class="json-preview">
                <button type="button" id="copy-json" class="copy-button">Copy JSON</button>
                <pre id="event-json"></pre>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="wizard-navigation">
            <button type="button" id="prev-step" class="nav-button secondary-button" style="display: none;">
              ← Previous
            </button>
            <div class="nav-spacer"></div>
            <button type="button" id="next-step" class="nav-button primary-button">
              Next →
            </button>
            <button type="submit" id="submit-button" class="nav-button submit-button" style="display: none;">
              Publish Event
            </button>
          </div>
        </form>
      </div>
    </div>
  `;


  // Handle "Other" content warning checkbox
const otherCheckbox = document.getElementById("content-warning-other-checkbox");
const otherInput = document.getElementById("content-warning-other-input");

if (otherCheckbox && otherInput) {
  otherCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      otherInput.style.display = "block";
      otherInput.focus();
    } else {
      otherInput.style.display = "none";
      otherInput.value = "";
    }
  });
}
}

function initializePostingPage() {
  // State management
  window.videoMetadataList = [];
  let metadataIndex = 0;
  let selectedTags = new Set();
  let selectedThumbnail = null;
  let selectedRelaySets = new Set([app.activeRelayList]);
  let excludedRelays = new Set();
  let eventRelays = new Set();
  let activeTab = "url";
  let currentStep = 1;
  const totalSteps = 6;

  // Initialize all components
  initializeTabs();
  initializeTags();
  initializeRelaySelection();
  initializeEventListeners();
  initializeWizardNavigation();
  loadFormDataFromStorage();
  updateDisplay();

  // Auto-save form data
  const formElement = document.getElementById("post-form");
  formElement.addEventListener("input", debounce(saveFormDataToStorage, 1000));
  formElement.addEventListener("change", saveFormDataToStorage);

  function initializeWizardNavigation() {
    const prevButton = document.getElementById("prev-step");
    const nextButton = document.getElementById("next-step");
    const submitButton = document.getElementById("submit-button");

    nextButton.addEventListener("click", () => {
      if (validateCurrentStep()) {
        goToStep(currentStep + 1);
      }
    });

    prevButton.addEventListener("click", () => {
      goToStep(currentStep - 1);
    });

  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > totalSteps) return;

    // Hide all steps
    document.querySelectorAll(".wizard-step").forEach(step => {
      step.classList.remove("active");
    });

    // Show target step
    document.querySelector(`.wizard-step[data-step="${stepNumber}"]`).classList.add("active");

    // Initialize thumbnail picker when entering step 2
    if (stepNumber === 2) {
      initializeThumbnailPicker();
    }

      // Update progress indicator
      document.querySelectorAll(".progress-step").forEach(step => {
        const num = parseInt(step.dataset.step);
        step.classList.toggle("active", num === stepNumber);
        step.classList.toggle("completed", num < stepNumber);
      });

      // Update navigation buttons
      prevButton.style.display = stepNumber === 1 ? "none" : "block";
      
      if (stepNumber === totalSteps) {
        nextButton.style.display = "none";
        submitButton.style.display = "block";
        updateReviewStep();
      } else {
        nextButton.style.display = "block";
        submitButton.style.display = "none";
      }

      currentStep = stepNumber;
      
      // Scroll to top
      forceScrollToTop();
    }

  function validateCurrentStep() {
    switch(currentStep) {
      case 1: // Video Sources
        if (window.videoMetadataList.length === 0) {
          alert("Please add at least one video URL");
          return false;
        }
        return true;

      case 2: // Basic Information
        const title = document.getElementById("title").value.trim();
        const content = document.getElementById("content").value.trim();
        const summary = document.getElementById("summary").value.trim();
        
        if (!title) {
          alert("Please enter a title");
          document.getElementById("title").focus();
          return false;
        }
        if (!content) {
          alert("Please enter a description");
          document.getElementById("content").focus();
          return false;
        }
        if (!summary) {
          alert("Please enter a summary");
          document.getElementById("summary").focus();
          return false;
        }
        if (!selectedThumbnail) {
          alert("Please select a thumbnail");
          return false;
        }
        return true;

        case 3: // Metadata
          if (selectedTags.size === 0) {
            alert("Please add at least one tag");
            return false;
          }
          return true;

        case 4: // Custom fields (optional)
          return true;

        case 5: // Relay Selection
          if (getSelectedRelays().length === 0) {
            alert("Please select at least one relay set");
            return false;
          }
          return true;

        default:
          return true;
      }
    }
  }

  function initializeThumbnailPicker() {
    const thumbnailPicker = document.getElementById("thumbnail-picker");
    if (!thumbnailPicker) return;

    thumbnailPicker.innerHTML = "";

    if (window.videoMetadataList.length === 0) {
      thumbnailPicker.innerHTML = '<p class="no-thumbnails">Add videos in Step 1 first</p>';
      return;
    }

    window.videoMetadataList.forEach((video, index) => {
      const thumbOption = document.createElement("div");
      thumbOption.className = "thumbnail-option";
      thumbOption.dataset.url = video.thumbnail;
      
      thumbOption.innerHTML = `
        <img src="${video.thumbnail}" alt="Video ${index + 1} thumbnail">
        <span class="thumbnail-label">Video ${index + 1}</span>
      `;

thumbOption.addEventListener("click", () => {
  document.querySelectorAll(".thumbnail-option").forEach(opt => 
    opt.classList.remove("selected")
  );
  thumbOption.classList.add("selected");
  selectedThumbnail = video.thumbnail.trim();
  saveFormDataToStorage();
});

      // Auto-select first thumbnail if none selected
      if (index === 0 && !selectedThumbnail) {
        thumbOption.classList.add("selected");
        selectedThumbnail = video.thumbnail;
      }

      thumbnailPicker.appendChild(thumbOption);
    });
  }


  function updateReviewStep() {
    const summary = document.getElementById("event-summary");
    const jsonPreview = document.getElementById("event-json");
    const eventData = buildK21EventData();

    // Create summary HTML
    const title = document.getElementById("title").value;
    const videoCount = window.videoMetadataList.length;
    const tagCount = selectedTags.size;
    const relayCount = getSelectedRelays().length;

    summary.innerHTML = `
      <div class="summary-item">
        <strong>Title:</strong> ${title}
      </div>
      <div class="summary-item">
        <strong>Videos:</strong> ${videoCount} source${videoCount !== 1 ? 's' : ''}
      </div>
      <div class="summary-item">
        <strong>Tags:</strong> ${tagCount} tag${tagCount !== 1 ? 's' : ''} (${Array.from(selectedTags).join(", ")})
      </div>
      <div class="summary-item">
        <strong>Publishing to:</strong> ${relayCount} relay${relayCount !== 1 ? 's' : ''}
      </div>
      ${eventRelays.size > 0 ? `
      <div class="summary-item">
        <strong>Discovery relays:</strong> ${eventRelays.size}
      </div>
      ` : ''}
    `;

    // Show JSON
    jsonPreview.textContent = JSON.stringify(eventData, null, 2);

    // Copy JSON button
    document.getElementById("copy-json").addEventListener("click", () => {
      navigator.clipboard.writeText(JSON.stringify(eventData, null, 2));
      showTemporaryNotification("JSON copied to clipboard!");
    });
  }

  function initializeTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.dataset.tab;
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));
        button.classList.add("active");
        document.getElementById(`${tabId}-tab`).classList.add("active");
        activeTab = tabId;
      });
    });
  }

  function initializeTags() {
    const tagsSelect = document.getElementById("tags");
    try {
      const allTags = localStorage.getItem("allTags");
      const tags = allTags ? JSON.parse(allTags) : [];
      tags.forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag.value;
        option.textContent = tag.displayName;
        tagsSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  }

  function initializeRelaySelection() {
    const relaySetsList = document.getElementById("relay-sets-list");

    Object.keys(app.relayLists).forEach((setName) => {
      const checkbox = document.createElement("div");
      checkbox.className = "relay-set-checkbox";
      checkbox.innerHTML = `
        <label>
          <input type="checkbox" value="${setName}" ${selectedRelaySets.has(setName) ? "checked" : ""}>
          <span class="relay-set-name">${setName}</span>
          <span class="relay-set-count">(${getRelayCountForSet(setName)} relays)</span>
        </label>
      `;
      relaySetsList.appendChild(checkbox);
    });

    relaySetsList.addEventListener("change", handleRelaySetChange);
    updateRelayPreview();
  }

  function handleRelaySetChange(event) {
    if (event.target.type === "checkbox") {
      const setName = event.target.value;

      if (event.target.checked) {
        selectedRelaySets.add(setName);
      } else {
        selectedRelaySets.delete(setName);
      }

      if (selectedRelaySets.size === 0) {
        event.target.checked = true;
        selectedRelaySets.add(setName);
        alert("At least one relay set must be selected");
        return;
      }

      excludedRelays.clear();
      eventRelays.clear();
      updateRelayPreview();
      saveFormDataToStorage();
    }
  }

  function getRelayCountForSet(setName) {
    const relaySet = app.relayLists[setName];
    if (!relaySet) return 0;
    return relaySet.tags.filter((tag) => tag[0] === "relay").length;
  }

  function getSelectedRelays() {
    const allRelays = new Set();
    selectedRelaySets.forEach((setName) => {
      const relaySet = app.relayLists[setName];
      if (relaySet) {
        relaySet.tags
          .filter((tag) => tag[0] === "relay")
          .forEach((tag) => allRelays.add(tag[1]));
      }
    });
    excludedRelays.forEach((relay) => allRelays.delete(relay));
    return Array.from(allRelays);
  }

  function handleRelayRemoval(relayUrl) {
    excludedRelays.add(relayUrl);
    const remainingRelays = getSelectedRelays();
    
    if (remainingRelays.length === 0) {
      excludedRelays.delete(relayUrl);
      alert("At least one relay must be selected for publishing");
      return;
    }

    eventRelays.delete(relayUrl);
    updateRelayPreview();
    saveFormDataToStorage();
  }

  function updateRelayPreview() {
    const selectedRelays = getSelectedRelays();
    const relayCount = document.getElementById("relay-count");
    const relayPreview = document.getElementById("relay-preview");
    const eventRelaySelection = document.getElementById("event-relay-selection");
    const eventRelayCount = document.getElementById("event-relay-count");

    relayCount.textContent = selectedRelays.length;

    if (selectedRelays.length > 0) {
      relayPreview.innerHTML = selectedRelays
        .map(relay => `
          <span class="relay-chip">
            ${relay}
            <button type="button" class="remove-relay" data-relay="${relay}" title="Remove this relay">×</button>
          </span>
        `)
        .join("");

      eventRelaySelection.innerHTML = selectedRelays
        .map(relay => `
          <label class="event-relay-checkbox">
            <input type="checkbox" value="${relay}" ${eventRelays.has(relay) ? 'checked' : ''}>
            <span>${relay}</span>
          </label>
        `)
        .join("");

      eventRelaySelection.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            eventRelays.add(e.target.value);
          } else {
            eventRelays.delete(e.target.value);
          }
          eventRelayCount.textContent = eventRelays.size;
          saveFormDataToStorage();
        });
      });

      eventRelayCount.textContent = eventRelays.size;
    } else {
      relayPreview.innerHTML = '<span class="no-relays">No relays selected</span>';
      eventRelaySelection.innerHTML = '';
      eventRelayCount.textContent = '0';
    }
  }

  function initializeEventListeners() {
    // Video handlers
    document.getElementById("add-video").addEventListener("click", handleAddVideo);
    document.getElementById("upload-video").addEventListener("click", () =>
      document.getElementById("video-upload").click()
    );
    document.getElementById("video-upload").addEventListener("change", handleFileUpload);

    // Tag handlers
    document.getElementById("add-selected-tag").addEventListener("click", () => {
      const select = document.getElementById("tags");
      const value = select.value;
      if (value && !selectedTags.has(value)) {
        selectedTags.add(value);
        updateSelectedTagsDisplay();
        select.value = "";
      }
    });

  document.getElementById("add-custom-thumbnail")?.addEventListener("click", async () => {
    const input = document.getElementById("custom-thumbnail-url");
    const url = input.value.trim();
    
    if (!url) {
      alert("Please enter a thumbnail URL");
      return;
    }

    try {
      await validateImageUrl(url);
      
      const thumbnailPicker = document.getElementById("thumbnail-picker");
      const thumbOption = document.createElement("div");
      thumbOption.className = "thumbnail-option selected";
      thumbOption.dataset.url = url;
      
      thumbOption.innerHTML = `
        <img src="${url}" alt="Custom thumbnail">
        <span class="thumbnail-label">Custom</span>
      `;

      thumbOption.addEventListener("click", () => {
        document.querySelectorAll(".thumbnail-option").forEach(opt => 
          opt.classList.remove("selected")
        );
        thumbOption.classList.add("selected");
        selectedThumbnail = url;
        saveFormDataToStorage();
      });

      document.querySelectorAll(".thumbnail-option").forEach(opt => 
        opt.classList.remove("selected")
      );
      
      thumbnailPicker.appendChild(thumbOption);
      selectedThumbnail = url;
      input.value = "";
      saveFormDataToStorage();
    } catch {
      alert("Invalid image URL");
    }
  });


    document.getElementById("add-custom-tag").addEventListener("click", () => {
      const input = document.getElementById("custom-category");
      const value = input.value.trim();
      if (value && !selectedTags.has(value)) {
        selectedTags.add(value);
        updateSelectedTagsDisplay();
        input.value = "";
      }
    });

    document.getElementById("custom-category").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("add-custom-tag").click();
      }
    });

    // License handler
    document.getElementById("license").addEventListener("change", (e) => {
      const customInput = document.getElementById("custom-license");
      customInput.style.display = e.target.value === "custom" ? "block" : "none";
    });

    // Character counter
    document.getElementById("content").addEventListener("input", (e) => {
      document.getElementById("content-count").textContent = `${e.target.value.length} characters`;
    });

    // Custom fields
    document.getElementById("add-field").addEventListener("click", addCustomField);

    // Form submission
    document.getElementById("post-form").addEventListener("submit", handleFormSubmit);

    // Container click delegation
    document.querySelector(".posting-container").addEventListener("click", handleContainerClick);
  }

  function handleContainerClick(event) {
    const { target } = event;

    if (target.classList.contains("remove-video")) {
      const item = target.closest(".video-item");
      const index = parseInt(item.dataset.index);
      window.videoMetadataList = window.videoMetadataList.filter(
        (video) => video.index !== index
      );
      item.remove();
      updateVideoCounter();
      saveFormDataToStorage();
    }

    if (target.classList.contains("update-thumbnail")) {
      handleThumbnailUpdate(target);
    }

    if (target.classList.contains("remove-tag")) {
      const tag = target.dataset.tag;
      selectedTags.delete(tag);
      updateSelectedTagsDisplay();
      saveFormDataToStorage();
    }

    if (target.classList.contains("remove-field")) {
      target.closest(".custom-field").remove();
      saveFormDataToStorage();
    }

    if (target.classList.contains("remove-relay")) {
      const relayUrl = target.dataset.relay;
      handleRelayRemoval(relayUrl);
    }
  }

  async function handleThumbnailUpdate(button) {
    const item = button.closest(".video-item");
    const input = item.querySelector(".thumbnail-input");
    const img = item.querySelector(".video-thumbnail");
    const url = input.value.trim();

    if (!url) return;

    try {
      await validateImageUrl(url);
      img.src = url;

      const index = parseInt(item.dataset.index);
      const video = window.videoMetadataList.find((v) => v.index === index);
      if (video) video.thumbnail = url;

      input.value = "";
      saveFormDataToStorage();
    } catch {
      alert("Invalid image URL");
    }
  }

async function handleAddVideo() {
  const input = document.getElementById("video-url");
  const url = input.value.trim();
  if (!url) {
    alert("Please enter a video URL");
    return;
  }

  const button = document.getElementById("add-video");
  setButtonLoading(button, true, "Processing...");

  try {
    const lightweightCheckbox = document.getElementById("lightweight-mode");
    const isLightweightMode = lightweightCheckbox.checked;

    // Step 1: Check accessibility first (lightweight HEAD request)
    showVideoProgress("Checking video accessibility...");
    const headResponse = await fetch(url, { method: "HEAD" });
    if (!headResponse.ok) throw new Error("Invalid URL or video not accessible");

const contentType = headResponse.headers.get("Content-Type") || "video/mp4";
const isVideo = contentType.startsWith("video/");
const isAudio = contentType.startsWith("audio/");

if (!isVideo && !isAudio) {
  throw new Error(`Expected video or audio content, but received: ${contentType}`);
}
    const contentLength = parseInt(headResponse.headers.get("Content-Length") || "0");

    let metadata;

    if (isLightweightMode) {
      // Lightweight mode: minimal data, no download
      showVideoProgress("Creating metadata (lightweight mode)...");
      metadata = {
        url,
        type: contentType,
        size: contentLength,
        hash: generateRandomHash(),
        blobHash: null,
        isHashValid: false,
        dimensions: "1920x1080", // Default
        width: 1920,
        height: 1080,
        duration: Math.max(60, contentLength / 1000000), // Estimate
        uploaded: Math.floor(Date.now() / 1000),
        isLightweight: true,
      };
    } else {
      // Full mode: download once and extract everything
      const videoBlob = await fetchVideoWithProgress(url, (progress) => {
        if (progress.indeterminate) {
          showVideoProgress("Downloading video...", { indeterminate: true });
        } else {
          showVideoProgress("Downloading video...", progress);
        }
      });

      showVideoProgress("Extracting complete metadata...");
      
      // Extract ALL metadata from the blob in one pass
      const fullMetadata = await extractCompleteVideoMetadata(videoBlob, contentType, contentLength);
      
      // Generate and validate hash
      showVideoProgress("Validating hash...");
      const blobHash = await generateSHA256Hash(videoBlob);
      const hashValidation = validateHashAgainstUrl(url, blobHash);
      
      metadata = {
        url,
        type: contentType,
        size: contentLength,
        hash: hashValidation.isValid ? blobHash : generateRandomHash(),
        blobHash,
        isHashValid: hashValidation.isValid,
        ...fullMetadata, // Spread all extracted metadata
        uploaded: Math.floor(Date.now() / 1000),
        isLightweight: false,
      };
    }

    metadata.index = metadataIndex++;

    // Generate thumbnail (this is separate and won't re-download)
    showVideoProgress("Generating thumbnail...");
    metadata.thumbnail = await extractThumbnail(url);

    window.videoMetadataList.push(metadata);
    addVideoToUI(metadata);
    input.value = "";
    updateVideoCounter();
    saveFormDataToStorage();
    hideVideoProgress();
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    hideVideoProgress();

    if (error.message.includes("Expected video content")) {
      alert(`❌ ${error.message}\n\nPlease ensure the URL points to a video file.`);
    } else {
      alert(`Failed to fetch video metadata: ${error.message}`);
    }
  } finally {
    setButtonLoading(button, false, "Add Video");
  }
}

async function extractCompleteVideoMetadata(blob, mimeType, fileSize) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const blobUrl = URL.createObjectURL(blob);
    
    video.onloadedmetadata = () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        dimensions: `${video.videoWidth}x${video.videoHeight}`,
        aspectRatio: video.videoWidth / video.videoHeight,
      };
      
      // Try to extract additional metadata if available
      // Note: Not all browsers expose all properties
      if (video.webkitAudioDecodedByteCount !== undefined) {
        metadata.audioByteCount = video.webkitAudioDecodedByteCount;
      }
      if (video.webkitVideoDecodedByteCount !== undefined) {
        metadata.videoByteCount = video.webkitVideoDecodedByteCount;
      }
      
      // Calculate estimated bitrate
      if (metadata.duration > 0) {
        metadata.bitrate = Math.round((fileSize * 8) / metadata.duration); // bits per second
      }
      
      URL.revokeObjectURL(blobUrl);
      resolve(metadata);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.preload = 'metadata'; // Only load metadata, not the whole video
    video.src = blobUrl;
  });
}


  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

const validTypes = [
  // Video formats
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
  "video/3gpp",
  // Audio formats
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/flac",
  "audio/webm",
  "audio/x-m4a",
];

if (!validTypes.includes(file.type)) {
  alert("Please select a valid video or audio file");
  return;
}

    const button = document.getElementById("upload-video");
    setButtonLoading(button, true, "Processing...");

    try {
      const metadata = await createUploadMetadata(file);
      metadata.index = metadataIndex++;
      metadata.thumbnail = await generatePlaceholderThumbnail();

      window.videoMetadataList.push(metadata);
      addVideoToUI(metadata);
      event.target.value = "";
      updateVideoCounter();
      saveFormDataToStorage();
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to process video file");
    } finally {
      setButtonLoading(button, false, "Choose Video File");
    }
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    const submitButton = document.getElementById("submit-button");
    const originalText = submitButton.textContent;

    if (window.videoMetadataList.length === 0) {
      alert("Please add at least one URL");
      return;
    }

    const selectedRelays = getSelectedRelays();

    if (selectedRelays.length === 0) {
      alert("Please select at least one relay set");
      return;
    }

    const eventData = buildK21EventData();
    console.log("Event tags:", JSON.stringify(eventData.tags, null, 2));
    try {
      console.log("Event data:", eventData);
      const signedVideoEvent = await handleEventSigning(eventData);
      console.log("Event signed successfully!");

/*       const shouldPublish = await confirmModal(
        "Published events can't be edited.",
        "Publish Kind-21 Event"
      ); 

      if (!shouldPublish) {
        console.log("Publication cancelled by user");
        return;
      }*/

      submitButton.textContent = "Publishing...";
      submitButton.disabled = true;

      try {
        const result = await publishEvent(signedVideoEvent, selectedRelays, {
          successMessage: "Video event published successfully",
          errorMessage: "Failed to publish video event",
        });

        if (result.success) {
          console.dir(signedVideoEvent, { depth: null });
          submitButton.textContent = "Published!";
          showTemporaryNotification("Event published successfully!");
          clearFormDataFromStorage();

          setTimeout(() => {
            window.location.hash = `#home`;
          }, 2000);
        } else {
          throw new Error(result.error);
        }
      } catch (publishError) {
        console.error("Error publishing video event:", publishError);
        showTemporaryNotification("❌ Failed to publish video event");
        resetButton();
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event: " + error.message);
      resetButton();
    }

    function resetButton() {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  }


  async function createUploadMetadata(file) {
    const hash = await generateHash(file.name + Date.now());
    const fakeUrl = `https://cdn.nostrcheck.me/57700e6225ecb0d546ff16f2b948f26e9ae40d47c7430a05abb8adc6a7dc3274.webm`;

    return {
      url: fakeUrl,
      type: file.type,
      size: file.size,
      hash,
      uploaded: Math.floor(Date.now() / 1000),
      originalName: file.name,
    };
  }

  async function extractThumbnail(videoUrl) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;

      video.onloadedmetadata = () => {
        video.currentTime = 0.1;
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const thumbnailWidth = 240;
        const thumbnailHeight = 135;

        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const videoAspectRatio = videoWidth / videoHeight;
        const containerAspectRatio = thumbnailWidth / thumbnailHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoAspectRatio > containerAspectRatio) {
          drawWidth = thumbnailWidth;
          drawHeight = thumbnailWidth / videoAspectRatio;
          offsetX = 0;
          offsetY = (thumbnailHeight - drawHeight) / 2;
        } else {
          drawHeight = thumbnailHeight;
          drawWidth = thumbnailHeight * videoAspectRatio;
          offsetX = (thumbnailWidth - drawWidth) / 2;
          offsetY = 0;
        }

        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            } else {
              resolve(canvas.toDataURL("image/jpeg", 0.7));
            }
          },
          "image/webp",
          0.8
        );
      };

      video.onerror = () => resolve(generatePlaceholderThumbnail());
      video.src = videoUrl;
    });
  }

  async function generatePlaceholderThumbnail() {
    return "https://image.nostr.build/477d78313a37287eb5613424772a14f051288ad1cbf2cdeec60e1c3052a839d4.jpg";
  }

  async function generateHash(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function validateImageUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
  }

function addVideoToUI(video) {
  const container = document.getElementById("video-metadata-list");
  const item = document.createElement("div");
  item.className = "video-item";
  item.dataset.index = video.index;

  item.innerHTML = `
    <div class="video-preview">
      <img class="video-thumbnail" alt="Video thumbnail" src="${video.thumbnail}">
      <div class="video-info">
        <p><strong>URL:</strong> <span class="video-url">${video.url}</span></p>
        <p><strong>Type:</strong> <span class="video-type">${video.type}</span></p>
        <p><strong>Size:</strong> <span class="video-size">${video.size > 0 ? `${(video.size / 1024 / 1024).toFixed(2)} MB` : "Unknown"}</span></p>
        <p><strong>Dimensions:</strong> <span class="video-dimensions">${video.dimensions}</span></p>
        <p><strong>Duration:</strong> <span class="video-duration">${video.duration?.toFixed(2)}s</span></p>
        <p><strong>Bitrate:</strong> <span class="video-bitrate">${video.bitrate?.toFixed(0)}</span></p>
        <p><strong>Hash <span class="hash-status">${video.isLightweight ? "(random)" : (video.isHashValid ? "(blossom)" : "(not blossom)")}</span>:</strong> <span class="video-hash">${video.hash}</span></p>
      </div>
    </div>
    <div class="posting-video-controls">
      <input type="text" class="thumbnail-input" placeholder="Custom image URL (optional)">
      <button type="button" class="update-thumbnail">Update Image</button>
      <button type="button" class="remove-video">Remove Video</button>
    </div>
  `;

  container.appendChild(item);
}

  function updateSelectedTagsDisplay() {
    const container = document.getElementById("selected-tags-list");
    container.innerHTML = "";

    if (selectedTags.size === 0) {
      container.innerHTML = '<span class="no-tags">No tags selected yet</span>';
      return;
    }

    selectedTags.forEach((tag) => {
      const span = document.createElement("span");
      span.className = "tag-item";
      span.innerHTML = `
        ${tag}
        <button type="button" class="remove-tag" data-tag="${tag}">×</button>
      `;
      container.appendChild(span);
    });
  }

  function updateVideoCounter() {
    const counter = document.getElementById("total-items-counter");
    counter.textContent = `Videos added: ${window.videoMetadataList.length}`;
  }

  function addCustomField() {
    const container = document.getElementById("field-container");

    const field = document.createElement("div");
    field.className = "custom-field";
    field.innerHTML = `
      <input type="text" placeholder="Field name (e.g., genre, series)" class="field-name">
      <input type="text" placeholder="Field value" class="field-value">
      <button type="button" class="remove-field">×</button>
    `;

    container.appendChild(field);

    field.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', saveFormDataToStorage);
    });
  }

function buildK21EventData() {
  const now = Math.floor(Date.now() / 1000);

  const imetaTags = window.videoMetadataList.map((video) => {
    const imetaTag = [
      "imeta",
      `url ${video.url}`,
      `x ${video.hash}`,
      `m ${video.type}`,
      `dim ${video.dimensions}`,
      `size ${video.size}`,
      `image ${video.thumbnail}`,
      `fallback ${video.url}`,
      `duration ${video.duration}`,
    ];
    
    // Add bitrate if available
    if (video.bitrate) {
      imetaTag.push(`bitrate ${video.bitrate}`);
    }
    
    return imetaTag;
  });

  const customFields = Array.from(document.querySelectorAll(".custom-field"))
    .map((field) => {
      const name = field.querySelector(".field-name").value.trim();
      const value = field.querySelector(".field-value").value.trim();
      return [name, value];
    })
    .filter(([name, value]) => name && value);

  const relayTags = Array.from(eventRelays).map((relay) => ["relay", relay]);

  const tags = [
    ["title", document.getElementById("title").value.trim()],
    ["thumb", selectedThumbnail?.trim() || ""],
    ["published_at", now.toString()],
    ["alt", document.getElementById("summary").value.trim()],
    ...imetaTags,
    ...Array.from(selectedTags).map((tag) => ["t", tag]),
    ...relayTags,
    ...customFields,
  ];

  const language = document.getElementById("language").value;
  if (language) {
    tags.push(["language", language]);
  }

  const license = document.getElementById("license").value;
  if (license) {
    if (license === "custom") {
      const customLicense = document.getElementById("custom-license").value.trim();
      if (customLicense) {
        tags.push(["license", customLicense]);
      }
    } else {
      tags.push(["license", license]);
    }
  }

  const warnings = Array.from(document.querySelectorAll('input[name="content-warning"]:checked'))
    .map(cb => {
      if (cb.value === "other") {
        const otherInput = document.getElementById("content-warning-other-input");
        return otherInput.value.trim();
      }
      return cb.value;
    })
    .filter(warning => warning !== "");

  warnings.forEach(warning => {
    tags.push(["content-warning", warning]);
  });

  return {
    kind: 21,
    created_at: now,
    content: document.getElementById("content").value.trim(),
    tags,
  };
}

  function setButtonLoading(button, isLoading, text) {
    button.disabled = isLoading;
    button.textContent = text;
    button.classList.toggle("loading", isLoading);
  }

  function updateDisplay() {
    updateSelectedTagsDisplay();
    updateVideoCounter();
  }

  function saveFormDataToStorage() {
    const formData = {
      title: document.getElementById("title").value,
      content: document.getElementById("content").value,
      summary: document.getElementById("summary").value,
      language: document.getElementById("language").value,
      license: document.getElementById("license").value,
      customLicense: document.getElementById("custom-license").value,
      contentWarnings: Array.from(document.querySelectorAll('input[name="content-warning"]:checked'))
        .map(cb => cb.value),
      selectedTags: Array.from(selectedTags),
      selectedThumbnail: selectedThumbnail,
      videoMetadataList: window.videoMetadataList,
      customFields: Array.from(document.querySelectorAll(".custom-field")).map(
        (field) => ({
          name: field.querySelector(".field-name").value.trim(),
          value: field.querySelector(".field-value").value.trim(),
        })
      ),
      selectedRelaySets: Array.from(selectedRelaySets),
      excludedRelays: Array.from(excludedRelays),
      eventRelays: Array.from(eventRelays),
      currentStep: currentStep,
      timestamp: Date.now(),
    };

    localStorage.setItem("draftVideoEvent", JSON.stringify(formData));
  }


  function loadFormDataFromStorage() {
    try {
      const saved = localStorage.getItem("draftVideoEvent");
      if (!saved) return;

      const formData = JSON.parse(saved);

      document.getElementById("title").value = formData.title || "";
      document.getElementById("content").value = formData.content || "";
      document.getElementById("summary").value = formData.summary || "";
      document.getElementById("language").value = formData.language || "";
      document.getElementById("license").value = formData.license || "";
      document.getElementById("custom-license").value = formData.customLicense || "";

      // Restore content warnings
      if (formData.contentWarnings) {
        formData.contentWarnings.forEach(warning => {
          const checkbox = document.querySelector(`input[name="content-warning"][value="${warning}"]`);
          if (checkbox) checkbox.checked = true;
        });
      }

      if (formData.selectedThumbnail) {
        selectedThumbnail = formData.selectedThumbnail;
      }      

      if (formData.selectedTags) {
        selectedTags = new Set(formData.selectedTags);
        updateSelectedTagsDisplay();
      }

      if (formData.videoMetadataList) {
        window.videoMetadataList = formData.videoMetadataList;
        formData.videoMetadataList.forEach((video) => addVideoToUI(video));
        updateVideoCounter();
      }

      if (formData.customFields) {
        formData.customFields.forEach((field) => {
          if (field.name && field.value) {
            addCustomField();
            const lastField = document.querySelector(
              "#field-container .custom-field:last-child"
            );
            lastField.querySelector(".field-name").value = field.name;
            lastField.querySelector(".field-value").value = field.value;
          }
        });
      }

      if (formData.selectedRelaySets) {
        selectedRelaySets = new Set(formData.selectedRelaySets);
        document
          .querySelectorAll('#relay-sets-list input[type="checkbox"]')
          .forEach((checkbox) => {
            checkbox.checked = selectedRelaySets.has(checkbox.value);
          });
      }

      if (formData.excludedRelays) {
        excludedRelays = new Set(formData.excludedRelays);
      }

      if (formData.eventRelays) {
        eventRelays = new Set(formData.eventRelays);
      }

      updateRelayPreview();
    } catch (error) {
      console.error("Error loading draft data:", error);
    }
  }

  function clearFormDataFromStorage() {
    localStorage.removeItem("draftVideoEvent");
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

function showVideoProgress(message, progressData = null) {
  const progressEl = document.getElementById("video-progress");
  progressEl.style.display = "block";
  progressEl.innerHTML = "";

  const progressDiv = document.createElement("div");
  progressDiv.className = "progress-status";

  if (progressData) {
    if (progressData.indeterminate) {
      progressDiv.innerHTML = `
        <div class="progress-message">${message}</div>
        <div class="progress-bar-container">
          <div class="progress-bar indeterminate">
            <div class="progress-fill"></div>
          </div>
        </div>
      `;
    } else {
      progressDiv.innerHTML = `
        <div class="progress-message">${message}</div>
        <div class="progress-info">
          <span class="progress-percentage">${progressData.percentage}%</span>
          <span class="progress-size">${formatBytes(progressData.loaded)} / ${formatBytes(progressData.total)}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressData.percentage}%"></div>
          </div>
        </div>
      `;
    }
  } else {
    progressDiv.innerHTML = `<div class="progress-message">${message}</div>`;
  }

  progressEl.appendChild(progressDiv);
}

function hideVideoProgress() {
  const progressEl = document.getElementById("video-progress");
  progressEl.style.display = "none";
}