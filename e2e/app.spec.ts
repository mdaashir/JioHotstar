import { _electron as electron, expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test('opens the JioHotstar player', async () => {
  test.setTimeout(120_000)

  const app = await electron.launch({ args: ['.'] })

  try {
    let player: Page | null = null
    const deadline = Date.now() + 90_000

    while (player === null && Date.now() < deadline) {
      for (const candidate of app.windows()) {
        if (candidate.url().includes('hotstar.com')) {
          player = candidate
          break
        }
      }

      if (player === null) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    if (player === null) {
      throw new Error('The player window did not open')
    }

    await expect(player).toHaveTitle(/JioHotstar/)
  } finally {
    await app.close()
  }
})
