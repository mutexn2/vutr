function createDefaultPlayer(videoEvent) {
    console.log("Creating default player for event:", videoEvent);
  
    const imetaTag = videoEvent.tags.find((tag) => tag[0] === "imeta");
    if (!imetaTag) {
      console.error("No imeta tag found in video event");
      return '<div class="video-error">Video metadata not found</div>';
    }
  
    const urlIndex = imetaTag.findIndex((item) => item.startsWith("url "));
    const videoUrl = urlIndex !== -1 ? imetaTag[urlIndex].substring(4) : null;
  
    if (!videoUrl) {
      console.error("No video URL found in imeta tag");
      return '<div class="video-error">Video URL not found</div>';
    }
  
    const videoId = `video-${videoEvent.id.substring(0, 10)}`;
  
    const videoElement = `
      <div class="default-video-container" id="${videoId}-container">
        <video 
          id="${videoId}" 
          controls 
          preload="metadata" 
          class="default-video-player">
          <source src="${videoUrl}">
          Your browser does not support the video tag.
        </video>
      </div>
    `;
  
    return videoElement;
  }