import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { basename } from 'node:path';
import { genres, type Genre } from './lib/genres';

// L'identifiant d'une entrée = son nom de fichier sans extension (ex. "parasite").
const generateId = ({ entry }: { entry: string }) => basename(entry).replace(/\.md$/, '');

// Un champ laissé vide dans le frontmatter (`date:`) vaut null : on le traite comme absent.
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => v ?? undefined, schema.optional());

// Date de sortie / de publication, plus ou moins précise : `2026`, `2026-10` ou `2026-10-08`
// (une année négative pour l'Antiquité : `-800`).
const released = z
  .union([z.number().int(), z.string(), z.date()])
  .transform((v, ctx) => {
    if (v instanceof Date) return { year: v.getUTCFullYear(), month: v.getUTCMonth() + 1, day: v.getUTCDate() };
    const m = String(v).trim().match(/^(-?\d+)(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/);
    const [year, month, day] = m ? [Number(m[1]), m[2] && Number(m[2]), m[3] && Number(m[3])] : [];
    const days = month ? new Date(Date.UTC(2000, month, 0)).getUTCDate() : 0; // 2000 : bissextile, le 29 février passe
    if (!m || (month && (month < 1 || month > 12)) || (day && (day < 1 || day > days))) {
      ctx.addIssue({ code: 'custom', message: `Date illisible : « ${v} » (ex. 2026, 2026-10 ou 2026-10-08).` });
      return z.NEVER;
    }
    return { year: year!, month: month || undefined, day: day || undefined };
  });

// Précision d'une date d'entrée de journal : `2026` (année), `2026-10` (mois) ou `2026-10-08` (jour).
type DatePrecision = 'year' | 'month' | 'day';
const toDate = (r: { year: number; month?: number; day?: number }) => {
  const d = new Date(Date.UTC(2000, (r.month ?? 1) - 1, r.day ?? 1));
  d.setUTCFullYear(r.year);
  return d;
};
// Dernier jour de la période : le 31 décembre pour une année, le dernier jour du mois pour un mois.
const periodEnd = (d: Date, precision: DatePrecision) =>
  precision === 'day' ? d
  : new Date(Date.UTC(d.getUTCFullYear(), precision === 'year' ? 12 : d.getUTCMonth() + 1, 0));

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

// Genre d'une fiche : dans la liste fermée de src/lib/genres.ts.
const genre = z.string().refine((g): g is Genre => (genres as readonly string[]).includes(g), (g) => ({
  message: `Genre inconnu : « ${g} ». Genres possibles : ${genres.join(', ')} (liste dans src/lib/genres.ts).`,
}));

// Un champ inconnu (faute de frappe, ancien nom comme `director` ou `cover`) fait échouer le build plutôt que d'être ignoré.
const strict: z.ZodErrorMap = (issue, ctx) => issue.code === 'unrecognized_keys'
  ? { message: `Champ inconnu : ${issue.keys.map((k) => `\`${k}\``).join(', ')}. Vérifie son nom (modèles dans src/content/templates/).` }
  : { message: ctx.defaultError };

// Fiche d'œuvre : stable, une seule par film, livre ou série.
const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works', generateId }),
  schema: z
    .object({
      title: z.string(),                // titre français
      originalTitle: z.preprocess((v) => v || undefined, z.string().optional()), // titre original, si différent
      type: z.enum(['film', 'livre', 'serie']),
      creators: z.array(z.string().min(1)).nonempty('Ajoute au moins un nom dans `creators`.'), // réalisateur·ices, auteur·ices ou créateur·ices
      released: optional(released),     // sortie (films) / publication (livres) : `2026`, `2026-10` ou `2026-10-08`
      firstAired: optional(z.coerce.date()), // début de diffusion (séries)
      lastAired: optional(z.coerce.date()),  // fin de diffusion (séries) : vide si toujours diffusée
      runtime: z.number().int().positive().optional(), // durée en minutes (films)
      originalLanguage: z.string().optional(), // langue originale (livres), ex. « français »
      poster: z.string().optional(),    // affiche (films, séries) ou couverture (livres) : URL ou chemin dans /public
      backdrop: z.string().optional(),  // image de fond (films, séries) : URL ou chemin dans /public
      seasons: z.array(season).default([]), // saisons (séries)
      tags: z.array(genre).default([]), // genres, dans la liste de src/lib/genres.ts
    }, { errorMap: strict })
    .strict()
    .superRefine((w, ctx) => {
      if (w.released === undefined && !(w.type === 'serie' && w.firstAired)) {
        ctx.addIssue({ code: 'custom', path: ['released'], message: w.type === 'serie' ? 'Une série doit avoir un `firstAired` (ou un `released`).' : '`released` manquant (ex. 2026, 2026-10 ou 2026-10-08).' });
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
    // `creator` : les noms à la suite, pour les affichages en texte (« Mark Frost, David Lynch »).
    // Un titre original identique au titre français n'est pas affiché.
    // `year` (année de sortie, de publication ou de début de diffusion) sert aux affichages courts.
    // `only` : seule saison de la série, dont le numéro n'est alors jamais affiché.
    .transform((w) => ({
      ...w,
      creator: w.creators.join(', '),
      originalTitle: w.originalTitle !== w.title ? w.originalTitle : undefined,
      year: (w.released?.year ?? w.firstAired?.getUTCFullYear())!,
      seasons: w.seasons.map((s, i) => ({ ...s, number: s.number ?? i + 1, only: w.seasons.length === 1 })),
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
      date: optional(released),                 // date du visionnage / de la fin de lecture (absente si lecture en cours) : `2026`, `2026-10` ou `2026-10-08`
      rating: optional(z.number().int('La note est un nombre entier de 0 à 5.').min(0).max(5)), // absente si lecture en cours
      abandoned: z.boolean().default(false),   // arrêté avant la fin : la `date` est celle de l'arrêt
      repeat: z.boolean().default(false),      // revisionnage / relecture
      spoilers: z.boolean().default(false),
      venue: z.enum(['cinema', 'maison']).optional(), // lieu du visionnage (films)
      accompanied: z.boolean().optional(),     // visionnage accompagné ou seul (films, séries)
      version: z.enum(['vf', 'vostfr']).optional(), // version vue (films, séries)
      language: optional(z.string()),          // langue de lecture (livres), ex. « français »
      summary: z.string().optional(),          // phrase d'accroche (listes, RSS)
    }, { errorMap: strict })
    .strict()
    // `date` devient le premier jour de la période connue (tri, bilans) ; `datePrecision` dit ce qui est connu, pour l'affichage.
    .transform(({ date, ...l }) => ({
      ...l,
      date: date && toDate(date),
      datePrecision: (!date || date.day ? 'day' : date.month ? 'month' : 'year') as DatePrecision,
    }))
    .superRefine((l, ctx) => {
      if (l.abandoned && !l.date) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: 'Une entrée `abandoned` doit avoir une `date` (le jour de l’arrêt).' });
      }
      if (!l.date && !l.started && !l.watched.length) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: 'Une entrée doit avoir une `date` (fin), un `started` (début de lecture) ou des épisodes `watched`.' });
      }
      if (l.started && l.date && l.started > periodEnd(l.date, l.datePrecision)) {
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
