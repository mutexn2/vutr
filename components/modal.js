let originalScrollY = 0;

function openModal(options = {}) {
  // Close any existing modal first
  closeModal();

  const {
    content = '',
    title = '',
    size = 'medium',
    onClose = null,
    closeOnOverlay = true,
    showCloseButton = true,
    customClass = ''
  } = options;

  // Lock body scroll - store current position
  originalScrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${originalScrollY}px`;
  document.body.style.width = '100%';
  document.body.classList.add('modal-open');

  // Size classes
  const sizeClass = `modal-${size}`;

  // Create modal HTML
  const modalHTML = `
    <div class="universal-modal ${sizeClass} ${customClass}">
      <div class="universal-modal-content">
        ${showCloseButton ? '<span class="close-modal">&times;</span>' : ''}
        ${title ? `<h3 class="modal-title">${escapeHtml(title)}</h3>` : ''}
        <div class="modal-body">
          ${content}
        </div>
      </div>
    </div>
  `;

  // Insert into DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modalElement = document.querySelector('.universal-modal:last-child');

  // Only push history state if we don't already have a modal state
  const currentState = history.state;
  if (!currentState?.modal) {
    history.pushState({ modal: true }, '');
  }

  // Store modal reference
  app.modal = {
    element: modalElement,
    onClose: onClose,
    hasHistoryEntry: !currentState?.modal // Track if we added a history entry
  };

  // Show modal
  modalElement.style.display = 'block';

  // Setup event handlers
  if (showCloseButton) {
    modalElement.querySelector('.close-modal').addEventListener('click', closeModal);
  }

  if (closeOnOverlay) {
    modalElement.addEventListener('click', (e) => {
      if (e.target === modalElement) {
        closeModal();
      }
    });
  }

  return modalElement;
}

function closeModal() {
  if (!app.modal?.element) return;
  
  const { element, onClose, hasHistoryEntry } = app.modal;
  
  // If we added a history entry, remove it by going back
  if (hasHistoryEntry && history.state?.modal) {
    history.back();
  }
  
  // Restore body scroll
  document.body.classList.remove('modal-open');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, originalScrollY);

  // Check if element still exists in DOM before removing
  if (element && document.body.contains(element)) {
    element.remove();
  }

  if (typeof onClose === 'function') {
    onClose();
  }

  app.modal = null;
}


// This should be added only once when app starts
window.addEventListener('popstate', (event) => {
  // Handle regular modal
  if (app.modal?.element && event.state?.modal !== true) {
    closeModal();
  }
  // Handle QR modal
  else if (app.qrModal?.element && event.state?.modal !== true) {
    // Close QR modal
    document.body.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, originalScrollY);
    
    if (app.qrModal.element && document.body.contains(app.qrModal.element)) {
      app.qrModal.element.remove();
    }
    
    app.qrModal = null;
  }
});

// ESC key handler for closing modals
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' || event.keyCode === 27) {
    // Close regular modal if open
    if (app.modal?.element) {
      closeModal();
    }
    // Close QR modal if open
    else if (app.qrModal?.element) {
      // Use the same closing logic as QR modal
      if (app.qrModal.hasHistoryEntry && history.state?.modal) {
        history.back();
      }
      
      document.body.classList.remove('modal-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, originalScrollY);
      
      if (app.qrModal.element && document.body.contains(app.qrModal.element)) {
        app.qrModal.element.remove();
      }
      
      app.qrModal = null;
    }
  }
});
/////////////////////////
// modal
function openQrModal(options = {}) {
  let {
    title = "QR Code",
    contentType = "current-url", // 'current-url', 'custom-input', or 'direct-text'
    initialUrl = window.location.href,
    initialText = "",
    showTextInput = false,
    customInputLabel = "Add custom text:",
    generateImmediately = true,
  } = options;

  // Sanitize inputs that will be inserted into HTML
  let safeTitle = escapeHtml(title);
  let safeCustomInputLabel = escapeHtml(customInputLabel);
  let safeInitialUrl = escapeHtml(initialUrl);
  let safeInitialText = escapeHtml(initialText);

  // Determine what content to display initially in the QR code
  let initialContent = "";
  let initialInputValue = "";

  if (contentType === "current-url") {
    initialContent = safeInitialUrl;
    initialInputValue = safeInitialUrl;
  } else if (contentType === "direct-text") {
    initialContent = safeInitialText;
    initialInputValue = safeInitialText;
  }

  let modalHTML = `
    <div class="qr-modal">
      <div class="qr-modal-content">
        <span class="close-modal">&times;</span>
        <h3>${safeTitle}</h3>
        ${
          showTextInput
            ? `
          <div class="input-container">
            <label for="customText">${safeCustomInputLabel}</label>
            <input type="text" id="customText" placeholder="Enter your text" maxlength="255">
            <button id="generateQrBtn">Generate QR Code</button>
          </div>
        `
            : ""
        }
        <div class="qr-container" id="qrCodeDisplay" ${
          !generateImmediately ? 'style="display: none;"' : ""
        }>
          ${
            generateImmediately
              ? generateQrCode(initialContent)
              : "<!-- QR will be generated on demand -->"
          }
        </div>
        <div class="url-container" ${
          !generateImmediately ? 'style="display: none;"' : ""
        }>
          <input type="text" id="fullUrl" value="${initialInputValue}" readonly>
          <button id="copyUrlBtn">Copy</button>
        </div>
      </div>
    </div>
  `;

  // Lock body scroll
  originalScrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${originalScrollY}px`;
  document.body.style.width = '100%';
  document.body.classList.add('modal-open');

  // Insert modal into DOM
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Get modal elements and show modal
  let modal = document.querySelector(".qr-modal");
  modal.style.display = "block";

  // Only push history state if we don't already have a modal state
  const currentState = history.state;
  const hasHistoryEntry = !currentState?.modal;
  if (hasHistoryEntry) {
    history.pushState({ modal: true }, '');
  }

  // Store modal reference for back button handling
  app.qrModal = {
    element: modal,
    hasHistoryEntry: hasHistoryEntry
  };

  // Set up event handlers with unlock on close
  setupModalHandlers(modal, initialUrl, showTextInput, contentType);

  return modal;
}

