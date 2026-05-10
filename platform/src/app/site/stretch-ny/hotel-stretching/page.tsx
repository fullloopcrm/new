// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { parks, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

export const metadata: Metadata = {
  title: "Hotel Stretch Service NYC | We Come to Your Room | $99/hr",
  description: "Hotel stretch service in NYC. Certified therapists come to your room or meet you at iconic locations. $99/hr, 10% off weekly. Same-day available 7AM-10PM.",
  alternates: { canonical: `${SITE_URL}/hotel-stretching` },
};

const touristParks = parks.filter((p) => p.touristRating >= 4).slice(0, 12);

const hotelFaqs = [
  { question: "Do you really come to my hotel room?", answer: "Yes! Our therapists bring a professional massage table, mats, and all necessary equipment directly to your hotel room. We set up in minutes and leave no trace. Works in any hotel room with a flat 8x6ft space." },
  { question: "Can you meet me at a park or tourist location instead?", answer: "Absolutely! We have 30+ iconic NYC locations where we stretch including Central Park, Brooklyn Bridge Park, The High Line, and more. You can also split — start at a park and finish at your hotel." },
  { question: "How do I book?", answer: "Just text 212-202-7080 with your hotel name, preferred date/time, and number of people. We'll confirm availability instantly. Same-day appointments are usually available." },
  { question: "I'm with a group — can you stretch all of us?", answer: "Yes! Group rates are available. Whether it's a family, friends, or business group, we can arrange multiple therapists. Text us with your group size for a custom quote." },
  { question: "What should I wear?", answer: "Comfortable, flexible clothing — athletic wear, yoga pants, or shorts. No jeans or restrictive clothing. We'll handle everything else." },
  { question: "Is this safe?", answer: "All our therapists are certified, background-checked, and experienced professionals. We carry insurance and our therapists are vetted extensively." },
];

export default function HotelStretchingPage() {
  return (
    <>
      <JsonLd data={webPageSchema("NYC Hotel Stretching Service", "Mobile stretching for tourists — we come to your hotel room.", `${SITE_URL}/hotel-stretching`)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: SITE_URL }, { name: "Hotel Stretching", url: `${SITE_URL}/hotel-stretching` }])} />
      <JsonLd data={faqSchema(hotelFaqs)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Hotel Room Stretch Service &mdash; All NYC Boroughs | $99/hr | Same-Day</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Hotel Stretch Service — <span className="text-teal-200">We Come to You</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Listen, we know the drill — you fly in, walk around the city all day, hit up all the iconic spots, and by the time you get back to your hotel room, your body is SCREAMING at you. We&apos;ve got you covered!
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Here&apos;s What We Do</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-2xl">✈️</p>
              <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">Come to Your Hotel</h3>
              <p className="mt-2 text-sm text-slate-600">After a long day of sightseeing, we set up right in your hotel room. We bring everything — massage table, mats, straps, everything. You just relax.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-2xl">🗽</p>
              <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">Meet You at Iconic Spots</h3>
              <p className="mt-2 text-sm text-slate-600">Central Park, Brooklyn Bridge Park, The High Line, and 30+ more iconic NYC locations. Get stretched with the skyline as your backdrop.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-2xl">🏨</p>
              <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">Business Travelers</h3>
              <p className="mt-2 text-sm text-slate-600">Tight schedule? We work around you — 7AM to 10PM, 7 days a week. Perfect between meetings or after a conference.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-2xl">👨‍👩‍👧‍👦</p>
              <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">Families & Groups</h3>
              <p className="mt-2 text-sm text-slate-600">Traveling with family or friends? We arrange multiple therapists for group sessions. Everyone gets stretched, everyone feels amazing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Pricing for Visitors</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-md mx-auto">
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <p className="text-3xl font-bold text-teal-700">$99</p>
              <p className="text-sm text-slate-500">1 Hour Session</p>
            </div>
            <div className="rounded-xl border-2 border-teal-500 bg-white p-6">
              <p className="text-3xl font-bold text-teal-700">$89</p>
              <p className="text-sm text-slate-500">Weekly (10% Off)</p>
            </div>
          </div>
          <p className="mt-6 text-base text-slate-600">
            NYC is amazing, but it&apos;s also EXHAUSTING. Don&apos;t let sore muscles and tight hips ruin your trip. Let us help you actually enjoy your time here!
          </p>
        </div>
      </section>

      {/* Iconic Locations */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Iconic NYC Locations Where We Stretch</h2>
          <p className="mt-3 text-center text-base text-slate-600">Meet us at any of these spots — or we&apos;ll come to your hotel. Your call!</p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {touristParks.map((p, i) => (
              <Link key={p.slug} href={`/parks/${p.slug}`}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{i + 1}</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">{p.borough}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/parks" className="text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta">View All 50+ Locations &rarr;</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Hotel Stretching FAQ</h2>
          <div className="mt-8 space-y-3">
            {hotelFaqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-teal-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white font-heading">Book Your Hotel Stretch</h2>
          <p className="mt-4 text-lg text-white/80">We&apos;re mobile, affordable, and ready when you are — 7 days a week, 7AM-10PM. Because vacation shouldn&apos;t hurt.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
