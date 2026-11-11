import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

async function playerVisible(app: ElectronApplication) {
  return app.evaluate(({ BrowserWindow }) => {
    const player = BrowserWindow.getAllWindows().find((window) =>
      window.webContents.getURL().includes('hotstar.com')
    )

    return player === undefined ? null : player.isVisible()
  })
}

async function closePlayer(app: ElectronApplication) {
  await app.evaluate(({ BrowserWindow }) => {
    const player = BrowserWindow.getAllWindows().find((window) =>
      window.webContents.getURL().includes('hotstar.com')
    )

    player?.close()
  })
}

function isolatedUserData(): string {
  return mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
}

test('hides to the tray on close and reopens without quitting', async () => {
  test.setTimeout(180_000)

  const app = await electron.launch({ args: ['.', `--user-data-dir=${isolatedUserData()}`] })

  try {
    await waitForPlayerWindow(app)
    await expect.poll(async () => playerVisible(app)).toBe(true)

    await closePlayer(app)

    await expect.poll(async () => playerVisible(app)).toBe(false)

    const windowCount = await app.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows().length
    )
    expect(windowCount).toBe(1)

    await app.evaluate(({ BrowserWindow }) => {
      const player = BrowserWindow.getAllWindows().find((window) =>
        window.webContents.getURL().includes('hotstar.com')
      )

      player?.show()
    })

    await expect.poll(async () => playerVisible(app)).toBe(true)
  } finally {
    await app.close()
  }
})

test('resolves a usable tray icon', async () => {
  test.setTimeout(180_000)

  const app = await electron.launch({ args: ['.', `--user-data-dir=${isolatedUserData()}`] })

  try {
    await waitForPlayerWindow(app)

    const icon = await app.evaluate(({ app: electronApp, nativeImage }) => {
      const image = nativeImage.createFromPath(
        `${electronApp.getAppPath()}/resources/tray-icon.png`
      )

      return { empty: image.isEmpty(), width: image.getSize().width }
    })

    expect(icon.empty).toBe(false)
    expect(icon.width).toBe(32)
  } finally {
    await app.close()
  }
})

test('quits when close-to-tray is disabled', async () => {
  test.setTimeout(180_000)

  const userDataDir = isolatedUserData()
  writeFileSync(join(userDataDir, 'settings.json'), JSON.stringify({ closeToTray: false }))

  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })

  try {
    await waitForPlayerWindow(app)
    await expect.poll(async () => playerVisible(app)).toBe(true)

    await closePlayer(app)

    await expect
      .poll(async () => {
        try {
          return await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)
        } catch {
          return 0
        }
      })
      .toBe(0)
  } finally {
    await app.close()
  }
})
