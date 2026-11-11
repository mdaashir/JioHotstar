import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { AppInfo } from '../../../shared/ipc'

export function Splash(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    window.jiohotstar
      .getAppInfo()
      .then((appInfo) => {
        if (!cancelled) {
          setInfo(appInfo)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const status = failed
    ? 'Bridge unavailable'
    : info === null
      ? 'Preparing playback…'
      : `v${info.version} · ${info.platform}-${info.arch}`

  return (
    <main className="splash">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <h1 data-testid="app-name">JioHotstar</h1>
      </div>
      <p className="tagline">Desktop shell</p>
      <p className="status" data-testid="status">
        {status}
      </p>
    </main>
  )
}
