// Convertit un texte en tracé SVG à partir d'un fichier TrueType, avec le crénage de la police (GPOS « kern »).
// Évite de dépendre des polices installées : sur macOS, le rendu SVG de sharp ignore les polices hors système.
import { readFileSync } from 'node:fs';

export function loadFont(file) {
  const buf = readFileSync(file);
  const u16 = (o) => buf.readUInt16BE(o), i16 = (o) => buf.readInt16BE(o), u32 = (o) => buf.readUInt32BE(o);
  const tables = {};
  for (let i = 0; i < u16(4); i++) tables[buf.toString('latin1', 12 + 16 * i, 16 + 16 * i)] = u32(20 + 16 * i);

  const unitsPerEm = u16(tables.head + 18), longLoca = i16(tables.head + 50) === 1;
  const ascender = i16(tables.hhea + 4), descender = i16(tables.hhea + 6), numHMetrics = u16(tables.hhea + 34);
  const advance = (g) => u16(tables.hmtx + 4 * Math.min(g, numHMetrics - 1));
  const loca = (g) => longLoca ? u32(tables.loca + 4 * g) : u16(tables.loca + 2 * g) * 2;

  // cmap : sous-table Unicode BMP (format 4).
  let cmap4;
  for (let i = 0; i < u16(tables.cmap + 2); i++) {
    const rec = tables.cmap + 4 + 8 * i, sub = tables.cmap + u32(rec + 4);
    if (u16(rec) === 3 && u16(rec + 2) === 1 && u16(sub) === 4) cmap4 = sub;
  }
  const glyphId = (code) => {
    const segX2 = u16(cmap4 + 6), ends = cmap4 + 14, starts = ends + segX2 + 2, deltas = starts + segX2, offsets = deltas + segX2;
    for (let s = 0; s < segX2; s += 2) {
      if (code > u16(ends + s)) continue;
      if (code < u16(starts + s)) return 0;
      const ro = u16(offsets + s);
      if (!ro) return (code + i16(deltas + s)) & 0xffff;
      const g = u16(offsets + s + ro + 2 * (code - u16(starts + s)));
      return g ? (g + i16(deltas + s)) & 0xffff : 0;
    }
    return 0;
  };

  // Contours d'un glyphe : liste de points { x, y, on }, composites aplatis (décalages simples).
  const contours = (g, dx = 0, dy = 0) => {
    const start = tables.glyf + loca(g);
    if (loca(g + 1) === loca(g)) return [];
    const n = i16(start);
    if (n < 0) {
      const out = [];
      for (let p = start + 10, more = true; more; ) {
        const flags = u16(p), child = u16(p + 2), words = flags & 1;
        const ax = words ? i16(p + 4) : buf.readInt8(p + 4), ay = words ? i16(p + 6) : buf.readInt8(p + 5);
        out.push(...contours(child, dx + ax, dy + ay));
        p += 4 + (words ? 4 : 2) + (flags & 8 ? 2 : flags & 0x40 ? 4 : flags & 0x80 ? 8 : 0);
        more = flags & 0x20;
      }
      return out;
    }
    const endPts = Array.from({ length: n }, (_, i) => u16(start + 10 + 2 * i));
    const count = endPts[n - 1] + 1;
    let p = start + 10 + 2 * n; p += 2 + u16(p);
    const flags = [];
    while (flags.length < count) {
      const f = buf[p++]; flags.push(f);
      if (f & 8) for (let r = buf[p++]; r > 0; r--) flags.push(f);
    }
    const coords = (short, same) => {
      let v = 0;
      return flags.map((f) => {
        if (f & short) { const d = buf[p++]; v += f & same ? d : -d; }
        else if (!(f & same)) { v += i16(p); p += 2; }
        return v;
      });
    };
    const xs = coords(2, 16), ys = coords(4, 32);
    const pts = flags.map((f, i) => ({ x: xs[i] + dx, y: ys[i] + dy, on: f & 1 }));
    return endPts.map((end, i) => pts.slice(i ? endPts[i - 1] + 1 : 0, end + 1));
  };

  // GPOS : ajustements de paires (type 2, éventuellement via une extension type 9) de la fonctionnalité « kern ».
  const gpos = tables.GPOS;
  const coverage = (o) => {
    const fmt = u16(o), map = new Map();
    if (fmt === 1) for (let i = 0; i < u16(o + 2); i++) map.set(u16(o + 4 + 2 * i), i);
    else for (let i = 0; i < u16(o + 2); i++) {
      const r = o + 4 + 6 * i;
      for (let g = u16(r); g <= u16(r + 2); g++) map.set(g, u16(r + 4) + g - u16(r));
    }
    return map;
  };
  const classDef = (o) => {
    const fmt = u16(o), map = new Map();
    if (fmt === 1) for (let i = 0; i < u16(o + 4); i++) map.set(u16(o + 2) + i, u16(o + 6 + 2 * i));
    else for (let i = 0; i < u16(o + 2); i++) {
      const r = o + 4 + 6 * i;
      for (let g = u16(r); g <= u16(r + 2); g++) map.set(g, u16(r + 4));
    }
    return map;
  };
  const bits = (f) => [...Array(8)].reduce((n, _, i) => n + ((f >> i) & 1), 0);
  // Avance horizontale (XAdvance, bit 4) d'un ValueRecord, si présente.
  const xAdvance = (o, fmt) => fmt & 4 ? i16(o + 2 * bits(fmt & 3)) : 0;

  const pairSubtables = [];
  if (gpos) {
    const features = gpos + u16(gpos + 6), lookups = gpos + u16(gpos + 8), indices = new Set();
    for (let i = 0; i < u16(features); i++) {
      const rec = features + 2 + 6 * i;
      if (buf.toString('latin1', rec, rec + 4) !== 'kern') continue;
      const f = features + u16(rec + 4);
      for (let j = 0; j < u16(f + 2); j++) indices.add(u16(f + 4 + 2 * j));
    }
    for (const li of indices) {
      const lookup = lookups + u16(lookups + 2 + 2 * li);
      for (let s = 0; s < u16(lookup + 4); s++) {
        let type = u16(lookup), sub = lookup + u16(lookup + 6 + 2 * s);
        if (type === 9) { type = u16(sub + 2); sub += u32(sub + 4); }
        if (type === 2) pairSubtables.push(sub);
      }
    }
  }
  const kerning = (left, right) => {
    for (const sub of pairSubtables) {
      const cov = coverage(sub + u16(sub + 2)).get(left);
      if (cov === undefined) continue;
      const vf1 = u16(sub + 4), vf2 = u16(sub + 6), size1 = 2 * bits(vf1), size2 = 2 * bits(vf2);
      if (u16(sub) === 1) {
        const set = sub + u16(sub + 10 + 2 * cov);
        for (let i = 0; i < u16(set); i++) {
          const rec = set + 2 + i * (2 + size1 + size2);
          if (u16(rec) === right) return xAdvance(rec + 2, vf1);
        }
      } else {
        const c1 = classDef(sub + u16(sub + 8)).get(left) ?? 0, c2 = classDef(sub + u16(sub + 10)).get(right) ?? 0;
        const rec = sub + 16 + (c1 * u16(sub + 14) + c2) * (size1 + size2);
        return xAdvance(rec, vf1);
      }
    }
    return 0;
  };

  return { unitsPerEm, ascender, descender, glyphId, advance, contours, kerning };
}

