import { _electron as electron } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

/**
 * Runs once before the whole suite.
 *
 * A build that crashes on load would otherwise cost one timeout per test — with
 * seventeen tests that is over twenty minutes before anything reports a real
 * error. This launches the app a single time, so a broken build fails in well
 * under a minute with the actual exception.
 *
 * It uses a throwaway user-data directory rather than the default profile. An
 * installed copy of the app holding the default profile (which is normal for
 * anyone who uses what they build) locks its disk cache, and Chromium then fails
 * with "Unable to move the cache: Access is denied" — a startup failure that
 * looks like a broken build but is really just a second instance.
 */
export default async function globalSetup(): Promise<void> {
  const userDataDir = mkdtempSync(join(tmpdir(), 'jiohotstar-setup-'))
  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })

  try {
    await waitForPlayerWindow(app, 60_000)
  } finally {
    await app.close()
  }
}
