// Types d'œuvre : tout le vocabulaire qui change d'un média à l'autre, en un seul endroit,
// et quelques capacités (`inProgress`, `seasons`, `sharePoster`) que le code consulte plutôt que de tester le type.
// Ce qui ne vaut que pour un média (pastilles d'un visionnage, formats de BD, tuiles du bilan) reste dans les pages, par type.
// Ajouter un type ici l'ajoute au schéma (content.config.ts) ; TypeScript (`npm run check`) signale alors ce qui reste à gérer.
// Les formes sont écrites en entier (« vue », « vues ») plutôt que fabriquées : aucun accord n'est deviné.
// Les couleurs de chaque type (`--film`, `--livre`, `--serie`) sont dans src/layouts/Base.astro.
// Ce fichier ne dépend pas d'astro:content : la config des collections l'importe.

interface KindInfo {
  label: string;                         // « Film » : étiquette du journal, du flux RSS
  plural: string;                        // « Films » : titre de la page du type, filtre des listes
  route: string;                         // « films » : adresse de la page du type (/films/)
  noun: readonly [string, string, string]; // article, singulier et pluriel : « un film », « 2 films »
  participle: readonly [string, string]; // « vu », « vus » : « 12 films vus »
  verb: string;                          // « Vu » : « Vu le 8 octobre 2026 »
  todo: string;                          // « À voir » : œuvres sans entrée de journal
  repeat: string;                        // « Revisionnage » : entrée `repeat`
  intro: string;                         // description de la page du type
  latest: string;                        // titre de la rangée de l'accueil
  all: string;                           // lien vers la page du type, depuis l'accueil
  of: string;                            // « du film » : « Image du film Parasite »
  passages: string;                      // « visionnages » : « fiche et visionnages »
  allPassages: string;                   // « tous mes visionnages », « toutes mes lectures » : lien vers la fiche
  image: string;                         // « Affiche » ou « Couverture » (textes alternatifs)
  released: string;                      // « Sorti » ou « Publié » : « Sorti le 8 octobre 2026 »
  defaultRole: string;                   // rôle d'une personne sans `role` dans `creators`, sur sa page
  schemaOrg: { type: string; creator: string }; // données structurées : type d'œuvre et propriété des créateurs
  doing: string;                         // « En train de lire » : entrée en cours, sur l'accueil
  ongoing: string;                       // « Lecture en cours » : entrée en cours, sur sa page
  // Capacités
  inProgress: boolean;                   // une entrée peut être commencée sans être finie (`started` sans `date`) ; sinon elle a toujours une `date`
  seasons: boolean;                      // l'œuvre a des saisons, suivies épisode par épisode
  sharePoster: boolean;                  // l'affiche sert d'aperçu au partage d'un lien (sinon, l'image du site)
}

export const kinds = {
  film: {
    label: 'Film', plural: 'Films', route: 'films',
    noun: ['un', 'film', 'films'], participle: ['vu', 'vus'],
    verb: 'Vu', todo: 'À voir', repeat: 'Revisionnage',
    intro: 'Les films que j’ai vus', latest: 'Derniers films vus', all: 'Tous les films',
    of: 'du film', passages: 'visionnages', allPassages: 'tous mes visionnages', image: 'Affiche', released: 'Sorti', defaultRole: 'Réalisation',
    schemaOrg: { type: 'Movie', creator: 'director' },
    doing: 'En train de regarder', ongoing: 'Visionnage en cours',
    inProgress: false, seasons: false, sharePoster: true,
  },
  livre: {
    label: 'Livre', plural: 'Livres', route: 'livres',
    noun: ['un', 'livre', 'livres'], participle: ['lu', 'lus'],
    verb: 'Lu', todo: 'À lire', repeat: 'Relecture',
    intro: 'Les livres que j’ai lus', latest: 'Derniers livres lus', all: 'Tous les livres',
    of: 'du livre', passages: 'lectures', allPassages: 'toutes mes lectures', image: 'Couverture', released: 'Publié', defaultRole: 'Écriture',
    schemaOrg: { type: 'Book', creator: 'author' },
    doing: 'En train de lire', ongoing: 'Lecture en cours',
    inProgress: true, seasons: false, sharePoster: false, // couverture : pas d'aperçu
  },
  serie: {
    label: 'Série', plural: 'Séries', route: 'series',
    noun: ['une', 'série', 'séries'], participle: ['vue', 'vues'],
    verb: 'Vu', todo: 'À voir', repeat: 'Revisionnage',
    intro: 'Les séries que j’ai regardées', latest: 'Dernières séries vues', all: 'Toutes les séries',
    of: 'de la série', passages: 'visionnages', allPassages: 'tous mes visionnages', image: 'Affiche', released: 'Sorti', defaultRole: 'Création',
    schemaOrg: { type: 'TVSeries', creator: 'creator' },
    doing: 'En train de regarder', ongoing: 'Visionnage en cours',
    inProgress: true, seasons: true, sharePoster: true,
  },
} as const satisfies Record<string, KindInfo>;

export type Kind = keyof typeof kinds;
/** Les types, dans l'ordre d'affichage (menus, accueil, filtres). */
export const kindIds = Object.keys(kinds) as [Kind, ...Kind[]];
