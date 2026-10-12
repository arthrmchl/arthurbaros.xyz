import { getCollection, type CollectionEntry } from 'astro:content';

export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const href = (path: string) => `${base}${path}`;

export const typeLabel = { film: 'Film', livre: 'Livre', serie: 'Série' } as const;
export const typeRoute = { film: 'films', livre: 'livres', serie: 'series' } as const;
export const verb = { film: 'Vu', livre: 'Lu', serie: 'Vu' } as const;
/** Fiches sans entrée de journal : œuvres qu'on souhaite découvrir. */
export const todoLabel = { film: 'À voir', livre: 'À lire', serie: 'À voir' } as const;
/** Revisionnage / relecture, selon le type d'œuvre. */
export const repeatLabel = { film: 'Revisionnage', livre: 'Relecture', serie: 'Revisionnage' } as const;
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

/** « 2022–2025 », « depuis 2022 » : années de diffusion d'une série ; l'année seule sinon. */
export const fmtYears = (w: { year: number; type: string; firstAired?: Date; lastAired?: Date }) => {
  if (w.type !== 'serie' || !w.firstAired) return String(w.year);
  const from = w.firstAired.getUTCFullYear(), to = w.lastAired?.getUTCFullYear();
  return to === undefined ? `${from}–` : to === from ? String(from) : `${from}–${to}`;
};
/** « Diffusée du 18 février au 8 avril 2022 », « Diffusée depuis le 18 février 2022 ». */
export const fmtAired = (s: { firstAired?: Date; lastAired?: Date }) =>
  !s.firstAired ? undefined
  : !s.lastAired ? `Diffusée depuis le ${fmtDate(s.firstAired)}`
  : s.firstAired.getTime() === s.lastAired.getTime() ? `Diffusée le ${fmtDate(s.firstAired)}`
  : `Diffusée ${fmtRange(s.firstAired, s.lastAired)}`;
/** « Sorti le 8 octobre 2026 », « Publié en mars 1890 » ; rien si seule l'année est connue (elle s'affiche déjà ailleurs). */
export const fmtReleased = (w: { type: string; released?: { year: number; month?: number; day?: number } }) => {
  const r = w.released;
  if (!r?.month) return undefined;
  const d = new Date(Date.UTC(2000, r.month - 1, r.day ?? 1));
  d.setUTCFullYear(r.year);
  const verb = w.type === 'livre' ? 'Publié' : 'Sorti';
  return r.day ? `${verb} le ${fmtDate(d)}` : `${verb} en ${d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
};
/** « Saison 2 », ou « Saison 2 : Le titre » si la saison a un nom. */
export const seasonLabel = (s: { number: number; title?: string }) => `Saison ${s.number}${s.title ? ` : ${s.title}` : ''}`;
/** [1, 2, 3, 5] -> « épisodes 1 à 3 et 5 » */
export const fmtEpisodes = (list: number[]) => {
  const nums = [...new Set(list)].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (nums[j + 1] === nums[j] + 1) j++;
    runs.push(j === i ? String(nums[i]) : j === i + 1 ? `${nums[i]}, ${nums[j]}` : `${nums[i]} à ${nums[j]}`);
    i = j;
  }
  const text = runs.length > 1 ? `${runs.slice(0, -1).join(', ')} et ${runs.at(-1)}` : runs[0];
  return `${nums.length > 1 ? 'épisodes' : 'épisode'} ${text}`;
};

/** Date de référence d'une entrée (tri, bilans) : la fin, le dernier épisode vu d'une saison en cours, ou le début d'une lecture en cours. */
export const logDate = (l: { date?: Date; started?: Date; watched?: { date: Date }[] }) => (l.date ?? l.watched?.at(-1)?.date ?? l.started)!;
/** Lecture commencée mais pas terminée. */
export const inProgress = (l: { date?: Date }) => !l.date;

export type Season = CollectionEntry<'works'>['data']['seasons'][number];

/**
 * Saison suivie : sa fiche, et les épisodes vus (date du dernier passage pour chacun).
 * Le début et la fin du suivi se déduisent des jours de visionnage : la saison est terminée
 * quand tous ses épisodes ont été vus, ou plus tôt si une `date` de fin est donnée (abandon).
 */
function followSeason(log: CollectionEntry<'logs'>, work: CollectionEntry<'works'>) {
  const fail = (msg: string) => { throw new Error(`logs/${log.id} : ${msg}`); };
  const l = log.data;
  const season = work.data.seasons.find((s) => s.number === l.season)
    ?? fail(`la saison ${l.season} n'existe pas dans la fiche \`${work.id}\`.`);
  const seen = new Map<number, Date>();
  for (const { date, episodes } of l.watched) {
    for (const n of episodes) {
      if (n > season.episodes) fail(`l'épisode ${n} dépasse les ${season.episodes} épisodes de la saison ${season.number}.`);
      seen.set(n, date);
    }
  }
  const last = l.watched.at(-1)?.date;
  const complete = seen.size === season.episodes;
  return {
    data: { ...l, started: l.started ?? l.watched[0]?.date, date: l.date ?? (complete ? last : undefined) },
    season: { ...season, seen, complete },
  };
}

/** Toutes les entrées de journal, reliées à leur fiche d'œuvre, de la plus récente à la plus ancienne. */
export async function getJournal() {
  const [logs, works] = await Promise.all([getCollection('logs'), getCollection('works')]);
  const byId = new Map(works.map((w) => [w.id, w]));
  const journal = logs.map((log) => {
    const work = byId.get(log.data.work.id)!;
    const type = work.data.type;
    const fail = (msg: string) => { throw new Error(`logs/${log.id} : ${msg}`); };
    // Seule une lecture ou une saison peut être en cours : un visionnage a toujours une date et une note.
    if (type === 'film' && (!log.data.date || log.data.rating === undefined)) {
      fail('un visionnage doit avoir une `date` et une `rating`.');
    }
    if (type !== 'serie' && log.data.season !== undefined) fail('seule une série a des saisons (`season`).');
    if (type === 'serie' && log.data.season === undefined && !log.data.date) {
      fail('un avis sur une série entière doit avoir une `date` (ou précise une `season`).');
    }
    if (type !== 'serie' || log.data.season === undefined) return { log, work, season: undefined };
    const { data, season } = followSeason(log, work);
    return { log: { ...log, data }, work, season };
  });
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
