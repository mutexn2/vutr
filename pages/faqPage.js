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

    <div class="markdown-note">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
        class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
<p><strong>Security Notice:</strong> This is experimental software that hasn't undergone external security review. Do not use for sensitive data. Content may be unreliable or unsafe - use at your own risk.</p>
    </div>




    <div class="faq-item">
      <h3>What is it?</h3>
      <p>
        - A prototype video client built around <a href="https://github.com/nostr-protocol/nips/blob/master/71.md"
          target="_blank">Nostr (NIP-71)</a>.
      </p>
      <p>- Experimental project exploring nostr.</p>

 
     
    </div>




    <div class="faq-item">
      <div class="donation">

        <p>Your donation supports ongoing development and maintenance.</p>
        <button class="donate-btn">Donate</button>
      </div>
    </div>


    <div class="faq-item">
      <p>made by</p>
      <div id="made-by"></div>
      <p></p>
    </div>

  </section>

</div>



    <!--

 <a href="https://github.com/nostr-protocol/nips/blob/master/71.md" target="_blank">Open-source</a>



          <p>- Using nostr as the discovery/social layer for the URLs.</p>      
      <p>- Any http file server exposing a direct media URL should work. <a href="https://github.com/hzrd149/blossom"
          target="_blank">Blossom</a> is currently optional and not fully applied. 
      </p>
            <p>Open-source software is built by the community, for the community.</p>
      <p>- Just a frontend and not running or related to any nostr relay or media server.</p>    
      <p>- Runs fully local on device.</p>  

    <div class="faq-item" id="another-notice">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
        class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <h3>Decentralized Service Notice</h3>
      <p>Content may be unreliable, unverified, or potentially unsafe.</p>
      <p>Use at your own risk.</p>
    </div>
    
    
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




      `;

  let madeBy = document.querySelector('#made-by');
  let maker = 'npub1mutexn28l0umympkquy0vsfjqn32dz7ee3q90lyvztkvl3vawvfsgqwgck';

  let creatorImage = document.createElement('nostr-picture');
  creatorImage.className = 'channel-name';
  creatorImage.setAttribute('pubkey', maker);
  madeBy.appendChild(creatorImage);
  let creatorName = document.createElement('nostr-name');
  creatorName.className = 'channel-name';
  creatorName.setAttribute('pubkey', maker);
  madeBy.appendChild(creatorName);

  madeBy.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.hash = `#profile/${maker}`;
  });


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
