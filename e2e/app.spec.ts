import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

test('opens the JioHotstar player', async () => {
  test.setTimeout(120_000)

  // An isolated profile, like every other spec. Sharing the default one means an
  // installed copy of the app — which anyone who uses what they build will have
  // running — locks the disk cache and this fails with
  // "Unable to move the cache: Access is denied" instead of testing anything.
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))}`]
  })

  try {
    const player = await waitForPlayerWindow(app)

    // Assert what this app is responsible for: that the official site loaded in
    // a window we control. The page's own <title> is not ours to pin — the site
    // varies it by campaign and region, and asserting on it tests their copy.
    await expect.poll(() => player.url()).toMatch(/^https:\/\/[\w.]*hotstar\.com\//)

    const title = await player.title()
    expect(title.length).toBeGreaterThan(0)
  } finally {
    await app.close()
  }
})
