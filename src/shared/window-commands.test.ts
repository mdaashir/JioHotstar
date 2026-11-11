import { describe, expect, it } from 'vitest'
import { matchWindowCommand } from './window-commands'
import type { KeyInput } from './window-commands'

function input(overrides: Partial<KeyInput> = {}): KeyInput {
  return {
    type: 'keyDown',
    key: '',
    control: false,
    shift: false,
    alt: false,
    meta: false,
    ...overrides
  }
}

describe('matchWindowCommand on Windows and Linux', () => {
  it('maps a bare F11 to fullscreen', () => {
    expect(matchWindowCommand(input({ key: 'F11' }), 'win32')).toBe('toggle-fullscreen')
    expect(matchWindowCommand(input({ key: 'F11' }), 'linux')).toBe('toggle-fullscreen')
  })

  it('maps ctrl+shift+T to always on top', () => {
    expect(matchWindowCommand(input({ key: 'T', control: true, shift: true }), 'win32')).toBe(
      'toggle-always-on-top'
    )
  })

  it('maps ctrl+shift+P to picture-in-picture', () => {
    expect(matchWindowCommand(input({ key: 'P', control: true, shift: true }), 'win32')).toBe(
      'toggle-picture-in-picture'
    )
  })

  it('accepts a lowercase key regardless of shift state', () => {
    expect(matchWindowCommand(input({ key: 't', control: true, shift: true }), 'win32')).toBe(
      'toggle-always-on-top'
    )
    expect(matchWindowCommand(input({ key: 'p', control: true, shift: true }), 'win32')).toBe(
      'toggle-picture-in-picture'
    )
  })

  it('ignores modified F11 so it can reach the page', () => {
    expect(matchWindowCommand(input({ key: 'F11', control: true }), 'win32')).toBeNull()
    expect(matchWindowCommand(input({ key: 'F11', alt: true }), 'win32')).toBeNull()
  })

  it('ignores ctrl+T and ctrl+P without shift, which belong to the site', () => {
    expect(matchWindowCommand(input({ key: 'T', control: true }), 'win32')).toBeNull()
    expect(matchWindowCommand(input({ key: 'P', control: true }), 'win32')).toBeNull()
  })

  it('ignores other modifiers combined with the toggles', () => {
    expect(
      matchWindowCommand(input({ key: 'T', control: true, shift: true, alt: true }), 'win32')
    ).toBeNull()
    expect(
      matchWindowCommand(input({ key: 'P', control: true, shift: true, meta: true }), 'win32')
    ).toBeNull()
  })

  it('ignores key up events so the command fires once', () => {
    expect(matchWindowCommand(input({ key: 'F11', type: 'keyUp' }), 'win32')).toBeNull()
    expect(
      matchWindowCommand(input({ key: 'P', type: 'keyUp', control: true, shift: true }), 'win32')
    ).toBeNull()
  })
})

describe('matchWindowCommand on macOS', () => {
  it('maps ctrl+cmd+F to fullscreen', () => {
    expect(matchWindowCommand(input({ key: 'f', meta: true, control: true }), 'darwin')).toBe(
      'toggle-fullscreen'
    )
  })

  it('maps cmd+shift+T to always on top', () => {
    expect(matchWindowCommand(input({ key: 't', meta: true, shift: true }), 'darwin')).toBe(
      'toggle-always-on-top'
    )
  })

  it('maps cmd+shift+P to picture-in-picture', () => {
    expect(matchWindowCommand(input({ key: 'p', meta: true, shift: true }), 'darwin')).toBe(
      'toggle-picture-in-picture'
    )
  })

  it('does not treat F11 as fullscreen on macOS', () => {
    expect(matchWindowCommand(input({ key: 'F11' }), 'darwin')).toBeNull()
  })

  it('does not treat ctrl+shift+T as a command on macOS', () => {
    expect(matchWindowCommand(input({ key: 't', control: true, shift: true }), 'darwin')).toBeNull()
  })
})
