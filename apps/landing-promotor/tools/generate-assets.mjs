/**
 * Gera assets estáticos comitados em public/:
 *  - og-image.png (1200x630) — texto convertido em <path> via opentype.js
 *    (zero dependência de fontconfig na rasterização)
 *  - apple-touch-icon.png (180x180) + ícones PWA a partir do favicon.svg
 *
 * Uso: npm run assets
 * Requer rede só na primeira execução (baixa o TTF do Archivo Black do
 * repositório oficial google/fonts para tools/fonts/).
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import opentype from 'opentype.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = path.join(root, 'tools', 'fonts');
const fontFile = path.join(fontsDir, 'ArchivoBlack-Regular.ttf');
const FONT_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/archivoblack/ArchivoBlack-Regular.ttf';

// Direção dark luxury: dourado sobre grafite/preto
const COLORS = {
  char: '#141416',
  black: '#0b0b0c',
  gold: '#d9b15a',
  goldSoft: '#f0d493',
  white: '#ffffff',
  muted: '#b4b4bb',
};

async function ensureFont() {
  try {
    await access(fontFile);
  } catch {
    console.log('Baixando Archivo Black (google/fonts)…');
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error(`Falha ao baixar fonte: HTTP ${res.status}`);
    await mkdir(fontsDir, { recursive: true });
    await writeFile(fontFile, Buffer.from(await res.arrayBuffer()));
  }
  const buffer = await readFile(fontFile);
  return opentype.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  );
}

/** Texto → path SVG, glyph a glyph com advance manual (sem kerning). */
function textPath(font, text, x, y, size, fill) {
  let cx = x;
  const parts = [];
  const scale = size / font.unitsPerEm;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const d = glyph.getPath(cx, y, size).toPathData(2);
    if (d && !d.includes('NaN')) parts.push(d);
    cx += glyph.advanceWidth * scale;
  }
  return `<path d="${parts.join(' ')}" fill="${fill}"/>`;
}

function width(font, text, size) {
  const scale = size / font.unitsPerEm;
  let total = 0;
  for (const ch of text) total += font.charToGlyph(ch).advanceWidth * scale;
  return total;
}

/** Wordmark com dígitos em dourado (ex.: V7M → "7" dourado) */
function wordmark(font, text, x, y, size) {
  let cx = x;
  const out = [];
  const scale = size / font.unitsPerEm;
  for (const ch of text) {
    out.push(textPath(font, ch, cx, y, size, /\d/.test(ch) ? COLORS.gold : COLORS.white));
    cx += font.charToGlyph(ch).advanceWidth * scale;
  }
  return out.join('');
}

