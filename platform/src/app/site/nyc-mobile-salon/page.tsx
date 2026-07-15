import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { womensCategories, mensCategories, stats, boroughNames, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { localBusinessSchema, faqSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import LeadForm from "@/app/site/nyc-mobile-salon/_components/LeadForm";

export const metadata: Metadata = {
  title: "The NYC Mobile Salon | Mobile Hair, Nails, Makeup & Grooming in NYC — All 5 Boroughs",
  description:
    "NYC\u2019s top-rated mobile salon. Licensed hairstylists, nail techs, makeup artists & barbers come to your door in Manhattan, Brooklyn, Queens, Bronx & Staten Island. Blowouts, fades, gel nails, bridal glam, silk press, waxing, facials & more. Book today \u2014 starting at $99/hr.",
  keywords: [
    "mobile salon NYC",
    "at-home hair stylist NYC",
    "mobile beauty service New York",
    "in-home blowout NYC",
    "mobile nail tech NYC",
    "mobile makeup artist NYC",
    "mobile barber NYC",
    "bridal hair and makeup NYC",
    "at-home gel manicure NYC",
    "silk press at home NYC",
    "mobile waxing NYC",
    "mobile facial NYC",
    "fade at home NYC",
    "beauty services Manhattan",
    "beauty services Brooklyn",
    "beauty services Queens",
    "beauty services Bronx",
    "beauty services Staten Island",
    "mobile salon all 5 boroughs",
    "at-home beauty classes NYC",
    "bridal party glam squad NYC",
    "mobile grooming NYC",
    "home salon service New York City",
  ],
  openGraph: {
    title: "The NYC Mobile Salon | Mobile Hair, Nails, Makeup & Grooming — All 5 Boroughs",
    description:
      "Licensed beauty pros delivered to your door in Manhattan, Brooklyn, Queens, Bronx & Staten Island. 30+ services, 5,000+ happy clients. Starting at $99/hr.",
    type: "website",
    url: "https://thenycmobilesalon.com",
  },
  alternates: {
    canonical: "https://thenycmobilesalon.com",
  },
};

const howItWorks = [
  {
    step: "01",
    title: "Tell Us What You Need",
    description: "Pick your services, choose your borough, and select a time that works for you. Book online and save $20, or text us \u2014 whatever\u2019s easiest.",
  },
  {
    step: "02",
    title: "Get Matched With a Pro",
    description: "We pair you with a licensed stylist who specializes in exactly what you\u2019re looking for. Every pro is vetted, insured, and reviewed by real New Yorkers.",
  },
  {
    step: "03",
    title: "Relax & Enjoy",
    description: "Your pro arrives at your door with everything needed \u2014 tools, products, sanitation kits. Sit back, stay in your robe, and get pampered.",
  },
];

const faqs = [
  {
    q: "What areas do you serve?",
    a: "We serve all five NYC boroughs \u2014 Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Our licensed mobile beauty professionals travel directly to your home, office, hotel, or event venue anywhere in New York City. Whether you\u2019re in a high-rise in Midtown, a brownstone in Park Slope, or a house in Bayside, we come to you.",
  },
  {
    q: "How far in advance should I book?",
    a: "We recommend booking at least 48 hours in advance for standard appointments. Same-day availability is sometimes possible depending on your borough and the service requested \u2014 just text us and we\u2019ll do our best. For events, bridal parties, and group bookings, we recommend booking 2\u20134 weeks ahead to guarantee your preferred date and team size.",
  },
  {
    q: "What do I need to provide?",
    a: "Nothing! Our stylists arrive with all the tools, products, and equipment needed for your service. All we ask is a comfortable chair and decent lighting. For hair color services, we\u2019ll need access to a sink. For nail services, we bring our own portable station. You don\u2019t need to prep anything \u2014 just be home and ready to relax.",
  },
  {
    q: "Are your stylists licensed and insured?",
    a: "Absolutely. Every professional on our team is fully licensed by the New York State Department of State, carries individual liability insurance, and has passed our vetting process including background checks and portfolio review. Your safety and satisfaction are non-negotiable. We also bring hospital-grade sanitation kits to every appointment.",
  },
  {
    q: "Can I book for a group or event?",
    a: "Yes! We specialize in group bookings and events. We\u2019ve done 500+ weddings, bridal showers, birthday parties, bachelorette weekends, corporate events, baby showers, and more across all five boroughs. We send multiple stylists so your group gets ready simultaneously \u2014 a party of 8 doesn\u2019t take 8 hours. Same flat rates, no surprise upcharges.",
  },
  {
    q: "How much does it cost?",
    a: "Our services start at $99/hr. Pricing varies by service \u2014 a blowout starts at $99, gel manicures at $65, men\u2019s haircuts and fades at $99, bridal hair and makeup at $350. Every price includes travel to your door, all tools and products, and a licensed professional. No hidden fees, no surge pricing, no tipping the meter on the way there.",
  },
  {
    q: "What\u2019s your cancellation policy?",
    a: "We understand plans change. We ask for at least 24 hours notice for cancellations or reschedules. Late cancellations (under 24 hours) may be subject to a cancellation fee. No-shows are charged the full service amount. We\u2019re flexible and fair \u2014 just communicate with us and we\u2019ll work it out.",
  },
  {
    q: "Do you offer services for men?",
    a: "Absolutely. We offer a full range of men\u2019s grooming services including haircuts, fades (low, mid, high), line ups, beard sculpting, hot towel straight razor shaves, beard oil treatments, brow cleanups, scalp treatments, men\u2019s manicures, men\u2019s pedicures, and back waxing. Same convenience, same licensed pros, delivered to your door.",
  },
];

const extendedTestimonials = [
  {
    name: "Jessica M.",
    borough: "Manhattan",
    service: "Blowout & Styling",
    text: "I never have to fight for a salon appointment again. They came right to my Upper East Side apartment and the blowout was amazing. I\u2019ve been booking monthly ever since.",
  },
  {
    name: "Marcus T.",
    borough: "Brooklyn",
    service: "Fade & Beard Sculpt",
    text: "Best fade I\u2019ve ever gotten \u2014 and I didn\u2019t even have to leave my couch in Bed-Stuy. These guys are the real deal. My barber comes to ME now.",
  },
  {
    name: "Priya S.",
    borough: "Queens",
    service: "Bridal Party",
    text: "Booked them for my bridal party in Astoria and every single person looked incredible. They sent three stylists and everyone was ready in two hours. Worth every penny.",
  },
  {
    name: "Danielle R.",
    borough: "Bronx",
    service: "Silk Press",
    text: "Finding a good silk press in the Bronx used to mean a whole day trip. Now my stylist comes to Riverdale and my hair looks better than any salon I\u2019ve been to.",
  },
  {
    name: "Anthony K.",
    borough: "Manhattan",
    service: "Grooming Package",
    text: "Got the full grooming package before a big presentation. Haircut, beard lineup, brow cleanup \u2014 all in my Midtown office during lunch. My team thought I went to a spa.",
  },
  {
    name: "Samantha L.",
    borough: "Staten Island",
    service: "Gel Mani & Pedi",
    text: "Living on Staten Island means everything is far. Having a nail tech come to my house in Todt Hill? Life changing. The gel mani lasted three weeks. Already rebooked.",
  },
];

function Stars({ className = "" }: { className?: string }) {
  return (
    <span className={`flex gap-0.5 ${className}`}>
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </span>
  );
}

function Arrow({ className = "text-current" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
    </svg>
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(localBusinessSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to Book a Mobile Salon Appointment in NYC",
          description: "Book a licensed beauty professional to your door in three easy steps.",
          step: howItWorks.map((item, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: item.title,
            text: item.description,
          })),
        }) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "The NYC Mobile Salon \u2014 Mobile Hair, Nails, Makeup & Grooming in NYC",
          description: "NYC\u2019s top-rated mobile salon. Licensed beauty pros delivered to your door across all 5 boroughs. 30+ services starting at $99/hr.",
          url: "https://thenycmobilesalon.com",
          isPartOf: { "@type": "WebSite", name: "The NYC Mobile Salon", url: "https://thenycmobilesalon.com" },
          about: [
            { "@type": "Thing", name: "Mobile Salon Services" },
            { "@type": "Thing", name: "At-Home Beauty Services NYC" },
            { "@type": "Thing", name: "Mobile Hairstylist NYC" },
            { "@type": "Thing", name: "Mobile Barber NYC" },
            { "@type": "Thing", name: "Bridal Hair and Makeup NYC" },
          ],
        }) }}
      />

      {/* ── Hero ── */}
      <section className="bg-hero-gradient relative overflow-hidden px-4 pb-16 pt-6 md:pb-24 md:pt-10">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-pink-500/5 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-rose-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-blush" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blush">NYC&apos;s #1 Mobile Beauty Service</span>
            <Sparkle className="h-4 w-4 text-blush" />
          </div>

          <h1 className="font-display mb-6 text-7xl font-bold uppercase leading-[0.95] tracking-tight md:text-9xl lg:text-[10rem]">
            <span className="text-5xl text-white md:text-7xl lg:text-8xl">Mobile Salon NYC</span>
            <br />
            <span className="text-gradient-rose">at your door.</span>
            <br />
            <span className="font-normal italic text-gradient-rose">say less.</span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-lg leading-relaxed text-white/80">
            <Link href="/services/blowouts-and-styling" className="text-blush hover:underline">Hair</Link>,{" "}
            <Link href="/services/gel-manicure" className="text-blush hover:underline">nails</Link>,{" "}
            <Link href="/services/full-glam-makeup" className="text-blush hover:underline">makeup</Link>,{" "}
            <Link href="/services/bikini-brazilian-wax" className="text-blush hover:underline">waxing</Link>,{" "}
            <Link href="/services/fade-haircut" className="text-blush hover:underline">fades</Link>,{" "}
            <Link href="/services/beard-trim-and-shape" className="text-blush hover:underline">beard sculpting</Link>{" "}
            — licensed mobile beauty pros delivered to your door across{" "}
            <Link href="/locations/manhattan" className="text-blush hover:underline">Manhattan</Link>,{" "}
            <Link href="/locations/brooklyn" className="text-blush hover:underline">Brooklyn</Link>,{" "}
            <Link href="/locations/queens" className="text-blush hover:underline">Queens</Link>,{" "}
            the <Link href="/locations/bronx" className="text-blush hover:underline">Bronx</Link> &amp;{" "}
            <Link href="/locations/staten-island" className="text-blush hover:underline">Staten Island</Link>.
            Ladies, you go first — but fellas, we got you too. Starting at $99/hr.
          </p>

          <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="btn-rose">
              Book Now — $20 Off
            </Link>
            <a href="sms:+12122029075" className="btn-outline-light">
              Text Us
            </a>
            <Link href="/pricing" className="btn-outline-light">
              See Pricing
            </Link>
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="hidden md:flex -space-x-2">
              {["J", "M", "P", "A", "S"].map((letter) => (
                <div key={letter} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-charcoal bg-blush/20 text-xs font-semibold text-blush">
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-sm text-white/60">
              <span className="font-semibold text-white">5,000+</span> happy New Yorkers
              <span className="mx-2 text-white/20">|</span>
              <span className="font-semibold text-white">100+</span> 5-star ratings
            </p>
            <a
              href="https://instagram.com/thenycmobilesalon"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blush/15 transition-colors hover:bg-blush/25"
              aria-label="Follow us on Instagram"
            >
              <svg className="h-5 w-5 text-blush" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-blush-gradient px-4 py-10 md:py-14">
        <div className="flex flex-col gap-10 md:hidden">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-6xl font-semibold text-charcoal">
                {stat.value}
                {stat.label === "Average Rating" && <span className="ml-1 text-amber-400">&#9733;</span>}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-blush-dark">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto hidden max-w-5xl grid-cols-5 gap-4 md:grid">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-4xl font-semibold text-charcoal md:text-5xl">
                {stat.value}
                {stat.label === "Average Rating" && (
                  <span className="ml-1 text-amber-400">&#9733;</span>
                )}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-blush-dark">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What Is The NYC Mobile Salon — SEO intro block ── */}
      <section className="bg-white px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blush-dark">About Us</p>
          <h2 className="font-display mb-8 text-4xl font-medium leading-[1.1] tracking-tight text-charcoal md:text-5xl">
            New York City&apos;s premier <span className="text-gradient-rose">mobile beauty</span> service
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The NYC Mobile Salon is a full-service, on-demand beauty platform that brings licensed hair stylists, nail technicians, makeup artists, estheticians, barbers, and grooming professionals directly to your home, office, hotel room, or event venue anywhere in New York City. We serve all five boroughs — <Link href="/locations/manhattan" className="text-blush-dark hover:underline">Manhattan</Link>, <Link href="/locations/brooklyn" className="text-blush-dark hover:underline">Brooklyn</Link>, <Link href="/locations/queens" className="text-blush-dark hover:underline">Queens</Link>, the <Link href="/locations/bronx" className="text-blush-dark hover:underline">Bronx</Link>, and <Link href="/locations/staten-island" className="text-blush-dark hover:underline">Staten Island</Link> — covering over 200 neighborhoods from the Upper East Side to Tottenville.
            </p>
            <p>
              We built this company because we were tired of the traditional salon experience in NYC: the hour-long commutes, the surge pricing, the &ldquo;we&apos;re running 20 minutes behind,&rdquo; the parking nightmares, the cramped waiting rooms. We thought — what if the salon came to you instead? What if a licensed, insured professional showed up at your door with everything they needed, and you could stay in your robe, keep your coffee warm, and just relax?
            </p>
            <p>
              That&apos;s exactly what we do. Whether you need a quick <Link href="/services/blowouts-and-styling" className="text-blush-dark hover:underline">blowout before work</Link>, a <Link href="/services/silk-press" className="text-blush-dark hover:underline">silk press</Link> for the weekend, a <Link href="/services/gel-manicure" className="text-blush-dark hover:underline">gel manicure</Link> after the kids fall asleep, a <Link href="/services/fade-haircut" className="text-blush-dark hover:underline">fresh fade</Link> on your lunch break, or a full <Link href="/services/bridal-hair-and-makeup" className="text-blush-dark hover:underline">bridal glam squad</Link> for your wedding morning — we deliver it all, 7 days a week, early morning to late night, starting at just $99/hr.
            </p>
            <p>
              Every professional on our team is fully licensed by the New York State Department of State, carries individual liability insurance, and has been vetted through our screening process that includes portfolio review, reference checks, and in-person evaluations. We don&apos;t use contractors who happen to do hair on the side — we partner with career professionals who take pride in their craft and treat every client like their only client.
            </p>
          </div>
        </div>
      </section>

      {/* ── For Her / For Him — split rose / dark ── */}
      <section className="grid md:grid-cols-4">
        {/* Left 75% — For Her (rose/blush) */}
        <div className="relative overflow-hidden px-6 py-18 md:col-span-3 md:py-24 md:px-14" style={{ background: "linear-gradient(135deg, #E8A0BF 0%, #D4749B 100%)" }}>
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          <div className="relative max-w-none">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/70">
              <Sparkle className="mr-1 h-3 w-3 text-white/50" /> For Her
            </p>
            <h2 className="font-display mb-8 text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
              Ladies, you go first
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-white/90">
              Skip the commute, the parking, the &ldquo;we&apos;re running 20 minutes behind.&rdquo;
              The NYC Mobile Salon brings the full salon to your door —{" "}
              <Link href="/services/blowouts-and-styling" className="text-white underline hover:text-white/80">blowouts</Link>,{" "}
              <Link href="/services/gel-manicure" className="text-white underline hover:text-white/80">gel nails</Link>,{" "}
              <Link href="/services/bridal-hair-and-makeup" className="text-white underline hover:text-white/80">bridal glam</Link>,{" "}
              <Link href="/services/silk-press" className="text-white underline hover:text-white/80">silk press</Link>,{" "}
              <Link href="/services/highlights-balayage-ombre" className="text-white underline hover:text-white/80">balayage</Link>,{" "}
              <Link href="/services/bikini-brazilian-wax" className="text-white underline hover:text-white/80">waxing</Link>,{" "}
              <Link href="/services/express-facial" className="text-white underline hover:text-white/80">facials</Link>,{" "}
              <Link href="/services/lash-application" className="text-white underline hover:text-white/80">lash extensions</Link>,{" "}
              <Link href="/services/braids-and-protective-styles" className="text-white underline hover:text-white/80">braids &amp; protective styles</Link>,{" "}
              <Link href="/services/extensions" className="text-white underline hover:text-white/80">extensions</Link>,{" "}
              <Link href="/services/deep-conditioning-treatment" className="text-white underline hover:text-white/80">deep conditioning</Link>,{" "}
              <Link href="/services/gel-pedicure" className="text-white underline hover:text-white/80">gel pedis</Link> — 30+ services delivered by licensed pros across{" "}
              <Link href="/locations/manhattan" className="text-white underline hover:text-white/80">Manhattan</Link>,{" "}
              <Link href="/locations/brooklyn" className="text-white underline hover:text-white/80">Brooklyn</Link>,{" "}
              <Link href="/locations/queens" className="text-white underline hover:text-white/80">Queens</Link>,{" "}
              the <Link href="/locations/bronx" className="text-white underline hover:text-white/80">Bronx</Link> &amp;{" "}
              <Link href="/locations/staten-island" className="text-white underline hover:text-white/80">Staten Island</Link>.
            </p>
            <p className="mb-6 text-lg leading-relaxed text-white/90">
              From a quick <Link href="/services/classic-manicure" className="text-white underline hover:text-white/80">classic mani</Link> before
              date night to a full <Link href="/services/bridal-hair-and-makeup" className="text-white underline hover:text-white/80">bridal party</Link> takeover — stay
              in your robe, keep your coffee warm, and let us handle the rest. No salon markup, no
              transit fare — at-home beauty saves you money and time.{" "}
              <Link href="/pricing" className="text-white underline hover:text-white/80">Starting at $99/hr</Link>.
            </p>
            <p className="mb-8 text-lg leading-relaxed text-white/90">
              We specialize in services that are hard to find done well as house calls: <Link href="/services/single-process-color" className="text-white underline hover:text-white/80">hair color</Link> at your apartment, <Link href="/services/highlights-balayage-ombre" className="text-white underline hover:text-white/80">highlights and balayage</Link> without the salon chair, <Link href="/services/microdermabrasion" className="text-white underline hover:text-white/80">microdermabrasion</Link> in your living room, <Link href="/services/acrylic-press-on" className="text-white underline hover:text-white/80">acrylic nail sets</Link> at your kitchen table. If a salon can do it, we bring it to you — with better service and zero commute.
            </p>
            <Link href="/services" className="btn-outline-white">
              Women&apos;s Services
            </Link>
          </div>
        </div>

        {/* Right 25% — For Him (dark blue) */}
        <div className="px-6 py-20 md:col-span-1 md:py-28" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }}>
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-sky-400/70">For Him</p>
            <h3 className="font-display mb-6 text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
              Fellas, we got you too.
            </h3>
            <p className="mb-6 text-lg leading-relaxed text-white/80">
              <Link href="/services/fade-haircut" className="text-sky-400 underline hover:text-sky-300">Fresh fades</Link>,{" "}
              <Link href="/services/beard-trim-and-shape" className="text-sky-400 underline hover:text-sky-300">beard sculpting</Link>,{" "}
              <Link href="/services/hot-towel-shave" className="text-sky-400 underline hover:text-sky-300">hot towel shaves</Link>,{" "}
              and <Link href="/services/mens-manicure" className="text-sky-400 underline hover:text-sky-300">full grooming packages</Link> — delivered
              to your couch, your office, wherever.
              Same licensed pros. Same convenience.
            </p>
            <p className="mb-8 text-lg leading-relaxed text-white/80">
              <Link href="/services/line-up-edge-up" className="text-sky-400 underline hover:text-sky-300">Line ups</Link>,{" "}
              <Link href="/services/scalp-treatment" className="text-sky-400 underline hover:text-sky-300">scalp treatments</Link>,{" "}
              <Link href="/services/mens-brow-cleanup" className="text-sky-400 underline hover:text-sky-300">brow cleanups</Link> — all on your schedule.
            </p>
            <Link href="/services" className="btn-outline-white">
              Men&apos;s Services
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-gold-gradient px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
              <Sparkle className="mr-1 h-3 w-3" /> How It Works
            </p>
            <h2 className="font-display text-4xl font-medium tracking-tight text-charcoal md:text-5xl">
              Three steps to <span className="italic">gorgeous</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              Booking a mobile salon appointment in NYC has never been easier. No apps to download, no accounts to create. Just tell us what you need and we handle the rest.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {howItWorks.map((item) => (
              <div key={item.step} className="rounded-2xl border border-white/80 bg-white p-8 shadow-sm">
                <p className="font-display mb-3 text-4xl font-bold text-blush">{item.step}</p>
                <h3 className="font-display mb-3 text-2xl font-medium text-charcoal">{item.title}</h3>
                <p className="text-base leading-relaxed text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/how-it-works" className="btn-gold">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* ── Full Services Directory ── */}
      <section className="bg-white px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> Our Services
            </p>
            <h2 className="font-display text-4xl font-medium tracking-tight text-charcoal md:text-5xl">
              30+ mobile beauty services <span className="italic">delivered to your door</span>
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
              From blowouts to Brazilian waxes, silk presses to scalp treatments — every service performed by a licensed, insured New York State professional. Available across all five boroughs, 7 days a week.
            </p>
          </div>

          <div className="mb-12">
            <h3 className="font-display mb-6 text-2xl font-medium text-charcoal">Women&apos;s Services</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {womensCategories.map((cat) => (
                <div key={cat.slug} className="rounded-xl border border-pink-100 bg-blush-light/50 p-6">
                  <h4 className="font-display mb-3 text-lg font-semibold text-charcoal">{cat.title}</h4>
                  <ul className="space-y-2">
                    {cat.services.map((svc) => (
                      <li key={svc.slug}>
                        <Link href={`/services/${svc.slug}`} className="text-sm text-gray-600 transition-colors hover:text-blush-dark">
                          {svc.name} — <span className="text-gray-400">{svc.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display mb-6 text-2xl font-medium text-charcoal">Men&apos;s Services</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mensCategories.map((cat) => (
                <div key={cat.slug} className="rounded-xl border border-sky-100 bg-sky-50 p-6">
                  <h4 className="font-display mb-3 text-lg font-semibold text-charcoal">{cat.title}</h4>
                  <ul className="space-y-2">
                    {cat.services.map((svc) => (
                      <li key={svc.slug}>
                        <Link href={`/services/${svc.slug}`} className="text-sm text-gray-600 transition-colors hover:text-sky-600">
                          {svc.name} — <span className="text-gray-400">{svc.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/services" className="btn-rose">
              View All Services &amp; Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ── */}
      <section className="bg-blush-light px-6 py-12 md:px-4 md:py-16 md:pb-12">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.2fr_1px_0.8fr] md:items-start">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blush-dark">Pricing</p>
            <h2 className="font-display mb-6 text-4xl font-medium leading-[1.1] tracking-tight text-charcoal md:text-5xl">
              Premium services,<br /><span className="italic">honest prices</span>
            </h2>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              No hidden fees. No surge pricing. No tipping the meter on the way there.
              Every service includes travel to your door, all tools and products, and a
              licensed professional who actually knows what they&apos;re doing.
            </p>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              Think about it — no Uber to the salon, no parking, no babysitter while
              you&apos;re out. At-home beauty isn&apos;t just convenient, it&apos;s cheaper
              when you factor in everything you&apos;re not spending. We priced it that way on purpose.
            </p>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              Every stylist is licensed, insured, and vetted. We bring hospital-grade
              sanitation kits, premium products, and professional tools — the same quality
              you&apos;d expect at a top{" "}
              <Link href="/locations/manhattan" className="text-blush-dark hover:underline">Manhattan salon</Link>,
              delivered to your living room in{" "}
              <Link href="/locations/brooklyn" className="text-blush-dark hover:underline">Brooklyn</Link>,{" "}
              <Link href="/locations/queens" className="text-blush-dark hover:underline">Queens</Link>,{" "}
              <Link href="/locations/bronx" className="text-blush-dark hover:underline">The Bronx</Link>,{" "}
              <Link href="/locations/staten-island" className="text-blush-dark hover:underline">Staten Island</Link>,
              or anywhere in NYC.
            </p>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              Group bookings? Even better. We send multiple pros for{" "}
              <Link href="/events/bridal-hair-and-makeup" className="text-blush-dark hover:underline">bridal parties</Link>,{" "}
              <Link href="/events/birthday-glam-party" className="text-blush-dark hover:underline">birthdays</Link>, and{" "}
              <Link href="/events/office-wellness-day" className="text-blush-dark hover:underline">corporate events</Link> — same
              flat rates, no surprise charges.
            </p>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              Morning blowout before work? Late-night{" "}
              <Link href="/services/gel-manicure" className="text-blush-dark hover:underline">gel mani</Link> after
              the kids are asleep? We work around your schedule, 7 days a week, early morning to late night.
            </p>
            <p className="mb-8 text-lg leading-relaxed text-gray-600">
              We keep it simple — you see the price, you book, we show up. That&apos;s it.
            </p>
            <Link href="/pricing" className="btn-rose">
              See Full Pricing
            </Link>
          </div>

          <div className="hidden md:block self-stretch bg-blush/30" />

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blush-dark">For Her</p>
            <div className="mb-2">
              {[
                { name: "Blowout & Styling", price: "$99", slug: "blowouts-and-styling" },
                { name: "Haircut & Trim", price: "$120", slug: "haircuts-and-trims" },
                { name: "Gel Manicure", price: "$65", slug: "gel-manicure" },
                { name: "Classic Pedicure", price: "$75", slug: "classic-pedicure" },
                { name: "Silk Press", price: "$150", slug: "silk-press" },
                { name: "Bridal Hair & Makeup", price: "$350", slug: "bridal-hair-and-makeup" },
                { name: "Full Body Wax", price: "$200", slug: "bikini-brazilian-wax" },
                { name: "Lash Extensions", price: "$175", slug: "lash-application" },
                { name: "Deep Conditioning", price: "$85", slug: "deep-conditioning-treatment" },
              ].map((item) => (
                <Link key={item.name} href={`/services/${item.slug}`} className="flex items-center justify-between border-b border-blush/20 py-3 transition-colors hover:bg-white/60">
                  <span className="text-base font-semibold text-charcoal">{item.name}</span>
                  <span className="font-display text-lg font-bold text-charcoal">{item.price}<span className="text-sm font-normal text-gray-400">/avg</span></span>
                </Link>
              ))}
            </div>

            <p className="mt-1 mb-3 text-xs font-semibold uppercase tracking-widest text-sky-500">For Him</p>
            <div>
              {[
                { name: "Men's Haircut & Fade", price: "$99", slug: "fade-haircut" },
                { name: "Beard Sculpting", price: "$65", slug: "beard-trim-and-shape" },
                { name: "Grooming Package", price: "$150", slug: "mens-manicure" },
              ].map((item) => (
                <Link key={item.name} href={`/services/${item.slug}`} className="flex items-center justify-between border-b border-sky-200/50 py-3 last:border-0 transition-colors hover:bg-sky-50/50">
                  <span className="text-base font-semibold text-charcoal">{item.name}</span>
                  <span className="font-display text-lg font-bold text-charcoal">{item.price}<span className="text-sm font-normal text-gray-400">/avg</span></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Events & Group Bookings ── */}
      <section className="grid md:grid-cols-4">
        {/* Left 25% — Guys (dark blue) */}
        <div className="px-6 py-20 md:col-span-1 md:py-28" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }}>
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-sky-400/70">For Him</p>
            <h3 className="font-display mb-6 text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
              Squad up.
            </h3>
            <p className="mb-8 text-lg leading-relaxed text-white/80">
              <Link href="/services/fade-haircut" className="text-sky-400 underline hover:text-sky-300">Groomsmen fades</Link>,{" "}
              <Link href="/services/beard-trim-and-shape" className="text-sky-400 underline hover:text-sky-300">beard lineups</Link>,{" "}
              and <Link href="/services/mens-manicure" className="text-sky-400 underline hover:text-sky-300">full grooming packages</Link> for
              the whole crew — bachelor parties, wedding day prep, corporate events.
              We pull up with multiple barbers, everyone leaves looking sharp. Wedding morning? The whole party&apos;s lined up before the photographer arrives.
            </p>
            <Link href="/events" className="btn-outline-white">
              Plan His Event
            </Link>
          </div>
        </div>

        {/* Right 75% — Ladies (rose gradient) */}
        <div className="relative overflow-hidden px-6 py-18 md:col-span-3 md:py-24 md:px-14" style={{ background: "linear-gradient(135deg, #D4749B 0%, #E8A0BF 50%, #D4749B 100%)" }}>
          <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="relative max-w-none">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/70">
              <Sparkle className="mr-1 h-3 w-3 text-white/50" /> Events &amp; Groups
            </p>
            <h2 className="font-display mb-8 text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
              Bring the glam squad to you.
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-white/90">
              Getting married? We send a full team —{" "}
              <Link href="/events/bridal-hair-and-makeup" className="text-white underline hover:text-white/80">bridal hair &amp; makeup</Link>,{" "}
              <Link href="/events/bridal-party-hair-and-makeup" className="text-white underline hover:text-white/80">bridesmaids</Link>, mother of the bride, flower girls — everyone camera-ready before the first look.
              We&apos;ve done 500+ weddings across all five boroughs and we bring everything: tools, products,
              mirrors, and backup stylists so nobody&apos;s left waiting.
            </p>
            <p className="mb-6 text-lg leading-relaxed text-white/90">
              Not a wedding? We do it all.{" "}
              <Link href="/events/birthday-glam-party" className="text-white underline hover:text-white/80">Birthday parties</Link> where everyone gets{" "}
              <Link href="/services/blowouts-and-styling" className="text-white underline hover:text-white/80">blowouts</Link> and{" "}
              <Link href="/services/gel-manicure" className="text-white underline hover:text-white/80">gel manis</Link>.{" "}
              <Link href="/events/bachelorette-pampering" className="text-white underline hover:text-white/80">Bachelorette weekends</Link> with{" "}
              <Link href="/services/lash-application" className="text-white underline hover:text-white/80">lash extensions</Link> and{" "}
              <Link href="/services/express-facial" className="text-white underline hover:text-white/80">facials</Link> in the hotel suite.{" "}
              <Link href="/events/office-wellness-day" className="text-white underline hover:text-white/80">Corporate events</Link> where the whole team gets fresh.{" "}
              <Link href="/events/baby-shower-pampering" className="text-white underline hover:text-white/80">Baby showers</Link>,{" "}
              <Link href="/events/girls-night-in" className="text-white underline hover:text-white/80">girls&apos; night</Link>,{" "}
              <Link href="/events/prom-prep-party" className="text-white underline hover:text-white/80">prom prep</Link>,{" "}
              <Link href="/events/sweet-16-quinceanera-glam" className="text-white underline hover:text-white/80">sweet 16s &amp; quincea&ntilde;eras</Link> — you name it, we&apos;ve glammed it.
            </p>
            <p className="mb-8 text-lg leading-relaxed text-white/90">
              Multiple pros arrive together, set up in minutes, and work in parallel — so a party of 8 doesn&apos;t
              take 8 hours. Same flat rates, no surprise upcharges, no venue fees.{" "}
              <Link href="/pricing" className="text-white underline hover:text-white/80">See group pricing</Link>.
            </p>
            <Link href="/events" className="btn-outline-white">
              Plan Your Event
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-white px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> Reviews
            </p>
            <h2 className="font-display text-4xl font-medium tracking-tight text-charcoal md:text-5xl">
              What New Yorkers are <span className="italic">saying</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              Over 5,000 happy clients across all five boroughs. Here&apos;s what some of them had to say about their mobile salon experience.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {extendedTestimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-pink-100 bg-blush-light/30 p-6">
                <Stars className="mb-4" />
                <p className="mb-4 text-base leading-relaxed text-gray-700">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-charcoal">{t.name}</p>
                  <p className="text-xs text-blush-dark">{t.service} &middot; {t.borough}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/reviews" className="btn-outline-rose">
              Read All Reviews
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Choose a Mobile Salon ── */}
      <section className="bg-gold-gradient px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Why Mobile</p>
          <h2 className="font-display mb-8 text-4xl font-medium leading-[1.1] tracking-tight text-charcoal md:text-5xl">
            Why New Yorkers are switching to <span className="italic">mobile beauty</span>
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The traditional salon experience in New York City is broken. Between getting there, waiting, the actual service, and getting home, a simple blowout can eat up half your Saturday. A haircut and color? Write off the whole afternoon. And that&apos;s before you factor in the $15 Uber each way, the $3 coffee you bought while waiting, or the babysitter you had to call because you couldn&apos;t bring the kids.
            </p>
            <p>
              Mobile salon services eliminate all of that. A licensed professional comes to your door — your apartment, your brownstone, your office, your hotel — with everything they need. You save the commute time, the waiting time, the travel cost, and the stress. You get the same (often better) quality service in the comfort of your own space, on your schedule, at a price that&apos;s competitive with brick-and-mortar salons once you factor in all the hidden costs of going out.
            </p>
            <p>
              For busy professionals in <Link href="/locations/manhattan" className="text-blush-dark hover:underline">Manhattan</Link> who can&apos;t spare two hours for a salon visit, for new moms in <Link href="/locations/brooklyn" className="text-blush-dark hover:underline">Brooklyn</Link> who can&apos;t easily leave the house, for elderly clients in the <Link href="/locations/bronx" className="text-blush-dark hover:underline">Bronx</Link> who have mobility challenges, for brides in <Link href="/locations/queens" className="text-blush-dark hover:underline">Queens</Link> who want their whole party ready in one location, for anyone on <Link href="/locations/staten-island" className="text-blush-dark hover:underline">Staten Island</Link> who&apos;s tired of the limited local options — mobile beauty is the answer.
            </p>
            <p>
              The NYC Mobile Salon isn&apos;t a gig economy app that sends whoever&apos;s available. We&apos;re a curated team of career beauty professionals — hairstylists, colorists, nail technicians, makeup artists, estheticians, barbers — who chose mobile because they believe in delivering a better, more personal experience. Every pro on our team has years of experience, a portfolio you can review, and reviews from real NYC clients.
            </p>
            <p>
              We bring professional-grade tools, premium products, and hospital-grade sanitation supplies to every appointment. We arrive on time, we respect your space, we clean up after ourselves, and we don&apos;t leave until you&apos;re happy with the result. That&apos;s the standard, every time, in every borough.
            </p>
          </div>
        </div>
      </section>

      {/* ── Classes & Workshops ── */}
      <section className="bg-white px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blush-dark">
                <Sparkle className="mr-1 h-3 w-3" /> Learn From The Pros
              </p>
              <h2 className="font-display mb-6 text-4xl font-medium leading-[1.1] tracking-tight text-charcoal md:text-5xl">
                Beauty classes &amp; <span className="italic">workshops</span>
              </h2>
              <p className="mb-5 text-lg leading-relaxed text-gray-600">
                Want to learn how to do your own <Link href="/classes/diy-blowout-workshop" className="text-blush-dark hover:underline">blowout at home</Link>? Master <Link href="/classes/braiding-basics-class" className="text-blush-dark hover:underline">braiding techniques</Link>? Build an <Link href="/classes/everyday-makeup-masterclass" className="text-blush-dark hover:underline">everyday makeup routine</Link> that takes 10 minutes? Our licensed pros teach hands-on workshops for groups of 4-12, right in your living room.
              </p>
              <p className="mb-5 text-lg leading-relaxed text-gray-600">
                Perfect for <Link href="/events/girls-night-in" className="text-blush-dark hover:underline">girls&apos; night in</Link>, bachelorette parties, mother-daughter bonding, team building, or just learning something new. We bring all the tools and products — you just bring the curiosity (and maybe some wine).
              </p>
              <p className="mb-8 text-lg leading-relaxed text-gray-600">
                Topics include <Link href="/classes/skincare-routine-workshop" className="text-blush-dark hover:underline">skincare routines</Link>, <Link href="/classes/group-nail-art-class" className="text-blush-dark hover:underline">nail art</Link>, <Link href="/classes/mens-grooming-101" className="text-blush-dark hover:underline">men&apos;s grooming</Link>, and more. 90-minute to 2-hour sessions, flat rate per group.
              </p>
              <Link href="/classes" className="btn-primary">
                Browse Classes
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "DIY Blowout", duration: "90 min", slug: "diy-blowout-workshop" },
                { name: "Braiding Basics", duration: "2 hrs", slug: "braiding-basics-class" },
                { name: "Everyday Makeup", duration: "90 min", slug: "everyday-makeup-masterclass" },
                { name: "Skincare Routine", duration: "90 min", slug: "skincare-routine-workshop" },
                { name: "Nail Art", duration: "2 hrs", slug: "group-nail-art-class" },
                { name: "Men\u2019s Grooming 101", duration: "90 min", slug: "mens-grooming-101" },
              ].map((cls) => (
                <Link key={cls.slug} href={`/classes/${cls.slug}`} className="card-hover rounded-xl border border-pink-100 bg-blush-light/30 p-5 text-center">
                  <p className="text-sm font-semibold text-charcoal">{cls.name}</p>
                  <p className="mt-1 text-xs text-blush-dark">{cls.duration}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-blush-light px-6 py-20 md:px-4 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display mb-8 text-4xl font-bold uppercase leading-[1.1] tracking-tight text-charcoal md:text-5xl">
              Common Questions
            </h2>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              We know booking an at-home salon service for the first time comes with questions.
              How does it work? What do you bring? Is it safe? Is the pricing transparent? We&apos;ve answered the most
              common ones right here — but if you don&apos;t see yours, text us anytime and we&apos;ll respond fast.
            </p>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              Every stylist is licensed by New York State, insured, and background-checked. We bring all tools,
              products, and sanitation supplies — you don&apos;t need to prep anything except
              a chair and good lighting.
            </p>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              Whether you&apos;re booking your first at-home blowout in <Link href="/locations/manhattan/upper-west-side" className="text-blush-dark hover:underline">the Upper West Side</Link>, scheduling a <Link href="/services/fade-haircut" className="text-blush-dark hover:underline">fade</Link> at your <Link href="/locations/brooklyn/williamsburg" className="text-blush-dark hover:underline">Williamsburg</Link> loft, or planning a <Link href="/events/bridal-hair-and-makeup" className="text-blush-dark hover:underline">bridal party</Link> in <Link href="/locations/queens/astoria" className="text-blush-dark hover:underline">Astoria</Link> — we&apos;ve got answers.
            </p>
            <Link href="/faq" className="btn-primary">
              See All FAQ
            </Link>
          </div>

          <div>
            {faqs.map((faq, i) => (
              <details key={faq.q} className={`group ${i === 0 ? "" : "border-t border-blush/30"}`}>
                <summary className="flex cursor-pointer items-center justify-between py-6 text-left">
                  <span className="font-display text-xl text-charcoal md:text-2xl">{faq.q}</span>
                  <Arrow className="shrink-0 text-blush-dark transition-transform group-open:rotate-90" />
                </summary>
                <p className="pb-6 leading-relaxed text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Locations ── */}
      <section className="bg-white px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> Coverage
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Mobile beauty across <span className="italic">all five boroughs</span>
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
              We serve over 200 neighborhoods across New York City. From Washington Heights to Tottenville, Astoria to Bay Ridge — if you&apos;re in NYC, we come to you.
            </p>
          </div>

          <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(boroughNames).map(([slug, name]) => (
              <Link
                key={slug}
                href={`/locations/${slug}`}
                className="card-hover rounded-xl border border-pink-100 bg-blush-light/30 p-6 text-center"
              >
                <p className="text-lg font-semibold text-charcoal">{name}</p>
                <p className="mt-1 text-xs text-blush-dark">{neighborhoods[slug]?.length} neighborhoods &rarr;</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(neighborhoods).map(([boroughSlug, hoods]) => (
              <div key={boroughSlug}>
                <Link href={`/locations/${boroughSlug}`} className="mb-3 block text-sm font-semibold text-charcoal hover:text-blush-dark">
                  {boroughNames[boroughSlug]}
                </Link>
                <ul className="space-y-1">
                  {hoods.slice(0, 10).map((hood) => (
                    <li key={hood.slug}>
                      <Link href={`/locations/${boroughSlug}/${hood.slug}`} className="text-xs text-gray-500 transition-colors hover:text-blush-dark">
                        {hood.name}
                      </Link>
                    </li>
                  ))}
                  {hoods.length > 10 && (
                    <li>
                      <Link href={`/locations/${boroughSlug}`} className="text-xs font-medium text-blush-dark hover:underline">
                        + {hoods.length - 10} more
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Join the Team ── */}
      <section className="relative overflow-hidden px-6 py-16 md:py-24" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d1f2f 50%, #1a1a1a 100%)" }}>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-blush/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blush">
            <Sparkle className="mr-1 h-3 w-3" /> Careers
          </p>
          <h2 className="font-display mb-6 text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
            Licensed beauty pro? <span className="italic">Join our team.</span>
          </h2>
          <p className="mx-auto mb-5 max-w-2xl text-lg leading-relaxed text-white/70">
            If you&apos;re a licensed hairstylist, barber, nail technician, makeup artist, or esthetician in NYC, we want to hear from you. Set your own schedule, keep your clients, earn more per appointment, and skip the salon chair rental. We handle booking, marketing, and logistics — you focus on your craft.
          </p>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-white/70">
            We&apos;re actively hiring across all five boroughs. Whether you specialize in <Link href="/services/silk-press" className="text-blush hover:underline">silk presses</Link>, <Link href="/services/highlights-balayage-ombre" className="text-blush hover:underline">color and balayage</Link>, <Link href="/services/fade-haircut" className="text-blush hover:underline">fades</Link>, <Link href="/services/gel-manicure" className="text-blush hover:underline">gel nails</Link>, <Link href="/services/full-glam-makeup" className="text-blush hover:underline">glam makeup</Link>, or <Link href="/services/express-facial" className="text-blush hover:underline">facials</Link> — there&apos;s a spot for you.
          </p>
          <Link href="/join/application" className="btn-rose">
            Apply Now
          </Link>
        </div>
      </section>

      {/* ── Book Your Appointment — Lead Form ── */}
      <section className="bg-white px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-start">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> Book Online — $20 Off
            </p>
            <h2 className="font-display mb-6 text-4xl font-medium leading-[1.1] tracking-tight text-charcoal md:text-5xl">
              Ready for the salon to <span className="italic">come to you?</span>
            </h2>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              Fill out the form and we&apos;ll get back to you within 24 hours to confirm your appointment. Or skip the form and reach us directly:
            </p>
            <div className="mb-8 space-y-3">
              <a href="sms:+12122029075" className="flex items-center gap-3 text-lg font-medium text-blush-dark hover:underline">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Text us anytime
              </a>
              <a href="mailto:hey@thenycmobilesalon.com" className="flex items-center gap-3 text-lg font-medium text-blush-dark hover:underline">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                hey@thenycmobilesalon.com
              </a>
            </div>
            <p className="text-lg leading-relaxed text-gray-600">
              Available 7 days a week, early morning to late night, across <Link href="/locations/manhattan" className="text-blush-dark hover:underline">Manhattan</Link>, <Link href="/locations/brooklyn" className="text-blush-dark hover:underline">Brooklyn</Link>, <Link href="/locations/queens" className="text-blush-dark hover:underline">Queens</Link>, the <Link href="/locations/bronx" className="text-blush-dark hover:underline">Bronx</Link>, and <Link href="/locations/staten-island" className="text-blush-dark hover:underline">Staten Island</Link>. Book today and let us bring the salon to you.
            </p>
          </div>
          <LeadForm id="homepage-lead" />
        </div>
      </section>

      {/* ── Final SEO content block ── */}
      <section className="bg-blush-light px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-3xl font-medium leading-[1.1] tracking-tight text-charcoal md:text-4xl">
            The future of beauty in New York City is <span className="italic">mobile</span>
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              New York City is the most demanding city in the world — and New Yorkers deserve beauty services that match their pace. The NYC Mobile Salon was built for people who refuse to waste time sitting in a salon waiting room when they could be living their life. We deliver professional, licensed, insured beauty services directly to your door, eliminating everything you hate about the traditional salon experience while keeping everything you love.
            </p>
            <p>
              Our team of mobile beauty professionals includes hairstylists specializing in <Link href="/services/blowouts-and-styling" className="text-blush-dark hover:underline">blowouts</Link>, <Link href="/services/haircuts-and-trims" className="text-blush-dark hover:underline">precision cuts</Link>, <Link href="/services/single-process-color" className="text-blush-dark hover:underline">color</Link>, <Link href="/services/highlights-balayage-ombre" className="text-blush-dark hover:underline">highlights and balayage</Link>, <Link href="/services/silk-press" className="text-blush-dark hover:underline">silk press</Link>, <Link href="/services/braids-and-protective-styles" className="text-blush-dark hover:underline">braids and protective styles</Link>, and <Link href="/services/extensions" className="text-blush-dark hover:underline">extensions</Link>. Our nail technicians offer <Link href="/services/classic-manicure" className="text-blush-dark hover:underline">classic manicures</Link>, <Link href="/services/gel-manicure" className="text-blush-dark hover:underline">gel manicures</Link>, <Link href="/services/classic-pedicure" className="text-blush-dark hover:underline">pedicures</Link>, <Link href="/services/nail-art" className="text-blush-dark hover:underline">nail art</Link>, <Link href="/services/acrylic-press-on" className="text-blush-dark hover:underline">acrylics</Link>, and <Link href="/services/dip-powder" className="text-blush-dark hover:underline">dip powder</Link>. Our makeup artists do <Link href="/services/full-glam-makeup" className="text-blush-dark hover:underline">full glam</Link>, <Link href="/services/natural-everyday-makeup" className="text-blush-dark hover:underline">natural looks</Link>, and <Link href="/services/lash-application" className="text-blush-dark hover:underline">lash application</Link>. Our estheticians provide <Link href="/services/express-facial" className="text-blush-dark hover:underline">facials</Link>, <Link href="/services/microdermabrasion" className="text-blush-dark hover:underline">microdermabrasion</Link>, and <Link href="/services/light-chemical-peel" className="text-blush-dark hover:underline">chemical peels</Link>. Our waxing specialists handle everything from <Link href="/services/brow-wax-and-shape" className="text-blush-dark hover:underline">brow shaping</Link> to <Link href="/services/bikini-brazilian-wax" className="text-blush-dark hover:underline">Brazilians</Link> to <Link href="/services/leg-wax" className="text-blush-dark hover:underline">full legs</Link>.
            </p>
            <p>
              For men, we offer <Link href="/services/mens-haircut-and-style" className="text-blush-dark hover:underline">haircuts</Link>, <Link href="/services/fade-haircut" className="text-blush-dark hover:underline">fades</Link>, <Link href="/services/line-up-edge-up" className="text-blush-dark hover:underline">line ups</Link>, <Link href="/services/beard-trim-and-shape" className="text-blush-dark hover:underline">beard trims</Link>, <Link href="/services/hot-towel-shave" className="text-blush-dark hover:underline">hot towel shaves</Link>, <Link href="/services/scalp-treatment" className="text-blush-dark hover:underline">scalp treatments</Link>, <Link href="/services/mens-manicure" className="text-blush-dark hover:underline">men&apos;s manicures</Link>, <Link href="/services/mens-pedicure" className="text-blush-dark hover:underline">men&apos;s pedicures</Link>, and <Link href="/services/back-wax" className="text-blush-dark hover:underline">back waxing</Link>. Every service is available for in-home, in-office, or on-location delivery.
            </p>
            <p>
              We also host <Link href="/classes" className="text-blush-dark hover:underline">beauty workshops and classes</Link> — hands-on sessions taught by our pros where you can learn <Link href="/classes/diy-blowout-workshop" className="text-blush-dark hover:underline">blowout techniques</Link>, <Link href="/classes/braiding-basics-class" className="text-blush-dark hover:underline">braiding</Link>, <Link href="/classes/everyday-makeup-masterclass" className="text-blush-dark hover:underline">everyday makeup</Link>, <Link href="/classes/skincare-routine-workshop" className="text-blush-dark hover:underline">skincare routines</Link>, <Link href="/classes/group-nail-art-class" className="text-blush-dark hover:underline">nail art</Link>, and <Link href="/classes/mens-grooming-101" className="text-blush-dark hover:underline">men&apos;s grooming</Link>. Perfect for group events, team building, or just leveling up your skills.
            </p>
            <p>
              Serving <Link href="/locations/manhattan" className="text-blush-dark hover:underline">Manhattan</Link> (Upper East Side, Upper West Side, Midtown, Chelsea, Greenwich Village, SoHo, Tribeca, Harlem, Washington Heights, and more), <Link href="/locations/brooklyn" className="text-blush-dark hover:underline">Brooklyn</Link> (Williamsburg, Park Slope, DUMBO, Brooklyn Heights, Crown Heights, Bed-Stuy, Greenpoint, Prospect Heights, Fort Greene, Bay Ridge, and more), <Link href="/locations/queens" className="text-blush-dark hover:underline">Queens</Link> (Astoria, Long Island City, Jackson Heights, Flushing, Forest Hills, Sunnyside, Bayside, and more), the <Link href="/locations/bronx" className="text-blush-dark hover:underline">Bronx</Link> (Riverdale, Fordham, Pelham Bay, Mott Haven, and more), and <Link href="/locations/staten-island" className="text-blush-dark hover:underline">Staten Island</Link> (St. George, Tottenville, Great Kills, Todt Hill, and more).
            </p>
            <p>
              <Link href="/book" className="text-blush-dark hover:underline">Book your appointment today</Link> and experience what 5,000+ New Yorkers already know — the best salon in NYC is the one that comes to you.
            </p>
          </div>
        </div>
      </section>

    </>
  );
}
