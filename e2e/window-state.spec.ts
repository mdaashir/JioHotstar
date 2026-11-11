import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

async function readPlayerBounds(app: Awaited<ReturnType<typeof electron.launch>>) {
  return app.evaluate(({ BrowserWindow }) => {
    const player = BrowserWindow.getAllWindows().find((window) =>
      window.webContents.getURL().includes('hotstar.com')
    )

    return player?.getBounds() ?? null
  })
}

test('restores the player window bounds across launches', async () => {
  test.setTimeout(240_000)

  const userDataDir = mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
  const args = ['.', `--user-data-dir=${userDataDir}`]

  const first = await electron.launch({ args })

  try {
    await waitForPlayerWindow(first)

    await first.evaluate(({ BrowserWindow }) => {
      const player = BrowserWindow.getAllWindows().find((window) =>
        window.webContents.getURL().includes('hotstar.com')
      )

      player?.setBounds({ x: 140, y: 110, width: 1040, height: 680 })
    })

    await new Promise((resolve) => setTimeout(resolve, 1500))
  } finally {
    await first.close()
  }

  const second = await electron.launch({ args })

  try {
    await waitForPlayerWindow(second)

    await expect.poll(async () => readPlayerBounds(second)).toEqual({
      x: 140,
      y: 110,
      width: 1040,
      height: 680
    })
  } finally {
    await second.close()
  }
})
