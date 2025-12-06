async function blossomPageHandler() {
  mainContent.innerHTML = `
    <h1>Discovering blossom</h1>
    <div class="loading-indicator">
        <p>Loading...</p>
    </div>
`;
  try {
    mainContent.innerHTML = `
<div class="blossom-container">
  <section class="blossom-section">


    <div class="blossom-item">
      <h3>blossom</h3>
    </div>
    </section>
</div>

            `;
  } catch (error) {
    console.error("Error rendering blossom page:", error);
    mainContent.innerHTML = `
      <h1>404</h1>
      <div class="loading-indicator">
          <p>${error}</p>
      </div>
    `;
  }
}
