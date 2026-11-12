export type UpdateStatus =
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'unsupported'

export interface UpdateState {
  readonly status: UpdateStatus
  readonly version?: string
  readonly percent?: number
  readonly message?: string
}

export const UPDATE_CHANNELS = {
  STATUS: 'update:status',
  CHECK: 'update:check',
  INSTALL: 'update:install'
} as const

/**
 * Only a packaged build can update itself: in development the app runs from
 * source, where there is no installed version to replace and no
 * `app-update.yml`. Checking anyway produces a confusing stream of errors.
 */
export function canCheckForUpdates(isPackaged: boolean): boolean {
  return isPackaged
}

export function describeState(state: UpdateState): string {
  switch (state.status) {
    case 'checking':
      return 'Checking for updates…'
    case 'available':
      return `Version ${state.version ?? 'unknown'} is available`
    case 'not-available':
      return 'You are on the latest version'
    case 'downloading':
      return `Downloading update… ${Math.round(state.percent ?? 0)}%`
    case 'downloaded':
      return `Version ${state.version ?? 'unknown'} is ready to install`
    case 'unsupported':
      return 'This build cannot update itself'
    case 'error':
      return state.message ?? 'The update check failed'
  }
}

export function isRestartAction(state: UpdateState): boolean {
  return state.status === 'downloaded'
}
