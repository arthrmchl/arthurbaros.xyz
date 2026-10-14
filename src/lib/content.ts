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

/** Précision d'une date d'entrée : `2026` (année), `2026-10` (mois) ou `2026-10-08` (jour). */
export type DatePrecision = 'year' | 'month' | 'day';
/** « 8 octobre 2026 », « octobre 2026 » ou « 2026 », selon la précision connue. */
export const fmtDate = (d: Date, precision: DatePrecision = 'day') =>
  precision === 'year' ? String(d.getUTCFullYear())
  : d.toLocaleDateString('fr-FR', { ...(precision === 'day' ? { day: 'numeric' } : {}), month: 'long', year: 'numeric', timeZone: 'UTC' });
/** « le 8 octobre 2026 », « en octobre 2026 » ou « en 2026 ». */
export const fmtOn = (d: Date, precision: DatePrecision = 'day') => `${precision === 'day' ? 'le' : 'en'} ${fmtDate(d, precision)}`;
/** `2026-10-08`, `2026-10` ou `2026` : attribut `datetime` d'une balise <time>, données structurées. */
export const isoDate = (d: Date, precision: DatePrecision = 'day') =>
  d.toISOString().slice(0, { year: 4, month: 7, day: 10 }[precision]);
/** 132 -> « 2 h 12 » */
export const fmtRuntime = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
};
/** « 8 oct. » : date courte pour les légendes d'affiches. */
export const fmtShortDate = (d: Date, precision: DatePrecision = 'day') =>
  precision === 'year' ? String(d.getUTCFullYear())
  : d.toLocaleDateString('fr-FR', precision === 'day' ? { day: 'numeric', month: 'short', timeZone: 'UTC' } : { month: 'short', year: 'numeric', timeZone: 'UTC' });
/** Du 3 au 8 octobre 2026 / du 28 septembre au 8 octobre 2026 : on ne répète pas le mois ni l'année. */
export const fmtRange = (from: Date, to: Date) => {
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  const sameMonth = sameYear && from.getUTCMonth() === to.getUTCMonth();
  const start = sameMonth
    ? String(from.getUTCDate())
    : from.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' });
  return `du ${start} au ${fmtDate(to)}`;
};
/**
 * Période d'une entrée : « le 8 octobre 2026 », « du 3 au 8 octobre 2026 », ou « depuis le 3 octobre 2026 » si elle est en cours.
 * Une date de fin imprécise s'affiche seule : « en octobre 2026 », « en 2026 ».
 */
export const fmtPeriod = (l: { started?: Date; date?: Date; datePrecision?: DatePrecision }) =>
  l.started && l.date && l.datePrecision === 'day' && l.started.getTime() !== l.date.getTime() ? fmtRange(l.started, l.date)
  : l.date ? fmtOn(l.date, l.datePrecision)
  : `depuis le ${fmtDate(l.started!)}`;
/** « français » -> « Français » */
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtRating = (n: number) => `${n}/5`;
/** 3 -> « ★★★☆☆ » : toujours cinq symboles, pour qu'un 0 se distingue d'une absence de note. */
export const fmtStars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

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
/**
 * Nom de la saison si elle en a un, sinon « Saison 2 ».
 * Seule saison de la série : pas de numéro, seulement son nom si elle en a un (sinon rien).
 */
export const seasonLabel = (s: { number: number; title?: string; only: boolean }) =>
  s.title || (s.only ? undefined : `Saison ${s.number}`);
/** Suite d'un titre d'œuvre : « , saison 2 », « , Le titre », ou rien pour la seule saison d'une série sans nom. */
export const seasonSuffix = (s?: { number: number; title?: string; only: boolean }) => {
  const label = s && seasonLabel(s);
  return label ? `, ${s.title ? label : label.replace(/^Saison/, 'saison')}` : '';
};
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
/** L'entrée a un texte (review ou accroche) : sinon sa page n'est pas proposée aux moteurs de recherche (voir aussi astro.config.mjs). */
export const hasText = (log: { body?: string; data: { summary?: string } }) => Boolean(log.body?.trim() || log.data.summary?.trim());
/** Lecture commencée mais pas terminée. */
export const inProgress = (l: { date?: Date }) => !l.date;
/** « Affiche » ou « Couverture », selon le type d'œuvre (textes alternatifs). */
export const imageLabel = (type: string) => (type === 'livre' ? 'Couverture' : 'Affiche');
/** « Abandonné », « Abandonnée » (une saison). */
export const abandonedLabel = (season?: unknown) => (season ? 'Abandonnée' : 'Abandonné');

/** « David Lynch » -> « david-lynch », « comédie » -> « comedie » : identifiant d'URL. */
export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export type Season = CollectionEntry<'works'>['data']['seasons'][number];

