import { useState } from 'react'
import type { JSX } from 'react'
import type { StartupFailure } from '../../../shared/startup'

const COPY: Record<StartupFailure, { title: string; detail: string }> = {
  offline: {
    title: "Can't reach JioHotstar",
    detail: 'Check your internet connection, then try again.'
  },
  playback: {
    title: 'Playback components unavailable',
    detail: 'The Widevine component could not be prepared. Try again, or restart the app.'
  },
  unknown: {
    title: 'The player could not be opened',
    detail: 'Something went wrong while loading JioHotstar. Try again.'
  }
}

interface PlaybackErrorProps {
  readonly reason: StartupFailure
}

export function PlaybackError({ reason }: PlaybackErrorProps): JSX.Element {
  const [retrying, setRetrying] = useState(false)
  const copy = COPY[reason]

  const handleRetry = (): void => {
    setRetrying(true)
    window.jiohotstar.retryPlayer().catch(() => {
      setRetrying(false)
    })
  }

  return (
    <main className="failure">
      <h1 className="failure-title" data-testid="failure-title">
        {copy.title}
      </h1>
      <p className="failure-detail">{copy.detail}</p>
      <button type="button" className="retry" data-testid="retry" onClick={handleRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </main>
  )
}
