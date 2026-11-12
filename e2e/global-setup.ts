import { _electron as electron } from '@playwright/test'
import { waitForPlayerWindow } from './support/player'

/**
 * Runs once before the whole suite.
 *
 * A build that crashes on load would otherwise cost one timeout per test — with
 * seventeen tests that is over twenty minutes before anything reports a real
 * error. This launches the app a single time, so a broken build fails in well
 * under a minute with the actual exception.
 */
export default async function globalSetup(): Promise<void> {
  const app = await electron.launch({ args: ['.'] })

  try {
    await waitForPlayerWindow(app, 60_000)
  } finally {
    await app.close()
  }
}
