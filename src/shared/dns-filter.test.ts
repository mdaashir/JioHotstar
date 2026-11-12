import { describe, expect, it } from 'vitest'
import { ADGUARD_DOH_URL, DNS_FILTER_SCOPE, dnsFilterOptions } from './dns-filter'

describe('ADGUARD_DOH_URL', () => {
  it('uses the DoH endpoint, not the JSON convenience API', () => {
    // `/resolve` parses as a valid URL and configureHostResolver accepts it, but
    // it is not a DoH endpoint and breaks every lookup silently.
    expect(ADGUARD_DOH_URL).toBe('https://dns.adguard-dns.com/dns-query')
    expect(ADGUARD_DOH_URL).not.toContain('/resolve')
  })

  it('is https', () => {
    expect(ADGUARD_DOH_URL.startsWith('https://')).toBe(true)
  })
})

describe('dnsFilterOptions', () => {
  it('returns null when filtering is disabled, leaving DNS untouched', () => {
    expect(dnsFilterOptions(false)).toBeNull()
  })

  it('forces secure mode when enabled', () => {
    const options = dnsFilterOptions(true)

    expect(options).not.toBeNull()
    expect(options?.secureDnsMode).toBe('secure')
    expect(options?.secureDnsServers).toEqual([ADGUARD_DOH_URL])
  })
})

describe('DNS_FILTER_SCOPE', () => {
  it('states plainly that the player’s own ads are not blocked', () => {
    expect(DNS_FILTER_SCOPE.doesNotBlock.toLowerCase()).toContain('own advertising')
  })
})
