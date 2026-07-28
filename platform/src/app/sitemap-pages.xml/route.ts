const BASE = "https://homeservicesbusinesscrm.com";

const STATIC_PAGES: { path: string; priority: string; freq: string }[] = [
  { path: "", priority: "1.0", freq: "daily" },
  { path: "/full-loop-crm-service-features", priority: "0.9", freq: "weekly" },
  { path: "/full-loop-crm-service-business-industries", priority: "0.8", freq: "weekly" },
  { path: "/home-service-crm-locations", priority: "0.8", freq: "weekly" },
  { path: "/full-loop-crm-pricing", priority: "0.9", freq: "weekly" },
  { path: "/why-you-should-choose-full-loop-crm-for-your-business", priority: "0.8", freq: "monthly" },
  { path: "/partner-with-full-loop-crm", priority: "0.8", freq: "monthly" },
  { path: "/about-full-loop-crm", priority: "0.7", freq: "monthly" },
  { path: "/full-loop-crm-frequently-asked-questions", priority: "0.7", freq: "monthly" },
  { path: "/full-loop-crm-101-educational-tips", priority: "0.7", freq: "monthly" },
  { path: "/contact", priority: "0.7", freq: "monthly" },
  { path: "/case-study/the-nyc-maid", priority: "0.8", freq: "weekly" },
  { path: "/home-service-business-blog", priority: "0.6", freq: "weekly" },
  { path: "/home-service-business-blog/autonomous-home-service-business-2026", priority: "0.6", freq: "monthly" },
  { path: "/home-service-business-blog/home-service-business-without-the-overhead", priority: "0.6", freq: "monthly" },
  { path: "/home-service-business-blog/how-to-get-more-leads-home-service-2026", priority: "0.6", freq: "monthly" },
  { path: "/home-service-business-blog/hiring-retention-home-service-2026", priority: "0.6", freq: "monthly" },
  { path: "/home-service-business-blog/pricing-home-service-2026", priority: "0.6", freq: "monthly" },
  { path: "/agreement", priority: "0.4", freq: "yearly" },
  { path: "/privacy-policy", priority: "0.3", freq: "yearly" },
  { path: "/terms", priority: "0.3", freq: "yearly" },
  { path: "/accessibility", priority: "0.3", freq: "yearly" },
];

export function GET() {
  const urls = STATIC_PAGES.map(
    (p) => `<url><loc>${BASE}${p.path}</loc><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
  ).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
