import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Matches one exact local document, ignoring its hash route and query string.
 *
 * Every local window in this app loads the same `out/renderer/index.html` with a
 * different hash (`#/settings`, …), so the hash is part of the URL but never part
 * of the identity. Comparing the pathname means a hash route cannot be confused
 * with a different file.
 *
 * This is deliberately an exact comparison rather than a `file://` prefix or a
 * path suffix. A prefix check trusts every local file on the machine, and a
 * suffix check (`…/out/renderer/index.html`) still trusts a copy planted anywhere
 * else on disk. Only the file the app actually bundles should count as trusted.
 */
export function isBundledRendererUrl(
  rawUrl: string,
  indexFileUrl: string,
  caseInsensitive: boolean = process.platform === 'win32'
): boolean {
  let candidate: URL
  let expected: URL

  try {
    candidate = new URL(rawUrl)
    expected = new URL(indexFileUrl)
  } catch {
    return false
  }

  if (candidate.protocol !== 'file:' || expected.protocol !== 'file:') {
    return false
  }

  candidate.hash = ''
  candidate.search = ''
  expected.hash = ''
  expected.search = ''

  let candidatePath: string
  let expectedPath: string

  try {
    candidatePath = decodeURIComponent(candidate.pathname)
    expectedPath = decodeURIComponent(expected.pathname)
  } catch {
    return false
  }

  // Windows paths are case-insensitive by default; macOS and Linux are not, so
  // the comparison follows the platform rather than accepting either casing
  // everywhere.
  if (caseInsensitive) {
    return candidatePath.toLowerCase() === expectedPath.toLowerCase()
  }

  return candidatePath === expectedPath
}

let rendererIndexUrl: string | null = null

function rendererIndexFileUrl(): string {
  if (rendererIndexUrl === null) {
    rendererIndexUrl = pathToFileURL(join(__dirname, '../renderer/index.html')).href
  }

  return rendererIndexUrl
}

/**
 * Whether a URL is one of this app's own windows.
 *
 * Two cases: the Vite dev server during development, or the bundled renderer in a
 * packaged build. Third-party content — the player page — is never an app URL, so
 * it cannot reach the IPC bridge.
 */
export function isAppUrl(rawUrl: string): boolean {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']

  if (devServerUrl !== undefined && devServerUrl !== '' && rawUrl.startsWith(devServerUrl)) {
    return true
  }

  // Checked before resolving the bundled path, so a remote URL never reaches it.
  if (!rawUrl.startsWith('file:')) {
    return false
  }

  return isBundledRendererUrl(rawUrl, rendererIndexFileUrl())
}
