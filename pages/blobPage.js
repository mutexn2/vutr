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
    // Step 1: Check accessibility (but don't rely on HEAD for size)
    showStatus('Checking media accessibility...', 'loading');
    const headResponse = await fetch(url, { method: 'HEAD' }).catch(() => null);
    
    if (headResponse && !headResponse.ok) {
      throw new Error('Media not accessible');
    }

    // Step 1.5: Detect content type with fallbacks
    let contentType = headResponse ? detectContentType(headResponse, url) : '';
    
    // If we still have a generic type or no HEAD response, try to sniff
    if (!contentType || contentType === 'application/octet-stream' || contentType === '') {
      showStatus('Detecting file type...', 'loading');
      contentType = await sniffContentTypeFromData(url) || 'application/octet-stream';
    }
    
    // Determine if this is video/audio
    const isVideo = contentType.startsWith('video/');
    const isAudio = contentType.startsWith('audio/');
    const isMedia = isVideo || isAudio;
    
    // Warn but don't block if we can't determine type
    if (!isMedia) {
      console.warn('Could not determine media type, assuming video for processing:', contentType);
      // Ask user if they want to proceed
      const proceed = confirm(
        `Could not determine if this is a video/audio file.\n` +
        `Content-Type: ${contentType || '(empty)'}\n` +
        `Do you want to try processing it anyway?`
      );
      
      if (!proceed) {
        throw new Error('User cancelled - unknown file type');
      }
      
      contentType = 'video/mp4';
    }

    // Step 2: Download media with integrated hashing (this gives us actual size!)
    showStatus('Downloading media...', 'loading');
    
    const result = await fetchVideoWithProgress(url, (progress) => {
      if (progress.indeterminate) {
        showStatus('Downloading media...', 'loading', { indeterminate: true });
      } else {
        // Convert to the format your showStatus function expects
        const percentage = progress.percent !== null && progress.percent !== undefined 
          ? progress.percent 
          : 0;
        
        showStatus(`Downloading: ${percentage.toFixed(1)}%`, 'loading', {
          percentage: percentage, // Your function expects "percentage" not "percent"
          loaded: progress.loaded,
          total: progress.total
        });
      }
    });

    const mediaBlob = result.blob;
    const blobHash = result.hash;
    const actualSize = result.size; // This is the actual downloaded size!
    const headerSize = result.contentLength; // Size from headers (might be 0)

    // Step 3: Validate hash against URL
    const hashValidation = validateHashAgainstUrl(url, blobHash);

    // Step 4: Extract metadata from blob
    showStatus('Extracting metadata...', 'loading');
    let metadata = {};
    
    try {
      metadata = await extractCompleteMediaMetadata(mediaBlob, contentType, isVideo, isAudio);
    } catch (metadataError) {
      console.warn('Could not extract metadata:', metadataError);
      metadata = {
        duration: 0,
        width: null,
        height: null,
        dimensions: 'Unknown'
      };
    }
    
    // Calculate bitrate using actual downloaded size
    let bitrate = 0;
    if (metadata.duration && metadata.duration > 0 && actualSize > 0) {
      bitrate = Math.round((actualSize * 8) / metadata.duration);
    }

    // Step 5: Generate thumbnail
    let thumbnail = null;
    if (isVideo) {
      showStatus('Generating thumbnail...', 'loading');
      try {
        thumbnail = await extractThumbnail(url);
      } catch (thumbError) {
        console.warn('Could not generate thumbnail:', thumbError);
        thumbnail = await generatePlaceholderThumbnail();
      }
    }

    // Step 6: Build and display results
    const mediaData = {
      url,
      type: contentType,
      detectedType: !isMedia ? 'unknown (assumed video)' : contentType,
      size: actualSize, // Use actual downloaded size!
      headerSize: headerSize, // Keep header size for reference
      hash: blobHash,
      isHashValid: hashValidation.isValid,
      urlHash: hashValidation.urlHash,
      ...metadata,
      bitrate: bitrate, // Now calculated with actual size
      thumbnail,
      isVideo: isVideo || !isMedia,
      isAudio,
      metadataExtracted: Object.keys(metadata).length > 0
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
  // Always use hash-wasm for consistency
  const stream = blob.stream();
  const reader = stream.getReader();
  const sha256 = await hashwasm.createSHA256();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sha256.update(value);
  }
  
  return sha256.digest('hex');
}

