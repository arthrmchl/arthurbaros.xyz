// Genres autorisés (champ `tags` des fiches) : une liste fermée évite les doublons (drama / drame…).
// Pour un nouveau genre, ajoute-le ici.
export const genres = [
  'action', 'animation', 'aventure', 'comédie', 'documentaire', 'drame', 'famille', 'fantastique', 'guerre', 'histoire',
  'horreur', 'musique', 'mystère', 'policier', 'romance', 'science-fiction', 'surréalisme', 'thriller', 'western', 'mecha'
] as const;
export type Genre = (typeof genres)[number];
