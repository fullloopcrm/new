// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { neighborhoods, womensCategories, mensCategories, allServices } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getServiceBySlug, getBoroughName, getServiceBoroughParams, serviceSchema, breadcrumbSchema, faqSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { serviceContent } from "@/app/site/nyc-mobile-salon/_lib/service-content";

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string; borough: string }> };

function isWomensService(slug: string): boolean {
  return womensCategories.some((cat) => cat.services.some((s) => s.slug === slug));
}

function getCategoryName(slug: string): string {
  for (const cat of [...womensCategories, ...mensCategories]) {
    if (cat.services.some((s) => s.slug === slug)) return cat.title;
  }
  return "Services";
}

function getRelatedServices(slug: string) {
  for (const cat of [...womensCategories, ...mensCategories]) {
    if (cat.services.some((s) => s.slug === slug)) {
      return cat.services.filter((s) => s.slug !== slug).slice(0, 4);
    }
  }
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, borough } = await params;
  const svc = getServiceBySlug(slug);
  const boro = getBoroughName(borough);
  if (!svc || !boro) return {};
  const content = serviceContent[slug];
  return {
    title: `Mobile ${svc.name} in ${boro}, NYC — At Your Door`,
    description: `Book mobile ${svc.name.toLowerCase()} in ${boro}, New York. ${svc.description}. Licensed professionals deliver to any ${boro} neighborhood.${content ? ` From ${content.price}.` : ""}`,
    alternates: { canonical: `https://thenycmobilesalon.com/services/${slug}/${borough}` },
  };
}

