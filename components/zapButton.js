/**
 * Creates a zap button that can be used anywhere in the app
 * @param {Object} params - Configuration for the zap button
 * @param {string} params.pubkey - Recipient's public key (hex)
 * @param {string} [params.eventId] - Optional event ID to zap
 * @param {Array<string>} [params.relays] - Optional relay list (defaults to app.relays)
 * @param {string} [params.lud16] - Optional lud16 address (otherwise fetched from profile)
 * @param {string} [params.size='medium'] - Button size: 'small', 'medium', 'large'
 * @param {boolean} [params.showLabel=true] - Whether to show "Zap" text
 * @returns {HTMLButtonElement} - The zap button element
 */
function createZapButton(params) {
  const {
    pubkey,
    eventId = null,
    relays = null,
    lud16 = null,
    size = 'medium',
    showLabel = true
  } = params;

  const button = document.createElement('button');
  button.className = `zap-btn zap-btn-${size}`;
  button.setAttribute('aria-label', 'Send a zap');
  button.setAttribute('data-pubkey', pubkey);
  if (eventId) button.setAttribute('data-event-id', eventId);

  const iconSvg = `
    <svg class="zap-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  `;

  button.innerHTML = `
    ${iconSvg}
    ${showLabel ? '<span class="zap-label">Zap</span>' : ''}
  `;

  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add loading state
    button.classList.add('zap-btn-loading');
    button.disabled = true;

    try {
      await handleZapClick({
        pubkey,
        eventId,
        relays: relays || app.relays,
        lud16
      });
    } catch (error) {
      console.error('Zap failed:', error);
      showTemporaryNotification('Zap failed: ' + error.message);
    } finally {
      button.classList.remove('zap-btn-loading');
      button.disabled = false;
    }
  });

  return button;
}

/**
 * Main handler for zap button clicks
 */
async function handleZapClick(params) {
  const { pubkey, eventId, relays, lud16 } = params;

  // Check if user is logged in
  if (!app.myPk) {
    showTemporaryNotification('Please log in to send zaps');
    return;
  }

  // Get recipient's lightning address
  let recipientLud16 = lud16;
  
  if (!recipientLud16) {
    try {
      const profile = await NostrClient.getProfile(pubkey);
      if (profile && profile.content) {
        const profileData = JSON.parse(profile.content);
        recipientLud16 = profileData.lud16 || profileData.lud06;
      }
    } catch (error) {
      console.error('Failed to fetch recipient profile:', error);
    }
  }

  if (!recipientLud16) {
    showTemporaryNotification('Recipient has no lightning address configured');
    return;
  }

  // Open zap modal
  await openZapModal({
    pubkey,
    eventId,
    relays,
    lud16: recipientLud16
  });
}

/**
 * Opens the zap modal for amount input and payment
 */
async function openZapModal(zapParams) {
  const { pubkey, eventId, relays, lud16 } = zapParams;

  // Determine if this is an event zap or profile zap
  const zapType = eventId ? 'event' : 'profile';
  const modalTitle = eventId ? '⚡ Zap this Video' : '⚡ Send a Zap';

  const modalContent = `
    <div class="zap-modal-container">
      <div class="zap-recipient-info">
        <p>Zapping ${zapType === 'event' ? 'video' : 'user'}: <strong>${lud16}</strong></p>
      </div>
      
      <div class="zap-step" id="zapStep1">
        <div class="zap-amount-input">
          <label for="zapAmount">Amount (sats):</label>
          <input 
            type="number" 
            id="zapAmount" 
            placeholder="Enter amount in sats" 
            min="1" 
            value="21"
          />
          <div class="zap-quick-amounts">
            <button class="quick-amount-btn" data-amount="21">21</button>
            <button class="quick-amount-btn" data-amount="100">100</button>
            <button class="quick-amount-btn" data-amount="500">500</button>
            <button class="quick-amount-btn" data-amount="1000">1k</button>
          </div>
        </div>
        
        <div class="zap-comment-input">
          <label for="zapComment">Comment (optional):</label>
          <textarea 
            id="zapComment" 
            placeholder="Add a comment..." 
            maxlength="500"
            rows="3"
          ></textarea>
        </div>
        
        <div class="zap-actions">
          <button class="btn-secondary" id="zapCancelBtn">Cancel</button>
          <button class="btn-primary" id="zapContinueBtn">Continue</button>
        </div>
        
        <div class="zap-status" id="zapStatus"></div>
      </div>
      
      <div class="zap-step" id="zapStep2" style="display: none;">
        <div class="zap-invoice-container">
          <div class="zap-qr-display" id="zapQrDisplay"></div>
          <div class="zap-invoice-text">
            <input type="text" id="zapInvoiceText" readonly />
            <button class="btn-secondary" id="zapCopyInvoiceBtn">Copy Invoice</button>
          </div>
          <div class="zap-payment-status">
            <p>Waiting for payment...</p>
            <div class="zap-spinner"></div>
          </div>
        </div>
        <button class="btn-secondary" id="zapBackBtn">Back</button>
      </div>
      
      <div class="zap-step" id="zapStep3" style="display: none;">
        <div class="zap-success">
          <div class="zap-success-icon">⚡</div>
          <h3>Zap Sent Successfully!</h3>
          <p>Your zap has been confirmed.</p>
        </div>
        <button class="btn-primary" id="zapCloseBtn">Close</button>
      </div>
    </div>
  `;

  const modal = openModal({
    title: modalTitle,
    content: modalContent,
    size: 'medium',
    customClass: 'zap-modal'
  });

  // Setup modal event handlers
  setupZapModalHandlers(modal, zapParams);
}