function setupModalHandlers(modal, initialUrl, showTextInput, contentType) {
  let closeBtn = modal.querySelector(".close-modal");

const closeQrModal = () => {
  if (!app.qrModal?.element) return;

  // If we added a history entry, remove it by going back
  if (app.qrModal.hasHistoryEntry && history.state?.modal) {
    history.back();
  }

  // Restore body scroll
  document.body.classList.remove('modal-open');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, originalScrollY);

  // Remove modal from DOM
  if (modal && document.body.contains(modal)) {
    modal.remove();
  }

  app.qrModal = null;
};

  closeBtn.addEventListener("click", closeQrModal);
  
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeQrModal();
    }
  });
  
  let copyBtn = modal.querySelector("#copyUrlBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      let urlInput = modal.querySelector("#fullUrl");
      let textToCopy = urlInput.value;

      try {
        await navigator.clipboard.writeText(textToCopy);

        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 2000);
      } catch (err) {
        console.error("Failed to copy: ", err);
        alert("Failed to copy text. Please try again.");
      }
    });
  }

  // Custom text input handling
  if (showTextInput) {
    let generateBtn = modal.querySelector("#generateQrBtn");
    generateBtn.addEventListener("click", () => {
      let customText = modal.querySelector("#customText").value.trim();
      if (!customText) {
        alert("Please enter some text");
        return;
      }

      // Add validation for custom text
      if (customText.length > 255) {
        alert("Text is too long. Maximum 255 characters allowed.");
        return;
      }

      // Optional: Add URL validation if expecting URLs
      let urlPattern = /^[a-zA-Z0-9-_/.]+$/;
      if (!urlPattern.test(customText)) {
        alert(
          "Only alphanumeric characters, hyphens, underscores, periods, and slashes are allowed."
        );
        return;
      }

      let fullContent = "";

      if (contentType === "custom-input") {
        // Get base URL and combine with custom text
        let baseURL = initialUrl.substring(0, initialUrl.lastIndexOf("/") + 1);
        fullContent = baseURL + encodeURIComponent(customText); // Encode the user input
      } else {
        fullContent = customText;
      }

      // Update QR code and URL display with sanitized content
      modal.querySelector("#qrCodeDisplay").innerHTML =
        generateQrCode(fullContent);
      modal.querySelector("#qrCodeDisplay").style.display = "block";

      modal.querySelector("#fullUrl").value = fullContent;
      modal.querySelector(".url-container").style.display = "flex";
    });
  }
}

