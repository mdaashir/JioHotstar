import { describe, expect, it } from 'vitest'
import { isBundledRendererUrl } from './app-url'

const INDEX = 'file:///opt/app/out/renderer/index.html'

describe('isBundledRendererUrl', () => {
  it('accepts the bundled renderer with no route', () => {
    expect(isBundledRendererUrl(INDEX, INDEX, false)).toBe(true)
  })

  it('accepts every hash route', () => {
    for (const hash of ['#/settings', '#/', '#/offline']) {
      expect(isBundledRendererUrl(`${INDEX}${hash}`, INDEX, false)).toBe(true)
    }
  })

  it('ignores a query string', () => {
    expect(isBundledRendererUrl(`${INDEX}?e2e=branding-probe`, INDEX, false)).toBe(true)
  })

  // The regression this guards: a `file://` prefix check trusts every local file
  // on the machine, so any page the app could be pointed at would look local.
  it('rejects a different local file', () => {
    expect(isBundledRendererUrl('file:///tmp/evil.html', INDEX, false)).toBe(false)
    expect(isBundledRendererUrl('file:///opt/app/out/renderer/other.html', INDEX, false)).toBe(
      false
    )
  })

  // A suffix check would pass this, because the path ends with the right name.
  it('rejects a copy of index.html planted elsewhere', () => {
    expect(
      isBundledRendererUrl('file:///home/user/Downloads/out/renderer/index.html', INDEX, false)
    ).toBe(false)
  })

  it('rejects remote URLs', () => {
    expect(isBundledRendererUrl('https://www.hotstar.com/in/home', INDEX, false)).toBe(false)
    expect(isBundledRendererUrl('http://localhost:5173/', INDEX, false)).toBe(false)
  })

  it('rejects malformed input', () => {
    expect(isBundledRendererUrl('not a url', INDEX, false)).toBe(false)
    expect(isBundledRendererUrl(INDEX, 'not a url', false)).toBe(false)
    expect(isBundledRendererUrl('', '', false)).toBe(false)
  })

  it('rejects a percent-encoded path that merely looks similar', () => {
    expect(
      isBundledRendererUrl('file:///opt/app/out/renderer/index%2Ehtml.bak', INDEX, false)
    ).toBe(false)
  })

  it('matches case-sensitively where the filesystem does', () => {
    const upper = 'file:///opt/app/out/renderer/INDEX.HTML'
    expect(isBundledRendererUrl(upper, INDEX, false)).toBe(false)
    expect(isBundledRendererUrl(upper, INDEX, true)).toBe(true)
  })

  it('handles Windows drive paths', () => {
    const win = 'file:///C:/app/out/renderer/index.html'
    expect(isBundledRendererUrl(`${win}#/settings`, win, true)).toBe(true)
    expect(isBundledRendererUrl('file:///C:/app/out/renderer/index.html.bak', win, true)).toBe(
      false
    )
  })
})
