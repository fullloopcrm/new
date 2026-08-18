import { mainSitemapXml } from "@/lib/seo/main-sitemap";

const XML_HEADERS = { "Content-Type": "application/xml" };

// The URL actually submitted to GSC — deliberately a new path (not
// /sitemap.xml, which is kept live for compatibility but is stale in
// Google's cache) so Google treats this as a new sitemap resource. See
// src/lib/seo/main-sitemap.ts for the shared content and robots.ts for the
// pointer.
export async function GET() {
  return new Response(mainSitemapXml(), { headers: XML_HEADERS });
}
