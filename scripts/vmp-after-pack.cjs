'use strict'

/**
 * Widevine VMP signing hook for electron-builder.
 *
 * Runs via `afterPack`, which fires **before** code signing. That ordering is not
 * a detail — it is the whole reason this is a hook rather than a release step:
 *
 * - macOS must be VMP-signed *before* the code signature is applied, because VMP
 *   rewrites the binary and would invalidate a signature already in place.
 * - Windows must be VMP-signed *after* Authenticode, but still *before* NSIS
 *   packages the app, or the installer embeds the unsigned directory.
 *
 * Signing the unpacked output after packaging is therefore wrong on both
 * platforms: it either breaks the signature or leaves the shipped archive stale.
 *
 * With no EVS credentials this is a no-op, so forks and local builds are
 * unaffected. With credentials present, a failure throws: shipping a build that
 * silently lost its Widevine signature is worse than failing the release.
 */

const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

/**
 * @param {import('app-builder-lib').AfterPackContext} context
 */
exports.default = async function vmpAfterPack(context) {
  const account = process.env.EVS_ACCOUNT_NAME
  const password = process.env.EVS_PASSWD

  if (!account || !password) {
    console.log('[vmp] EVS credentials not set — skipping Widevine signing')
    return
  }

  // Linux needs no VMP signature: its CDM neither supports nor requires it.
  if (context.electronPlatformName === 'linux') {
    console.log('[vmp] linux does not use VMP signing — skipping')
    return
  }

  // `appOutDir` is already the unpacked output directory for this arch, so no
  // extra path computation is needed. macOS signs the .app bundle; Windows signs
  // the directory that contains the executable.
  const subject =
    context.electronPlatformName === 'darwin'
      ? join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
      : context.appOutDir

  console.log(`[vmp] signing ${subject}`)

  try {
    execFileSync('python', ['-m', 'castlabs_evs.vmp', 'sign-pkg', '--no-ask', subject], {
      stdio: 'inherit',
      env: process.env
    })
  } catch (error) {
    throw new Error(
      `[vmp] Widevine signing failed for ${subject}. ` + 'Refusing to package an unsigned build.',
      { cause: error }
    )
  }

  console.log('[vmp] Widevine VMP signing complete')
}
