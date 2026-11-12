'use strict'

/**
 * Widevine VMP signing, shared by the two electron-builder hooks.
 *
 * VMP and code signing must happen in opposite orders on the two platforms, and
 * getting it wrong produces a build that looks signed but is not:
 *
 *   macOS:  VMP  →  code sign      (VMP rewrites the binary, so a code signature
 *                                   applied first would be destroyed)
 *   Windows: signAndEditResources → VMP → NSIS
 *                                   (electron-builder writes the icon and version
 *                                   strings into the exe *after* `afterPack`, so a
 *                                   VMP signature made in `afterPack` no longer
 *                                   matches the file that ships)
 *
 * That second point was measured, not assumed: after signing in `afterPack` the
 * exe's mtime was 3 seconds newer than the .sig, and `evs-vmp verify-pkg` reported
 * `InvalidSignature`. The same binary signed outside the build verified with
 * "Signature is valid: streaming, 1343 days left".
 *
 * So macOS uses `afterPack` and Windows uses `afterSign`. Both no-op without EVS
 * credentials, so local builds and forks are unaffected.
 */

const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

/**
 * Runs python with the castlabs EVS client, trying interpreters in order.
 *
 * `uv run` supplies its own Python, so it works on a machine with no system
 * Python. CI has `python` from setup-python and macOS runners ship `python3`.
 */
function runEvs(args) {
  const candidates = [
    ['uv', ['run', '--with', 'castlabs-evs', 'python', ...args]],
    ['python', args],
    ['python3', args]
  ]

  let lastError

  for (const [command, commandArgs] of candidates) {
    try {
      execFileSync(command, commandArgs, { stdio: 'inherit', env: process.env })
      return
    } catch (error) {
      // ENOENT means the interpreter is not installed — try the next one. Any
      // other failure means it ran and failed, which is a real signing error.
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
 * Signs one packaged app directory.
 *
 * @param {import('app-builder-lib').AfterPackContext} context
 * @param {string} expectedPlatform the platform this hook is responsible for
 */
function signPackage(context, expectedPlatform) {
  const account = process.env.EVS_ACCOUNT_NAME
  const password = process.env.EVS_PASSWD

  if (!account || !password) {
    console.log('[vmp] EVS credentials not set — skipping Widevine signing')
    return
  }

  // Linux needs no VMP signature: its CDM neither supports nor requires it.
  if (context.electronPlatformName === 'linux') {
    return
  }

  if (context.electronPlatformName !== expectedPlatform) {
    // The other hook handles this platform. Signing here too would be wasted
    // upload time and, on Windows, an invalid signature.
    return
  }

  // macOS signs the .app bundle; Windows signs the directory holding the exe.
  const subject =
    expectedPlatform === 'darwin'
      ? join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
      : context.appOutDir

  console.log(`[vmp] signing ${subject}`)

  try {
    // `sign-pkg` has no `--no-ask` flag — only the `evs-account` and top-level
    // `evs-vmp` commands do. Credentials are passed explicitly as `-A`/`-P`.
    runEvs(['-m', 'castlabs_evs.vmp', 'sign-pkg', '-A', account, '-P', password, subject])
  } catch (error) {
    throw new Error(
      `[vmp] Widevine signing failed for ${subject}. Refusing to package an unsigned build.`,
      { cause: error }
    )
  }

  console.log('[vmp] Widevine VMP signing complete')
}

module.exports = { signPackage }