function generateQrCode(url) {
  let matrix = QrCode.generate(url);
  let qrLog = QrCode.render("medium", matrix);
  console.log(qrLog);
  let qrSvgUri = QrCode.render("svg-uri", matrix);
  return `<img src="${qrSvgUri}" alt="QR Code">`;
}







///////////////////////////


///////////more modals (examples, not used)

// Simple text modal
function openTextModal(text, title = "Information") {
  return openModal({
    id: "text-info",
    title: title,
    content: `<div class="text-modal-content"><p>${escapeHtml(
      text
    )}</p></div>`,
    size: "medium",
  });
}

// Settings modal
function openSettingsModal() {
  return openModal({
    id: "settings",
    title: "Settings",
    content: `
      <div class="settings-content">
        <div class="setting-item">
          <label><input type="checkbox" id="darkMode"> Dark Mode</label>
        </div>
        <div class="setting-item">
          <label><input type="checkbox" id="autoPlay"> Auto-play videos</label>
        </div>
        <div class="modal-actions">
          <button onclick="closeModal()">Close</button>
        </div>
      </div>
    `,
    size: "medium",
  });
}


////////////////////////////////////////////
// =============================================================================
// COMMON MODAL TEMPLATES (reuse these across your app)
// =============================================================================

/**
 * Simple confirmation modal
 * @param {string} message - Confirmation message
 * @param {string} [title='Confirm'] - Modal title
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if canceled
 */
function confirmModal(message, title = 'Confirm') {
  return new Promise((resolve) => {
    const content = `
      <div class="confirm-modal">
        <p>${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn-secondary" id="confirmCancel">Cancel</button>
          <button class="btn-primary" id="confirmOk">Confirm</button>
        </div>
      </div>
    `;

    const modal = openModal({
      title,
      content,
      size: 'small',
      onClose: () => resolve(false)
    });

    modal.querySelector('#confirmOk').addEventListener('click', () => {
      resolve(true);
      closeModal();
    });

    modal.querySelector('#confirmCancel').addEventListener('click', () => {
      resolve(false);
      closeModal();
    });
  });
}

/**
 * Simple alert modal
 * @param {string} message - Message to display
 * @param {string} [title='Notice'] - Modal title
 */
function alertModal(message, title = 'Notice') {
  const content = `
    <div class="alert-modal">
      <p>${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button class="btn-primary" id="alertOk">OK</button>
      </div>
    </div>
  `;

  const modal = openModal({
    title,
    content,
    size: 'small'
  });

  modal.querySelector('#alertOk').addEventListener('click', closeModal);
}




// =============================================================================
// ADDITIONAL MODAL TYPES
// =============================================================================

/**
 * Opens a confirmation modal
 */
