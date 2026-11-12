export interface TrayLabels {
  readonly show: string
  readonly pictureInPicture: string
  readonly fullscreen: string
  readonly alwaysOnTop: string
  readonly hideScrollbars: string
  readonly settings: string
  readonly installUpdate: string
  readonly quit: string
}

export function trayLabels(alwaysOnTop: boolean, isMac: boolean): TrayLabels {
  return {
    show: isMac ? 'Show JioHotstar' : 'Open JioHotstar',
    pictureInPicture: 'Picture-in-picture',
    fullscreen: 'Toggle fullscreen',
    alwaysOnTop: alwaysOnTop ? 'Unpin from top' : 'Keep on top',
    hideScrollbars: 'Hide scrollbars',
    settings: isMac ? 'Settings…' : 'Settings...',
    installUpdate: isMac ? 'Restart and update…' : 'Restart and update...',
    quit: isMac ? 'Quit JioHotstar' : 'Exit'
  }
}
