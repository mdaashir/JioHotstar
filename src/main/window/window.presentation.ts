import type { BrowserWindow } from 'electron'
import { composeWindowTitle } from '../../shared/window-title'
import { settingsStore } from '../store/settings.store'

const BASE_TITLE = 'JioHotstar'

export function currentTitle(): string {
  return composeWindowTitle(BASE_TITLE, settingsStore.getAlwaysOnTop())
}

export function applyPinnedTitle(window: BrowserWindow): void {
  if (window.isDestroyed()) {
    return
  }

  const baseTitle = window.getTitle().replace(/ — Always on top$/, '')

  window.setTitle(composeWindowTitle(baseTitle, settingsStore.getAlwaysOnTop()))
}

export function toggleFullscreen(window: BrowserWindow): void {
  window.setFullScreen(!window.isFullScreen())
}

export function toggleAlwaysOnTop(window: BrowserWindow): boolean {
  const next = !window.isAlwaysOnTop()

  window.setAlwaysOnTop(next)
  settingsStore.setAlwaysOnTop(next)
  applyPinnedTitle(window)

  return next
}
