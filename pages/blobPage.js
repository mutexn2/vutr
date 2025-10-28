async function blobPageHandler() {
  try {
    mainContent.innerHTML = `
      <div class="blobing-container">
        <h1>Video Metadata Extractor for Kind-21</h1>
        
        <div class="url-input-section">
          <h2>Enter Video URL</h2>
          <input type="url" id="videoUrl" placeholder="https://example.com/video.mp4" class="url-input">
          <button id="processVideoBtn" class="btn">Process Video</button>
          <div id="processingStatus" class="result-section"></div>
        </div>

        <div class="steps-container" id="stepsContainer" style="display: none;">
          <div class="step">
            <h3>Basic Video Information</h3>
            <div id="basicInfo" class="step-content"></div>
            <button id="nextStep1" class="btn" disabled>Continue to Hash Check</button>
          </div>

          <div class="step">
            <h3>Hash Validation (Optional)</h3>
            <div id="hashInfo" class="step-content"></div>
            <button id="generateImeta" class="btn" disabled>Generate imeta Tag</button>
          </div>

          <div class="step">
            <h3>Final imeta Tag</h3>
            <div id="imetaOutput" class="step-content"></div>
          </div>
        </div>

        <div class="video-preview" id="videoPreview" style="display: none;">
          <h3>Video Preview</h3>
          <div id="previewContainer"></div>
        </div>
      </div>
    `;

    // Extract video URL from hash if present
    const currentHash = window.location.hash;
    let prefilledUrl = '';
    
    if (currentHash.startsWith('#blob/')) {
      prefilledUrl = currentHash.substring(6); // Remove '#blob/' prefix
      // Decode in case the URL was encoded
      prefilledUrl = decodeURIComponent(prefilledUrl);
    }

    initializeVideoProcessor(prefilledUrl);

  } catch (error) {
    console.error("Error rendering blob page:", error);
    mainContent.innerHTML = `<h1>Error</h1><p>Error rendering page: ${error.message}</p>`;
  }
}

function initializeVideoProcessor(prefilledUrl = '') {
  const videoUrlInput = document.getElementById('videoUrl');
  const processVideoBtn = document.getElementById('processVideoBtn');
  const stepsContainer = document.getElementById('stepsContainer');
  
  // Pre-fill the input field if URL was provided
  if (prefilledUrl) {
    videoUrlInput.value = prefilledUrl;
  }
  
  let videoData = {
    url: '',
    blob: null,
    hash: null,
    metadata: {},
    isHashValid: false
  };

  processVideoBtn.addEventListener('click', async () => {
    const url = videoUrlInput.value.trim();
    if (!url) {
      showStatus('Please enter a video URL', 'error');
      return;
    }


    videoData.url = url;
    await processStep1(videoData);
  });

  document.getElementById('nextStep1').addEventListener('click', () => processStep2(videoData));
  document.getElementById('generateImeta').addEventListener('click', () => generateImetaTag(videoData));
}

async function processStep1(videoData) {
  try {
    // Check accessibility
    showStatus('Checking video accessibility...', 'loading');
    const accessibility = await checkVideoAccessibility(videoData.url);
    if (!accessibility.accessible) {
      showStatus(`Video not accessible: ${accessibility.error || 'Unknown error'}`, 'error');
      return;
    }

    // Fetch the video blob with progress
    videoData.blob = await fetchVideoWithProgress(videoData.url, (progress) => {
      if (progress.indeterminate) {
        showStatus('Downloading video...', 'loading', { indeterminate: true });
      } else {
        showStatus('Downloading video...', 'loading', progress);
      }
    });
    
    // Quick processing message for the final steps
    showStatus('Processing video data...', 'loading');
    
    // Create basic info elements (your existing code)
    const basicInfoContainer = document.getElementById('basicInfo');
    basicInfoContainer.innerHTML = '';
    
    const infoGrid = document.createElement('div');
    infoGrid.className = 'info-grid';
    
    const infoItems = [
      { label: 'URL', value: videoData.url },
      { label: 'File Size', value: formatBytes(videoData.blob.size) },
      { label: 'MIME Type', value: videoData.blob.type },
      { label: 'Status', value: '✓ Video accessible', className: 'success' }
    ];
    
    infoItems.forEach(item => {
      const div = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = `${item.label}: `;
      div.appendChild(strong);
      
      const span = document.createElement('span');
      span.textContent = item.value;
      if (item.className) {
        span.className = item.className;
      }
      div.appendChild(span);
      
      infoGrid.appendChild(div);
    });
    
    basicInfoContainer.appendChild(infoGrid);

    // Show preview
    showVideoPreview(videoData.blob);
    
    document.getElementById('stepsContainer').style.display = 'block';
    document.getElementById('nextStep1').disabled = false;
    showStatus('Download completed successfully!', 'success');

  } catch (error) {
    showStatus(`Error processing video: ${error.message}`, 'error');
  }
}


