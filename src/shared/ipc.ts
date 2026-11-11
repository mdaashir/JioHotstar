export const IPC_CHANNELS = {
  APP_INFO: 'app:info',
  PLAYER_RETRY: 'player:retry'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

export interface AppInfo {
  readonly name: string
  readonly version: string
  readonly platform: string
  readonly arch: string
  readonly packaged: boolean
}
