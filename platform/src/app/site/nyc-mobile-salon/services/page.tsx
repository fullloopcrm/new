import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { womensCategories, mensCategories, boroughNames, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { serviceContent } from "@/app/site/nyc-mobile-salon/_lib/service-content";

export const metadata: Metadata = {
  title: "Mobile Beauty Services in NYC | Hair, Nails, Makeup, Grooming — All 5 Boroughs",
  description:
    "37+ mobile beauty services for women and men. Hair, nails, makeup, waxing, facials, fades, beard sculpting & more — delivered to your door by licensed pros across Manhattan, Brooklyn, Queens, Bronx & Staten Island. $99/hr, no travel fees.",
  alternates: { canonical: "https://thenycmobilesalon.com/services" },
  openGraph: {
    title: "Mobile Beauty Services in NYC | Hair, Nails, Makeup, Grooming — All 5 Boroughs",
    description:
      "37+ mobile beauty services for women and men. Hair, nails, makeup, waxing, facials, fades, beard sculpting & more — delivered to your door by licensed pros across Manhattan, Brooklyn, Queens, Bronx & Staten Island. $99/hr, no travel fees.",
    url: "https://thenycmobilesalon.com/services",
  },
};

const faqs = [
  {
    q: "What mobile beauty services do you offer in NYC?",
    a: "We offer 37+ mobile beauty services across 6 categories: women's hair (blowouts, haircuts, color, highlights, silk press, braids, extensions, updos), nails (classic and gel manicures, pedicures, nail art, acrylics, dip powder), makeup (full glam, natural everyday, lash application), skin care (express facials, deep cleansing facials, microdermabrasion, chemical peels), waxing (brows, lip, chin, bikini, Brazilian, legs, underarms), and a full men's grooming menu including fades, beard sculpting, hot towel shaves, and more. Every service is performed at your location by a licensed professional.",
  },
  {
    q: "Are your stylists and barbers licensed?",
    a: "Yes, every single professional on The NYC Mobile Salon team is fully licensed by the New York State Department of State Division of Licensing Services. Our hairstylists, colorists, nail technicians, estheticians, makeup artists, barbers, and waxing specialists all hold current, valid New York State cosmetology or specialty licenses. We verify credentials before anyone joins our team, and we require ongoing education to keep skills sharp and up to date.",
  },
  {
    q: "How much do your mobile beauty services cost?",
    a: "Our services are priced at $99 per hour with a one-hour minimum for individual appointments. For groups of 3 or more people, there is a two-hour minimum. There are never any travel fees — whether you are in Manhattan, Brooklyn, Queens, the Bronx, or Staten Island, the price is the same. All supplies, tools, and professional-grade products are included in the hourly rate. No hidden charges, no surprise add-ons.",
  },
  {
    q: "Can I book multiple services in one appointment?",
    a: "Absolutely. Many of our clients book combination appointments — for example, a blowout plus full glam makeup before an event, or a haircut, beard trim, and brow cleanup in a single session. Because we charge by the hour, you can stack as many services as you like. Your stylist or technician will estimate the total time needed so you know the cost up front. For groups, we can send multiple professionals to serve everyone simultaneously.",
  },
  {
    q: "Do you serve all five NYC boroughs?",
    a: "Yes, we serve every neighborhood in all five boroughs: Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. From the Upper East Side to Bushwick, from Astoria to Riverdale, from St. George to Flushing — we come to you. There are no travel fees regardless of your location within NYC. We serve homes, apartments, offices, hotels, event venues, and any private location.",
  },
  {
    q: "Do you offer services for events like weddings and parties?",
    a: "Yes, events are one of our specialties. We offer bridal beauty packages, bridesmaid styling, bachelorette party glam, prom prep, birthday party services, corporate event grooming, photo shoot styling, holiday party looks, and more. Our event packages include on-site professionals who bring everything needed. We can serve large groups with multiple stylists, makeup artists, and nail techs working simultaneously. Visit our events page to learn more and book.",
  },
  {
    q: "Do you offer men's grooming services?",
    a: "Yes, we have a comprehensive men's grooming menu that includes haircuts and styling, precision fades (low, mid, high, skin, shadow, drop, burst, and temp fades), line-ups and edge-ups, buzz cuts, beard trims and sculpting, hot towel straight razor shaves, beard oil treatments, brow cleanup, ear and nose waxing, scalp treatments, men's manicures, men's pedicures, and back waxing. Every service is performed by a licensed barber or grooming specialist at your location.",
  },
  {
    q: "What products and tools do your professionals use?",
    a: "Our professionals use salon-grade and barbershop-grade products and tools. For hair, that includes professional dryers, flat irons, curling wands, clippers, trimmers, and shears, plus products from top brands. For nails, we use OPI, Essie, CND Shellac, and Gelish with portable UV/LED lamps. Makeup artists work with MAC, NARS, Charlotte Tilbury, and Make Up For Ever. Estheticians bring portable steamers and professional skincare lines. All tools are sanitized between clients with hospital-grade protocols. Every product and tool is included in your service price.",
  },
];

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function ServicesPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(faqSchema(faqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Services", url: "/services" },
            ])
          ),
        }}
      />

      {/* Hero */}
      <section className="bg-hero-gradient relative overflow-hidden px-4 py-20 md:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-pink-500/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-blush" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blush">Full Service Menu</span>
            <Sparkle className="h-4 w-4 text-blush" />
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Mobile Beauty Services <span className="italic text-gradient-rose">in NYC</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/70">
            From blowouts to Brazilians, fades to facials — 37+ mobile beauty services delivered to your door by licensed professionals across all five NYC boroughs. Just $99/hr with no travel fees.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/services/womens" className="btn-rose">Women&apos;s Services</Link>
            <Link href="/services/mens" className="btn-outline-light">Men&apos;s Services</Link>
          </div>
        </div>
      </section>

      {/* SEO Intro Section */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal md:text-4xl text-center">
            The Complete Mobile Beauty &amp; Grooming Menu for New York City
          </h2>
          <div className="space-y-5 text-gray-600 leading-relaxed">
            <p>
              The NYC Mobile Salon brings a full-service beauty and grooming experience directly to your door — no salon commute, no waiting room, no parking headaches. Our menu spans <strong>37+ professional services across 6 categories</strong>, covering everything from precision haircuts and vibrant color treatments to relaxing facials, flawless makeup, meticulous nail work, and expert waxing. Whether you are preparing for a wedding in the West Village, need a fresh fade in Fort Greene, or want a gel manicure delivered to your Upper East Side apartment, we have you covered.
            </p>
            <p>
              Every service on our menu is performed by a <strong>fully licensed New York State professional</strong> — cosmetologists, barbers, estheticians, nail technicians, and makeup artists who bring years of experience and salon-quality tools to your location. We serve all five boroughs: <Link href="/locations/manhattan" className="text-blush-dark underline underline-offset-2 hover:text-blush">Manhattan</Link>, <Link href="/locations/brooklyn" className="text-blush-dark underline underline-offset-2 hover:text-blush">Brooklyn</Link>, <Link href="/locations/queens" className="text-blush-dark underline underline-offset-2 hover:text-blush">Queens</Link>, <Link href="/locations/bronx" className="text-blush-dark underline underline-offset-2 hover:text-blush">the Bronx</Link>, and <Link href="/locations/staten-island" className="text-blush-dark underline underline-offset-2 hover:text-blush">Staten Island</Link>. No neighborhood is out of range, and there are never any travel fees.
            </p>
            <p>
              Our pricing is simple and transparent: <strong>$99 per hour</strong> with a one-hour minimum for individual appointments and a two-hour minimum for groups of three or more. Every dollar covers the professional, their tools, and all products used during your appointment — there are no hidden charges, no product upcharges, and no surprise fees. You can stack multiple services into a single appointment and your stylist will estimate the total time before you book so you know the cost upfront.
            </p>
            <p>
              Below you will find our full <Link href="/services/womens" className="text-blush-dark underline underline-offset-2 hover:text-blush">women&apos;s services</Link> menu — including hair, nails, makeup, skin care, and waxing — alongside our complete <Link href="/services/mens" className="text-blush-dark underline underline-offset-2 hover:text-blush">men&apos;s grooming</Link> menu featuring haircuts, fades, beard work, and body grooming. We also offer <Link href="/events" className="text-blush-dark underline underline-offset-2 hover:text-blush">event packages</Link> for weddings, parties, and corporate gatherings, plus hands-on <Link href="/classes" className="text-blush-dark underline underline-offset-2 hover:text-blush">beauty classes</Link> taught by our pros. Explore every service, learn <Link href="/how-it-works" className="text-blush-dark underline underline-offset-2 hover:text-blush">how it works</Link>, and book your appointment today.
            </p>
            <p>
              Whether you need a single blowout before a dinner date or a team of stylists for a 12-person bridal party, The NYC Mobile Salon delivers the same quality you would expect from a top Manhattan salon — except the salon comes to you. Licensed professionals, premium products, flexible scheduling, and no commute. That is the mobile beauty difference.
            </p>
          </div>
        </div>
      </section>

      {/* Women's Services */}
      <section className="bg-blush-light px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex items-center justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blush-dark">
                <Sparkle className="mr-1 h-3 w-3" /> For Her
              </p>
              <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
                Women&apos;s Services
              </h2>
            </div>
            <Link href="/services/womens" className="btn-outline-rose hidden md:inline-block">
              View All Women&apos;s
            </Link>
          </div>

          <div className="mb-10 max-w-3xl space-y-4 text-gray-600 leading-relaxed">
            <p>
              Our women&apos;s menu covers five categories — <strong>hair, nails, makeup, skin care, and waxing</strong> — with over 25 individual services designed to cover every beauty need you could have. From a quick brow wax to a full color transformation with highlights and a blowout, every service is performed in the comfort of your home, office, or hotel room by a licensed professional who brings salon-grade tools and premium products. No commute, no waiting, no compromises on quality.
            </p>
            <p>
              Hair services range from blowouts and styling to precision haircuts, single-process and double-process color, highlights and balayage, deep conditioning treatments, silk presses for natural hair, braids and protective styles, extensions, and formal updos. Nail services include classic and gel manicures, classic and gel pedicures, nail art, acrylic and press-on sets, and dip powder. Our makeup artists deliver everything from natural everyday looks to full event glam with lash application. Skin care services include express facials, deep cleansing facials, microdermabrasion, and light chemical peels. And our waxing menu covers brows, lip, chin, full face, bikini, Brazilian, legs, and underarms. Whatever you need, we bring it to you — all at <strong>$99/hr with no travel fees</strong>.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {womensCategories.map((cat) => (
              <div key={cat.slug} className="rounded-xl border border-pink-100 bg-white p-6">
                <h3 className="font-display mb-4 text-lg font-semibold text-charcoal">{cat.title}</h3>
                <ul className="space-y-2.5">
                  {cat.services.map((s) => {
                    const content = serviceContent[s.slug];
                    return (
                      <li key={s.slug}>
                        <Link href={`/services/${s.slug}`} className="group flex items-start gap-2.5">
                          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush/20">
                            <svg className="h-3 w-3 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-charcoal group-hover:text-blush-dark transition-colors">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.description}</p>
                            {content && (
                              <p className="mt-0.5 text-xs font-medium text-blush-dark">From {content.price} &middot; {content.duration}</p>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link href="/services/womens" className="btn-rose">View All Women&apos;s Services</Link>
          </div>
        </div>
      </section>

      {/* Men's Services */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex items-center justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sky-500">For Him</p>
              <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
                Men&apos;s Services
              </h2>
            </div>
            <Link href="/services/mens" className="inline-block rounded-full bg-sky-500 px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display hidden md:inline-block">
              View All Men&apos;s
            </Link>
          </div>

          <div className="mb-10 max-w-3xl space-y-4 text-gray-600 leading-relaxed">
            <p>
              Men&apos;s grooming has evolved far beyond a quick trim at the corner barbershop, and The NYC Mobile Salon is leading that evolution in New York City. Our <strong>men&apos;s grooming menu covers three categories — hair, beard, and body grooming</strong> — with over a dozen professional services designed for the modern man who values his appearance and his time. Every service is performed at your location by a licensed barber or grooming specialist with professional-grade tools.
            </p>
            <p>
              Hair services include classic and modern haircuts, precision fades in every style (low, mid, high, skin, shadow, drop, burst, and temp), crisp line-ups and edge-ups, and clean buzz cuts. Our beard menu features sculpted trims and shaping, old-school hot towel straight razor shaves, and hydrating beard oil treatments. The body grooming menu rounds things out with brow cleanup, ear and nose waxing, scalp treatments, men&apos;s manicures, men&apos;s pedicures, and back waxing. Whether you are a Wall Street executive, a creative professional in Williamsburg, or a dad in Park Slope who just needs 30 minutes to look sharp, we come to you — <strong>$99/hr, no travel fees, all boroughs</strong>.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {mensCategories.map((cat) => (
              <div key={cat.slug} className="rounded-xl border border-sky-100 bg-sky-50 p-6">
                <h3 className="font-display mb-4 text-lg font-semibold text-charcoal">{cat.title}</h3>
                <ul className="space-y-2.5">
                  {cat.services.map((s) => {
                    const content = serviceContent[s.slug];
                    return (
                      <li key={s.slug}>
                        <Link href={`/services/${s.slug}`} className="group flex items-start gap-2.5">
                          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100">
                            <svg className="h-3 w-3 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-charcoal group-hover:text-sky-600 transition-colors">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.description}</p>
                            {content && (
                              <p className="mt-0.5 text-xs font-medium text-sky-600">From {content.price} &middot; {content.duration}</p>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link href="/services/mens" className="inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display">View All Men&apos;s Services</Link>
          </div>
        </div>
      </section>

      {/* Why Mobile Beauty */}
      <section className="bg-blush-light px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> The Mobile Advantage
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Why New Yorkers are switching to mobile beauty
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-500">
              Salon-quality results without the salon hassle. Here is why thousands of NYC clients have made the switch to mobile beauty and grooming services.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-pink-100 bg-white p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blush/20">
                <svg className="h-6 w-6 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">No Commute</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Skip the subway, skip the traffic, skip searching for a parking spot. Your stylist, barber, or nail tech comes directly to your home, office, or hotel room. You save time and energy — and you never have to sit in a salon waiting room again. In a city where the average commute eats 40 minutes each way, that time adds up fast.
              </p>
            </div>

            <div className="rounded-xl border border-pink-100 bg-white p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blush/20">
                <svg className="h-6 w-6 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Your Schedule</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Early morning before work, late evening after the kids are asleep, weekends, holidays — we work around your life, not the other way around. Book the time that works for you. No more rearranging your entire day to fit a salon appointment window. Flexibility is built into the mobile beauty model from the ground up.
              </p>
            </div>

            <div className="rounded-xl border border-pink-100 bg-white p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blush/20">
                <svg className="h-6 w-6 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Licensed Pros</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Every professional on our team is fully licensed by New York State. Hairstylists, colorists, barbers, estheticians, nail technicians, and makeup artists — all vetted, credentialed, and experienced. We use hospital-grade sanitization between clients and bring professional tools and premium products to every appointment. Same quality as a top salon, different location.
              </p>
            </div>

            <div className="rounded-xl border border-pink-100 bg-white p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blush/20">
                <svg className="h-6 w-6 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">All-Inclusive Pricing</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                $99 per hour. One-hour minimum for individuals, two-hour minimum for groups of three or more. That price covers everything — the professional, their tools, all products, and travel to your location anywhere in the five boroughs. No travel surcharges, no product upcharges, no hidden fees. You know exactly what you are paying before we arrive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blush-dark">Simple Process</p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              How mobile beauty works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-500">
              Booking a mobile beauty or grooming appointment takes less than two minutes. Here is the process from start to finish.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blush/20">
                <span className="font-display text-2xl font-bold text-blush-dark">1</span>
              </div>
              <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">Choose Your Services</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Browse our full menu of 37+ services. Pick one service or combine several into a single appointment. Select your preferred date, time, and location — we serve homes, offices, hotels, and event venues across all five NYC boroughs. Need help deciding? Our team can recommend services based on your needs.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blush/20">
                <span className="font-display text-2xl font-bold text-blush-dark">2</span>
              </div>
              <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">We Match Your Pro</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Based on the services you select and your location, we assign a licensed professional who specializes in exactly what you need. Every pro is vetted, credentialed, and experienced. They bring all tools, products, and supplies — you do not need to provide anything. We confirm your appointment details and your pro&apos;s profile before your appointment date.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blush/20">
                <span className="font-display text-2xl font-bold text-blush-dark">3</span>
              </div>
              <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">Relax &amp; Enjoy</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your professional arrives on time with everything they need. They set up quickly, perform your services with the same quality and care you would expect from a top NYC salon, and clean up when they are done. You get salon-quality results in your own space — no commute home with wet hair, no rushing out the door. Just great results and your couch.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/how-it-works" className="btn-outline-rose">
              Learn More About How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Events & Classes */}
      <section className="bg-blush-light px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> Beyond Appointments
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Events &amp; classes
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-pink-100 bg-white p-8">
              <h3 className="font-display mb-4 text-xl font-semibold text-charcoal">Event Services</h3>
              <p className="mb-4 text-sm text-gray-500 leading-relaxed">
                From bridal parties and bachelorettes to corporate events and holiday gatherings, we bring a full team of beauty professionals to your event location. Our event packages include on-site hairstylists, makeup artists, nail technicians, and barbers who work simultaneously to get your entire group ready on time. We handle weddings with 12+ bridesmaids, prom prep squads, birthday party glam sessions, and corporate event grooming for teams of any size. Every event is customized to your timeline, headcount, and service needs.
              </p>
              <p className="mb-6 text-sm text-gray-500 leading-relaxed">
                Event pricing follows the same transparent $99/hr structure with a two-hour minimum. We can provide multiple professionals for large groups to ensure everyone is serviced within your timeline. Contact us to plan your event and get a custom quote based on your group size and service selections.
              </p>
              <Link href="/events" className="btn-rose">Explore Event Packages</Link>
            </div>

            <div className="rounded-xl border border-pink-100 bg-white p-8">
              <h3 className="font-display mb-4 text-xl font-semibold text-charcoal">Beauty &amp; Grooming Classes</h3>
              <p className="mb-4 text-sm text-gray-500 leading-relaxed">
                Want to learn the techniques our professionals use? Our hands-on beauty and grooming classes are taught by the same licensed pros who perform our mobile services. Learn blowout techniques, everyday makeup application, skincare routines, nail art basics, men&apos;s grooming essentials, and more. Classes are available for individuals, small groups, and private parties — perfect for a girls&apos; night in, a team-building activity, or a mother-daughter afternoon.
              </p>
              <p className="mb-6 text-sm text-gray-500 leading-relaxed">
                Each class includes instruction, hands-on practice, and all supplies and products. Our instructors tailor the lesson to your skill level, whether you are a complete beginner or looking to refine existing skills. Classes are held at your location — your home, office, or event space — anywhere in the five boroughs. No commute, no classroom to find. Just you, your instructor, and new skills you will use every day.
              </p>
              <Link href="/classes" className="btn-outline-rose">Browse Classes</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Borough */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blush-dark">By Location</p>
          <h2 className="font-display mb-4 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Browse services by borough
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-gray-500">
            We serve every neighborhood in all five NYC boroughs with zero travel fees. Click a borough to see the neighborhoods we cover and browse location-specific service pages optimized for your area.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(boroughNames).map(([slug, name]) => (
              <Link key={slug} href={`/locations/${slug}`} className="card-hover rounded-xl border border-pink-100 bg-blush-light p-6 text-center">
                <p className="text-lg font-semibold text-charcoal">{name}</p>
                <p className="mt-1 text-xs text-blush-dark">{neighborhoods[slug]?.length} neighborhoods &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-blush-light px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blush-dark">Common Questions</p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Frequently asked questions about our services
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              Everything you need to know about booking mobile beauty and grooming services in New York City.
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-pink-100 bg-white p-6">
                <h3 className="font-display mb-3 text-base font-semibold text-charcoal">{faq.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-4 py-16 md:py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display mb-4 text-3xl font-medium text-charcoal md:text-4xl">
            Ready to <span className="italic text-gradient-rose">book?</span>
          </h2>
          <p className="mb-4 text-gray-500 leading-relaxed">
            Pick your service. Pick your spot. We handle the rest. Whether you need a single blowout, a full glam transformation, a fresh fade, or a team of pros for your wedding day, booking takes less than two minutes.
          </p>
          <p className="mb-8 text-sm text-gray-400">
            $99/hr &middot; 1-hour minimum (individual) &middot; 2-hour minimum (3+ people) &middot; No travel fees &middot; All 5 boroughs
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="btn-rose">
              Book Your Appointment
            </Link>
            <Link href="/how-it-works" className="btn-outline-rose">
              See How It Works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
