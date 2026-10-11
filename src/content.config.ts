import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { basename } from 'node:path';

// L'identifiant d'une entrée = son nom de fichier sans extension (ex. "parasite").
const generateId = ({ entry }: { entry: string }) => basename(entry).replace(/\.md$/, '');

// Un champ laissé vide dans le frontmatter (`date:`) vaut null : on le traite comme absent.
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => v ?? undefined, schema.optional());

// Saison d'une série : `episodes` est un nombre d'épisodes, ou la liste de leurs titres.
const season = z
  .object({
    number: z.number().int().positive().optional(), // numéro (par défaut : position dans la liste)
    title: optional(z.string()),                     // nom de la saison, s'il y en a un
    firstAired: optional(z.coerce.date()),           // début de diffusion
    lastAired: optional(z.coerce.date()),            // fin de diffusion (vide si en cours)
    episodes: z.union([z.number().int().positive(), z.array(z.string().nullable()).nonempty()]),
    poster: optional(z.string()),                    // affiche de la saison : URL ou chemin dans /public
  })
  .transform(({ episodes, ...s }) => ({
    ...s,
    episodes: typeof episodes === 'number' ? episodes : episodes.length,
    titles: typeof episodes === 'number' ? [] : episodes.map((t) => t || undefined),
  }));

// Fiche d'œuvre : stable, une seule par film, livre ou série.
const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works', generateId }),
  schema: z
    .object({
      title: z.string(),                // titre français
      originalTitle: z.preprocess((v) => v || undefined, z.string().optional()), // titre original, si différent
      type: z.enum(['film', 'livre', 'serie']),
      creator: z.string().optional(),   // auteur (livres), créateur·ice (séries)
      director: z.string().optional(),  // réalisateur (films)
      year: optional(z.number().int()), // année de sortie / de publication (séries : déduite de `firstAired`)
      firstAired: optional(z.coerce.date()), // début de diffusion (séries)
      lastAired: optional(z.coerce.date()),  // fin de diffusion (séries) : vide si toujours diffusée
      runtime: z.number().int().positive().optional(), // durée en minutes (films)
      originalLanguage: z.string().optional(), // langue originale (livres), ex. « français »
      poster: z.string().optional(),    // affiche (films, séries) : URL ou chemin dans /public
      backdrop: z.string().optional(),  // image de fond (films, séries) : URL ou chemin dans /public
      cover: z.string().optional(),     // couverture (livres) : URL ou chemin dans /public
      seasons: z.array(season).default([]), // saisons (séries)
      tags: z.array(z.string()).default([]),
    })
    .superRefine((w, ctx) => {
      if (w.type === 'film' && !w.director && !w.creator) {
        ctx.addIssue({ code: 'custom', path: ['director'], message: 'Un film doit avoir un `director`.' });
      }
      if (w.type !== 'film' && !w.creator) {
        ctx.addIssue({ code: 'custom', path: ['creator'], message: `Un${w.type === 'serie' ? 'e série' : ' livre'} doit avoir un \`creator\`.` });
      }
      if (w.year === undefined && !(w.type === 'serie' && w.firstAired)) {
        ctx.addIssue({ code: 'custom', path: ['year'], message: w.type === 'serie' ? 'Une série doit avoir un `firstAired` (ou une `year`).' : '`year` manquant.' });
      }
      if (w.type !== 'serie' && w.seasons.length) {
        ctx.addIssue({ code: 'custom', path: ['seasons'], message: 'Seule une série a des `seasons`.' });
      }
      const numbers = w.seasons.map((s, i) => s.number ?? i + 1);
      if (new Set(numbers).size !== numbers.length) {
        ctx.addIssue({ code: 'custom', path: ['seasons'], message: 'Deux saisons portent le même numéro.' });
      }
      for (const [i, s] of [w, ...w.seasons].entries()) {
        if (s.firstAired && s.lastAired && s.firstAired > s.lastAired) {
          ctx.addIssue({ code: 'custom', path: i ? ['seasons', i - 1, 'firstAired'] : ['firstAired'], message: '`firstAired` doit précéder `lastAired`.' });
        }
      }
    })
    // `creator` reste le champ commun lu par les pages : réalisateur pour un film, auteur pour un livre.
    // Un titre original identique au titre français n'est pas affiché.
    .transform((w) => ({
      ...w,
      creator: (w.type === 'film' ? w.director ?? w.creator : w.creator)!,
      originalTitle: w.originalTitle !== w.title ? w.originalTitle : undefined,
      year: (w.year ?? w.firstAired?.getUTCFullYear())!,
      seasons: w.seasons.map((s, i) => ({ ...s, number: s.number ?? i + 1 })),
    })),
});

// Épisodes vus : `3`, `[1, 2]`, `"4-7"` ou `"1-3, 5"`.
const episodes = z
  .union([z.number().int().positive(), z.string(), z.array(z.union([z.number().int().positive(), z.string()]))])
  .transform((v, ctx) => {
    const list: number[] = [];
    for (const part of (Array.isArray(v) ? v : [v]).flatMap((p) => String(p).split(','))) {
      const m = part.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
      const [from, to] = m ? [Number(m[1]), Number(m[2] ?? m[1])] : [0, -1];
      if (!m || from < 1 || to < from) {
        ctx.addIssue({ code: 'custom', message: `Épisodes illisibles : « ${part.trim()} » (ex. 3, [1, 2] ou "4-7").` });
        return z.NEVER;
      }
      for (let n = from; n <= to; n++) list.push(n);
    }
    return list;
  });

// Entrée de journal : un visionnage, une lecture ou une saison de série, avec ton avis.
const logs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/logs', generateId }),
  schema: z
    .object({
      work: reference('works'),
      season: optional(z.number().int().positive()), // saison suivie (séries) ; absente pour un avis sur toute la série
      watched: z.array(z.object({ date: z.coerce.date(), episodes })).default([]), // épisodes vus, jour par jour (saisons)
      started: optional(z.coerce.date()),       // début de lecture (livres)
      date: optional(z.coerce.date()),          // date du visionnage / de la fin de lecture (absente si lecture en cours)
      rating: optional(z.number().min(0).max(5).multipleOf(0.5)), // absente si lecture en cours
      repeat: z.boolean().default(false),      // revisionnage / relecture
      spoilers: z.boolean().default(false),
      venue: z.enum(['cinema', 'maison']).optional(), // lieu du visionnage (films)
      accompanied: z.boolean().optional(),     // visionnage accompagné ou seul (films, séries)
      version: z.enum(['vf', 'vostfr']).optional(), // version vue (films, séries)
      language: optional(z.string()),          // langue de lecture (livres), ex. « français »
      summary: z.string().optional(),          // phrase d'accroche (listes, RSS)
    })
    .superRefine((l, ctx) => {
      if (!l.date && !l.started && !l.watched.length) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: 'Une entrée doit avoir une `date` (fin), un `started` (début de lecture) ou des épisodes `watched`.' });
      }
      if (l.started && l.date && l.started > l.date) {
        ctx.addIssue({ code: 'custom', path: ['started'], message: '`started` doit précéder `date`.' });
      }
      if (l.watched.length && l.season === undefined) {
        ctx.addIssue({ code: 'custom', path: ['season'], message: 'Des épisodes `watched` doivent préciser leur `season`.' });
      }
    })
    // Les jours de visionnage dans l'ordre chronologique.
    .transform((l) => ({ ...l, watched: l.watched.toSorted((a, b) => a.date.getTime() - b.date.getTime()) })),
});

export const collections = { works, logs };
