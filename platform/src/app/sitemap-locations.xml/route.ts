import { metros, locationPath } from "@/lib/marketing/combos";

const BASE = "https://homeservicecrm.ai";

export function GET() {
  const urls = metros
    .map(
      (m) => `<url><loc>${BASE}${locationPath(m)}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
