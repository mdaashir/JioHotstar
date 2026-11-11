export interface TrayLabels {
  readonly show: string
  readonly fullscreen: string
  readonly alwaysOnTop: string
  readonly quit: string
}

export function trayLabels(alwaysOnTop: boolean, isMac: boolean): TrayLabels {
  return {
    show: isMac ? 'Show JioHotstar' : 'Open JioHotstar',
    fullscreen: 'Toggle fullscreen',
    alwaysOnTop: alwaysOnTop ? 'Unpin from top' : 'Keep on top',
    quit: isMac ? 'Quit JioHotstar' : 'Exit'
  }
}
