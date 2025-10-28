async function postingPageHandler() {
  mainContent.innerHTML = `
    <div class="posting-container">
      <h1 class="posting-title">Create Event</h1>
      <p class="subtitle">publish a kind-21 video event</p>
      <div class="loading-indicator">
        <p>Loading...</p>
      </div>
    </div>
  `;

  try {
    renderMainForm();
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

function renderMainForm() {
  mainContent.innerHTML = `
    <div class="posting-container">
       <h1 class="posting-title">Create Event</h1>
      <p class="subtitle">publish a kind-21 video event</p>
      
      <div class="posting-form">
        <form id="post-form">

        <!-- Video Sources Section -->
<div class="form-section">
  <h3>Video Sources</h3>
  <div class="video-tabs">
    <button type="button" class="tab-button active" data-tab="url">Add by URL</button>
    <button type="button" class="tab-button" data-tab="upload">Upload File</button>
   <!-- <button type="button" class="tab-button" data-tab="manual">Manual imeta</button> -->
  </div>
  
<div class="tab-content active" id="url-tab">
  <div class="input-group">
    <input type="text" id="video-url" placeholder="Enter video URL (mp4, webm, etc.)">
    <button type="button" id="add-video">Add Video</button>
  </div>
  <div class="validation-options">
    <label>
      <input type="checkbox" id="lightweight-mode">
      skip blossom validation and accurate metadata
    </label>
  </div>
  <!-- Add progress display area -->
  <div id="video-progress" class="progress-container" style="display: none;"></div>
</div>


<div class="tab-content" id="upload-tab">
  <div class="upload-area">
    <!-- Temporarily disabled file upload -->
     <input type="file" id="video-upload" accept="video/*" style="display: none;">
     <button type="button" id="upload-video" class="upload-button">Choose Video File</button>
     <p class="help-text">the event just needs a direct media url from any media server, you may self host or use your preferred free/paid hosting service.</p><p class="help-text"> also check these</p>
    
    <div class="external-upload-services">
      <a href="https://blossomservers.com/" class="upload-service-link">Blossom Servers</a>
      <a href="https://npub19sstws4x9t7nua2sh6cxkeez25y6lvvnq6fqpmyzwnthsjap5tqqkdsghg.nsite.lol/" class="upload-service-link">Cherry Tree</a>
      <a href="https://bouquet.slidestr.net/" class="upload-service-link">Bouquet</a>
    </div>
         

  </div>

</div>

  




  <!--
  <div class="tab-content" id="manual-tab">
    <div class="manual-imeta-form">
      <div class="form-group">
        <label for="manual-url">Video URL*</label>
        <input type="text" id="manual-url" placeholder="https://example.com/video.mp4" required>
      </div>
      <div class="form-group">
        <label for="manual-type">MIME Type*</label>
        <input type="text" id="manual-type" placeholder="video/mp4" required>
      </div>
      <div class="form-group">
        <label for="manual-dimensions">Dimensions*</label>
        <input type="text" id="manual-dimensions" placeholder="1920x1080" required>
      </div>
      <div class="form-group">
        <label for="manual-duration">Duration (seconds)*</label>
        <input type="number" id="manual-duration" placeholder="120" step="0.1" required>
      </div>
      <div class="form-group">
        <label for="manual-hash">Hash (optional)</label>
        <input type="text" id="manual-hash" placeholder="Leave empty for random hash">
      </div>
      <div class="form-group">
        <label for="manual-thumbnail">Thumbnail URL (optional)</label>
        <input type="text" id="manual-thumbnail" placeholder="https://example.com/thumbnail.jpg">
      </div>
      <button type="button" id="add-manual-imeta">Add imeta</button>
    </div>
    <p class="help-text">Manually create an imeta entry with custom values</p>
  </div>
  -->





  <div class="video-counter">
    <span id="total-items-counter">imeta: 0</span>
  </div>
  <div id="video-metadata-list"></div>
</div>
          <!-- Basic Info Section -->
          <div class="form-section">
            <h3>Basic Information</h3>
            <div class="form-group">
              <label for="title">Title*</label>
              <input type="text" id="title" placeholder="Enter video title" required>
            </div>
            <div class="form-group">
              <label for="content">Description*</label>
              <textarea id="content" placeholder="Describe your video content" required></textarea>
            </div>
            <div class="form-group">
              <label for="summary">Summary*</label>
              <textarea id="summary" placeholder="Brief summary for accessibility" required></textarea>
            </div>
          </div>



          <!-- Tags Section -->
          <div class="form-section">
            <h3>Tags & Categories</h3>
            <div class="tags-input-group">
              <select id="tags">
                <option value="">Select a category</option>
              </select>
              <button type="button" id="add-selected-tag">Add</button>
            </div>
            <div class="tags-input-group">
              <input type="text" id="custom-category" placeholder="Add custom tag">
              <button type="button" id="add-custom-tag">Add</button>
            </div>
            <div id="selected-tags-container">
              <div id="selected-tags-list"></div>
            </div>
          </div>

          <!-- Optional Fields -->
          <div class="form-section">
            <h3>Additional Fields</h3>
            <div id="field-container"></div>
            <button type="button" id="add-field">Add Custom Field</button>
          </div>


          <!-- Relay Selection Section -->
          <div class="form-section">
            <h3>Relay Selection</h3>
            <p class="help-text">Choose which relay sets to publish to (minimum 1 required)</p>
            <div class="relay-sets-selection">
              <div id="relay-sets-list"></div>
            </div>
            <div class="selected-relays-info">
              <p><strong>Publishing to:</strong> <span id="relay-count">0</span></p>
              <div id="relay-preview" class="relay-preview"></div>
            </div>
          </div>



          <button type="submit" id="submit-button" class="submit-button">Create Event</button>
        </form>
      </div>
    </div>
  `;
}

function initializePostingPage() {
  function saveFormDataToStorage() {
    const formData = {
      title: document.getElementById("title").value,
      content: document.getElementById("content").value,
      summary: document.getElementById("summary").value,
      selectedTags: Array.from(selectedTags),
      videoMetadataList: window.videoMetadataList,
      customFields: Array.from(document.querySelectorAll(".custom-field")).map(
        (field) => ({
          name: field.querySelector(".field-name").value.trim(),
          value: field.querySelector(".field-value").value.trim(),
        })
      ),
      selectedRelaySets: Array.from(selectedRelaySets),
      excludedRelays: Array.from(excludedRelays), // Add this
      timestamp: Date.now(),
    };

    localStorage.setItem("draftVideoEvent", JSON.stringify(formData));
  }

  function loadFormDataFromStorage() {
    try {
      const saved = localStorage.getItem("draftVideoEvent");
      if (!saved) return;

      const formData = JSON.parse(saved);

      // Load basic fields
      document.getElementById("title").value = formData.title || "";
      document.getElementById("content").value = formData.content || "";
      document.getElementById("summary").value = formData.summary || "";

      // Load tags
      if (formData.selectedTags) {
        selectedTags = new Set(formData.selectedTags);
        updateSelectedTagsDisplay();
      }

      // Load video metadata
      if (formData.videoMetadataList) {
        window.videoMetadataList = formData.videoMetadataList;
        formData.videoMetadataList.forEach((video) => addVideoToUI(video));
        updateVideoCounter();
      }

      // Load custom fields
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

      // Load relay sets
      if (formData.selectedRelaySets) {
        selectedRelaySets = new Set(formData.selectedRelaySets);
        document
          .querySelectorAll('#relay-sets-list input[type="checkbox"]')
          .forEach((checkbox) => {
            checkbox.checked = selectedRelaySets.has(checkbox.value);
          });
      }

      // Load excluded relays
      if (formData.excludedRelays) {
        excludedRelays = new Set(formData.excludedRelays);
      }

      // Update relay preview after loading everything
      updateRelayPreview();
    } catch (error) {
      console.error("Error loading draft data:", error);
    }
  }
  function clearFormDataFromStorage() {
    localStorage.removeItem("draftVideoEvent");
  }

  // Initialize global state
  window.videoMetadataList = [];
  let metadataIndex = 0;
  let selectedTags = new Set();
  let selectedRelaySets = new Set([app.activeRelayList]); // Start with active relay set
  let excludedRelays = new Set();
  let activeTab = "url";

  // Initialize components
  initializeTabs();
  initializeTags();
  initializeRelaySelection();
  initializeEventListeners();

  // Load saved form data AFTER initializing components
  loadFormDataFromStorage();
  updateDisplay();

  // Add auto-save on form changes
  const formElement = document.getElementById("post-form");
  formElement.addEventListener("input", debounce(saveFormDataToStorage, 1000));
  formElement.addEventListener("change", saveFormDataToStorage);

  // Add debounce helper function
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

  function initializeTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.dataset.tab;

        // Update active states
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

    // Create checkboxes for each relay set
    Object.keys(app.relayLists).forEach((setName) => {
      const checkbox = document.createElement("div");
      checkbox.className = "relay-set-checkbox";
      checkbox.innerHTML = `
        <label>
          <input type="checkbox" value="${setName}" ${
        selectedRelaySets.has(setName) ? "checked" : ""
      }>
          <span class="relay-set-name">${setName}</span>
          <span class="relay-set-count">(${getRelayCountForSet(
            setName
          )} relays)</span>
        </label>
      `;
      relaySetsList.appendChild(checkbox);
    });

    // Add event listeners for checkboxes
    relaySetsList.addEventListener("change", handleRelaySetChange);

    // Initial update
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

      // Ensure at least one relay set is selected
      if (selectedRelaySets.size === 0) {
        event.target.checked = true;
        selectedRelaySets.add(setName);
        alert("At least one relay set must be selected");
        return;
      }

      // Clear excluded relays when relay sets change
      // (since the relay list might be different now)
      excludedRelays.clear();

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

    // Remove excluded relays
    excludedRelays.forEach((relay) => allRelays.delete(relay));

    return Array.from(allRelays);
  }

  function handleRelayRemoval(relayUrl) {
    // Add to excluded set
    excludedRelays.add(relayUrl);

    // Check if we still have at least one relay
    const remainingRelays = getSelectedRelays();
    if (remainingRelays.length === 0) {
      // If no relays left, remove from excluded and show warning
      excludedRelays.delete(relayUrl);
      alert("At least one relay must be selected for publishing");
      return;
    }

    updateRelayPreview();

    // Save to localStorage if you want this to persist
    saveFormDataToStorage();
  }

  function updateRelayPreview() {
    const selectedRelays = getSelectedRelays();
    const relayCount = document.getElementById("relay-count");
    const relayPreview = document.getElementById("relay-preview");

    relayCount.textContent = selectedRelays.length;

    if (selectedRelays.length > 0) {
      relayPreview.innerHTML = selectedRelays
        .map(
          (relay) => `
        <span class="relay-chip">
          ${relay}
          <button type="button" class="remove-relay" data-relay="${relay}" title="Remove this relay">×</button>
        </span>
      `
        )
        .join("");
    } else {
      relayPreview.innerHTML =
        '<span class="no-relays">No relays selected</span>';
    }
  }

  function initializeEventListeners() {
    // Video handling
    document
      .getElementById("add-video")
      .addEventListener("click", handleAddVideo);
    document
      .getElementById("upload-video")
      .addEventListener("click", () =>
        document.getElementById("video-upload").click()
      );
    document
      .getElementById("video-upload")
      .addEventListener("change", handleFileUpload);

    // Add this new event listener for manual imeta
    //  document.getElementById("add-manual-imeta").addEventListener("click", handleAddManualImeta);

    // Tag handling
    document
      .getElementById("add-selected-tag")
      .addEventListener("click", () => {
        const select = document.getElementById("tags");
        const value = select.value;
        if (value && !selectedTags.has(value)) {
          selectedTags.add(value);
          updateSelectedTagsDisplay();
          select.value = "";
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

    // Enter key support
    document
      .getElementById("custom-category")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          document.getElementById("add-custom-tag").click();
        }
      });

    // Form handling
    document
      .getElementById("add-field")
      .addEventListener("click", addCustomField);
    document
      .getElementById("post-form")
      .addEventListener("submit", handleFormSubmit);

    // Container delegation
    document
      .querySelector(".posting-container")
      .addEventListener("click", handleContainerClick);
  }

  function updateDisplay() {
    updateSelectedTagsDisplay();
    updateVideoCounter();
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
      // Check if lightweight mode is enabled
      const lightweightCheckbox = document.getElementById("lightweight-mode");
      const isLightweightMode = lightweightCheckbox.checked;

      // Show initial progress
      showVideoProgress("Checking video accessibility...");

      let metadata;

      if (isLightweightMode) {
        // Lightweight mode: skip blob download, just get metadata
        showVideoProgress("Getting video metadata...");
        metadata = await fetchVideoMetadata(url);
      } else {
        // Full mode: download with progress and get full metadata
        const blob = await fetchVideoWithProgress(url, (progress) => {
          if (progress.indeterminate) {
            showVideoProgress("Downloading video...", { indeterminate: true });
          } else {
            showVideoProgress("Downloading video...", progress);
          }
        });

        showVideoProgress("Extracting metadata...");
        metadata = await fetchVideoMetadata(url, blob);
      }

      metadata.index = metadataIndex++;

      showVideoProgress("Generating thumbnail...");
      metadata.thumbnail = await extractThumbnail(url);

      window.videoMetadataList.push(metadata);
      addVideoToUI(metadata);
      input.value = "";
      updateVideoCounter();

      // Save to localStorage after adding video
      saveFormDataToStorage();

      hideVideoProgress();
    } catch (error) {
      console.error("Error fetching video metadata:", error);
      hideVideoProgress();

      // Provide specific error message for content type issues
      if (error.message.includes("Expected video content")) {
        alert(
          `❌ ${error.message}\n\nPlease ensure the URL points to a video file.`
        );
      } else {
        alert("Failed to fetch video metadata. Please check the URL.");
      }
    } finally {
      setButtonLoading(button, false, "Add Video");
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (!validTypes.includes(file.type)) {
      alert("Please select a valid video file");
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
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to process video file");
    } finally {
      setButtonLoading(button, false, "Choose Video File");
    }
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
      saveFormDataToStorage(); // Save after removing video
    }

    if (target.classList.contains("update-thumbnail")) {
      handleThumbnailUpdate(target);
    }

    if (target.classList.contains("remove-tag")) {
      const tag = target.dataset.tag;
      selectedTags.delete(tag);
      updateSelectedTagsDisplay();
      saveFormDataToStorage(); // Save after removing tag
    }

    if (target.classList.contains("remove-field")) {
      target.closest(".custom-field").remove();
      saveFormDataToStorage(); // Save after removing field
    }

    // Add relay removal handler
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
    } catch {
      alert("Invalid image URL");
    }
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    const submitButton = document.getElementById("submit-button");
    const originalText = submitButton.textContent;

    if (window.videoMetadataList.length === 0) {
      alert("Please add at least one video");
      return;
    }

    // Get selected relays
    const selectedRelays = getSelectedRelays();

    if (selectedRelays.length === 0) {
      alert("Please select at least one relay set");
      return;
    }

    const eventData = buildK21EventData();

    try {
      console.log("Event data:", eventData);
      const signedVideoEvent = await handleEventSigning(eventData);
      console.log("Event signed successfully!");
    //  console.log(JSON.stringify(signedVideoEvent, null, 4));
      // Show confirmation modal with the signed event
      const shouldPublish = await confirmModal(
        "Published events can't be edited.",
        "Publish Kind-21 Event"
      );

      if (!shouldPublish) {
        console.log("Publication cancelled by user");
        return;
      }

      // Set button to publishing state after confirmation
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

          // Clear saved form data on successful publish
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

    // Helper function to reset button state
    function resetButton() {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  }


  async function fetchVideoMetadata(url) {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) throw new Error("Invalid URL");

    const size = parseInt(response.headers.get("Content-Length") || "0");
    const type = response.headers.get("Content-Type") || "video/mp4";

    // Validate content type is video
    if (!type.startsWith("video/")) {
      throw new Error(`Expected video content, but received: ${type}`);
    }

    // Check lightweight mode
    const lightweightCheckbox = document.getElementById("lightweight-mode");
    const isLightweightMode = lightweightCheckbox.checked;

    let blobHash, isHashValid, finalHash, videoMetadata;

    if (isLightweightMode) {
      // Lightweight mode: no blob download, generate random hash directly
      blobHash = null;
      isHashValid = false;
      finalHash = generateRandomHash();

      // Use estimated/default values
      videoMetadata = {
        width: 1920, // Default HD
        height: 1080,
        duration: Math.max(60, size / 1000000), // Rough estimate: 1MB ≈ 1 second
      };
    } else {
      // Full mode: download blob and validate hash
      const fullResponse = await fetch(url);
      const blob = await fullResponse.blob();

      // Always generate hash and validate
      blobHash = await generateSHA256Hash(blob);
      const hashValidation = validateHashAgainstUrl(url, blobHash);
      finalHash = hashValidation.isValid ? blobHash : generateRandomHash();
      isHashValid = hashValidation.isValid;

      // Extract actual video dimensions and duration
      videoMetadata = await extractVideoMetadata(blob);
    }

    return {
      url,
      type,
      size,
      hash: finalHash, // This will ALWAYS exist (either validated or random)
      blobHash,
      isHashValid,
      dimensions: `${videoMetadata.width}x${videoMetadata.height}`,
      duration: videoMetadata.duration,

      uploaded: Math.floor(Date.now() / 1000),
      isLightweight: isLightweightMode,
    };
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

        // Fixed thumbnail dimensions
        const thumbnailWidth = 240;
        const thumbnailHeight = 135; // 16:9 aspect ratio container

        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;

        // Fill background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);

        // Get original video dimensions
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const videoAspectRatio = videoWidth / videoHeight;
        const containerAspectRatio = thumbnailWidth / thumbnailHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoAspectRatio > containerAspectRatio) {
          // Video is wider than container - fit width, add letterbox top/bottom
          drawWidth = thumbnailWidth;
          drawHeight = thumbnailWidth / videoAspectRatio;
          offsetX = 0;
          offsetY = (thumbnailHeight - drawHeight) / 2;
        } else {
          // Video is taller than container - fit height, add pillarbox left/right
          drawHeight = thumbnailHeight;
          drawWidth = thumbnailHeight * videoAspectRatio;
          offsetX = (thumbnailWidth - drawWidth) / 2;
          offsetY = 0;
        }

        // Draw the video frame centered with proper aspect ratio
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        // Try WebP first (smaller size), fallback to JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            } else {
              // Fallback to JPEG if WebP fails
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
    return "https://i.postimg.cc/wB2qSW-MM/tn.jpg";
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

    // Create static HTML skeleton
    item.innerHTML = `
    <div class="video-preview">
      <img class="video-thumbnail" alt="Video thumbnail">
      <div class="video-info">
        <p><strong>URL:</strong> <span class="video-url"></span></p>
        <p><strong>Type:</strong> <span class="video-type"></span></p>
        <p><strong>Size:</strong> <span class="video-size"></span></p>
        <p><strong>Dimensions:</strong> <span class="video-dimensions"></span></p>
        <p><strong>Duration:</strong> <span class="video-duration"></span></p>
        <p><strong>Hash <span class="hash-status"></span>:</strong> <span class="video-hash"></span></p>
      </div>
    </div>
    <div class="posting-video-controls">
      <input type="text" class="thumbnail-input" placeholder="Custom thumbnail URL">
      <button type="button" class="update-thumbnail">Update Thumbnail</button>
      <button type="button" class="remove-video">Remove imeta</button>
    </div>
  `;

    // Safely populate dynamic content using textContent and setAttribute
    const thumbnail = item.querySelector(".video-thumbnail");
    const urlSpan = item.querySelector(".video-url");
    const typeSpan = item.querySelector(".video-type");
    const sizeSpan = item.querySelector(".video-size");
    const dimensionsSpan = item.querySelector(".video-dimensions");
    const durationSpan = item.querySelector(".video-duration");
    const hashStatusSpan = item.querySelector(".hash-status");
    const hashSpan = item.querySelector(".video-hash");

    // Set thumbnail safely
    thumbnail.src = video.thumbnail;

    // Set text content safely (prevents XSS)
    urlSpan.textContent = video.url;
    typeSpan.textContent = video.type;

    // Handle size display for manual entries
    const sizeDisplay =
      video.size > 0 ? `${(video.size / 1024 / 1024).toFixed(2)} MB` : "999";
    sizeSpan.textContent = sizeDisplay;

    dimensionsSpan.textContent = video.dimensions;
    durationSpan.textContent = video.duration?.toFixed(2) + "s";

    // Set hash status and hash value
    let statusText;
    if (video.isLightweight) {
      statusText = "(random)";
    } else {
      statusText = video.isHashValid ? "(blossom)" : "(not blossom)";
    }
    hashStatusSpan.textContent = statusText;
    hashSpan.textContent = video.hash;

    container.appendChild(item);
  }

  function updateSelectedTagsDisplay() {
    const container = document.getElementById("selected-tags-list");
    container.innerHTML = "";

    if (selectedTags.size === 0) {
      container.innerHTML = '<span class="no-tags">No tags selected</span>';
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
    counter.textContent = `imeta: ${window.videoMetadataList.length}`;
  }

  function addCustomField() {
    const container = document.getElementById("field-container");
    const index = container.children.length;

    const field = document.createElement("div");
    field.className = "custom-field";
    field.innerHTML = `
      <input type="text" placeholder="Field name" class="field-name">
      <input type="text" placeholder="Field value" class="field-value">
      <button type="button" class="remove-field">Remove</button>
    `;

    container.appendChild(field);
  }

  function buildK21EventData() {
    const now = Math.floor(Date.now() / 1000);

    // Build imeta tags with actual dimensions and validated hash
    const imetaTags = window.videoMetadataList.map((video) => [
      "imeta",
      `dim ${video.dimensions}`, // Use actual dimensions
      `size ${video.size}`,
      `url ${video.url}`,
      `x ${video.hash}`, // Use validated hash (real or random)
      `m ${video.type}`,
      `image ${video.thumbnail}`,
      `fallback ${video.url}`,
      `duration ${video.duration}`,
    ]);


    // Build custom field tags
    const customFields = Array.from(document.querySelectorAll(".custom-field"))
      .map((field) => {
        const name = field.querySelector(".field-name").value.trim();
        const value = field.querySelector(".field-value").value.trim();
        return [name, value];
      })
      .filter(([name, value]) => name && value);

    // Build relay tags from selected relays (pick 2 randomly if more than 2)
    const selectedRelays = getSelectedRelays();
    let relayTags = [];

    if (selectedRelays.length > 0) {
      if (selectedRelays.length <= 2) {
        // Use all relays if 2 or fewer
        relayTags = selectedRelays.map((relay) => ["relay", relay]);
      } else {
        // Pick 2 random relays if more than 2
        const shuffled = [...selectedRelays].sort(() => 0.5 - Math.random());
        relayTags = shuffled.slice(0, 2).map((relay) => ["relay", relay]);
      }
    }

    // Build tag array
    const tags = [
      ["title", document.getElementById("title").value],
      ["published_at", now.toString()],
      ["alt", document.getElementById("summary").value],
     
      ...imetaTags,
      ...Array.from(selectedTags).map((tag) => ["t", tag]),
      ...relayTags,
      ...customFields,
    ];

    return {
      kind: 21,
      created_at: now,
      content: document.getElementById("content").value,
      tags,
    };
  }

  function setButtonLoading(button, isLoading, text) {
    button.disabled = isLoading;
    button.textContent = text;
    button.classList.toggle("loading", isLoading);
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
          <span class="progress-size">${formatBytes(
            progressData.loaded
          )} / ${formatBytes(progressData.total)}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${
              progressData.percentage
            }%"></div>
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
