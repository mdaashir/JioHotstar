import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Extracts the CHANGELOG.md section for a release tag.
 *
 * Used by the release workflow so the GitHub Release body and the committed
 * changelog cannot disagree. Fails loudly when the entry is missing, because a
 * release with no notes is worse than a failed release.
 */
const tag = process.argv[2]

if (tag === undefined) {
  console.error('Usage: node scripts/changelog-section.mjs <tag>')
  process.exit(1)
}

const version = tag.replace(/^v/, '')
const lines = readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/)

const start = lines.findIndex((line) => line.startsWith(`## [${version}]`))

if (start === -1) {
  console.error(`No CHANGELOG.md entry found for ${version}`)
  process.exit(1)
}

const rest = lines.slice(start + 1)
const end = rest.findIndex((line) => line.startsWith('## ['))
const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim()

if (body === '') {
  console.error(`The CHANGELOG.md entry for ${version} is empty`)
  process.exit(1)
}

writeFileSync('changelog-section.md', `${body}\n`)
console.log(`Extracted ${body.split('\n').length} lines for ${version}`)
