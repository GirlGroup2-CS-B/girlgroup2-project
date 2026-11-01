const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("girlgroup2", {
  register: (credentials) => ipcRenderer.invoke("auth:register", credentials),
  login: (credentials) => ipcRenderer.invoke("auth:login", credentials),
  getApiUrl: () => ipcRenderer.invoke("app:getApiUrl"),
});
