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
 * Finds a usable Python interpreter.
 *
 * `uv run` works everywhere uv is installed and supplies its own Python, so it is
 * the first choice. CI has no uv but does have `python` on PATH from setup-python,
 * and macOS runners ship `python3`. Trying each in turn means the same hook works
 * in the release workflow and on a developer machine.
 */
function pythonInvocation(args) {
  const candidates = [
    ['uv', ['run', '--with', 'castlabs-evs', 'python', ...args]],
    ['python', args],
    ['python3', args]
  ]

  let lastError
  for (const [command, commandArgs] of candidates) {
    try {
      execFileSync(command, commandArgs, { stdio: 'inherit', env: process.env })
      return true
    } catch (error) {
      // ENOENT means the interpreter is not installed; anything else means it ran
      // and failed, which is a real signing failure and should not be retried.
      if (error && error.code === 'ENOENT') {
        lastError = error
        continue
      }
      throw error
    }
  }

  throw new Error(
    'No Python interpreter found. Install uv (https://docs.astral.sh/uv/) or Python 3.12.',
    { cause: lastError }
  )
}

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

  // `sign-pkg` has no `--no-ask` flag — only `evs-account` does. Passing one fails
  // with "unrecognized arguments", and because that happens per release it would
  // have broken every build the moment credentials were added. Verified against
  // `evs-vmp sign-pkg --help` (0.13.x).
  //
  // Credentials are accepted as `-A`/`-P` as well as the environment, so they are
  // passed explicitly rather than relying on the CLI reading the environment.
  try {
    pythonInvocation(['-m', 'castlabs_evs.vmp', 'sign-pkg', '-A', account, '-P', password, subject])
  } catch (error) {
    throw new Error(
      `[vmp] Widevine signing failed for ${subject}. Refusing to package an unsigned build.`,
      { cause: error }
    )
  }

  console.log('[vmp] Widevine VMP signing complete')
}
