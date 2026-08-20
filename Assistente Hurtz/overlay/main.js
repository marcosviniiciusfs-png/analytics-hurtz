const { app, BrowserWindow, globalShortcut, ipcMain, dialog } = require('electron');
const path = require('path');

let win;
const expandedSize = { width: 540, height: 680 };
const compactSize = { width: 540, height: 58 };
function createOverlay() {
  win = new BrowserWindow({
    width: expandedSize.width, height: expandedSize.height, x: 32, y: 32, frame: false, transparent: true,
    alwaysOnTop: true, skipTaskbar: true, focusable: true, resizable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setContentProtection(true);
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createOverlay();
  globalShortcut.register('CommandOrControl+Shift+H', () => win?.isVisible() ? win.hide() : win.showInactive());
});
ipcMain.on('overlay:minimize', () => win?.minimize());
ipcMain.on('overlay:close', () => app.quit());
ipcMain.on('overlay:compact', (_event, compact) => {
  const size = compact ? compactSize : expandedSize;
  win?.setSize(size.width, size.height, true);
});
ipcMain.handle('training:choose-pdfs', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Selecionar documentos de treinamento',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
  });
  return result.canceled ? [] : result.filePaths;
});
app.on('will-quit', () => globalShortcut.unregisterAll());
