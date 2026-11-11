import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { deflateSync } from 'node:zlib'

const OUTPUT = join(process.cwd(), 'resources', 'tray-icon.png')

function crc32(buffer) {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc ^= byte

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)

  return Buffer.concat([length, typeAndData, crc])
}

function roundedSquareDistance(x, y, size, radius) {
  const half = (size - 1) / 2
  const px = Math.abs(x - half) - (half - radius)
  const py = Math.abs(y - half) - (half - radius)
  const outside = Math.hypot(Math.max(px, 0), Math.max(py, 0))

  return outside + Math.min(Math.max(px, py), 0) - radius
}

function insidePlayTriangle(x, y, size) {
  const centerY = (size - 1) / 2
  const left = size * 0.38
  const right = size * 0.68
  const halfHeight = size * 0.22

  if (x < left || x > right) {
    return false
  }

  const progress = (x - left) / (right - left)

  return Math.abs(y - centerY) <= halfHeight * (1 - progress)
}

function render(size) {
  const rows = []
  const radius = size * 0.22
  const scale = size / 32

  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4)

    for (let x = 0; x < size; x += 1) {
      const distance = roundedSquareDistance(x, y, size, radius)
      const shapeAlpha = distance <= -1 ? 1 : distance >= 0 ? 0 : 1 + distance
      const glyph = insidePlayTriangle(x / scale, y / scale, 32)

      const offset = 1 + x * 4

      if (glyph) {
        row[offset] = 0xff
        row[offset + 1] = 0xff
        row[offset + 2] = 0xff
        row[offset + 3] = Math.round(255 * shapeAlpha)
      } else {
        row[offset] = 0x2f
        row[offset + 1] = 0x6b
        row[offset + 2] = 0xff
        row[offset + 3] = Math.round(255 * shapeAlpha)
      }
    }

    rows.push(row)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const png = render(32)

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, png)
console.log(`wrote ${OUTPUT} (${png.length} bytes)`)
