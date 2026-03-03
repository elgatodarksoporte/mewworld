const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Mini player
  expandWindow: () => ipcRenderer.send('expand-window'),
  closeMiniPlayer: () => ipcRenderer.send('close-mini-player'),
  onSongUpdate: (callback) => ipcRenderer.on('song-update', (_, data) => callback(data)),

  // Discord Rich Presence
  updateSong: (title, artist) => ipcRenderer.send('update-song', { title, artist }),

  // Always on top
  toggleAlwaysOnTop: () => ipcRenderer.send('toggle-always-on-top'),

  // Title bar color (sync with theme)
  updateTitleBar: (color, symbolColor) => ipcRenderer.send('update-titlebar', { color, symbolColor }),

  // Platform detection
  isElectron: true,
});
