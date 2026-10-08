import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { basename } from 'node:path';

// L'identifiant d'une entrée = son nom de fichier sans extension (ex. "parasite").
const generateId = ({ entry }: { entry: string }) => basename(entry).replace(/\.md$/, '');

// Fiche d'œuvre : stable, une seule par film ou livre.
const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works', generateId }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['film', 'livre']),
    creator: z.string(),            // réalisateur ou auteur
    year: z.number().int(),         // année de sortie / de publication
    cover: z.string().optional(),   // URL ou chemin dans /public
    tags: z.array(z.string()).default([]),
  }),
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
    summary: z.string().optional(),          // phrase d'accroche (listes, RSS)
  }),
});

export const collections = { works, logs };
