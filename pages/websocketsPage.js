async function websocketsPageHandler() {
  mainContent.innerHTML = `
    <div id="websocketsPage-container">
      <h1>WebSocket Connection Manager</h1>
      <div id="stats-info"></div>
      <div id="controls">
        <button id="refresh-btn">↻</button>
        <button id="clear-closed-btn">Clear Closed</button>
      </div>
      <div id="tabs-container">
        <div class="tabs-header">
          <button class="tab-btn active" data-tab="active-relays">Active URLs</button>
          <button class="tab-btn" data-tab="blocked-relays">Blocked URLs</button>
        </div>
        <div class="tabs-content">
          <div id="active-relays" class="tab-content active">
            <div id="connections-list"></div>
          </div>
          <div id="blocked-relays" class="tab-content">
            <div id="blocked-urls-list"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const pageContainer = document.getElementById("websocketsPage-container");
  
  try {
    const connectionsList = document.getElementById("connections-list");
    const blockedUrlsList = document.getElementById("blocked-urls-list");
    const statsInfo = document.getElementById("stats-info");
    const refreshBtn = document.getElementById("refresh-btn");
    const clearClosedBtn = document.getElementById("clear-closed-btn");
    
    let currentTab = 'active-relays';
    
    // Utility functions
    function formatTimeAgo(seconds) {
      if (seconds < 60) return `${seconds}s ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      return `${Math.floor(seconds / 3600)}h ago`;
    }
    
    function getHostname(url) {
      try {
        return new URL(url).hostname;
      } catch (e) {
        return url;
      }
    }
    
    function createStatsGrid(stats) {
      const statsGrid = document.createElement('div');
      statsGrid.className = 'stats-grid';
      
      const statItems = [
      //  { value: stats.workingConnections, label: 'Working Connections' },
        { value: stats.workingURLs, label: 'Working URLs' },
      //  { value: stats.activeConnections, label: 'Total Active' },
      //  { value: stats.totalCreated, label: 'Total Created' },
        { value: stats.totalErrors, label: 'Errors' }
      ];
      
      if (stats.blockedURLs > 0) {
        statItems.push({ value: stats.blockedURLs, label: 'Blocked URLs' });
      }
      
      statItems.forEach(stat => {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        
        const statValue = document.createElement('span');
        statValue.className = 'stat-value';
        statValue.textContent = stat.value;
        
        const statLabel = document.createElement('span');
        statLabel.className = 'stat-label';
        statLabel.textContent = stat.label;
        
        statItem.appendChild(statValue);
        statItem.appendChild(statLabel);
        statsGrid.appendChild(statItem);
      });
      
      return statsGrid;
    }
    
    function createStatusBadge(status) {
      const badge = document.createElement('span');
      badge.className = `status-badge ${status}`;
      badge.textContent = status.toUpperCase();
      return badge;
    }
    
    function createActionButton(text, className, clickHandler) {
      const button = document.createElement('button');
      button.className = `action-btn ${className}`;
      button.textContent = text;
      button.addEventListener('click', clickHandler);
      return button;
    }
    
    function createConnectionItem(urlInfo) {
      const connectionDiv = document.createElement('div');
      const statusClass = urlInfo.isWorking ? 'working' : 
                         urlInfo.isActive ? 'connecting' : 'failed';
      connectionDiv.className = `connection-item ${statusClass}`;
      
      const hostname = getHostname(urlInfo.url);
      const timeAgo = Math.floor((Date.now() - urlInfo.firstConnected.getTime()) / 1000);
      const lastActivityAgo = Math.floor((Date.now() - urlInfo.lastActivity.getTime()) / 1000);
      
      // Header
      const header = document.createElement('div');
      header.className = 'connection-header';
      
      const urlSpan = document.createElement('span');
      urlSpan.className = 'connection-url';
      urlSpan.textContent = hostname;
      
      const meta = document.createElement('div');
      meta.className = 'connection-meta';
      
      meta.appendChild(createStatusBadge(statusClass));
      
  //    const countSpan = document.createElement('span');
  //    countSpan.className = 'connection-count';
  //    countSpan.textContent = `${urlInfo.workingCount}/${urlInfo.activeCount} working`;
  //    meta.appendChild(countSpan);
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'connection-time';
      timeSpan.textContent = formatTimeAgo(timeAgo);
      meta.appendChild(timeSpan);
      
      header.appendChild(urlSpan);
      header.appendChild(meta);
      
      // Details
      const details = document.createElement('div');
      details.className = 'connection-details';
      
      const detailItems = [
        `URL: ${urlInfo.url}`,
        `First Connected: ${urlInfo.firstConnected.toLocaleString()}`,
        `Last Activity: ${urlInfo.lastActivity.toLocaleString()} (${formatTimeAgo(lastActivityAgo)})`,
        `Total Messages: ${urlInfo.totalMessages} | Total Errors: ${urlInfo.totalErrors}`,
    //    `Working Connections: ${urlInfo.workingCount} | Total Active: ${urlInfo.activeCount}`
      ];
      
  //    if (urlInfo.originalURLs.length > 1) {
  //      detailItems.splice(1, 0, `Original URLs: ${urlInfo.originalURLs.join(', ')}`);
  //    }
      
      detailItems.forEach(text => {
        const small = document.createElement('small');
        small.innerHTML = `<strong>${text.split(': ')[0]}:</strong> ${text.split(': ').slice(1).join(': ')}`;
        details.appendChild(small);
      });
      
      // Actions
      const actions = document.createElement('div');
      actions.className = 'connection-actions';
      
      if (urlInfo.isActive) {
        const closeBtn = createActionButton('Close All', 'close-all-btn', (e) => {
          const closed = window.WebSocketManager.closeConnectionsByURL(urlInfo.url);
          if (closed > 0) {
            e.target.textContent = `Closing ${closed}...`;
            e.target.disabled = true;
            setTimeout(render, 500);
          }
        });
        actions.appendChild(closeBtn);
      }
      
      const blockBtn = createActionButton('Block', 'block-btn', () => {
        if (confirm(`Block all future connections to:\n${hostname}?\n (Refresh the app to see the changes)`)) {
          window.WebSocketManager.blockURL(urlInfo.url);
          setTimeout(render, 500);
        }
      });
      actions.appendChild(blockBtn);
      
      connectionDiv.appendChild(header);
      connectionDiv.appendChild(details);
      connectionDiv.appendChild(actions);
      
      return connectionDiv;
    }
    
    function createBlockedItem(url) {
      const blockedDiv = document.createElement('div');
      blockedDiv.className = 'connection-item blocked-item';
      
      const hostname = getHostname(url);
      
      // Header
      const header = document.createElement('div');
      header.className = 'connection-header';
      
      const urlSpan = document.createElement('span');
      urlSpan.className = 'connection-url blocked';
      urlSpan.textContent = hostname;
      
      const meta = document.createElement('div');
      meta.className = 'connection-meta';
      
      const badge = document.createElement('span');
      badge.className = 'blocked-badge';
      badge.textContent = 'BLOCKED';
      meta.appendChild(badge);
      
      header.appendChild(urlSpan);
      header.appendChild(meta);
      
      // Details
      const details = document.createElement('div');
      details.className = 'connection-details';
      
      const urlDetail = document.createElement('small');
      urlDetail.innerHTML = `<strong>URL:</strong> ${url}`;
      details.appendChild(urlDetail);
      
      const statusDetail = document.createElement('small');
      statusDetail.innerHTML = '<strong>Status:</strong> All connections to this URL are blocked';
      details.appendChild(statusDetail);
      
      // Actions
      const actions = document.createElement('div');
      actions.className = 'connection-actions';
      
      const unblockBtn = createActionButton('Unblock', 'unblock-btn', () => {
        if (confirm(`Unblock connections to:\n${hostname}?\n (Refresh the app to see the changes)`)) {
          window.WebSocketManager.unblockURL(url);
          render();
        }
      });
      actions.appendChild(unblockBtn);
      
      blockedDiv.appendChild(header);
      blockedDiv.appendChild(details);
      blockedDiv.appendChild(actions);
      
      return blockedDiv;
    }
    
    function renderStats() {
      if (!window.WebSocketManager) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = 'WebSocket manager not available';
        statsInfo.replaceChildren(errorDiv);
        return;
      }
      
      const stats = window.WebSocketManager.getStats();
      const statsGrid = createStatsGrid(stats);
      statsInfo.replaceChildren(statsGrid);
    }
    
    function renderBlockedURLs() {
      if (!window.WebSocketManager) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = 'WebSocket manager not available';
        blockedUrlsList.replaceChildren(errorDiv);
        return;
      }
      
      const blockedURLs = window.WebSocketManager.getBlockedURLs();
      
      if (blockedURLs.length === 0) {
        const noConnectionsDiv = document.createElement('div');
        noConnectionsDiv.className = 'no-connections';
        
        const p = document.createElement('p');
        p.textContent = 'No blocked URLs';
        
        const small = document.createElement('small');
        small.textContent = 'Block relay URLs from the Active URLs tab to see them here';
        
        noConnectionsDiv.appendChild(p);
        noConnectionsDiv.appendChild(small);
        blockedUrlsList.replaceChildren(noConnectionsDiv);
        return;
      }
      
      const fragment = document.createDocumentFragment();
      blockedURLs.forEach(url => {
        fragment.appendChild(createBlockedItem(url));
      });
      
      blockedUrlsList.replaceChildren(fragment);
    }
    
    function renderConnections() {
      if (!window.WebSocketManager) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = 'WebSocket manager not available';
        connectionsList.replaceChildren(errorDiv);
        return;
      }
      
      const aggregatedConnections = window.WebSocketManager.getAggregatedConnections();
      
      if (aggregatedConnections.length === 0) {
        const noConnectionsDiv = document.createElement('div');
        noConnectionsDiv.className = 'no-connections';
        
        const p = document.createElement('p');
        p.textContent = 'No WebSocket connections found';
        
        const small = document.createElement('small');
        small.textContent = 'Navigate to other pages to see connections appear here';
        
        noConnectionsDiv.appendChild(p);
        noConnectionsDiv.appendChild(small);
        connectionsList.replaceChildren(noConnectionsDiv);
        return;
      }
      
      // Sort by working status first, then by most recent activity
      aggregatedConnections.sort((a, b) => {
        if (a.isWorking !== b.isWorking) return a.isWorking ? -1 : 1;
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return b.lastActivity - a.lastActivity;
      });
      
      const fragment = document.createDocumentFragment();
      aggregatedConnections.forEach(urlInfo => {
        fragment.appendChild(createConnectionItem(urlInfo));
      });
      
      connectionsList.replaceChildren(fragment);
    }
    
    function handleTabSwitch(tabName) {
      currentTab = tabName;
      
      // Update tab buttons
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });
      
      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
      });
      
      render();
    }
    
    function render() {
      renderStats();
      if (currentTab === 'active-relays') {
        renderConnections();
      } else if (currentTab === 'blocked-relays') {
        renderBlockedURLs();
      }
    }
    
    // Event listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        handleTabSwitch(e.target.dataset.tab);
      });
    });
    
    refreshBtn.addEventListener('click', render);
    
    clearClosedBtn.addEventListener('click', () => {
      const cleared = window.WebSocketManager.clearClosedConnections();
      if (cleared > 0) {
        render();
      }
    });
    
    // Initial render
    render();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(render, 10000);
    
    // Cleanup when page changes
    const cleanup = () => {
      clearInterval(interval);
      document.removeEventListener('hashchange', cleanup);
    };
    document.addEventListener('hashchange', cleanup);

  } catch (error) {
    console.error("Error rendering websockets page:", error);
    const errorDiv = document.createElement("div");
    errorDiv.innerHTML = `
      <h1>Error</h1>
      <div class="loading-indicator">
        <p>Error rendering websockets page: ${formatErrorForDisplay(error)}</p>
      </div>
    `;
    pageContainer.replaceChildren(errorDiv);
  }
}