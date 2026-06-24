let settings = {
  twitchChannel: 'leopard',
  youtubeChannel: '@leopardstealth',
  displayMode: 'sidebar',
  sidebarWidth: 340,
  replaceWithTwitch: true,
  autoOpen: true
};

let isMatched = false;
let sidebarRoot = null;
let toggleBtn = null;
let checkInterval = null;
let currentUrl = '';
let manuallyClosed = false;

const twitchIconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>`;
const youtubeIconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;

// Initialize Settings
chrome.storage.sync.get(settings, (savedSettings) => {
  settings = savedSettings;
  init();
});

// Watch for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    chrome.storage.sync.get(settings, (newSettings) => {
      const oldMode = settings.displayMode;
      const oldChannel = settings.twitchChannel;
      const oldWidth = settings.sidebarWidth;
      const oldReplace = settings.replaceWithTwitch;
      
      settings = newSettings;
      
      // Update width immediately if fallback sidebar exists
      if (sidebarRoot && settings.sidebarWidth !== oldWidth) {
        sidebarRoot.style.setProperty('--twitch-chat-width', `${settings.sidebarWidth}px`);
      }

      // If channel changed, reload iframe
      if (settings.twitchChannel !== oldChannel) {
        // 1. Fallback sidebar
        if (sidebarRoot) {
          const iframe = sidebarRoot.querySelector('.twitch-chat-sidebar-iframe');
          if (iframe) {
            iframe.src = `https://www.twitch.tv/embed/${settings.twitchChannel}/chat?parent=www.youtube.com&darkpopout`;
          }
        }
        // 2. Replaced chat
        const replacedIframe = document.querySelector('.twitch-chat-replaced-iframe');
        if (replacedIframe) {
          replacedIframe.src = `https://www.twitch.tv/embed/${settings.twitchChannel}/chat?parent=www.youtube.com&darkpopout`;
        }
      }

      // Handle replace toggle changes
      if (settings.replaceWithTwitch !== oldReplace) {
        if (settings.displayMode === 'sidebar') {
          createSidebar(false);
        }
      }

      // Handle display mode changes
      if (settings.displayMode !== oldMode) {
        if (settings.displayMode !== 'sidebar') {
          removeSidebar();
        } else {
          runDetection();
        }
      }
    });
  }
});

// Listen for updates from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleInjectedSidebar') {
    manuallyClosed = false;
    if (message.twitchChannel) {
      settings.twitchChannel = message.twitchChannel;
    }
    createSidebar(true);
  }
});

function init() {
  // Listen for YouTube SPA finish navigation event
  document.addEventListener('yt-navigate-finish', () => {
    runDetection();
  });

  // Polling check (highly reliable backup for dynamic elements)
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(() => {
    if (window.location.href !== currentUrl) {
      runDetection();
    } else if (isMatched && settings.displayMode === 'sidebar') {
      // Check if native chat frame is available, and if so, check if we've replaced it yet
      const nativeChat = document.querySelector('ytd-live-chat-frame#chat, #chat');
      if (nativeChat) {
        const replacedIframe = nativeChat.querySelector('.twitch-chat-replaced-iframe');
        if (settings.replaceWithTwitch && !replacedIframe) {
          runDetection();
        }
      } else if (!sidebarRoot) {
        runDetection();
      }

      // Update button position and titles
      updateOnPageControls();
    }
  }, 1500);

  runDetection();
}

// Detect if current YouTube page belongs to Leopard or configured channel
function runDetection() {
  currentUrl = window.location.href;
  
  chrome.storage.sync.get(settings, (savedSettings) => {
    settings = savedSettings;
    
    const wasMatched = isMatched;
    isMatched = checkIfTargetPage();

    if (isMatched) {
      if (!wasMatched) {
        chrome.runtime.sendMessage({ action: 'pageMatchedYouTube' });
      }
      
      if (settings.displayMode === 'sidebar') {
        createSidebar(false);
      } else {
        removeSidebar();
      }
    } else {
      if (wasMatched) {
        chrome.runtime.sendMessage({ action: 'pageLeftYouTube' });
      }
      removeSidebar();
    }
  });
}

