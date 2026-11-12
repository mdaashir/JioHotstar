import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Verifies the branded icon without racing the app's own window lifecycle.
 *
 * The splash is destroyed as soon as the player paints, and on a fast runner
 * `firstWindow()` can already be the player, so asserting against whichever
 * window the app happens to own is inherently racy.
 *
 * This opens its own window on the splash route. It carries a unique query
 * string because the app's own splash loads the same `index.html` — matching on
 * the path alone would sometimes select that window, then fail when the app
 * destroyed it.
 */
const PROBE_MARKER = '?e2e=branding-probe'

test('ships the branded icon in the splash and the app icon', async () => {
  test.setTimeout(120_000)

  const userDataDir = mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })

  try {
    await app.evaluate(async ({ BrowserWindow, app: electronApp }, marker) => {
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

      await splash.loadFile(`${electronApp.getAppPath()}/out/renderer/index.html`, {
        search: marker
      })
    }, PROBE_MARKER)

    let splash

    for (const deadline = Date.now() + 20_000; Date.now() < deadline;) {
      splash = app.windows().find((page) => page.url().includes(PROBE_MARKER))

      if (splash !== undefined) {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    expect(splash, 'a window on the splash route').toBeDefined()

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