function openConfirmModal(options = {}) {
  let {
    message = "Are you sure?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "default", // 'default', 'danger', 'warning'
  } = options;

  return new Promise((resolve) => {
    let confirmContent = `
      <div class="confirm-modal-inner">
        <p class="confirm-message">${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="confirm-cancel">${escapeHtml(cancelText)}</button>
          <button class="confirm-action ${
            type === "danger" ? "danger" : ""
          }">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    openModal({
      id: "confirm",
      title: options.title || "Confirm Action",
      content: confirmContent,
      customClass: "confirm-modal-style",
      size: "small",
      closeOnOverlay: options.closeOnOverlay !== false,
      onOpen: (modalElement) => {
        let confirmBtn = modalElement.querySelector(".confirm-action");
        let cancelBtn = modalElement.querySelector(".confirm-cancel");

        confirmBtn.addEventListener("click", () => {
          resolve(true);
          closeModal();
        });

        cancelBtn.addEventListener("click", () => {
          resolve(false);
          closeModal();
        });
      },
      onClose: () => {
        resolve(false);
      },
    });
  });
}


// =============================================================================
// COMPATIBILITY WITH EXISTING CODE
// =============================================================================

// Keep these for backward compatibility
function isModalOpen() {
  return !!app.modal?.element;
}

function getModalData() {
  return app.modal?.data || {};
}








/**
 * Setup event handlers for universal modal
 */
function setupUniversalModalHandlers(modalElement, options) {
  const { closeOnOverlay, showCloseButton } = options;

  // Close button handler (using your existing selector)
  if (showCloseButton) {
    let closeBtn = modalElement.querySelector(".close-modal");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }
  }

  // Overlay click handler
  if (closeOnOverlay) {
    window.addEventListener("click", function handleOverlayClick(event) {
      if (event.target === modalElement) {
        closeModal();
        window.removeEventListener("click", handleOverlayClick);
      }
    });
  }
}

/**
 * Generate unique modal ID
 */
function generateModalId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}


// =============================================================================
// QR MODAL FUNCTIONS (Updated to work with universal system)
// =============================================================================


/**
 * Setup QR modal functionality (keeping your existing logic)
 */
function setupQrModalHandlers(modalElement, data) {
  let copyBtn = modalElement.querySelector("#copyUrlBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      let urlInput = modalElement.querySelector("#fullUrl");
      let textToCopy = urlInput.value;

      try {
        await navigator.clipboard.writeText(textToCopy);
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 2000);
      } catch (err) {
        console.error("Failed to copy: ", err);
        alert("Failed to copy text. Please try again.");
      }
    });
  }

  // Custom text input handling (keeping your existing logic)
  if (data.showTextInput) {
    let generateBtn = modalElement.querySelector("#generateQrBtn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        let customText = modalElement.querySelector("#customText").value.trim();
        if (!customText) {
          alert("Please enter some text");
          return;
        }

        // Add validation for custom text
        if (customText.length > 255) {
          alert("Text is too long. Maximum 255 characters allowed.");
          return;
        }

        // Optional: Add URL validation if expecting URLs
        let urlPattern = /^[a-zA-Z0-9-_/.]+$/;
        if (!urlPattern.test(customText)) {
          alert(
            "Only alphanumeric characters, hyphens, underscores, periods, and slashes are allowed."
          );
          return;
        }

        let fullContent = "";

        if (data.contentType === "custom-input") {
          // Get base URL and combine with custom text
          let baseURL = data.initialUrl.substring(
            0,
            data.initialUrl.lastIndexOf("/") + 1
          );
          fullContent = baseURL + encodeURIComponent(customText);
        } else {
          fullContent = customText;
        }

        // Update QR code and URL display with sanitized content
        modalElement.querySelector("#qrCodeDisplay").innerHTML =
          generateQrCode(fullContent);
        modalElement.querySelector("#qrCodeDisplay").style.display = "block";

        modalElement.querySelector("#fullUrl").value = fullContent;
        modalElement.querySelector(".url-container").style.display = "flex";
      });
    }
  }
}


function showVideoJsonModal(videoData) {
    return showJsonModal(videoData, `Video JSON - ${videoData.id}`, {
        customClass: "video-json-modal"
    });
}

// For any Nostr event
function showRawData(event) {
    return showJsonModal(event, `Event JSON - ${event.id}`, {
        customClass: "event-json-modal"
    });
}

// For playlist events (kind:30005)
function showPlaylistJsonModal(playlistData) {
    return showJsonModal(playlistData, `Playlist JSON - ${playlistData.id}`, {
        customClass: "playlist-json-modal"
    });
}

/**
 * Show kind:0 event JSON in a modal
 * @param {Object} kindZeroEvent - The full kind:0 event object
 * @param {string} profileNpub - The profile's npub
 */
function showProfileKindZeroJson(kindZeroEvent, profileNpub) {
  // Use the universal JSON modal function
  showJsonModal(kindZeroEvent, `Profile JSON - ${profileNpub.substring(0, 16)}...`, {
    customClass: "profile-kind0-modal",
    size: "large"
  });
}

/////////////////////////////////////////////////



/**
 * Universal JSON formatter with syntax highlighting
 * @param {Object|Array} data - The JSON data to format
 * @returns {string} - HTML string with syntax highlighting
 */
function formatJsonWithStyle(data) {
    // Function to recursively format JSON with styling
    function formatJson(obj, indent = '') {
        if (typeof obj !== 'object' || obj === null) {
            // Handle primitive values
            const type = typeof obj;
            let value = String(obj);
            let valueClass = 'json-value';
            
            if (obj === null) {
                value = 'null';
                valueClass += ' json-null';
            } else if (type === 'boolean') {
                valueClass += ' json-boolean';
            } else if (type === 'number') {
                valueClass += ' json-number';
            } else if (type === 'string') {
                // Check for special values
                if (obj.startsWith('http') || obj.includes('://')) {
                    valueClass += ' json-url';
                } else if (/^\d{4}-\d{2}-\d{2}/.test(obj)) {
                    valueClass += ' json-date';
                }
                value = `"${obj.replace(/"/g, '\\"')}"`;
            }
            
            return `<span class="${valueClass}">${value}</span>`;
        }
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '<span class="json-punctuation">[]</span>';
            
            let html = '<span class="json-punctuation">[</span><br>';
            const childIndent = indent + '  ';
            
            obj.forEach((item, index) => {
                html += childIndent + formatJson(item, childIndent);
                if (index < obj.length - 1) html += '<span class="json-punctuation">,</span>';
                html += '<br>';
            });
            
            html += indent + '<span class="json-punctuation">]</span>';
            return html;
        }
        
        // Handle objects
        const keys = Object.keys(obj);
        if (keys.length === 0) return '<span class="json-punctuation">{}</span>';
        
        let html = '<span class="json-punctuation">{</span><br>';
        const childIndent = indent + '  ';
        
        keys.forEach((key, index) => {
            // Add special styling for certain keys
            let keyClass = 'json-key';
            if (key.includes('id') || key.includes('Id') || key.includes('ID')) {
                keyClass += ' json-key-id';
            } else if (key.includes('url') || key.includes('Url') || key.includes('URL')) {
                keyClass += ' json-key-url';
            } else if (key.includes('time') || key.includes('Time') || key.includes('date') || key.includes('Date')) {
                keyClass += ' json-key-date';
            } else if (key.includes('amount') || key.includes('Amount') || key.includes('price') || key.includes('Price')) {
                keyClass += ' json-key-number';
            }
            
            html += childIndent + `<span class="${keyClass}">"${key}"</span><span class="json-punctuation">: </span>`;
            html += formatJson(obj[key], childIndent);
            if (index < keys.length - 1) html += '<span class="json-punctuation">,</span>';
            html += '<br>';
        });
        
        html += indent + '<span class="json-punctuation">}</span>';
        return html;
    }
    
    return formatJson(data);
}

