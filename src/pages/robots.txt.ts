import type { APIContext } from 'astro';
import { href } from '../lib/content';

// Autorise tout et indique le sitemap (généré par @astrojs/sitemap) aux moteurs de recherche.
export function GET(context: APIContext) {
  const sitemap = new URL(href('/sitemap-index.xml'), context.site).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
