import { getCollection } from 'astro:content';

export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const href = (path: string) => `${base}${path}`;

export const typeLabel = { film: 'Film', livre: 'Livre' } as const;
export const typeRoute = { film: 'films', livre: 'livres' } as const;
export const verb = { film: 'Vu', livre: 'Lu' } as const;
/** Fiches sans entrée de journal : œuvres qu'on souhaite découvrir. */
export const todoLabel = { film: 'À voir', livre: 'À lire' } as const;
export const venueLabel = { cinema: 'Au cinéma', maison: 'À la maison' } as const;
export const versionLabel = { vf: 'VF', vostfr: 'VOSTFR' } as const;

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
/** 132 -> « 2 h 12 » */
export const fmtRuntime = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
};
/** « 8 oct. » : date courte pour les légendes d'affiches. */
export const fmtShortDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
/** Du 3 au 8 octobre 2026 / du 28 septembre au 8 octobre 2026 : on ne répète pas le mois ni l'année. */
export const fmtRange = (from: Date, to: Date) => {
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  const sameMonth = sameYear && from.getUTCMonth() === to.getUTCMonth();
  const start = sameMonth
    ? String(from.getUTCDate())
    : from.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' });
  return `du ${start} au ${fmtDate(to)}`;
};
/** « français » -> « Français » */
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtRating = (n: number) => `${String(n).replace('.', ',')}/5`;
/** 3.5 -> « ★★★½ » (à la Letterboxd) */
export const fmtStars = (n: number) => '★'.repeat(Math.floor(n)) + (n % 1 ? '½' : '');

/** Date de référence d'une entrée (tri, bilans) : la fin, ou le début pour une lecture en cours. */
export const logDate = (l: { date?: Date; started?: Date }) => (l.date ?? l.started)!;
/** Lecture commencée mais pas terminée. */
export const inProgress = (l: { date?: Date }) => !l.date;

/** Toutes les entrées de journal, reliées à leur fiche d'œuvre, de la plus récente à la plus ancienne. */
export async function getJournal() {
  const [logs, works] = await Promise.all([getCollection('logs'), getCollection('works')]);
  const byId = new Map(works.map((w) => [w.id, w]));
  const journal = logs.map((log) => ({ log, work: byId.get(log.data.work.id)! }));
  // Seule une lecture peut être en cours : un visionnage a toujours une date et une note.
  for (const { log, work } of journal) {
    if (work.data.type === 'film' && (!log.data.date || log.data.rating === undefined)) {
      throw new Error(`logs/${log.id} : un visionnage doit avoir une \`date\` et une \`rating\`.`);
    }
  }
  return journal.sort((a, b) => logDate(b.log.data).getTime() - logDate(a.log.data).getTime());
}

/** Début d'un texte Markdown en texte brut, coupé proprement vers `max` caractères (aperçus de liens). */
export const excerpt = (markdown = '', max = 200) => {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')       // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // liens -> leur texte
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // titres, citations, listes
    .replace(/[*_`~]+/g, '')                    // emphase, code
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.–-]+$/, '')}…`;
};

/** Image adaptée au partage de liens : les backdrops TMDB « original » sont trop lourds, on prend la version 1280 px. */
export const shareImage = (url?: string) => url?.replace('/t/p/original/', '/t/p/w1280/');
