import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForPlayerWindow } from './support/player'

function isolatedUserData(): string {
  return mkdtempSync(join(tmpdir(), 'jiohotstar-e2e-'))
}

async function sendKey(app: ElectronApplication, keyCode: string, modifiers: string[] = []) {
  await app.evaluate(
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
    video.id = 'e2e-video'
    video.srcObject = canvas.captureStream(10)
    video.muted = true
    video.playsInline = true
    video.style.position = 'fixed'
    video.style.left = '0'
    video.style.top = '0'
    video.style.width = '160px'
    video.style.zIndex = '2147483647'
    document.body.appendChild(video)
  })

  await player.click('body').catch(() => undefined)
  await player.evaluate(async () => {
    const video = document.getElementById('e2e-video') as HTMLVideoElement | null
    await video?.play()
  })
}

async function pipState(player: Page) {
  return player.evaluate(() => {
    const videos = [...document.querySelectorAll('video')]

    return {
      inPip: document.pictureInPictureElement !== null,
      // The PiP script skips videos with `readyState === 0`, so counting nodes is
      // not enough — wait for a frame to actually be decoded and playing.
      playing: videos.some((video) => !video.paused && video.readyState > 0)
    }
  })
}

test('toggles native picture-in-picture for the active video', async () => {
  test.setTimeout(180_000)

  const app = await electron.launch({ args: ['.', `--user-data-dir=${isolatedUserData()}`] })

  try {
    const player = await waitForPlayerWindow(app)
    await player.waitForTimeout(1500)

    await playSyntheticVideo(player)

    // Gate on a decoded, playing video. Firing the shortcut while the canvas
    // stream is still warming up makes the injected script report `no-video`
    // and nothing toggles — which is the flake this test used to have.
    await expect.poll(async () => (await pipState(player)).playing, { timeout: 20_000 }).toBe(true)

    expect((await pipState(player)).inPip).toBe(false)

    await sendKey(app, 'P', ['control', 'shift'])
    await expect.poll(async () => (await pipState(player)).inPip, { timeout: 20_000 }).toBe(true)

    await sendKey(app, 'P', ['control', 'shift'])
    await expect.poll(async () => (await pipState(player)).inPip, { timeout: 20_000 }).toBe(false)
  } finally {
    await app.close()
  }
})
