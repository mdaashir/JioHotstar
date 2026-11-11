export type MediaKeyAction = 'play-pause' | 'stop'

export const MEDIA_KEY_ACCELERATORS: ReadonlyArray<{
  readonly accelerator: string
  readonly action: MediaKeyAction
}> = [
  { accelerator: 'MediaPlayPause', action: 'play-pause' },
  { accelerator: 'MediaStop', action: 'stop' }
]

const VIDEO_PICKER = `
  const candidates = Array.from(document.querySelectorAll('video')).filter(
    (video) => video.readyState > 0
  )
  const area = (video) => video.videoWidth * video.videoHeight
  candidates.sort((first, second) => area(second) - area(first))
  const target = candidates.find((video) => !video.paused) ?? candidates[0]
`

/**
 * Runs inside the player page. Drives the element itself rather than the site's
 * own controls, because there is no public way to invoke a registered
 * `mediaSession` action handler. Injected with `userGesture: true`, since
 * `play()` can otherwise be refused by the autoplay policy.
 */
export const PLAY_PAUSE_SCRIPT = `(async () => {
  ${VIDEO_PICKER}

  if (!target) {
    return { status: 'no-video' }
  }

  try {
    if (target.paused) {
      await target.play()
      return { status: 'playing' }
    }

    target.pause()
    return { status: 'paused' }
  } catch (error) {
    return { status: 'failed', message: String(error && error.message ? error.message : error) }
  }
})()`

export const STOP_SCRIPT = `(() => {
  ${VIDEO_PICKER}

  if (!target) {
    return { status: 'no-video' }
  }

  target.pause()
  return { status: 'paused' }
})()`

export type MediaKeyStatus = 'playing' | 'paused' | 'no-video' | 'failed'

const VALID_STATUSES: ReadonlySet<string> = new Set<MediaKeyStatus>([
  'playing',
  'paused',
  'no-video',
  'failed'
])

export function isMediaKeyResult(value: unknown): value is { status: MediaKeyStatus } {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const status = (value as Record<string, unknown>)['status']

  return typeof status === 'string' && VALID_STATUSES.has(status)
}

export function scriptFor(action: MediaKeyAction): string {
  return action === 'play-pause' ? PLAY_PAUSE_SCRIPT : STOP_SCRIPT
}
