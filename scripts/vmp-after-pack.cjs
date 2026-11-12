'use strict'

/**
 * VMP-signs macOS builds.
 *
 * `afterPack` is required here, not `afterSign`: macOS must be VMP-signed
 * *before* the code signature is applied, because VMP rewrites the binary and
 * would destroy a signature already in place.
 *
 * Windows uses `vmp-after-sign.cjs` instead — see `vmp.cjs` for why the two
 * platforms need opposite orders.
 */

const { signPackage } = require('./vmp.cjs')

/**
 * @param {import('app-builder-lib').AfterPackContext} context
 */
exports.default = async function vmpAfterPack(context) {
  signPackage(context, 'darwin')
}
