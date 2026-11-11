import { _electron as electron, expect, test } from '@playwright/test'
import { waitForPlayerWindow } from './support/player'

test('opens the JioHotstar player', async () => {
  test.setTimeout(120_000)

  const app = await electron.launch({ args: ['.'] })

  try {
    const player = await waitForPlayerWindow(app)
    await expect(player).toHaveTitle(/JioHotstar/)
  } finally {
    await app.close()
  }
})
