import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type AppInfo } from '../shared/ipc'

const api = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO) as Promise<AppInfo>,
  retryPlayer: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.PLAYER_RETRY) as Promise<void>
}

contextBridge.exposeInMainWorld('jiohotstar', api)

export type JioHotstarApi = typeof api
