// indexeddb
async function offlinePageHandler() {
    mainContent.innerHTML = `
      <h1>Discovering offline</h1>
      <div class="loading-indicator">
          <p>Loading...</p>
      </div>
  `;
    try {
      mainContent.innerHTML = `
  <div class="offline-container">
    <section class="offline-section">
      <img
        src="https://cdn.nostrcheck.me/366f9f161c6b578559b8d69cfac006c83d7d8d5342130c117b3c3fdfc08946f4.svg"
        width="200px"
        height="200px"
        alt="Vutr_logo"
      />
  
      <div class="offline-item">
        <h3></h3>
        <p>
          
        </p>
      </div>
  
      <div class="offline-item">
        <h3></h3>
        <p>
          
        </p>
      </div>
  
    </section>
  </div>
  
              `;
    } catch (error) {
      console.error("Error rendering offline page:", error);
      mainContent.innerHTML = `
        <h1>404</h1>
        <div class="loading-indicator">
            <p>${error}</p>
        </div>
      `;
    }
  }
  