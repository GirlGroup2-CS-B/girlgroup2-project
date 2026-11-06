const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

const apiUrl = (process.env.GIRLGROUP2_API_URL || "http://localhost:8000").replace(
  /\/$/,
  "",
);

async function requestAuth(action, credentials) {
  const response = await fetch(`${apiUrl}/api/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const result = await response.json();
  if (!response.ok) {
    const detail = result.detail;
    const message = Array.isArray(detail)
      ? detail.map((error) => error.msg).join(". ")
      : typeof detail === "string"
        ? detail
        : `The request failed (${response.status}). Please try again.`;
    throw new Error(message);
  }
  return result;
}

ipcMain.handle("auth:register", (_event, credentials) =>
  requestAuth("register", credentials),
);
ipcMain.handle("auth:login", (_event, credentials) =>
  requestAuth("login", credentials),
);
ipcMain.handle("app:getApiUrl", () => apiUrl);

function createWindow() {
  const window = new BrowserWindow({
    title: "CampusFind - Campus Lost & Found",
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#f5f7fc",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
