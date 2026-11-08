# CampusFind Desktop

Electron desktop application for the CampusFind lost-and-found system. Wraps the web frontend with native desktop features.

## Features

- **Native window** with custom menu bar (File, Edit, View, Help)
- **System tray** – minimize to tray, click to restore
- **Desktop notifications** – native OS notifications for match alerts
- **Title-bar badge** – shows pending match count in the window title
- **External links** open in the default browser
- **DevTools** available via `Ctrl+Shift+I`

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** running with the CampusFind database configured in `backend/.env`
- The **backend API** running at `http://localhost:3000`

## Setup

Start PostgreSQL and the backend API in a separate PowerShell window:

```powershell
cd ..\..\backend
npm.cmd start
```

Keep that window open while using the desktop app.

```powershell
# 1. Install Electron dependencies
cd frontend\desktop
npm.cmd install

# 2. Build the web frontend (if not already built)
npm.cmd run build:web

# 3. Run in development mode (uses Vite dev server on port 5173)
npm.cmd run dev

# 4. Run in production mode (uses built web files)
npm.cmd start
```

## Development Workflow

For the best development experience, run both the Vite dev server and Electron:

```powershell
# Terminal 1 – Start the web dev server
cd frontend\web
npm.cmd run dev

# Terminal 2 – Start Electron in dev mode
cd frontend\desktop
npm.cmd run dev
```

Electron will connect to `http://127.0.0.1:5173` and hot-reload changes.

## Packaging

```powershell
# Build a distributable .exe installer
npm.cmd run dist
```

The installer will be output to `frontend/desktop/release/`.

## Desktop API

The preload script exposes `window.desktopAPI` to the renderer:

```typescript
// Available only when running inside Electron
if (window.desktopAPI) {
  // Show a native notification
  window.desktopAPI.notify("Match found!", "Your backpack may have been found.");

  // Update title-bar badge count
  window.desktopAPI.setBadge(3);

  // Get platform info
  const info = await window.desktopAPI.getPlatform();
  // { platform: "win32", version: "1.0.0" }
}
```

## Project Structure

```
frontend/desktop/
├── main.js          # Electron main process
├── preload.js       # IPC bridge (desktopAPI)
├── package.json     # Electron + electron-builder config
├── icon.png         # App icon (place a 256×256 PNG here)
└── README.md
```

## Icon

Place a `256×256` PNG named `icon.png` in this directory for:
- Window title bar icon
- System tray icon
- Installer icon

> **Tip:** You can generate one from the CampusFind "CF" brand mark.
