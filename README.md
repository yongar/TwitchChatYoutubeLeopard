# Twitch Chat on YouTube Live (Leopard)

A premium Manifest V3 Google Chrome extension designed for viewers of the content creator **Leopard**. It automatically overlays, embeds, or pops out the Twitch chat when watching Leopard's live stream on YouTube.

---

## 🌟 Key Features

- **YouTube Chat Replacement**: When Twitch Chat is active, the extension automatically hides YouTube's native live chat feed and embeds the Twitch chat iframe in its place.
- **Theater Mode Compatibility**: Since the Twitch chat resides inside YouTube's official chat container, it behaves perfectly in **Theater Mode**, remaining docked on the right side of the video player without falling below it.
- **Live Chat Placeholder Toggle Button**: Adds a native-looking toggle button directly next to YouTube's "Open panel" button in the Live Chat placeholder section under the video player. (Falls back to the Like/Share action row below the video if the placeholder isn't visible).
  - If showing Twitch, it appears as a purple **Twitch Chat** pill button. Clicking it swaps the panel back to the native YouTube chat.
  - If showing YouTube, it appears as a neutral outlined **YouTube Chat** pill button. Clicking it swaps the panel to the Twitch chat.
- **Multi-Mode Integration**: Configurable via the settings popup:
  1. **Injected Sidebar (Recommended)**: Seamlessly replaces the YouTube live chat feed.
  2. **Chrome Side Panel**: Slides open the native Chrome side panel to load Twitch chat.
  3. **Standalone Window**: Opens a borderless companion popup window on the right side of the screen.
- **Dynamic Styling**: A customized content injector applies custom styles inside the Twitch chat frames. Set your preferred local PC fonts (e.g., `Agave`) and size (e.g., `21px` slider) dynamically!
- **Auto-Open**: Toggle whether the extension launches the chat automatically when matching the target stream.

---

## 🛠️ How to Install (Chrome Developer Mode)

Since this is an unpacked extension:

1. Download or clone this repository to your local machine.
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. In the top-right corner, toggle the **Developer mode** switch to **ON**.
4. In the top-left corner, click the **Load unpacked** button.
5. Select this project's directory (`TwitchChatYoutubeLeopard`) from your file system.
6. The extension is now loaded! Pin the **Leopard Chat** icon to your extensions bar for quick settings access.

---

## ⚙️ How to Configure

Click the extension icon in Chrome's toolbar to open the settings panel:
- **Twitch Channel**: Customize the Twitch source channel (default: `leopard`).
- **YouTube Handle**: Customize the YouTube channel target handle (default: `@leopardstealth`).
- **Display Mode**: Switch between Sidebar, Side Panel, and Standalone Window in real-time.
- **Chat Styling**: Customize the text font family (loads any font installed on your PC) and font size.
- **Launch Chat Now**: Manual button to launch the chat window on any page you're currently browsing.

---

## 🔒 Security & Privacy

This extension is lightweight, secure, and processes everything locally on your browser. It does not collect user data, track browsing history, or make external API requests.
