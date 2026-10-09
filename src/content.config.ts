import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { basename } from 'node:path';

// L'identifiant d'une entrée = son nom de fichier sans extension (ex. "parasite").
const generateId = ({ entry }: { entry: string }) => basename(entry).replace(/\.md$/, '');

// Fiche d'œuvre : stable, une seule par film ou livre.
const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works', generateId }),
  schema: z
    .object({
      title: z.string(),
      type: z.enum(['film', 'livre']),
      creator: z.string().optional(),   // auteur (livres)
      director: z.string().optional(),  // réalisateur (films)
      year: z.number().int(),           // année de sortie / de publication
      runtime: z.number().int().positive().optional(), // durée en minutes (films)
      poster: z.string().optional(),    // affiche (films) : URL ou chemin dans /public
      backdrop: z.string().optional(),  // image de fond (films) : URL ou chemin dans /public
      cover: z.string().optional(),     // couverture (livres) : URL ou chemin dans /public
      tags: z.array(z.string()).default([]),
    })
    .superRefine((w, ctx) => {
      if (w.type === 'film' && !w.director && !w.creator) {
        ctx.addIssue({ code: 'custom', path: ['director'], message: 'Un film doit avoir un `director`.' });
      }
      if (w.type === 'livre' && !w.creator) {
        ctx.addIssue({ code: 'custom', path: ['creator'], message: 'Un livre doit avoir un `creator`.' });
      }
    })
    // `creator` reste le champ commun lu par les pages : réalisateur pour un film, auteur pour un livre.
    .transform((w) => ({ ...w, creator: (w.type === 'film' ? w.director ?? w.creator : w.creator)! })),
});

// Entrée de journal : un visionnage ou une lecture, avec ton avis.
const logs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/logs', generateId }),
  schema: z.object({
    work: reference('works'),
    date: z.coerce.date(),                   // date du visionnage / de la fin de lecture
    rating: z.number().min(0).max(5).multipleOf(0.5),
    repeat: z.boolean().default(false),      // revisionnage / relecture
    spoilers: z.boolean().default(false),
    venue: z.enum(['cinema', 'maison']).optional(), // lieu du visionnage (films)
    accompanied: z.boolean().optional(),     // visionnage accompagné ou seul (films)
    summary: z.string().optional(),          // phrase d'accroche (listes, RSS)
  }),
});

export const collections = { works, logs };
