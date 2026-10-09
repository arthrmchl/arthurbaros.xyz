// Informations du site, reprises dans les meta-tags de chaque page et dans le flux RSS.
export const site = {
  name: 'arthurbaros.xyz',
  description: 'Reviews et critiques de films et de livres.',
  // Complète le nom dans le titre de l'accueil.
  tagline: 'Reviews et critiques',
  author: 'Arthur Baros',
  locale: 'fr_FR',
  // Image de partage par défaut (dans /public, 1200×630) : générée par scripts/og-image.mjs.
  image: { src: '/og.png', alt: 'Logo et nom du site arthurbaros.xyz', width: 1200, height: 630 },
  // Couleur de la barre du navigateur sur mobile, en mode clair et sombre (fond de page).
  themeColor: { light: '#eef1ec', dark: '#12191e' },
} as const;
