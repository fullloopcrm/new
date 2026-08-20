import { industries, metros, comboPath } from "@/lib/marketing/combos";

const BASE = "https://homeservicecrm.ai";
// Stable lastmod — do not stamp today's date on every deploy for this
// programmatic network (see src/app/sitemap-pages.xml/route.ts for why).
const LASTMOD = "2026-07-28";

export function GET() {
  const urls = industries
    .flatMap((industry) =>
      metros.map(
        (metro) =>
          `<url><loc>${BASE}${comboPath(industry, metro)}</loc><lastmod>${LASTMOD}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`
      )
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
