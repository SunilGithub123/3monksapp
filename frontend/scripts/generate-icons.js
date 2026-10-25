const fs = require('fs');
const zlib = require('zlib');

// Generate PWA icons as purple circles with "3M" text
// Uses raw PNG encoding (no dependencies needed)

function createPNG(size) {
    const width = size;
    const height = size;

    // Raw pixel data (RGBA)
    const pixels = Buffer.alloc(width * height * 4);

    const cx = width / 2;
    const cy = height / 2;
    const radius = size / 2;

    // Purple gradient background circle
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= radius) {
                // Purple gradient: darker at top, lighter at bottom
                const t = y / height;
                const r = Math.round(59 + t * 48);    // 59 -> 107
                const g = Math.round(7 + t * 26);     // 7 -> 33
                const b = Math.round(100 + t * 68);   // 100 -> 168

                // Smooth edge anti-aliasing
                const edgeDist = radius - dist;
                const alpha = edgeDist < 1.5 ? Math.round(255 * Math.min(1, edgeDist / 1.5)) : 255;

                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = alpha;
            } else {
                pixels[idx + 3] = 0; // transparent
            }
        }
    }

    // Draw a yellow circle accent in center (the monkey face area)
    const innerRadius = radius * 0.45;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const dx = x - cx;
            const dy = (y - cy * 0.95);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= innerRadius) {
                const edgeDist = innerRadius - dist;
                const blend = edgeDist < 2 ? Math.min(1, edgeDist / 2) : 1;

                // Yellow-gold color
                const r = Math.round(251 * blend + pixels[idx] * (1 - blend));
                const g = Math.round(191 * blend + pixels[idx + 1] * (1 - blend));
                const b = Math.round(36 * blend + pixels[idx + 2] * (1 - blend));

                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = 255;
            }
        }
    }

    // Draw "3M" text using simple pixel font
    if (size >= 96) {
        drawText(pixels, width, height, size);
    }

    return encodePNG(pixels, width, height);
}

function drawText(pixels, width, height, size) {
    const scale = Math.max(1, Math.floor(size / 96));
    const cx = width / 2;
    const cy = height / 2;

    // Simple block "3M" - draw "3" and "M" as pixel patterns
    // "3" pattern (5x7 grid)
    const three = [
        [1, 1, 1, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [1, 1, 1, 1, 0],
    ];

    // "M" pattern (5x7 grid)
    const M = [
        [1, 0, 0, 0, 1],
        [1, 1, 0, 1, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
    ];

    const charW = 5 * scale;
    const charH = 7 * scale;
    const gap = 2 * scale;
    const totalW = charW * 2 + gap;
    const startX = Math.round(cx - totalW / 2);
    const startY = Math.round(cy - charH / 2);

    function drawChar(pattern, offsetX) {
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 5; col++) {
                if (pattern[row][col]) {
                    for (let sy = 0; sy < scale; sy++) {
                        for (let sx = 0; sx < scale; sx++) {
                            const px = offsetX + col * scale + sx;
                            const py = startY + row * scale + sy;
                            if (px >= 0 && px < width && py >= 0 && py < height) {
                                const idx = (py * width + px) * 4;
                                // Dark purple text
                                pixels[idx] = 59;
                                pixels[idx + 1] = 7;
                                pixels[idx + 2] = 100;
                                pixels[idx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }

    drawChar(three, startX);
    drawChar(M, startX + charW + gap);
}

function encodePNG(pixels, width, height) {
    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type (RGBA)
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    const ihdrChunk = createChunk('IHDR', ihdr);

    // IDAT chunk - raw pixel data with filter bytes
    const rawData = Buffer.alloc(height * (1 + width * 4));
    for (let y = 0; y < height; y++) {
        rawData[y * (1 + width * 4)] = 0; // no filter
        pixels.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
    }
    const compressed = zlib.deflateSync(rawData);
    const idatChunk = createChunk('IDAT', compressed);

    // IEND chunk
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
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

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate all sizes
const iconsDir = __dirname + '/../public/icons';
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
    const png = createPNG(size);
    fs.writeFileSync(iconsDir + '/icon-' + size + '.png', png);
    console.log('Generated icon-' + size + '.png (' + png.length + ' bytes)');
}

// Maskable icons (square with purple background, no circle crop)
function createMaskablePNG(size) {
    const width = size;
    const height = size;
    const pixels = Buffer.alloc(width * height * 4);

    // Full purple background
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const t = y / height;
            pixels[idx] = Math.round(59 + t * 48);
            pixels[idx + 1] = Math.round(7 + t * 26);
            pixels[idx + 2] = Math.round(100 + t * 68);
            pixels[idx + 3] = 255;
        }
    }

    // Draw yellow circle in center
    const cx = width / 2;
    const cy = height / 2;
    const innerRadius = size * 0.25;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const dx = x - cx;
            const dy = y - cy * 0.95;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= innerRadius) {
                const edgeDist = innerRadius - dist;
                const blend = edgeDist < 2 ? Math.min(1, edgeDist / 2) : 1;
                pixels[idx] = Math.round(251 * blend + pixels[idx] * (1 - blend));
                pixels[idx + 1] = Math.round(191 * blend + pixels[idx + 1] * (1 - blend));
                pixels[idx + 2] = Math.round(36 * blend + pixels[idx + 2] * (1 - blend));
            }
        }
    }

    if (size >= 192) drawText(pixels, width, height, size);

    return encodePNG(pixels, width, height);
}

for (const size of [192, 512]) {
    const png = createMaskablePNG(size);
    fs.writeFileSync(iconsDir + '/icon-maskable-' + size + '.png', png);
    console.log('Generated icon-maskable-' + size + '.png (' + png.length + ' bytes)');
}

console.log('\nAll PWA icons generated!');
