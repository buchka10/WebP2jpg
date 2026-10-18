import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function encodePNG(width, height, drawPixel) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = writeChunk('IHDR', ihdr);

  // Raw image data with 1 filter byte (0) per row
  const rowBytes = 1 + width * 4;
  const raw = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    raw[rowOffset] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixel(x, y, width, height);
      raw[pixelOffset] = r;
      raw[pixelOffset + 1] = g;
      raw[pixelOffset + 2] = b;
      raw[pixelOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = writeChunk('IDAT', idatData);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function renderAppIcon(isMaskable) {
  return (x, y, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const dx = x - cx;
    const dy = y - cy;
    const distSq = dx * dx + dy * dy;

    // Corner radius if not maskable (squircle)
    if (!isMaskable) {
      const radius = w * 0.22;
      const qx = Math.max(0, Math.abs(dx) - (w / 2 - radius));
      const qy = Math.max(0, Math.abs(dy) - (h / 2 - radius));
      if (qx * qx + qy * qy > radius * radius) {
        return [0, 0, 0, 0]; // transparent outside squircle
      }
    }

    // Background gradient: from #18181b to #09090b
    const t = (x + y) / (w + h);
    let r = Math.round(24 * (1 - t) + 9 * t);
    let g = Math.round(24 * (1 - t) + 9 * t);
    let b = Math.round(27 * (1 - t) + 11 * t);

    // Inner icon graphics (scale inside safe-zone for maskable)
    const scale = isMaskable ? 0.72 : 0.85;
    const nx = (x - cx) / (w * scale * 0.5); // -1 to 1
    const ny = (y - cy) / (h * scale * 0.5); // -1 to 1

    // Center circular badge
    const badgeDist = Math.sqrt(nx * nx + ny * ny);
    if (badgeDist < 0.65) {
      // Amber glow circle in center
      const at = Math.max(0, Math.min(1, (0.65 - badgeDist) / 0.65));
      r = Math.round(r * (1 - at) + 245 * at);
      g = Math.round(g * (1 - at) + 158 * at);
      b = Math.round(b * (1 - at) + 11 * at);

      // Inner dark ring
      if (badgeDist < 0.58 && badgeDist > 0.48) {
        r = 18; g = 18; b = 24;
      }
    }

    // Top card accent (amber)
    if (ny > -0.35 && ny < 0.35 && nx > -0.55 && nx < 0.55) {
      // Horizontal transition arrow
      if (Math.abs(ny) < 0.1 && nx > -0.3 && nx < 0.3) {
        return [255, 255, 255, 255];
      }
    }

    return [r, g, b, 255];
  };
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. pwa-192x192.png
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), encodePNG(192, 192, renderAppIcon(false)));
console.log('Created pwa-192x192.png');

// 2. pwa-512x512.png
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), encodePNG(512, 512, renderAppIcon(false)));
console.log('Created pwa-512x512.png');

// 3. pwa-maskable-512x512.png
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), encodePNG(512, 512, renderAppIcon(true)));
console.log('Created pwa-maskable-512x512.png');

// 4. apple-touch-icon.png (180x180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), encodePNG(180, 180, renderAppIcon(false)));
console.log('Created apple-touch-icon.png');