/**
 * Setup event handlers for the zap modal
 */
function setupZapModalHandlers(modal, zapParams) {
  const { pubkey, eventId, relays, lud16 } = zapParams;
  
  let zapEndpoint = null;
  let zapInvoice = null;
  let receiptCheckInterval = null;

  // Quick amount buttons
  modal.querySelectorAll('.quick-amount-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = btn.getAttribute('data-amount');
      modal.querySelector('#zapAmount').value = amount;
    });
  });

  // Cancel button
  modal.querySelector('#zapCancelBtn').addEventListener('click', () => {
    if (receiptCheckInterval) {
      clearInterval(receiptCheckInterval);
    }
    closeModal();
  });

  // Continue button - validate wallet and create zap request
  modal.querySelector('#zapContinueBtn').addEventListener('click', async () => {
    const amount = parseInt(modal.querySelector('#zapAmount').value);
    const comment = modal.querySelector('#zapComment').value.trim();

    if (!amount || amount < 1) {
      updateZapStatus(modal, 'Please enter a valid amount', 'error');
      return;
    }

    const continueBtn = modal.querySelector('#zapContinueBtn');
    continueBtn.disabled = true;
    continueBtn.textContent = 'Processing...';

    try {
      updateZapStatus(modal, 'Validating lightning address...', 'loading');

      // Get zap endpoint
      zapEndpoint = await getZapEndpointFromLud16(lud16);
      
      if (!zapEndpoint) {
        throw new Error('Invalid lightning address or zaps not supported');
      }

      updateZapStatus(modal, 'Creating zap request...', 'loading');

      // Create and sign zap request
      const zapRequest = await createAndSignZapRequest({
        pubkey,
        eventId,
        amount: amount * 1000, // Convert to millisats
        comment,
        relays,
        lud16
      });

      updateZapStatus(modal, 'Requesting invoice...', 'loading');

      // Get invoice from wallet
      zapInvoice = await requestZapInvoice(zapEndpoint, zapRequest, amount * 1000);

      // Show invoice in step 2
      showZapInvoice(modal, zapInvoice, zapRequest, relays);

    } catch (error) {
      console.error('Zap request failed:', error);
      updateZapStatus(modal, 'Error: ' + error.message, 'error');
      continueBtn.disabled = false;
      continueBtn.textContent = 'Continue';
    }
  });

  // Back button from invoice view
  modal.querySelector('#zapBackBtn').addEventListener('click', () => {
    if (receiptCheckInterval) {
      clearInterval(receiptCheckInterval);
    }
    showZapStep(modal, 1);
    modal.querySelector('#zapContinueBtn').disabled = false;
    modal.querySelector('#zapContinueBtn').textContent = 'Continue';
  });

  // Copy invoice button
  modal.querySelector('#zapCopyInvoiceBtn').addEventListener('click', async () => {
    const invoiceText = modal.querySelector('#zapInvoiceText').value;
    try {
      await navigator.clipboard.writeText(invoiceText);
      const btn = modal.querySelector('#zapCopyInvoiceBtn');
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = 'Copy Invoice';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy invoice:', error);
    }
  });

  // Close button on success
  modal.querySelector('#zapCloseBtn').addEventListener('click', () => {
    if (receiptCheckInterval) {
      clearInterval(receiptCheckInterval);
    }
    closeModal();
  });
}

/**
 * Get zap endpoint from lud16 address
 */
