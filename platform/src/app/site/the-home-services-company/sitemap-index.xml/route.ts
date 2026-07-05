import { NextResponse } from "next/server";

const SITE = "https://www.thehomeservicescompany.com";
const CHUNKS = [0, 1, 2];

export const dynamic = "force-static";

export function GET() {
  const now = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${CHUNKS.map(
  (id) => `  <sitemap>
    <loc>${SITE}/sitemap/${id}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`,
).join("\n")}
</sitemapindex>
`;

  return new NextResponse(body, {
    headers: { "Content-Type": "application/xml" },
  });
}