export default async function ServiceBoroughPage({ params }: Props) {
  const { slug, borough } = await params;
  const svc = getServiceBySlug(slug);
  const boro = getBoroughName(borough);
  const hoods = neighborhoods[borough];
  if (!svc || !boro || !hoods) notFound();

  const isWomens = isWomensService(slug);
  const content = serviceContent[slug];
  const related = getRelatedServices(slug);
  const category = getCategoryName(slug);

  const accentBg = isWomens ? "bg-blush-light" : "bg-sky-50";
  const accentBorder = isWomens ? "border-pink-100" : "border-sky-100";
  const accentBorderHover = isWomens ? "hover:border-blush hover:text-blush-dark" : "hover:border-sky-500 hover:text-sky-600";
  const accentText = isWomens ? "text-blush-dark" : "text-sky-600";
  const accentBgSmall = isWomens ? "bg-blush/20" : "bg-sky-100";
  const ctaClass = isWomens
    ? "btn-rose"
    : "inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display";
  const ctaOutlineClass = isWomens
    ? "btn-outline-white"
    : "inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display";

  const boroughFaqs = [
    {
      q: `How much does mobile ${svc.name.toLowerCase()} cost in ${boro}?`,
      a: content
        ? `${svc.name} in ${boro} starts at ${content.price}. Every booking includes travel to your door anywhere in ${boro}, all tools and products, and a licensed professional. No hidden fees or ${boro} surcharges.`
        : `Pricing varies by service. Contact us for a quote. Every price includes travel to your door in ${boro}, tools, products, and a licensed professional.`,
    },
    {
      q: `How far in advance should I book ${svc.name.toLowerCase()} in ${boro}?`,
      a: `We recommend booking 24–48 hours in advance for ${boro} appointments, though same-day availability is often possible. For weekends and evenings in ${boro}, booking 3–5 days ahead gives you the best selection of time slots.`,
    },
    {
      q: `Do you really serve all neighborhoods in ${boro}?`,
      a: `Yes — we cover every neighborhood in ${boro}, from ${hoods[0].name} to ${hoods[hoods.length - 1].name} and everywhere in between. Our professionals live and work across NYC and are assigned based on proximity to your ${boro} address.`,
    },
    {
      q: `What do I need to prepare for ${svc.name.toLowerCase()} at home in ${boro}?`,
      a: `Almost nothing! Your professional arrives with all tools, products, and supplies. Just have a comfortable, well-lit space ready. For hair services, access to a sink is helpful but not always required — your stylist will confirm what's needed when you book.`,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        serviceSchema(`Mobile ${svc.name} in ${boro}`, `${svc.description} — delivered to your door in ${boro}.`, boro)
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Services", url: "/services" },
          { name: svc.name, url: `/services/${slug}` },
          { name: boro, url: `/services/${slug}/${borough}` },
        ])
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(boroughFaqs)) }} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={isWomens ? { background: "linear-gradient(135deg, #E8A0BF 0%, #D4749B 100%)" } : { background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Link href="/services" className="hover:text-white/80">Services</Link>
            <span>/</span>
            <Link href={`/services/${slug}`} className="hover:text-white/80">{svc.name}</Link>
            <span>/</span>
            <span className="text-white/40">{boro}</span>
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            {svc.name} in <span className="italic">{boro}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            {svc.description} — delivered to any neighborhood in {boro} by licensed, insured professionals.
            {content ? ` From ${content.price}. ${content.duration}.` : ""}
          </p>
          <div className="mt-8">
            <Link href="/book" className={ctaOutlineClass}>Book {svc.name} in {boro}</Link>
          </div>
        </div>
      </section>

      {/* ── Rich Intro Content ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-6 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Mobile {svc.name.toLowerCase()} across {boro}
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Looking for mobile {svc.name.toLowerCase()} in {boro}? <Link href="/services" className={`font-medium underline decoration-1 underline-offset-2 ${accentText}`}>The NYC Mobile Salon</Link> sends licensed professionals directly to your home, office, or hotel anywhere in {boro}. {content?.details ?? `${svc.description}. We bring all tools, products, and sanitation supplies — you just relax and enjoy.`}
            </p>
            <p>
              {content?.ideal ?? `Whether it's a special occasion or regular maintenance, our mobile ${svc.name.toLowerCase()} service brings the full salon experience to your door. No commute, no waiting, no compromises on quality.`}
            </p>
            <p>
              What sets mobile {svc.name.toLowerCase()} in {boro} apart? You get the same quality you&apos;d find at a top {boro} salon — without the commute, the wait, or the markup. Our professionals are assigned based on proximity to your {boro} address, which means less travel time and more flexibility for you. Check our <Link href="/pricing" className={`font-medium underline decoration-1 underline-offset-2 ${accentText}`}>pricing page</Link> for transparent rates, or visit <Link href="/how-it-works" className={`font-medium underline decoration-1 underline-offset-2 ${accentText}`}>how it works</Link> to see the booking process step by step.
            </p>
            <p>
              We serve every neighborhood in {boro} — from {hoods[0].name} to {hoods[hoods.length - 1].name} and everywhere in between. Same pricing, same quality, same convenience. Whether you&apos;re in a high-rise, a brownstone, a hotel, or an office, we come to you with everything needed for a flawless {svc.name.toLowerCase()} experience. View all <Link href={`/services/${slug}`} className={`font-medium underline decoration-1 underline-offset-2 ${accentText}`}>{svc.name} details</Link> including what&apos;s included and pricing.
            </p>
            {content && (
              <p>
                Every {svc.name.toLowerCase()} appointment in {boro} includes a consultation with your {category.toLowerCase() === "beard" || category.toLowerCase() === "mens-hair" ? "barber" : "stylist"} to ensure the result matches exactly what you&apos;re envisioning. We bring all professional-grade tools, premium products, and sanitized equipment — you don&apos;t need to provide a thing. Starting at {content.price}, with appointments available 7 days a week.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── What's Included ── */}
      {content && (
        <section className={`px-6 py-16 md:py-20 ${accentBg}`}>
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal">
              What&apos;s included with {svc.name.toLowerCase()} in {boro}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {content.includes.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${accentBgSmall}`}>
                    <svg className={`h-3 w-3 ${accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span className="text-base text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Quick Details Row ── */}
      {content && (
        <section className="bg-white px-6 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`rounded-xl border ${accentBorder} bg-white p-6 text-center`}>
                <p className="text-sm font-medium uppercase tracking-wider text-gray-400">Starting Price</p>
                <p className="font-display mt-2 text-2xl font-bold text-charcoal">{content.price}</p>
              </div>
              <div className={`rounded-xl border ${accentBorder} bg-white p-6 text-center`}>
                <p className="text-sm font-medium uppercase tracking-wider text-gray-400">Duration</p>
                <p className="font-display mt-2 text-2xl font-bold text-charcoal">{content.duration}</p>
              </div>
              <div className={`rounded-xl border ${accentBorder} bg-white p-6 text-center`}>
                <p className="text-sm font-medium uppercase tracking-wider text-gray-400">Coverage</p>
                <p className="font-display mt-2 text-2xl font-bold text-charcoal">All of {boro}</p>
              </div>
              <div className={`rounded-xl border ${accentBorder} bg-white p-6 text-center`}>
                <p className="text-sm font-medium uppercase tracking-wider text-gray-400">Licensing</p>
                <p className="font-display mt-2 text-2xl font-bold text-charcoal">NYS Licensed</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── How It Works ── */}
      <section className={`px-6 py-16 md:py-20 ${content ? accentBg : "bg-white"}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            How mobile {svc.name.toLowerCase()} works in {boro}
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${accentBgSmall}`}>
                <span className={`font-display text-xl font-bold ${accentText}`}>1</span>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Book online</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Pick your service, choose a date and time, and enter your {boro} address. We&apos;ll confirm within hours and match you with a pro near you.
              </p>
            </div>
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${accentBgSmall}`}>
                <span className={`font-display text-xl font-bold ${accentText}`}>2</span>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">We arrive at your door</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Your licensed professional shows up on time with all tools, products, and sanitized equipment. No setup needed on your end — just open the door.
              </p>
            </div>
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${accentBgSmall}`}>
                <span className={`font-display text-xl font-bold ${accentText}`}>3</span>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Enjoy the results</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Sit back and enjoy salon-quality {svc.name.toLowerCase()} in the comfort of your own space. We clean up after ourselves — you just enjoy the results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Neighborhoods ── */}
      <section className={`px-4 py-16 md:py-20 ${content ? "bg-white" : accentBg}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-3 text-2xl font-medium tracking-tight text-charcoal">
            {svc.name} by neighborhood in {boro}
          </h2>
          <p className="mb-8 text-gray-500">
            We serve {hoods.length} neighborhoods across {boro}. Pick yours to see local details.
          </p>
          <div className="flex flex-wrap gap-2">
            {hoods.map((hood) => (
              <Link
                key={hood.slug}
                href={`/services/${slug}/${borough}/${hood.slug}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all hover:shadow-sm ${isWomens ? "border-pink-200 text-gray-600 hover:border-blush hover:bg-white hover:text-blush-dark" : "border-sky-200 text-gray-600 hover:border-sky-500 hover:bg-white hover:text-sky-600"}`}
              >
                {hood.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Mobile Service in Borough ── */}
      <section className={`px-6 py-16 md:py-20 ${content ? accentBg : "bg-white"}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Why mobile {svc.name.toLowerCase()} in {boro}?
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className={`rounded-xl border ${accentBorder} bg-white p-6`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${accentBgSmall}`}>
                <svg className={`h-5 w-5 ${accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">No commute</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Skip the subway, the cab, and the walk. Your {svc.name.toLowerCase()} professional comes directly to your {boro} address — apartment, office, hotel, or wherever you are.
              </p>
            </div>
            <div className={`rounded-xl border ${accentBorder} bg-white p-6`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${accentBgSmall}`}>
                <svg className={`h-5 w-5 ${accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Your schedule</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Mornings, evenings, weekends — we work around your life, not the other way around. Available 7 days a week across all of {boro}.
              </p>
            </div>
            <div className={`rounded-xl border ${accentBorder} bg-white p-6`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${accentBgSmall}`}>
                <svg className={`h-5 w-5 ${accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Licensed pros</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Every professional is NYS licensed, carries liability insurance, and has been vetted through our screening process. Salon-quality {svc.name.toLowerCase()}, guaranteed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-8 text-center text-3xl font-medium tracking-tight text-charcoal">
            {svc.name} in {boro} — FAQ
          </h2>
          {boroughFaqs.map((faq, i) => (
            <details key={faq.q} className={`group ${i > 0 ? "border-t border-gray-200" : ""}`}>
              <summary className="flex cursor-pointer items-center justify-between py-5 text-left">
                <span className="font-display text-lg text-charcoal">{faq.q}</span>
                <svg className={`h-5 w-5 shrink-0 ${accentText} transition-transform group-open:rotate-90`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </summary>
              <p className="pb-5 leading-relaxed text-gray-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Related Services ── */}
      {related.length > 0 && (
        <section className={`px-4 py-16 md:py-20 ${accentBg}`}>
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display mb-3 text-center text-3xl font-medium tracking-tight text-charcoal">
              Related {category.toLowerCase()} services in {boro}
            </h2>
            <p className="mb-8 text-center text-gray-500">
              Explore more mobile {category.toLowerCase()} services available across {boro}.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {related.map((r) => (
                <Link key={r.slug} href={`/services/${r.slug}/${borough}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${accentBorder}`}>
                  <p className="text-sm font-semibold text-charcoal">{r.name}</p>
                  <p className="mt-1 text-xs text-gray-400">{r.description}</p>
                  <p className={`mt-2 text-xs font-medium ${accentText}`}>View in {boro}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="bg-white px-4 py-16 md:py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display mb-4 text-3xl font-medium text-charcoal md:text-4xl">
            Book {svc.name} in <span className="italic">{boro}</span>
          </h2>
          <p className="mb-3 text-lg text-gray-500">
            Licensed pros. Your space. Your schedule.{content ? ` Starting at ${content.price}.` : ""}
          </p>
          <p className="mb-8 text-sm text-gray-400">
            We serve {hoods.length} neighborhoods across {boro} — 7 days a week, morning to evening. No hidden fees, no travel surcharges, no compromises.
          </p>
          <Link href="/book" className={ctaClass}>Book {svc.name} Now</Link>
        </div>
      </section>
    </>
  );
}
