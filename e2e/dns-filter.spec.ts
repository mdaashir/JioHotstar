import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

/**
 * The DNS filter's real risk is blocking a domain the site needs. This enables
 * it and confirms the player still loads, which is the only assertion that
 * matters — the ad-blocking itself is not testable from inside the app.
 */
test('player still loads with DNS filtering enabled', async () => {
  test.setTimeout(180_000)

  const userDataDir = mkdtempSync(join(tmpdir(), 'jiohotstar-dnsfa-'))
  writeFileSync(join(userDataDir, 'settings.json'), JSON.stringify({ dnsFilter: true }))

  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })

  try {
    const player = await waitForPlayerWindow(app)

    await expect.poll(() => player.url()).toMatch(/hotstar\.com/)

    const loaded = await player.evaluate(() => ({
      href: window.location.href.slice(0, 60),
      bodyLength: document.body.innerHTML.length
    }))

    console.log('LOADED ' + JSON.stringify(loaded))

    // A blocked dependency would leave the shell with an empty body.
    expect(loaded.bodyLength).toBeGreaterThan(500)
  } finally {
    await app.close()
  }
})
