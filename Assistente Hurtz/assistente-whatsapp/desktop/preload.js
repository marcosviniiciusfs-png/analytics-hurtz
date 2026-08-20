const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hurtzDesktop", {
  adminToken: () => ipcRenderer.invoke("security:admin-token"),
});
