import { app, ipcMain } from 'electron'
import { APP_NAME } from '../../shared/constants'
import { IPC_CHANNELS, type AppInfo } from '../../shared/ipc'

export function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.APP_INFO,
    (): AppInfo => ({
      name: APP_NAME,
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      packaged: app.isPackaged
    })
  )
}
