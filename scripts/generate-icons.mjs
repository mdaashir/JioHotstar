import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { inflateSync, deflateSync } from 'node:zlib'

// The only official JioHotstar brand asset the site publishes is its favicon,
// a multi-size ICO whose frames are PNGs (largest is 64px). This script pulls
// the largest frame and derives every icon the app needs, so the window,
// taskbar, installer, tray, favicon, and splash all show the same mark.
const SOURCE = 'resources/jiohotstar.ico'

const OUTPUTS = [
  { path: 'build/icon.png', size: 512 },
  { path: 'resources/icon.png', size: 256 },
  { path: 'resources/tray-icon.png', size: 32 },
  { path: 'src/renderer/src/assets/app-icon.png', size: 128 }
]

function crc32(input) {
  let crc = 0xffffffff

  for (const byte of input) {
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
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)

  return Buffer.concat([length, body, crc])
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)

  if (pa <= pb && pa <= pc) {
    return a
  }

  return pb <= pc ? b : c
}

/** Decodes a non-interlaced 8-bit RGBA PNG into a flat RGBA buffer. */
function decodePng(buffer) {
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  const bitDepth = buffer[24]
  const colorType = buffer[25]

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Unsupported PNG format: depth ${bitDepth}, color type ${colorType}`)
  }

  const idatChunks = []
  let offset = 8

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)

    if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(offset + 8, offset + 8 + length))
    }

    offset += 12 + length
  }

  const raw = inflateSync(Buffer.concat(idatChunks))
  const stride = width * 4
  const pixels = Buffer.alloc(stride * height)

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const source = y * (stride + 1) + 1
    const target = y * stride
    const previous = target - stride

    for (let x = 0; x < stride; x += 1) {
      const value = raw[source + x]
      const left = x >= 4 ? pixels[target + x - 4] : 0
      const up = y > 0 ? pixels[previous + x] : 0
      const upLeft = y > 0 && x >= 4 ? pixels[previous + x - 4] : 0

      let decoded

      switch (filter) {
        case 0:
          decoded = value
          break
        case 1:
          decoded = value + left
          break
        case 2:
          decoded = value + up
          break
        case 3:
          decoded = value + ((left + up) >> 1)
          break
        case 4:
          decoded = value + paeth(left, up, upLeft)
          break
        default:
          throw new Error(`Unknown PNG filter ${filter}`)
      }

      pixels[target + x] = decoded & 0xff
    }
  }

  return { width, height, pixels }
}

function encodePng(width, height, pixels) {
  const raw = []

  for (let y = 0; y < height; y += 1) {
    raw.push(Buffer.from([0]))
    raw.push(pixels.subarray(y * width * 4, (y + 1) * width * 4))
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(raw), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/**
 * Area-average downscale / bilinear upscale. Averaging is weighted by alpha so
 * transparent edges do not darken the mark.
 */
function resample(source, targetSize) {
  const { width, height, pixels } = source
  const output = Buffer.alloc(targetSize * targetSize * 4)
  const scale = width / targetSize

  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      const left = Math.floor(x * scale)
      const top = Math.floor(y * scale)
      const right = Math.max(left + 1, Math.ceil((x + 1) * scale))
      const bottom = Math.max(top + 1, Math.ceil((y + 1) * scale))

      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let weight = 0

      for (let sy = top; sy < bottom && sy < height; sy += 1) {
        for (let sx = left; sx < right && sx < width; sx += 1) {
          const offset = (sy * width + sx) * 4
          const alpha = pixels[offset + 3]

          r += pixels[offset] * alpha
          g += pixels[offset + 1] * alpha
          b += pixels[offset + 2] * alpha
          a += alpha
          weight += 1
        }
      }

      const target = (y * targetSize + x) * 4

      if (a > 0) {
        output[target] = Math.round(r / a)
        output[target + 1] = Math.round(g / a)
        output[target + 2] = Math.round(b / a)
      }

      output[target + 3] = weight > 0 ? Math.round(a / weight) : 0
    }
  }

  return { width: targetSize, height: targetSize, pixels: output }
}

function largestIcoFrame(icoBuffer) {
  const count = icoBuffer.readUInt16LE(4)
  let best = null

  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * 16
    const width = icoBuffer[offset] === 0 ? 256 : icoBuffer[offset]
    const bytes = icoBuffer.readUInt32LE(offset + 8)
    const dataOffset = icoBuffer.readUInt32LE(offset + 12)

    if (best === null || width > best.width) {
      best = { width, data: icoBuffer.subarray(dataOffset, dataOffset + bytes) }
    }
  }

  if (best === null) {
    throw new Error('The source ICO has no frames')
  }

  return decodePng(best.data)
}

const master = largestIcoFrame(readFileSync(SOURCE))

for (const output of OUTPUTS) {
  const resized = output.size === master.width ? master : resample(master, output.size)
  const target = join(process.cwd(), output.path)

  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, encodePng(resized.width, resized.height, resized.pixels))
  console.log(`${output.path} (${output.size}x${output.size})`)
}
