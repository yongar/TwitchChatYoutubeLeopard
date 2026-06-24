document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const twitchInput = document.getElementById('twitchChannel');
  const youtubeInput = document.getElementById('youtubeChannel');
  const modeRadios = document.querySelectorAll('input[name="displayMode"]');
  const widthSlider = document.getElementById('sidebarWidth');
  const widthValue = document.getElementById('widthValue');
  const widthSection = document.getElementById('sidebarWidthSection');
  const chatFontInput = document.getElementById('chatFontFamily');
  const chatFontSizeInput = document.getElementById('chatFontSize');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const replaceCheckbox = document.getElementById('replaceWithTwitch');
  const replaceSection = document.getElementById('replaceToggleSection');
  const autoOpenCheckbox = document.getElementById('autoOpen');
  const openNowBtn = document.getElementById('openNowBtn');
  const saveNotice = document.getElementById('saveNotice');

  // Default settings (size is now in pixels, defaulting to 21px which is ~16pt)
  const defaults = {
    twitchChannel: 'leopard',
    youtubeChannel: '@leopardstealth',
    displayMode: 'sidebar',
    sidebarWidth: 340,
    chatFontFamily: 'Agave',
    chatFontSize: 21,
    replaceWithTwitch: true,
    autoOpen: true
  };

  let saveTimeout;

  // Load settings
  chrome.storage.sync.get(defaults, (settings) => {
    twitchInput.value = settings.twitchChannel;
    youtubeInput.value = settings.youtubeChannel;
    
    // Set active radio
    const activeRadio = Array.from(modeRadios).find(r => r.value === settings.displayMode);
    if (activeRadio) activeRadio.checked = true;
    
    widthSlider.value = settings.sidebarWidth;
    widthValue.textContent = `${settings.sidebarWidth}px`;
    
    chatFontInput.value = settings.chatFontFamily;
    chatFontSizeInput.value = settings.chatFontSize;
    fontSizeValue.textContent = `${settings.chatFontSize}px`;
    
    replaceCheckbox.checked = settings.replaceWithTwitch;
    autoOpenCheckbox.checked = settings.autoOpen;

    updateUIState(settings.displayMode);
  });

  // Save settings helper
  function saveSettings() {
    const activeRadio = Array.from(modeRadios).find(r => r.checked);
    const settings = {
      twitchChannel: twitchInput.value.trim().toLowerCase() || 'leopard',
      youtubeChannel: youtubeInput.value.trim() || '@leopardstealth',
      displayMode: activeRadio ? activeRadio.value : 'sidebar',
      sidebarWidth: parseInt(widthSlider.value, 10),
      chatFontFamily: chatFontInput.value.trim() || 'Agave',
      chatFontSize: parseInt(chatFontSizeInput.value, 10) || 21,
      replaceWithTwitch: replaceCheckbox.checked,
      autoOpen: autoOpenCheckbox.checked
    };

    chrome.storage.sync.set(settings, () => {
      // Notify active tabs and background script about settings change
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated', settings }).catch(() => {
            // Ignore errors
          });
        });
      });

      chrome.runtime.sendMessage({ action: 'settingsUpdated', settings }).catch(() => {
        // Ignore errors
      });

      showSaveNotice();
    });
  }

  // Update UI state based on mode
  function updateUIState(mode) {
    if (mode === 'sidebar') {
      widthSection.classList.remove('disabled');
      replaceSection.classList.remove('disabled');
    } else {
      widthSection.classList.add('disabled');
      replaceSection.classList.add('disabled');
    }
  }

  // Show "Settings saved" flash notice
  function showSaveNotice() {
    clearTimeout(saveTimeout);
    saveNotice.classList.add('visible');
    saveTimeout = setTimeout(() => {
      saveNotice.classList.remove('visible');
    }, 1500);
  }

  // Event Listeners
  twitchInput.addEventListener('input', saveSettings);
  youtubeInput.addEventListener('input', saveSettings);
  
  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateUIState(e.target.value);
      saveSettings();
    });
  });

  widthSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    widthValue.textContent = `${val}px`;
    chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateWidthRealtime', 
          width: val 
        }).catch(() => {});
      });
    });
  });
  widthSlider.addEventListener('change', saveSettings);

  chatFontInput.addEventListener('input', saveSettings);
  
  chatFontSizeInput.addEventListener('input', (e) => {
    fontSizeValue.textContent = `${e.target.value}px`;
  });
  chatFontSizeInput.addEventListener('change', saveSettings);
  
  replaceCheckbox.addEventListener('change', saveSettings);
  autoOpenCheckbox.addEventListener('change', saveSettings);

  // Manual Trigger Button
  openNowBtn.addEventListener('click', () => {
    const activeRadio = Array.from(modeRadios).find(r => r.checked);
    const displayMode = activeRadio ? activeRadio.value : 'sidebar';
    const twitchChannel = twitchInput.value.trim().toLowerCase() || 'leopard';

    chrome.runtime.sendMessage({
      action: 'launchChatManual',
      displayMode,
      twitchChannel
    });
  });
});
