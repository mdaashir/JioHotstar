export type NavigationDecision = 'allow' | 'external' | 'block'

export function isHostAllowed(hostname: string, allowedHosts: readonly string[]): boolean {
  const host = hostname.toLowerCase()

  return allowedHosts.some((allowedHost) => {
    const base = allowedHost.toLowerCase()
    return host === base || host.endsWith(`.${base}`)
  })
}

export function decideNavigation(
  rawUrl: string,
  allowedHosts: readonly string[]
): NavigationDecision {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    return 'block'
  }

  if (url.protocol === 'http:') {
    return isHostAllowed(url.hostname, allowedHosts) ? 'block' : 'external'
  }

  if (url.protocol !== 'https:') {
    return 'block'
  }

  return isHostAllowed(url.hostname, allowedHosts) ? 'allow' : 'external'
}
