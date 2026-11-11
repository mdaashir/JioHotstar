export type PipStatus = 'entered' | 'exited' | 'no-video' | 'unsupported' | 'failed'

export interface PipResult {
  readonly status: PipStatus
  readonly message?: string
}

/**
 * Runs inside the player page. Toggles Chromium's native picture-in-picture for
 * the most prominent video. Injected with `userGesture: true`, because
 * `requestPictureInPicture` requires user activation.
 */
export const PIP_TOGGLE_SCRIPT = `(async () => {
  const videoArea = (video) => {
    const rect = video.getBoundingClientRect()
    const fromRect = Math.round(rect.width * rect.height)
    const fromSource = video.videoWidth * video.videoHeight

    return Math.max(fromRect, fromSource)
  }

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
      return { status: 'exited' }
    }

    if (!document.pictureInPictureEnabled || typeof document.exitPictureInPicture !== 'function') {
      return { status: 'unsupported' }
    }

    const candidates = Array.from(document.querySelectorAll('video')).filter(
      (video) => video.disablePictureInPicture !== true && video.readyState > 0
    )

    if (candidates.length === 0) {
      return { status: 'no-video' }
    }

    candidates.sort((first, second) => videoArea(second) - videoArea(first))

    const target = candidates.find((video) => !video.paused) ?? candidates[0]

    await target.requestPictureInPicture()

    return { status: 'entered' }
  } catch (error) {
    return { status: 'failed', message: String(error && error.message ? error.message : error) }
  }
})()`

const VALID_STATUSES: ReadonlySet<string> = new Set<PipStatus>([
  'entered',
  'exited',
  'no-video',
  'unsupported',
  'failed'
])

export function isPipResult(value: unknown): value is PipResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  const status = candidate['status']

  return typeof status === 'string' && VALID_STATUSES.has(status)
}
