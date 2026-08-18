// 2026-08-18: /locations/{state}/{city} pages set to noindex (page-bloat
// cleanup — see src/app/sitemap-combos.xml/route.ts). Pages stay live,
// just no longer submitted for indexing.
const BASE = "https://homeservicesbusinesscrm.com";

export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
