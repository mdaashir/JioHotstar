import type { JSX } from 'react'
import type { StartupFailure } from '../../shared/startup'
import { PlaybackError } from './views/PlaybackError'
import { Splash } from './views/Splash'

interface Route {
  readonly path: string
  readonly reason: StartupFailure
}

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#/, '')
  const [pathPart = '', query = ''] = raw.split('?')
  const reasonParam = new URLSearchParams(query).get('reason')

  const reason: StartupFailure =
    reasonParam === 'offline' || reasonParam === 'playback' ? reasonParam : 'unknown'

  return { path: pathPart === '' ? '/splash' : pathPart, reason }
}

export function App(): JSX.Element {
  const route = readRoute()

  if (route.path === '/error') {
    return <PlaybackError reason={route.reason} />
  }

  return <Splash />
}