/**
 * Saison suivie : sa fiche, et les épisodes vus (date du dernier passage pour chacun).
 * Le début et la fin du suivi se déduisent des jours de visionnage : la saison est terminée
 * quand tous ses épisodes ont été vus, ou plus tôt si elle est `abandoned` (la `date` est alors celle de l'arrêt).
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
  if (l.date && !complete && !l.abandoned) {
    const missing = Array.from({ length: season.episodes }, (_, i) => i + 1).filter((n) => !seen.has(n));
    fail(`une \`date\` de fin est donnée mais il manque les ${fmtEpisodes(missing)} : ajoute-les à \`watched\`, ou mets \`abandoned: true\` si tu as arrêté.`);
  }
  if (l.abandoned && complete) fail('tous les épisodes ont été vus : la saison ne peut pas être `abandoned`.');
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
    // Seule une lecture ou une saison peut être en cours : un visionnage a toujours une date, et une note s'il n'est pas abandonné.
    if (type === 'film' && (!log.data.date || (log.data.rating === undefined && !log.data.abandoned))) {
      fail('un visionnage doit avoir une `date` et une `rating` (ou `abandoned: true`).');
    }
    if (type === 'serie' && log.data.season === undefined && log.data.abandoned) {
      fail('un avis sur une série entière ne peut pas être `abandoned` : précise la `season` arrêtée.');
    }
    if (type !== 'serie' && log.data.season !== undefined) fail('seule une série a des saisons (`season`).');
    if (type === 'serie' && log.data.season === undefined && !log.data.date) {
      fail('un avis sur une série entière doit avoir une `date` (ou précise une `season`).');
    }
    if (type !== 'serie' || log.data.season === undefined) return { log, work, season: undefined };
    const { data, season } = followSeason(log, work);
    return { log: { ...log, data }, work, season };
  });
  journal.sort((a, b) => logDate(b.log.data).getTime() - logDate(a.log.data).getTime());
  warnMissingRepeats(journal);
  return journal;
}

/** Une entrée du journal, reliée à sa fiche (et à sa saison pour une série). */
export type JournalEntry = Awaited<ReturnType<typeof getJournal>>[number];

const warned = new Set<string>();
/**
 * Revisionnage oublié : une entrée plus ancienne existe pour la même œuvre (ou la même saison) mais `repeat` n'est pas coché.
 * Simple avertissement, une seule fois par entrée : le premier passage peut dater d'avant le journal.
 * Les avis sur une série entière ne comptent pas.
 */
function warnMissingRepeats(journal: { log: { id: string; data: { repeat: boolean } }; work: CollectionEntry<'works'>; season?: Season }[]) {
  const seen = new Set<string>();
  for (const { log, work, season } of journal.toReversed()) {
    if (work.data.type === 'serie' && !season) continue;
    const key = `${work.id}/${season?.number ?? ''}`;
    if (seen.has(key) && !log.data.repeat && !warned.has(log.id)) {
      warned.add(log.id);
      console.warn(`⚠ logs/${log.id} : ${work.data.title}${seasonSuffix(season)} a déjà une entrée plus ancienne. Revisionnage ou relecture ? Ajoute \`repeat: true\`.`);
    }
    seen.add(key);
  }
}

/** La plus récente entrée de chaque œuvre (le journal étant trié de la plus récente à la plus ancienne). */
export const latestByWork = <T extends { work: { id: string } }>(journal: T[]) => {
  const seen = new Set<string>();
  return journal.filter(({ work }) => !seen.has(work.id) && Boolean(seen.add(work.id)));
};
/**
 * Œuvres pour une grille d'affiches, avec la dernière note donnée : les plus récemment vues ou lues d'abord,
 * puis celles qui n'ont pas encore d'entrée (à voir, à lire) par ordre alphabétique.
 */
export const workItems = (works: CollectionEntry<'works'>[], journal: { work: { id: string }; log: { data: { rating?: number } } }[]) => {
  const ids = new Set(works.map((w) => w.id));
  const latest = latestByWork(journal.filter(({ work }) => ids.has(work.id)));
  const byId = new Map(works.map((w) => [w.id, w]));
  const rating = (id: string) => journal.find((e) => e.work.id === id && e.log.data.rating !== undefined)?.log.data.rating;
  const seen = new Set(latest.map(({ work }) => work.id));
  return [
    ...latest.map(({ work }) => ({ work: byId.get(work.id)!, rating: rating(work.id) })),
    ...works.filter((w) => !seen.has(w.id)).sort((a, b) => a.data.title.localeCompare(b.data.title, 'fr')).map((work) => ({ work, rating: undefined })),
  ];
};
/**
 * Tri par date de sortie (publication, début de diffusion), de la plus récente à la plus ancienne, puis par titre.
 * Une date imprécise (`2026`, `2026-10`) passe après les dates plus précises de la même année ou du même mois.
 */
export const byRelease = (a: CollectionEntry<'works'>, b: CollectionEntry<'works'>) => {
  const key = ({ data: w }: CollectionEntry<'works'>) => {
    const r = w.released ?? (w.firstAired && { year: w.firstAired.getUTCFullYear(), month: w.firstAired.getUTCMonth() + 1, day: w.firstAired.getUTCDate() });
    return r ? r.year * 10000 + (r.month ?? 0) * 100 + (r.day ?? 0) : -Infinity;
  };
  return key(b) - key(a) || a.data.title.localeCompare(b.data.title, 'fr');
};
/** Années du journal, de la plus récente à la plus ancienne. */
export const journalYears = (journal: { log: { data: Parameters<typeof logDate>[0] } }[]) =>
  [...new Set(journal.map(({ log }) => logDate(log.data).getUTCFullYear()))].sort((a, b) => b - a);

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

/** Une image TMDB dans une autre taille (`w185`, `w1280`…) ; les autres URL restent telles quelles. */
export const tmdb = (url: string, size: string) => url.replace(/^(https:\/\/image\.tmdb\.org\/t\/p\/)[^/]+\//, `$1${size}/`);
/** Image de fond : la version « original » de TMDB est trop lourde, 1280 px suffisent (page et partage de liens). */
export const backdropImage = (url?: string) => url && tmdb(url, 'w1280');
/**
 * Attributs d'une affiche ou couverture : pour une image TMDB, plusieurs tailles au choix du navigateur
 * selon `sizes`, la largeur affichée (ex. « 9rem »).
 */
export const posterImage = (url: string, sizes: string) =>
  url.startsWith('https://image.tmdb.org/')
    ? { src: tmdb(url, 'w500'), srcset: ['w185', 'w342', 'w500'].map((s) => `${tmdb(url, s)} ${s.slice(1)}w`).join(', '), sizes }
    : { src: url };
