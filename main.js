const { app, BrowserWindow, shell, Menu, Tray, nativeImage, globalShortcut, Notification, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

const DiscordRPC = require('discord-rpc');

const APP_URL = 'https://mewworld.net/inicio';
const APP_DOMAIN = 'mewworld.net';
const DISCORD_CLIENT_ID = '1472533119881052222';

let mainWindow = null;
let splashWindow = null;
let miniPlayerWindow = null;
let tray = null;
let rpcClient = null;
let rpcReady = false;

// ==================== SETTINGS ====================

const settingsFile = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(settingsFile)) {
      return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return {};
}

function saveSettings(settings) {
  try {
    const current = loadSettings();
    fs.writeFileSync(settingsFile, JSON.stringify({ ...current, ...settings }));
  } catch (e) { /* ignore */ }
}

// ==================== WINDOW STATE (remember position/size) ====================

const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return { width: 1280, height: 800 };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    fs.writeFileSync(stateFile, JSON.stringify({ ...bounds, isMaximized }));
  } catch (e) { /* ignore */ }
}

// ==================== AUTO-START ====================

function setAutoStart(enabled) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath('exe'),
  });
  saveSettings({ autoStart: enabled });
}

function isAutoStartEnabled() {
  const settings = loadSettings();
  return settings.autoStart === true;
}

// ==================== SPLASH SCREEN ====================

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 380,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

// ==================== MAIN WINDOW ====================

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 600,
    title: 'Radio 24/7',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0C111D',
      symbolColor: '#ffffff',
      height: 36,
    },
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Hide menu bar
  Menu.setApplicationMenu(null);

  // Restore maximized state
  if (state.isMaximized) {
    mainWindow.maximize();
  }

  // Load the app
  mainWindow.loadURL(APP_URL);

  // When page finishes loading, show main window and close splash
  mainWindow.webContents.on('did-finish-load', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  // Handle load failure (offline)
  mainWindow.webContents.on('did-fail-load', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    mainWindow.show();
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname === APP_DOMAIN || parsedUrl.hostname === 'discord.com') {
        return { action: 'allow' };
      }
    } catch (e) { /* ignore */ }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation to external domains
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname === APP_DOMAIN || parsedUrl.hostname === 'discord.com') {
        return;
      }
      event.preventDefault();
      shell.openExternal(url);
    } catch (e) { /* ignore */ }
  });

  // Save window state on resize/move
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// ==================== MINI PLAYER ====================

function createMiniPlayer() {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.focus();
    return;
  }

  miniPlayerWindow = new BrowserWindow({
    width: 320,
    height: 62,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  miniPlayerWindow.loadFile(path.join(__dirname, 'mini-player.html'));

  // Position in bottom-right corner
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  miniPlayerWindow.setPosition(width - 340, height - 80);

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
  });
}

// IPC handlers for mini player
ipcMain.on('expand-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.close();
  }
});

ipcMain.on('close-mini-player', () => {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.close();
  }
});

// ==================== SYSTEM TRAY ====================

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Radio 24/7',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Mini Player',
      click: () => createMiniPlayer(),
    },
    {
      label: 'Siempre visible',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(menuItem.checked);
          mainWindow.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Recargar',
      click: () => {
        if (mainWindow) {
          mainWindow.loadURL(APP_URL);
          mainWindow.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Iniciar con Windows',
      type: 'checkbox',
      checked: isAutoStartEnabled(),
      click: (menuItem) => {
        setAutoStart(menuItem.checked);
      },
    },
    { type: 'separator' },
    {
      label: 'Buscar actualizaciones',
      click: () => checkForUpdates(true),
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Radio 24/7');
  tray.setContextMenu(contextMenu);

  // Click on tray icon to show window
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ==================== AUTO-UPDATER ====================

function checkForUpdates(manual = false) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    showNotification('Actualizacion disponible', `Version ${info.version} encontrada. Descargando...`);
  });

  autoUpdater.on('update-not-available', () => {
    if (manual) {
      showNotification('Sin actualizaciones', 'Ya tienes la version mas reciente.');
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    showNotification('Actualizacion lista', `Version ${info.version} descargada. Se instalara al reiniciar.`);
  });

  autoUpdater.on('error', () => {
    if (manual) {
      showNotification('Error de actualizacion', 'No se pudo verificar actualizaciones.');
    }
  });

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

// ==================== NOTIFICATIONS ====================

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      icon: path.join(__dirname, 'icon.png'),
    }).show();
  }
}

// ==================== KEYBOARD SHORTCUTS ====================

function registerShortcuts() {
  // Ctrl+Shift+M = Toggle mini player
  globalShortcut.register('Ctrl+Shift+M', () => {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
      miniPlayerWindow.close();
    } else {
      createMiniPlayer();
    }
  });

  // Ctrl+Shift+R = Show/hide main window
  globalShortcut.register('Ctrl+Shift+R', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// ==================== DISCORD RICH PRESENCE ====================

function connectDiscordRPC() {
  rpcClient = new DiscordRPC.Client({ transport: 'ipc' });

  rpcClient.on('ready', () => {
    rpcReady = true;
    updatePresence();
    // Update presence every 30 seconds (to refresh elapsed time)
    setInterval(updatePresence, 30000);
  });

  rpcClient.login({ clientId: DISCORD_CLIENT_ID }).catch(() => {
    // Discord not running, retry in 30 seconds
    rpcReady = false;
    setTimeout(connectDiscordRPC, 30000);
  });

  rpcClient.on('disconnected', () => {
    rpcReady = false;
    setTimeout(connectDiscordRPC, 30000);
  });
}

function updatePresence(songTitle, songArtist) {
  if (!rpcReady || !rpcClient) return;
  try {
    const activity = {
      details: songTitle || 'Radio 24/7',
      state: songArtist || 'Escuchando musica',
      startTimestamp: Math.floor(Date.now() / 1000),
      largeImageKey: 'radio_icon',
      largeImageText: 'Radio 24/7 - MewWorld',
      smallImageKey: 'playing',
      smallImageText: 'En vivo',
      buttons: [
        { label: 'Escuchar Radio', url: 'https://mewworld.net/inicio' },
      ],
      instance: false,
    };
    rpcClient.setActivity(activity).catch(() => {});
  } catch (e) { /* ignore */ }
}

// Listen for song updates from the web page
ipcMain.on('update-song', (event, data) => {
  if (data && data.title) {
    updatePresence(data.title, data.artist);
    // Also update mini player if open
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
      miniPlayerWindow.webContents.send('song-update', data);
    }
  }
});

// ==================== ALWAYS ON TOP (Picture-in-Picture) ====================

ipcMain.on('toggle-always-on-top', () => {
  if (mainWindow) {
    const isOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isOnTop);
  }
});

// ==================== TITLE BAR COLOR (sync with theme) ====================

ipcMain.on('update-titlebar', (event, { color, symbolColor }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.setTitleBarOverlay({
        color: color || '#0C111D',
        symbolColor: symbolColor || '#6b7280',
      });
    } catch (e) { /* ignore - not supported on all platforms */ }
  }
});

// ==================== APP LIFECYCLE ====================

app.whenReady().then(() => {
  createSplash();
  createTray();
  createWindow();
  registerShortcuts();
  connectDiscordRPC();

  // Check for updates 5 seconds after launch (silent)
  setTimeout(() => checkForUpdates(false), 5000);
});

app.on('window-all-closed', () => {
  // Don't quit on window close (tray keeps running)
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  saveWindowState();
});
