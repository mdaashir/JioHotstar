import { describe, expect, it } from 'vitest'
import { trayLabels } from './tray'

describe('trayLabels', () => {
  it('describes the action required to reach the pinned state', () => {
    expect(trayLabels(false, false).alwaysOnTop).toBe('Keep on top')
    expect(trayLabels(true, false).alwaysOnTop).toBe('Unpin from top')
  })

  it('uses platform-idiomatic quit wording', () => {
    expect(trayLabels(false, false).quit).toBe('Exit')
    expect(trayLabels(false, true).quit).toBe('Quit JioHotstar')
  })

  it('adapts the open label per platform', () => {
    expect(trayLabels(false, false).show).toBe('Open JioHotstar')
    expect(trayLabels(false, true).show).toBe('Show JioHotstar')
  })
})
