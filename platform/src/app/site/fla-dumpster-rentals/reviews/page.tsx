import type { Metadata } from "next";
import { safeJsonLd } from '@/lib/escape-html'
import { SITE_URL } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import { getBreadcrumbSchema } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import { getTenantFromHeaders, getPublicReviewsForSchema } from "@/lib/tenant-site";
import ReviewsList from "./ReviewsList";

export const metadata: Metadata = {
  title: "Reviews | Florida Dumpster Rentals",
  description:
    "See what Florida customers say about our dumpster rental service. Fast delivery, fair pricing, reliable service. Call 954-710-2332.",
  alternates: { canonical: `${SITE_URL}/reviews` },
};

// Real, publicly-approved reviews only -- no fabricated fallback data. This
// page previously hardcoded 14 fake named reviews plus an invented
// star-distribution breakdown (278 five-star / 28 four-star / etc.) and a
// "Read the 1-Star Reviews Too" section referencing a review history that
// did not exist -- real approved-review count was zero.
export default async function ReviewsPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Reviews", url: "/reviews" },
  ]);

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd([breadcrumbSchema, ...reviewSchemas]) }}
      />

      {/* Hero */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Customer Reviews
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            What Our Customers Say
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-400">
            Don&apos;t just take our word for it. Here&apos;s what contractors,
            homeowners, and businesses across Florida have to say about our dumpster
            rental service.
          </p>
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ReviewsList />
        </div>
      </section>

      {/* Why Customers Choose Us */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Why Florida Customers Choose Us Over Other Dumpster Companies
          </h2>
          <div className="mt-6 space-y-5 text-lg text-zinc-600 leading-8">
            <p>
              Pricing transparency, on-time delivery, and responsive
              communication are the three things that matter most when renting a
              dumpster. These are also the three areas where most dumpster companies
              fall short. Hidden fees frustrate customers who feel deceived. Late
              deliveries disrupt project timelines. Unanswered calls and texts
              create anxiety about whether the dumpster will show up at all.
            </p>
            <p>
              We built our business around solving these exact problems. Every
              quote is flat-rate and all-inclusive — delivery, pickup, a 7-day
              rental period, and disposal up to the weight limit are all included
              in one price. We do not add fuel surcharges, environmental fees,
              admin charges, or any other hidden fees. The number we quote is the
              number on your invoice.
            </p>
            <p>
              Delivery reliability comes from our hauler network model. Instead
              of depending on a single fleet, we partner with vetted haulers in
              every major Florida market. When you order a dumpster in Tampa, a
              Tampa-based hauler delivers it. When you order in Jacksonville, a
              Jacksonville-based hauler handles it. Local haulers mean shorter
              travel distances, faster response times, and familiarity with your
              area&apos;s roads, regulations, and disposal facilities.
            </p>
            <p>
              Communication is where we really stand out. We respond to texts in
              minutes, not hours. We answer phone calls — a real person, not a
              voicemail system. We send photo confirmations after delivery and
              pickup so you have a record of every step.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTABanner
        title="Ready to Get Started?"
        subtitle="Fast delivery, fair pricing, no hidden fees. Text or call for your free quote today."
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </>
  );
}
