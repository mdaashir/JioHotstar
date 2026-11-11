import { globalShortcut } from 'electron'
import type { BrowserWindow } from 'electron'
import {
  MEDIA_KEY_ACCELERATORS,
  isMediaKeyResult,
  scriptFor,
  type MediaKeyAction,
  type MediaKeyStatus
} from '../../shared/media-keys'

export interface MediaKeyHooks {
  notify(status: MediaKeyStatus): void
}

async function runAction(window: BrowserWindow, action: MediaKeyAction): Promise<MediaKeyStatus> {
  if (window.isDestroyed()) {
    return 'failed'
  }

  try {
    const result: unknown = await window.webContents.executeJavaScript(scriptFor(action), true)

    return isMediaKeyResult(result) ? result.status : 'failed'
  } catch {
    return 'failed'
  }
}

/**
 * Registers the OS media keys and forwards them to the player page.
 *
 * `globalShortcut` grabs the keys system-wide, so they are released on quit and
 * whenever the player window goes away — a leaked registration would keep
 * swallowing the user's media keys in every other application.
 */
export function installMediaKeys(
  getWindow: () => BrowserWindow | null,
  hooks: MediaKeyHooks
): void {
  const handle = (action: MediaKeyAction): void => {
    const window = getWindow()

    if (window === null) {
      return
    }

    void runAction(window, action).then((status) => {
      if (status === 'no-video' || status === 'failed') {
        hooks.notify(status)
      }
    })
  }

  for (const entry of MEDIA_KEY_ACCELERATORS) {
    globalShortcut.register(entry.accelerator, () => {
      handle(entry.action)
    })
  }
}

export function releaseMediaKeys(): void {
  for (const entry of MEDIA_KEY_ACCELERATORS) {
    if (globalShortcut.isRegistered(entry.accelerator)) {
      globalShortcut.unregister(entry.accelerator)
    }
  }
}
