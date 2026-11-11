export type StartupFailure = 'offline' | 'playback' | 'unknown'

const OFFLINE_ERROR_CODES: ReadonlySet<number> = new Set<number>([
  -7, -20, -21, -100, -101, -102, -105, -106, -109, -118, -130, -137
])

export function classifyLoadFailure(errorCode: number): StartupFailure {
  return OFFLINE_ERROR_CODES.has(errorCode) ? 'offline' : 'unknown'
}
