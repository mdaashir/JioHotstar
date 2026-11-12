import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { SETTINGS_LABELS, type SettingsKey, type SettingsSnapshot } from '../../../shared/settings'

interface SettingRow {
  readonly key: SettingsKey
  readonly label: string
  readonly hint: string
}

const ROWS: ReadonlyArray<SettingRow> = [
  {
    key: 'alwaysOnTop',
    label: SETTINGS_LABELS.alwaysOnTop,
    hint: SETTINGS_LABELS.alwaysOnTopHint
  },
  {
    key: 'closeToTray',
    label: SETTINGS_LABELS.closeToTray,
    hint: SETTINGS_LABELS.closeToTrayHint
  },
  {
    key: 'hideScrollbars',
    label: SETTINGS_LABELS.hideScrollbars,
    hint: SETTINGS_LABELS.hideScrollbarsHint
  },
  {
    key: 'rememberWindowState',
    label: SETTINGS_LABELS.rememberWindowState,
    hint: SETTINGS_LABELS.rememberWindowStateHint
  },
  {
    key: 'dnsFilter',
    label: SETTINGS_LABELS.dnsFilter,
    hint: SETTINGS_LABELS.dnsFilterHint
  }
]

export function Settings(): JSX.Element {
  const [settings, setSettings] = useState<SettingsSnapshot | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    window.jiohotstar
      .readSettings()
      .then((snapshot) => {
        if (!cancelled) {
          setSettings(snapshot)
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

  const toggle = (key: SettingsKey): void => {
    if (settings === null) {
      return
    }

    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)

    window.jiohotstar.writeSettings({ [key]: !settings[key] }).then((saved) => {
      setSettings(saved)
    })
  }

  if (failed) {
    return (
      <main className="settings">
        <h1 className="settings-title">{SETTINGS_LABELS.title}</h1>
        <p className="settings-subtitle" data-testid="settings-error">
          Settings could not be loaded.
        </p>
      </main>
    )
  }

  return (
    <main className="settings">
      <header className="settings-header">
        <h1 className="settings-title">{SETTINGS_LABELS.title}</h1>
        <p className="settings-subtitle">{SETTINGS_LABELS.subtitle}</p>
      </header>

      <ul className="settings-list">
        {ROWS.map((row) => (
          <li key={row.key} className="settings-row">
            <label className="settings-label" htmlFor={row.key}>
              <span className="settings-name">{row.label}</span>
              <span className="settings-hint">{row.hint}</span>
            </label>
            <input
              id={row.key}
              className="settings-toggle"
              type="checkbox"
              data-testid={`toggle-${row.key}`}
              checked={settings?.[row.key] ?? false}
              disabled={settings === null}
              onChange={() => {
                toggle(row.key)
              }}
            />
          </li>
        ))}
      </ul>
    </main>
  )
}
