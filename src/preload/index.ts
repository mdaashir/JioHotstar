import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type AppInfo } from '../shared/ipc'
import type { SettingsSnapshot } from '../shared/settings'

const api = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO) as Promise<AppInfo>,
  retryPlayer: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_RETRY) as Promise<void>,
  readSettings: (): Promise<SettingsSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_READ) as Promise<SettingsSnapshot>,
  writeSettings: (patch: Partial<SettingsSnapshot>): Promise<SettingsSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_WRITE, patch) as Promise<SettingsSnapshot>
}

contextBridge.exposeInMainWorld('jiohotstar', api)

export type JioHotstarApi = typeof api
