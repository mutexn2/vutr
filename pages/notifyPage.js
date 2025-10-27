async function notifyPageHandler() {
  try {
    mainContent.innerHTML = `
            <div class="contacting-container">
              <h1>notifications</h1>
              <div class="contact-details">
                <h2>notifications</h2>
                <p>Coming Soon™</p>
              </div>
            </div>
          `;
  } catch (error) {
    console.error("Error rendering notifications page:", error);
    mainContent.innerHTML = `
      <h1>404</h1>
      <div class="loading-indicator">
          <p>Error rendering notifications page: ${error}</p>
      </div>
    `;
  }
}
