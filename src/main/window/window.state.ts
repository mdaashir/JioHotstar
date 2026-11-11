import { screen } from 'electron'
import type { BrowserWindow } from 'electron'
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  resolveWindowBounds,
  type WorkArea
} from '../../shared/window-state'
import { settingsStore } from '../store/settings.store'

const SAVE_DEBOUNCE_MS = 400

function workAreasInDisplayOrder(): WorkArea[] {
  const primary = screen.getPrimaryDisplay()

  return [
    primary,
    ...screen.getAllDisplays().filter((display) => display.id !== primary.id)
  ].map((display) => display.workArea)
}

export function applyWindowState(window: BrowserWindow): void {
  const saved = settingsStore.getWindowState()

  if (saved !== null) {
    const bounds = resolveWindowBounds(saved, workAreasInDisplayOrder(), {
      minWidth: MIN_WINDOW_WIDTH,
      minHeight: MIN_WINDOW_HEIGHT
    })

    window.setBounds(bounds)

    if (saved.maximized) {
      window.maximize()
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined

  const persist = (): void => {
    if (window.isDestroyed() || window.isFullScreen()) {
      return
    }

    const maximized = window.isMaximized()
    const bounds = maximized ? window.getNormalBounds() : window.getBounds()

    settingsStore.setWindowState({ ...bounds, maximized })
  }

  const schedule = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }

    timer = setTimeout(persist, SAVE_DEBOUNCE_MS)
  }

  window.on('resize', schedule)
  window.on('move', schedule)
  window.on('maximize', schedule)
  window.on('unmaximize', schedule)

  window.on('close', () => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }

    persist()
  })
}
