export interface SettingsSnapshot {
  readonly alwaysOnTop: boolean
  readonly closeToTray: boolean
  readonly hideScrollbars: boolean
  readonly rememberWindowState: boolean
  readonly dnsFilter: boolean
}

export type SettingsKey = keyof SettingsSnapshot

export const SETTINGS_KEYS: ReadonlyArray<SettingsKey> = [
  'alwaysOnTop',
  'closeToTray',
  'hideScrollbars',
  'rememberWindowState',
  'dnsFilter'
]

/**
 * Validates a renderer payload before it reaches the store. Only known keys with
 * boolean values survive; anything else is dropped rather than written.
 */
export function sanitizeSettingsPatch(value: unknown): Partial<SettingsSnapshot> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }

  const candidate = value as Record<string, unknown>
  const patch: Partial<Record<SettingsKey, boolean>> = {}

  for (const key of SETTINGS_KEYS) {
    const entry = candidate[key]

    if (typeof entry === 'boolean') {
      patch[key] = entry
    }
  }

  return patch
}

export interface SettingsLabels {
  readonly title: string
  readonly subtitle: string
  readonly alwaysOnTop: string
  readonly alwaysOnTopHint: string
  readonly closeToTray: string
  readonly closeToTrayHint: string
  readonly hideScrollbars: string
  readonly hideScrollbarsHint: string
  readonly rememberWindowState: string
  readonly rememberWindowStateHint: string
  readonly dnsFilter: string
  readonly dnsFilterHint: string
}

export const SETTINGS_LABELS: SettingsLabels = {
  title: 'Settings',
  subtitle: 'Changes apply immediately and are saved.',
  alwaysOnTop: 'Keep window on top',
  alwaysOnTopHint: 'Keeps the player above other windows. Also toggled with Ctrl+Shift+T.',
  closeToTray: 'Close to tray',
  closeToTrayHint:
    'Closing the window keeps playback running in the tray. Exit from the tray menu.',
  hideScrollbars: 'Hide scrollbars',
  hideScrollbarsHint: 'Scrolling still works; the bar is just hidden.',
  rememberWindowState: 'Remember window size and position',
  rememberWindowStateHint: 'Reopens where you left it. Re-centres if the display is gone.',
  dnsFilter: 'Block third-party trackers (AdGuard DNS)',
  dnsFilterHint:
    'Routes app DNS through AdGuard. Blocks third-party ad and tracker domains, not JioHotstar’s own advertising. Takes effect after restarting the app.'
}
