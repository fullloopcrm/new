import { headers } from "next/headers";
import { mainSitemapXml } from "@/lib/seo/main-sitemap";
import { industries, metros, comboPath, locationPath } from "@/lib/marketing/combos";
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

// DEV REBUILD (2026-08-19): the 20,800 industry x city / location combo pages
// that acd1f11d1 noindexed and dropped from the sitemap are back in — this
// worktree exists to give a full page inventory to redesign against. Do not
// carry this back into production without the noindex decision being
// deliberately revisited (see fullloop_seo_manager_review).
const BASE = "https://homeservicesbusinesscrm.com";
function comboAndLocationUrls(): string {
  const comboUrls = industries.flatMap((industry) =>
    metros.map(
      (metro) =>
        `<url><loc>${BASE}${comboPath(industry, metro)}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`
    )
  );
  const locationUrls = metros.map(
    (m) => `<url><loc>${BASE}${locationPath(m)}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`
  );
  return [...comboUrls, ...locationUrls].join("");
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

  const main = mainSitemapXml();
  const withCombos = main.replace("</urlset>", `${comboAndLocationUrls()}</urlset>`);
  return new Response(withCombos, { headers: XML_HEADERS });
}
