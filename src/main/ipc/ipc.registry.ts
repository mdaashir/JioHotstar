import { app, ipcMain } from 'electron'
import { APP_NAME } from '../../shared/constants'
import { IPC_CHANNELS, type AppInfo } from '../../shared/ipc'
import { assertTrustedSender } from '../security/sender.guard'
import { startup } from '../startup/startup'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP_INFO, (event): AppInfo => {
    assertTrustedSender(event)

    return {
      name: APP_NAME,
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      packaged: app.isPackaged
    }
  })

  ipcMain.handle(IPC_CHANNELS.PLAYER_RETRY, async (event): Promise<void> => {
    assertTrustedSender(event)
    await startup.retry()
  })
}
