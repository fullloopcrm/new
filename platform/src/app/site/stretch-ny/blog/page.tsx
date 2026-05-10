// @ts-nocheck
import Logo from "@/app/site/stretch-ny/_components/Logo";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";

const pageTitle = "Stretch Service Blog | NYC Stretching Tips & Wellness";
const pageDescription =
  "Expert stretching tips, wellness advice, and stretch service guides from Stretch NYC. Learn about PNF stretching, recovery, mobility & more.";
const pageUrl = `${SITE_URL}/blog`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
};

const placeholderArticles = [
  {
    title: "5 Stretches Every NYC Desk Worker Needs Daily",
    excerpt:
      "Sitting at a desk for 8+ hours in a Manhattan office takes a toll. These five stretches can relieve tension in your neck, shoulders, and lower back in under 10 minutes.",
    category: "Stretching Tips",
    date: "Coming Soon",
  },
  {
    title: "Why Assisted Stretching Beats Stretching Alone",
    excerpt:
      "Self-stretching has its limits. Learn how PNF and assisted stretching techniques unlock flexibility gains you simply cannot achieve on your own.",
    category: "Education",
    date: "Coming Soon",
  },
  {
    title: "The Best Parks in NYC for Outdoor Stretching",
    excerpt:
      "From Central Park to Brooklyn Bridge Park, discover the best outdoor spots in New York City for a professional stretching session surrounded by nature.",
    category: "NYC Wellness",
    date: "Coming Soon",
  },
  {
    title: "How Mobile Stretching Helps NYC Marathon Runners Recover",
    excerpt:
      "Training for the NYC Marathon? Post-run stretching is critical for injury prevention and performance. Here's how professional assisted stretching accelerates your recovery.",
    category: "Sports Recovery",
    date: "Coming Soon",
  },
  {
    title: "Stretching for Seniors: Maintaining Mobility in New York City",
    excerpt:
      "Maintaining flexibility and balance is essential as we age. Learn how regular assisted stretching helps NYC seniors stay active, independent, and pain-free.",
    category: "Senior Wellness",
    date: "Coming Soon",
  },
  {
    title: "Corporate Wellness: Why NYC Companies Are Investing in Stretch Programs",
    excerpt:
      "Employee wellness programs that include on-site stretching reduce workplace injuries, boost productivity, and improve morale. See why top NYC companies are adding stretch to their benefits.",
    category: "Corporate Wellness",
    date: "Coming Soon",
  },
];

export default function BlogPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema(pageTitle, pageDescription, pageUrl, [
            { name: "Home", url: SITE_URL },
            { name: "Blog", url: pageUrl },
          ]),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Blog", url: pageUrl },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-600 to-teal-800 text-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Stretch NYC Blog
          </h1>
          <p className="text-lg md:text-xl text-teal-100 max-w-2xl mx-auto">
            Expert stretching tips, NYC wellness guides, and mobility advice from our certified therapists.
          </p>
        </div>
      </section>

      {/* Coming Soon Banner */}
      <section className="py-8 bg-teal-50 border-b border-teal-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-teal-700 font-semibold text-lg">
            Our blog is coming soon! Check back for expert stretching and wellness content.
          </p>
        </div>
      </section>

      {/* Article Grid */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {placeholderArticles.map((article) => (
              <article
                key={article.title}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 mb-2">
                  {article.category}
                </span>
                <h2 className="font-heading text-xl font-bold text-gray-900 mb-3">
                  {article.title}
                </h2>
                <p className="text-gray-600 text-sm flex-1 mb-4">
                  {article.excerpt}
                </p>
                <span className="text-sm text-gray-400 italic">{article.date}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
            Don&apos;t Wait for the Blog
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Book a session today and experience the benefits of professional assisted stretching firsthand.
          </p>
          <a
            href={SITE_SMS_LINK}
            className="font-cta inline-block bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
          >
            Text {SITE_PHONE} to Book
          </a>
        </div>
      </section>
      {/* Explore Links */}
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">374 Neighborhoods</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">132 Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Corporate</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
            <Link href="/discounts" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Discounts</Link>
            <Link href="/services/assisted-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Assisted Stretch</Link>
            <Link href="/services/pnf-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">PNF Stretching</Link>
            <Link href="/locations/manhattan" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Manhattan</Link>
            <Link href="/locations/brooklyn" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Brooklyn</Link>
            <Link href="/locations/queens" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Queens</Link>
          </div>
        </div>
      </section>

    </>
  );
}