/**
 * Universal function to show JSON in a modal
 * @param {Object} data - The JSON data to display
 * @param {string} title - Modal title (defaults to 'JSON Data')
 * @param {Object} options - Additional options
 */
function showJsonModal(data, title = 'JSON Data', options = {}) {
    const formattedJson = formatJsonWithStyle(data);
    
    return openModal({
        title: title,
        content: `<div class="json-simple-viewer"><pre>${formattedJson}</pre></div>`,
        size: options.size || "large",
        customClass: options.customClass || "json-modal",
        onClose: options.onClose || (() => {})
    });
}



////////
/**
 * Show publish confirmation modal before publishing an event
 * @param {Object} event - The Nostr event to publish
 * @param {Array} relays - Array of relay URLs
 * @returns {Promise<Object>} - Resolves to {confirmed: boolean, selectedRelays: Array}
 */
function confirmPublishModal(event, relays) {
  return new Promise((resolve) => {
    const formattedJson = formatJsonWithStyle(event);
    
    const content = `
      <div class="publish-confirm-modal">
        <div class="publish-info">
          <p><strong>Publishing as:</strong> <code>${escapeHtml(app.myNpub || 'Not set')}</code></p>
          
          <p><strong>Relays:</strong> <span class="relay-count">(${relays.length} selected)</span></p>
          <div class="relay-list">
            ${relays.map((relay, index) => `
              <div class="relay-item" data-relay-index="${index}">
                <input type="checkbox" id="relay-${index}" class="relay-checkbox" checked data-relay="${escapeHtml(relay)}">
                <label for="relay-${index}">${escapeHtml(relay)}</label>
              </div>
            `).join('')}
          </div>
          
          <p><strong>Event JSON:</strong></p>
          <div class="json-simple-viewer">
            <pre>${formattedJson}</pre>
          </div>
        </div>
        
        <div class="publish-status" style="display: none;">
          <p><strong>Publishing...</strong></p>
          <div class="publish-progress"></div>
        </div>
        
        <div class="modal-actions">
          <button class="btn-secondary" id="publishCancel">Cancel</button>
          <button class="btn-primary" id="publishConfirm">Publish Event</button>
        </div>
      </div>
    `;

    const modal = openModal({
      title: 'Confirm Event Publishing',
      content,
      size: 'large',
      customClass: 'publish-confirmation-modal',
      closeOnOverlay: false, // Prevent closing during publish
      showCloseButton: true,
      onClose: () => resolve({ confirmed: false, selectedRelays: [] })
    });

    const checkboxes = modal.querySelectorAll('.relay-checkbox');
    const relayCount = modal.querySelector('.relay-count');
    const confirmBtn = modal.querySelector('#publishConfirm');
    const cancelBtn = modal.querySelector('#publishCancel');

    // Update count when checkboxes change
    function updateRelayCount() {
      const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
      relayCount.textContent = `(${checkedCount} selected)`;
      confirmBtn.disabled = checkedCount === 0;
      if (checkedCount === 0) {
        confirmBtn.classList.add('disabled');
      } else {
        confirmBtn.classList.remove('disabled');
      }
    }

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', updateRelayCount);
    });

    confirmBtn.addEventListener('click', () => {
      const selectedRelays = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.relay);
      
      if (selectedRelays.length === 0) {
        alertModal('Please select at least one relay to publish to.');
        return;
      }

      resolve({ confirmed: true, selectedRelays });
    });

    cancelBtn.addEventListener('click', () => {
      resolve({ confirmed: false, selectedRelays: [] });
      closeModal();
    });
  });
}

