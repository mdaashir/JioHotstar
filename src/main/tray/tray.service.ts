import { Menu, Tray, app } from 'electron'
import { APP_NAME } from '../../shared/constants'
import { trayLabels } from '../../shared/tray'
import { describeState, isRestartAction, type UpdateState } from '../../shared/updater'
import { appIcon } from '../app.icon'
import { settingsStore } from '../store/settings.store'
import { updaterService } from '../updater/updater.service'
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

function mediaKeyNotice(status: string): string | null {
  if (status === 'no-video') {
    return 'No video is playing'
  }

  if (status === 'failed') {
    return 'The player did not respond to the media key'
  }

  return null
}

export class TrayService {
  private tray: Tray | null = null
  private readonly windows: WindowManager
  private noticeTimer: ReturnType<typeof setTimeout> | undefined
  private updateState: UpdateState = { status: 'unsupported' }

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
    this.showNotice(pictureInPictureNotice(status))
  }

  notifyMediaKey(status: string): void {
    this.showNotice(mediaKeyNotice(status))
  }

  /**
   * Reports meaningful update transitions and nothing else.
   *
   * `checking` and `not-available` are routine and would be noise on every
   * launch; a failed check is worth surfacing because it usually means the
   * release feed is broken rather than that the user is offline.
   */
  notifyUpdate(state: UpdateState): void {
    this.updateState = state

    if (state.status === 'available' || state.status === 'downloaded') {
      this.showNotice(describeState(state))
      this.refresh()
      return
    }

    if (state.status === 'error') {
      this.showNotice(describeState(state))
    }
  }

  private showNotice(message: string | null): void {
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
        {
          label: labels.hideScrollbars,
          type: 'checkbox',
          checked: settingsStore.getHideScrollbars(),
          click: () => {
            this.windows.toggleScrollbars()
            this.refresh()
          }
        },
        { type: 'separator' },
        {
          label: labels.settings,
          click: () => {
            this.windows.openSettingsWindow()
          }
        },
        // Only offered once an update is actually downloaded. Checking is silent
        // by default, so this item is the whole visible surface of the feature.
        ...(isRestartAction(this.updateState)
          ? [
              {
                label: labels.installUpdate,
                click: () => {
                  updaterService.install()
                }
              }
            ]
          : []),
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
