// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";

const title = "NYC Marketing Company Portfolio | Real SEO Results & Case Studies | Consortium NYC (Now The NYC Marketing Company)";
const description =
  "See real SEO results, traffic growth, and revenue numbers from NYC businesses we've grown from zero. Visit their websites, Google them — every result is verifiable. No stock photos, no fake case studies. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/nyc-marketing-company-portfolio";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing portfolio",
    "SEO case studies NYC",
    "marketing results NYC",
    "SEO results proof",
    "NYC business growth",
    "marketing company portfolio",
    "real SEO results",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "Consortium NYC (Now The NYC Marketing Company)",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Consortium NYC (Now The NYC Marketing Company)" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.jpg"],
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://www.consortiumnyc.com" },
  { name: "Portfolio", url },
];

const clients = [
  {
    name: "Moodap\u2122",
    url: "https://www.moodap.com/",
    google: "https://www.google.com/search?q=joys+chinatown",
    timeframe: "2 Months",
    type: "Startup",
    preRevenue: true,
    services: ["SEO", "Web Design", "Programmatic"],
    stats: { rankings: "2,000+", traffic: "1,000+/mo", leads: "Pre-Revenue", revenue: "Pre-Revenue", growth: "3,490%" },
    highlight: "25,000 pages launched. 2,000 page 1 rankings in 2 months.",
  },
  {
    name: "The Boston Landscaping Company",
    url: "https://www.thebostonlandscapingcompany.com/",
    google: "https://www.google.com/search?q=boston+landscaping+company",
    timeframe: "9 Months",
    type: "Startup",
    preRevenue: false,
    services: ["SEO", "Web Design", "Local SEO"],
    stats: { rankings: "25+", traffic: "3,000/mo", leads: "45/mo", revenue: "$200K+", growth: "1,095%" },
    highlight: "From zero to $200K+ revenue in 9 months. 45 leads per month.",
  },
  {
    name: "The NYC Maid",
    url: "https://www.thenycmaid.com/",
    google: "https://www.google.com/search?q=nyc+maid",
    timeframe: "6 Months",
    type: "Startup",
    preRevenue: false,
    services: ["SEO", "Web Design", "Local SEO", "GBP"],
    stats: { rankings: "500+", traffic: "1,000+/mo", leads: "60/mo", revenue: "$68K", growth: "725%" },
    highlight: "500+ page 1 rankings. 60 leads/month. 5.0 stars on Google.",
  },
  {
    name: "The NYC Classifieds",
    url: "https://thenycclassifieds.com/",
    google: "https://www.google.com/search?q=nyc+classified",
    timeframe: "Under 10 Days",
    type: "Startup",
    preRevenue: true,
    services: ["SEO", "Web Design", "Programmatic"],
    stats: { rankings: "10+", traffic: "100+/mo", leads: "Pre-Revenue", revenue: "Pre-Revenue", growth: "220%" },
    highlight: "10+ page 1 rankings in under 10 days from launch.",
  },
  {
    name: "Destin Digital",
    url: "https://www.destindigitalmarketing.com/",
    google: "https://www.google.com/search?q=destin+digital+marketing",
    timeframe: "3 Months",
    type: "Startup",
    preRevenue: false,
    services: ["SEO", "Web Design", "Branding"],
    stats: { rankings: "10+", traffic: "100+/mo", leads: "10+/mo", revenue: "$15K+", growth: "250%" },
    highlight: "Marketing agency startup generating $15K+ revenue in 3 months.",
  },
  {
    name: "Urban Clothing NYC",
    url: "https://www.urbanclothingusa.com/",
    google: "https://www.google.com/search?q=urban+clothing+nyc",
    timeframe: "Pre-Revenue",
    type: "Startup",
    preRevenue: true,
    services: ["SEO", "Web Design", "E-Commerce"],
    stats: { rankings: "100+", traffic: "32,000/mo", leads: "100+/mo", revenue: "Pre-Revenue", growth: "600%" },
    highlight: "32,000 monthly visits. 100+ page 1 rankings. Zero ad spend.",
  },
  {
    name: "The NYC Mobile Salon",
    url: "https://www.thenycmobilesalon.com/",
    google: "https://www.google.com/search?q=nyc+mobile+salon",
    timeframe: "Under 15 Days",
    type: "Startup",
    preRevenue: true,
    services: ["SEO", "Web Design", "Local SEO"],
    stats: { rankings: "500+", traffic: "500+/mo", leads: "Pre-Revenue", revenue: "Pre-Revenue", growth: "250%" },
    highlight: "500 page 1 rankings in under 15 days. EMD strategy.",
  },
  {
    name: "The NYC SEO",
    url: "https://www.thenycseo.com/",
    google: "https://www.google.com/search?q=SEO+for+Electrician+Businesses+in+Forest+Hills",
    timeframe: "15 Days",
    type: "Startup",
    preRevenue: true,
    services: ["SEO", "Web Design", "Content"],
    stats: { rankings: "500+", traffic: "3,000/mo", leads: "25/mo", revenue: "Pre-Revenue", growth: "1,200%" },
    highlight: "500+ page 1 rankings and 3,000 monthly visits in 15 days.",
  },
];

