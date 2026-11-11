import type { BrowserWindow, Event } from 'electron'
import { matchWindowCommand } from '../../shared/window-commands'
import { settingsStore } from '../store/settings.store'
import { applyPinnedTitle, toggleAlwaysOnTop, toggleFullscreen } from './window.presentation'

export function installWindowCommands(window: BrowserWindow): void {
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

    toggleAlwaysOnTop(window)
  })

  if (settingsStore.getAlwaysOnTop()) {
    window.setAlwaysOnTop(true)
    applyPinnedTitle(window)
  }
}
