import type { JioHotstarApi } from './index'

declare global {
  interface Window {
    readonly jiohotstar: JioHotstarApi
  }
}

export {}
