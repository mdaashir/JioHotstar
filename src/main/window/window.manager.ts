import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { installNavigationGuards } from '../security/navigation.guard'

const SPLASH_WIDTH = 460
const SPLASH_HEIGHT = 320

class WindowManager {
  private splashWindow: BrowserWindow | null = null

  createSplashWindow(): BrowserWindow {
    const existing = this.getSplashWindow()

    if (existing !== null) {
      existing.focus()
      return existing
    }

    const splash = new BrowserWindow({
      width: SPLASH_WIDTH,
      height: SPLASH_HEIGHT,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      frame: false,
      show: false,
      backgroundColor: '#080b10',
      title: 'JioHotstar',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        devTools: !app.isPackaged
      }
    })

    installNavigationGuards(splash)

    splash.once('ready-to-show', () => {
      splash.show()
    })

    splash.on('closed', () => {
      this.splashWindow = null
    })

    const devServerUrl = process.env['ELECTRON_RENDERER_URL']

    if (devServerUrl !== undefined) {
      void splash.loadURL(devServerUrl)
    } else {
      void splash.loadFile(join(__dirname, '../renderer/index.html'))
    }

    this.splashWindow = splash
    return splash
  }

  getSplashWindow(): BrowserWindow | null {
    const splash = this.splashWindow

    if (splash === null || splash.isDestroyed()) {
      return null
    }

    return splash
  }
}

export const windowManager = new WindowManager()
