import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';

// Entrées de journal sans texte (ni review ni accroche) : leur page est en noindex, on la retire aussi du sitemap.
// Même règle que `hasText` (src/lib/content.ts), lue ici dans les fichiers : la config n'a pas accès aux collections.
const logsDir = new URL('./src/content/logs/', import.meta.url);
const emptyLogs = new Set(
  readdirSync(logsDir, { recursive: true })
    .filter((file) => String(file).endsWith('.md'))
    .filter((file) => {
      const [, frontmatter = '', body = ''] = readFileSync(new URL(String(file), logsDir), 'utf8').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) ?? [];
      const summary = frontmatter.match(/^summary:[ \t]*(.*)$/m)?.[1].replace(/\s#.*$/, '').replace(/^["']|["']$/g, '').trim();
      return !body.trim() && !summary;
    })
    .map((file) => basename(String(file), '.md')),
);

// SITE et BASE sont fournis par le workflow GitHub Actions.
// En local, les valeurs par défaut suffisent.
export default defineConfig({
  site: process.env.SITE ?? 'http://localhost:4321',
  base: process.env.BASE ?? '/',
  integrations: [
    sitemap({
      filter: (page) => {
        const id = page.match(/\/journal\/([^/]+)\/$/)?.[1];
        return !page.endsWith('/404/') && !(id && emptyLogs.has(id));
      },
    }),
  ],
});
