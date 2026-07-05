import Link from "next/link";
import type { Metadata } from "next";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";
import BlogSidebar from "@/app/site/consortium-nyc/_components/blog/BlogSidebar";
import BlogNav from "@/app/site/consortium-nyc/_components/blog/BlogNav";
import ListenButton from "@/app/site/consortium-nyc/_components/blog/ListenButton";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";

const title = "Local SEO vs National SEO: What Your NYC Business Actually Needs | The NYC Marketing Company";
const description =
  "Local SEO and national SEO require completely different strategies. Learn which approach drives the most revenue for your NYC business — or if you need both. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/the-marketing-blog/local-seo-vs-national-seo";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "local SEO vs national SEO",
    "NYC local SEO",
    "national SEO strategy",
    "local search optimization",
    "NYC business SEO",
    "Google Map Pack",
    "local SEO ROI",
    "NYC marketing company",
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
          "Local SEO vs National SEO: What Your NYC Business Actually Needs",
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
          { name: "Local SEO vs National SEO", url },
        ])}
      />
      <section className="pt-32 pb-12 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/the-marketing-blog" className="text-teal-400 text-sm font-semibold hover:underline font-cta">
            &larr; Back to Blog
          </Link>
          <p className="text-teal-400 text-xs font-bold uppercase tracking-wider mt-6 mb-4 font-cta">SEO</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 font-heading leading-tight max-w-3xl">
            Local SEO vs National SEO: What Your Business Actually Needs
          </h1>
          <p className="text-white/50 text-sm">By The NYC Marketing Company</p>
        </div>
      </section>

      <TipBlurb
        tip={<>If your customers come from a <strong>20-mile radius</strong>, you don&apos;t need a national SEO strategy. You need a local one. And <strong>the difference between the two is everything</strong>.</>}
      />

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-12">
          <BlogSidebar />

          <article className="flex-1 min-w-0 max-w-none">
            <ListenButton />
            <p className="text-slate-700 text-lg leading-relaxed mb-8">
              One of the most common questions we get from NYC business owners: &ldquo;Do I need local SEO or national SEO?&rdquo; The answer depends entirely on where your customers come from — and the strategies are fundamentally different.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">What Is Local SEO?</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Local SEO optimizes your visibility for geographically-specific searches. When someone in <Link href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Brooklyn</Link> searches &ldquo;plumber near me&rdquo; or &ldquo;best dentist in Williamsburg,&rdquo; local SEO determines whether your business shows up in the Google Map Pack and local organic results.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Key local SEO tactics include <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Google Business Profile optimization</Link>, local citation building across 80+ directories, review management, geo-targeted content, and neighborhood-specific landing pages for every <Link href="/services-areas-we-offer-marketing-services-in" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">area you serve</Link>.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">What Is National SEO?</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              National SEO targets keywords without geographic modifiers. Think &ldquo;best project management software&rdquo; or &ldquo;how to file a personal injury claim.&rdquo; It requires a different approach: high-authority backlinks, comprehensive content clusters, technical optimization at scale, and domain authority building over months and years.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">Which One Does Your NYC Business Need?</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Here&apos;s the simple test: if your customers walk through a door, call for a service, or need someone physically present — you need local SEO. That means <Link href="/industries-we-offer-marketing-services-for/plumber-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">plumbers</Link>, <Link href="/industries-we-offer-marketing-services-for/dental-practice-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">dentists</Link>, <Link href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">restaurants</Link>, <Link href="/industries-we-offer-marketing-services-for/personal-injury-law-firm-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">law firms</Link>, <Link href="/industries-we-offer-marketing-services-for/hvac-company-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">HVAC companies</Link>, and virtually every service business in the five boroughs.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              If you sell products or services online to customers anywhere in the country — e-commerce stores, SaaS companies, online education — you need national SEO. And some businesses need both.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">The Numbers Don&apos;t Lie</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              For most NYC <Link href="/industries-we-offer-marketing-services-for/home-service-business-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">home service businesses</Link>, local SEO delivers the highest ROI because the intent is immediate. Someone searching &ldquo;emergency plumber Upper East Side&rdquo; is ready to hire right now. That lead is worth 10x more than someone casually reading a blog about pipe maintenance.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Our clients typically see 5-8% compounding growth year over year with local SEO. A <Link href="/industries-we-offer-marketing-services-for/roofing-company-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">roofing company</Link> investing $950/month who gets 30 leads per month at a $3,000 average job value is generating $90K/month from a $950 investment. Use our <Link href="/annual-marketing-spend-roi-calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">ROI calculator</Link> to see what the numbers look like for your business.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">The Mistake Most Businesses Make</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Trying to do national SEO on a local SEO budget. If you&apos;re a <Link href="/industries-we-offer-marketing-services-for/contractor-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">contractor</Link> in <Link href="/services-areas-we-offer-marketing-services-in/queens-marketing-company" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Queens</Link>, you don&apos;t need to rank nationally for &ldquo;home renovation.&rdquo; You need to own &ldquo;home renovation Queens&rdquo; and every variation of it. Focus beats breadth every time at the local level.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">Our Approach</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              We start every engagement with competitive research and market analysis. We look at what your competitors are doing, where the gaps are, and where the fastest wins live. Then we build a strategy based on your actual data — not a template. See our <Link href="/nyc-marketing-company-portfolio" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">portfolio</Link> for real examples of both local and national SEO campaigns we&apos;ve run.
            </p>

            <div className="mt-12 p-8 rounded-xl bg-teal-50 border border-teal-100">
              <p className="text-slate-900 font-bold text-lg mb-2 font-heading">Not sure which approach is right for you?</p>
              <p className="text-slate-600 text-sm mb-4">
                Schedule a free strategy session and we&apos;ll analyze your market, your competitors, and your opportunity — then tell you exactly what will move the needle fastest.
              </p>
              <Link
                href="/contact-nyc-marketing-company-consortium-nyc"
                className="inline-block px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta"
              >
                Schedule a Free Strategy Session
              </Link>
            </div>

            <BlogNav />
          </article>
        </div>
      </section>
    </>
  );
}
