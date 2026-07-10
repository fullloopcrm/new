import Link from "next/link";
import type { Metadata } from "next";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";
import BlogSidebar from "@/app/site/the-nyc-marketing-company/_components/blog/BlogSidebar";
import BlogNav from "@/app/site/the-nyc-marketing-company/_components/blog/BlogNav";
import ListenButton from "@/app/site/the-nyc-marketing-company/_components/blog/ListenButton";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import { BrandLink } from "@/app/site/the-nyc-marketing-company/_lib/brand";

const title = "How to Choose a Marketing Company (Without Getting Burned) | The NYC Marketing Company";
const description =
  "The exact questions to ask, red flags to watch for, and benchmarks to demand before hiring a marketing company. 25 years of industry insight — no sugarcoating. Call/text (212) 202-9220.";
const url = "https://www.thenycmarketingcompany.com/the-marketing-blog/how-to-choose-digital-marketing-agency";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "how to choose marketing company",
    "hiring a marketing agency",
    "marketing company red flags",
    "NYC marketing agency",
    "digital marketing company questions",
    "marketing agency accountability",
    "choose digital marketing partner",
    "NYC business marketing",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "The NYC Marketing Company",
    type: "article",
    images: [{ url: "https://www.thenycmarketingcompany.com/og-marketing.jpg", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://www.thenycmarketingcompany.com/og-marketing.jpg"],
  },
};

export default function Post() {
  return (
    <>
      <JsonLd
        data={articleSchema(
          "How to Choose a Marketing Company (Without Getting Burned)",
          description,
          url,
          "2025-01-15",
          "2026-03-15"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.thenycmarketingcompany.com" },
          { name: "Blog", url: "https://www.thenycmarketingcompany.com/the-marketing-blog" },
          { name: "How to Choose a Marketing Company", url },
        ])}
      />
      <section className="pt-32 pb-12 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/the-marketing-blog" className="text-teal-400 text-sm font-semibold hover:underline font-cta">
            &larr; Back to Blog
          </Link>
          <p className="text-teal-400 text-xs font-bold uppercase tracking-wider mt-6 mb-4 font-cta">Strategy</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 font-heading leading-tight max-w-3xl">
            How to Choose a Marketing Company (Without Getting Burned)
          </h1>
          <p className="text-white/50 text-sm">By <BrandLink /></p>
        </div>
      </section>

      <TipBlurb
        tip={<>The best marketing company is the one that <strong>tells you what you need to hear</strong>, not what you want to hear. If they promise page 1 in 30 days, <strong>run</strong>.</>}
      />

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-12">
          <BlogSidebar />

          <article className="flex-1 min-w-0 max-w-none">
            <ListenButton />
            <p className="text-slate-700 text-lg leading-relaxed mb-8">
              Most business owners have been burned by a marketing company at least once. Locked into a 12-month contract, paying for &ldquo;services&rdquo; they couldn&apos;t see, getting reports full of vanity metrics that meant nothing. Here&apos;s how to avoid that.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">Ask These 5 Questions Before You Sign Anything</h2>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-2 font-heading">1. &ldquo;Who will actually be doing the work?&rdquo;</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              Most agencies sell you the senior team and hand your account to a junior employee or outsource it overseas. Ask directly: who touches my account day-to-day? What&apos;s their experience level? At <Link href="/about-digital-marketing-agency-consortium-nyc" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">The NYC Marketing Company</Link>, you work directly with someone who has 25 years in the seat they sit in. No layers.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-2 font-heading">2. &ldquo;Can you show me real results from real businesses?&rdquo;</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              Not stock photos. Not anonymized &ldquo;Case Study: Client A.&rdquo; Real business names, real numbers, real websites you can visit and verify. Check our <Link href="/nyc-marketing-company-portfolio" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">portfolio</Link> — every result is from a real business you can Google right now.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-2 font-heading">3. &ldquo;Do you require a long-term contract?&rdquo;</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              If someone needs to lock you in to keep your business, that tells you everything. Good work speaks for itself. Our clients stay an average of 12+ months — not because they&apos;re trapped, but because the results compound over time. See our <Link href="/nyc-marketing-pricing-guide" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">pricing</Link> — no contracts, no lock-ins.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-2 font-heading">4. &ldquo;How do you report results?&rdquo;</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              If the answer involves &ldquo;impressions,&rdquo; &ldquo;reach,&rdquo; or &ldquo;brand awareness&rdquo; without tying them to leads and revenue — walk away. You should know exactly how many leads came from SEO last month, what your cost per lead is, and what the revenue impact was. Every month. In plain English.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-2 font-heading">5. &ldquo;What happens if it&apos;s not working?&rdquo;</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              The honest answer should be: &ldquo;We pivot.&rdquo; Not &ldquo;Give it more time.&rdquo; Not &ldquo;SEO takes 6-12 months.&rdquo; A good marketing company has a plan B and tells you about it proactively when something isn&apos;t performing.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">Red Flags to Watch For</h2>
            <div className="space-y-2.5 mb-8">
              {[
                "Guaranteeing page 1 rankings in 30 days",
                "Refusing to share who owns your website or domain",
                "Using proprietary dashboards instead of Google Analytics",
                "No case studies or refusing to name past clients",
                "Heavy sales pressure or limited-time pricing",
                "Can't explain what they'll do in month 1 vs month 6",
                "Outsourcing your work to a white-label agency",
              ].map((flag) => (
                <div key={flag} className="flex items-start gap-3">
                  <span className="text-red-500 font-bold mt-0.5 text-sm">&#x2717;</span>
                  <span className="text-slate-600 text-sm">{flag}</span>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">What Good Looks Like</h2>
            <div className="space-y-2.5 mb-8">
              {[
                "Transparent pricing — you know what you're paying for",
                "Month-to-month — they earn your business every month",
                "Direct access to the person doing the work",
                "Reports tied to leads, revenue, and real business outcomes",
                "They answer the phone and respond same-day",
                "Real portfolio with verifiable results",
                "They tell you what's NOT working, not just what is",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="text-teal-600 font-bold mt-0.5 text-sm">&#x2713;</span>
                  <span className="text-slate-600 text-sm">{item}</span>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 font-heading">The Bottom Line</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Choosing a marketing company is a business decision that affects your revenue for years. Don&apos;t choose based on a slick pitch or a cheap price. Choose based on transparency, accountability, and proof. Ask hard questions. Demand real answers. And if something feels off — trust your gut. There are <Link href="/industries-we-offer-marketing-services-for" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">100+ industries</Link> we&apos;ve worked with, and the companies that succeed are the ones who chose partners, not vendors.
            </p>

            <div className="mt-12 p-8 rounded-xl bg-teal-50 border border-teal-100">
              <p className="text-slate-900 font-bold text-lg mb-2 font-heading">Want to see what working with us looks like?</p>
              <p className="text-slate-600 text-sm mb-4">
                No pitch deck. No pressure. Just a real conversation about your business, your goals, and whether we&apos;re the right fit. If we&apos;re not, we&apos;ll tell you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="https://www.thenycmarketingcompany.com/contact"
                  className="inline-block px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta"
                >
                  Schedule a Free Strategy Session
                </Link>
                <a
                  href="tel:+12122029220"
                  className="inline-block px-6 py-3 text-sm font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
                >
                  Call (212) 202-9220
                </a>
              </div>
            </div>

            <BlogNav />
          </article>
        </div>
      </section>
    </>
  );
}