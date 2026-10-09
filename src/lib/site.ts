// Informations du site, reprises dans les meta-tags de chaque page et dans le flux RSS.
export const site = {
  name: 'arthurbaros.xyz',
  description: 'Mes avis sur les films que je vois et les livres que je lis.',
  author: 'Arthur Baros',
  locale: 'fr_FR',
  // Image de partage par défaut (dans /public), affichée en petit format.
  image: { src: '/apple-touch-icon.png', alt: 'Logo de arthurbaros.xyz : un disque bleu et une page verte' },
  // Couleur de la barre du navigateur sur mobile, en mode clair et sombre (fond de page).
  themeColor: { light: '#eef1ec', dark: '#12191e' },
} as const;
