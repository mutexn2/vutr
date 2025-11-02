function constructFilterUrl(filterData) {
    const params = new URLSearchParams();
    
    // Add tags if any are selected
    if (filterData.tags && filterData.tags.length > 0) {
        params.set("t", filterData.tags.join(","));
    }
    
    // Add date filter if not default
    if (filterData.dateFilter && filterData.dateFilter !== "any") {
        params.set("date", filterData.dateFilter);
    }
    
    // Add duration if selected
    if (filterData.duration && filterData.duration.length > 0) {
        params.set("duration", filterData.duration.join(","));
    }
    
    // Add sort if not default
    if (filterData.sortBy && filterData.sortBy !== "newest") {
        params.set("sort", filterData.sortBy);
    }
    
    const queryString = params.toString();
    
    // Get the current page's base hash (everything before /params)
    const currentHash = window.location.hash;
    const baseHash = currentHash.includes('/params') 
        ? currentHash.split('/params')[0] 
        : currentHash.replace('#', '');
    
    // If no base hash, default to 'home'
    const pageBase = baseHash || 'home';
    
    return queryString ? `${pageBase}/params?${queryString}` : `${pageBase}`;
}

function parseFilterUrl() {
    const hash = window.location.hash;
    // Match any page with params, not just home
    const paramMatch = hash.match(/#([^/]+)\/params\?(.+)/);
    
    if (!paramMatch) {
        return {
            tags: [],
            dateFilter: "any",
            duration: [],
            sortBy: "newest",
        };
    }
    
    const params = new URLSearchParams(paramMatch[2]);
    
    return {
        tags: params.get("t") ? params.get("t").split(",") : [],
        dateFilter: params.get("date") || "any",
        duration: params.get("duration") ? params.get("duration").split(",") : [],
        sortBy: params.get("sort") || "newest",
    };
}

function createFilterForm(config = {}) {
  function generateChipOptions() {
    let chipOptions = "";

    // Get all tags from localStorage
    try {
      const allTags = localStorage.getItem("allTags");
      const tags = allTags ? JSON.parse(allTags) : [];

      tags.forEach((tag) => {
        let value = escapeHtml(tag.value);
        let displayName = escapeHtml(tag.displayName);
        chipOptions += `<div class="chip draggable" data-value="${value}">${displayName}</div>`;
      });
    } catch (error) {
      console.error("Error loading tags for filter:", error);
    }

    return chipOptions;
  }

  let filteringHTML = `
      <div class="filtering-container">
        <!-- Simple Mode (Default) -->
        <div class="simple-mode" id="simple-mode">
          <div class="simple-chip-bar" id="simple-chip-bar">
            <div class="chip active" data-value="all">All</div>
            ${generateChipOptions()}
          </div>
          <button type="button" id="show-advanced-filters" class="advanced-filters-toggle">
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 12H11V10H7V12ZM0 0V2H18V0H0ZM3 7H15V5H3V7Z" fill="currentColor"/>
            </svg>
            <span>Advanced Filters</span>
          </button>
        </div>
        
        <!-- Advanced Mode (Hidden by default) -->
        <div class="advanced-mode" id="advanced-mode" style="display: none;">
          <div class="advanced-mode-header">
            <h3>Advanced Filters</h3>
            <button type="button" id="hide-advanced-filters" class="close-advanced-filters">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          
          <div class="selected-chips-container">
            <div class="selected-chips" id="selected-chips">
              <span class="selected-chips-label">Selected filters:</span>
              <div class="selected-chips-list" id="selected-chips-list">
                <span class="empty-selection">None selected</span>
              </div>
              <button type="button" id="clear-all-chips" class="clear-all-btn">Clear all</button>
            </div>
          </div>
          
          <div class="chip-section">
            <h3>Categories</h3>
            <div class="chip-bar" id="advanced-chip-bar">
              <div class="chip" data-value="all">All</div>
              ${generateChipOptions()}
            </div>
          </div>
          
          <div class="filter-sort-controls">
            <div class="filter-section" style="display: none;">
              <h3>Date uploaded</h3>
              <div class="filter-options">
                <label><input type="radio" name="date-filter" value="any" checked> Any time</label>
                <label><input type="radio" name="date-filter" value="hour"> Last hour</label>
                <label><input type="radio" name="date-filter" value="today"> Today</label>
                <label><input type="radio" name="date-filter" value="week"> This week</label>
                <label><input type="radio" name="date-filter" value="month"> This month</label>
                <label><input type="radio" name="date-filter" value="year"> This year</label>
              </div>
            </div>
            
            <div class="filter-section" style="display: none;">
              <h3>Duration</h3>
              <div class="filter-options">
                <label><input type="checkbox" name="duration-filter" value="short"> Short (< 4 minutes)</label>
                <label><input type="checkbox" name="duration-filter" value="medium"> Medium (4-20 minutes)</label>
                <label><input type="checkbox" name="duration-filter" value="long"> Long (> 20 minutes)</label>
              </div>
            </div>
            
            <div class="filter-section" style="display: none;">
              <h3>Sort by</h3>
              <div class="filter-options">
                <select id="sort-selector">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>
            
            <div class="filter-actions">
              <button type="button" id="reset-filters" class="reset-filters">Reset all</button>
              <button type="button" id="apply-filters" class="apply-filters">Apply filters</button>
            </div>
          </div>
        </div>
      </div>
    `;

  let filterElement = createElementFromHTML(filteringHTML);

  setupFilterHandlers(filterElement);

  return filterElement;
}

function setupFilterHandlers(filterElement) {
  let simpleMode = filterElement.querySelector("#simple-mode");
  let advancedMode = filterElement.querySelector("#advanced-mode");
  let simpleChipBar = filterElement.querySelector("#simple-chip-bar");
  let advancedChipBar = filterElement.querySelector("#advanced-chip-bar");
  let selectedChipsList = filterElement.querySelector("#selected-chips-list");
  let selectedChips = new Set();

  filterElement._selectedChips = selectedChips;

  filterElement
    .querySelector("#show-advanced-filters")
    .addEventListener("click", () => {
      simpleMode.style.display = "none";
      advancedMode.style.display = "block";

      syncChipSelections(simpleChipBar, advancedChipBar);
      updateSelectedChipsDisplay();
    });

  filterElement
    .querySelector("#hide-advanced-filters")
    .addEventListener("click", () => {
      advancedMode.style.display = "none";
      simpleMode.style.display = "flex";

      syncChipSelections(advancedChipBar, simpleChipBar);
    });

  simpleChipBar.addEventListener("click", (event) => {
    let chip = event.target.closest(".chip");
    if (!chip) return;

    simpleChipBar
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    let chipValue = chip.dataset.value;
    let filterData = {
      tags: chipValue === "all" ? [] : [chipValue],
      dateFilter: "any",
      duration: [],
      sortBy: "newest",
    };

    console.log("Simple filter query:", filterData);

    // Navigate to the filtered URL
    window.location.hash = constructFilterUrl(filterData);
  });

  advancedChipBar.addEventListener("click", (event) => {
    let chip = event.target.closest(".chip");
    if (!chip) return;

    let chipValue = chip.dataset.value;

    if (chipValue === "all") {
      selectedChips.clear();
      advancedChipBar
        .querySelectorAll(".chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      updateSelectedChipsDisplay();
      return;
    }

    let allChip = advancedChipBar.querySelector('.chip[data-value="all"]');
    if (allChip) {
      allChip.classList.remove("active");
    }

    if (chip.classList.contains("active")) {
      chip.classList.remove("active");
      selectedChips.delete(chipValue);
    } else {
      chip.classList.add("active");
      selectedChips.add(chipValue);
    }

    updateSelectedChipsDisplay();
  });

  selectedChipsList.addEventListener("click", (event) => {
    let removeBtn = event.target.closest(".remove-chip");
    if (!removeBtn) return;

    let value = removeBtn.dataset.value;
    selectedChips.delete(value);

    let originalChip = advancedChipBar.querySelector(
      `.chip[data-value="${value}"]`
    );
    if (originalChip) {
      originalChip.classList.remove("active");
    }

    updateSelectedChipsDisplay();
  });

  filterElement
    .querySelector("#clear-all-chips")
    .addEventListener("click", () => {
      selectedChips.clear();
      advancedChipBar
        .querySelectorAll(".chip")
        .forEach((c) => c.classList.remove("active"));

      let allChip = advancedChipBar.querySelector('.chip[data-value="all"]');
      if (allChip) {
        allChip.classList.add("active");
      }

      updateSelectedChipsDisplay();
    });

  filterElement
    .querySelector("#apply-filters")
    .addEventListener("click", () => {
      let queryObject = {
        tags: Array.from(selectedChips),
        dateFilter:
          filterElement.querySelector('input[name="date-filter"]:checked')
            ?.value || "any",
        duration: Array.from(
          filterElement.querySelectorAll(
            'input[name="duration-filter"]:checked'
          )
        ).map((cb) => cb.value),
        sortBy: filterElement.querySelector("#sort-selector").value,
      };

      console.log("Advanced filter query:", queryObject);

      // Navigate to the filtered URL
      window.location.hash = constructFilterUrl(queryObject);

      // Close advanced mode
      advancedMode.style.display = "none";
      simpleMode.style.display = "flex";

      // Show visual indicator if filters are applied
      if (
        selectedChips.size > 0 ||
        queryObject.dateFilter !== "any" ||
        queryObject.duration.length > 0 ||
        queryObject.sortBy !== "newest"
      ) {
        filterElement
          .querySelector(".advanced-filters-toggle")
          .classList.add("filters-applied");
      } else {
        filterElement
          .querySelector(".advanced-filters-toggle")
          .classList.remove("filters-applied");
      }
    });

  filterElement
    .querySelector("#reset-filters")
    .addEventListener("click", () => {
      selectedChips.clear();
      advancedChipBar
        .querySelectorAll(".chip")
        .forEach((c) => c.classList.remove("active"));
      let allChip = advancedChipBar.querySelector('.chip[data-value="all"]');
      if (allChip) {
        allChip.classList.add("active");
      }

      let anyTimeRadio = filterElement.querySelector(
        'input[name="date-filter"][value="any"]'
      );
      if (anyTimeRadio) {
        anyTimeRadio.checked = true;
      }

      filterElement
        .querySelectorAll('input[name="duration-filter"]')
        .forEach((cb) => {
          cb.checked = false;
        });

      filterElement.querySelector("#sort-selector").value = "newest";

      updateSelectedChipsDisplay();
    });

  enableDragScroll(simpleChipBar);
  enableWheelScroll(simpleChipBar);
  enableDragScroll(advancedChipBar);
  enableWheelScroll(advancedChipBar);

  let simpleAllChip = simpleChipBar.querySelector('.chip[data-value="all"]');
  let advancedAllChip = advancedChipBar.querySelector(
    '.chip[data-value="all"]'
  );

  if (simpleAllChip) simpleAllChip.classList.add("active");
  if (advancedAllChip) advancedAllChip.classList.add("active");

  function syncChipSelections(sourceBar, targetBar) {
    targetBar.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.remove("active");
    });

    sourceBar.querySelectorAll(".chip.active").forEach((activeChip) => {
      let value = activeChip.dataset.value;
      let targetChip = targetBar.querySelector(`.chip[data-value="${value}"]`);
      if (targetChip) {
        targetChip.classList.add("active");
      }
    });
  }

  function updateSelectedChipsDisplay() {
    if (selectedChips.size === 0) {
      selectedChipsList.innerHTML =
        '<span class="empty-selection">None selected</span>';
      return;
    }

    let chipsHTML = "";
    selectedChips.forEach((value) => {
      let originalChip = advancedChipBar.querySelector(
        `.chip[data-value="${value}"]`
      );
      let displayName = originalChip ? originalChip.textContent : value;

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
}

// Helper functions
function getDateFilterTimestamp(dateFilter) {
  const now = Math.floor(Date.now() / 1000);

  switch (dateFilter) {
    case "hour":
      return now - 60 * 60;
    case "today":
      return now - 24 * 60 * 60;
    case "week":
      return now - 7 * 24 * 60 * 60;
    case "month":
      return now - 30 * 24 * 60 * 60;
    case "year":
      return now - 365 * 24 * 60 * 60;
    default:
      return null;
  }
}

function applySorting(videos, sortBy) {
  switch (sortBy) {
    case "oldest":
      return videos.sort((a, b) => a.created_at - b.created_at);
    case "newest":
    default:
      return videos.sort((a, b) => b.created_at - a.created_at);
  }
}

function getVideoTitle(video) {
  // Extract title from video object - adjust based on your video structure
  return video.title || video.content || "Untitled";
}

function initializeFilterFromUrl(filterForm, filterParams) {
  // Set active chips based on URL params
  const simpleChipBar = filterForm.querySelector("#simple-chip-bar");
  const advancedChipBar = filterForm.querySelector("#advanced-chip-bar");

  // Clear all active chips first
  simpleChipBar
    .querySelectorAll(".chip")
    .forEach((chip) => chip.classList.remove("active"));
  advancedChipBar
    .querySelectorAll(".chip")
    .forEach((chip) => chip.classList.remove("active"));

  // We need to access the selectedChips Set from the setupFilterHandlers closure
  // The easiest way is to expose it on the filterForm element
  const selectedChips = filterForm._selectedChips || new Set();
  filterForm._selectedChips = selectedChips;

  if (filterParams.tags.length === 0) {
    // Activate "All" chip
    simpleChipBar
      .querySelector('.chip[data-value="all"]')
      ?.classList.add("active");
    advancedChipBar
      .querySelector('.chip[data-value="all"]')
      ?.classList.add("active");
    // ** Clear selectedChips when "All" is active**
    selectedChips.clear();
  } else {
    // Activate selected tags
    filterParams.tags.forEach((tag) => {
      simpleChipBar
        .querySelector(`.chip[data-value="${tag}"]`)
        ?.classList.add("active");
      advancedChipBar
        .querySelector(`.chip[data-value="${tag}"]`)
        ?.classList.add("active");
      // **Add tags to selectedChips Set**
      selectedChips.add(tag);
    });
  }

  // ** Update the selected chips display**
  updateSelectedChipsDisplay(filterForm);

  // Set date filter
  const dateRadio = filterForm.querySelector(
    `input[name="date-filter"][value="${filterParams.dateFilter}"]`
  );
  if (dateRadio) {
    dateRadio.checked = true;
  }

  // Set duration filters
  filterParams.duration.forEach((duration) => {
    const durationCheckbox = filterForm.querySelector(
      `input[name="duration-filter"][value="${duration}"]`
    );
    if (durationCheckbox) {
      durationCheckbox.checked = true;
    }
  });

  // Set sort option
  const sortSelect = filterForm.querySelector("#sort-selector");
  if (sortSelect) {
    sortSelect.value = filterParams.sortBy;
  }

  // Show visual indicator if filters are applied
  if (
    filterParams.tags.length > 0 ||
    filterParams.dateFilter !== "any" ||
    filterParams.duration.length > 0 ||
    filterParams.sortBy !== "newest"
  ) {
    filterForm
      .querySelector(".advanced-filters-toggle")
      ?.classList.add("filters-applied");
  }
}

function updateSelectedChipsDisplay(filterForm) {
  const selectedChipsList = filterForm.querySelector("#selected-chips-list");
  const advancedChipBar = filterForm.querySelector("#advanced-chip-bar");
  const selectedChips = filterForm._selectedChips;

  if (!selectedChips || selectedChips.size === 0) {
    selectedChipsList.innerHTML =
      '<span class="empty-selection">None selected</span>';
    return;
  }

  let chipsHTML = "";
  selectedChips.forEach((value) => {
    let originalChip = advancedChipBar.querySelector(
      `.chip[data-value="${value}"]`
    );
    let displayName = originalChip ? originalChip.textContent : value;

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
