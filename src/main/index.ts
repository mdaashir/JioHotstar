import { app, BrowserWindow, Menu, session } from 'electron'
import { APP_ID, APP_NAME } from '../shared/constants'
import { markQuitting } from './app.lifecycle'
import { registerIpcHandlers } from './ipc/ipc.registry'
import { installNavigationGuards } from './security/navigation.guard'
import { installPermissionPolicy } from './security/permission.policy'
import { startup } from './startup/startup'
import { TrayService } from './tray/tray.service'
import { windowManager } from './window/window.manager'

app.setName(APP_NAME)

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID)
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

  app.on('before-quit', () => {
    markQuitting()
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
