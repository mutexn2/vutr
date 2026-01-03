async function blobPageHandler() {
  try {
    mainContent.innerHTML = `
      <div class="blobing-container">
        <h1>Media Metadata Generator</h1>
        <p class="subtitle">Generate imeta tags for direct media URLs (video/audio)</p>
        
        <div class="url-input-section">
          <input type="url" id="mediaUrl" placeholder="https://example.com/video.mp4" class="url-input">
          <button id="processMediaBtn" class="btn">Process Media</button>
          <div id="processingStatus" class="result-section"></div>
        </div>

        <div id="resultsContainer" style="display: none;">
          <div class="media-info-section">
            <h3>Media Information</h3>
            <div id="mediaInfo" class="info-content"></div>
          </div>

          <div class="imeta-section">
            <h3>Generated imeta Tag</h3>
            <pre id="imetaOutput" class="code-block"></pre>
            <button id="copyImeta" class="btn-small" style="display: none;">Copy imeta Tag</button>
          </div>

          <div class="media-preview-section">
            <h3>Media Preview</h3>
            <div id="mediaPreview"></div>
          </div>
        </div>
      </div>
    `;

    // Extract URL from hash if present
    const currentHash = window.location.hash;
    let prefilledUrl = '';
    
    if (currentHash.startsWith('#blob/')) {
      prefilledUrl = decodeURIComponent(currentHash.substring(6));
    }

    initializeMediaProcessor(prefilledUrl);

  } catch (error) {
    console.error("Error rendering blob page:", error);
    mainContent.innerHTML = `<h1>Error</h1><p>Error rendering page: ${error.message}</p>`;
  }
}

function initializeMediaProcessor(prefilledUrl = '') {
  const mediaUrlInput = document.getElementById('mediaUrl');
  const processMediaBtn = document.getElementById('processMediaBtn');
  
  if (prefilledUrl) {
    mediaUrlInput.value = prefilledUrl;
  }

  processMediaBtn.addEventListener('click', async () => {
    const url = mediaUrlInput.value.trim();
    if (!url) {
      showStatus('Please enter a media URL', 'error');
      return;
    }

    await processMediaUrl(url);
  });
}

async function processMediaUrl(url) {
  try {
    // Step 1: Check accessibility
    showStatus('Checking media accessibility...', 'loading');
    const headResponse = await fetch(url, { method: 'HEAD' });
    if (!headResponse.ok) {
      throw new Error('Media not accessible');
    }

    const contentType = headResponse.headers.get('Content-Type') || '';
    const isVideo = contentType.startsWith('video/');
    const isAudio = contentType.startsWith('audio/');

    if (!isVideo && !isAudio) {
      throw new Error(`Expected video or audio content, but received: ${contentType}`);
    }

    const contentLength = parseInt(headResponse.headers.get('Content-Length') || '0');

    // Step 2: Download media with progress
    const mediaBlob = await fetchVideoWithProgress(url, (progress) => {
      if (progress.indeterminate) {
        showStatus('Downloading media...', 'loading', { indeterminate: true });
      } else {
        showStatus('Downloading media...', 'loading', progress);
      }
    });

    // Step 3: Generate hash (always actual hash, never random)
    showStatus('Generating SHA-256 hash...', 'loading');
    const blobHash = await generateSHA256Hash(mediaBlob);

    // Step 4: Validate hash against URL (blossom check)
    const hashValidation = validateHashAgainstUrl(url, blobHash);

    // Step 5: Extract metadata
    showStatus('Extracting metadata...', 'loading');
    const metadata = await extractCompleteMediaMetadata(mediaBlob, contentType, isVideo, isAudio);

    // Step 6: Generate thumbnail (for video only)
    let thumbnail = null;
    if (isVideo) {
      showStatus('Generating thumbnail...', 'loading');
      thumbnail = await extractThumbnail(url);
    }

    // Step 7: Build and display results
    const mediaData = {
      url,
      type: contentType,
      size: contentLength,
      hash: blobHash, // Always the actual hash
      isHashValid: hashValidation.isValid,
      urlHash: hashValidation.urlHash,
      ...metadata,
      thumbnail,
      isVideo,
      isAudio
    };

    displayResults(mediaData, mediaBlob);
    showStatus('Processing complete!', 'success');

  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
    console.error('Error processing media:', error);
  }
}

async function extractCompleteMediaMetadata(blob, mimeType, isVideo, isAudio) {
  if (isAudio) {
    // For audio, we can only get duration
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      const blobUrl = URL.createObjectURL(blob);
      
      audio.onloadedmetadata = () => {
        const metadata = {
          duration: audio.duration,
          width: null,
          height: null,
          dimensions: 'N/A',
        };
        
        URL.revokeObjectURL(blobUrl);
        resolve(metadata);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Failed to load audio metadata'));
      };
      
      audio.src = blobUrl;
    });
  }

  // For video
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const blobUrl = URL.createObjectURL(blob);
    
    video.onloadedmetadata = () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        dimensions: `${video.videoWidth}x${video.videoHeight}`,
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

