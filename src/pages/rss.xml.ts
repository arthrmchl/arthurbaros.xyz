import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getJournal, href, fmtRating, typeLabel } from '../lib/content';

export async function GET(context: APIContext) {
  const journal = await getJournal();
  return rss({
    title: 'Journal de bord',
    description: 'Mes avis sur les films et les livres.',
    site: context.site!,
    items: journal.slice(0, 50).map(({ log, work }) => ({
      title: `${work.data.title} (${typeLabel[work.data.type]}, ${fmtRating(log.data.rating)})`,
      pubDate: log.data.date,
      description: log.data.summary ?? '',
      link: href(`/journal/${log.id}/`),
    })),
  });
}
