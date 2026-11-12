import Store from 'electron-store'
import type { SettingsSnapshot } from '../../shared/settings'
import { isWindowState, type WindowState } from '../../shared/window-state'

interface SettingsSchema {
  windowState?: WindowState
  alwaysOnTop?: boolean
  closeToTray?: boolean
  hideScrollbars?: boolean
  rememberWindowState?: boolean
  dnsFilter?: boolean
}

const store = new Store<SettingsSchema>({ name: 'settings' })

function readBoolean(key: keyof SettingsSchema, fallback: boolean): boolean {
  const value: unknown = store.get(key)

  return typeof value === 'boolean' ? value : fallback
}

export const settingsStore = {
  getWindowState(): WindowState | null {
    const value: unknown = store.get('windowState')

    return isWindowState(value) ? value : null
  },

  setWindowState(state: WindowState): void {
    store.set('windowState', state)
  },

  getAlwaysOnTop(): boolean {
    return readBoolean('alwaysOnTop', false)
  },

  setAlwaysOnTop(alwaysOnTop: boolean): void {
    store.set('alwaysOnTop', alwaysOnTop)
  },

  getCloseToTray(): boolean {
    return readBoolean('closeToTray', true)
  },

  setCloseToTray(closeToTray: boolean): void {
    store.set('closeToTray', closeToTray)
  },

  getHideScrollbars(): boolean {
    return readBoolean('hideScrollbars', true)
  },

  setHideScrollbars(hideScrollbars: boolean): void {
    store.set('hideScrollbars', hideScrollbars)
  },

  getRememberWindowState(): boolean {
    return readBoolean('rememberWindowState', true)
  },

  setRememberWindowState(rememberWindowState: boolean): void {
    store.set('rememberWindowState', rememberWindowState)
  },

  /**
   * Off by default. Enabling it routes all app DNS through AdGuard, which
   * removes third-party trackers but cannot block the player's own advertising,
   * and carries a real risk of blocking a domain the site depends on.
   */
  getDnsFilter(): boolean {
    return readBoolean('dnsFilter', false)
  },

  setDnsFilter(dnsFilter: boolean): void {
    store.set('dnsFilter', dnsFilter)
  },

  snapshot(): SettingsSnapshot {
    return {
      alwaysOnTop: readBoolean('alwaysOnTop', false),
      closeToTray: readBoolean('closeToTray', true),
      hideScrollbars: readBoolean('hideScrollbars', true),
      rememberWindowState: readBoolean('rememberWindowState', true),
      dnsFilter: readBoolean('dnsFilter', false)
    }
  }
}