function checkIfTargetPage() {
  const url = window.location.href.toLowerCase();
  const targetHandle = settings.youtubeChannel.toLowerCase().trim();
  const handleWithoutAt = targetHandle.replace('@', '');

  // 1. Direct URL matching
  if (url.includes('/@' + handleWithoutAt) || url.includes('/' + targetHandle)) {
    return true;
  }

  // 2. Watch page checking
  if (url.includes('/watch?')) {
    const ownerLink = document.querySelector(
      'ytd-video-owner-renderer a.yt-simple-endpoint, ' +
      'ytd-video-owner-renderer a[href*="/@"], ' +
      '#owner-name a, ' +
      '.ytd-video-owner-renderer a'
    );
    
    if (ownerLink) {
      const href = ownerLink.getAttribute('href') || '';
      if (href.toLowerCase().includes('/@' + handleWithoutAt) || href.toLowerCase().includes('/' + targetHandle)) {
        return true;
      }
    }
    
    const channelNameEl = document.querySelector(
      'ytd-video-owner-renderer ytd-channel-name yt-formatted-string a, ' +
      '#upload-info ytd-channel-name a'
    );
    if (channelNameEl) {
      const text = channelNameEl.textContent.trim().toLowerCase();
      if (text === handleWithoutAt || text === targetHandle) {
        return true;
      }
    }
  }

  return false;
}

// Injects the Twitch sidebar (either replacing native YouTube chat or using custom fallback sidebar)
function createSidebar(forceShow = false) {
  // Inject/Update the Toggle Button and Title next to the Live Chat placeholder (or action menu)
  updateOnPageControls();

  // Try to find native YouTube live chat element
  const nativeChat = document.querySelector('ytd-live-chat-frame#chat, #chat');

  if (nativeChat) {
    // 1. YouTube Live Chat Replacement Mode
    
    // Clean up fallback sidebar if it exists
    removeFallbackSidebar();

    if (settings.replaceWithTwitch) {
      // Add active class to native chat container so our absolute CSS styles apply
      if (!nativeChat.classList.contains('twitch-active')) {
        nativeChat.classList.add('twitch-active');
      }

      // Check if we already injected our iframe inside the light DOM
      let replacedIframe = nativeChat.querySelector('.twitch-chat-replaced-iframe');
      if (!replacedIframe) {
        replacedIframe = document.createElement('iframe');
        replacedIframe.className = 'twitch-chat-replaced-iframe';
        replacedIframe.sandbox = 'allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups';
        replacedIframe.src = `https://www.twitch.tv/embed/${settings.twitchChannel}/chat?parent=www.youtube.com&darkpopout`;
        nativeChat.appendChild(replacedIframe);
      } else {
        // Ensure source is correct if settings updated
        const expectedSrc = `https://www.twitch.tv/embed/${settings.twitchChannel}/chat?parent=www.youtube.com&darkpopout`;
        if (replacedIframe.src !== expectedSrc) {
          replacedIframe.src = expectedSrc;
        }
      }
    } else {
      // They toggled to show the YouTube Chat - remove replacement class and iframe
      removeReplacedChatOnly(nativeChat);
    }
    
    // We are in replacement mode; hide our custom fallback toggle tab
    ensureToggleBtn(false);
  } else {
    // 2. Fallback Sidebar Mode (standard videos or channel pages where live chat doesn't exist)
    removeReplacedChat();

    if (manuallyClosed && !forceShow) {
      ensureToggleBtn(false);
      return;
    }

    const columns = document.querySelector('#columns');
    if (!columns) return;

    if (!sidebarRoot) {
      sidebarRoot = document.createElement('div');
      sidebarRoot.id = 'twitch-chat-sidebar-root';
      sidebarRoot.style.setProperty('--twitch-chat-width', `${settings.sidebarWidth}px`);

      // Resize Handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'twitch-chat-resize-handle';
      sidebarRoot.appendChild(resizeHandle);
      setupResizer(resizeHandle);

      // Header
      const header = document.createElement('div');
      header.className = 'twitch-chat-sidebar-header';
      header.innerHTML = `
        <div class="twitch-chat-sidebar-title-group">
          <div class="twitch-chat-status-dot"></div>
          <span>Twitch Chat</span>
        </div>
        <div class="twitch-chat-sidebar-actions">
          <button class="twitch-chat-action-btn reload-btn" title="Reload Chat">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>
          <button class="twitch-chat-action-btn popout-btn" title="Pop out Window">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </button>
          <button class="twitch-chat-action-btn close-btn" title="Hide Sidebar">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;
      sidebarRoot.appendChild(header);

      header.querySelector('.reload-btn').addEventListener('click', reloadIframe);
      header.querySelector('.popout-btn').addEventListener('click', popoutToWindow);
      header.querySelector('.close-btn').addEventListener('click', () => {
        manuallyClosed = true;
        toggleSidebarState(false);
      });

      // Iframe Container with Spinner
      const iframeContainer = document.createElement('div');
      iframeContainer.className = 'twitch-chat-iframe-container';
      
      const spinnerContainer = document.createElement('div');
      spinnerContainer.className = 'twitch-chat-spinner-container';
      spinnerContainer.innerHTML = `
        <div class="twitch-chat-spinner"></div>
        <div>Connecting to Twitch...</div>
      `;
      iframeContainer.appendChild(spinnerContainer);

      const iframe = document.createElement('iframe');
      iframe.className = 'twitch-chat-sidebar-iframe';
      iframe.sandbox = 'allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups';
      iframe.src = `https://www.twitch.tv/embed/${settings.twitchChannel}/chat?parent=www.youtube.com&darkpopout`;
      
      iframe.addEventListener('load', () => {
        spinnerContainer.style.display = 'none';
      });

      iframeContainer.appendChild(iframe);
      sidebarRoot.appendChild(iframeContainer);
    }

    if (sidebarRoot.parentNode !== columns) {
      columns.appendChild(sidebarRoot);
    }

    ensureToggleBtn(true);
    
    if (forceShow || settings.autoOpen) {
      toggleSidebarState(true);
    }
  }
}