async function processStep2(videoData) {
  showStatus('Generating hash and validating...', 'loading');
  
  try {
    // Generate SHA-256 hash
    videoData.hash = await generateSHA256Hash(videoData.blob);
    
    // Check if hash matches URL filename
    const hashValidation = validateHashAgainstUrl(videoData.url, videoData.hash);
    videoData.isHashValid = hashValidation.isValid;
    
    // Create hash info elements
    const hashInfoContainer = document.getElementById('hashInfo');
    hashInfoContainer.innerHTML = '';
    
    const infoGrid = document.createElement('div');
    infoGrid.className = 'info-grid';
    
    // Hash display
    const hashDiv = document.createElement('div');
    const hashLabel = document.createElement('strong');
    hashLabel.textContent = 'SHA-256 Hash:';
    hashDiv.appendChild(hashLabel);
    hashDiv.appendChild(document.createElement('br'));
    
    const hashCode = document.createElement('code');
    hashCode.className = 'hash';
    hashCode.textContent = videoData.hash;
    hashDiv.appendChild(hashCode);
    infoGrid.appendChild(hashDiv);
    
    // URL filename
    const urlDiv = document.createElement('div');
    const urlLabel = document.createElement('strong');
    urlLabel.textContent = 'URL Filename: ';
    urlDiv.appendChild(urlLabel);
    urlDiv.appendChild(document.createTextNode(hashValidation.urlHash || 'N/A'));
    infoGrid.appendChild(urlDiv);
    
    // Validation status
    const validationDiv = document.createElement('div');
    const validationLabel = document.createElement('strong');
    validationLabel.textContent = 'Blossom Validation: ';
    validationDiv.appendChild(validationLabel);
    
    const validationSpan = document.createElement('span');
    validationSpan.className = hashValidation.isValid ? 'success' : 'warning';
    validationSpan.textContent = hashValidation.isValid 
      ? '🌸🌸🌸 Hash matches filename' 
      : '⚠ Hash does not match filename';
    validationDiv.appendChild(validationSpan);
    infoGrid.appendChild(validationDiv);
    
    hashInfoContainer.appendChild(infoGrid);
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-small';
    copyBtn.textContent = 'Copy Hash';
    copyBtn.addEventListener('click', () => copyToClipboard(videoData.hash, copyBtn));
    hashInfoContainer.appendChild(copyBtn);

    document.getElementById('generateImeta').disabled = false;
    showStatus('Completed - ready to generate imeta tag', 'success');

  } catch (error) {
    showStatus(`Error in hash validation: ${error.message}`, 'error');
  }
}

async function generateImetaTag(videoData) {
  showStatus('Extracting metadata and generating imeta...', 'loading');
  
  try {
    // Extract video metadata directly here
    const metadata = await extractVideoMetadata(videoData.blob);
    videoData.metadata = metadata;
    
    // Generate x tag value (use hash if valid, otherwise generate random)
    const xValue = videoData.isHashValid ? videoData.hash : generateRandomHash();
    
    // Build imeta tag
    const imetaTag = [
      "imeta",
      `url ${videoData.url}`,
      `x ${xValue}`,
      `m ${videoData.blob.type}`,
      `dim ${videoData.metadata.width}x${videoData.metadata.height}`,
      `size ${videoData.blob.size}`
    ];

    // Create formatted output for display and clipboard
    const imetaForClipboard = JSON.stringify(imetaTag);
    const imetaForDisplay = JSON.stringify(imetaTag, null, 2);

    // Create output elements
    const outputContainer = document.getElementById('imetaOutput');
    outputContainer.innerHTML = '';
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'imeta-result';
    
    // Title
    const title = document.createElement('h4');
    title.textContent = 'Generated imeta Tag:';
    resultDiv.appendChild(title);
    
    // Formatted Array Section
    const formattedSection = document.createElement('div');
    formattedSection.className = 'output-section';
    
    const formattedPre = document.createElement('pre');
    formattedPre.className = 'code-block';
    formattedPre.textContent = imetaForDisplay;
    formattedSection.appendChild(formattedPre);
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-small';
    copyBtn.textContent = 'Copy imeta Tag';
    copyBtn.addEventListener('click', () => copyToClipboard(imetaForClipboard, copyBtn));
    formattedSection.appendChild(copyBtn);
    
    resultDiv.appendChild(formattedSection);
    
    // Summary Section
    const summarySection = document.createElement('div');
    summarySection.className = 'metadata-summary';
    
    const summaryTitle = document.createElement('h5');
    summaryTitle.textContent = 'Summary:';
    summarySection.appendChild(summaryTitle);
    
    const summaryList = document.createElement('ul');
    
    const summaryItems = [
      `URL: ${videoData.url}`,
      `Hash ${videoData.isHashValid ? '(validated)' : '(random)'}: ${xValue}`,
      `Size: ${formatBytes(videoData.blob.size)}`,
      `Dimensions: ${videoData.metadata.width}x${videoData.metadata.height}`,
      `Duration: ${videoData.metadata.duration?.toFixed(2)}s`
    ];
    
    summaryItems.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      summaryList.appendChild(li);
    });
    
    summarySection.appendChild(summaryList);
    resultDiv.appendChild(summarySection);
    
    outputContainer.appendChild(resultDiv);

    showStatus('imeta tag generated successfully!', 'success');

  } catch (error) {
    showStatus(`Error generating imeta tag: ${error.message}`, 'error');
  }
}

function isValidVideoUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const validExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    return validExtensions.some(ext => 
      parsedUrl.pathname.toLowerCase().endsWith(ext)
    );
  } catch {
    return false;
  }
}


async function checkVideoAccessibility(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      accessible: response.ok,
      contentType: response.headers.get('Content-Type'),
      contentLength: parseInt(response.headers.get('Content-Length') || '0'),
      error: null
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.message
    };
  }
}

async function generateSHA256Hash(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function validateHashAgainstUrl(url, blobHash) {
  try {
    const parsedUrl = new URL(url);
    const filename = parsedUrl.pathname.split('/').pop();
    const filenameWithoutExtension = filename.split('.').slice(0, -1).join('.');
    
    return {
      isValid: filenameWithoutExtension === blobHash,
      urlHash: filenameWithoutExtension,
      blobHash
    };
  } catch (error) {
    return {
      isValid: false,
      urlHash: null,
      blobHash,
      error: error.message
    };
  }
}

async function extractVideoMetadata(blob) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const blobUrl = URL.createObjectURL(blob);
    
    video.onloadedmetadata = () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: video.videoWidth / video.videoHeight,
        fileType: blob.type,
        fileSize: blob.size
      };
      
      URL.revokeObjectURL(blobUrl);
      resolve(metadata);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = blobUrl;
  });
}

function generateRandomHash() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function showVideoPreview(blob) {
  const blobUrl = URL.createObjectURL(blob);
  const previewContainer = document.getElementById('previewContainer');
  previewContainer.innerHTML = '';
  
  const video = document.createElement('video');
  video.controls = true;
  video.style.width = '400px';
  video.style.maxWidth = '100%';
  
  const source = document.createElement('source');
  source.src = blobUrl;
  source.type = blob.type;
  
  video.appendChild(source);
  video.appendChild(document.createTextNode('Your browser does not support the video tag.'));
  
  previewContainer.appendChild(video);
  document.getElementById('videoPreview').style.display = 'block';
}

function showStatus(message, type, progressData = null) {
  const statusEl = document.getElementById('processingStatus');
  statusEl.innerHTML = '';
  
  const resultDiv = document.createElement('div');
  resultDiv.className = `result ${type}`;
  
  if (progressData && type === 'loading') {
    if (progressData.indeterminate) {
      // Indeterminate progress bar
      resultDiv.innerHTML = `
        <div class="progress-message">${message}</div>
        <div class="progress-bar-container">
          <div class="progress-bar indeterminate">
            <div class="progress-fill"></div>
          </div>
        </div>
      `;
    } else {
      // Determinate progress bar with percentage and file size
      resultDiv.innerHTML = `
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
    resultDiv.textContent = message;
  }
  
  statusEl.appendChild(resultDiv);
}


// Shared utility functions
async function fetchVideoWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentLength = parseInt(response.headers.get('Content-Length') || '0');
  
  if (contentLength === 0) {
    onProgress({ indeterminate: true });
    return await response.blob();
  }

  const reader = response.body.getReader();
  const chunks = [];
  let receivedLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    chunks.push(value);
    receivedLength += value.length;
    
    const progress = (receivedLength / contentLength) * 100;
    onProgress({ 
      loaded: receivedLength, 
      total: contentLength, 
      percentage: Math.round(progress)
    });
  }

  return new Blob(chunks);
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


async function validateBlossomInPlace(videoUrl, onProgress = null) {
  try {
    console.log('📥 Downloading video from URL:', videoUrl);
    
    // Download with progress
    const videoBlob = await fetchVideoWithProgress(videoUrl, onProgress);
    console.log('✅ Download complete, size:', formatBytes(videoBlob.size));
    
    // Generate SHA-256 hash
    console.log('🔐 Generating SHA-256 hash...');
    const hash = await generateSHA256Hash(videoBlob);
    console.log('✅ Hash generated:', hash);
    
    // Validate against URL
    console.log('🌸 Validating hash against URL filename...');
    const validation = validateHashAgainstUrl(videoUrl, hash);
    console.log('✅ Validation complete:', validation.isValid ? 'VALID BLOSSOM 🌸🌸🌸' : 'Hash mismatch');
    
    return {
      success: true,
      hash: hash,
      isValid: validation.isValid,
      urlHash: validation.urlHash,
      blobHash: validation.blobHash
    };
  } catch (error) {
    console.error('❌ Validation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}