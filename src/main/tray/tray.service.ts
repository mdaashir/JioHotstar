import { Menu, Tray, app } from 'electron'
import { APP_NAME } from '../../shared/constants'
import { trayLabels } from '../../shared/tray'
import { appIcon } from '../app.icon'
import { settingsStore } from '../store/settings.store'
import type { WindowManager } from '../window/window.manager'

const TRAY_TOOLTIP = APP_NAME
const NOTICE_DURATION_MS = 4000

function pictureInPictureNotice(status: string): string | null {
  if (status === 'no-video') {
    return 'Start a video, then try picture-in-picture again'
  }

  if (status === 'unsupported' || status === 'failed') {
    return 'Picture-in-picture is not available for this video'
  }

  return null
}

export class TrayService {
  private tray: Tray | null = null
  private readonly windows: WindowManager
  private noticeTimer: ReturnType<typeof setTimeout> | undefined

  constructor(windows: WindowManager) {
    this.windows = windows
  }

  create(): void {
    if (this.tray !== null) {
      return
    }

    const image = appIcon('tray-icon.png')

    this.tray = new Tray(image)
    this.tray.setToolTip(TRAY_TOOLTIP)
    this.tray.on('click', () => {
      this.windows.focusPrimaryWindow()
    })

    this.refresh()
  }

  notifyPictureInPicture(status: string): void {
    const message = pictureInPictureNotice(status)

    if (message === null || this.tray === null || this.tray.isDestroyed()) {
      return
    }

    this.tray.setToolTip(message)

    if (this.noticeTimer !== undefined) {
      clearTimeout(this.noticeTimer)
    }

    this.noticeTimer = setTimeout(() => {
      if (this.tray !== null && !this.tray.isDestroyed()) {
        this.tray.setToolTip(TRAY_TOOLTIP)
      }
    }, NOTICE_DURATION_MS)
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
          label: labels.pictureInPicture,
          click: () => {
            this.windows.togglePictureInPicture()
          }
        },
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
    if (this.noticeTimer !== undefined) {
      clearTimeout(this.noticeTimer)
    }

    if (this.tray !== null && !this.tray.isDestroyed()) {
      this.tray.destroy()
    }

    this.tray = null
  }
}
