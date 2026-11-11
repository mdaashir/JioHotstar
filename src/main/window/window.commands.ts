import type { BrowserWindow, Event } from 'electron'
import { matchWindowCommand, type WindowCommand } from '../../shared/window-commands'
import { settingsStore } from '../store/settings.store'

const PINNED_SUFFIX = ' — Always on top'

export function installWindowCommands(window: BrowserWindow): void {
  let baseTitle = window.getTitle()

  const applyTitle = (): void => {
    if (window.isDestroyed()) {
      return
    }

    window.setTitle(
      settingsStore.getAlwaysOnTop() ? `${baseTitle}${PINNED_SUFFIX}` : baseTitle
    )
  }

  window.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault()
    baseTitle = title
    applyTitle()
  })

  const run = (command: WindowCommand): void => {
    if (command === 'toggle-fullscreen') {
      window.setFullScreen(!window.isFullScreen())
      return
    }

    const next = !window.isAlwaysOnTop()
    window.setAlwaysOnTop(next)
    settingsStore.setAlwaysOnTop(next)
    applyTitle()
  }

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
    run(command)
  })

  if (settingsStore.getAlwaysOnTop()) {
    window.setAlwaysOnTop(true)
    applyTitle()
  }
}