async function downloadAndHashStreaming(url, onProgress = null) {
  console.log('Starting streaming download and hash for:', url);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const contentLength = parseInt(response.headers.get('content-length') || '0');
  const reader = response.body.getReader();
  const sha256 = await hashwasm.createSHA256();
  
  let bytesProcessed = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Update hash with the chunk
      sha256.update(value);
      bytesProcessed += value.length;
      
      // Report progress if callback provided
      if (onProgress && contentLength > 0) {
        const percent = (bytesProcessed / contentLength) * 100;
        onProgress({
          loaded: bytesProcessed,
          total: contentLength,
          percent: percent
        });
      }
      
      // Free memory immediately (value is a Uint8Array)
      // Just letting it go out of scope is enough
    }
    
    const hash = sha256.digest('hex');
    console.log(`✅ Processed ${formatBytes(bytesProcessed)}, hash: ${hash}`);
    
    return {
      hash: hash,
      size: bytesProcessed
    };
    
  } finally {
    reader.releaseLock();
  }
}

/* async function generateSHA256Hash(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
 */
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
async function fetchVideoWithProgress(url, onProgress = null) {
  console.log('Starting download for:', url);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  // Get content length from the actual response (not HEAD)
  const contentLength = parseInt(response.headers.get('content-length') || '0');
  const reader = response.body.getReader();
  const sha256 = await hashwasm.createSHA256();
  
  const chunks = [];
  let bytesProcessed = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Update hash with chunk
      sha256.update(value);
      
      // Store chunk
      chunks.push(value);
      bytesProcessed += value.length;
      
      // Report progress - use contentLength if available, otherwise bytesProcessed
      if (onProgress) {
        const total = contentLength > 0 ? contentLength : bytesProcessed; // Use bytesProcessed as total if unknown
        const percent = contentLength > 0 ? (bytesProcessed / contentLength) * 100 : null;
        
        onProgress({
          loaded: bytesProcessed,
          total: total,
          percent: percent,
          indeterminate: contentLength === 0
        });
      }
      
      // Memory management for huge files
      if (bytesProcessed > 500 * 1024 * 1024) {
        if (bytesProcessed % (50 * 1024 * 1024) < value.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    
    const hash = sha256.digest('hex');
    const blob = new Blob(chunks);
    
    console.log(`✅ Downloaded ${formatBytes(bytesProcessed)}, hash: ${hash}`);
    
    // Return both blob, hash, AND the actual size we downloaded
    return {
      blob: blob,
      hash: hash,
      size: bytesProcessed, // Actual downloaded size
      contentLength: contentLength // Content-Length from headers (might be 0)
    };
    
  } finally {
    reader.releaseLock();
  }
}
async function validateBlossomInPlace(videoUrl, onProgress = null) {
  try {
    console.log('📥 Validating blossom for URL:', videoUrl);
    
    // Wrap the progress callback to normalize the format
    const wrappedProgressCallback = onProgress ? (progress) => {
      // Convert progress format to match what your UI expects
      const normalizedProgress = {
        loaded: progress.loaded,
        total: progress.total,
        percentage: progress.percent !== null && progress.percent !== undefined 
          ? progress.percent 
          : 0, // Convert percent to percentage
        indeterminate: progress.indeterminate
      };
      onProgress(normalizedProgress);
    } : null;
    
    const result = await fetchVideoWithProgress(videoUrl, wrappedProgressCallback);
    
    console.log('✅ Hash generated:', result.hash);
    console.log('🌸 Validating hash against URL filename...');
    const validation = validateHashAgainstUrl(videoUrl, result.hash);
    
    return {
      success: true,
      hash: result.hash,
      isValid: validation.isValid,
      urlHash: validation.urlHash,
      blobHash: validation.blobHash,
      size: result.blob.size
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



//////////////
function detectContentType(headResponse, url) {
  // First, try to get from headers
  let contentType = headResponse.headers.get('Content-Type') || '';
  
  // If we have a valid specific type, return it
  if (contentType && contentType !== 'application/octet-stream') {
    return contentType;
  }
  
  // Try to detect from file extension
  const extension = getFileExtensionFromUrl(url);
  const mimeFromExtension = getMimeTypeFromExtension(extension);
  
  if (mimeFromExtension) {
    return mimeFromExtension;
  }
  
  // If we still don't know, default to video/mp4 (most common)
  // But we'll verify by downloading a small chunk
  return 'application/octet-stream'; // Generic type, we'll sniff later
}

function getFileExtensionFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastSegment = pathname.split('/').pop();
    const dotIndex = lastSegment.lastIndexOf('.');
    
    if (dotIndex > 0) {
      return lastSegment.substring(dotIndex + 1).toLowerCase();
    }
  } catch (e) {
    console.warn('Could not parse URL:', e);
  }
  return '';
}

function getMimeTypeFromExtension(extension) {
  const mimeTypes = {
    // Video
    'mp4': 'video/mp4',
    'm4v': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'ogv': 'video/ogg',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'mkv': 'video/x-matroska',
    'mpeg': 'video/mpeg',
    'mpg': 'video/mpeg',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'oga': 'audio/ogg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'weba': 'audio/webm',
    'opus': 'audio/ogg',
    
    // Images (just in case)
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  
  return mimeTypes[extension] || null;
}


async function sniffContentTypeFromData(url) {
  try {
    // Download just the first 512 bytes to sniff the file signature
    const response = await fetch(url, {
      headers: { 'Range': 'bytes=0-511' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check for common file signatures
    if (isMP4(uint8Array)) return 'video/mp4';
    if (isWebM(uint8Array)) return 'video/webm';
    if (isOGG(uint8Array)) return 'video/ogg';
    if (isAVI(uint8Array)) return 'video/x-msvideo';
    if (isMOV(uint8Array)) return 'video/quicktime';
    if (isMP3(uint8Array)) return 'audio/mpeg';
    if (isWAV(uint8Array)) return 'audio/wav';
    if (isFLAC(uint8Array)) return 'audio/flac';
    
    // Could not determine
    return 'application/octet-stream';
  } catch (error) {
    console.warn('Could not sniff file type:', error);
    return 'application/octet-stream';
  }
}

// Helper functions for file signature detection
function isMP4(data) {
  // MP4 files start with 'ftyp' at byte 4
  return data.length >= 12 && 
    data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70;
}

function isWebM(data) {
  // WebM starts with 0x1A45DFA3
  return data.length >= 4 &&
    data[0] === 0x1A && data[1] === 0x45 && data[2] === 0xDF && data[3] === 0xA3;
}

function isOGG(data) {
  // OGG starts with 'OggS'
  return data.length >= 4 &&
    data[0] === 0x4F && data[1] === 0x67 && data[2] === 0x67 && data[3] === 0x53;
}

function isAVI(data) {
  // AVI starts with 'RIFF' then 'AVI '
  return data.length >= 12 &&
    data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
    data[8] === 0x41 && data[9] === 0x56 && data[10] === 0x49 && data[11] === 0x20;
}

function isMOV(data) {
  // MOV starts with 'ftyp' at various positions
  // QuickTime files have 'moov' or 'mdat' atoms
  if (data.length < 8) return false;
  
  // Check for 'ftyp' at position 4
  if (data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70) {
    return true;
  }
  
  // Check for 'moov' or 'mdat'
  for (let i = 0; i < Math.min(data.length - 8, 100); i++) {
    if ((data[i] === 0x6D && data[i+1] === 0x6F && data[i+2] === 0x6F && data[i+3] === 0x76) ||
        (data[i] === 0x6D && data[i+1] === 0x64 && data[i+2] === 0x61 && data[i+3] === 0x74)) {
      return true;
    }
  }
  
  return false;
}

function isMP3(data) {
  // MP3 files start with frame sync bits (11111111 111)
  if (data.length < 2) return false;
  
  const firstByte = data[0];
  const secondByte = data[1];
  
  // Check for MPEG sync bits
  if (firstByte === 0xFF && (secondByte & 0xE0) === 0xE0) {
    return true;
  }
  
  // Check for ID3 tag
  if (data.length >= 10 &&
      data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
    return true;
  }
  
  return false;
}

function isWAV(data) {
  // WAV starts with 'RIFF' then 'WAVE'
  return data.length >= 12 &&
    data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
    data[8] === 0x57 && data[9] === 0x41 && data[10] === 0x56 && data[11] === 0x45;
}

function isFLAC(data) {
  // FLAC starts with 'fLaC'
  return data.length >= 4 &&
    data[0] === 0x66 && data[1] === 0x4C && data[2] === 0x61 && data[3] === 0x43;
}