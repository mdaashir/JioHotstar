import { shell } from 'electron'
import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { ALLOWED_NAVIGATION_HOSTS } from '../../shared/constants'
import { decideNavigation } from '../../shared/navigation'

const HARDENED_WINDOW_OPTIONS: BrowserWindowConstructorOptions = {
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true
  }
}

function isAppUrl(rawUrl: string): boolean {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']

  if (devServerUrl !== undefined && rawUrl.startsWith(devServerUrl)) {
    return true
  }

  return rawUrl.startsWith('file://')
}

export function installNavigationGuards(window: BrowserWindow): void {
  const { webContents } = window

  webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: HARDENED_WINDOW_OPTIONS }
    }

    const decision = decideNavigation(url, ALLOWED_NAVIGATION_HOSTS)

    if (decision === 'allow') {
      return { action: 'allow', overrideBrowserWindowOptions: HARDENED_WINDOW_OPTIONS }
    }

    if (decision === 'external') {
      void shell.openExternal(url)
    }

    return { action: 'deny' }
  })

  webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) {
      return
    }

    const decision = decideNavigation(url, ALLOWED_NAVIGATION_HOSTS)

    if (decision === 'allow') {
      return
    }

    event.preventDefault()

    if (decision === 'external') {
      void shell.openExternal(url)
    }
  })

  webContents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })
}