// Manages position of toggle button and chat placeholder titles
function updateOnPageControls() {
  if (!isMatched) return;

  // 1. Update the "Live chat" title to "Live chat / Twitch chat"
  const chatTitle = document.querySelector('h2.ytCarouselTitleViewModelTitle, .ytCarouselTitleViewModelTitle');
  if (chatTitle && chatTitle.textContent.trim() === 'Live chat') {
    chatTitle.textContent = 'Live chat / Twitch chat';
  }

  // 2. Find the "Open panel" button container next to the Live Chat placeholder under the video
  const openPanelBtnHost = document.querySelector('.ytTextCarouselItemViewModelButton, button-view-model.ytTextCarouselItemViewModelButton');
  if (openPanelBtnHost) {
    ensureActionBtn(openPanelBtnHost, true);
    return;
  }

  // Fallback: If not found, try the standard actions menu (Like/Share row) below the video
  const actionsMenu = document.querySelector(
    'ytd-watch-metadata #actions-inner ytd-menu-renderer, ' +
    'ytd-watch-metadata #actions ytd-menu-renderer, ' +
    'ytd-menu-renderer.ytd-watch-metadata, ' +
    '#top-level-buttons-computed'
  );
  if (actionsMenu) {
    ensureActionBtn(actionsMenu, false);
  }
}

// Restores original page layouts when leaving matched channel
function restoreOnPageControls() {
  removeActionBtn();
  const chatTitle = document.querySelector('h2.ytCarouselTitleViewModelTitle, .ytCarouselTitleViewModelTitle');
  if (chatTitle && chatTitle.textContent === 'Live chat / Twitch chat') {
    chatTitle.textContent = 'Live chat';
  }
}

// Injects the quick toggle button inside YouTube's DOM next to the open panel button or actions row
function ensureActionBtn(targetContainer, isNextTo) {
  let btn = document.querySelector('#twitch-chat-action-toggle-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'twitch-chat-action-toggle-btn';
    
    btn.addEventListener('click', () => {
      const nextReplaceState = !settings.replaceWithTwitch;
      chrome.storage.sync.set({ replaceWithTwitch: nextReplaceState });
    });
  }

  // Position it correctly in the DOM
  if (isNextTo) {
    if (targetContainer.nextSibling !== btn) {
      targetContainer.after(btn);
    }
  } else {
    if (btn.parentNode !== targetContainer) {
      targetContainer.appendChild(btn);
    }
  }

  if (settings.replaceWithTwitch) {
    btn.className = 'twitch-active';
    btn.innerHTML = `${twitchIconSvg} <span>Twitch Chat</span>`;
    btn.title = "Showing Twitch Chat. Click to show YouTube Chat.";
  } else {
    btn.className = 'youtube-active';
    btn.innerHTML = `${youtubeIconSvg} <span>YouTube Chat</span>`;
    btn.title = "Showing YouTube Chat. Click to show Twitch Chat.";
  }
}

