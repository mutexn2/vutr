// Basic custom video player function
function createVideoPlayer(video) {
  let url = getValueFromTags(video, "url", "");
  let mimeType = getValueFromTags(video, "m", "video/mp4");
  
  if (!url) {
    return '<div class="video-error">No video URL provided</div>';
  }
  
  return `
    <div class="custom-video-player">
      <div class="custom-player-indicator">Custom Player</div>
      <video controls class="custom-video-element">
        <source src="${escapeHtml(url)}" type="${escapeHtml(mimeType)}">
        Your browser does not support the video tag.
      </video>
    </div>
  `;
}