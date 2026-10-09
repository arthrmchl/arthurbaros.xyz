# Journal de bord — reviews de films et de livres

Blog statique Astro : tu écris des fichiers Markdown, GitHub Pages publie le site.

## Structure

```
src/content/
├── works/            # fiches d'œuvres (une par film ou livre)
│   ├── films/parasite.md
│   └── livres/la-horde-du-contrevent.md
└── logs/             # un fichier par visionnage ou lecture
    └── 2026-10-03-parasite.md   # work: parasite
```

Le nom du fichier d'une fiche est son identifiant : `work: parasite` dans un log pointe vers `works/films/parasite.md`.

## Ajouter une review

1. Si l'œuvre n'a pas de fiche, crée-la dans `works/films/` ou `works/livres/` (voir ci-dessous).

   - **Film** : `title`, `type: film`, `director`, `year`, puis en option `runtime` (durée en minutes), `poster` (affiche), `backdrop` (image de fond), `tags`.
   - **Livre** : `title`, `type: livre`, `creator`, `year`, puis en option `originalLanguage` (langue originale), `cover` (couverture), `tags`.
   - `poster`, `backdrop` et `cover` acceptent une URL ou un chemin vers un fichier de `public/`.
2. Crée un fichier dans `logs/` : `AAAA-MM-JJ-titre.md` (modèles dans `templates/`), puis ton texte.

   - **Visionnage** : `work`, `date`, `rating` (0 à 5, par pas de 0,5), puis en option `venue` (`cinema` ou `maison`), `version` (`vf` ou `vostfr`), `accompanied`, `repeat`.
   - **Lecture** : `work`, `started` (début), `language`, puis `date` (fin) et `rating` une fois le livre terminé : sans `date`, la lecture s'affiche « en cours ».
3. `git add . && git commit -m "Review : ..." && git push`

## Livres à lire (et films à voir)

Une fiche d'œuvre sans aucun fichier dans `logs/` est considérée comme « à lire » (ou « à voir ») : il suffit de créer la fiche dans `works/livres/` à partir de `templates/livre-template.md`. Elle apparaît dans la section **À lire** de la page Livres, et quitte cette liste dès que tu crées l'entrée de lecture correspondante (avec `started`).

Un oubli ou une faute dans le frontmatter (note hors limites, œuvre inconnue) fait échouer le build avec un message explicite.

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
