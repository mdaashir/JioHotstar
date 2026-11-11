import { Menu, Tray, app, nativeImage } from 'electron'
import { join } from 'node:path'
import { APP_NAME } from '../../shared/constants'
import { trayLabels } from '../../shared/tray'
import { settingsStore } from '../store/settings.store'
import type { WindowManager } from '../window/window.manager'

const TRAY_TOOLTIP = APP_NAME

function trayIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'tray-icon.png')
  }

  return join(app.getAppPath(), 'resources', 'tray-icon.png')
}

export class TrayService {
  private tray: Tray | null = null
  private readonly windows: WindowManager

  constructor(windows: WindowManager) {
    this.windows = windows
  }

  create(): void {
    if (this.tray !== null) {
      return
    }

    const image = nativeImage.createFromPath(trayIconPath())

    this.tray = new Tray(image)
    this.tray.setToolTip(TRAY_TOOLTIP)
    this.tray.on('click', () => {
      this.windows.focusPrimaryWindow()
    })

    this.refresh()
  }

  refresh(): void {
    if (this.tray === null || this.tray.isDestroyed()) {
      return
    }

    const labels = trayLabels(settingsStore.getAlwaysOnTop(), process.platform === 'darwin')

    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: labels.show,
          click: () => {
            this.windows.focusPrimaryWindow()
          }
        },
        { type: 'separator' },
        {
          label: labels.fullscreen,
          click: () => {
            this.windows.toggleFullscreen()
          }
        },
        {
          label: labels.alwaysOnTop,
          type: 'checkbox',
          checked: settingsStore.getAlwaysOnTop(),
          click: () => {
            this.windows.toggleAlwaysOnTop()
            this.refresh()
          }
        },
        { type: 'separator' },
        {
          label: labels.quit,
          click: () => {
            app.quit()
          }
        }
      ])
    )
  }

  destroy(): void {
    if (this.tray !== null && !this.tray.isDestroyed()) {
      this.tray.destroy()
    }

    this.tray = null
  }
}
