import { describe, expect, it } from 'vitest'
import {
  MEDIA_KEY_ACCELERATORS,
  PLAY_PAUSE_SCRIPT,
  STOP_SCRIPT,
  isMediaKeyResult,
  scriptFor
} from './media-keys'

describe('MEDIA_KEY_ACCELERATORS', () => {
  it('only registers keys we can implement honestly', () => {
    const accelerators = MEDIA_KEY_ACCELERATORS.map((entry) => entry.accelerator)

    expect(accelerators).toContain('MediaPlayPause')
    expect(accelerators).toContain('MediaStop')
  })

  it('does not claim next/previous track, which need site cooperation', () => {
    const accelerators = MEDIA_KEY_ACCELERATORS.map((entry) => entry.accelerator)

    expect(accelerators).not.toContain('MediaNextTrack')
    expect(accelerators).not.toContain('MediaPreviousTrack')
  })
})

describe('scriptFor', () => {
  it('maps play-pause to the toggling script', () => {
    expect(scriptFor('play-pause')).toBe(PLAY_PAUSE_SCRIPT)
  })

  it('maps stop to the pausing script', () => {
    expect(scriptFor('stop')).toBe(STOP_SCRIPT)
  })
})

describe('injected scripts', () => {
  it('never disable media keys, which would break the OS setting', () => {
    for (const script of [PLAY_PAUSE_SCRIPT, STOP_SCRIPT]) {
      expect(script).not.toContain('disablePictureInPicture')
      expect(script).not.toContain('innerHTML')
      expect(script).not.toContain('fetch(')
    }
  })

  it('report no-video instead of throwing when nothing is playing', () => {
    expect(PLAY_PAUSE_SCRIPT).toContain("status: 'no-video'")
    expect(STOP_SCRIPT).toContain("status: 'no-video'")
  })

  it('play-pause toggles based on the current paused state', () => {
    expect(PLAY_PAUSE_SCRIPT).toContain('if (target.paused)')
    expect(PLAY_PAUSE_SCRIPT).toContain('target.pause()')
  })
})

describe('isMediaKeyResult', () => {
  it('accepts every documented status', () => {
    for (const status of ['playing', 'paused', 'no-video', 'failed']) {
      expect(isMediaKeyResult({ status })).toBe(true)
    }
  })

  it('rejects malformed payloads', () => {
    expect(isMediaKeyResult(null)).toBe(false)
    expect(isMediaKeyResult({})).toBe(false)
    expect(isMediaKeyResult({ status: 'buffering' })).toBe(false)
  })
})
