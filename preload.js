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

  // Window controls (custom title bar)
  windowControl: (action) => ipcRenderer.send('window-control', action),

  // Open URL in default system browser
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Platform detection
  isElectron: true,
  hasNativeControls: true,
});
