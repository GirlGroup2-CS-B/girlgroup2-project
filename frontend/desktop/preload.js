const { contextBridge, ipcRenderer } = require("electron");

/**
 * Preload script – exposes a safe desktop API to the renderer process.
 *
 * In the web app you can check `window.desktopAPI` to detect whether the
 * app is running inside Electron and use native features when available.
 *
 * Example usage in React:
 *   if (window.desktopAPI) {
 *     window.desktopAPI.notify("Match found!", "Your lost backpack may have been found.");
 *   }
 */
contextBridge.exposeInMainWorld("desktopAPI", {
  /** Show a native OS notification */
  notify: (title, body) => ipcRenderer.invoke("desktop:notify", title, body),

  /** Update the title-bar badge count (e.g. pending matches) */
  setBadge: (count) => ipcRenderer.invoke("desktop:badge", count),

  /** Get platform info */
  getPlatform: () => ipcRenderer.invoke("desktop:platform"),

  /** Flag indicating the app is running in Electron */
  isDesktop: true,
});
