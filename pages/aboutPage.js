async function aboutPageHandler() {
  mainContent.innerHTML = `
    <h1>Discovering FAQ</h1>
    <div class="loading-indicator">
        <p>Loading...</p>
    </div>
`;
  try {
    mainContent.innerHTML = `
<div class="faq-container">
  <section class="faq-section">

<!--
    <div class="faq-item">
     
    </div>



    <div class="faq-item">


    </div>

    -->
    <div class="faq-item">
      <h3>about us</h3>
    </div>
    </section>
</div>

            `;
  } catch (error) {
    console.error("Error rendering faq page:", error);
    mainContent.innerHTML = `
      <h1>404</h1>
      <div class="loading-indicator">
          <p>${error}</p>
      </div>
    `;
  }
}
