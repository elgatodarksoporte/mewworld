const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
  <rect width="256" height="256" rx="48" fill="#0C111D"/>
  <circle cx="128" cy="128" r="24" stroke="#FF6600" stroke-width="16" fill="none"/>
  <path d="M71.44 184.56A80 80 0 0 1 48 128C48 83.84 83.84 48 128 48s80 35.84 80 80a80 80 0 0 1-23.44 56.56" stroke="#FF6600" stroke-width="16" stroke-linecap="round" fill="none"/>
  <path d="M99.68 156.32A40 40 0 0 1 88 128a40 40 0 0 1 40-40 40 40 0 0 1 40 40 40 40 0 0 1-11.68 28.32" stroke="#FF6600" stroke-width="16" stroke-linecap="round" fill="none"/>
</svg>`;

async function generate() {
  // Generate PNG at 256x256 (for tray icon and as base)
  const pngBuffer = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  fs.writeFileSync(path.join(__dirname, 'icon.png'), pngBuffer);
  console.log('Generated icon.png');

  // Generate ICO manually (simple ICO format with 256x256 PNG)
  // ICO header: 6 bytes + 1 entry (16 bytes) + PNG data
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);     // Reserved
  iconDir.writeUInt16LE(1, 2);     // Type: ICO
  iconDir.writeUInt16LE(1, 4);     // Number of images

  const iconEntry = Buffer.alloc(16);
  iconEntry.writeUInt8(0, 0);      // Width (0 = 256)
  iconEntry.writeUInt8(0, 1);      // Height (0 = 256)
  iconEntry.writeUInt8(0, 2);      // Color palette
  iconEntry.writeUInt8(0, 3);      // Reserved
  iconEntry.writeUInt16LE(1, 4);   // Color planes
  iconEntry.writeUInt16LE(32, 6);  // Bits per pixel
  iconEntry.writeUInt32LE(pngBuffer.length, 8);   // Image size
  iconEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  const ico = Buffer.concat([iconDir, iconEntry, pngBuffer]);
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), ico);
  console.log('Generated icon.ico');
}

generate().catch(console.error);
