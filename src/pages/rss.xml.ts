import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getJournal, href, fmtRating, typeLabel, logDate } from '../lib/content';

export async function GET(context: APIContext) {
  const journal = await getJournal();
  return rss({
    title: 'Journal de bord',
    description: 'Mes avis sur les films et les livres.',
    site: context.site!,
    items: journal.slice(0, 50).map(({ log, work }) => ({
      title: `${work.data.title} (${typeLabel[work.data.type]}, ${log.data.rating !== undefined ? fmtRating(log.data.rating) : 'en cours'})`,
      pubDate: logDate(log.data),
      description: log.data.summary ?? '',
      link: href(`/journal/${log.id}/`),
    })),
  });
}
