function createLightningButton(containerId) {
    const button = document.createElement('button');
    button.className = 'lightning-btn';
    button.setAttribute('aria-label', 'Lightning button');
    
    const svgIcon = `
      <svg class="lightning-icon" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <g id="Layer_1">
          <title>Zap</title>
          <path class="lightning-path" transform="rotate(15.2977, 201.109, 190.023)" d="m173.44849,44.07792l52.1323,82.16247l-21.49627,9.69646l65.64452,70.39524l-21.48664,11.75628l81.15034,117.88052l-137.64546,-90.33599l26.25396,-12.54514l-85.52279,-57.86105l30.64567,-17.88094l-90.29974,-60.69877l100.62411,-52.56908z" />
        </g>
      </svg>
    `;
    
    button.innerHTML = svgIcon;
    
    button.addEventListener('click', function() {
      const location = containerId || 'unknown';
      console.log(`Lightning button clicked in ${location}`);
      
      const path = this.querySelector('.lightning-path');
      
      path.classList.remove('zap-animation');
      
      // Force reflow - this is key to making the animation restart
      void path.offsetWidth;
      
      path.classList.add('zap-animation');
      
      setTimeout(() => {
        path.classList.remove('zap-animation');
      }, 1200); // animation duration
    });
    
    return button;
  }
  //document.getElementById('header').appendChild(createLightningButton('header'));
  //document.getElementById('sidebar').appendChild(createLightningButton('sidebar'));
  //document.getElementById('footer').appendChild(createLightningButton('footer'));