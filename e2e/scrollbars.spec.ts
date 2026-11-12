import { _electron as electron, expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
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
      scrollbarWidthStyle: getComputedStyle(root).scrollbarWidth
    }
  })
}

/**
 * The site's landing page varies — campaigns, consent banners, and regional
 * variants all change its height and whether it scrolls at all. These tests
 * therefore assert on the scrollbar gutter and computed style only, never on
 * page length or wheel behaviour, which are the site's business.
 */

test('hides the scrollbar gutter', async () => {
  test.setTimeout(180_000)

  const app = await electron.launch({ args: ['.', `--user-data-dir=${isolatedUserData()}`] })

  try {
    const player = await waitForPlayerWindow(app)
    await player.waitForTimeout(2500)

    await expect
      .poll(async () => (await scrollMetrics(player)).scrollbarGutter, { timeout: 20_000 })
      .toBe(0)

    expect((await scrollMetrics(player)).scrollbarWidthStyle).toBe('none')
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
