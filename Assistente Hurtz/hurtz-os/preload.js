const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("hurtzOS", {
  open: (tool) => ipcRenderer.invoke("os:open", tool),
  status: () => ipcRenderer.invoke("os:status"),
  detachMeeting: () => ipcRenderer.invoke("os:detach-meeting"),
  window: (action) => ipcRenderer.send("os:window", action),
  onStatus: (callback) => ipcRenderer.on("os:status-changed", (_event, value) => callback(value)),
});
