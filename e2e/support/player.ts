import type { ElectronApplication, Page } from '@playwright/test'

async function playerIsVisible(app: ElectronApplication): Promise<boolean> {
  return app.evaluate(({ BrowserWindow }) => {
    const player = BrowserWindow.getAllWindows().find((window) =>
      window.webContents.getURL().includes('hotstar.com')
    )

    return player !== undefined && player.isVisible()
  })
}

/**
 * Waits until the player window exists *and* has been shown. The window is
 * created with `show: false` and only revealed on `ready-to-show`, so a loaded
 * URL on its own means the page has not painted yet.
 */
export async function waitForPlayerWindow(
  app: ElectronApplication,
  timeoutMs = 90_000
): Promise<Page> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const candidate = app.windows().find((window) => window.url().includes('hotstar.com'))

    if (candidate !== undefined && (await playerIsVisible(app))) {
      return candidate
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('The player window did not open')
}
