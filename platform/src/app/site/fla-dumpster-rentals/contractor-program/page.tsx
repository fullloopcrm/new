import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";
import { PHONE, SITE_URL, getFAQPageSchema } from "@/app/site/fla-dumpster-rentals/_lib/seo";

export const metadata: Metadata = {
  title:
    "Contractor Dumpster Rental Program | Volume Pricing & NET-30 | Florida Dumpster Rentals",
  description:
    "Contractor dumpster rental program with 15-25% volume discounts, NET-30 billing, priority scheduling & dedicated account management. Serving GCs, roofers & builders across Florida. Call 954-710-2332.",
  openGraph: {
    title:
      "Contractor Dumpster Rental Program | Volume Pricing & NET-30 | Florida Dumpster Rentals",
    description:
      "Volume dumpster pricing for contractors. 15-25% discounts, NET-30 billing, priority scheduling, and dedicated account management across Florida.",
    url: `${SITE_URL}/contractor-program`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/contractor-program` },
};

const phonePlain = PHONE.replace(/-/g, "");

const faqs = [
  {
    q: "What qualifies me for the contractor program?",
    a: "Any licensed contractor, builder, roofer, property manager, demolition company, or business that rents dumpsters on a regular basis qualifies. There is no minimum number of rentals required to join, but volume discounts scale with usage — the more you rent, the more you save. If you use dumpsters as part of your business, you qualify.",
  },
  {
    q: "How much can I save with volume pricing?",
    a: "Contractor discounts range from 15-25% off our standard rates depending on your rental volume. A contractor renting 3-5 dumpsters per month typically receives a 15% discount. High-volume accounts renting 10 or more per month can qualify for up to 25% off. These discounts apply to all dumpster sizes and all locations across Florida.",
  },
  {
    q: "How does NET-30 billing work?",
    a: "Once your contractor account is approved, all rentals are invoiced and payment is due 30 days from the invoice date. You receive a single consolidated invoice at the end of each billing cycle detailing every rental — dumpster size, delivery address, delivery and pickup dates, and individual charges. No deposits are required and no payment is needed at the time of delivery.",
  },
  {
    q: "Can I have multiple dumpsters on different job sites at the same time?",
    a: "Yes. There is no limit on concurrent rentals. Many of our contractor accounts run 5-15 dumpsters simultaneously across multiple job sites. Every dumpster is tracked individually in our system with its own delivery date, pickup date, and job site address. Your consolidated monthly invoice breaks everything down by project.",
  },
  {
    q: "How does the dumpster swap and rotation service work?",
    a: "When a dumpster fills up on your job site, text or call your account manager and we schedule a swap — typically within hours. We pick up the full container and drop off an empty one in the same trip when possible. This keeps your job site clean and your crew productive without waiting. Continuous rotation is available for high-volume projects like demolition and new construction.",
  },
  {
    q: "Do I get a dedicated account manager?",
    a: "Yes. Every contractor account is assigned a dedicated point of contact who knows your business, your typical project types, and your preferences. You will not repeat yourself every time you call. Your account manager handles scheduling, billing questions, and any issues that arise. You have their direct number and they respond immediately.",
  },
  {
    q: "What areas do you serve for contractor accounts?",
    a: "We serve all of Florida. Whether your projects are concentrated in one metro area or spread across the state, we have hauler coverage statewide. Many of our contractor customers work across multiple Florida markets — South Florida, Central Florida, Tampa Bay, Jacksonville, and the Panhandle — and we handle logistics seamlessly regardless of location.",
  },
  {
    q: "How do I sign up for the contractor program?",
    a: "Call or text us at 954-710-2332 and tell us you want to set up a contractor account. We will ask about your typical rental volume, the types of projects you handle, and your preferred billing arrangement. Account setup takes one business day. There is no application fee, no annual commitment, and no minimum order requirement.",
  },
];

export default function ContractorProgramPage() {
  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Service",
              name: "Contractor Dumpster Rental Program",
              description:
                "Volume dumpster rental program for contractors with discounted pricing, NET-30 billing, priority scheduling, and dedicated account management across Florida.",
              url: `${SITE_URL}/contractor-program`,
              provider: {
                "@type": "Organization",
                name: "Florida Dumpster Rentals",
                url: SITE_URL,
                telephone: PHONE,
              },
              areaServed: {
                "@type": "State",
                name: "Florida",
              },
            },
            getFAQPageSchema(faqs),
          ]).replace(/</g, '\\u003c'),
        }}
      />

      {/* Hero */}
      <section className="bg-stone-950 pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Contractor Program", url: "/contractor-program" },
            ]}
            dark
          />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              Built for Professionals
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Contractor Dumpster
              <br />
              <span className="text-orange-500">Rental Program</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              Volume pricing, NET-30 billing, priority scheduling, and a
              dedicated account manager for every contractor account. Built for
              general contractors, roofers, property managers, and demolition
              crews who need reliable dumpster service across Florida.
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* Program Benefits */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Contractor Program Benefits
          </h2>
          <p className="mt-4 text-lg text-stone-300">
            We designed this program around the actual needs of contractors who
            use dumpsters every week. No gimmicks, no loyalty points, no
            complicated tier systems. Just meaningful benefits that save you
            money and make your operations smoother.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "15-25% Volume Discounts",
                desc: "The more dumpsters you rent, the less each one costs. Discounts are applied automatically to every rental on your account. No coupon codes, no promotional periods — just consistently lower pricing for your business.",
              },
              {
                title: "NET-30 Billing",
                desc: "No payment at delivery. No deposits. No credit card on file required. Receive a single consolidated invoice at the end of each billing cycle with every rental itemized by job site. Pay within 30 days.",
              },
              {
                title: "Priority Scheduling",
                desc: "Contractor accounts get priority access to same-day and next-day delivery. When inventory is tight — especially after storms — contractor accounts are served first. Your job sites never sit idle waiting for a dumpster.",
              },
              {
                title: "Dedicated Account Manager",
                desc: "One point of contact who knows your business, your projects, and your preferences. No repeating yourself to a different rep every time. Your account manager is available by phone, text, and email.",
              },
              {
                title: "Multiple Dumpster Rotations",
                desc: "Run multiple dumpsters across multiple job sites simultaneously. When one fills up, we swap it for an empty container — often the same day. Continuous rotation keeps your crews productive and your sites clean.",
              },
              {
                title: "Flexible Rental Periods",
                desc: "Standard 7-day rentals or extended terms for longer projects. Monthly rates available for ongoing construction and demolition. We match the rental period to your project timeline, not the other way around.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-stone-700 bg-stone-800/50 p-6"
              >
                <h3 className="text-lg font-bold text-orange-400">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-300">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Qualifies */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Who Qualifies</h2>
          <p className="mt-4 text-lg text-stone-300">
            The contractor program is open to any business or professional that
            uses dumpsters as part of their regular operations. There is no
            minimum rental volume to join — we scale benefits with your usage.
            Here are the professionals we work with most:
          </p>

          <div className="mt-8 space-y-6 text-stone-300 leading-7">
            <div>
              <h3 className="text-xl font-bold text-white">
                General Contractors
              </h3>
              <p className="mt-2">
                Whether you are running residential renovations, commercial
                build-outs, or ground-up construction, you need dumpsters on
                every job. Our contractor program gives you volume pricing
                across all your projects, consolidated billing so your
                bookkeeper is not processing a dozen individual invoices, and
                priority scheduling so you never lose a day of production
                waiting for a container. We work with GCs running 2 jobs at a
                time and GCs running 20.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Roofers &amp; Siding Contractors
              </h3>
              <p className="mt-2">
                Roofing jobs generate heavy, bulky debris that needs to be
                hauled away quickly. You cannot have old shingles sitting in a
                homeowner&apos;s driveway for a week. Our same-day swap service
                means you can fill a dumpster in the morning and have an empty
                one by afternoon. We understand the weight characteristics of
                roofing materials and price accordingly — no surprises when the
                load hits the scale.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Property Managers
              </h3>
              <p className="mt-2">
                Tenant turnovers, unit renovations, and property maintenance
                generate a steady stream of debris. Property managers benefit
                from our NET-30 billing and the ability to order dumpsters on
                the fly without processing a payment each time. Many of our
                property management clients keep us on speed dial for unit
                cleanouts, appliance removals, and seasonal property
                maintenance across their entire portfolio.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Demolition Crews
              </h3>
              <p className="mt-2">
                Demolition projects require high-volume dumpster service with
                fast turnaround. A single demo job can fill 5-10 dumpsters. Our
                continuous rotation service means you always have an empty
                container on site, and our volume pricing ensures the per-unit
                cost drops significantly as your usage increases. We have
                supported full-building demolitions with back-to-back container
                swaps running throughout the entire project.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Landscapers &amp; Tree Service Companies
              </h3>
              <p className="mt-2">
                Yard waste, tree debris, sod removal, and hardscape demolition
                all need somewhere to go. Landscaping debris is typically bulky
                but lighter than construction waste, which means you can
                maximize container capacity without worrying about weight
                overages. We offer favorable pricing for landscaping debris and
                can stage dumpsters for multi-day landscape overhauls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTABanner
        title="Set Up Your Contractor Account Today"
        subtitle="Call or text us to get started. Account setup takes one business day. No application fee, no annual commitment."
      />

      {/* How It Works for Contractors */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How the Contractor Program Works
          </h2>

          <div className="mt-10 space-y-8">
            {[
              {
                step: "1",
                title: "Contact Us to Set Up Your Account",
                desc: "Call or text us at 954-710-2332 and let us know you want a contractor account. We will ask about your typical rental volume, the types of projects you handle, and your preferred billing arrangement. Account setup is completed within one business day. There is no application fee and no annual commitment.",
              },
              {
                step: "2",
                title: "Get Your Volume Pricing",
                desc: "Based on your expected rental volume, we assign your discount tier — 15% for moderate usage, scaling up to 25% for high-volume accounts. Your discounted rates apply to every dumpster you rent, regardless of size or location across Florida. Your account manager provides a rate card so you know exactly what each rental costs for your bids.",
              },
              {
                step: "3",
                title: "Order Dumpsters on Demand",
                desc: "When you need a dumpster on a job site, text or call your dedicated account manager. Provide the job site address, the dumpster size, and the delivery date — that is it. No payment at the time of order. No deposit. No credit card required. We schedule the delivery and confirm the details.",
              },
              {
                step: "4",
                title: "Receive a Consolidated Monthly Invoice",
                desc: "At the end of each billing cycle, you receive a single invoice detailing every rental for the period. Each line item includes the job site address, dumpster size, delivery date, pickup date, weight, and charge. Pay within 30 days. Your bookkeeper will appreciate the simplicity.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-xl font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-stone-300 leading-7">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Contractors Choose Us */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Contractors Choose Florida Dumpster Rentals
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              Contractors have options. There are dozens of dumpster rental
              companies operating across Florida, and most of them offer some
              version of &ldquo;contractor pricing.&rdquo; Here is why
              professionals keep coming back to us.
            </p>
            <p>
              <strong className="text-white">We answer the phone.</strong> When
              you call, a real person picks up. When you text, you get a
              response in minutes, not hours. In the dumpster rental industry,
              this is rarer than it should be. Many companies route contractor
              calls to a call center or an answering service that takes a
              message and promises a callback. Your time is too valuable for
              that.
            </p>
            <p>
              <strong className="text-white">
                We deliver when we say we will.
              </strong>{" "}
              A dumpster that arrives two hours late can throw off your entire
              day. Your crew is standing around, your timeline slips, and the
              homeowner is not happy. We hold ourselves to tight delivery
              windows and communicate proactively if anything changes. On-time
              delivery is not a perk — it is a minimum expectation, and we
              treat it that way.
            </p>
            <p>
              <strong className="text-white">
                Our pricing is actually flat-rate.
              </strong>{" "}
              No fuel surcharges, no environmental fees, no admin charges that
              show up on your invoice after the fact. The price we quote is the
              price you pay. Period. You can build our pricing into your bids
              with confidence because it will not change between the quote and
              the invoice.
            </p>
            <p>
              <strong className="text-white">
                We scale with your business.
              </strong>{" "}
              Whether you need one dumpster this month or thirty, we have the
              capacity and the infrastructure to serve you. As your volume
              grows, your discount grows with it. We have contractor accounts
              that started with a single rental and now run dozens of containers
              per month across multiple Florida markets.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Contractor Program FAQ
          </h2>
          <div className="mt-8 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-stone-800 pb-6">
                <h3 className="text-lg font-semibold">{faq.q}</h3>
                <p className="mt-2 text-stone-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Related Services</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                href: "/construction-dumpster-rental",
                label: "Construction Dumpster Rental",
              },
              {
                href: "/commercial-dumpster-rental",
                label: "Commercial Dumpster Rental",
              },
              { href: "/pricing", label: "Dumpster Rental Pricing" },
              { href: "/services", label: "All Dumpster Services" },
              { href: "/free-quote", label: "Get a Free Quote" },
              { href: "/areas", label: "Florida Service Areas" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-stone-700 px-4 py-3 text-orange-400 hover:border-orange-600 hover:bg-orange-600/10 font-semibold"
              >
                {link.label} &rarr;
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Get Your Rate Card First",
            body: "Before you bid your next job, call us and get your contractor rate card. Knowing your exact dumpster cost per size means you can build accurate bids without guessing. No more eating dumpster costs because you underestimated.",
          },
          {
            title: "Schedule Swaps Before You're Full",
            body: "Don't wait until the dumpster is overflowing to request a swap. Text your account manager when the container is about 75% full so we can schedule the swap before your crew runs out of space. Proactive scheduling prevents downtime.",
          },
          {
            title: "Separate Heavy and Light Debris",
            body: "If your job generates both heavy materials (concrete, tile, roofing) and light debris (drywall, lumber, cardboard), consider requesting separate dumpsters for each. Keeping heavy stuff isolated prevents weight overages and often saves money overall.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
