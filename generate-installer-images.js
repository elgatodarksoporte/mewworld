/**
 * Generate NSIS installer BMP images from icon.png
 * Run: node generate-installer-images.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Create a 24-bit BMP file from raw RGB buffer
 * @param {Buffer} rgbBuffer - Raw RGB pixel data (top-to-bottom, left-to-right)
 * @param {number} width
 * @param {number} height
 * @returns {Buffer} BMP file buffer
 */
function createBMP(rgbBuffer, width, height) {
  // BMP stores rows bottom-to-top, each row padded to 4-byte boundary
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const headerSize = 14; // BITMAPFILEHEADER
  const infoSize = 40; // BITMAPINFOHEADER
  const fileSize = headerSize + infoSize + pixelDataSize;

  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER
  buf.write('BM', 0); // Signature
  buf.writeUInt32LE(fileSize, 2); // File size
  buf.writeUInt32LE(0, 6); // Reserved
  buf.writeUInt32LE(headerSize + infoSize, 10); // Pixel data offset

  // BITMAPINFOHEADER
  buf.writeUInt32LE(infoSize, 14); // Header size
  buf.writeInt32LE(width, 18); // Width
  buf.writeInt32LE(height, 22); // Height (positive = bottom-up)
  buf.writeUInt16LE(1, 26); // Planes
  buf.writeUInt16LE(24, 28); // Bits per pixel
  buf.writeUInt32LE(0, 30); // Compression (none)
  buf.writeUInt32LE(pixelDataSize, 34); // Image size
  buf.writeInt32LE(2835, 38); // X pixels per meter (~72 DPI)
  buf.writeInt32LE(2835, 42); // Y pixels per meter
  buf.writeUInt32LE(0, 46); // Colors used
  buf.writeUInt32LE(0, 50); // Important colors

  // Pixel data (bottom-up, BGR format)
  const dataOffset = headerSize + infoSize;
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 3; // BMP is bottom-up
    const dstRow = dataOffset + y * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = srcRow + x * 3;
      const dstIdx = dstRow + x * 3;
      // RGB to BGR
      buf[dstIdx] = rgbBuffer[srcIdx + 2]; // B
      buf[dstIdx + 1] = rgbBuffer[srcIdx + 1]; // G
      buf[dstIdx + 2] = rgbBuffer[srcIdx]; // R
    }
  }

  return buf;
}

async function generate() {
  const iconPath = path.join(__dirname, 'icon.png');
  const bgColor = { r: 18, g: 18, b: 26 };

  // 1. Installer Sidebar (164x314)
  const sidebarWidth = 164;
  const sidebarHeight = 314;
  const iconSize = 100;

  const sidebarIcon = await sharp(iconPath)
    .resize(iconSize, iconSize, { fit: 'contain', background: { ...bgColor, alpha: 1 } })
    .toBuffer();

  const sidebarText = `
    <svg width="${sidebarWidth}" height="${sidebarHeight}">
      <rect width="${sidebarWidth}" height="${sidebarHeight}" fill="rgb(${bgColor.r},${bgColor.g},${bgColor.b})"/>
      <text x="${sidebarWidth / 2}" y="240" text-anchor="middle" fill="#ff6b1a" font-family="Arial,sans-serif" font-weight="bold" font-size="16">MewWorld</text>
      <text x="${sidebarWidth / 2}" y="260" text-anchor="middle" fill="#888888" font-family="Arial,sans-serif" font-size="10">Desktop App</text>
    </svg>
  `;

  const sidebarRgb = await sharp({
    create: {
      width: sidebarWidth,
      height: sidebarHeight,
      channels: 3,
      background: bgColor
    }
  })
    .composite([
      { input: Buffer.from(sidebarText), top: 0, left: 0 },
      { input: sidebarIcon, top: 80, left: Math.round((sidebarWidth - iconSize) / 2) }
    ])
    .removeAlpha()
    .raw()
    .toBuffer();

  const sidebarBmp = createBMP(sidebarRgb, sidebarWidth, sidebarHeight);
  fs.writeFileSync(path.join(__dirname, 'installer-sidebar.bmp'), sidebarBmp);
  console.log('Created installer-sidebar.bmp (164x314)');

  // 2. Installer Header (150x57)
  const headerWidth = 150;
  const headerHeight = 57;
  const headerIconSize = 40;

  const headerIcon = await sharp(iconPath)
    .resize(headerIconSize, headerIconSize, { fit: 'contain', background: { ...bgColor, alpha: 1 } })
    .toBuffer();

  const headerRgb = await sharp({
    create: {
      width: headerWidth,
      height: headerHeight,
      channels: 3,
      background: bgColor
    }
  })
    .composite([
      { input: headerIcon, top: Math.round((headerHeight - headerIconSize) / 2), left: Math.round((headerWidth - headerIconSize) / 2) }
    ])
    .removeAlpha()
    .raw()
    .toBuffer();

  const headerBmp = createBMP(headerRgb, headerWidth, headerHeight);
  fs.writeFileSync(path.join(__dirname, 'installer-header.bmp'), headerBmp);
  console.log('Created installer-header.bmp (150x57)');

  console.log('Done!');
}

generate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
