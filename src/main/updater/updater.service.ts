import { app } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateInfo } from 'electron-updater'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { canCheckForUpdates, type UpdateState } from '../../shared/updater'

const { autoUpdater } = electronUpdater

export interface UpdaterHooks {
  onState(state: UpdateState): void
}

/**
 * Wraps `electron-updater` for the GitHub Releases feed.
 *
 * The feed is `latest.yml` on the published release, so the release workflow
 * must attach it — it is not a file users download, but it is what the updater
 * reads to learn the current version and asset name.
 */
class UpdaterService {
  private hooks: UpdaterHooks | null = null
  private started = false
  private state: UpdateState = { status: 'unsupported' }

  init(hooks: UpdaterHooks): void {
    this.hooks = hooks

    if (!canCheckForUpdates(app.isPackaged)) {
      this.setState({ status: 'unsupported' })
      return
    }

    // Download automatically, but never install without the user asking: a
    // media app replacing itself mid-playback would be hostile.
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      this.setState({ status: 'checking' })
    })

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.setState({ status: 'available', version: info.version })
    })

    autoUpdater.on('update-not-available', () => {
      this.setState({ status: 'not-available' })
    })

    autoUpdater.on('download-progress', (progress: { percent: number }) => {
      this.setState({ status: 'downloading', percent: progress.percent })
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.setState({ status: 'downloaded', version: info.version })
    })

    autoUpdater.on('error', (error: Error) => {
      this.setState({ status: 'error', message: error.message })
    })

    this.started = true
  }

  /**
   * Checks shortly after launch. Delayed so the check never competes with the
   * Widevine install and the first page load, which are what the user is
   * actually waiting for.
   */
  scheduleCheck(delayMs = 8000): void {
    if (!this.started) {
      return
    }

    const timer = setTimeout(() => {
      void this.check()
    }, delayMs)

    timer.unref()
  }

  async check(): Promise<UpdateState> {
    if (!this.started) {
      const state: UpdateState = {
        status: canCheckForUpdates(app.isPackaged) ? 'error' : 'unsupported'
      }
      this.setState(state)
      return state
    }

    // `electron-builder --dir` produces a packaged app without `app-update.yml`,
    // so an unpacked smoke build reports a missing config instead of checking.
    // Treat that as "cannot update" rather than an error; it is not something
    // the user can act on and it is not how released builds behave.
    const updateConfig = join(process.resourcesPath, 'app-update.yml')

    if (!existsSync(updateConfig)) {
      this.setState({ status: 'unsupported' })
      return this.state
    }

    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.setState({
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      })
    }

    return this.state
  }

  getState(): UpdateState {
    return this.state
  }

  /** Quits and installs a downloaded update. Only valid after `downloaded`. */
  install(): void {
    if (this.state.status !== 'downloaded') {
      return
    }

    autoUpdater.quitAndInstall()
  }

  private setState(state: UpdateState): void {
    this.state = state
    this.hooks?.onState(state)
  }
}

export const updaterService = new UpdaterService()
