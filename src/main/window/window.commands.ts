import type { BrowserWindow, Event } from 'electron'
import { matchWindowCommand } from '../../shared/window-commands'
import { settingsStore } from '../store/settings.store'
import { togglePictureInPicture } from '../playback/picture-in-picture.service'
import { applyPinnedTitle, toggleAlwaysOnTop, toggleFullscreen } from './window.presentation'

export interface WindowCommandHooks {
  notifyPictureInPicture(status: string): void
}

export function installWindowCommands(window: BrowserWindow, hooks: WindowCommandHooks): void {
  window.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault()
    window.setTitle(title)
    applyPinnedTitle(window)
  })

  window.webContents.on('before-input-event', (event: Event, input) => {
    const command = matchWindowCommand(
      {
        type: input.type,
        key: input.key,
        control: input.control,
        shift: input.shift,
        alt: input.alt,
        meta: input.meta
      },
      process.platform
    )

    if (command === null) {
      return
    }

    event.preventDefault()

    if (command === 'toggle-fullscreen') {
      toggleFullscreen(window)
      return
    }

    if (command === 'toggle-always-on-top') {
      toggleAlwaysOnTop(window)
      return
    }

    void togglePictureInPicture(window).then((status) => {
      hooks.notifyPictureInPicture(status)
    })
  })

  if (settingsStore.getAlwaysOnTop()) {
    window.setAlwaysOnTop(true)
    applyPinnedTitle(window)
  }
}
