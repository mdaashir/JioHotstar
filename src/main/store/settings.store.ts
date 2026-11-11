import Store from 'electron-store'
import { isWindowState, type WindowState } from '../../shared/window-state'

interface SettingsSchema {
  windowState?: WindowState
  alwaysOnTop?: boolean
  closeToTray?: boolean
}

const store = new Store<SettingsSchema>({ name: 'settings' })

export const settingsStore = {
  getWindowState(): WindowState | null {
    const value: unknown = store.get('windowState')

    return isWindowState(value) ? value : null
  },

  setWindowState(state: WindowState): void {
    store.set('windowState', state)
  },

  getAlwaysOnTop(): boolean {
    return store.get('alwaysOnTop') === true
  },

  setAlwaysOnTop(alwaysOnTop: boolean): void {
    store.set('alwaysOnTop', alwaysOnTop)
  },

  getCloseToTray(): boolean {
    const value: unknown = store.get('closeToTray')

    return value === undefined ? true : value === true
  },

  setCloseToTray(closeToTray: boolean): void {
    store.set('closeToTray', closeToTray)
  }
}
