// Génère l'image de partage par défaut (public/og.png, 1200×630) aux couleurs du site.
// À relancer après un changement de nom, d'accroche ou de couleurs : node scripts/og-image.mjs
import sharp from 'sharp';

const paper = '#eef1ec', ink = '#17232b', muted = '#55646e', line = '#c9d1cb', film = '#1d5c78', livre = '#66661c';
const serif = "Newsreader, Georgia, serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${paper}"/>
  <!-- Logo et nom du site -->
  <g transform="translate(80 80) scale(4)">
    <circle cx="7" cy="7" r="7" fill="${film}"/>
    <rect x="15" y="0" width="7" height="14" rx="1" fill="${livre}"/>
  </g>
  <text x="196" y="122" font-family="${serif}" font-size="40" font-weight="bold" fill="${ink}">arthurbaros.xyz</text>
  <!-- Accroche -->
  <text font-family="${serif}" font-size="76" font-weight="bold" fill="${ink}">
    <tspan x="80" y="300">Mes avis sur les <tspan fill="${film}">films</tspan></tspan>
    <tspan x="80" y="392">et les <tspan fill="${livre}">livres</tspan>.</tspan>
  </text>
  <line x1="80" y1="482" x2="1120" y2="482" stroke="${line}" stroke-width="2"/>
  <text x="80" y="548" font-family="${serif}" font-size="36" font-style="italic" fill="${muted}">Notes, reviews et bilans par année</text>
  <text x="1120" y="548" text-anchor="end" font-family="${serif}" font-size="36" fill="${film}">Lire les reviews →</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(new URL('../public/og.png', import.meta.url).pathname);
console.log('public/og.png généré');
