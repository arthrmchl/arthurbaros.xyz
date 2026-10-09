// Génère l'image de partage par défaut (public/og.png, 1200×630) : logo et nom du site, centrés,
// avec la même mise en page que le header du site (.brand dans src/layouts/Base.astro).
// À relancer après un changement de nom ou de couleurs : node scripts/og-image.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { loadFont, textPath } from './font-path.mjs';

const paper = '#eef1ec', ink = '#17232b', film = '#1d5c78', livre = '#66661c';
const width = 1200, height = 630;
// Police du nom dans le header (Instrument Sans 600), fournie dans scripts/fonts/.
const font = loadFont(fileURLToPath(new URL('./fonts/InstrumentSans-SemiBold.ttf', import.meta.url)));

// Cotes du header, pour une taille de police F :
// logo haut de 1.1 F, espace de 0.6rem pour un nom en 1.05rem, nom en line-height 1 centré sur le logo puis remonté de 0.05 F.
const F = 100;
const logoH = 1.1 * F, logoW = logoH * 22 / 14, gap = (0.6 / 1.05) * F;
// Ligne de base : haut de la boîte du nom, plus la demi-interligne (négative en line-height 1), plus l'ascendante.
const asc = font.ascender / font.unitsPerEm, desc = -font.descender / font.unitsPerEm;
const boxTop = logoH / 2 - F / 2 - 0.05 * F;
const name = textPath(font, 'arthurbaros.xyz', { x: logoW + gap, y: boxTop + (F - (asc + desc) * F) / 2 + asc * F, size: F });

const pad = 50;
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(logoW + gap + name.width + 2 * pad)}" height="${Math.ceil(2 * logoH + 2 * pad)}">
  <rect width="100%" height="100%" fill="${paper}"/>
  <g transform="translate(${pad} ${pad})">
    <svg width="${logoW}" height="${logoH}" viewBox="4 9 22 14">
      <circle cx="11" cy="16" r="7" fill="${film}"/>
      <rect x="19" y="9" width="7" height="14" rx="1" fill="${livre}"/>
    </svg>
    <path d="${name.d}" fill="${ink}"/>
  </g>
</svg>`;

// Recadré sur son contenu, ramené à 75 % de la largeur (marge contre le rognage des aperçus), puis centré.
const trimmed = await sharp(Buffer.from(mark), { density: 288 }).trim({ background: paper }).toBuffer();
const { data, info } = await sharp(trimmed).resize({ width: Math.round(width * 0.75) }).toBuffer({ resolveWithObject: true });
const left = Math.round((width - info.width) / 2), top = Math.round((height - info.height) / 2);
await sharp({ create: { width, height, channels: 4, background: paper } })
  .composite([{ input: data, left, top }])
  .png()
  .toFile(fileURLToPath(new URL('../public/og.png', import.meta.url)));
console.log('public/og.png généré');
