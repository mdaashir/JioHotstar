import { _electron as electron, expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

function isolatedUserData(): string {
  return mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
}

async function playSyntheticVideo(player: Page): Promise<void> {
  await player.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 180
    const context = canvas.getContext('2d')

    if (context !== null) {
      context.fillStyle = '#2f6bff'
      context.fillRect(0, 0, 320, 180)
    }

    const video = document.createElement('video')
    video.id = 'e2e-media-video'
    video.srcObject = canvas.captureStream(10)
    video.muted = true
    video.playsInline = true
    video.style.position = 'fixed'
    video.style.width = '160px'
    video.style.left = '0'
    video.style.top = '0'
    video.style.zIndex = '2147483647'
    document.body.appendChild(video)
  })

  await player.click('body').catch(() => undefined)
  await player.evaluate(async () => {
    const video = document.getElementById('e2e-media-video') as HTMLVideoElement | null
    await video?.play()
  })
}

async function videoPaused(player: Page): Promise<boolean | null> {
  return player.evaluate(() => {
    const videos = [...document.querySelectorAll('video')].filter((video) => video.readyState > 0)

    if (videos.length === 0) {
      return null
    }

    return videos.every((video) => video.paused)
  })
}

test('registers media keys and leaves next/previous to the OS', async () => {
  test.setTimeout(180_000)

  const app = await electron.launch({ args: ['.', `--user-data-dir=${isolatedUserData()}`] })

  try {
    await waitForPlayerWindow(app)

    const registered = await app.evaluate(({ globalShortcut }) => ({
      playPause: globalShortcut.isRegistered('MediaPlayPause'),
      stop: globalShortcut.isRegistered('MediaStop'),
      nextTrack: globalShortcut.isRegistered('MediaNextTrack'),
      previousTrack: globalShortcut.isRegistered('MediaPreviousTrack')
    }))

    expect(
      registered.playPause,
      'MediaPlayPause was not registered. On Windows a global shortcut is ' +
        'system-wide and exclusive, so another copy of JioHotstar already running ' +
        '(for example the installed build) will hold it and this one cannot. Quit ' +
        'other instances and re-run. CI is unaffected.'
    ).toBe(true)
    expect(registered.stop).toBe(true)
    expect(registered.nextTrack).toBe(false)
    expect(registered.previousTrack).toBe(false)
  } finally {
    await app.close()
  }
})

test('the play-pause action toggles the largest playing video', async () => {
  test.setTimeout(180_000)

  const app = await electron.launch({ args: ['.', `--user-data-dir=${isolatedUserData()}`] })

  try {
    const player = await waitForPlayerWindow(app)
    await player.waitForTimeout(1500)
    await playSyntheticVideo(player)

    await expect.poll(async () => videoPaused(player), { timeout: 15_000 }).toBe(false)

    // Exercise the exact script the media-key handler injects. A physical media
    // key cannot be synthesized, so the registration test above covers that the
    // OS key reaches this code, and this covers what the code does.
    const { scriptFor } = await import('../src/shared/media-keys')
    const result: unknown = await app.evaluate(async ({ BrowserWindow }, script) => {
      const window = BrowserWindow.getAllWindows().find((candidate) =>
        candidate.webContents.getURL().includes('hotstar.com')
      )

      return window?.webContents.executeJavaScript(script, true)
    }, scriptFor('play-pause'))

    expect(result).toMatchObject({ status: 'paused' })
    await expect.poll(async () => videoPaused(player), { timeout: 10_000 }).toBe(true)

    const resumed: unknown = await app.evaluate(async ({ BrowserWindow }, script) => {
      const window = BrowserWindow.getAllWindows().find((candidate) =>
        candidate.webContents.getURL().includes('hotstar.com')
      )

      return window?.webContents.executeJavaScript(script, true)
    }, scriptFor('play-pause'))

    expect(resumed).toMatchObject({ status: 'playing' })
    await expect.poll(async () => videoPaused(player), { timeout: 10_000 }).toBe(false)
  } finally {
    await app.close()
  }
})

test('reports no-video when nothing is playing', async () => {
  test.setTimeout(180_000)

  const app = await electron.launch({ args: ['.', `--user-data-dir=${isolatedUserData()}`] })

  try {
    await waitForPlayerWindow(app)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const { scriptFor } = await import('../src/shared/media-keys')
    const result: unknown = await app.evaluate(async ({ BrowserWindow }, script) => {
      const window = BrowserWindow.getAllWindows().find((candidate) =>
        candidate.webContents.getURL().includes('hotstar.com')
      )

      return window?.webContents.executeJavaScript(script, true)
    }, scriptFor('play-pause'))

    expect(result).toMatchObject({ status: 'no-video' })
  } finally {
    await app.close()
  }
})
