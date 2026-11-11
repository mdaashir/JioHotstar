import { app, BrowserWindow } from 'electron'
import { APP_ID, APP_NAME } from '../shared/constants'
import { registerIpcHandlers } from './ipc/ipc.registry'
import { windowManager } from './window/window.manager'

app.setName(APP_NAME)

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID)
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const splash = windowManager.getSplashWindow()

    if (splash === null) {
      return
    }

    if (splash.isMinimized()) {
      splash.restore()
    }

    splash.focus()
  })

  void app.whenReady().then(() => {
    registerIpcHandlers()
    windowManager.createSplashWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createSplashWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
