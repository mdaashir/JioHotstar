import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type AppInfo } from '../shared/ipc'
import type { SettingsSnapshot } from '../shared/settings'
import type { UpdateState } from '../shared/updater'

const api = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO) as Promise<AppInfo>,
  retryPlayer: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_RETRY) as Promise<void>,
  readSettings: (): Promise<SettingsSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_READ) as Promise<SettingsSnapshot>,
  writeSettings: (patch: Partial<SettingsSnapshot>): Promise<SettingsSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_WRITE, patch) as Promise<SettingsSnapshot>,
  getUpdateState: (): Promise<UpdateState> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_STATUS) as Promise<UpdateState>,
  checkForUpdates: (): Promise<UpdateState> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK) as Promise<UpdateState>,
  installUpdate: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL) as Promise<void>,
  onUpdateState: (listener: (state: UpdateState) => void): (() => void) => {
    const handler = (_event: unknown, state: UpdateState): void => {
      listener(state)
    }

    ipcRenderer.on(IPC_CHANNELS.UPDATE_STATUS, handler)

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_STATUS, handler)
    }
  }
}

contextBridge.exposeInMainWorld('jiohotstar', api)

export type JioHotstarApi = typeof api
