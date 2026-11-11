import type { BrowserWindow } from 'electron'
import { PIP_TOGGLE_SCRIPT, isPipResult, type PipStatus } from '../../shared/picture-in-picture'

export async function togglePictureInPicture(window: BrowserWindow): Promise<PipStatus> {
  if (window.isDestroyed()) {
    return 'failed'
  }

  try {
    const result: unknown = await window.webContents.executeJavaScript(PIP_TOGGLE_SCRIPT, true)

    return isPipResult(result) ? result.status : 'failed'
  } catch {
    return 'failed'
  }
}
