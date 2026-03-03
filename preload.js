const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  expandWindow: () => ipcRenderer.send('expand-window'),
  closeMiniPlayer: () => ipcRenderer.send('close-mini-player'),
});
