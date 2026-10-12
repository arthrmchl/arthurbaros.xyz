import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getJournal, href, excerpt, abandonedLabel, fmtRating, typeLabel, logDate, seasonLabel } from '../lib/content';
import { site } from '../lib/site';

export async function GET(context: APIContext) {
  const journal = await getJournal();
  return rss({
    title: site.name,
    description: site.description,
    site: context.site!,
    items: journal.slice(0, 50).map(({ log, work, season }) => ({
      title: `${work.data.title}${season && seasonLabel(season) ? `, ${seasonLabel(season)}` : ''} (${typeLabel[work.data.type]}, ${log.data.rating !== undefined ? fmtRating(log.data.rating) : log.data.abandoned ? abandonedLabel(season).toLowerCase() : log.data.date ? 'sans note' : 'en cours'})`,
      pubDate: logDate(log.data),
      // Accroche (ou début de la review) en résumé, et la review complète pour les lecteurs de flux.
      description: log.data.summary || excerpt(log.body),
      content: log.rendered?.html,
      link: href(`/journal/${log.id}/`),
    })),
  });
}
