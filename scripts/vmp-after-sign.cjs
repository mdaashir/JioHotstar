'use strict'

/**
 * VMP-signs Windows builds.
 *
 * `afterSign` is required here, not `afterPack`. electron-builder's
 * `signAndEditResources` writes the icon and version strings into the exe *after*
 * `afterPack` fires, so a signature made there no longer matches the shipped file.
 * Measured: the exe ended up 3 seconds newer than the .sig and `evs-vmp verify-pkg`
 * reported `InvalidSignature`, while the same binary signed outside the build
 * verified with 1343 days remaining.
 *
 * `afterSign` runs once code signing and resource editing are both finished, which
 * is also the order castlabs specify for Windows (code sign, then VMP).
 *
 * Note that electron-builder only emits `afterSign` when a signing step actually
 * ran, so this hook is skipped on a build with no certificate configured. That is
 * why the release workflow also verifies the signature afterwards.
 */

const { signPackage } = require('./vmp.cjs')

/**
 * @param {import('app-builder-lib').AfterPackContext} context
 */
exports.default = async function vmpAfterSign(context) {
  signPackage(context, 'win32')
}
