import { describe, expect, it } from 'vitest'
import { SETTINGS_KEYS, SETTINGS_LABELS, sanitizeSettingsPatch } from './settings'

describe('sanitizeSettingsPatch', () => {
  it('keeps known boolean keys', () => {
    expect(sanitizeSettingsPatch({ alwaysOnTop: true, closeToTray: false })).toEqual({
      alwaysOnTop: true,
      closeToTray: false
    })
  })

  it('drops unknown keys so a renderer cannot write arbitrary settings', () => {
    expect(sanitizeSettingsPatch({ alwaysOnTop: true, windowState: { x: 1 } })).toEqual({
      alwaysOnTop: true
    })
  })

  it('drops non-boolean values for known keys', () => {
    expect(sanitizeSettingsPatch({ alwaysOnTop: 'yes', hideScrollbars: 1 })).toEqual({})
  })

  it('returns an empty patch for malformed input', () => {
    expect(sanitizeSettingsPatch(null)).toEqual({})
    expect(sanitizeSettingsPatch('alwaysOnTop')).toEqual({})
    expect(sanitizeSettingsPatch([])).toEqual({})
    expect(sanitizeSettingsPatch(undefined)).toEqual({})
  })

  it('accepts a full snapshot', () => {
    const full = {
      alwaysOnTop: true,
      closeToTray: true,
      hideScrollbars: true,
      rememberWindowState: true,
      dnsFilter: true
    }

    expect(sanitizeSettingsPatch(full)).toEqual(full)
  })
})

describe('SETTINGS_KEYS', () => {
  it('covers every key in the snapshot shape', () => {
    expect([...SETTINGS_KEYS].sort()).toEqual([
      'alwaysOnTop',
      'closeToTray',
      'dnsFilter',
      'hideScrollbars',
      'rememberWindowState'
    ])
  })
})

describe('SETTINGS_LABELS', () => {
  it('explains each setting rather than only naming it', () => {
    for (const key of SETTINGS_KEYS) {
      expect(SETTINGS_LABELS[key]).toBeTruthy()
      expect(SETTINGS_LABELS[`${key}Hint` as keyof typeof SETTINGS_LABELS]).toBeTruthy()
    }
  })
})
