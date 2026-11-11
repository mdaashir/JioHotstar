import { describe, expect, it } from 'vitest'
import { classifyLoadFailure } from './startup'

describe('classifyLoadFailure', () => {
  it('treats connectivity errors as offline', () => {
    expect(classifyLoadFailure(-106)).toBe('offline')
    expect(classifyLoadFailure(-105)).toBe('offline')
    expect(classifyLoadFailure(-102)).toBe('offline')
    expect(classifyLoadFailure(-118)).toBe('offline')
  })

  it('does not blame connectivity for aborted or server-side failures', () => {
    expect(classifyLoadFailure(-3)).toBe('unknown')
    expect(classifyLoadFailure(-107)).toBe('unknown')
    expect(classifyLoadFailure(-324)).toBe('unknown')
  })

  it('falls back to unknown for unrecognised codes', () => {
    expect(classifyLoadFailure(0)).toBe('unknown')
    expect(classifyLoadFailure(200)).toBe('unknown')
  })
})
