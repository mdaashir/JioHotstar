import { shell } from 'electron'
import type { BrowserWindowConstructorOptions, WebContents } from 'electron'
import { ALLOWED_NAVIGATION_HOSTS } from '../../shared/constants'
import { decideNavigation } from '../../shared/navigation'
import { isAppUrl } from './app-url'

const HARDENED_WINDOW_OPTIONS: BrowserWindowConstructorOptions = {
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true
  }
}

export function installNavigationGuards(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
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

  contents.on('will-navigate', (event, url) => {
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

  contents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })

  contents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame) {
      return
    }

    const decision = decideNavigation(event.url, ALLOWED_NAVIGATION_HOSTS)

    if (decision === 'external') {
      event.preventDefault()
    }
  })
}
