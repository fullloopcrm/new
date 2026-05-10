// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { faqSchema, breadcrumbSchema, localBusinessSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Pricing — Mobile Beauty Services Starting at $99/Hour | The NYC Mobile Salon",
  description:
    "Transparent pricing for mobile beauty services in NYC. $99/hour for all services — hair, nails, makeup, grooming, events, and classes. 1-hour minimum for individuals, 2-hour minimum for groups of 3+. No travel fees, no hidden charges.",
  alternates: { canonical: "https://thenycmobilesalon.com/pricing" },
  openGraph: {
    title: "Pricing — Mobile Beauty Services Starting at $99/Hour | The NYC Mobile Salon",
    description:
      "Transparent pricing for mobile beauty services in NYC. $99/hour for all services — hair, nails, makeup, grooming, events, and classes. 1-hour minimum for individuals, 2-hour minimum for groups of 3+. No travel fees, no hidden charges.",
    url: "https://thenycmobilesalon.com/pricing",
  },
};

const faqs = [
  {
    q: "Why does The NYC Mobile Salon charge $99 per hour?",
    a: "Our $99/hour rate covers a licensed, vetted beauty professional who travels to your location with all the tools, products, and materials needed for your service. There are no additional charges for travel, setup, or cleanup. When you factor in the cost of commuting to a salon, tipping, parking or transit fares, and the value of your own time, our all-inclusive rate often comes out the same or less than a traditional salon visit.",
  },
  {
    q: "Is there a minimum booking time?",
    a: "Yes. For individual appointments, there is a 1-hour minimum. For group bookings of 3 or more people — including events, classes, and parties — there is a 2-hour minimum. This ensures our stylists can dedicate proper time and attention to every client.",
  },
  {
    q: "Are there any hidden fees or extra charges?",
    a: "Absolutely not. The $99/hour rate is fully all-inclusive. There are no travel fees, no product upcharges, no setup or cleanup fees, and no surge pricing. The price you see is the price you pay, every time.",
  },
  {
    q: "Is travel included in the price?",
    a: "Yes — travel is completely free to any location in all five NYC boroughs: Manhattan, Brooklyn, Queens, The Bronx, and Staten Island. Our stylists come to your apartment, office, hotel, event space, or wherever you need them. No mileage fees, no distance surcharges.",
  },
  {
    q: "Do I need to tip my stylist?",
    a: "Tipping is never required or expected. Our $99/hour rate is designed to be fair and sustainable for both our clients and our stylists. That said, if you feel your stylist went above and beyond, tips are always appreciated but entirely optional.",
  },
  {
    q: "How does pricing work for events and group bookings?",
    a: "Events and group bookings follow the same $99/hour rate with a 2-hour minimum for groups of 3 or more people. For larger events like bridal parties, corporate gatherings, or birthday celebrations, we can assign multiple stylists to work simultaneously so everyone gets their services done efficiently. Contact us to plan your event.",
  },
  {
    q: "How do group rates work if I have more than 3 people?",
    a: "The rate stays the same — $99/hour per stylist. For larger groups, we send additional stylists so everyone can be served within a reasonable timeframe. For example, a bridal party of 6 getting hair and makeup might have 2-3 stylists working at the same time. We'll help you figure out the best setup when you book.",
  },
  {
    q: "Can I book multiple services in one appointment?",
    a: "Absolutely. Many clients book a blowout and a manicure, or a haircut followed by a beard trim. You simply pay for the total time used. If a blowout takes 45 minutes and a gel manicure takes another 45 minutes, that's a 1.5-hour appointment at $99/hour. We'll estimate the total time when you book so there are no surprises.",
  },
  {
    q: "What forms of payment do you accept?",
    a: "We accept Venmo, Zelle, Cash App, Apple Pay, and cash. We keep it simple and flexible — no credit card processing fees, no invoicing headaches.",
  },
  {
    q: "What is your cancellation policy?",
    a: "You can cancel or reschedule for free up to 12 hours before your appointment. Cancellations with less than 12 hours notice may be subject to a fee. For events and group bookings, we ask for at least 48 hours notice due to the number of stylists involved.",
  },
];

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        faqSchema(faqs)
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Pricing", url: "/pricing" }])
      ) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema()) }}
      />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-white/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Transparent Pricing</span>
            <Sparkle className="h-4 w-4 text-white/60" />
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Mobile Beauty Pricing <span className="italic">— $99/hr</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            Every mobile beauty service we offer is billed at one transparent rate: $99 per hour. No travel fees, no product surcharges, no hidden costs. Just licensed professionals, premium products, and a price you can trust — delivered to your door anywhere in New York City.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display">Book Now</Link>
            <Link href="/services" className="inline-block rounded-full border border-white/30 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-white/10 font-display">View Services</Link>
          </div>
        </div>
      </section>

      {/* ─── How Our Pricing Works ─── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-2">
            <Sparkle className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">How Our Pricing Works</span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            One rate. Every service. No surprises.
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-gray-600">
            <p>
              At The NYC Mobile Salon, every service we offer is billed at the same straightforward rate: <strong className="text-gray-900">$99 per hour</strong>. Whether you are booking a blowout, a full color transformation, a gel manicure, a men&apos;s fade, a bridal updo, or a 10-person corporate wellness event, the rate is the same. We believe pricing should be easy to understand and impossible to be surprised by, so we built our entire business around a single, honest number.
            </p>
            <p>
              Why hourly instead of per-service? Because beauty is personal. A blowout on shoulder-length hair takes less time than a blowout on waist-length hair. A simple haircut is faster than a detailed fade with a lineup. Rather than inflating prices to cover edge cases, we charge for the actual time your stylist spends with you. This keeps costs fair for everyone — whether your appointment runs 45 minutes or two and a half hours.
            </p>
            <p>
              Our $99/hour rate is fully all-inclusive. That means your stylist&apos;s travel time to your location is on us — no matter which borough you are in. It means all tools, equipment, professional-grade products, and materials are included. It means setup and cleanup at your location are covered. There are no product upcharges, no weekend surcharges, no peak-hour fees, and no surprise add-ons on your bill. The price you are quoted is the price you pay.
            </p>
            <p>
              Tipping is never required or expected. We designed our rate to be fair and sustainable for both our clients and our stylists. If you feel your stylist went above and beyond, a tip is always appreciated — but it is entirely your choice, not an obligation. We want you to focus on enjoying your service, not doing math at the end of your appointment.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Pricing Tiers ─── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">Pricing Tiers</span>
            <Sparkle className="h-4 w-4 text-purple-400" />
          </div>
          <h2 className="font-display mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Two simple options
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            Whether you are booking for yourself or planning for a group, the rate stays the same. The only difference is the minimum booking time.
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Individual Services */}
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-purple-600">Individual Services</p>
                <p className="font-display mt-2 text-4xl font-bold text-gray-900">$99<span className="text-lg font-normal text-gray-400">/hour</span></p>
                <p className="mt-1 text-sm text-gray-500">1-hour minimum</p>
                <p className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">10% multi-hour discount available</p>
              </div>
              <p className="mb-6 text-sm text-gray-600">
                Perfect for solo appointments. Book any beauty service for yourself and pay only for the time your stylist spends with you. Combine multiple services in one visit for maximum convenience. Ask about our 10% multi-hour discount.
              </p>
              <ul className="mb-6 space-y-3">
                {[
                  "Blowouts & styling",
                  "Haircuts (women's & men's)",
                  "Hair color & highlights",
                  "Gel manicures & pedicures",
                  "Full glam makeup",
                  "Facials & skincare",
                  "Waxing & brow shaping",
                  "Men's grooming & fades",
                  "Beard sculpting & trims",
                  "Silk press & keratin treatments",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                      <svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link href="/book" className="rounded-full bg-purple-600 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700 font-display">Book Now</Link>
                <Link href="/services" className="text-purple-600 hover:underline text-sm font-semibold self-center">View all services</Link>
              </div>
            </div>

            {/* Groups, Events & Classes */}
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-purple-600">Groups, Events & Classes</p>
                <p className="font-display mt-2 text-4xl font-bold text-gray-900">$99<span className="text-lg font-normal text-gray-400">/hour</span></p>
                <p className="mt-1 text-sm text-gray-500">2-hour minimum for 3+ people</p>
              </div>
              <p className="mb-6 text-sm text-gray-600">
                Same great rate, built for groups. Whether it is a bridal party, birthday celebration, corporate event, or hands-on beauty class, we bring the team and the experience to you.
              </p>
              <ul className="mb-6 space-y-3">
                {[
                  "Bridal parties & wedding prep",
                  "Bachelorette beauty events",
                  "Corporate wellness & team events",
                  "Birthday party glam sessions",
                  "Photo shoot styling",
                  "Hands-on beauty classes",
                  "Nail art workshops",
                  "Skincare & self-care classes",
                  "Group grooming sessions",
                  "Custom event packages",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                      <svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link href="/book" className="rounded-full bg-purple-600 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700 font-display">Plan Your Event</Link>
                <Link href="/events" className="text-purple-600 hover:underline text-sm font-semibold self-center">Events</Link>
                <Link href="/classes" className="text-purple-600 hover:underline text-sm font-semibold self-center">Classes</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── What's Included in Every Booking ─── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">All-Inclusive</span>
            <Sparkle className="h-4 w-4 text-purple-400" />
          </div>
          <h2 className="font-display mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            What&apos;s included in every booking
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            Our $99/hour rate covers everything. There is nothing extra to buy, bring, or worry about. Here is exactly what you get with every single appointment.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Licensed Professional",
                desc: "Every stylist, nail tech, esthetician, and barber on our team is fully licensed in the state of New York, vetted, and insured. You are in expert hands every time.",
              },
              {
                title: "All Tools & Equipment",
                desc: "Your stylist arrives with everything they need — blow dryers, flat irons, curling wands, clippers, nail kits, makeup brushes, and more. You do not need to provide a single tool.",
              },
              {
                title: "Professional Products",
                desc: "We use salon-quality, professional-grade products for every service. No drugstore substitutes, no cutting corners. Color, toner, developer, gels, serums — all included.",
              },
              {
                title: "Travel to Any NYC Borough",
                desc: "Manhattan, Brooklyn, Queens, The Bronx, Staten Island — we come to you wherever you are with zero travel fees. Your apartment, office, hotel, event space, or anywhere else in the five boroughs.",
              },
              {
                title: "Setup & Cleanup",
                desc: "Your stylist handles all setup before and cleanup after the appointment. Drop cloths, capes, sanitation — everything. Your space will look exactly the way it did before we arrived.",
              },
              {
                title: "Aftercare Guidance",
                desc: "Every appointment ends with personalized aftercare tips. How to maintain your blowout, extend your gel mani, protect your color, or keep your skin glowing. Professional advice, no extra charge.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-purple-100 bg-white p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="font-display mb-2 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Service Time Estimates ─── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">Time Estimates</span>
            <Sparkle className="h-4 w-4 text-purple-400" />
          </div>
          <h2 className="font-display mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            How long does each service take?
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            Since we charge by the hour, it helps to know approximately how long your service will take. These are general estimates — your stylist will give you a more precise timeframe when you book. Actual times may vary based on hair length, texture, and the complexity of your request.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { service: "Blowout & Styling", time: "45 - 60 min", note: "Longer for thick or very long hair" },
              { service: "Women's Haircut", time: "30 - 45 min", note: "Cut only, no blowout" },
              { service: "Men's Haircut / Fade", time: "30 - 45 min", note: "Includes lineup and detail work" },
              { service: "Hair Color (Single Process)", time: "90 - 120 min", note: "Includes processing and rinse time" },
              { service: "Highlights / Balayage", time: "120 - 180 min", note: "Full head, including toning" },
              { service: "Gel Manicure", time: "40 - 50 min", note: "Includes prep, polish, and cure" },
              { service: "Classic Pedicure", time: "45 - 60 min", note: "Soak, shaping, polish" },
              { service: "Full Glam Makeup", time: "60 - 90 min", note: "Foundation to finishing spray" },
              { service: "Natural / Everyday Makeup", time: "30 - 45 min", note: "Lighter, quicker application" },
              { service: "Facial (Deep Cleansing)", time: "45 - 60 min", note: "Cleanse, exfoliate, mask, moisturize" },
              { service: "Brow Wax & Shape", time: "15 - 20 min", note: "Quick and precise" },
              { service: "Beard Sculpt & Trim", time: "20 - 30 min", note: "Shaping, lining, conditioning" },
              { service: "Silk Press", time: "60 - 90 min", note: "Depends on hair length and density" },
              { service: "Bridal Hair (Updo)", time: "60 - 90 min", note: "Includes trial run if booked" },
            ].map((item) => (
              <div key={item.service} className="flex items-center justify-between rounded-xl border border-purple-100 bg-white px-5 py-4">
                <div>
                  <p className="font-display text-sm font-semibold text-gray-900">{item.service}</p>
                  <p className="text-xs text-gray-400">{item.note}</p>
                </div>
                <p className="shrink-0 font-display text-sm font-bold text-purple-600">{item.time}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Want to combine services? Just add the times together for an estimate. A blowout (60 min) plus a gel manicure (45 min) would be roughly 1 hour 45 minutes. <Link href="/services" className="text-purple-600 hover:underline">See all services</Link>.
          </p>
        </div>
      </section>

      {/* ─── How to Save ─── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-2">
            <Sparkle className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">Smart Booking</span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            How to get the most value
          </h2>
          <div className="space-y-6">
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h3 className="font-display mb-2 text-lg font-semibold text-gray-900">Bundle multiple services in one appointment</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                Instead of booking separate appointments for a haircut and a blowout, or a manicure and a pedicure, combine them into a single visit. You save time and your stylist is already there — no additional travel or setup needed. Many clients book a blowout, manicure, and brow wax in one session and are done in under two hours.
              </p>
            </div>
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h3 className="font-display mb-2 text-lg font-semibold text-gray-900">Book as a group</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                Getting ready with friends, roommates, or coworkers? Group bookings are one of the best ways to maximize value. While one person gets their hair done, another can be getting a manicure from a second stylist. You split the collective time and everyone gets pampered. The 2-hour minimum for groups of 3+ is easily filled when multiple people are getting services.
              </p>
            </div>
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h3 className="font-display mb-2 text-lg font-semibold text-gray-900">Become a regular</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                When you book consistently with the same stylist, they learn your preferences, your hair or skin type, and exactly how you like things done. This means less time explaining, faster service, and better results. Regular clients often find their appointments become more efficient over time, which means less billable time for the same great outcome.
              </p>
            </div>
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h3 className="font-display mb-2 text-lg font-semibold text-gray-900">Know what you want before your stylist arrives</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                Having reference photos, a clear idea of the look you want, and a clean workspace ready to go can shave valuable minutes off your appointment. Less deliberation time means a shorter appointment, which means a lower bill. Preparation is the easiest way to keep costs down.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing Comparison ─── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">The Real Cost</span>
            <Sparkle className="h-4 w-4 text-purple-400" />
          </div>
          <h2 className="font-display mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Mobile vs. traditional salon — the real math
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            A $65 blowout at a Manhattan salon seems cheaper than our $99/hour rate on paper. But when you factor in the true cost of a salon visit, the numbers tell a different story. Here is what a typical salon appointment actually costs when you account for everything.
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h3 className="font-display mb-4 text-lg font-semibold text-gray-900">Traditional Salon Visit</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  { label: "Blowout service", cost: "$65 - $85" },
                  { label: "Tip (20%)", cost: "$13 - $17" },
                  { label: "Round-trip transit or parking", cost: "$5 - $25" },
                  { label: "Your time commuting (30-60 min)", cost: "Priceless" },
                  { label: "Waiting past your appointment time", cost: "Common" },
                  { label: "Product upcharges", cost: "$0 - $15" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span>{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.cost}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between pt-1">
                  <span className="font-semibold text-gray-900">Estimated total</span>
                  <span className="font-display font-bold text-gray-900">$83 - $142+</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border-2 border-purple-300 bg-white p-6">
              <h3 className="font-display mb-4 text-lg font-semibold text-purple-700">The NYC Mobile Salon</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  { label: "Blowout service (approx. 1 hr)", cost: "$99" },
                  { label: "Tip", cost: "Optional" },
                  { label: "Travel fee", cost: "Free" },
                  { label: "Your commute time", cost: "Zero" },
                  { label: "Wait time", cost: "None" },
                  { label: "Products & materials", cost: "Included" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span>{item.label}</span>
                    <span className="font-semibold text-purple-600">{item.cost}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between pt-1">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-display font-bold text-purple-700">$99</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            When you account for commuting, waiting, tipping, and product costs, a traditional salon blowout often costs the same or more than having a licensed professional come to your door. And you get your time back — which, in New York City, might be the most valuable thing of all.
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">Pricing FAQ</span>
            <Sparkle className="h-4 w-4 text-purple-400" />
          </div>
          <h2 className="font-display mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Frequently asked pricing questions
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            We get it — pricing transparency matters. Here are the most common questions we hear about our rates, minimums, and what is included. If you do not see your question answered here, reach out and we will get back to you right away.
          </p>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="font-display mb-2 text-base font-semibold text-gray-900">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Coverage ─── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">Coverage Area</span>
            <Sparkle className="h-4 w-4 text-purple-400" />
          </div>
          <h2 className="font-display mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            $99/hour everywhere in NYC
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            Our rate does not change based on your location. Whether you are in a high-rise in Midtown Manhattan or a brownstone in Bay Ridge, the price is the same and travel is always free. We serve all five boroughs and over 200 neighborhoods across the city.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { borough: "Manhattan", link: "/locations/manhattan", areas: "Upper East Side, Upper West Side, Midtown, Chelsea, SoHo, Tribeca, Harlem, Financial District & more" },
              { borough: "Brooklyn", link: "/locations/brooklyn", areas: "Williamsburg, Park Slope, DUMBO, Bushwick, Bay Ridge, Bed-Stuy, Crown Heights, Sunset Park & more" },
              { borough: "Queens", link: "/locations/queens", areas: "Astoria, Long Island City, Flushing, Jackson Heights, Forest Hills, Bayside, Ridgewood & more" },
              { borough: "Bronx", link: "/locations/bronx", areas: "Riverdale, Fordham, Pelham Bay, Mott Haven, Kingsbridge, Concourse, Throgs Neck & more" },
              { borough: "Staten Island", link: "/locations/staten-island", areas: "St. George, Tottenville, New Dorp, Great Kills, West Brighton, Stapleton & more" },
            ].map((b) => (
              <Link key={b.borough} href={b.link} className="group rounded-xl border border-purple-100 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <h3 className="font-display mb-2 text-lg font-semibold text-gray-900 group-hover:text-purple-600">{b.borough}</h3>
                <p className="text-xs leading-relaxed text-gray-400">{b.areas}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-4 py-16 md:py-24" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Ready to book?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/80">
            $99/hour. All-inclusive. No travel fees. No hidden charges. Licensed professionals at your door anywhere in New York City. Tell us what you need and we will handle the rest.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/book" className="inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display">Book Your Appointment</Link>
            <Link href="/services" className="inline-block rounded-full border border-white/30 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-white/10 font-display">Browse Services</Link>
          </div>
        </div>
      </section>
    </>
  );
}
