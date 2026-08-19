import { headers } from "next/headers";
import { mainSitemapXml } from "@/lib/seo/main-sitemap";
import { STATES as JUNK_STATES } from "@/app/site/we-pay-you-junk/_data/cities";
import { SERVICES as JUNK_SERVICES } from "@/app/site/we-pay-you-junk/_data/services";
import { CUSTOMER_TYPES as JUNK_CUSTOMER_TYPES } from "@/app/site/we-pay-you-junk/_data/customer-types";
import { BLOG_POSTS as JUNK_BLOG_POSTS } from "@/app/site/we-pay-you-junk/_data/blog-posts";

const XML_HEADERS = { "Content-Type": "application/xml" };

// We Pay You Junk Removal keeps its own single-file sitemap on its own host —
// unchanged behavior from before this split, just re-emitted as raw XML
// instead of the MetadataRoute.Sitemap object shape.
function junkSitemapXml(): string {
  const base = "https://www.wepayyoujunkremoval.com";
  const staticPaths = [
    "", "/pricing", "/services", "/book-junk-removal-service-today", "/who-we-serve",
    "/locations", "/about", "/faq", "/commercial", "/careers",
    "/apply-for-junk-removal-job", "/franchise", "/blog", "/contact-we-pay-you-junk-removal-today",
  ];
  const urls: string[] = staticPaths.map((p) => `<url><loc>${base}${p}</loc></url>`);

  for (const svc of JUNK_SERVICES) urls.push(`<url><loc>${base}/services/${svc.slug}</loc></url>`);
  for (const post of JUNK_BLOG_POSTS) urls.push(`<url><loc>${base}/blog/${post.slug}</loc></url>`);
  for (const ct of JUNK_CUSTOMER_TYPES) urls.push(`<url><loc>${base}/who-we-serve/${ct.slug}</loc></url>`);
  for (const st of JUNK_STATES) {
    urls.push(`<url><loc>${base}/locations/${st.slug}</loc></url>`);
    urls.push(`<url><loc>${base}/careers/${st.slug}</loc></url>`);
    for (const ct of JUNK_CUSTOMER_TYPES) urls.push(`<url><loc>${base}/who-we-serve/${ct.slug}/${st.slug}</loc></url>`);
    for (const city of st.cities) {
      urls.push(`<url><loc>${base}/locations/${st.slug}/${city.slug}</loc></url>`);
      urls.push(`<url><loc>${base}/careers/${st.slug}/${city.slug}</loc></url>`);
      for (const svc of JUNK_SERVICES) {
        urls.push(`<url><loc>${base}/locations/${st.slug}/${city.slug}/${svc.slug}</loc></url>`);
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}

// 2026-08-18: kept live (not deleted) in case other code/tests/external
// links expect /sitemap.xml to exist — but this is no longer the URL
// submitted to GSC. See src/app/sitemap-current.xml/route.ts and
// src/lib/seo/main-sitemap.ts.
export async function GET() {
  const h = await headers();
  const host = (h.get("host") || "").split(":")[0].toLowerCase();

  if (host.includes("wepayyoujunkremoval")) {
    return new Response(junkSitemapXml(), { headers: XML_HEADERS });
  }

  return new Response(mainSitemapXml(), { headers: XML_HEADERS });
}
