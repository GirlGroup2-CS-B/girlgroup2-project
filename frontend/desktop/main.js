const { app, BrowserWindow, Menu, Tray, Notification, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// ── Globals ──────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;

const isDev = !app.isPackaged || process.env.ELECTRON_DEV === "true";
const DEV_URL = "http://127.0.0.1:5173";
const WEB_DIST = isDev
  ? path.join(__dirname, "..", "web", "dist", "index.html")
  : path.join(process.resourcesPath, "web-dist", "index.html");

function showStartupError(error) {
  console.error("CampusFind failed to load its interface:", error);
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const message = String(error).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!doctype html>
    <html lang="en">
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>CampusFind could not start</title>
      <body style="font:16px system-ui,sans-serif;color:#172033;background:#f6f3fb;min-height:100vh;display:grid;place-content:center;padding:24px;box-sizing:border-box">
        <main style="max-width:620px">
          <h1>CampusFind could not start</h1>
          <p>The desktop interface could not be loaded. Rebuild the web app, then reopen CampusFind.</p>
          <pre style="white-space:pre-wrap;background:#fff;padding:12px;border-radius:8px">${message}</pre>
          <p>Development: start the web server with <code>npm.cmd run dev</code>.</p>
          <p>Packaged app: keep the complete <code>win-unpacked</code> folder together.</p>
        </main>
      </body>
    </html>
  `)}`);
}

// ── Window ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: "CampusFind",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: "#f5f6f8",
  });

  // Load content
  if (isDev) {
    mainWindow.loadURL(DEV_URL).catch(() => {
      if (!fs.existsSync(WEB_DIST)) {
        showStartupError(`Built frontend not found: ${WEB_DIST}`);
        return;
      }
      mainWindow.loadFile(WEB_DIST).catch(showStartupError);
    });

    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    if (!fs.existsSync(WEB_DIST)) {
      showStartupError(`Packaged frontend not found: ${WEB_DIST}`);
    } else {
      mainWindow.loadFile(WEB_DIST).catch(showStartupError);
    }
  }

  mainWindow.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && !mainWindow.webContents.getURL().startsWith("data:text/html")) {
      showStartupError(`${description} (${code})\n${url}`);
    }
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    showStartupError(`The interface process stopped unexpectedly (${details.reason}).`);
  });

  // Show when ready (avoids white flash)
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    // Minimize to tray instead of closing
    if (tray && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── Application menu ─────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: "CampusFind",
      submenu: [
        { label: "About CampusFind", role: "about" },
        { type: "separator" },
        {
          label: "Refresh",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow && mainWindow.reload(),
        },
        {
          label: "Toggle DevTools",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => mainWindow && mainWindow.webContents.toggleDevTools(),
        },
        { type: "separator" },
        {
          label: "Quit CampusFind",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            app.isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "JRMSU Main Campus",
          click: () => shell.openExternal("https://jrmsu.edu.ph"),
        },
        {
          label: "CampusFind on GitHub",
          enabled: false,
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── System tray ──────────────────────────────────────────────────────
function createTray() {
  // Use a simple built-in icon if the tray-icon file is not found
  const iconPath = path.join(__dirname, "icon.png");
  try {
    tray = new Tray(iconPath);
  } catch {
    // If no icon file, skip tray creation
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open CampusFind",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("CampusFind – Lost & Found");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// ── IPC handlers (preload bridge) ────────────────────────────────────
ipcMain.handle("desktop:notify", (_event, title, body) => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body });
    notification.show();
    notification.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
});

ipcMain.handle("desktop:badge", (_event, count) => {
  if (mainWindow) {
    mainWindow.setTitle(count > 0 ? `CampusFind (${count})` : "CampusFind");
  }
});

ipcMain.handle("desktop:platform", () => {
  return { platform: process.platform, version: app.getVersion() };
});

// ── App lifecycle ────────────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu();
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuitting = true;
});
