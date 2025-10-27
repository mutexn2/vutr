async function faqPageHandler() {
  mainContent.innerHTML = `
    <h1>FAQ</h1>
    <div class="loading-indicator">
        <p>Loading...</p>
    </div>
`;
  try {
    mainContent.innerHTML = `
<div class="faq-container">
  <section class="faq-section">

  <!--

  -->
<div class="markdown-note">
<p>⚠ This software has not received external security review and may contain vulnerabilities and may not necessarily meet its stated security goals. Do not use it for sensitive use cases, and do not rely on its security until it has been reviewed. Work in progress.</p>
</div>




    <div class="faq-item">
      <h3>What is it?</h3>
      <p>
        A prototype video client built around <a href="https://github.com/nostr-protocol/nips/blob/master/71.md" target="_blank">Nostr (NIP-71)</a>.
      </p>
      <p>Personal and experimental project exploring Nostr.</p>
      <p>Just a client, not running or related to any nostr relay or media server.</p>
      <p>Runs fully local on device.</p>
      <a href="https://github.com/mutexn2/vutr" target="_blank">Open-source</a>
      </div>

<div class="faq-item">
<h3>⚠ Decentralized Service Notice</h3>
<p>Content may be unreliable, unverified, or potentially unsafe.</p>
<p>Use at your own risk.</p>
    </div>
<!--
    <div class="faq-item">
      <h2>How does it work?</h2>
      <p>
      </p>
    </div>
  
    <div class="faq-item">
      <h2>Is it free?</h2>
      <p>
      </p>
    </div>

    <div class="faq-item">
      <h2>How to use it?</h2>
      <h3>For viewers</h3>
      <p>
      </p>

      <h3>For creators</h3>
      <p>
      </p>

    </div>
-->

    </div>
<!--



    <div class="faq-item">
    <p>color palette</p>
    <div class="color-palette">
  <div class="color-item" data-color="text">
    <div class="color-swatch color-text"></div>
    <span class="color-label">Text</span>
  </div>
  <div class="color-item" data-color="text-secondary">
    <div class="color-swatch color-text-secondary"></div>
    <span class="color-label">Text Secondary</span>
  </div>
  <div class="color-item" data-color="background">
    <div class="color-swatch color-background"></div>
    <span class="color-label">Background</span>
  </div>
  <div class="color-item" data-color="surface">
    <div class="color-swatch color-surface"></div>
    <span class="color-label">Surface</span>
  </div>
  <div class="color-item" data-color="primary">
    <div class="color-swatch color-primary"></div>
    <span class="color-label">Primary</span>
  </div>
  <div class="color-item" data-color="primary-hover">
    <div class="color-swatch color-primary-hover"></div>
    <span class="color-label">Primary Hover</span>
  </div>
  <div class="color-item" data-color="secondary">
    <div class="color-swatch color-secondary"></div>
    <span class="color-label">Secondary</span>
  </div>
  <div class="color-item" data-color="secondary-hover">
    <div class="color-swatch color-secondary-hover"></div>
    <span class="color-label">Secondary Hover</span>
  </div>
  <div class="color-item" data-color="accent">
    <div class="color-swatch color-accent"></div>
    <span class="color-label">Accent</span>
  </div>
  <div class="color-item" data-color="border">
    <div class="color-swatch color-border"></div>
    <span class="color-label">Border</span>
  </div>
</div>


    -->
    
    </section>


    <div class="donation">
      <p>Open-source software is built by the community, for the community.</p>
      <p>Your donation supports ongoing development and maintenance.</p>
      <button class="donate-btn">Donate</button>
    <div>
</div>

            `;




  const profileLinks = document.querySelector(".donation");
  if (profileLinks) {
    profileLinks.appendChild(createLightningButton("donation"));
  }




  } catch (error) {
    console.error("Error rendering faq page:", error);
    mainContent.innerHTML = `
      <h1>404</h1>
      <div class="loading-indicator">
          <p>Error rendering faq page</p>
      </div>
    `;
  }
}