async function getZapEndpointFromLud16(lud16) {
  try {
    const [name, domain] = lud16.split('@');
    if (!name || !domain) {
      throw new Error('Invalid lightning address format');
    }

    const lnurlUrl = `https://${domain}/.well-known/lnurlp/${name}`;
    const response = await fetch(lnurlUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch lnurl data');
    }

    const data = await response.json();

    // Check if zaps are supported
    if (!data.allowsNostr || !data.nostrPubkey) {
      throw new Error('Recipient does not support zaps');
    }

    return {
      callback: data.callback,
      nostrPubkey: data.nostrPubkey,
      minSendable: data.minSendable || 1000,
      maxSendable: data.maxSendable || 100000000000
    };

  } catch (error) {
    console.error('Error getting zap endpoint:', error);
    throw error;
  }
}

/**
 * Create and sign a zap request event
 */
async function createAndSignZapRequest(params) {
  const { pubkey, eventId, amount, comment, relays, lud16 } = params;

  // Build zap request event
  const zapRequestTemplate = {
    kind: 9734,
    content: comment || '',
    tags: [
      ['relays', ...relays],
      ['amount', amount.toString()],
      ['p', pubkey]
    ],
    created_at: Math.round(Date.now() / 1000)
  };

  // Add event tag if zapping an event
  if (eventId) {
    zapRequestTemplate.tags.push(['e', eventId]);
  }

  // The lnurl tag is optional according to NIP-57, so we can skip it
  // Most wallet servers don't require it

  // Sign the event
  const signedZapRequest = await handleEventSigning(zapRequestTemplate);
  
  return signedZapRequest;
}

/**
 * Encode lud16 to lnurl format
 */
function encodeLnurl(lud16) {
  const [name, domain] = lud16.split('@');
  const url = `https://${domain}/.well-known/lnurlp/${name}`;
  const words = window.NostrTools.bech32.toWords(new TextEncoder().encode(url));
  return window.NostrTools.bech32.encode('lnurl', words, 2000);
}

/**
 * Request invoice from zap endpoint
 */
async function requestZapInvoice(zapEndpoint, zapRequest, amount) {
  try {
    const zapRequestString = JSON.stringify(zapRequest);
    const encodedZapRequest = encodeURIComponent(zapRequestString);

    // Build the invoice request URL
    // The lnurl parameter is optional according to LUD-06
    const invoiceUrl = `${zapEndpoint.callback}?amount=${amount}&nostr=${encodedZapRequest}`;

    console.log('Requesting invoice from:', invoiceUrl);

    const response = await fetch(invoiceUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Invoice request failed:', errorText);
      throw new Error('Failed to get invoice from wallet');
    }

    const data = await response.json();

    if (!data.pr) {
      throw new Error('No invoice returned from wallet');
    }

    return data.pr;

  } catch (error) {
    console.error('Error requesting invoice:', error);
    throw error;
  }
}
/**
 * Show invoice in the modal
 */
function showZapInvoice(modal, invoice, zapRequest, relays) {
  // Generate QR code
  const qrDisplay = modal.querySelector('#zapQrDisplay');
  qrDisplay.innerHTML = generateQrCode(invoice);

  // Show invoice text
  modal.querySelector('#zapInvoiceText').value = invoice;

  // Switch to step 2
  showZapStep(modal, 2);

  // Start checking for zap receipt
  startReceiptCheck(modal, zapRequest, relays);
}

/**
 * Start checking for zap receipt
 */
function startReceiptCheck(modal, zapRequest, relays) {
  const checkInterval = 2000; // Check every 2 seconds
  const maxChecks = 60; // Stop after 2 minutes
  let checkCount = 0;

  const receiptCheckInterval = setInterval(async () => {
    checkCount++;

    try {
      const receipt = await checkForZapReceipt(zapRequest.id, relays);
      
      if (receipt) {
        clearInterval(receiptCheckInterval);
        showZapSuccess(modal);
      } else if (checkCount >= maxChecks) {
        clearInterval(receiptCheckInterval);
        // Could show a message that payment is taking longer than expected
        console.log('Receipt check timeout - payment may still be processing');
      }
    } catch (error) {
      console.error('Error checking for receipt:', error);
    }
  }, checkInterval);

  // Store interval for cleanup
  modal.receiptCheckInterval = receiptCheckInterval;
}

/**
 * Check for zap receipt
 */
