document.addEventListener('DOMContentLoaded', () => {
  const iframe = document.getElementById('chat-iframe');
  const loadingContainer = document.getElementById('loading-container');
  const loadingText = document.getElementById('loading-text');

  let currentChannel = '';

  function loadChat(channel) {
    if (!channel) return;
    currentChannel = channel;
    loadingText.textContent = `Loading ${channel}'s chat...`;
    
    // Official Twitch Embed URL with extension ID as parent
    const extensionId = chrome.runtime.id;
    const embedUrl = `https://www.twitch.tv/embed/${channel}/chat?parent=${extensionId}&darkpopout`;
    
    iframe.style.display = 'none';
    loadingContainer.style.opacity = '1';
    loadingContainer.style.display = 'flex';
    
    iframe.src = embedUrl;
  }

  iframe.addEventListener('load', () => {
    loadingContainer.style.opacity = '0';
    setTimeout(() => {
      loadingContainer.style.display = 'none';
      iframe.style.display = 'block';
    }, 300);
  });

  // Initial load
  chrome.storage.sync.get({ twitchChannel: 'leopard' }, (settings) => {
    loadChat(settings.twitchChannel);
  });

  // Watch for channel changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.twitchChannel) {
      const newChannel = changes.twitchChannel.newValue;
      if (newChannel && newChannel !== currentChannel) {
        loadChat(newChannel);
      }
    }
  });
});
