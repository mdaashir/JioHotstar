import type { IpcMainInvokeEvent } from 'electron'
import { isAppUrl } from './app-url'

export function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const senderUrl = event.senderFrame?.url ?? ''

  if (!isAppUrl(senderUrl)) {
    throw new Error(`Blocked IPC from untrusted sender: ${senderUrl}`)
  }
}
