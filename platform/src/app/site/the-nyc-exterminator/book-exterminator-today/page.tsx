import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-exterminator/_components/Breadcrumbs";
import ContactForm from "@/app/site/the-nyc-exterminator/_components/ContactForm";
import { PHONE, SITE_URL, SITE_NAME, getBreadcrumbSchema, getFAQPageSchema, getLocalBusinessSchemaGlobal } from "@/app/site/the-nyc-exterminator/_lib/seo";

export const metadata: Metadata = {
  title: "Book NYC Exterminator Today | Save $10 Booking Online",
  description:
    "Book a licensed NYC exterminator online and save $10 — the fastest way to get service. Same-day and next-day pest control appointments across all 5 boroughs, NJ, Long Island & Westchester. We respond within 10-30 minutes, schedule as soon as tomorrow, and your certified technician arrives on time within a 1-hour window. Free inspection, upfront pricing from $49.",
  keywords:
    "book exterminator NYC, schedule pest control appointment, same-day exterminator NYC, next-day pest control, book bed bug treatment, schedule cockroach extermination, NYC pest control appointment, emergency exterminator booking, hire exterminator today",
  openGraph: {
    title: "Book NYC Exterminator Today | Save $10 Booking Online",
    description:
      "Book a licensed NYC exterminator online and save $10. We respond in 10-30 min, schedule next-day appointments, and your technician arrives on time within a 1-hour window.",
    url: `${SITE_URL}/book-exterminator-today`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: `${SITE_URL}/book-exterminator-today`,
  },
};

const faqs = [
  {
    q: "How quickly will I hear back after booking an exterminator online?",
    a: "We respond to every booking request within 10 to 30 minutes during business hours (Monday-Friday 7 AM-8 PM, Saturday 8 AM-6 PM, Sunday 9 AM-5 PM). If you submit your exterminator booking request after hours, you will hear from a licensed pest control technician first thing the next morning. For emergencies, text us for the fastest response.",
  },
  {
    q: "How soon can a pest control technician come to my property?",
    a: "We can usually schedule your pest control appointment as soon as the next business day. Same-day emergency exterminator service is also available for urgent situations like active bed bug infestations, rat sightings, or wasp nests near doorways. We serve all five NYC boroughs, northern New Jersey, Long Island, and Westchester County.",
  },
  {
    q: "Will the exterminator arrive on time for my appointment?",
    a: "Yes. Every pest control appointment includes a 1-hour arrival window. Your certified exterminator will arrive within that window, and you will receive a confirmation text message when they are on the way to your property. No waiting around all day — we respect your time.",
  },
  {
    q: "Is the initial pest control inspection really free?",
    a: "Yes. Your first on-site pest inspection is completely free with zero obligation. The licensed technician will assess the type and severity of your infestation, identify entry points and nesting areas, and provide a written treatment plan with upfront pricing before any work begins. No hidden fees, no pressure.",
  },
  {
    q: "What pest control services can I book through this form?",
    a: "You can book any of our 30+ pest control services including cockroach extermination, bed bug treatment, rat extermination, mouse extermination, termite treatment, ant control, flea treatment, wasp removal, wildlife removal, commercial pest control, and more. If you are unsure what pest you are dealing with, describe what you see in the form and our technician will identify it during the free inspection.",
  },
  {
    q: "How much does it cost to book an exterminator in NYC?",
    a: "Pest control pricing starts at $49 for basic treatments. Most residential exterminator jobs range from $125 to $600 depending on the pest type, severity, and property size. Specialized services like bed bug heat treatment and termite treatment carry higher pricing. You will always receive a written quote after the free inspection — before any work begins.",
  },
];

