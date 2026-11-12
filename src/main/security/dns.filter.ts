import { app } from 'electron'
import { dnsFilterOptions } from '../../shared/dns-filter'
import { settingsStore } from '../store/settings.store'

/**
 * Applies or clears AdGuard DNS-over-HTTPS for the whole app.
 *
 * `configureHostResolver` is process-wide and must run before windows are
 * created, so this is called once during startup from the stored preference
 * rather than toggled live. Changing the setting takes effect next launch — the
 * alternative is recreating every session mid-playback, which also breaks DRM.
 */
export function applyDnsFilter(): boolean {
  const options = dnsFilterOptions(settingsStore.getDnsFilter())

  if (options === null) {
    return false
  }

  app.configureHostResolver({
    secureDnsMode: options.secureDnsMode,
    secureDnsServers: [...options.secureDnsServers]
  })

  return true
}
