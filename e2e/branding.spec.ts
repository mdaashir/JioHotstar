import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Verifies the branded icon without racing the app's own window lifecycle.
 *
 * The splash is destroyed as soon as the player paints, and on a fast runner
 * `firstWindow()` can already be the player, so asserting against whichever
 * window the app happens to own is inherently racy. This opens a window on the
 * splash route itself, with the real preload, which is deterministic.
 */
test('ships the branded icon in the splash and the app icon', async () => {
  test.setTimeout(120_000)

  const userDataDir = mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })

  try {
    await app.evaluate(async ({ BrowserWindow, app: electronApp }) => {
      const splash = new BrowserWindow({
        width: 460,
        height: 320,
        show: false,
        webPreferences: {
          preload: `${electronApp.getAppPath()}/out/preload/index.js`,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true
        }
      })

      await splash.loadFile(`${electronApp.getAppPath()}/out/renderer/index.html`)
    })

    const splash = app.windows().find((window) => window.url().includes('index.html'))

    expect(splash).toBeDefined()

    await splash?.waitForSelector('img.brand-mark', { state: 'attached', timeout: 20_000 })

    const splashIcon = await splash?.evaluate(() => {
      const image = document.querySelector('img.brand-mark') as HTMLImageElement

      return {
        src: image.getAttribute('src') ?? '',
        complete: image.complete,
        naturalWidth: image.naturalWidth
      }
    })

    expect(splashIcon?.src).toMatch(/app-icon/)
    expect(splashIcon?.complete).toBe(true)
    expect(splashIcon?.naturalWidth).toBe(128)

    const packagedIcons = await app.evaluate(({ nativeImage, app: electronApp }) => {
      const main = nativeImage.createFromPath(`${electronApp.getAppPath()}/resources/icon.png`)
      const tray = nativeImage.createFromPath(`${electronApp.getAppPath()}/resources/tray-icon.png`)

      return {
        main: { empty: main.isEmpty(), width: main.getSize().width },
        tray: { empty: tray.isEmpty(), width: tray.getSize().width }
      }
    })

    expect(packagedIcons.main.empty).toBe(false)
    expect(packagedIcons.main.width).toBe(256)
    expect(packagedIcons.tray.empty).toBe(false)
    expect(packagedIcons.tray.width).toBe(32)
  } finally {
    await app.close()
  }
})
