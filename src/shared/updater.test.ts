import { describe, expect, it } from 'vitest'
import { canCheckForUpdates, describeState, isRestartAction } from './updater'
import type { UpdateState } from './updater'

describe('canCheckForUpdates', () => {
  it('only allows packaged builds', () => {
    expect(canCheckForUpdates(true)).toBe(true)
    expect(canCheckForUpdates(false)).toBe(false)
  })
})

describe('describeState', () => {
  it('names the version when one is available', () => {
    expect(describeState({ status: 'available', version: '0.2.0' })).toBe(
      'Version 0.2.0 is available'
    )
  })

  it('rounds download progress', () => {
    expect(describeState({ status: 'downloading', percent: 42.7 })).toBe('Downloading update… 43%')
  })

  it('handles missing progress without printing NaN', () => {
    expect(describeState({ status: 'downloading' })).toBe('Downloading update… 0%')
  })

  it('prefers the concrete error message', () => {
    expect(describeState({ status: 'error', message: 'net::ERR_INTERNET_DISCONNECTED' })).toBe(
      'net::ERR_INTERNET_DISCONNECTED'
    )
  })

  it('falls back when an error has no message', () => {
    expect(describeState({ status: 'error' })).toBe('The update check failed')
  })

  it('covers every status', () => {
    const statuses: UpdateState['status'][] = [
      'checking',
      'available',
      'not-available',
      'downloading',
      'downloaded',
      'error',
      'unsupported'
    ]

    for (const status of statuses) {
      expect(describeState({ status }).length).toBeGreaterThan(0)
    }
  })
})

describe('isRestartAction', () => {
  it('only offers restart once the update is downloaded', () => {
    expect(isRestartAction({ status: 'downloaded' })).toBe(true)
    expect(isRestartAction({ status: 'available' })).toBe(false)
    expect(isRestartAction({ status: 'downloading', percent: 100 })).toBe(false)
  })
})
