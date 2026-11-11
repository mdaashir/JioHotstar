import { describe, expect, it } from 'vitest'
import { PINNED_TITLE_SUFFIX, composeWindowTitle } from './window-title'

describe('composeWindowTitle', () => {
  it('returns the page title unchanged when not pinned', () => {
    expect(composeWindowTitle('JioHotstar - Watch TV Shows', false)).toBe(
      'JioHotstar - Watch TV Shows'
    )
  })

  it('appends the pinned suffix when on top', () => {
    expect(composeWindowTitle('JioHotstar', true)).toBe(`JioHotstar${PINNED_TITLE_SUFFIX}`)
  })
})
