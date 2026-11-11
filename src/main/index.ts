import { app, BrowserWindow, Menu, session } from 'electron'
import { APP_ID, APP_NAME } from '../shared/constants'
import { registerIpcHandlers } from './ipc/ipc.registry'
import { installNavigationGuards } from './security/navigation.guard'
import { installPermissionPolicy } from './security/permission.policy'
import { startup } from './startup/startup'
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
  app.on('second-instance', () => {
    windowManager.focusPrimaryWindow()
  })

  app.on('web-contents-created', (_event, contents) => {
    installNavigationGuards(contents)
  })

  void app.whenReady().then(async () => {
    installPermissionPolicy(session.defaultSession)
    registerIpcHandlers()

    await startup.start()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void startup.start()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
