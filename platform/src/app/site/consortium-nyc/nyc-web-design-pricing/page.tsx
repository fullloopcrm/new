import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/consortium-nyc/_lib/schema";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";

const wdTitle = "NYC Web Design Pricing | Custom Websites from $4,600 | Consortium NYC";
const wdDescription = "Transparent web design pricing for NYC businesses. Custom websites from $4,600, monthly SEO from $950/mo. No hidden fees, no contracts. Mobile-first, SEO-optimized sites that convert. Call/text (212) 202-9220.";
const wdUrl = "https://www.consortiumnyc.com/nyc-web-design-pricing";

export const metadata: Metadata = {
  title: wdTitle,
  description: wdDescription,
  alternates: { canonical: wdUrl },
  keywords: [
    "web design pricing nyc",
    "website cost new york",
    "affordable web design nyc",
    "custom website pricing",
    "nyc website design cost",
    "small business website nyc",
    "web design packages new york",
  ],
  openGraph: {
    title: wdTitle,
    description: wdDescription,
    url: wdUrl,
    siteName: "Consortium NYC",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Consortium NYC Web Design Pricing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: wdTitle,
    description: wdDescription,
    images: ["/og-image.jpg"],
  },
};

const websiteFeatures = [
  "Custom design tailored to your business",
  "Mobile-first responsive",
  "SEO-optimized architecture",
  "Google Business Profile setup",
  "Contact forms & lead capture",
  "Speed optimized (90+ PageSpeed)",
  "2 rounds of revisions",
  "Launch in 4-6 weeks",
];

const seoFeatures = [
  "Keyword research & strategy",
  "On-page optimization",
  "Google Business Profile management",
  "Monthly content creation",
  "Link building",
  "Review management",
  "Monthly reporting",
  "Dedicated account manager",
  "No long-term contracts",
];

const addOns = [
  { name: "Marketing Manager", price: "$1,500/mo", description: "Your outsourced marketing department" },
  { name: "Branding Package", price: "$2,500", description: "Logo, brand guide, visual identity" },
  { name: "Google Ads Management", price: "$500/mo + ad spend", description: "Instant leads while SEO builds" },
  { name: "Social Media", price: "$750/mo", description: "Content creation & posting" },
];

const faqs = [
  { question: "Do you require contracts?", answer: "No. We don't lock you into long-term contracts. Our SEO clients work with us month-to-month. We believe if we're delivering results, you'll want to stay. If not, you're free to leave anytime. Website projects are billed on a project basis with a 50% deposit upfront and 50% at launch." },
  { question: "What's included in the monthly SEO?", answer: "Everything you need to rank and grow: keyword research, on-page optimization, Google Business Profile management, monthly content creation, link building, review management, and a detailed monthly report. You also get a dedicated account manager who knows your business inside and out." },
  { question: "Can I cancel anytime?", answer: "Yes. We ask for 30 days notice so we can wrap things up properly, but there are no cancellation fees or penalties. We want to earn your business every single month." },
  { question: "Do you offer payment plans?", answer: "Yes. For website projects, we offer a 50/50 split (half upfront, half at launch) as standard. For larger projects or bundles, we can work out a payment schedule that fits your cash flow. Just ask." },
  { question: "What if I just need a website?", answer: "That's totally fine. Not every business needs ongoing SEO right away. We'll build you a beautiful, fast, SEO-ready website and hand it over. When you're ready to invest in monthly marketing, we'll be here." },
];

