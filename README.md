# Direct Social Video Downloader

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Userscript](https://img.shields.io/badge/Userscript-Tampermonkey-green.svg)](https://www.tampermonkey.net/)
[![Platform](https://img.shields.io/badge/Platform-X%20%7C%20Instagram%20%7C%20TikTok-black.svg)](#supported-platforms)
[![Version](https://img.shields.io/badge/Version-2.2.0-orange.svg)](social-downloader.user.js)

A clean, modern, and lightweight Tampermonkey userscript that adds an elegant floating download button to videos on **X (Twitter)**, **Instagram**, and **TikTok**. Download videos directly as MP4 files with a single click—no annoying redirect websites, no sketchy popup ads, and no registration required.

---

## ✨ Features

- ⚡ **One-Click Direct Downloads**: Download videos in highest available quality (up to 1080p) directly as `.mp4`.
- 🚫 **Ad-Free & No Redirects**: Everything is processed seamlessly in the background without opening unwanted tabs or sending you to ad-heavy download portals.
- 🎯 **Non-Intrusive Floating UI**: A sleek, dark-themed download button dynamically appears in the top-right corner when you hover over any video element.
- 🍞 **Real-Time Toast Feedback**: Clear on-screen notifications display status updates (`Resolving source...`, `Downloading...`, `Download complete!`).
- 🔄 **Smart Fallback Engine**:
  - Direct MP4 stream detection
  - Handles Blob / Media Source Extensions (MSE) streams seamlessly
  - Redundant fallback resolvers for high availability (FxTwitter, TikWM & Cobalt APIs)
  - Enhanced TikTok FYP feed & xgplayer container ID extraction

---

## 🌐 Supported Platforms

| Platform | Supported Content | Match URLs |
| :--- | :--- | :--- |
| **X (Twitter)** | Feed Videos, Status Clips, Media Tweets | `https://x.com/*`, `https://twitter.com/*` |
| **Instagram** | Reels, Video Posts (`/reel/`, `/p/`, `/reels/`) | `https://www.instagram.com/*` |
| **TikTok** | For You Feed, Direct Video Posts | `https://www.tiktok.com/*` |

---

## 🚀 Installation

### Prerequisites

You need a userscript manager browser extension installed. We recommend:
- **[Tampermonkey](https://www.tampermonkey.net/)** (Chrome, Firefox, Safari, Edge, Brave, Opera)
- **Violentmonkey** (Open-source alternative)

---

### Method 1: One-Click Install (Recommended)

Once this repository is on GitHub, click the raw link below. Tampermonkey will automatically detect the script and prompt you to install it:

👉 **[Install Direct Social Video Downloader (Raw)](https://raw.githubusercontent.com/EnyaliosATH/social-video-downloader/main/social-downloader.user.js)**

---

### Method 2: Manual Installation

1. Open your browser extension dashboard (e.g., **Tampermonkey Dashboard**).
2. Click the **Utilities** or **+ (Add a new script)** tab.
3. Open [`social-downloader.user.js`](social-downloader.user.js) from this repository, copy its full contents, and paste it into the editor.
4. Press `Ctrl + S` (or `Cmd + S` on macOS) to save.

---

## 📖 How to Use

1. Navigate to any video on [X](https://x.com), [Instagram](https://www.instagram.com), or [TikTok](https://www.tiktok.com).
2. Hover your mouse cursor over the video.
3. A round, translucent download button with a download icon will appear on the top-right corner of the video.
4. Click the button.
5. Watch the toast notification at the bottom-right corner as it resolves the media link and automatically saves the MP4 file to your default downloads folder!

---

## 🔒 Permissions & Safety

This userscript requests the following minimal Tampermonkey permissions:
- `GM_download`: Native browser download API to save MP4 files with clean filenames.
- `GM_xmlhttpRequest`: Used to resolve video sources and fetch streams across origins without CORS restrictions.
- `GM_addStyle`: Injects clean CSS styles for the button and toast alerts.

No tracking, no analytics, no telemetry.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.
