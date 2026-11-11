import { describe, expect, it } from 'vitest'
import { isWindowState, resolveWindowBounds } from './window-state'
import type { WindowState, WorkArea } from './window-state'

const PRIMARY: WorkArea = { x: 0, y: 0, width: 1920, height: 1040 }
const OPTIONS = { minWidth: 960, minHeight: 600 }

function state(overrides: Partial<WindowState> = {}): WindowState {
  return { x: 100, y: 80, width: 1280, height: 800, maximized: false, ...overrides }
}

describe('isWindowState', () => {
  it('accepts a complete record', () => {
    expect(isWindowState(state())).toBe(true)
  })

  it('rejects partial or malformed records', () => {
    expect(isWindowState(null)).toBe(false)
    expect(isWindowState({})).toBe(false)
    expect(isWindowState({ ...state(), width: Number.NaN })).toBe(false)
    expect(isWindowState({ ...state(), maximized: 'yes' })).toBe(false)
  })
})

describe('resolveWindowBounds', () => {
  it('keeps bounds that are already on screen', () => {
    expect(resolveWindowBounds(state(), [PRIMARY], OPTIONS)).toEqual({
      x: 100,
      y: 80,
      width: 1280,
      height: 800
    })
  })

  it('enforces the minimum window size', () => {
    const bounds = resolveWindowBounds(state({ width: 400, height: 300 }), [PRIMARY], OPTIONS)

    expect(bounds.width).toBe(960)
    expect(bounds.height).toBe(600)
  })

  it('shrinks windows saved on a larger display', () => {
    const bounds = resolveWindowBounds(state({ width: 2560, height: 1400 }), [PRIMARY], OPTIONS)

    expect(bounds.width).toBe(1920)
    expect(bounds.height).toBe(1040)
  })

  it('recentres windows that are fully off screen', () => {
    const bounds = resolveWindowBounds(state({ x: 5000, y: 5000 }), [PRIMARY], OPTIONS)

    expect(bounds.x).toBe(320)
    expect(bounds.y).toBe(120)
  })

  it('recentres windows with only a sliver visible', () => {
    const bounds = resolveWindowBounds(state({ x: 1900, y: 80 }), [PRIMARY], OPTIONS)

    expect(bounds.x).toBe(320)
  })

  it('accepts a window positioned on a secondary display', () => {
    const secondary: WorkArea = { x: 1920, y: 0, width: 1920, height: 1040 }
    const bounds = resolveWindowBounds(state({ x: 2200, y: 200 }), [PRIMARY, secondary], OPTIONS)

    expect(bounds.x).toBe(2200)
    expect(bounds.y).toBe(200)
  })

  it('falls back to the saved position when no displays are reported', () => {
    const bounds = resolveWindowBounds(state(), [], OPTIONS)

    expect(bounds).toEqual({ x: 100, y: 80, width: 1280, height: 800 })
  })
})
