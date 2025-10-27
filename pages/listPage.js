async function listPageHandler() {
  mainContent.innerHTML = `
    <h1>Discovering Videos</h1>
    <div class="loading-indicator">
        <p>Searching for video events...</p>
    </div>
  `;

  try {
    let kinds = [21];
    let limit = 21;


    let videos = await NostrClient.getEvents({ kinds: kinds, limit: limit });
    videos = videos.map(sanitizeNostrEvent).filter(v => v !== null);
    //let videos = await NostrClient.getVideos(21);
    if (videos.length === 0) {
      mainContent.innerHTML = `
                    <h1>No Videos Found</h1>
                    <p>No kind-21 video events were found on the connected relays.</p>
                `;
      return;
    }
    videos.sort((a, b) => b.created_at - a.created_at);
    console.log("~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.");

    mainContent.innerHTML = `<h2>Listview</h2>
    <div class="listv-spacer"></div>
                             <div class="videos-listview"></div>`;
    const vlist = document.querySelector('.videos-listview');

    videos.forEach(video => {
      const card = createVideoCard(video);
      vlist.appendChild(card);
    });
    vlist.addEventListener('click', (event) => {
  const card = event.target.closest('.video-card');
  if (card && card.dataset.videoId) {
    window.location.hash = `#watch/${card.dataset.videoId}`;
  }
});
} catch (error) {
  console.error("Error rendering list page:", error);
  let errorDiv = document.createElement("div");
  errorDiv.innerHTML = safeHtml`
    <h1>404</h1>
    <div class="loading-indicator">
      <p>Error rendering list page: ${formatErrorForDisplay(error)}</p>
    </div>
  `;
  mainContent.replaceChildren(errorDiv);
}
}
