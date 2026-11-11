import { describe, expect, it } from 'vitest'
import { ALLOWED_NAVIGATION_HOSTS } from './constants'
import { decideNavigation, isHostAllowed } from './navigation'

describe('isHostAllowed', () => {
  it('matches an exact host', () => {
    expect(isHostAllowed('jiohotstar.com', ALLOWED_NAVIGATION_HOSTS)).toBe(true)
  })

  it('matches subdomains of an allowed host', () => {
    expect(isHostAllowed('www.jiohotstar.com', ALLOWED_NAVIGATION_HOSTS)).toBe(true)
    expect(isHostAllowed('api.hotstar.com', ALLOWED_NAVIGATION_HOSTS)).toBe(true)
  })

  it('rejects hosts that merely contain an allowed host', () => {
    expect(isHostAllowed('evil-jiohotstar.com', ALLOWED_NAVIGATION_HOSTS)).toBe(false)
    expect(isHostAllowed('jiohotstar.com.evil.com', ALLOWED_NAVIGATION_HOSTS)).toBe(false)
  })
})

describe('decideNavigation', () => {
  it('allows https navigation to permitted hosts', () => {
    expect(decideNavigation('https://www.jiohotstar.com/watch', ALLOWED_NAVIGATION_HOSTS)).toBe(
      'allow'
    )
  })

  it('sends unlisted hosts to the system browser', () => {
    expect(decideNavigation('https://accounts.google.com/signin', ALLOWED_NAVIGATION_HOSTS)).toBe(
      'external'
    )
  })

  it('blocks permissioned hosts when downgraded to http', () => {
    expect(decideNavigation('http://www.jiohotstar.com/watch', ALLOWED_NAVIGATION_HOSTS)).toBe(
      'block'
    )
  })

  it('blocks non-http protocols', () => {
    expect(decideNavigation('javascript:alert(1)', ALLOWED_NAVIGATION_HOSTS)).toBe('block')
    expect(decideNavigation('data:text/html,<h1>x</h1>', ALLOWED_NAVIGATION_HOSTS)).toBe('block')
    expect(decideNavigation('file:///C:/Windows/System32/calc.exe', ALLOWED_NAVIGATION_HOSTS)).toBe(
      'block'
    )
  })

  it('blocks values that are not absolute URLs', () => {
    expect(decideNavigation('not-a-url', ALLOWED_NAVIGATION_HOSTS)).toBe('block')
    expect(decideNavigation('', ALLOWED_NAVIGATION_HOSTS)).toBe('block')
  })
})
