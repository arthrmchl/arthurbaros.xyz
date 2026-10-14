# Journal de bord — reviews de films, de livres et de séries

Blog statique Astro : tu écris des fichiers Markdown, GitHub Pages publie le site.

## Structure

```
src/content/
├── works/            # fiches d'œuvres (une par film, livre ou série)
│   ├── films/parasite.md
│   ├── livres/la-horde-du-contrevent.md
│   └── series/severance.md
└── logs/             # un fichier par visionnage, lecture ou saison suivie
    └── 2026-10-03-parasite.md   # work: parasite
```

Le nom du fichier d'une fiche est son identifiant : `work: parasite` dans un log pointe vers `works/films/parasite.md`.

## Ajouter une review

1. Si l'œuvre n'a pas de fiche, crée-la dans `works/films/`, `works/livres/` ou `works/series/` (voir ci-dessous).

   - **Film** : `title` (titre français), `type: film`, `creators` (réalisateur·ices), `released` (sortie), puis en option `runtime` (durée en minutes), `poster` (affiche), `backdrop` (image de fond), `tags`.
   - **Livre** : `title` (titre français), `type: livre`, `creators` (auteur·ices), `released` (publication), puis en option `originalLanguage` (langue originale), `poster` (couverture), `tags`.
   - **Série** : `title`, `type: serie`, `creators` (créateur·ices), `firstAired` (début de diffusion), puis en option `lastAired` (fin de diffusion, vide si la série est toujours diffusée), `poster`, `backdrop`, `tags`, et `seasons` : pour chaque saison, `firstAired`, `lastAired` et `episodes`, soit le nombre d'épisodes (`episodes: 10`), soit la liste de leurs titres. Pour renseigner la durée d'un épisode (en minutes), écris-le `{ title: "Pilot", runtime: 94 }` (ou `{ runtime: 47 }` sans titre) ; elle s'affiche dans la liste des épisodes et compte dans le bilan de l'année. Une saison peut aussi avoir un `title` et un `poster`.
   - `released` accepte une année (`2026`), un mois (`2026-10`) ou un jour (`2026-10-08`) ; la date précise s'affiche sur la fiche, l'année seule ailleurs.
   - `originalTitle` (titre original) : à remplir quand il diffère du titre français ; il s'affiche sous le titre.
   - `creators` est une liste : `creators: ["Mark Frost", "David Lynch"]`. Chaque nom a sa page (`/personnes/david-lynch/`).
   - `tags` : les genres, pris dans la liste de `src/lib/genres.ts` (un genre absent fait échouer le build ; ajoute-le à la liste s'il manque). Chaque genre a sa page (`/genres/drame/`).
   - `poster` et `backdrop` acceptent une URL ou un chemin vers un fichier de `public/`.
2. Crée un fichier dans `logs/` : `AAAA-MM-JJ-titre.md` (modèles dans `templates/`), puis ton texte.

   - **Visionnage** : `work`, `date`, `rating` (note entière de 0 à 5), puis en option `venue` (`cinema` ou `maison`), `version` (`vf` ou `vostfr`), `accompanied`, `repeat`.
   - **Lecture** : `work`, `started` (début), `language`, puis `date` (fin) et `rating` une fois le livre terminé : sans `date`, la lecture s'affiche « en cours ».
   - **Saison** : `work`, `season` (son numéro) et `watched`, la liste des jours de visionnage avec les épisodes vus ce jour-là (`3`, `[1, 2]` ou `"4-7"`). Tu complètes le même fichier au fil des épisodes. La saison est « en cours » jusqu'à ce que tous ses épisodes soient vus. Ajoute alors `rating` et ton texte. En option : `version`, `accompanied`, `repeat`.
   - **Abandon** (visionnage, lecture ou saison) : `abandoned: true`, avec la `date` du jour de l'arrêt ; la note est alors optionnelle. Une saison datée à laquelle il manque des épisodes, sans `abandoned`, fait échouer le build (oubli probable).
   - Si une œuvre (ou une saison) a déjà une entrée plus ancienne, le build avertit quand `repeat: true` manque.
   - **Avis sur toute la série** : `work`, `date`, `rating` (optionnelle), sans `season`.
3. `git add . && git commit -m "Review : ..." && git push`

## Livres à lire (et films ou séries à voir)

Une fiche d'œuvre sans aucun fichier dans `logs/` est considérée comme « à lire » (ou « à voir ») : il suffit de créer la fiche dans `works/livres/` à partir de `templates/livre-template.md`. Elle apparaît dans la section **À lire** de la page Livres, et quitte cette liste dès que tu crées l'entrée de lecture correspondante (avec `started`).

Un oubli ou une faute dans le frontmatter (note hors limites, œuvre inconnue, champ mal nommé, genre hors liste) fait échouer le build avec un message explicite. `npm run check` vérifie aussi les types du code (lancé avant chaque déploiement).

## En local

```bash
npm install
npm run dev      # http://localhost:4321
```

## Déployer sur GitHub Pages

1. Crée un dépôt GitHub et pousse ce projet sur la branche `main`.
2. Dans le dépôt : Settings → Pages → Source : **GitHub Actions**.
3. Chaque push sur `main` relance `.github/workflows/deploy.yml` et publie le site.

L'adresse sera `https://<pseudo>.github.io/<nom-du-depot>/`.
Si ton dépôt s'appelle `<pseudo>.github.io`, mets `BASE: /` dans le workflow.

### Nom de domaine perso (optionnel)

Ajoute un fichier `public/CNAME` contenant ton domaine, mets `SITE: https://ton-domaine.fr` et `BASE: /` dans le workflow, puis configure le DNS comme indiqué dans Settings → Pages.
