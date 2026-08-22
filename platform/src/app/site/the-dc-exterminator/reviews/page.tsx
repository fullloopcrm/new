import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import { PHONE, SITE_URL, SITE_NAME } from "@/app/site/the-dc-exterminator/_lib/seo";
import { getBreadcrumbSchema } from "@/app/site/the-dc-exterminator/_lib/seo";
import CTAGroup from "@/app/site/the-dc-exterminator/_components/CTAGroup";
import { getTenantFromHeaders, getPublicReviewsForSchema } from "@/lib/tenant-site";
import ReviewsList from "./ReviewsList";

export const metadata: Metadata = {
  title: "DC Exterminator Reviews | Pest Control Customer Reviews",
  description:
    "Read reviews from DC homeowners, renters, and businesses about our cockroach, bed bug, rat, mouse, and termite extermination results. Licensed exterminators across DC, Northern Virginia & Suburban Maryland. Text us.",
  keywords:
    "DC exterminator reviews, pest control reviews DC, best exterminator DC, bed bug treatment reviews, cockroach exterminator reviews, rat exterminator reviews, pest control testimonials",
  openGraph: {
    title: "DC Exterminator Reviews | Pest Control Customer Reviews",
    description:
      "See what DC says about our pest control. Text us.",
    url: `${SITE_URL}/reviews`,
  },
  alternates: {
    canonical: `${SITE_URL}/reviews`,
  },
};

export default async function ReviewsPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Reviews", url: "/reviews" },
  ]);

  // Real, publicly-approved reviews only -- same filter /api/reviews applies
  // for anonymous visitors. No fabricated fallback data; this replaced a
  // page that hardcoded ~90 fake named reviews and a false "2,847+ Verified
  // Reviews / 4.9 average rating" claim while the real approved-review count
  // was zero.
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
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd([breadcrumbSchema, ...reviewSchemas]),
        }}
      />

      {/* ── Hero Section ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-300">
              Home
            </Link>{" "}
            / <span className="text-zinc-300">Reviews</span>
          </nav>

          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              Customer Reviews &amp; Testimonials
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              What DC Says About Our{" "}
              <span className="text-green-400">Pest Control</span> &amp;{" "}
              <span className="text-green-400">Exterminator</span> Services
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Read real reviews from homeowners, renters, property managers,
              and business owners who have trusted us with their{" "}
              <Link
                href="/cockroach-extermination"
                className="text-green-400 hover:text-green-300"
              >
                cockroach extermination
              </Link>
              ,{" "}
              <Link
                href="/bed-bug-treatment"
                className="text-green-400 hover:text-green-300"
              >
                bed bug treatment
              </Link>
              ,{" "}
              <Link
                href="/rat-extermination"
                className="text-green-400 hover:text-green-300"
              >
                rat extermination
              </Link>
              ,{" "}
              <Link
                href="/mouse-extermination"
                className="text-green-400 hover:text-green-300"
              >
                mouse extermination
              </Link>
              ,{" "}
              <Link
                href="/termite-treatment"
                className="text-green-400 hover:text-green-300"
              >
                termite treatment
              </Link>
              , and{" "}
              <Link
                href="/general-pest-control"
                className="text-green-400 hover:text-green-300"
              >
                general pest control
              </Link>{" "}
              needs.
            </p>

            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Customer <span className="text-green-500">Reviews</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Every review below comes from a real customer who hired our{" "}
            <Link
              href="/services"
              className="text-green-400 hover:text-green-300"
            >
              licensed pest control and exterminator services
            </Link>
            . No fabricated ratings, no cherry-picking.
          </p>
          <div className="mt-10">
            <ReviewsList />
          </div>
        </div>
      </section>

      <CTAGroup variant="mid" title="Had a Great Experience?" subtitle={`Text ${PHONE} and let us know — we'd love to hear from you.`} />

      {/* ── Why DC Trusts Us ── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why DC Trusts <span className="text-green-500">{SITE_NAME}</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Licensed exterminators serving all Washington, D.C. area and the surrounding metro area for{" "}
            <Link
              href="/cockroach-extermination"
              className="text-green-400 hover:text-green-300"
            >
              cockroach extermination
            </Link>
            ,{" "}
            <Link
              href="/bed-bug-treatment"
              className="text-green-400 hover:text-green-300"
            >
              bed bug treatment
            </Link>
            ,{" "}
            <Link
              href="/rat-extermination"
              className="text-green-400 hover:text-green-300"
            >
              rat control
            </Link>
            ,{" "}
            <Link
              href="/mouse-extermination"
              className="text-green-400 hover:text-green-300"
            >
              mouse removal
            </Link>
            ,{" "}
            <Link
              href="/termite-treatment"
              className="text-green-400 hover:text-green-300"
            >
              termite treatment
            </Link>
            , and{" "}
            <Link
              href="/general-pest-control"
              className="text-green-400 hover:text-green-300"
            >
              general pest management
            </Link>
            . Browse our{" "}
            <Link href="/areas" className="text-green-400 hover:text-green-300">
              service areas
            </Link>{" "}
            to find coverage in your neighborhood, check our{" "}
            <Link href="/pricing" className="text-green-400 hover:text-green-300">
              pricing page
            </Link>{" "}
            for transparent cost information, read our{" "}
            <Link href="/faq" className="text-green-400 hover:text-green-300">
              frequently asked questions
            </Link>
            , or learn more{" "}
            <Link href="/about" className="text-green-400 hover:text-green-300">
              about our company
            </Link>{" "}
            and the team behind our pest control and exterminator service.
          </p>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
