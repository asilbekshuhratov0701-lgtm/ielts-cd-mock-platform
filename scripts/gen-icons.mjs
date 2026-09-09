import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "apps", "web", "src", "app");

const GRID = 32;
const RADIUS = 7.5;
const STROKE = 3.6;
const POINTS = [
  [10, 10],
  [22, 10],
  [10, 22],
  [22, 22]
];
const FROM = [0x4f, 0x46, 0xe5];
const TO = [0x7c, 0x5c, 0xfc];
const SAMPLES = 4;

function roundRectDistance(x, y) {
  const half = GRID / 2;
  const qx = Math.abs(x - half) - half + RADIUS;
  const qy = Math.abs(y - half) - half + RADIUS;
  return (
    Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - RADIUS
  );
}

function segmentDistance(x, y, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = x - ax;
  const wy = y - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
}

function glyphDistance(x, y) {
  let best = Infinity;
  for (let i = 0; i < POINTS.length - 1; i += 1) {
    const [ax, ay] = POINTS[i];
    const [bx, by] = POINTS[i + 1];
    best = Math.min(best, segmentDistance(x, y, ax, ay, bx, by));
  }
  return best;
}

function gradientAt(x, y) {
  const t = Math.max(0, Math.min(1, (x / GRID + y / GRID) / 2));
  return [
    Math.round(FROM[0] + (TO[0] - FROM[0]) * t),
    Math.round(FROM[1] + (TO[1] - FROM[1]) * t),
    Math.round(FROM[2] + (TO[2] - FROM[2]) * t)
  ];
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = GRID / size;
  const step = 1 / SAMPLES;
  const total = SAMPLES * SAMPLES;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let covered = 0;
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const gx = (px + (sx + 0.5) * step) * scale;
          const gy = (py + (sy + 0.5) * step) * scale;
          if (roundRectDistance(gx, gy) > 0) continue;
          covered += 1;
          if (glyphDistance(gx, gy) <= STROKE / 2) {
            r += 255;
            g += 255;
            b += 255;
          } else {
            const [cr, cg, cb] = gradientAt(gx, gy);
            r += cr;
            g += cg;
            b += cb;
          }
        }
      }

      const i = (py * size + px) * 4;
      if (covered === 0) continue;
      pixels[i] = Math.round(r / covered);
      pixels[i + 1] = Math.round(g / covered);
      pixels[i + 2] = Math.round(b / covered);
      pixels[i + 3] = Math.round((covered / total) * 255);
    }
  }
  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;
  entries.forEach((entry, index) => {
    const at = index * 16;
    directory[at] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 4] = 1;
    directory.writeUInt16LE(32, at + 6);
    directory.writeUInt32LE(entry.png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((e) => e.png)]);
}

const png = (size) => encodePng(size, render(size));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}">
  <defs>
    <linearGradient id="zm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f46e5"/>
      <stop offset="1" stop-color="#7c5cfc"/>
    </linearGradient>
  </defs>
  <rect width="${GRID}" height="${GRID}" rx="${RADIUS}" fill="url(#zm)"/>
  <path d="M${POINTS.map((p) => p.join(" ")).join("L")}" fill="none" stroke="#fff"
    stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

writeFileSync(path.join(appDir, "icon.svg"), svg);
writeFileSync(path.join(appDir, "apple-icon.png"), png(180));
writeFileSync(
  path.join(appDir, "favicon.ico"),
  encodeIco([16, 32, 48].map((size) => ({ size, png: png(size) })))
);

console.log("[icons] wrote icon.svg, favicon.ico (16/32/48) and apple-icon.png (180)");
