import { app, BrowserWindow, shell, Menu } from 'electron'
import { join } from 'path'
import type { SettingsStoreService } from './services/settings-store.service'

export function createMainWindow(settingsStore: SettingsStoreService): BrowserWindow {
  const savedBounds = settingsStore.get('windowBounds')

  // Remove default menu bar (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null)

  const mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1400,
    height: savedBounds?.height ?? 900,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 1024,
    minHeight: 700,
    title: 'CNCStream',
    backgroundColor: '#1a1b1e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Save window bounds on resize/move
  const saveBounds = (): void => {
    const bounds = mainWindow.getBounds()
    settingsStore.set('windowBounds', bounds)
  }
  mainWindow.on('resized', saveBounds)
  mainWindow.on('moved', saveBounds)

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (!app.isPackaged) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.openDevTools()
    })
  }

  return mainWindow
}
