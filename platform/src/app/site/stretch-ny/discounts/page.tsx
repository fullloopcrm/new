import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

const pageTitle = "Stretch Service Discounts NYC | 10% Off Weekly & More";
const pageDescription =
  "Save on Stretch NYC mobile stretch service. 10% off weekly, community discounts for seniors/veterans/NYPD, 10% referral rewards. $99/hr base rate.";
const pageUrl = `${SITE_URL}/discounts`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
};

const discounts = [
  {
    icon: "📅",
    title: "Weekly Program Discount",
    savings: "10% Off Every Session",
    price: "$89/session (reg. $99)",
    description:
      "Commit to weekly stretching and save on every single session. Weekly clients enjoy priority scheduling, same-therapist continuity, and the best long-term results through consistent treatment.",
    details: [
      "10% off every session — $89 instead of $99",
      "Priority scheduling with preferred time slots",
      "Same therapist every week for continuity",
      "Better results through consistent treatment",
      "Cancel or pause anytime — no long-term contracts",
    ],
  },
  {
    icon: "🇺🇸",
    title: "Community Discount",
    savings: "10% Off Every Session",
    price: "$89/session (reg. $99)",
    description:
      "We proudly support the people who make New York City great. Elderly residents, military veterans, active NYPD & NYFD members, and individuals with disabilities receive an automatic 10% discount on all services.",
    details: [
      "Senior citizens (65+)",
      "Military veterans & active service members",
      "NYPD officers & NYFD firefighters",
      "Individuals with disabilities",
      "Just mention your status when booking — no paperwork",
    ],
  },
  {
    icon: "🎁",
    title: "Referral Rewards",
    savings: "10% Recurring Commission",
    price: "Earn from every session your referrals book",
    description:
      "Love Stretch NYC? Share it with friends, family, or colleagues and earn 10% of every session they book — not just their first, but every single appointment. The more people you refer, the more you earn.",
    details: [
      "Earn 10% of every service your referrals book",
      "Recurring — not just the first session, every session",
      "No limit on the number of people you can refer",
      "Credit applied to your account or paid out",
      "Share your unique referral link or just give your name",
    ],
  },
];

export default function DiscountsPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema(pageTitle, pageDescription, pageUrl, [
            { name: "Home", url: SITE_URL },
            { name: "Discounts", url: pageUrl },
          ]),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Discounts", url: pageUrl },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-600 to-teal-800 text-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Discounts & Savings
          </h1>
          <p className="text-lg md:text-xl text-teal-100 max-w-2xl mx-auto">
            Three ways to save on professional mobile assisted stretching in New York City.
          </p>
        </div>
      </section>

      {/* Discounts */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="space-y-12">
            {discounts.map((discount) => (
              <div
                key={discount.title}
                className="bg-gray-50 rounded-2xl p-8 md:p-10 border border-gray-100"
              >
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-4xl">{discount.icon}</span>
                  <div>
                    <h2 className="font-heading text-2xl md:text-3xl font-bold text-gray-900">
                      {discount.title}
                    </h2>
                    <p className="text-teal-600 font-semibold text-lg">
                      {discount.savings}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">{discount.price}</p>
                  </div>
                </div>
                <p className="text-gray-700 text-lg mb-6">{discount.description}</p>
                <ul className="space-y-2">
                  {discount.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2 text-gray-700">
                      <span className="text-teal-500 mt-1">&#10003;</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
            Ready to Save?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Text or call us to book your first session and ask about discounts. All
            discounts can be combined where applicable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={SITE_SMS_LINK}
              className="font-cta inline-block bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
            >
              Text {SITE_PHONE}
            </a>
            <Link
              href="/pricing"
              className="font-cta inline-block border-2 border-teal-600 text-teal-600 hover:bg-teal-50 px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
            >
              View Pricing
            </Link>
          </div>
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