/**
 * Show publishing progress and results in the modal
 * @param {HTMLElement} modal - The modal element
 * @param {Array} results - Array of publish results
 * @param {Array} relays - Array of relay URLs that were attempted
 * @param {number} successCount - Number of successful publishes
 * @param {number} totalCount - Total number of relays
 */
function showPublishResults(modal, results, relays, successCount, totalCount) {
  const statusDiv = modal.querySelector('.publish-status');
  const progressDiv = modal.querySelector('.publish-progress');
  const actionsDiv = modal.querySelector('.modal-actions');
  
  statusDiv.style.display = 'block';
  
  let html = `
    <div class="publish-results">
      <p class="result-summary ${successCount > 0 ? 'success' : 'error'}">
        Published to ${successCount}/${totalCount} relays
      </p>
      <div class="relay-results">
  `;
  
  results.forEach((result, index) => {
    const status = result.status === 'fulfilled' ? 'success' : 'failed';
    const icon = result.status === 'fulfilled' ? '✓' : '✗';
    const relayUrl = relays[index] || 'Unknown relay';
    const reason = result.status === 'rejected' ? `: ${result.reason}` : '';
    
    html += `
      <div class="relay-result ${status}">
        <span class="result-icon">${icon}</span>
        <span class="result-relay">${escapeHtml(relayUrl)}</span>
        <span class="result-status">${status}${reason}</span>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  progressDiv.innerHTML = html;
  
  // Update buttons
  actionsDiv.innerHTML = '<button class="btn-primary" id="closeResults">Close</button>';
  modal.querySelector('#closeResults').addEventListener('click', closeModal);
}