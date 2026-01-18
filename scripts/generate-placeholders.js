/**
 * Placeholder Image Generator
 * Run: node scripts/generate-placeholders.js
 *
 * This creates simple colored placeholder images for development.
 * For production, replace with proper branded assets.
 */

const fs = require('fs');
const path = require('path');

// Simple PNG generator (creates a solid color PNG without external dependencies)
function createPNG(width, height, r, g, b) {
  // PNG file structure
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(2, 9);  // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk (image data)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte for each row
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b);
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation for PNG
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = makeCrcTable();

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xEDB88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

// Primary color: #6200EE (purple)
const PRIMARY_R = 98;
const PRIMARY_G = 0;
const PRIMARY_B = 238;

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('Generating placeholder images...\n');

// Generate icon.png (1024x1024)
const icon = createPNG(1024, 1024, PRIMARY_R, PRIMARY_G, PRIMARY_B);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), icon);
console.log('Created: assets/icon.png (1024x1024)');

// Generate adaptive-icon.png (1024x1024)
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), icon);
console.log('Created: assets/adaptive-icon.png (1024x1024)');

// Generate splash.png (1284x2778 - iPhone 14 Pro Max size)
const splash = createPNG(1284, 2778, PRIMARY_R, PRIMARY_G, PRIMARY_B);
fs.writeFileSync(path.join(assetsDir, 'splash.png'), splash);
console.log('Created: assets/splash.png (1284x2778)');

// Generate favicon.png (48x48)
const favicon = createPNG(48, 48, PRIMARY_R, PRIMARY_G, PRIMARY_B);
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), favicon);
console.log('Created: assets/favicon.png (48x48)');

console.log('\nAll placeholder images generated successfully!');
console.log('These are solid purple (#6200EE) images for development.');
console.log('Replace with branded assets for production.');
