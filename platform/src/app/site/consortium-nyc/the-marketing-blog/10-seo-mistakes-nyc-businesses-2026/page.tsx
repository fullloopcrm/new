// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";
import BlogSidebar from "@/app/site/consortium-nyc/_components/blog/BlogSidebar";
import BlogNav from "@/app/site/consortium-nyc/_components/blog/BlogNav";
import ListenButton from "@/app/site/consortium-nyc/_components/blog/ListenButton";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";

const title = "10 SEO Mistakes NYC Businesses Make in 2026 | The NYC Marketing Company";
const description =
  "The most common SEO mistakes we see NYC businesses making — and exactly how to fix them. From local citations to Core Web Vitals, stop leaving money on the table. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/the-marketing-blog/10-seo-mistakes-nyc-businesses-2026";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "SEO mistakes NYC",
    "NYC business SEO",
    "local SEO mistakes",
    "SEO tips 2026",
    "NYC SEO audit",
    "Google Business Profile optimization",
    "Core Web Vitals",
    "NYC digital marketing",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "The NYC Marketing Company",
    type: "article",
    images: [{ url: "https://www.consortiumnyc.com/og-image.jpg", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://www.consortiumnyc.com/og-image.jpg"],
  },
};

export default function Post() {
  return (
    <>
      <JsonLd
        data={articleSchema(
          "10 SEO Mistakes NYC Businesses Make in 2026",
          description,
          url,
          "2025-01-15",
          "2026-03-15"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.consortiumnyc.com" },
          { name: "Blog", url: "https://www.consortiumnyc.com/the-marketing-blog" },
          { name: "10 SEO Mistakes NYC Businesses Make in 2026", url },
        ])}
      />
      <section className="pt-32 pb-12 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/the-marketing-blog" className="text-teal-400 text-sm font-semibold hover:underline font-cta">
            &larr; Back to Blog
          </Link>
          <p className="text-teal-400 text-xs font-bold uppercase tracking-wider mt-6 mb-4 font-cta">SEO</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 font-heading leading-tight max-w-3xl">
            10 SEO Mistakes NYC Businesses Make in 2026
          </h1>
          <p className="text-white/50 text-sm">By The NYC Marketing Company</p>
        </div>
      </section>

      <TipBlurb
        tip={<>The most expensive SEO mistake isn&apos;t doing it wrong — it&apos;s <strong>doing nothing</strong> while your competitors get <strong>further ahead every single month</strong>.</>}
      />

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-12">
          <BlogSidebar />

          <article className="flex-1 min-w-0 max-w-none">
            <ListenButton />
            <p className="text-slate-700 text-lg leading-relaxed mb-8">
              After 25 years of auditing NYC businesses, we see the same SEO mistakes over and over. These aren&apos;t obscure technical issues — they&apos;re fundamental problems that cost real revenue every single month. Here are the ten most common ones and how to fix them.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">1. Ignoring Google Business Profile</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Your <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Google Business Profile</Link> is often the first thing customers see. An incomplete GBP with no reviews, no photos, and wrong hours is telling Google you don&apos;t care — and Google responds accordingly. Fill out every single field. Respond to every review within 24 hours. Post updates weekly.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">2. No Location Pages</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              If you serve <Link href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Brooklyn</Link>, <Link href="/services-areas-we-offer-marketing-services-in/queens-marketing-company" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Queens</Link>, and <Link href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Manhattan</Link> but only have one generic &ldquo;Service Areas&rdquo; page, you&apos;re invisible in local search for each of those boroughs. Every neighborhood you serve needs its own optimized page.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">3. Slow Website Speed</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              If your site takes more than 3 seconds to load, you&apos;re losing half your visitors before they even see your homepage. Core Web Vitals aren&apos;t optional anymore — they&apos;re a ranking factor. Our <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">custom websites</Link> load in under 2 seconds because they&apos;re built on Next.js, not bloated page builders.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">4. Duplicate Title Tags</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Every page on your site needs a unique, keyword-focused title tag under 60 characters. We audit sites every week that have the same title on every page — or worse, the default &ldquo;Home | My Business&rdquo; template. This is one of the easiest wins in SEO.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">5. No Internal Linking Strategy</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Internal links tell Google what your most important pages are and how they relate to each other. If your service pages don&apos;t link to your <Link href="/industries-we-offer-marketing-services-for" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">industry pages</Link>, your blog doesn&apos;t link to your services, and your location pages don&apos;t link to anything — you&apos;re wasting your own authority.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">6. Ignoring Mobile</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Over 70% of local searches in NYC happen on mobile devices. If your site isn&apos;t mobile-first with click-to-call buttons, easy navigation, and fast load times on 4G — you&apos;re handing customers to your competitors.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">7. No Schema Markup</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Schema markup helps Google understand your business, services, reviews, and location. Without it, you&apos;re missing out on rich snippets, FAQ dropdowns, and star ratings in search results. Every page should have relevant structured data.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">8. Publishing Content Without a Strategy</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Blogging for the sake of blogging doesn&apos;t move the needle. Every piece of content should target a specific keyword, answer a specific question, and link to a specific service page. Random blog posts about industry news don&apos;t generate leads.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">9. Inconsistent NAP Citations</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Your Name, Address, and Phone number need to be identical across every directory — Google, Yelp, BBB, industry sites, all of them. One wrong phone number or old address can tank your local rankings. We check 80+ directories for every client.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">10. Not Tracking Results</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              If you don&apos;t have Google Search Console and GA4 set up properly, you&apos;re flying blind. You can&apos;t improve what you don&apos;t measure. Every business should know exactly how many leads came from organic search last month, which keywords are driving traffic, and what their cost per lead is.
            </p>

            <div className="mt-12 p-8 rounded-xl bg-teal-50 border border-teal-100">
              <p className="text-slate-900 font-bold text-lg mb-2 font-heading">How many of these apply to your business?</p>
              <p className="text-slate-600 text-sm mb-4">
                Get a <Link href="/the-free-human+ai-seo-marketing-review" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">free SEO audit</Link> and we&apos;ll tell you exactly where you stand — no sales pitch, no obligation.
              </p>
              <Link
                href="/the-free-human+ai-seo-marketing-review"
                className="inline-block px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta"
              >
                Get My Free Audit
              </Link>
            </div>

            <BlogNav />
          </article>
        </div>
      </section>
    </>
  );
}
