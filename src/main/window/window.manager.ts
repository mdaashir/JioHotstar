import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { PLAYER_URL } from '../../shared/constants'
import type { StartupFailure } from '../../shared/startup'
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH } from '../../shared/window-state'
import { isQuitting } from '../app.lifecycle'
import { appIcon } from '../app.icon'
import { togglePictureInPicture as runPictureInPictureToggle } from '../playback/picture-in-picture.service'
import { settingsStore } from '../store/settings.store'
import { installWindowCommands } from './window.commands'
import { installScrollbarHiding, type ScrollbarController } from './scrollbar.hider'
import { toggleAlwaysOnTop, toggleFullscreen } from './window.presentation'
import { applyWindowState } from './window.state'

const SPLASH_WIDTH = 460
const SPLASH_HEIGHT = 320
const FAILURE_WIDTH = 520
const FAILURE_HEIGHT = 400
const PLAYER_WIDTH = 1280
const PLAYER_HEIGHT = 800

const APP_WEB_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true
} as const

export class WindowManager {
  private splashWindow: BrowserWindow | null = null
  private playerWindow: BrowserWindow | null = null
  private failureWindow: BrowserWindow | null = null
  private onVisibilityChange: (() => void) | null = null
  private onPictureInPicture: ((status: string) => void) | null = null
  private scrollbars: ScrollbarController | null = null

  setVisibilityListener(listener: () => void): void {
    this.onVisibilityChange = listener
  }

  setPictureInPictureListener(listener: (status: string) => void): void {
    this.onPictureInPicture = listener
  }

  toggleScrollbars(): boolean {
    const next = !settingsStore.getHideScrollbars()

    settingsStore.setHideScrollbars(next)
    this.scrollbars?.setEnabled(next)

    return next
  }

  toggleFullscreen(): void {
    const player = this.getPlayerWindow() ?? this.getFailureWindow()

    if (player !== null) {
      toggleFullscreen(player)
    }
  }

  togglePictureInPicture(): void {
    const player = this.getPlayerWindow()

    if (player === null) {
      return
    }

    void runPictureInPictureToggle(player).then((status) => {
      this.onPictureInPicture?.(status)
    })
  }

  toggleAlwaysOnTop(): boolean {
    const player = this.getPlayerWindow() ?? this.getFailureWindow()

    if (player === null) {
      return false
    }

    return toggleAlwaysOnTop(player)
  }

  isPlayerPinned(): boolean {
    return settingsStore.getAlwaysOnTop()
  }

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
      icon: appIcon(),
      webPreferences: {
        ...APP_WEB_PREFERENCES,
        preload: join(__dirname, '../preload/index.js'),
        devTools: !app.isPackaged
      }
    })

    splash.once('ready-to-show', () => {
      splash.show()
    })

    splash.on('closed', () => {
      this.splashWindow = null
    })

    this.loadRenderer(splash)
    this.splashWindow = splash
    return splash
  }

  createPlayerWindow(): BrowserWindow {
    const existing = this.getPlayerWindow()

    if (existing !== null) {
      existing.show()
      existing.focus()
      return existing
    }

    const player = new BrowserWindow({
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      minWidth: MIN_WINDOW_WIDTH,
      minHeight: MIN_WINDOW_HEIGHT,
      show: false,
      backgroundColor: '#000000',
      title: 'JioHotstar',
      icon: appIcon(),
      autoHideMenuBar: true,
      webPreferences: {
        ...APP_WEB_PREFERENCES,
        devTools: !app.isPackaged
      }
    })

    applyWindowState(player)
    installWindowCommands(player, {
      notifyPictureInPicture: (status) => {
        this.onPictureInPicture?.(status)
      }
    })

    this.scrollbars = installScrollbarHiding(player)

    player.on('close', (event) => {
      if (isQuitting() || !settingsStore.getCloseToTray()) {
        return
      }

      event.preventDefault()
      player.hide()
    })

    player.once('ready-to-show', () => {
      player.show()
      this.closeSplash()
    })

    player.on('closed', () => {
      this.playerWindow = null
    })

    player.on('show', () => {
      this.onVisibilityChange?.()
    })

    player.on('hide', () => {
      this.onVisibilityChange?.()
    })

    void player.loadURL(PLAYER_URL)

    this.playerWindow = player
    return player
  }

  showFailure(reason: StartupFailure): void {
    const existing = this.getFailureWindow()

    if (existing !== null) {
      this.loadRenderer(existing, `/error?reason=${reason}`)
      existing.show()
      existing.focus()
    } else {
      const failure = new BrowserWindow({
        width: FAILURE_WIDTH,
        height: FAILURE_HEIGHT,
        resizable: false,
        maximizable: false,
        title: 'JioHotstar',
        backgroundColor: '#080b10',
        icon: appIcon(),
        webPreferences: {
          ...APP_WEB_PREFERENCES,
          preload: join(__dirname, '../preload/index.js'),
          devTools: !app.isPackaged
        }
      })

      failure.on('closed', () => {
        this.failureWindow = null
      })

      this.loadRenderer(failure, `/error?reason=${reason}`)
      this.failureWindow = failure
    }

    this.destroy(this.splashWindow)
    this.splashWindow = null
    this.destroy(this.playerWindow)
    this.playerWindow = null
  }

  closeFailure(): void {
    this.destroy(this.failureWindow)
    this.failureWindow = null
  }

  closeSplash(): void {
    this.destroy(this.splashWindow)
    this.splashWindow = null
  }

  focusPrimaryWindow(): void {
    const target = this.getPlayerWindow() ?? this.getFailureWindow() ?? this.getSplashWindow()

    if (target === null) {
      return
    }

    if (target.isMinimized()) {
      target.restore()
    }

    target.show()
    target.focus()
  }

  isPlayerVisible(): boolean {
    const player = this.getPlayerWindow()

    return player !== null && player.isVisible()
  }

  getSplashWindow(): BrowserWindow | null {
    return this.alive(this.splashWindow)
  }

  getPlayerWindow(): BrowserWindow | null {
    return this.alive(this.playerWindow)
  }

  getFailureWindow(): BrowserWindow | null {
    return this.alive(this.failureWindow)
  }

  private alive(window: BrowserWindow | null): BrowserWindow | null {
    if (window === null || window.isDestroyed()) {
      return null
    }

    return window
  }

  private destroy(window: BrowserWindow | null): void {
    if (window !== null && !window.isDestroyed()) {
      window.destroy()
    }
  }

  private loadRenderer(target: BrowserWindow, hash?: string): void {
    const devServerUrl = process.env['ELECTRON_RENDERER_URL']

    if (devServerUrl !== undefined) {
      void target.loadURL(hash === undefined ? devServerUrl : `${devServerUrl}#${hash}`)
      return
    }

    const indexFile = join(__dirname, '../renderer/index.html')

    if (hash === undefined) {
      void target.loadFile(indexFile)
      return
    }

    void target.loadFile(indexFile, { hash })
  }
}

export const windowManager = new WindowManager()
