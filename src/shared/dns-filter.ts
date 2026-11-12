/**
 * AdGuard's DNS-over-HTTPS endpoint.
 *
 * The `/dns-query` path is required. AdGuard also serves a convenience JSON API
 * at `/resolve`, which is *not* a DoH endpoint — pointing Chromium at it makes
 * `configureHostResolver` succeed and then fail every lookup with
 * ERR_NAME_NOT_RESOLVED, including the site itself.
 */
export const ADGUARD_DOH_URL = 'https://dns.adguard-dns.com/dns-query'

export interface HostResolverOptions {
  readonly secureDnsMode: 'secure'
  readonly secureDnsServers: readonly string[]
}

/**
 * Returns the host resolver configuration for the given preference, or null when
 * filtering is off so the caller leaves the system resolver alone.
 */
export function dnsFilterOptions(enabled: boolean): HostResolverOptions | null {
  if (!enabled) {
    return null
  }

  return {
    secureDnsMode: 'secure',
    secureDnsServers: [ADGUARD_DOH_URL]
  }
}

/**
 * What this feature does and does not do. Kept in code because the expectation
 * mismatch is the whole risk: it removes third-party trackers, not the player's
 * own advertising.
 */
export const DNS_FILTER_SCOPE = {
  blocks: 'Third-party ad and tracker domains resolved by public blocklists',
  doesNotBlock:
    'JioHotstar’s own advertising, which is served from their domains and stitched into the DRM stream'
} as const