/** Variante vazada (ghost): contorno do glyph, sem preenchimento */
function textPathGhost(font, text, x, y, size, stroke, strokeWidth) {
  let cx = x;
  const parts = [];
  const scale = size / font.unitsPerEm;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const d = glyph.getPath(cx, y, size).toPathData(2);
    if (d && !d.includes('NaN')) parts.push(d);
    cx += glyph.advanceWidth * scale;
  }
  return `<path d="${parts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function buildOgSvg(font) {
  const W = 1200;
  const H = 630;

  // Logo: marca (losango + sinal de mais) + wordmark V7M
  const markX = 64;
  const markY = 56;
  const markSize = 52;
  const wordY = markY + markSize * 0.72;
  const brand = 'V7M';
  const wordSize = 32;
  const brandW = width(font, brand, wordSize);

  // Headline
  const hSize = 100;
  const line1 = 'Indique.';
  const line2 = 'Receba.';
  const line1Y = 300;
  const line2Y = 416;
  const line2W = width(font, line2, hSize);

  const sub = 'Indique matrículas e receba por Pix toda semana';
  const subSize = 25;
  const chipText = 'R$ 100 por matrícula paga · sem vender nada';
  const chipSize = 28;
  const chipPadX = 32;
  const chipW = width(font, chipText, chipSize) + chipPadX * 2;
  const chipH = 70;
  const chipY = 512;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLORS.char}"/>
      <stop offset="0.6" stop-color="${COLORS.black}"/>
      <stop offset="1" stop-color="#050506"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.16" cy="0.1" r="0.6">
      <stop offset="0" stop-color="${COLORS.gold}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${COLORS.gold}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- losangos decorativos -->
  <g fill="none" stroke="${COLORS.white}" stroke-opacity="0.05" stroke-width="3">
    <path d="M1060 -40 1420 320 1060 680 700 320Z"/>
    <path d="M1060 60 1320 320 1060 580 800 320Z"/>
  </g>
  <path d="M1060 160 1220 320 1060 480 900 320Z" fill="none" stroke="${COLORS.gold}" stroke-opacity="0.4" stroke-width="4"/>
  <path d="M1060 250v140M990 320h140" stroke="${COLORS.gold}" stroke-opacity="0.55" stroke-width="11" stroke-linecap="round"/>

  <!-- logo -->
  <g transform="translate(${markX} ${markY})">
    <path d="M${markSize / 2} 2 L${markSize - 2} ${markSize / 2} L${markSize / 2} ${markSize - 2} L2 ${markSize / 2}Z"
      fill="none" stroke="${COLORS.gold}" stroke-width="4.4" stroke-linejoin="round"/>
    <path d="M${markSize / 2} ${markSize * 0.3}V${markSize * 0.7}M${markSize * 0.3} ${markSize / 2}H${markSize * 0.7}"
      fill="none" stroke="${COLORS.goldSoft}" stroke-width="4.6" stroke-linecap="round"/>
  </g>
  ${wordmark(font, brand, markX + markSize + 18, wordY, wordSize)}
  <rect x="${markX + markSize + 18 + brandW + 14}" y="${markY + 8}" width="118" height="30" rx="15" fill="${COLORS.gold}"/>
  ${textPath(font, 'PROMOTOR', markX + markSize + 18 + brandW + 26, markY + 29, 15, COLORS.black)}

  <!-- headline: ghost (gesto) → sólido dourado (resultado) -->
  ${textPathGhost(font, line1, 64, line1Y, hSize, 'rgba(255,255,255,0.9)', 2.6)}
  ${textPath(font, line2, 64, line2Y, hSize, COLORS.gold)}
  <path d="M66 ${line2Y + 24} C ${64 + line2W * 0.3} ${line2Y + 14}, ${64 + line2W * 0.7} ${line2Y + 12}, ${64 + line2W} ${line2Y + 18}"
    fill="none" stroke="${COLORS.goldSoft}" stroke-width="8" stroke-linecap="round"/>

  <!-- subtítulo -->
  ${textPath(font, sub, 64, 470, subSize, COLORS.muted)}

  <!-- chip -->
  <rect x="64" y="${chipY}" width="${chipW}" height="${chipH}" rx="${chipH / 2}" fill="${COLORS.gold}"/>
  ${textPath(font, chipText, 64 + chipPadX, chipY + chipH / 2 + chipSize * 0.36, chipSize, COLORS.black)}
</svg>`;
}

/** ICO container com um PNG 32x32 dentro (válido desde o Vista) */
function pngToIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);
  entry.writeUInt8(32, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  const font = await ensureFont();
  const publicDir = path.join(root, 'public');
  await mkdir(publicDir, { recursive: true });

  const svg = buildOgSvg(font);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'og-image.png'));
  console.log('✓ public/og-image.png (1200x630)');

  const favicon = await readFile(path.join(publicDir, 'favicon.svg'));
  for (const [size, name] of [
    [180, 'apple-touch-icon.png'],
    [192, 'icon-192.png'],
    [512, 'icon-512.png'],
  ]) {
    await sharp(favicon, { density: 300 }).resize(size, size).png().toFile(path.join(publicDir, name));
    console.log(`✓ public/${name} (${size}x${size})`);
  }

  const png32 = await sharp(favicon, { density: 300 }).resize(32, 32).png().toBuffer();
  await writeFile(path.join(publicDir, 'favicon.ico'), pngToIco(png32));
  console.log('✓ public/favicon.ico (32x32)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
