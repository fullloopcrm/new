import { industries, industryPath } from "@/lib/marketing/combos";

const BASE = "https://homeservicesbusinesscrm.com";

export function GET() {
  const urls = industries
    .map(
      (i) => `<url><loc>${BASE}${industryPath(i)}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
