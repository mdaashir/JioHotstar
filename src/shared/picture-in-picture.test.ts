import { describe, expect, it } from 'vitest'
import { PIP_TOGGLE_SCRIPT, isPipResult } from './picture-in-picture'

describe('isPipResult', () => {
  it('accepts every documented status', () => {
    for (const status of ['entered', 'exited', 'no-video', 'unsupported', 'failed']) {
      expect(isPipResult({ status })).toBe(true)
    }
  })

  it('accepts a failure message alongside the status', () => {
    expect(isPipResult({ status: 'failed', message: 'NotAllowedError' })).toBe(true)
  })

  it('rejects malformed payloads', () => {
    expect(isPipResult(null)).toBe(false)
    expect(isPipResult({})).toBe(false)
    expect(isPipResult({ status: 'playing' })).toBe(false)
    expect(isPipResult('entered')).toBe(false)
  })
})

describe('PIP_TOGGLE_SCRIPT', () => {
  it('is an async expression so the caller can await it', () => {
    expect(PIP_TOGGLE_SCRIPT.trim().startsWith('(async () => {')).toBe(true)
    expect(PIP_TOGGLE_SCRIPT.trim().endsWith('})()')).toBe(true)
  })

  it('exits before entering, so one action toggles', () => {
    expect(PIP_TOGGLE_SCRIPT.indexOf('exitPictureInPicture')).toBeLessThan(
      PIP_TOGGLE_SCRIPT.indexOf('requestPictureInPicture')
    )
  })

  it('does not modify the page or fetch anything', () => {
    expect(PIP_TOGGLE_SCRIPT).not.toContain('innerHTML')
    expect(PIP_TOGGLE_SCRIPT).not.toContain('appendChild')
    expect(PIP_TOGGLE_SCRIPT).not.toContain('fetch(')
    expect(PIP_TOGGLE_SCRIPT).not.toContain('eval(')
  })
})