export default function BookExterminatorTodayPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Book Exterminator Today", url: "/book-exterminator-today" },
  ]);
  const faqSchema = getFAQPageSchema(faqs);
  const localBusinessSchema = getLocalBusinessSchemaGlobal();

  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema).replace(/</g, '\\u003c') }}
      />

      {/* ── HERO + FORM ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Book Exterminator Today", url: "/book-exterminator-today" }]} />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              Licensed &amp; Insured &middot; 30+ Services &middot; 280+ Neighborhoods
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Book Your{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                NYC Pest Control
              </span>{" "}
              Service Today
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-300">
              Schedule a licensed exterminator for your home or business in New York City, New Jersey,
              Long Island, or Westchester. Fill out the booking form below and our pest control team
              will be in touch within{" "}
              <span className="font-semibold text-white">10&ndash;30 minutes</span> to confirm your
              appointment. We can usually schedule a certified technician as soon as{" "}
              <span className="font-semibold text-white">the next day</span> &mdash; and they&apos;ll
              arrive on time within a{" "}
              <span className="font-semibold text-white">1-hour window</span>.
            </p>
          </div>

          {/* ── 3-Step Visual ── */}
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
                1
              </div>
              <p className="mt-2 text-sm font-semibold text-white">Submit form</p>
              <p className="mt-1 text-xs text-zinc-500">Takes under 2 min</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
                2
              </div>
              <p className="mt-2 text-sm font-semibold text-white">We confirm</p>
              <p className="mt-1 text-xs text-zinc-500">Within 10&ndash;30 min</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
                3
              </div>
              <p className="mt-2 text-sm font-semibold text-white">Tech arrives</p>
              <p className="mt-1 text-xs text-zinc-500">On time, 1-hr window</p>
            </div>
          </div>

          {/* ── Booking Form ── */}
          <div className="mt-10 rounded-xl border border-zinc-800 bg-[#141414] p-6 sm:p-8">
            <h2 className="mb-2 text-2xl font-bold">
              Book a <span className="text-green-400">Licensed Exterminator</span>
            </h2>
            <p className="mb-6 text-sm text-zinc-400">
              Tell us about your pest problem and we&apos;ll match you with a certified NYC pest control
              technician. Free inspection, upfront pricing, no obligation.
            </p>
            <ContactForm />
          </div>

          {/* ── Text fallback ── */}
          <div className="mt-8 text-center">
            <p className="text-zinc-500">Prefer to text? Message us and we&apos;ll get you booked.</p>
            <a
              href={`sms:${PHONE.replace(/-/g, "")}`}
              className="mt-1 inline-block text-2xl font-bold text-green-500 hover:text-green-400"
            >
              Text Us
            </a>
          </div>
        </div>
      </section>

      {/* ── WHAT TO EXPECT AFTER BOOKING ── */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            What Happens After You{" "}
            <span className="text-green-400">Book Your Exterminator</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
            From the moment you submit your pest control booking request to the moment your
            certified technician finishes treatment, here is exactly what to expect when you
            hire a licensed NYC exterminator through The NYC Exterminator.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                1
              </div>
              <div>
                <p className="font-semibold text-white">We respond within 10&ndash;30 minutes</p>
                <p className="mt-1 text-sm text-zinc-400">
                  A member of our pest control scheduling team will text you to confirm your
                  details, discuss the pest situation, and lock in your preferred appointment time.
                  No voicemail runaround &mdash; you talk to a real person who knows pest control.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                2
              </div>
              <div>
                <p className="font-semibold text-white">Next-day exterminator scheduling available</p>
                <p className="mt-1 text-sm text-zinc-400">
                  We can usually get a certified pest control technician to your property as soon as
                  the next business day. Same-day emergency exterminator service is available for
                  urgent pest situations like bed bug discoveries, rat intrusions, and wasp nests
                  near high-traffic areas.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                3
              </div>
              <div>
                <p className="font-semibold text-white">Your technician arrives on time within a 1-hour window</p>
                <p className="mt-1 text-sm text-zinc-400">
                  No &ldquo;between 8 AM and 5 PM&rdquo; nonsense. You get a tight 1-hour arrival
                  window and a confirmation text when your licensed exterminator is on the way.
                  Our technicians arrive prepared with the right equipment for your specific pest problem.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                4
              </div>
              <div>
                <p className="font-semibold text-white">Free inspection and upfront pest control quote</p>
                <p className="mt-1 text-sm text-zinc-400">
                  The technician inspects your property top to bottom, identifies the pest species
                  and severity, locates entry points and nesting areas, and gives you a written
                  treatment plan with transparent pricing before any work begins. No surprises,
                  no hidden fees, no pressure.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                5
              </div>
              <div>
                <p className="font-semibold text-white">Professional treatment with guaranteed results</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Once you approve the quote, treatment begins immediately. Our licensed exterminators
                  use professional-grade, EPA-registered products safe for families and pets.
                  Every pest control treatment is backed by our satisfaction guarantee &mdash; if
                  the pests come back, so do we, at no extra charge.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIPS FOR FILLING OUT THE FORM ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Tips to <span className="text-green-400">Speed Up</span> Your Exterminator Booking
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
            The more details you include in your pest control booking form, the faster we can
            match you with the right licensed technician and prepare the correct treatment
            equipment before arriving at your property.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="font-semibold text-green-400">Describe the pest you are seeing</p>
              <p className="mt-1 text-sm text-zinc-400">
                &ldquo;Small brown roaches in the kitchen at night&rdquo; tells our exterminator
                team far more than &ldquo;bugs.&rdquo; Include size, color, location in the
                property, and time of day if you can. Not sure what it is? Describe what you see
                and our pest control technician will identify it on-site during the free inspection.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="font-semibold text-green-400">Include your neighborhood or address</p>
              <p className="mt-1 text-sm text-zinc-400">
                Mentioning your neighborhood or cross streets lets us dispatch the closest available
                pest control technician to your location. We serve 280+ neighborhoods across NYC,
                NJ, Long Island, and Westchester &mdash; the closer we can match you, the sooner
                your exterminator arrives.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="font-semibold text-green-400">Set your urgency level</p>
              <p className="mt-1 text-sm text-zinc-400">
                Emergency pest situations like active bed bug bites, rat sightings inside living
                spaces, or wasp nests near doorways get fast-tracked for same-day exterminator
                dispatch. Let us know if you need immediate pest control service so we can
                prioritize your booking request.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="font-semibold text-green-400">Text us photos after submitting</p>
              <p className="mt-1 text-sm text-zinc-400">
                Photos of the pest, droppings, damage, or nesting areas help our exterminator team
                identify the species and prepare the right treatment before arriving at your
                property. Text photos to{" "}
                <a href={`sms:${PHONE.replace(/-/g, "")}`} className="text-green-400 hover:text-green-300">
                  us
                </a>{" "}
                after submitting your booking form.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Exterminator Booking{" "}
            <span className="text-green-400">Questions Answered</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
            Everything you need to know about booking a pest control appointment with
            The NYC Exterminator &mdash; from response times and scheduling to pricing
            and what happens on the day of your exterminator service.
          </p>
          <div className="mt-8 space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5"
              >
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-2 text-sm text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to Book Your{" "}
            <span className="text-green-400">NYC Exterminator</span>?
          </h2>
          <p className="mt-3 text-zinc-400">
            Scroll up to fill out the pest control booking form and save $10 — the
            fastest way to lock in your exterminator appointment. Prefer to text? We&apos;re here.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="#top"
              className="inline-flex items-center rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700"
            >
              Self-Book — Save $10
            </a>
            <a
              href={`sms:${PHONE.replace(/-/g, "")}`}
              className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
            >
              Text Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
