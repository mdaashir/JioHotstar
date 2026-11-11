import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

function isolatedUserData(): string {
  return mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
}

/**
 * Opens the settings window the same way the app does: the local renderer at
 * the `#/settings` route with the real preload. Only the tray menu click that
 * normally triggers it is skipped, because a native tray menu cannot be
 * scripted.
 */
async function openSettingsWindow(app: ElectronApplication): Promise<Page> {
  await app.evaluate(async ({ BrowserWindow, app: electronApp }) => {
    const indexFile = `${electronApp.getAppPath()}/out/renderer/index.html`
    const preload = `${electronApp.getAppPath()}/out/preload/index.js`

    const settings = new BrowserWindow({
      width: 560,
      height: 520,
      show: true,
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    })

    await settings.loadFile(indexFile, { hash: '/settings' })
  })

  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    const candidate = app.windows().find((window) => window.url().includes('#/settings'))

    if (candidate !== undefined) {
      await candidate.waitForSelector('[data-testid="toggle-hideScrollbars"]', {
        state: 'attached',
        timeout: 10_000
      })

      return candidate
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('The settings window did not open')
}

test('shows every preference with its current value', async () => {
  test.setTimeout(180_000)

  const app = await electron.launch({ args: ['.', `--user-data-dir=${isolatedUserData()}`] })

  try {
    await waitForPlayerWindow(app)

    const settings = await openSettingsWindow(app)

    for (const key of ['alwaysOnTop', 'closeToTray', 'hideScrollbars', 'rememberWindowState']) {
      await expect(settings.getByTestId(`toggle-${key}`)).toBeVisible()
    }

    // Defaults: close-to-tray, hidden scrollbars, and remembered bounds are on.
    await expect(settings.getByTestId('toggle-closeToTray')).toBeChecked()
    await expect(settings.getByTestId('toggle-hideScrollbars')).toBeChecked()
    await expect(settings.getByTestId('toggle-rememberWindowState')).toBeChecked()
    await expect(settings.getByTestId('toggle-alwaysOnTop')).not.toBeChecked()

    await expect(settings.getByRole('heading', { name: 'Settings' })).toBeVisible()
  } finally {
    await app.close()
  }
})

test('writes a toggle through the bridge and persists it', async () => {
  test.setTimeout(180_000)

  const userDataDir = isolatedUserData()
  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })

  try {
    await waitForPlayerWindow(app)

    const settings = await openSettingsWindow(app)

    await expect(settings.getByTestId('toggle-closeToTray')).toBeChecked()
    await settings.getByTestId('toggle-closeToTray').click()
    await expect(settings.getByTestId('toggle-closeToTray')).not.toBeChecked()

    await expect
      .poll(() => {
        try {
          const raw = readFileSync(join(userDataDir, 'settings.json'), 'utf8')

          return (JSON.parse(raw) as Record<string, unknown>)['closeToTray']
        } catch {
          return undefined
        }
      })
      .toBe(false)
  } finally {
    await app.close()
  }
})

test('rejects settings IPC from the third-party player page', async () => {
  test.setTimeout(180_000)

  const userDataDir = isolatedUserData()
  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })

  try {
    const player = await waitForPlayerWindow(app)

    // The player has no preload, so it must have no bridge at all.
    const bridge = await player.evaluate(() => ({
      hasBridge: typeof (window as unknown as { jiohotstar?: unknown }).jiohotstar !== 'undefined',
      requireBlocked: (() => {
        try {
          // A sandboxed, non-preload renderer must not expose require.
          return typeof (window as unknown as { require?: unknown }).require === 'undefined'
        } catch {
          return true
        }
      })()
    }))

    expect(bridge.hasBridge).toBe(false)
    expect(bridge.requireBlocked).toBe(true)
  } finally {
    await app.close()
  }
})
