import type { Session } from 'electron'

export const ALLOWED_PERMISSIONS: ReadonlySet<string> = new Set<string>([
  'fullscreen',
  'mediaKeySystem'
])

export function installPermissionPolicy(target: Session): void {
  target.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission))
  })

  target.setPermissionCheckHandler((_contents, permission) => ALLOWED_PERMISSIONS.has(permission))
}
