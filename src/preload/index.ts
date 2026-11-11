import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type AppInfo } from '../shared/ipc'

const api = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO) as Promise<AppInfo>
}

contextBridge.exposeInMainWorld('jiohotstar', api)

export type JioHotstarApi = typeof api
