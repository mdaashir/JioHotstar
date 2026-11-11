import { app, nativeImage } from 'electron'
import { join } from 'node:path'
import type { NativeImage } from 'electron'

const APP_ICON = 'icon.png'

export function appIconPath(fileName = APP_ICON): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, fileName)
  }

  return join(app.getAppPath(), 'resources', fileName)
}

export function appIcon(fileName = APP_ICON): NativeImage {
  return nativeImage.createFromPath(appIconPath(fileName))
}
