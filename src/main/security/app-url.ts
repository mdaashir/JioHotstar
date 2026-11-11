export function isAppUrl(rawUrl: string): boolean {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']

  if (devServerUrl !== undefined && rawUrl.startsWith(devServerUrl)) {
    return true
  }

  return rawUrl.startsWith('file://')
}
