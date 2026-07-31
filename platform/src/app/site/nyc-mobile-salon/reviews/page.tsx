import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { getTenantFromHeaders, getPublicReviewsForSchema } from "@/lib/tenant-site";
import ReviewsList from "./ReviewsList";

export const metadata: Metadata = {
  title: "Client Reviews & Testimonials | The NYC Mobile Salon",
  description:
    "Read reviews from clients across NYC's five boroughs about mobile hair, nails, makeup, and grooming services. See why New Yorkers trust The NYC Mobile Salon.",
  alternates: { canonical: "https://thenycmobilesalon.com/reviews" },
  openGraph: {
    title: "Client Reviews & Testimonials | The NYC Mobile Salon",
    description:
      "Read reviews from clients across NYC's five boroughs about mobile beauty services.",
    url: "https://thenycmobilesalon.com/reviews",
  },
};

function Sparkle() {
  return (
    <svg className="inline-block h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M4.22 4.22l1.06 1.06M17.72 17.72l1.06 1.06M3 12h1.5M19.5 12H21M4.22 19.78l1.06-1.06M17.72 6.28l1.06-1.06" />
    </svg>
  );
}

const faqs = [
  { q: "How do I book a mobile beauty appointment?", a: "Visit our booking page, choose your service and time, and a licensed professional comes to your home, office, or event location anywhere in NYC's five boroughs." },
  { q: "Do you have a satisfaction guarantee?", a: "If you are not happy with your service, contact us within 24 hours and we will either send a professional to fix the issue at no charge or provide a refund." },
  { q: "What should I expect during a mobile beauty appointment?", a: "Your licensed professional arrives with all necessary tools, products, and supplies, sets up a clean workspace, consults with you on your desired look, and performs the service. Cleanup is included." },
  { q: "How are professionals vetted?", a: "Every professional on our roster must hold a current New York State license, provide a portfolio, pass a skills assessment, and clear a background check." },
];

// Real, publicly-approved reviews only -- no fabricated fallback data. This
// page previously hardcoded ~90 fake named testimonials plus an FAQ entry
// literally asserting "every review on this page is from a verified
// client... we never solicit fake reviews" while the real approved-review
// count was zero.
export default async function ReviewsPage() {
  let liveReviews: Awaited<ReturnType<typeof getPublicReviewsForSchema>> = [];
  try {
    const tenant = await getTenantFromHeaders();
    if (tenant) liveReviews = await getPublicReviewsForSchema(tenant.id);
  } catch {
    liveReviews = [];
  }

  const reviewSchemas = liveReviews.map((review) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    author: { "@type": "Person", name: review.name },
    reviewBody: review.text,
    datePublished: review.datePublished,
  }));

  const jsonLd = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Reviews", url: "/reviews" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
    ...reviewSchemas,
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white md:py-32"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm font-semibold uppercase tracking-wider backdrop-blur font-display">
            <Sparkle /> Client Reviews &amp; Testimonials <Sparkle />
          </p>
          <h1 className="mb-6 text-5xl font-black tracking-tight md:text-6xl font-display">
            What NYC Says About The NYC Mobile Salon
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/90">
            Read what real New Yorkers have to say about their mobile beauty experience, straight from our clients.
          </p>
        </div>
      </section>

      {/* ── Reviews ──────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> Client Testimonials
          </p>
          <h2 className="mb-10 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            What Our Clients Are Saying
          </h2>
          <ReviewsList />
        </div>
      </section>

      {/* ── Why Reviews Matter ──────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> Why Reviews Matter
          </p>
          <h2 className="mb-8 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            Trusted Across New York City
          </h2>

          <div className="space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              When you invite someone into your home for a beauty service, trust is everything. That is why we take every piece of client feedback seriously and share our reviews publicly — from <Link href="/locations/manhattan/upper-east-side" className="text-purple-600 hover:underline">Upper East Side</Link> high-rises to <Link href="/locations/brooklyn/park-slope" className="text-purple-600 hover:underline">Park Slope</Link> brownstones, <Link href="/locations/queens/astoria" className="text-purple-600 hover:underline">Astoria</Link> walk-ups to <Link href="/locations/bronx/riverdale" className="text-purple-600 hover:underline">Riverdale</Link> homes.
            </p>
            <p>
              Our clients book us for everything: <Link href="/services/hair/blowouts-and-styling" className="text-purple-600 hover:underline">blowouts</Link> before date night, <Link href="/services/nails/gel-manicure" className="text-purple-600 hover:underline">gel manicures</Link> during lunch breaks, <Link href="/services/makeup/full-glam-makeup" className="text-purple-600 hover:underline">full glam makeup</Link> for galas and weddings, <Link href="/services/mens-hair/fade-haircut" className="text-purple-600 hover:underline">fresh fades</Link>, <Link href="/services/hair/braids-and-protective-styles" className="text-purple-600 hover:underline">braids and protective styles</Link> in the comfort of their own living rooms, and <Link href="/services/hair/silk-press" className="text-purple-600 hover:underline">silk presses</Link>. We also handle <Link href="/events" className="text-purple-600 hover:underline">large events</Link> and hands-on <Link href="/classes" className="text-purple-600 hover:underline">beauty classes and workshops</Link>.
            </p>
            <p>
              Every professional on our roster is fully licensed and insured in New York State, and goes through a vetting process including portfolio review, a live skills assessment, reference checks, and background screening. If you are ready to see for yourself, <Link href="/book" className="text-purple-600 hover:underline">book your first appointment</Link> — pricing starts at <Link href="/pricing" className="text-purple-600 hover:underline">$99 per hour, all-inclusive</Link>, with no hidden fees.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> Common Questions
          </p>
          <h2 className="mb-10 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="mb-3 text-lg font-bold text-slate-900 font-display">{faq.q}</h3>
                <p className="text-base leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section
        className="px-4 py-24 text-center text-white"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-4xl font-black tracking-tight md:text-5xl font-display">
            Ready to Experience It Yourself?
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-white/90">
            Licensed professionals, salon-quality results, delivered to your door in all five boroughs.
          </p>
          <Link
            href="/book"
            className="rounded-full bg-purple-600 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700 font-display"
          >
            Book Your Appointment
          </Link>
        </div>
      </section>
    </>
  );
}
