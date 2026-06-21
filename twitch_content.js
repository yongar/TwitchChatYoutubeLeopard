let chatFontFamily = 'Agave';
let chatFontSize = '16pt';

// Initialize styles
chrome.storage.sync.get({
  chatFontFamily: 'Agave',
  chatFontSize: '16pt'
}, (settings) => {
  chatFontFamily = settings.chatFontFamily;
  chatFontSize = settings.chatFontSize;
  applyChatStyles();
});

// Watch for settings changes to update in real-time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    let changed = false;
    if (changes.chatFontFamily) {
      chatFontFamily = changes.chatFontFamily.newValue;
      changed = true;
    }
    if (changes.chatFontSize) {
      chatFontSize = changes.chatFontSize.newValue;
      changed = true;
    }
    if (changed) {
      applyChatStyles();
    }
  }
});

function applyChatStyles() {
  let styleEl = document.getElementById('twitch-chat-custom-fonts');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'twitch-chat-custom-fonts';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    @font-face {
      font-family: '${chatFontFamily}';
      src: local('${chatFontFamily}'), local('${chatFontFamily}-Regular');
    }

    /* Target Twitch chat message scroll area, messages, authors, and text inputs */
    .chat-scrollable-area__content *,
    .chat-line__message,
    .chat-line__message *,
    .chat-line__message-body,
    .chat-line__message-body *,
    .chat-author__display-name,
    .chat-line__username,
    .chat-input textarea,
    .chat-input__textarea *,
    .chat-line__message--emote {
      font-family: '${chatFontFamily}', monospace !important;
      font-size: ${chatFontSize} !important;
    }

    /* Prevent emotes/images from scaling text styles */
    .chat-line__message img, 
    .chat-line__message-body img,
    .chat-line__message--emote img {
      width: auto !important;
      height: 1.2em !important;
      vertical-align: middle !important;
    }
  `;
}
