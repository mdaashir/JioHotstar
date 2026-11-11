import Store from 'electron-store'
import { isWindowState, type WindowState } from '../../shared/window-state'

interface SettingsSchema {
  windowState?: WindowState
}

const store = new Store<SettingsSchema>({ name: 'settings' })

export const settingsStore = {
  getWindowState(): WindowState | null {
    const value: unknown = store.get('windowState')

    return isWindowState(value) ? value : null
  },

  setWindowState(state: WindowState): void {
    store.set('windowState', state)
  }
}
