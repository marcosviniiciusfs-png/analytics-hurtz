const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('overlay', {
  minimize: () => ipcRenderer.send('overlay:minimize'),
  close: () => ipcRenderer.send('overlay:close'),
  compact: (value) => ipcRenderer.send('overlay:compact', Boolean(value)),
  chooseTrainingPdfs: () => ipcRenderer.invoke('training:choose-pdfs')
});
