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

  // Song download
  downloadSong: (url, filename) => ipcRenderer.invoke('download-song', { url, filename }),
  onDownloadProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },

  // Platform detection
  isElectron: true,
});
