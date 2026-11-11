import { classifyLoadFailure } from '../../shared/startup'
import { whenPlaybackReady } from '../playback/widevine.service'
import { windowManager } from '../window/window.manager'

class Startup {
  async start(): Promise<void> {
    windowManager.createSplashWindow()
    await this.openPlayer()
  }

  async retry(): Promise<void> {
    const opened = await this.openPlayer()

    if (opened) {
      windowManager.closeFailure()
    }
  }

  private async openPlayer(): Promise<boolean> {
    try {
      await whenPlaybackReady()
    } catch {
      windowManager.showFailure('playback')
      return false
    }

    const player = windowManager.createPlayerWindow()

    player.webContents.on(
      'did-fail-load',
      (_event, errorCode, _description, _validatedUrl, isMainFrame) => {
        if (!isMainFrame || errorCode === -3) {
          return
        }

        windowManager.showFailure(classifyLoadFailure(errorCode))
      }
    )

    return true
  }
}

export const startup = new Startup()