export default function PortfolioPage() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {/* Hero */}
      <section className="pt-32 pb-12 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            NYC Marketing Company Portfolio
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
            Real SEO Results from{" "}
            <span className="text-teal-400">Real NYC Businesses</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            No stock photos. No anonymized case studies. Every business below is real — visit their website and <Link href="/whats-working-in-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">Google them right now</Link> to verify. From <Link href="/industries-we-offer-marketing-services-for/home-service-business-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">home services</Link> to e-commerce to <Link href="/industries-we-offer-marketing-services-for" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">100+ industries</Link> — these are the results our <Link href="/nyc-marketing-company-services-list" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">SEO, web design, and marketing services</Link> deliver. That&apos;s the standard we hold ourselves to.
          </p>
        </div>
      </section>

      <TipBlurb
        tip={<>Every result you see here is from a <strong>real business with a real budget</strong>. No Fortune 500 logos we can&apos;t talk about. No &ldquo;confidential&rdquo; case studies. Just <strong>honest work and honest numbers</strong>.</>}
      />

      {/* Clients */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid md:grid-cols-2 gap-6">
            {clients.map((client) => (
              <div
                key={client.name}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-teal-300 transition-all overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 font-heading">{client.name}</h2>
                      <p className="text-slate-400 text-xs font-mono mt-0.5">
                        {client.type} &middot; {client.timeframe}
                      </p>
                    </div>
                    <span className="text-teal-600 text-2xl font-extrabold font-mono">
                      {client.stats.growth}
                    </span>
                  </div>

                  {/* Highlight */}
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    {client.highlight}
                  </p>

                  {/* Service pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {client.services.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-cta">Pg 1 Rankings</p>
                      <p className="text-slate-900 text-sm font-bold font-mono">{client.stats.rankings}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-cta">Traffic</p>
                      <p className="text-slate-900 text-sm font-bold font-mono">{client.stats.traffic}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-cta">Leads</p>
                      <p className="text-slate-900 text-sm font-bold font-mono">{client.stats.leads}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-cta">Revenue</p>
                      <p className="text-slate-900 text-sm font-bold font-mono">{client.stats.revenue}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-6 py-3 flex items-center gap-4">
                  <a
                    href={client.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 text-xs font-semibold hover:underline font-cta"
                  >
                    Visit Website
                  </a>
                  <span className="text-slate-200">|</span>
                  <a
                    href={client.google}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 text-xs font-semibold hover:underline font-cta"
                  >
                    Google It
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 rounded-xl bg-slate-900 p-10 text-center">
            <p className="text-teal-400 text-sm font-semibold tracking-wider uppercase mb-3 font-cta">
              Ready to Be Next?
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 font-heading">
              Your Business Could Be on This Page
            </h2>
            <p className="text-white/60 text-sm mb-8 max-w-xl mx-auto">
              Every business above started at zero. No rankings, no traffic, no leads. We built it all from scratch with <Link href="/nyc-marketing-company-services-list" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">SEO, custom web design, and local marketing</Link> — no ads, no shortcuts. Check our <Link href="/nyc-marketing-pricing-guide" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">transparent pricing</Link> or use the <Link href="/annual-marketing-spend-roi-calculator" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">ROI calculator</Link> to see what&apos;s possible for your business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
                className="inline-block px-8 py-4 text-base font-bold text-slate-900 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta"
              >
                Schedule a Free Strategy Session
              </Link>
              <a
                href="tel:+12122029220"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors font-cta"
              >
                Call (212) 202-9220
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}