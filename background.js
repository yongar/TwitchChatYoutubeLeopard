// Keep track of windows opened by the extension
let openChatWindows = {}; // Key: tabId, Value: windowId
let activeSettings = {
  twitchChannel: 'leopard',
  youtubeChannel: '@leopardstealth',
  displayMode: 'sidebar',
  sidebarWidth: 340,
  autoOpen: true
};

// Initialize settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(activeSettings, (settings) => {
    activeSettings = settings;
    
    // Configure side panel behavior
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((err) => {
        console.warn("Failed to set panel behavior:", err);
      });
    }
  });
});

// Helper to load settings on startup
chrome.storage.sync.get(activeSettings, (settings) => {
  activeSettings = settings;
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    for (let key in changes) {
      activeSettings[key] = changes[key].newValue;
    }
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;

  if (message.action === 'pageMatchedYouTube' && tabId) {
    handleAutoOpen(tabId);
  } 
  
  else if (message.action === 'pageLeftYouTube' && tabId) {
    handleAutoClose(tabId);
  } 
  
  else if (message.action === 'launchChatManual') {
    const mode = message.displayMode || activeSettings.displayMode;
    const channel = message.twitchChannel || activeSettings.twitchChannel;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      const activeTab = tabs[0];
      
      if (mode === 'sidebar') {
        // Toggle injected sidebar on the active tab
        chrome.tabs.sendMessage(activeTab.id, { 
          action: 'toggleInjectedSidebar', 
          twitchChannel: channel,
          width: activeSettings.sidebarWidth
        }).catch((err) => {
          // If content script is not loaded, we can't show sidebar
          console.warn("Cannot show sidebar on this tab:", err);
        });
      } 
      
      else if (mode === 'sidepanel') {
        if (chrome.sidePanel) {
          chrome.sidePanel.open({ tabId: activeTab.id }).catch((err) => {
            console.error("Failed to open side panel:", err);
          });
        }
      } 
      
      else if (mode === 'window') {
        openStandaloneWindow(activeTab.id, channel);
      }
    });
  }
});

// Handle automatic opening based on user preference
function handleAutoOpen(tabId) {
  if (!activeSettings.autoOpen) return;

  const mode = activeSettings.displayMode;
  const channel = activeSettings.twitchChannel;

  if (mode === 'sidepanel') {
    if (chrome.sidePanel) {
      chrome.sidePanel.open({ tabId: tabId }).catch((err) => {
        console.warn("Could not auto-open side panel:", err);
      });
    }
  } 
  
  else if (mode === 'window') {
    openStandaloneWindow(tabId, channel);
  }
}

// Handle automatic closing of opened resources
function handleAutoClose(tabId) {
  if (!activeSettings.autoOpen) return;

  // If a standalone window was opened for this tab, close it
  const windowId = openChatWindows[tabId];
  if (windowId) {
    chrome.windows.remove(windowId, () => {
      if (chrome.runtime.lastError) {
        // Window might have been closed by the user already
      }
      delete openChatWindows[tabId];
    });
  }
}

// Open a standalone companion popup window
function openStandaloneWindow(tabId, channel) {
  // If window is already open for this tab, focus it
  if (openChatWindows[tabId]) {
    chrome.windows.get(openChatWindows[tabId], (win) => {
      if (chrome.runtime.lastError || !win) {
        // Window was closed, open a new one
        createWindow();
      } else {
        chrome.windows.update(win.id, { focused: true });
      }
    });
  } else {
    createWindow();
  }

  function createWindow() {
    const url = `https://www.twitch.tv/popout/${channel}/chat?popout=`;
    
    // Position it to the right of the screen if possible
    chrome.windows.getCurrent((currentWin) => {
      let left = undefined;
      let top = undefined;
      
      if (currentWin && currentWin.width && currentWin.left) {
        // Position on the right side of the screen
        left = currentWin.left + currentWin.width - 400;
        top = currentWin.top || 100;
        if (left < 0) left = 0;
      }
      
      chrome.windows.create({
        url: url,
        type: 'popup',
        width: 400,
        height: 750,
        left: left,
        top: top
      }, (win) => {
        if (win) {
          openChatWindows[tabId] = win.id;
        }
      });
    });
  }
}

// Clean up references when windows are closed manually
chrome.windows.onRemoved.addListener((windowId) => {
  for (let tabId in openChatWindows) {
    if (openChatWindows[tabId] === windowId) {
      delete openChatWindows[tabId];
      break;
    }
  }
});
