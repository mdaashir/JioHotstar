import { app, ipcMain } from 'electron'
import { APP_NAME } from '../../shared/constants'
import { IPC_CHANNELS, type AppInfo } from '../../shared/ipc'
import { sanitizeSettingsPatch, type SettingsSnapshot } from '../../shared/settings'
import { assertTrustedSender } from '../security/sender.guard'
import { settingsStore } from '../store/settings.store'
import { startup } from '../startup/startup'
import { windowManager } from '../window/window.manager'

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

  ipcMain.handle(IPC_CHANNELS.SETTINGS_READ, (event): SettingsSnapshot => {
    assertTrustedSender(event)

    return settingsStore.snapshot()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_WRITE, (event, payload: unknown): SettingsSnapshot => {
    assertTrustedSender(event)

    windowManager.applySettingsPatch(sanitizeSettingsPatch(payload))

    return settingsStore.snapshot()
  })
}
