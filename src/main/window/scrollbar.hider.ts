import type { BrowserWindow, WebContents } from 'electron'
import { HIDE_SCROLLBARS_CSS } from '../../shared/scrollbars'
import { settingsStore } from '../store/settings.store'

export interface ScrollbarController {
  setEnabled(enabled: boolean): void
}

/**
 * Applies the scrollbar-hiding stylesheet with `webContents.insertCSS`, so
 * nothing runs inside the page and no preload is needed. The stylesheet is
 * re-applied after each document load, because a new document starts clean.
 */
export function installScrollbarHiding(window: BrowserWindow): ScrollbarController {
  const contents = window.webContents
  let key: string | null = null
  let enabled = settingsStore.getHideScrollbars()

  const apply = async (): Promise<void> => {
    if (!enabled || contents.isDestroyed()) {
      return
    }

    // `insertCSS` throws "Render frame was disposed before WebFrameMain could be
    // accessed" when the document goes away between `did-finish-load` and this
    // call — which happens on a redirect, and the player page redirects once.
    // An unhandled rejection here crashed the packaged app at startup.
    try {
      key = await contents.insertCSS(HIDE_SCROLLBARS_CSS, { cssOrigin: 'user' })
    } catch {
      // The document is gone; the next load will re-apply the stylesheet.
      key = null
    }
  }

  const clear = async (): Promise<void> => {
    if (key === null) {
      return
    }

    const previous = key
    key = null
    await removeStylesheet(contents, previous)
  }

  contents.on('did-finish-load', () => {
    key = null
    void apply()
  })

  if (enabled) {
    void apply()
  }

  return {
    setEnabled(next: boolean): void {
      enabled = next

      if (next) {
        void apply()
        return
      }

      void clear()
    }
  }
}

async function removeStylesheet(contents: WebContents, key: string): Promise<void> {
  if (contents.isDestroyed()) {
    return
  }

  try {
    await contents.removeInsertedCSS(key)
  } catch {
    // The document may already have navigated away and dropped the stylesheet.
  }
}
