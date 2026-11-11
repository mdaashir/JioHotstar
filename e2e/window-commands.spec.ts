import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

async function playerState(app: ElectronApplication) {
  return app.evaluate(({ BrowserWindow }) => {
    const player = BrowserWindow.getAllWindows().find((window) =>
      window.webContents.getURL().includes('hotstar.com')
    )

    if (player === undefined) {
      return null
    }

    return {
      fullScreen: player.isFullScreen(),
      alwaysOnTop: player.isAlwaysOnTop(),
      title: player.getTitle()
    }
  })
}

function sendKey(app: ElectronApplication, keyCode: string, modifiers: string[] = []) {
  return app.evaluate(
    ({ BrowserWindow }, { code, mods }) => {
      const window = BrowserWindow.getAllWindows().find((candidate) =>
        candidate.webContents.getURL().includes('hotstar.com')
      )

      window?.webContents.sendInputEvent({
        type: 'keyDown',
        keyCode: code,
        modifiers: mods as Electron.InputEvent['modifiers']
      })
    },
    { code: keyCode, mods: modifiers }
  )
}

test('toggles fullscreen and always-on-top from the keyboard', async () => {
  test.setTimeout(180_000)

  const userDataDir = mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })

  try {
    await waitForPlayerWindow(app)
    await new Promise((resolve) => setTimeout(resolve, 800))

    const initial = await playerState(app)
    expect(initial?.fullScreen).toBe(false)
    expect(initial?.alwaysOnTop).toBe(false)

    await sendKey(app, 'F11')
    await expect.poll(async () => (await playerState(app))?.fullScreen).toBe(true)

    await sendKey(app, 'F11')
    await expect.poll(async () => (await playerState(app))?.fullScreen).toBe(false)

    await sendKey(app, 'T', ['control', 'shift'])
    await expect.poll(async () => (await playerState(app))?.alwaysOnTop).toBe(true)
    await expect.poll(async () => (await playerState(app))?.title).toContain('Always on top')

    await sendKey(app, 'T', ['control', 'shift'])
    await expect.poll(async () => (await playerState(app))?.alwaysOnTop).toBe(false)
    await expect.poll(async () => (await playerState(app))?.title).not.toContain('Always on top')
  } finally {
    await app.close()
  }
})

test('keeps always-on-top across launches', async () => {
  test.setTimeout(180_000)

  const userDataDir = mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
  const args = ['.', `--user-data-dir=${userDataDir}`]

  const first = await electron.launch({ args })

  try {
    await waitForPlayerWindow(first)
    await new Promise((resolve) => setTimeout(resolve, 800))
    await sendKey(first, 'T', ['control', 'shift'])
    await expect.poll(async () => (await playerState(first))?.alwaysOnTop).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
  } finally {
    await first.close()
  }

  const second = await electron.launch({ args })

  try {
    await waitForPlayerWindow(second)
    const state = await playerState(second)

    expect(state?.alwaysOnTop).toBe(true)
    expect(state?.title).toContain('Always on top')
  } finally {
    await second.close()
  }
})