function Check() {
  return (
    <svg className="w-5 h-5 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Transparent Pricing | Consortium NYC",
          "Simple, transparent pricing for web design and SEO services. No hidden fees, no surprise invoices, no long-term contracts.",
          "https://www.consortiumnyc.com/nyc-web-design-pricing"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.consortiumnyc.com" },
          { name: "Pricing", url: "https://www.consortiumnyc.com/nyc-web-design-pricing" },
        ])}
      />
      <JsonLd data={faqSchema(faqs)} />

      {/* HERO */}
      <section className="bg-white pt-32 pb-16 sm:pt-40 sm:pb-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] font-heading">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            No hidden fees. No surprise invoices. No 12-month contracts.
          </p>
        </div>
      </section>

      <TipBlurb
        tip={<>A cheap website <strong>costs you more in the long run</strong>. If it&apos;s slow, doesn&apos;t rank, and doesn&apos;t convert — you&apos;ll pay twice to fix it. <strong>Do it right the first time.</strong></>}
      />

      {/* PRICING CARDS */}
      <section className="bg-teal-50 py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 sm:p-10 flex flex-col">
              <p className="text-teal-600 text-sm font-semibold tracking-[0.15em] uppercase mb-2">One-Time Project</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">Custom Website</h2>
              <div className="mt-4 mb-8">
                <span className="text-5xl font-extrabold text-slate-900 font-mono">$4,600</span>
                <span className="text-slate-500 text-lg ml-2">one-time</span>
              </div>
              <ul className="space-y-3 mb-10 flex-1">
                {websiteFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-slate-700 text-sm"><Check /><span>{feature}</span></li>
                ))}
              </ul>
              <Link href="https://www.thenycmarketingcompany.com/contact" className="block w-full text-center px-8 py-4 text-base font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta">
                Start Your Project
              </Link>
            </div>

            <div className="rounded-2xl bg-white border-2 border-teal-600 shadow-lg p-8 sm:p-10 flex flex-col relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-teal-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full font-cta">Most Popular</span>
              </div>
              <p className="text-teal-600 text-sm font-semibold tracking-[0.15em] uppercase mb-2">Ongoing Growth</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">Monthly SEO</h2>
              <div className="mt-4 mb-8">
                <span className="text-5xl font-extrabold text-slate-900 font-mono">$950</span>
                <span className="text-slate-500 text-lg ml-2">/month</span>
              </div>
              <ul className="space-y-3 mb-10 flex-1">
                {seoFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-slate-700 text-sm"><Check /><span>{feature}</span></li>
                ))}
              </ul>
              <Link href="https://www.thenycmarketingcompany.com/contact" className="block w-full text-center px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta">
                Start Ranking
              </Link>
            </div>
          </div>

          <div className="mt-12 rounded-2xl bg-white border border-teal-200 p-8 sm:p-10 text-center">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 font-heading">Bundle & Save</h3>
            <p className="text-slate-600 text-lg max-w-xl mx-auto mb-4">
              Get both for{" "}<span className="font-bold text-teal-600 font-mono">$5,200</span>{" "}startup +{" "}<span className="font-bold text-teal-600 font-mono">$950/month</span>.
            </p>
            <p className="text-teal-600 font-semibold text-sm">Most popular for local businesses.</p>
          </div>
        </div>
      </section>

      {/* ADD-ONS */}
      <section className="bg-white py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4">Extras</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">Add-On Services</h2>
            <p className="mt-4 text-slate-600 text-lg max-w-xl mx-auto">Scale up when you are ready. Mix and match to fit your goals.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {addOns.map((addon) => (
              <div key={addon.name} className="rounded-2xl bg-teal-50 border border-teal-100 p-6 text-center flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">{addon.name}</h3>
                <p className="text-2xl font-extrabold text-teal-600 mb-3 font-mono">{addon.price}</p>
                <p className="text-slate-600 text-sm">{addon.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-teal-50 py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4">Questions</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3 font-heading">{faq.question}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-white py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">Not sure what you need?</h2>
          <p className="mt-6 text-slate-600 text-lg max-w-xl mx-auto">
            Book a free 30-minute call. We will look at your current setup, understand your goals, and recommend the right plan — no pressure, no obligation.
          </p>
          <div className="mt-10">
            <Link href="https://www.thenycmarketingcompany.com/contact" className="inline-block px-10 py-5 text-lg font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta">
              Book Your Free Call
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
