// 2026-08-18: /industry/{trade}/{city} combo pages (20,400 of them) set to
// noindex (page-bloat cleanup). Pages stay live, just no longer submitted
// for indexing. See the [slug]/[city] page.tsx robots field.
const BASE = "https://homeservicesbusinesscrm.com";

export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
