import { describe, expect, it } from 'vitest'
import { HIDE_SCROLLBARS_CSS } from './scrollbars'

describe('HIDE_SCROLLBARS_CSS', () => {
  it('hides both Chromium and standard scrollbars', () => {
    expect(HIDE_SCROLLBARS_CSS).toContain('::-webkit-scrollbar')
    expect(HIDE_SCROLLBARS_CSS).toContain('scrollbar-width: none')
  })

  it('covers the root scroller as well as inner containers', () => {
    expect(HIDE_SCROLLBARS_CSS).toContain('html')
    expect(HIDE_SCROLLBARS_CSS).toContain('body')
  })

  it('never sets overflow, which would disable scrolling', () => {
    expect(HIDE_SCROLLBARS_CSS).not.toContain('overflow')
  })

  it('never hides or disables page content', () => {
    expect(HIDE_SCROLLBARS_CSS).not.toContain('pointer-events')
    expect(HIDE_SCROLLBARS_CSS).not.toContain('visibility')
    expect(HIDE_SCROLLBARS_CSS).not.toContain('opacity')
    expect(HIDE_SCROLLBARS_CSS).not.toContain('position')
  })

  it('only targets scrollbar pseudo-elements with display and size rules', () => {
    const declarations = HIDE_SCROLLBARS_CSS.split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith(';'))

    for (const declaration of declarations) {
      const isScrollbarRule =
        declaration.startsWith('scrollbar-width:') ||
        declaration.startsWith('width:') ||
        declaration.startsWith('height:') ||
        declaration.startsWith('display:')

      expect(isScrollbarRule).toBe(true)
    }
  })
})
