const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// SVG Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F8FAFC"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  
  <!-- Background rounded rect -->
  <rect width="256" height="256" rx="56" fill="url(#bgGrad)"/>
  
  <!-- Outer glowing border -->
  <rect x="4" y="4" width="248" height="248" rx="52" fill="none" stroke="#60A5FA" stroke-width="4" stroke-opacity="0.6"/>

  <!-- Tilted Card Behind -->
  <rect x="52" y="44" width="152" height="168" rx="18" fill="#93C5FD" opacity="0.5" transform="rotate(-7 128 128)"/>

  <!-- Main Flashcard -->
  <rect x="48" y="48" width="160" height="160" rx="18" fill="url(#cardGrad)" filter="url(#shadow)"/>
  
  <!-- Card Header Stripe -->
  <rect x="48" y="48" width="160" height="36" rx="18" fill="#2563EB"/>
  <rect x="48" y="66" width="160" height="18" fill="#2563EB"/>
  
  <!-- Mini Flashcard Icon inside header -->
  <circle cx="68" cy="66" r="6" fill="#FDE047"/>
  <circle cx="86" cy="66" r="6" fill="#6EE7B7"/>
  
  <!-- Sound wave symbol -->
  <path d="M178 62 C184 64, 184 70, 178 72" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M184 58 C192 62, 192 74, 184 78" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Center Text / Icon 'A' -->
  <text x="128" y="148" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="58" font-weight="900" fill="#1E293B" text-anchor="middle">A</text>
  
  <!-- Persian/Phonetic subtle badge -->
  <rect x="74" y="166" width="108" height="22" rx="11" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"/>
  <text x="128" y="181" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="800" fill="#2563EB" text-anchor="middle">ANKI • AI • TTS</text>
  
  <!-- Sparkle Star Top Right -->
  <path d="M210 36 Q210 50 196 50 Q210 50 210 64 Q210 50 224 50 Q210 50 210 36 Z" fill="#FDE047"/>
</svg>`;

fs.writeFileSync(path.join(__dirname, 'flashcard-generator.svg'), svg, 'utf-8');
console.log('Created packaging/flashcard-generator.svg');

// Generate 256x256 PNG in pure JS using CRC32 and zlib
function createPng(width, height) {
  const buffer = Buffer.alloc(width * height * 4);
  
  // Render high quality rounded icon with gradient & flashcard
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Rounded rect mask (radius 56)
      const r = 56;
      let inside = true;
      let alpha = 255;
      
      const dx = Math.min(x, width - 1 - x);
      const dy = Math.min(y, height - 1 - y);
      if (dx < r && dy < r) {
        const dist = Math.hypot(r - dx, r - dy);
        if (dist > r) {
          inside = false;
          alpha = 0;
        } else if (dist > r - 1.5) {
          alpha = Math.max(0, Math.min(255, Math.round((r - dist) * 170)));
        }
      }
      
      if (!inside || alpha === 0) {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
        continue;
      }
      
      // Background gradient (Blue #3B82F6 -> #1D4ED8)
      const t = (x + y) / (width + height);
      let red = Math.round(59 * (1 - t) + 29 * t);
      let green = Math.round(130 * (1 - t) + 78 * t);
      let blue = Math.round(246 * (1 - t) + 216 * t);
      
      // Inner Card (x: 48..208, y: 48..208, r: 18)
      const cardX1 = 48, cardX2 = 208, cardY1 = 48, cardY2 = 208, cardR = 18;
      let inCard = false;
      if (x >= cardX1 && x <= cardX2 && y >= cardY1 && y <= cardY2) {
        const cdx = Math.min(x - cardX1, cardX2 - x);
        const cdy = Math.min(y - cardY1, cardY2 - y);
        if (cdx >= cardR || cdy >= cardR || Math.hypot(cardR - cdx, cardR - cdy) <= cardR) {
          inCard = true;
        }
      }
      
      if (inCard) {
        if (y < 84) {
          // Card Header Stripe (#2563EB)
          red = 37; green = 99; blue = 235;
          // Dots
          if (Math.hypot(x - 68, y - 66) <= 6) { red = 253; green = 224; blue = 71; }
          if (Math.hypot(x - 86, y - 66) <= 6) { red = 110; green = 231; blue = 183; }
        } else {
          // Card Body (#FFFFFF)
          red = 252; green = 253; blue = 255;
          
          // Letter 'A'
          // A legs & bar
          const ax = x - 128;
          const ay = y - 136;
          // Vertical triangle shape for letter A
          if (ay >= -32 && ay <= 24) {
            const legDist = Math.abs(Math.abs(ax) - (-ay * 0.45 + 5));
            if (legDist <= 5.5 && ay >= -28) {
              red = 30; green = 41; blue = 59;
            }
            if (ay >= -2 && ay <= 6 && Math.abs(ax) <= 14) {
              red = 30; green = 41; blue = 59;
            }
          }
          
          // Bottom badge
          if (y >= 168 && y <= 188 && x >= 76 && x <= 180) {
            red = 239; green = 246; blue = 255;
          }
        }
      }
      
      buffer[idx] = red;
      buffer[idx + 1] = green;
      buffer[idx + 2] = blue;
      buffer[idx + 3] = alpha;
    }
  }
  
  // Construct PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // adaptive filter
  ihdrData[12] = 0; // non-interlaced
  const ihdr = makeChunk('IHDR', ihdrData);
  
  // IDAT with scanline filter 0
  const rawScanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (width * 4 + 1)] = 0; // filter type 0 (None)
    buffer.copy(rawScanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idat = makeChunk('IDAT', compressed);
  
  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Simple CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const pngBuf = createPng(256, 256);
fs.writeFileSync(path.join(__dirname, 'flashcard-generator.png'), pngBuf);
console.log('Created packaging/flashcard-generator.png (256x256)');
