import { app, BrowserWindow, Menu, session } from 'electron'
import { APP_ID, APP_NAME } from '../shared/constants'
import { markQuitting } from './app.lifecycle'
import { appIcon } from './app.icon'
import { registerIpcHandlers } from './ipc/ipc.registry'
import { installMediaKeys, releaseMediaKeys } from './playback/media-keys.service'
import { installNavigationGuards } from './security/navigation.guard'
import { installPermissionPolicy } from './security/permission.policy'
import { startup } from './startup/startup'
import { TrayService } from './tray/tray.service'
import { updaterService } from './updater/updater.service'
import { windowManager } from './window/window.manager'

app.setName(APP_NAME)

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID)
}

const dockIcon = appIcon()

if (process.platform === 'darwin' && app.dock !== undefined) {
  app.dock.setIcon(dockIcon)
}

if (app.isPackaged) {
  Menu.setApplicationMenu(null)
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  const trayService = new TrayService(windowManager)

  windowManager.setVisibilityListener(() => {
    trayService.refresh()
  })

  windowManager.setSettingsListener(() => {
    trayService.refresh()
  })

  app.on('before-quit', () => {
    markQuitting()
    releaseMediaKeys()
  })

  app.on('second-instance', () => {
    windowManager.focusPrimaryWindow()
  })

  app.on('web-contents-created', (_event, contents) => {
    installNavigationGuards(contents)
  })

  void app.whenReady().then(async () => {
    installPermissionPolicy(session.defaultSession)
    registerIpcHandlers()

    trayService.create()

    await startup.start()

    installMediaKeys(() => windowManager.getPlayerWindow(), {
      notify: (status) => {
        windowManager.notifyMediaKey(status)
      }
    })

    // Delayed so the update check never competes with the Widevine install and
    // the first page load. The tray reflects the outcome.
    updaterService.init({
      onState: (state) => {
        trayService.notifyUpdate(state)
      }
    })
    updaterService.scheduleCheck()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void startup.start()
        return
      }

      windowManager.focusPrimaryWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
