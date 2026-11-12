import { _electron as electron, expect, test } from '@playwright/test'
import { waitForPlayerWindow } from './support/player'

test('opens the JioHotstar player', async () => {
  test.setTimeout(120_000)

  const app = await electron.launch({ args: ['.'] })

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
