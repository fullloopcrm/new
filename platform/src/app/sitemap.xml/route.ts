import { headers } from "next/headers";
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

// Main host: /sitemap.xml is now a sitemap INDEX pointing to named,
// purpose-specific sitemaps instead of one file with every URL type mixed
// together — sitemap-pages, sitemap-industries, sitemap-locations,
// sitemap-combos (each its own route.ts under src/app/).
function mainSitemapIndexXml(): string {
  const base = "https://homeservicesbusinesscrm.com";
  const files = ["sitemap-pages.xml", "sitemap-industries.xml", "sitemap-locations.xml", "sitemap-combos.xml"];
  const entries = files.map((f) => `<sitemap><loc>${base}/${f}</loc></sitemap>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
}

export async function GET() {
  const h = await headers();
  const host = (h.get("host") || "").split(":")[0].toLowerCase();

  if (host.includes("wepayyoujunkremoval")) {
    return new Response(junkSitemapXml(), { headers: XML_HEADERS });
  }

  return new Response(mainSitemapIndexXml(), { headers: XML_HEADERS });
}