/** Tracé SVG du texte, ligne de base en (x, y), taille `size` px. Renvoie aussi la position de chaque glyphe. */
export function textPath(font, text, { x = 0, y = 0, size }) {
  const scale = size / font.unitsPerEm, glyphs = [...text].map((c) => font.glyphId(c.codePointAt(0)));
  const fx = (v) => +(v).toFixed(2);
  let pen = 0, d = '';
  const positions = [];
  glyphs.forEach((g, i) => {
    positions.push(pen);
    for (const pts of font.contours(g)) {
      const P = (p) => [fx(x + (pen + p.x) * scale), fx(y - p.y * scale)];
      const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: 1 });
      // Point de départ sur la courbe (milieu de deux points hors courbe si besoin).
      const first = pts.findIndex((p) => p.on);
      const ring = first < 0 ? [mid(pts[0], pts[1]), ...pts.slice(1), pts[0]] : [...pts.slice(first), ...pts.slice(0, first)];
      d += `M${P(ring[0])}`;
      for (let k = 1; k <= ring.length; k++) {
        const p = ring[k % ring.length];
        if (p.on) { d += `L${P(p)}`; continue; }
        const next = ring[(k + 1) % ring.length];
        const end = next.on ? next : mid(p, next);
        d += `Q${P(p)} ${P(end)}`;
        if (next.on) k++;
      }
      d += 'Z';
    }
    pen += font.advance(g) + (i + 1 < glyphs.length ? font.kerning(g, glyphs[i + 1]) : 0);
  });
  return { d, width: pen * scale, positions };
}