async function checkForZapReceipt(zapRequestId, relays) {
  try {
    const receipts = await NostrClient.getEvents({
      kinds: [9735],
      '#e': [zapRequestId],
      limit: 1
    });

    if (receipts && receipts.length > 0) {
      // Validate the receipt
      const receipt = receipts[0];
      const descriptionTag = receipt.tags.find(tag => tag[0] === 'description');
      
      if (descriptionTag && descriptionTag[1]) {
        const zapRequest = JSON.parse(descriptionTag[1]);
        if (zapRequest.id === zapRequestId) {
          return receipt;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking for zap receipt:', error);
    return null;
  }
}

/**
 * Show zap success
 */
function showZapSuccess(modal) {
  showZapStep(modal, 3);
  
  // Trigger confetti or celebration animation if you have one
  console.log('⚡ Zap successful!');
}

/**
 * Switch between modal steps
 */
function showZapStep(modal, stepNumber) {
  modal.querySelectorAll('.zap-step').forEach(step => {
    step.style.display = 'none';
  });
  modal.querySelector(`#zapStep${stepNumber}`).style.display = 'block';
}

/**
 * Update status message in modal
 */
function updateZapStatus(modal, message, type = 'info') {
  const statusEl = modal.querySelector('#zapStatus');
  statusEl.textContent = message;
  statusEl.className = `zap-status zap-status-${type}`;
}



//////
//video page
/**
 * Setup zap button for video page
 */
async function setupVideoZapButton(container, video, videoId, pubkey) {
  // Check if creator has a valid lud16
  let lud16 = null;
  try {
    const profile = await NostrClient.getProfile(pubkey);
    if (profile && profile.content) {
      const profileData = JSON.parse(profile.content);
      lud16 = profileData.lud16 || profileData.lud06;
    }
  } catch (error) {
    console.error('Failed to fetch creator profile:', error);
  }

  // If no lightning address, don't show zap button
  if (!lud16) {
    container.innerHTML = `
      <div class="video-zap-info">
        <span class="zap-total">⚡ <span class="zap-amount">--</span> sats</span>
      </div>
    `;
    // Still load zap count
    loadVideoZapCount(videoId);
    return;
  }

  // Create zap button and display
  const zapButton = createZapButton({
    pubkey: pubkey,
    eventId: videoId,
    relays: app.relays,
    lud16: lud16,
    size: 'small',
    showLabel: true
  });

  const zapInfo = document.createElement('div');
  zapInfo.className = 'video-zap-info';
  zapInfo.innerHTML = `
    <span class="zap-total">⚡ <span class="zap-amount">0</span> sats</span>
  `;

  container.appendChild(zapButton);
  container.appendChild(zapInfo);

  // Load and display zap count
  loadVideoZapCount(videoId);
}

/**
 * Load and display total zaps for a video
 */
async function loadVideoZapCount(videoId) {
  try {
    const pool = new window.NostrTools.SimplePool();
    
    // Query for zap receipts (kind 9735) for this video
    const zapReceipts = await pool.querySync(app.relays || [], {
      kinds: [9735],
      '#e': [videoId],
      limit: 500 // Get a reasonable number of zaps
    });

    let totalSats = 0;
    let validZapCount = 0;

    // Process each zap receipt
    for (const receipt of zapReceipts) {
      try {
        // Get the bolt11 invoice from the receipt
        const bolt11Tag = receipt.tags.find(tag => tag[0] === 'bolt11');
        if (!bolt11Tag || !bolt11Tag[1]) continue;

        const invoice = bolt11Tag[1];
        
        // Extract amount from invoice using nostr-tools helper
        const amountSats = window.NostrTools.nip57.getSatoshisAmountFromBolt11(invoice);
        
        if (amountSats > 0) {
          totalSats += amountSats;
          validZapCount++;
        }
      } catch (error) {
        console.warn('Error processing zap receipt:', error);
      }
    }

    console.log(`Found ${validZapCount} valid zaps totaling ${totalSats} sats for video ${videoId}`);

    // Update the display
    const zapAmountElement = document.querySelector('.channel-zap-container .zap-amount');
    if (zapAmountElement) {
      zapAmountElement.textContent = formatSatsAmount(totalSats);
    }

    // Store in app state for reference
    if (!app.videoZapData) {
      app.videoZapData = {};
    }
    app.videoZapData[videoId] = {
      totalSats,
      zapCount: validZapCount,
      lastUpdated: Date.now()
    };

  } catch (error) {
    console.error('Error loading video zap count:', error);
  }
}

/**
 * Format sats amount for display
 */
function formatSatsAmount(sats) {
  if (sats >= 1000000) {
    return `${(sats / 1000000).toFixed(2)}M`;
  } else if (sats >= 1000) {
    return `${(sats / 1000).toFixed(1)}k`;
  } else {
    return sats.toString();
  }
}