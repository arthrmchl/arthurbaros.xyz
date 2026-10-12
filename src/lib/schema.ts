// Données structurées schema.org (JSON-LD) : décrivent les œuvres et les reviews aux moteurs de recherche,
// qui peuvent alors afficher la note sous le lien.
import type { CollectionEntry } from 'astro:content';
import { href, excerpt, slugify, type Season } from './content';
import { site } from './site';

type Work = CollectionEntry<'works'>;
type Log = { id: string; body?: string; data: { date?: Date; started?: Date; rating?: number; summary?: string } };

const schemaType = { film: 'Movie', livre: 'Book', serie: 'TVSeries' } as const;
const day = (d: Date) => d.toISOString().slice(0, 10);
/** URL absolue d'une page du site ou d'une image dans /public. */
const absolute = (path: string, origin: URL) => new URL(path.startsWith('/') ? href(path) : path, origin).href;
const persons = (names: string[], origin: URL) => names.map((name) => ({ '@type': 'Person', name, url: absolute(`/personnes/${slugify(name)}/`, origin) }));
/** `2026`, `2026-10` ou `2026-10-08` : la précision connue de la date de sortie. */
const isoReleased = (r: { year: number; month?: number; day?: number }) =>
  [String(r.year), r.month && String(r.month).padStart(2, '0'), r.day && String(r.day).padStart(2, '0')].filter(Boolean).join('-');

/** Une œuvre : Movie, Book ou TVSeries, avec ses créateurs, sa date de sortie et ses genres. */
export function workSchema(work: Work, origin: URL) {
  const w = work.data;
  const image = w.poster;
  return {
    '@type': schemaType[w.type],
    name: w.title,
    ...(w.originalTitle ? { alternateName: w.originalTitle } : {}),
    url: absolute(`/oeuvres/${work.id}/`, origin),
    ...(image ? { image: absolute(image, origin) } : {}),
    [{ film: 'director', livre: 'author', serie: 'creator' }[w.type]]: persons(w.creators, origin),
    datePublished: w.released ? isoReleased(w.released) : day(w.firstAired!),
    ...(w.tags.length ? { genre: w.tags } : {}),
    ...(w.runtime ? { duration: `PT${w.runtime}M` } : {}),
    ...(w.seasons.length ? { numberOfSeasons: w.seasons.length, numberOfEpisodes: w.seasons.reduce((n, s) => n + s.episodes, 0) } : {}),
  };
}

/** Fiche d'œuvre. */
export const workPageSchema = (work: Work, origin: URL) => ({ '@context': 'https://schema.org', ...workSchema(work, origin) });

/** Review notée d'une œuvre ou d'une saison ; rien pour une entrée sans note (lecture ou saison en cours). */
export function reviewSchema(log: Log, work: Work, season: Season | undefined, origin: URL) {
  const l = log.data;
  if (l.rating === undefined) return undefined;
  const item = workSchema(work, origin);
  const body = l.summary || excerpt(log.body, 500);
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    url: absolute(`/journal/${log.id}/`, origin),
    inLanguage: 'fr',
    author: { '@type': 'Person', name: site.author, url: absolute('/a-propos/', origin) },
    datePublished: day((l.date ?? l.started)!),
    itemReviewed: season
      ? { '@type': 'TVSeason', name: season.title ?? `Saison ${season.number}`, seasonNumber: season.number, numberOfEpisodes: season.episodes, partOfSeries: item }
      : item,
    reviewRating: { '@type': 'Rating', ratingValue: l.rating, bestRating: 5, worstRating: 0 },
    ...(body ? { reviewBody: body } : {}),
  };
}
