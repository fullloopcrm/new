// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { parks, findParkBySlug, getParkUrl, services, SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, parkSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

interface Props { params: Promise<{ slug: string }> }

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const park = findParkBySlug(slug);
  if (!park) return {};
  return {
    title: `Stretch Service at ${park.name} | Outdoor NYC $99/hr`,
    description: `Outdoor stretch service at ${park.name}, ${park.borough}. Meet our therapists at this iconic NYC location. $99/hr, 10% off weekly. Same-day available.`,
    alternates: { canonical: `${SITE_URL}${getParkUrl(park)}` },
  };
}

export default async function ParkPage({ params }: Props) {
  const { slug } = await params;
  const park = findParkBySlug(slug);
  if (!park) notFound();

  const pageUrl = `${SITE_URL}${getParkUrl(park)}`;
  const otherParks = parks.filter((p) => p.slug !== slug && p.touristRating >= 3).slice(0, 6);

  const faqItems = [
    { question: `Can I really get a stretch at ${park.name}?`, answer: `Yes! Our certified stretch therapists meet you at ${park.name} with all necessary equipment. Best spot: ${park.bestSpot}. We recommend outdoor stretching sessions in good weather — it's an incredible NYC experience.` },
    { question: `How much does outdoor stretching at ${park.name} cost?`, answer: `Same pricing as all our sessions: $99 for 60 minutes, or $89/session for weekly clients. We bring everything — you just show up and stretch.` },
    { question: `What if the weather is bad?`, answer: `If weather doesn't cooperate, we can easily move the session to your nearby home, office, or hotel. Just text us and we'll adjust. We're flexible (pun intended).` },
    { question: `Is stretching at ${park.name} good for tourists?`, answer: `Absolutely! ${park.name} is one of NYC's most iconic locations. After walking all day exploring, a professional stretch session here is the perfect way to recover while enjoying the scenery. We also come to hotels.` },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`Stretch at ${park.name}`, park.description, pageUrl)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Parks & Iconic Locations", url: `${SITE_URL}/parks` },
        { name: park.name, url: pageUrl },
      ])} />
      <JsonLd data={parkSchema(park.name, park.borough, park.description, pageUrl)} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Outdoor Stretch Service &mdash; {park.borough} | $99/hr | {"★".repeat(park.touristRating)} Tourist Rating
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service at <span className="text-teal-200">{park.name}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {park.description} Best spot: {park.bestSpot}. Professional mobile stretch service at this iconic NYC location. $99/hr. Meet our certified therapists here or we come to you.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE} — Book This Spot</span></a>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">About Stretching at {park.name}</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{park.description}</p>
          <div className="mt-8 rounded-xl border-l-4 border-teal-500 bg-teal-50 p-6">
            <h3 className="text-lg font-bold text-teal-800 font-heading">Best Stretch Spot</h3>
            <p className="mt-2 text-base text-teal-900/80">{park.bestSpot}</p>
          </div>
          {park.nearbyAttractions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Nearby Attractions</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {park.nearbyAttractions.map((a) => (
                  <span key={a} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 border border-teal-200/60">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tourist Rating */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Tourist Appeal</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{"★".repeat(park.touristRating)}</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Borough</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{park.borough}</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Price</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">$99</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Hours</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">7-10</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Services Available at {park.name}</h2>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.slice(0, 6).map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-1">{s.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">FAQ: Stretching at {park.name}</h2>
          <div className="mt-8 space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-teal-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Other Parks */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Other Iconic Stretch Locations</h2>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {otherParks.map((p) => (
              <Link key={p.slug} href={getParkUrl(p)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{p.borough}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Book Your Stretch at {park.name}</h2>
          <p className="mt-4 text-lg text-white/80">Text us to book an outdoor stretch session. Or we&apos;ll come to your hotel — your call.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <Link href="/hotel-stretching"><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Hotel Stretching</span></Link>
          </div>
        </div>
      </section>
    </>
  );
}
