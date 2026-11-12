import type { ElectronApplication, Page } from '@playwright/test'

/** Fatal errors the main process logs when it cannot start at all. */
const STARTUP_FAILURE_PATTERN =
  /App threw an error during load|Cannot find module|is not a constructor|ERR_REQUIRE_ESM/

/**
 * How long to allow before concluding the app will never open a window.
 *
 * The splash window appears within a second on a healthy build; the player
 * follows later and is waited for separately. If there are no windows at all
 * after this, the main process never reached `whenReady`.
 */
const STARTUP_GRACE_MS = 15_000

/**
 * Collects the main process output once per application, so a startup crash can
 * be reported as its real cause instead of a generic "window did not open".
 */
const output = new WeakMap<ElectronApplication, { text: string }>()

function captureOutput(app: ElectronApplication): { text: string } {
  const existing = output.get(app)

  if (existing !== undefined) {
    return existing
  }

  const buffer = { text: '' }
  const child = app.process()

  child.stderr?.on('data', (chunk: Buffer) => {
    buffer.text += chunk.toString()
  })
  child.stdout?.on('data', (chunk: Buffer) => {
    buffer.text += chunk.toString()
  })

  output.set(app, buffer)
  return buffer
}

/**
 * Throws as soon as it is clear the app will never open a window.
 *
 * A main-process exception leaves the app running with no windows at all, so
 * waiting out a per-test timeout tells you nothing. Detecting the empty-window
 * state after a short grace period turns a broken build into a seconds-long,
 * clearly-labelled failure. Captured output is included when present.
 */
function assertStarted(app: ElectronApplication, startedAt: number): void {
  const { text } = captureOutput(app)

  if (STARTUP_FAILURE_PATTERN.test(text)) {
    throw new Error(`The app failed to start:\n\n${text.trim()}`)
  }

  const graceElapsed = Date.now() - startedAt > STARTUP_GRACE_MS

  if (graceElapsed && app.windows().length === 0) {
    throw new Error(
      'The app failed to start: it opened no windows within ' +
        `${STARTUP_GRACE_MS}ms, which means the main process did not reach startup.` +
        (text.trim() === '' ? '' : `\n\nMain process output:\n\n${text.trim()}`)
    )
  }
}

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
  timeoutMs = 60_000
): Promise<Page> {
  captureOutput(app)

  const startedAt = Date.now()
  const deadline = startedAt + timeoutMs

  while (Date.now() < deadline) {
    assertStarted(app, startedAt)

    const candidate = app.windows().find((window) => window.url().includes('hotstar.com'))

    if (candidate !== undefined && (await playerIsVisible(app))) {
      return candidate
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  assertStarted(app, startedAt)

  const { text } = captureOutput(app)

  throw new Error(
    `The player window did not open within ${timeoutMs}ms.` +
      (text.trim() === '' ? '' : `\n\nMain process output:\n\n${text.trim()}`)
  )
}
