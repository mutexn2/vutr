async function tagPageHandler() {
  // Parse URL for parameters
  const hash = window.location.hash;
  const hashParts = hash.split("/");

  let selectedTags = [];
  let sortBy = "date";
  let limit = 21;

  // Check if we have parameters
  if (hashParts.length > 1 && hashParts[1].startsWith("params")) {
    const queryStart = hashParts[1].indexOf("?");
    const queryString =
      queryStart !== -1 ? hashParts[1].slice(queryStart + 1) : "";

    const params = new URLSearchParams(queryString);
    selectedTags = params.get("tags")
      ? params
          .get("tags")
          .split(",")
          .map((tag) => tag.trim())
      : [];
    sortBy = params.get("sort") || "date";
    limit = parseInt(params.get("limit")) || 21;
  }

  // Update the title to show selected tags
  const titleText =
    selectedTags.length > 0
      ? `${selectedTags.join(", ")}`
      : "Discovering Videos";

  function getAllTags() {
    try {
      const allTags = localStorage.getItem("allTags");
      return allTags ? JSON.parse(allTags) : [];
    } catch (error) {
      console.error("Error loading tags:", error);
      return [];
    }
  }

  function saveAllTags(tags) {
    try {
      localStorage.setItem("allTags", JSON.stringify(tags));
      updateDrawerContent();
    } catch (error) {
      console.error("Error saving tags:", error);
    }
  }

function generateChipGrid(isEditMode = false) {
  let chipOptions = "";
  const allTags = getAllTags();
  allTags.forEach((tag) => {
    let value = escapeHtml(tag.value);
    let displayName = escapeHtml(tag.displayName);

    chipOptions += `
    <div class="chip" data-value="${value}">
      <span class="chip-text">${displayName}</span>
      ${
        isEditMode
          ? `<button class="remove-tag" data-value="${value}">×</button>`
          : ""
      }
    </div>
  `;
  });
  return chipOptions;
}



  mainContent.innerHTML = `
  <div id="tagPage-container">
    <p class="tag-title-label">Videos Tagged:</p>
    <h1 class="tagPage-title">${titleText}</h1>

    <!-- Tag Filter Section -->
    <div class="filtering-container">
      <div class="advanced-mode" style="display: block">
        <!-- Collapsible Tags Grid Section -->
        <div class="chip-section-header" id="chip-section-header">
          <h3>Tags</h3>
          <div class="header-controls">
            <button type="button" id="toggle-tags" class="toggle-tags-btn">
              <svg
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                class="chevron-icon"
              >
                <path
                  d="M1 1L6 6L11 1"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Selected Tags Display -->

        <div class="chip-grid-container" id="chip-grid-container">
          <div class="selected-chips-container">
            <div class="selected-chips" id="selected-chips">
              <span class="selected-chips-label">Selected filters:</span>
              <div class="selected-chips-list" id="selected-chips-list">
                <span class="empty-selection">None selected</span>
              </div>
              <button type="button" id="clear-all-chips" class="clear-all-btn">
                Clear all
              </button>
            </div>
          </div>

          <div class="chip-grid" id="tag-chip-grid">
            <div class="chip" data-value="all">All</div>
            ${generateChipGrid()}
          </div>
          <!-- Add Custom Tag Section -->
          <div class="add-tag-section">
            <div class="add-tag-controls">
              <input
                type="text"
                id="custom-tag-input"
                placeholder="Add custom tag..."
              />
              <button type="button" id="add-tag-btn" class="add-tag-button">
                Add Tag
              </button>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end">
            <button type="button" id="edit-tags-btn" class="edit-tags-btn">
              Edit Mode
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="loading-indicator">
      <p>Searching for video events...</p>
    </div>
    </div>
  `;

  let pageContainer = document.getElementById("tagPage-container");
  // Set up chip grid functionality
  const tagChipGrid = document.getElementById("tag-chip-grid");
  const clearAllBtn = document.getElementById("clear-all-chips");
  const selectedChipsList = document.getElementById("selected-chips-list");
  const customTagInput = document.getElementById("custom-tag-input");
  const addTagBtn = document.getElementById("add-tag-btn");
  const toggleTagsBtn = document.getElementById("toggle-tags");
  const chipGridContainer = document.getElementById("chip-grid-container");

  let activeTagsSet = new Set(selectedTags);
  let isTagsExpanded = selectedTags.length === 0;

  // Initialize chip states and selected chips display
  updateChipStates();
  updateSelectedChipsDisplay();

  // Initialize the UI based on the state
  if (isTagsExpanded) {
    chipGridContainer.style.display = "block";
    toggleTagsBtn.classList.remove("collapsed");
  } else {
    chipGridContainer.style.display = "none";
    toggleTagsBtn.classList.add("collapsed");
  }

  // Initialize add tag section as hidden since we start in non-edit mode
  const addTagSection = document.querySelector(".add-tag-section");
  addTagSection.style.display = "none";

  let isEditMode = false;
  const editTagsBtn = document.getElementById("edit-tags-btn");

  // Edit mode toggle functionality
  editTagsBtn.addEventListener("click", (event) => {
    event.stopPropagation(); // Prevent triggering the header click
    isEditMode = !isEditMode;

    // Update button text
    editTagsBtn.textContent = isEditMode
      ? "Exit Edit Mode"
      : "Edit Mode";
    editTagsBtn.classList.toggle("active", isEditMode);

    // Refresh the chip grid with new edit mode state
    refreshChipGrid();

    // Show/hide the add tag section based on edit mode
    const addTagSection = document.querySelector(".add-tag-section");
    addTagSection.style.display = isEditMode ? "block" : "none";
  });

  // Make the entire chip section header clickable
  const chipSectionHeader = document.getElementById("chip-section-header");
  chipSectionHeader.addEventListener("click", (event) => {
    // Don't toggle if clicking on the edit button or its contents
    if (event.target.closest("#edit-tags-btn")) return;

    isTagsExpanded = !isTagsExpanded;
    if (isTagsExpanded) {
      chipGridContainer.style.display = "block";
      toggleTagsBtn.classList.remove("collapsed");
    } else {
      chipGridContainer.style.display = "none";
      toggleTagsBtn.classList.add("collapsed");
    }
  });

  tagChipGrid.addEventListener("click", (event) => {
    // Handle remove tag button
    if (event.target.classList.contains("remove-tag")) {
      event.stopPropagation();
      const tagValue = event.target.dataset.value;
      removeTag(tagValue);
      return;
    }

    const chip = event.target.closest(".chip");
    if (!chip) return;

    const chipValue = chip.dataset.value;

    if (chipValue === "all") {
      // Clear all tags and go to base tag page
      activeTagsSet.clear();
      updateChipStates();
      updateSelectedChipsDisplay();
      window.location.hash = "#tag";
      return;
    }

    // Toggle tag selection
    if (activeTagsSet.has(chipValue)) {
      // Remove tag
      activeTagsSet.delete(chipValue);
    } else {
      // Add tag
      activeTagsSet.add(chipValue);
    }

    updateChipStates();
    updateSelectedChipsDisplay();

    // Update URL
    if (activeTagsSet.size > 0) {
      const tagsArray = Array.from(activeTagsSet);
      window.location.hash = `#tag/params?tags=${tagsArray.join(",")}`;
    } else {
      window.location.hash = "#tag";
    }
  });

  function removeTag(tagValue) {
    const allTags = getAllTags();
    const filteredTags = allTags.filter((tag) => tag.value !== tagValue);
    saveAllTags(filteredTags);

    // Remove from active tags if selected
    activeTagsSet.delete(tagValue);

    // Refresh the chip grid
    refreshChipGrid();
    updateSelectedChipsDisplay();

    // Update URL if needed
    if (activeTagsSet.size > 0) {
      const tagsArray = Array.from(activeTagsSet);
      window.location.hash = `#tag/params?tags=${tagsArray.join(",")}`;
    } else {
      window.location.hash = "#tag";
    }
  }

  // Handle selected chips removal
  selectedChipsList.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".remove-chip");
    if (!removeBtn) return;

    const value = removeBtn.dataset.value;
    activeTagsSet.delete(value);

    updateChipStates();
    updateSelectedChipsDisplay();

    // Update URL
    if (activeTagsSet.size > 0) {
      const tagsArray = Array.from(activeTagsSet);
      window.location.hash = `#tag/params?tags=${tagsArray.join(",")}`;
    } else {
      window.location.hash = "#tag";
    }
  });

  // Clear all button functionality
  clearAllBtn.addEventListener("click", () => {
    activeTagsSet.clear();
    updateChipStates();
    updateSelectedChipsDisplay();
    window.location.hash = "#tag";
  });

  const handleAddTag = () => {
    const tagValue = customTagInput.value.trim().toLowerCase();
    if (!tagValue) return;

    // Check if tag already exists
    const allTags = getAllTags();
    if (allTags.some((tag) => tag.value === tagValue)) {
      alert("Tag already exists!");
      customTagInput.value = "";
      return;
    }

    // Add new tag to all tags
    const newTag = {
      value: tagValue,
      displayName: tagValue.charAt(0).toUpperCase() + tagValue.slice(1),
      isStatic: false, // Mark as user-added
    };

    const updatedTags = [...allTags, newTag];
    saveAllTags(updatedTags);

    // Refresh the chip grid
    refreshChipGrid();
    customTagInput.value = "";
  };

  addTagBtn.addEventListener("click", handleAddTag);
  customTagInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleAddTag();
    }
  });

  // Refresh chip grid
  function refreshChipGrid() {
    tagChipGrid.innerHTML = `
    <div class="chip" data-value="all">All</div>
    ${generateChipGrid(isEditMode)}
  `;
    updateChipStates();
  }

  // Function to update chip visual states
  function updateChipStates() {
    const allChip = tagChipGrid.querySelector('.chip[data-value="all"]');
    const tagChips = tagChipGrid.querySelectorAll(
      '.chip:not([data-value="all"])'
    );

    // Reset all chips
    tagChips.forEach((chip) => chip.classList.remove("active"));

    if (activeTagsSet.size === 0) {
      // No tags selected, highlight "All"
      allChip.classList.add("active");
    } else {
      // Remove "All" highlight and highlight selected tags
      allChip.classList.remove("active");
      activeTagsSet.forEach((tagValue) => {
        const chip = tagChipGrid.querySelector(
          `.chip[data-value="${tagValue}"]`
        );
        if (chip) {
          chip.classList.add("active");
        }
      });
    }
  }

  // Function to update selected chips display
  function updateSelectedChipsDisplay() {
    if (activeTagsSet.size === 0) {
      selectedChipsList.innerHTML =
        '<span class="empty-selection">None selected</span>';
      return;
    }

    let chipsHTML = "";
    const allTags = getAllTags();
    activeTagsSet.forEach((value) => {
      const tag = allTags.find((t) => t.value === value);
      const displayName = tag ? tag.displayName : value;

      chipsHTML += `
        <div class="selected-chip">
          ${escapeHtml(displayName)}
          <button type="button" class="remove-chip" data-value="${escapeHtml(
            value
          )}">×</button>
        </div>
      `;
    });

    selectedChipsList.innerHTML = chipsHTML;
  }

  try {
    let kinds = [21];

    // Prepare query options
    let queryOptions = { kinds: kinds, limit: limit };

    // Add "t" tags if they exist
    if (selectedTags.length > 0) {
      queryOptions.tags = { t: selectedTags };
    }

    let videos = await NostrClient.getEvents(queryOptions);
    videos = videos.map(sanitizeNostrEvent).filter((v) => v !== null);

    if (videos.length === 0) {
      const noResultsText =
        selectedTags.length > 0
          ? `No videos found with tags: ${selectedTags.join(", ")}`
          : "No kind-21 video events were found on the connected relays.";

      // Update only the loading indicator, keep the form
      pageContainer.querySelector(".loading-indicator").innerHTML = `
        <h2>No Videos Found</h2>
        <p>${noResultsText}</p>
      `;
      return;
    }

    // Sort videos based on sortBy parameter
    if (sortBy === "date") {
      videos.sort((a, b) => b.created_at - a.created_at);
    }

    console.log("~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.");
    console.log(`Found ${videos.length} videos with tags:`, selectedTags);

    // Replace loading indicator with results, keep the form
    pageContainer.querySelector(".loading-indicator").outerHTML = `
      <div class="videos-grid"></div>
    `;

    const vlist = pageContainer.querySelector(".videos-grid");
    videos.forEach((video) => {
      const card = createVideoCard(video);
      vlist.appendChild(card);
    });

    vlist.addEventListener("click", (event) => {
      const card = event.target.closest(".video-card");
      if (card && card.dataset.videoId) {
        //  window.location.hash = `#watch/${card.dataset.videoId}`;
        discoveryRelays = app.relays.slice(0, 3).map(cleanRelayUrl);

        const watchUrl = `#watch/params?v=${card.dataset.videoId}&discovery=${discoveryRelays}`;

        console.log("Navigating to watch URL:", watchUrl);
        window.location.hash = watchUrl;
      }
    });
  } catch (error) {
    console.error("Error rendering tag page:", error);
    let errorDiv = pageContainer.createElement("div");
    errorDiv.innerHTML = safeHtml`
      <h1>404</h1>
      <div class="loading-indicator">
        <p>Error rendering tag page: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
    mainContent.replaceChildren(errorDiv);
  }
}
