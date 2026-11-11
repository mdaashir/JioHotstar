import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

function isolatedUserData(): string {
  return mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
}

async function scrollMetrics(player: Page) {
  return player.evaluate(() => {
    const root = document.documentElement

    return {
      // innerWidth - clientWidth is the scrollbar gutter. outerWidth is the OS
      // window frame and says nothing about the scrollbar.
      scrollbarGutter: window.innerWidth - root.clientWidth,
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
      scrollY: window.scrollY,
      scrollbarWidthStyle: getComputedStyle(root).scrollbarWidth
    }
  })
}

async function scrollByWheel(app: ElectronApplication, deltaY: number) {
  await app.evaluate(({ BrowserWindow }, delta) => {
    const window = BrowserWindow.getAllWindows().find((candidate) =>
      candidate.webContents.getURL().includes('hotstar.com')
    )

    window?.webContents.sendInputEvent({
      type: 'mouseWheel',
      x: 400,
      y: 400,
      deltaX: 0,
      deltaY: delta
    })
  }, deltaY)
}

test('hides the scrollbar but keeps the page scrollable', async () => {
  test.setTimeout(180_000)

  const app = await electron.launch({ args: ['.', `--user-data-dir=${isolatedUserData()}`] })

  try {
    const player = await waitForPlayerWindow(app)
    await player.waitForTimeout(2500)

    await expect
      .poll(async () => (await scrollMetrics(player)).scrollbarGutter, { timeout: 15_000 })
      .toBe(0)

    const metrics = await scrollMetrics(player)
    expect(metrics.scrollbarWidthStyle).toBe('none')
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)
    expect(metrics.scrollY).toBe(0)

    await scrollByWheel(app, -600)
    await expect
      .poll(async () => (await scrollMetrics(player)).scrollY, { timeout: 10_000 })
      .toBeGreaterThan(0)
  } finally {
    await app.close()
  }
})

test('keeps the scrollbar when the preference is off', async () => {
  test.setTimeout(180_000)

  const userDataDir = isolatedUserData()
  writeFileSync(join(userDataDir, 'settings.json'), JSON.stringify({ hideScrollbars: false }))

  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })

  try {
    const player = await waitForPlayerWindow(app)
    await player.waitForTimeout(2500)

    const metrics = await scrollMetrics(player)

    expect(metrics.scrollbarGutter).toBeGreaterThan(0)
    expect(metrics.scrollbarWidthStyle).not.toBe('none')
  } finally {
    await app.close()
  }
})