function displayResults(mediaData, blob) {
  const resultsContainer = document.getElementById('resultsContainer');
  const mediaInfo = document.getElementById('mediaInfo');
  const imetaOutput = document.getElementById('imetaOutput');
  const mediaPreview = document.getElementById('mediaPreview');

  // Display media information
  mediaInfo.innerHTML = `
    <div class="info-grid">
      <div><strong>URL:</strong> ${mediaData.url}</div>
      <div><strong>Type:</strong> ${mediaData.type}</div>
      <div><strong>Size:</strong> ${formatBytes(mediaData.size)}</div>
      ${mediaData.dimensions !== 'N/A' ? `<div><strong>Dimensions:</strong> ${mediaData.dimensions}</div>` : ''}
      <div><strong>Duration:</strong> ${mediaData.duration?.toFixed(2)}s</div>
      <div>
        <strong>Hash (SHA-256):</strong><br>
        <code class="hash">${mediaData.hash}</code>
      </div>
      <div>
        <strong>Blossom Validation:</strong> 
        <span class="${mediaData.isHashValid ? 'success' : 'warning'}">
          ${mediaData.isHashValid ? '🌸 Hash matches filename' : '⚠ Hash does not match filename'}
        </span>
      </div>
    </div>
  `;

  // Build imeta tag (always with actual hash)
  const imetaTag = [
    "imeta",
    `url ${mediaData.url}`,
    `x ${mediaData.hash}`, // Always actual hash
    `m ${mediaData.type}`,
    ...(mediaData.dimensions !== 'N/A' ? [`dim ${mediaData.dimensions}`] : []),
    `size ${mediaData.size}`
  ];

  if (mediaData.thumbnail) {
    imetaTag.push(`image ${mediaData.thumbnail}`);
  }

  const imetaString = JSON.stringify(imetaTag, null, 2);
  imetaOutput.textContent = imetaString;

  // Copy button
  document.getElementById('copyImeta').addEventListener('click', () => {
    copyToClipboard(JSON.stringify(imetaTag), document.getElementById('copyImeta'));
  });

  // Display media preview
  if (mediaData.isVideo) {
    showVideoPreview(blob, mediaPreview);
  } else if (mediaData.isAudio) {
    showAudioPreview(blob, mediaPreview);
  }

  resultsContainer.style.display = 'block';
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



function showAudioPreview(blob, container) {
  const blobUrl = URL.createObjectURL(blob);
  container.innerHTML = '';
  
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.style.width = '100%';
  
  const source = document.createElement('source');
  source.src = blobUrl;
  source.type = blob.type;
  
  audio.appendChild(source);
  audio.appendChild(document.createTextNode('Your browser does not support the audio element.'));
  
  container.appendChild(audio);
}

function showVideoPreview(blob, container) {
  const blobUrl = URL.createObjectURL(blob);
  container.innerHTML = '';
  
  const video = document.createElement('video');
  video.controls = true;
  video.style.maxWidth = '100%';
  video.style.width = '400px';
  
  const source = document.createElement('source');
  source.src = blobUrl;
  source.type = blob.type;
  
  video.appendChild(source);
  video.appendChild(document.createTextNode('Your browser does not support the video tag.'));
  
  container.appendChild(video);
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

function isBlosomUrl(url) {
  try {
    const urlObj = new URL(url);
    const filename = urlObj.pathname.split('/').pop();
    const filenameWithoutExt = filename.split('.')[0];
    // Check if it's exactly 64 hex characters
    return /^[a-f0-9]{64}$/i.test(filenameWithoutExt);
  } catch (e) {
    return false;
  }
}

let blossomValidationCache = new Map(); // Cache validation results by URL



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

function displayValidationResult(result, validationResults, fullCheckBtn) {
  if (result.success) {
    const statusClass = result.isValid ? 'success' : 'warning';
    const statusText = result.isValid 
      ? '🌸🌸🌸 Valid Blossom! Hash matches filename' 
      : '⚠ Hash does not match filename';
    
    validationResults.innerHTML = `
      <div class="result ${statusClass}">
        <h4>Blossom Validation Result</h4>
        <div class="info-grid">
          <div><strong>Status:</strong> ${statusText}</div>
          <div><strong>Calculated Hash:</strong><br><code class="hash">${result.hash}</code></div>
          <div><strong>URL Filename:</strong> ${result.urlHash || 'N/A'}</div>
        </div>
      </div>
    `;
    
   // fullCheckBtn.style.display = 'inline-block';
  } else {
    validationResults.innerHTML = `
      <div class="result error">
        <strong>Validation Error:</strong> ${result.error}
      </div>
    `;
  }
}