import { getCollection } from 'astro:content';

export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const href = (path: string) => `${base}${path}`;

export const typeLabel = { film: 'Film', livre: 'Livre' } as const;
export const typeRoute = { film: 'films', livre: 'livres' } as const;
export const verb = { film: 'Vu', livre: 'Lu' } as const;

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
/** 132 -> « 2 h 12 » */
export const fmtRuntime = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
};
export const fmtRating = (n: number) => `${String(n).replace('.', ',')}/5`;

/** Toutes les entrées de journal, reliées à leur fiche d'œuvre, de la plus récente à la plus ancienne. */
export async function getJournal() {
  const [logs, works] = await Promise.all([getCollection('logs'), getCollection('works')]);
  const byId = new Map(works.map((w) => [w.id, w]));
  return logs
    .map((log) => ({ log, work: byId.get(log.data.work.id)! }))
    .sort((a, b) => b.log.data.date.getTime() - a.log.data.date.getTime());
}