function removeActionBtn() {
  const btn = document.querySelector('#twitch-chat-action-toggle-btn');
  if (btn) btn.remove();
}

function ensureToggleBtn(visible) {
  if (!visible) {
    if (toggleBtn) {
      toggleBtn.remove();
      toggleBtn = null;
    }
    return;
  }

  const columns = document.querySelector('#columns');
  if (!columns) return;

  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'twitch-chat-toggle-btn';
    toggleBtn.title = "Toggle Twitch Chat";
    toggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    `;
    toggleBtn.addEventListener('click', () => {
      const isCurrentlyCollapsed = sidebarRoot.classList.contains('collapsed');
      if (isCurrentlyCollapsed) {
        manuallyClosed = false;
      } else {
        manuallyClosed = true;
      }
      toggleSidebarState(isCurrentlyCollapsed);
    });
    
    document.body.appendChild(toggleBtn);
  }
}

function toggleSidebarState(show) {
  if (!sidebarRoot) return;

  if (show) {
    sidebarRoot.classList.remove('collapsed');
    if (toggleBtn) {
      toggleBtn.classList.add('active');
      toggleBtn.title = "Hide Twitch Chat";
    }
  } else {
    sidebarRoot.classList.add('collapsed');
    if (toggleBtn) {
      toggleBtn.classList.remove('active');
      toggleBtn.title = "Show Twitch Chat";
    }
  }
}

function removeFallbackSidebar() {
  if (sidebarRoot) {
    sidebarRoot.remove();
    sidebarRoot = null;
  }
  ensureToggleBtn(false);
}

function removeReplacedChatOnly(chatContainer) {
  chatContainer.classList.remove('twitch-active');
  const replacedIframe = chatContainer.querySelector('.twitch-chat-replaced-iframe');
  if (replacedIframe) {
    replacedIframe.remove();
  }
}

function removeReplacedChat() {
  const nativeChats = document.querySelectorAll('ytd-live-chat-frame#chat, #chat');
  nativeChats.forEach(chat => {
    removeReplacedChatOnly(chat);
  });
  restoreOnPageControls();
}

function removeSidebar() {
  removeFallbackSidebar();
  removeReplacedChat();
  manuallyClosed = false;
}

// Reloads Twitch iframe inside sidebar
function reloadIframe() {
  if (!sidebarRoot) return;
  const iframe = sidebarRoot.querySelector('.twitch-chat-sidebar-iframe');
  const spinnerContainer = sidebarRoot.querySelector('.twitch-chat-spinner-container');
  if (iframe && spinnerContainer) {
    spinnerContainer.style.display = 'flex';
    const src = iframe.src;
    iframe.src = '';
    iframe.src = src;
  }
}

function popoutToWindow() {
  removeSidebar();
  chrome.runtime.sendMessage({
    action: 'launchChatManual',
    displayMode: 'window',
    twitchChannel: settings.twitchChannel
  });
}

// Draggable Resize Handler logic
function setupResizer(resizeHandle) {
  let isResizing = false;

  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    resizeHandle.classList.add('resizing');
    document.body.style.cursor = 'ew-resize';
    
    const iframe = sidebarRoot.querySelector('.twitch-chat-sidebar-iframe');
    if (iframe) {
      iframe.style.pointerEvents = 'none';
    }

    const startWidth = parseInt(getComputedStyle(sidebarRoot).width, 10);
    const startX = e.clientX;

    function onMouseMove(moveEvent) {
      if (!isResizing) return;
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX));
      sidebarRoot.style.setProperty('--twitch-chat-width', `${newWidth}px`);
    }

    function onMouseUp() {
      isResizing = false;
      resizeHandle.classList.remove('resizing');
      document.body.style.cursor = '';
      
      if (iframe) {
        iframe.style.pointerEvents = 'auto';
      }

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const finalWidth = parseInt(getComputedStyle(sidebarRoot).width, 10);
      chrome.storage.sync.set({ sidebarWidth: finalWidth });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}
