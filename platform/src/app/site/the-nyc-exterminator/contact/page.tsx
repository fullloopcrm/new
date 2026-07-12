import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";
import { PHONE, EMAIL, ADDRESS, SITE_URL, getBreadcrumbSchema, getLocalBusinessSchemaGlobal } from "@/app/site/the-nyc-exterminator/_lib/seo";
import { getAllServices, getAllNeighborhoods } from "@/app/site/the-nyc-exterminator/_lib/data";

export const metadata: Metadata = {
  title: "Contact NYC Exterminator | Self-Book & Save $10",
  description:
    "Contact The NYC Exterminator for a free pest control inspection and quote. Self-book online & save $10. Same-day exterminator service across all 5 NYC boroughs, NJ, Long Island & Westchester. Licensed, insured, pricing from $49. We respond within minutes.",
  keywords:
    "contact exterminator NYC, book pest control online NYC, text exterminator, NYC pest control, book exterminator appointment, pest control near me, emergency exterminator contact",
  openGraph: {
    title: "Contact NYC Exterminator | Self-Book & Save $10",
    description:
      "Contact The NYC Exterminator. Self-book online & save $10. Free inspection, same-day service, pricing from $49.",
    url: `${SITE_URL}/contact`,
  },
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  const breadcrumbSchema = getBreadcrumbSchema([{ name: "Contact", url: "/contact" }]);
  const localBusinessSchema = getLocalBusinessSchemaGlobal();
  const services = getAllServices();
  const neighborhoods = getAllNeighborhoods();
  const phonePlain = PHONE.replace(/-/g, "");

  const contactFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How quickly does The NYC Exterminator respond to contact requests?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We respond to all text messages within 30 minutes during business hours. Online form submissions and emails are answered within 2 hours. For emergency pest control situations, we prioritize immediate responses.",
        },
      },
      {
        "@type": "Question",
        name: "What is the fastest way to contact a pest control exterminator in NYC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The fastest way to reach us is by texting us. Text messages are monitored continuously and allow our exterminators to begin assessing your pest problem immediately with photos you send.",
        },
      },
      {
        "@type": "Question",
        name: "What information should I have ready when I contact an exterminator?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Have the following ready: the type of pest you've seen (or describe what it looks like), your property type (apartment, house, commercial), your address, when you first noticed the problem, and how severe it appears. Photos are extremely helpful.",
        },
      },
      {
        "@type": "Question",
        name: "Does The NYC Exterminator offer free pest control inspections?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Every new client receives a free, no-obligation pest control inspection. Our licensed exterminator will assess your property, identify the pest species, determine the severity of the infestation, and provide an upfront quote with pricing starting at $49.",
        },
      },
      {
        "@type": "Question",
        name: "Can I schedule a pest control appointment on weekends?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. We offer pest control appointments seven days a week. Our hours are Monday through Friday 7am to 8pm, Saturday 8am to 6pm, and Sunday 9am to 5pm. Same-day exterminator service is available for urgent pest problems.",
        },
      },
      {
        "@type": "Question",
        name: "What areas does The NYC Exterminator serve?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We provide pest control and exterminator services across all five NYC boroughs (Manhattan, Brooklyn, Queens, Bronx, Staten Island), plus New Jersey, Long Island, and Westchester County.",
        },
      },
    ],
  };

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(contactFaqSchema) }} />

      {/* ───────── HERO ───────── */}
      <section className="bg-green-700 pb-20 pt-8">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Contact", url: "/contact" }]} />

          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-green-200/80">
            NYC Pest Control Experts &middot; Licensed &amp; Insured &middot; Same-Day Service
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Contact Your{" "}
            <span className="text-green-200">NYC Exterminator</span> Today
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-green-100">
            Whether you need emergency extermination or just want a quote for
            preventive service &mdash; we&apos;re here. Free inspections. Upfront pricing.
            No call centers, no runaround. When you contact The NYC Exterminator,
            you reach a licensed pest control professional who knows New York City
            inside and out.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-green-100">
            Text{" "}
            <a href={`sms:${phonePlain}`} className="font-bold text-white underline hover:text-green-200">
              us
            </a>{" "}
            for the fastest response. We monitor texts around the clock and can
            start assessing your pest problem the moment you hit send. Include a
            photo if you can &mdash; it helps our exterminators identify the species
            before we even arrive. With pest control pricing starting at $49 and
            same-day exterminator service available across all five boroughs, there
            is no reason to wait another night with unwanted guests in your home
            or business.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-green-100">
            We serve residential apartments, co-ops, condos, townhouses, single-family
            homes, multi-unit buildings, restaurants, retail spaces, offices, warehouses,
            and every other type of property in NYC, New Jersey, Long Island, and
            Westchester. No matter the pest &mdash;{" "}
            <Link href="/cockroach-extermination" className="font-semibold text-white underline hover:text-green-200">cockroaches</Link>,{" "}
            <Link href="/bed-bug-treatment" className="font-semibold text-white underline hover:text-green-200">bed bugs</Link>,{" "}
            <Link href="/rat-extermination" className="font-semibold text-white underline hover:text-green-200">rats</Link>,{" "}
            <Link href="/mouse-extermination" className="font-semibold text-white underline hover:text-green-200">mice</Link>,{" "}
            <Link href="/termite-treatment" className="font-semibold text-white underline hover:text-green-200">termites</Link>,{" "}
            or anything else &mdash; we have a licensed exterminator ready to help.
          </p>
        </div>
      </section>

      {/* ───────── CONTACT CARDS + PHONE ───────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Link
              href="/quote-request"
              className="group rounded-xl border border-zinc-800 bg-[#141414] p-8 transition-colors hover:border-green-500"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white group-hover:text-green-500">
                Get a Free Quote
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Tell us about your <span className="text-zinc-300">pest problem</span> and
                property. We&apos;ll provide a free inspection and upfront quote.
                Same-day service available.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-green-500">
                Request a quote &rarr;
              </span>
            </Link>

            <Link
              href="/book-exterminator-today"
              className="group rounded-xl border border-zinc-800 bg-[#141414] p-8 transition-colors hover:border-green-500"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white group-hover:text-green-500">
                General Inquiry
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Have a question about our <span className="text-zinc-300">services</span>,
                pricing, or just curious about something? Send us a message.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-green-500">
                Send a message &rarr;
              </span>
            </Link>
          </div>

          <div className="mt-12 rounded-xl border border-green-500/30 bg-green-500/5 p-8 text-center">
            <p className="text-lg font-semibold text-white">Fastest way to get service</p>
            <Link
              href="/book-exterminator-today"
              className="mt-3 inline-block rounded-lg bg-green-600 px-7 py-3.5 text-lg font-bold text-white shadow-lg shadow-green-600/25 hover:bg-green-500"
            >
              Self-Book Online &mdash; Save $10
            </Link>
            <p className="mt-3 text-sm text-zinc-500">
              Prefer to text? Message{" "}
              <a href={`sms:${phonePlain}`} className="font-semibold text-green-400 hover:text-green-300">us</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── HOW TO REACH US ───────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            How to Reach Your NYC Exterminator
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            We have made it as easy as possible to contact our pest control team.
            Choose whichever method works best for you &mdash; every channel is
            monitored by licensed exterminators, not outsourced agents. Here are all
            the ways you can get in touch with The NYC Exterminator, ranked by
            response speed.
          </p>

          <div className="mt-12 space-y-10">
            {/* Text */}
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <span className="text-xl font-bold">1</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-400">Text Us (Fastest)</h3>
                <p className="mt-2 text-zinc-300">
                  Text{" "}
                  <a href={`sms:${phonePlain}`} className="font-bold text-green-400 hover:text-green-300">
                    us
                  </a>{" "}
                  and a licensed pest control technician will respond within minutes.
                  Texting is our recommended contact method because you can send photos
                  of the pest or damage, describe the problem at your own pace, and keep
                  a written record of everything. Many of our exterminator clients start
                  with a simple text like &quot;I found roaches in my kitchen&quot; or
                  &quot;There are droppings under my sink&quot; &mdash; that is all we
                  need to get moving. We will ask a few follow-up questions about your
                  property type, address, and the severity of the infestation, then
                  schedule your free pest control inspection. Text messages are monitored
                  seven days a week during business hours and are typically answered
                  within 15 minutes.
                </p>
              </div>
            </div>

            {/* Book Online */}
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <span className="text-xl font-bold">2</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-400">Self-Book &mdash; Save $10</h3>
                <p className="mt-2 text-zinc-300">
                  The fastest way to get service is to{" "}
                  <Link href="/book-exterminator-today" className="font-bold text-green-400 hover:text-green-300">
                    book online
                  </Link>{" "}
                  &mdash; and you save $10 off your quote for doing it. Tell us your
                  pest problem, property type, and service address, and a licensed
                  exterminator confirms your appointment within minutes during business
                  hours. Booking online means you skip the back-and-forth, keep a written
                  record, and get the online-only $10 discount applied to your quote.
                  It takes under two minutes and there is no commitment &mdash; every
                  booking still comes with a free on-site inspection and upfront pricing
                  before any work begins.
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <span className="text-xl font-bold">3</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-400">Email Us</h3>
                <p className="mt-2 text-zinc-300">
                  Send a detailed message to{" "}
                  <a href={`mailto:${EMAIL}`} className="font-bold text-green-400 hover:text-green-300">
                    {EMAIL}
                  </a>{" "}
                  and we will respond within two hours during business hours. Email
                  is a great option for non-urgent pest control inquiries, property
                  management companies coordinating multi-unit exterminator services,
                  or commercial clients who need documentation. Attach photos,
                  floor plans, or inspection reports &mdash; our team reviews every
                  attachment. If you manage multiple properties and need pest control
                  across several locations, email allows us to prepare a comprehensive
                  proposal before your free inspection.
                </p>
              </div>
            </div>

            {/* Online Form */}
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <span className="text-xl font-bold">4</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-400">Online Quote Form</h3>
                <p className="mt-2 text-zinc-300">
                  Fill out our{" "}
                  <Link href="/quote-request" className="font-bold text-green-400 hover:text-green-300">
                    free quote request form
                  </Link>{" "}
                  and a licensed exterminator will contact you within two hours to
                  schedule your pest control inspection. The form asks for your name,
                  contact information, property type, pest type, and a description of
                  the problem. It takes less than two minutes to complete and ensures
                  we have all the information we need to prepare for your appointment.
                  Pest control pricing starts at $49, and every quote comes with a free
                  on-site inspection &mdash; no commitment required.
                </p>
              </div>
            </div>
          </div>

          {/* Address & Hours */}
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-700 bg-[#1A1A1A] p-8">
              <h3 className="text-xl font-semibold text-green-400">Our Office Address</h3>
              <p className="mt-4 text-zinc-300">
                {ADDRESS.street}<br />
                {ADDRESS.city}, {ADDRESS.state} {ADDRESS.zip}
              </p>
              <p className="mt-4 text-sm text-zinc-500">
                While we serve all of NYC, NJ, Long Island, and Westchester, our
                main office is centrally located in Midtown Manhattan. Walk-ins are
                welcome during business hours, though we recommend texting or booking
                ahead so we can have an exterminator ready to discuss your pest
                control needs.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-[#1A1A1A] p-8">
              <h3 className="text-xl font-semibold text-green-400">Hours of Operation</h3>
              <div className="mt-4 space-y-2 text-zinc-300">
                <div className="flex justify-between">
                  <span>Monday &ndash; Friday</span>
                  <span className="font-semibold text-white">7:00 AM &ndash; 8:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="font-semibold text-white">8:00 AM &ndash; 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="font-semibold text-white">9:00 AM &ndash; 5:00 PM</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                Emergency pest control service is available outside regular hours.
                If you have an urgent exterminator need after hours, text{" "}
                <a href={`sms:${phonePlain}`} className="text-green-500 hover:text-green-400">us</a>{" "}
                and we will respond as quickly as possible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── WHAT HAPPENS WHEN YOU CONTACT US ───────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            What Happens When You Contact Us
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            From the moment you reach out to The NYC Exterminator, our process is
            designed to get a licensed pest control technician to your property as
            quickly as possible. Here is exactly what to expect when you text, call,
            email, or submit a form.
          </p>

          <div className="mt-12 space-y-12">
            <div className="flex gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">You Reach Out</h3>
                <p className="mt-2 text-zinc-300">
                  Whether you text us, send an email to{" "}
                  {EMAIL}, or complete the{" "}
                  <Link href="/quote-request" className="text-green-400 hover:text-green-300">
                    online quote form
                  </Link>, your message goes directly to our pest control dispatch team.
                  There are no bots, no automated responses, and no third-party
                  answering services. A real exterminator reads every message and
                  responds personally. During business hours, you can expect a response
                  within 15 to 30 minutes for texts, or within 2 hours for
                  emails and form submissions.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">We Ask About Your Pest and Property</h3>
                <p className="mt-2 text-zinc-300">
                  Our pest control team will ask a few targeted questions to understand
                  your situation. What type of pest have you seen? Where in the property
                  are they appearing? How long has the problem been going on? Is it a
                  residential apartment, a commercial kitchen, a multi-unit building?
                  These details help our exterminator prepare the right equipment and
                  treatment products before arriving at your location. If you can send
                  photos &mdash; even blurry ones &mdash; they are incredibly helpful
                  for species identification. A cockroach exterminator needs to know
                  whether it is German or American cockroaches. A{" "}
                  <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">
                    rat exterminator
                  </Link>{" "}
                  needs to know if there are droppings, gnaw marks, or actual sightings.
                  The more information you share, the more efficient the inspection.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">We Schedule Your Free Inspection</h3>
                <p className="mt-2 text-zinc-300">
                  Based on your availability and location, we will schedule a free
                  on-site pest control inspection at a time that works for you. Same-day
                  exterminator appointments are available for most of NYC, and we offer
                  morning, afternoon, and evening time slots Monday through Sunday.
                  There is absolutely no cost for the inspection and no obligation to
                  proceed with treatment. We believe every property owner deserves to
                  know exactly what they are dealing with before spending a dollar.
                  Pest control pricing starts at just $49, and we will provide your
                  exact quote after the inspection &mdash; before any work begins.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Our Exterminator Arrives</h3>
                <p className="mt-2 text-zinc-300">
                  A licensed, insured pest control technician arrives at your property
                  at the scheduled time. They will conduct a thorough inspection of
                  the affected areas and surrounding spaces, identify the pest species,
                  assess the severity of the infestation, and locate entry points. Then
                  they will sit down with you, explain exactly what they found, present
                  your treatment options with transparent pricing, and &mdash; if you
                  choose to proceed &mdash; begin treatment immediately. Many of our
                  NYC exterminator clients have their pest problem resolved in a single
                  visit. For more complex infestations like{" "}
                  <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">
                    bed bugs
                  </Link>{" "}
                  or{" "}
                  <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">
                    termites
                  </Link>, we will outline a multi-step treatment plan with follow-up
                  visits included in the quoted price.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── MID CTA ───────── */}
      <CTAGroup variant="mid" />

      {/* ───────── EMERGENCY PEST CONTROL CONTACT ───────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Emergency Pest Control Contact
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Some pest situations cannot wait until Monday morning. If you are dealing
            with an active infestation that poses a health or safety risk, The NYC
            Exterminator offers emergency pest control service with priority
            scheduling and rapid response times.
          </p>

          <div className="mt-10 rounded-xl border border-red-900/50 bg-red-950/20 p-8">
            <h3 className="text-xl font-semibold text-red-400">When to Request Emergency Service</h3>
            <ul className="mt-4 space-y-3 text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="mt-1 text-red-400">&#9679;</span>
                <span>
                  <strong className="text-white">Active rodent infestation</strong> &mdash; rats or mice
                  visible in living spaces, especially in homes with children or pets. Our{" "}
                  <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat exterminators</Link>{" "}
                  and{" "}
                  <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mouse exterminators</Link>{" "}
                  can respond same-day for emergencies.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-red-400">&#9679;</span>
                <span>
                  <strong className="text-white">Wasp or bee nest near an entrance</strong> &mdash; stinging
                  insects near doorways, windows, or outdoor seating areas create an immediate
                  danger. Our{" "}
                  <Link href="/wasp-removal" className="text-green-400 hover:text-green-300">wasp removal</Link>{" "}
                  team handles these situations urgently.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-red-400">&#9679;</span>
                <span>
                  <strong className="text-white">Bed bug discovery before travel or guests</strong> &mdash; if
                  you have found bed bugs and have guests arriving or need to travel,
                  our{" "}
                  <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug treatment</Link>{" "}
                  team can expedite inspection and heat treatment.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-red-400">&#9679;</span>
                <span>
                  <strong className="text-white">Health code violation deadline</strong> &mdash; restaurants
                  and commercial properties facing DOH deadlines need immediate pest
                  control intervention. We provide same-day exterminator service with
                  documentation for compliance.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-red-400">&#9679;</span>
                <span>
                  <strong className="text-white">Large-scale cockroach or ant outbreak</strong> &mdash; sudden
                  swarms of{" "}
                  <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroaches</Link>{" "}
                  or{" "}
                  <Link href="/ant-control" className="text-green-400 hover:text-green-300">ants</Link>{" "}
                  appearing throughout your property indicate a severe infestation that
                  requires immediate professional pest control treatment.
                </span>
              </li>
            </ul>
            <p className="mt-6 text-zinc-300">
              For emergency pest control, text{" "}
              <a href={`sms:${phonePlain}`} className="font-bold text-green-400 hover:text-green-300">
                us
              </a>{" "}
              with the word <strong className="text-white">&quot;URGENT&quot;</strong> and a brief
              description of the situation. Emergency texts are flagged for immediate
              attention. You can also book online &mdash; we prioritize emergency
              requests and will dispatch an exterminator to your location as quickly as
              possible, often within hours.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── FREQUENTLY ASKED CONTACT QUESTIONS ───────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Frequently Asked Contact Questions
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Before reaching out, here are answers to the questions our pest control
            clients ask most often about contacting The NYC Exterminator and
            scheduling service.
          </p>

          <div className="mt-12 space-y-8">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                How quickly will I hear back after texting or booking?
              </h3>
              <p className="mt-3 text-zinc-300">
                During business hours (Monday&ndash;Friday 7am&ndash;8pm, Saturday
                8am&ndash;6pm, Sunday 9am&ndash;5pm), we respond to text messages
                within 15 minutes. Emails and online form
                submissions receive a response within 2 hours. After hours, emergency
                texts are monitored and responded to as quickly as possible. We
                understand that when you are dealing with a pest problem, every minute
                feels long. That is why we have built our contact process to be the
                fastest in the NYC exterminator industry.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Can I schedule a pest control appointment for the same day?
              </h3>
              <p className="mt-3 text-zinc-300">
                Yes. Same-day exterminator service is available for most pest control
                situations across NYC, New Jersey, Long Island, and Westchester. If
                you contact us before noon, there is an excellent chance we can have
                a licensed pest control technician at your property that same
                afternoon. For after-noon requests, next-morning appointments are
                almost always available. Our{" "}
                <Link href="/pricing" className="text-green-400 hover:text-green-300">
                  pest control pricing
                </Link>{" "}
                starts at $49 with no extra charge for same-day scheduling.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                What information should I have ready when I contact an exterminator?
              </h3>
              <p className="mt-3 text-zinc-300">
                Having the following information ready will help us give you the
                most accurate response: the type of pest you have seen (or a
                description of what it looks like), your property type (apartment,
                house, restaurant, office), your address and neighborhood, when you
                first noticed the problem, how many rooms or areas are affected, and
                whether you have pets or young children in the home. Photos are
                extremely helpful &mdash; even blurry photos taken with your phone
                camera help our exterminators identify the species and prepare the
                right treatment.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Is the pest control inspection really free?
              </h3>
              <p className="mt-3 text-zinc-300">
                Absolutely. Every new client receives a completely free, no-obligation
                pest control inspection. Our licensed exterminator will visit your
                property, inspect all affected areas, identify the pest species,
                determine the extent of the infestation, and provide a detailed quote
                with transparent pricing. You are under zero pressure to proceed with
                treatment. We believe an informed client is the best client, and we
                want you to understand exactly what you are dealing with before making
                any decisions. If you do proceed, pest control pricing starts at just
                $49 depending on the service.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Do you offer pest control for commercial properties?
              </h3>
              <p className="mt-3 text-zinc-300">
                Yes. We provide exterminator services for restaurants, bars, cafes,
                retail stores, offices, warehouses, hotels, co-working spaces, and
                every other type of commercial property. Commercial pest control
                clients can contact us through any of our channels &mdash; text, call,
                email, or the{" "}
                <Link href="/quote-request" className="text-green-400 hover:text-green-300">
                  online form
                </Link>. We understand the unique urgency of commercial pest problems,
                especially for food service businesses facing NYC DOH regulations.
                Our exterminators provide documentation for health inspections and can
                work around your business hours.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Can I contact you about a pest I cannot identify?
              </h3>
              <p className="mt-3 text-zinc-300">
                Of course. Many of our clients are not sure what pest they are dealing
                with when they first reach out &mdash; and that is completely normal.
                Text us a photo and our pest control experts will identify
                the species, explain what it means for your property, and recommend
                the right course of action. Whether it turns out to be{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroaches</Link>,{" "}
                <Link href="/spider-control" className="text-green-400 hover:text-green-300">spiders</Link>,{" "}
                <Link href="/flea-treatment" className="text-green-400 hover:text-green-300">fleas</Link>,{" "}
                <Link href="/tick-control" className="text-green-400 hover:text-green-300">ticks</Link>,{" "}
                or something else entirely, our exterminators have seen it all across
                thousands of NYC properties.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                What if I need pest control for a multi-unit building?
              </h3>
              <p className="mt-3 text-zinc-300">
                Multi-unit buildings require a coordinated pest control approach, and
                we specialize in exactly that. Property managers and landlords should
                contact us by email at{" "}
                <a href={`mailto:${EMAIL}`} className="text-green-400 hover:text-green-300">{EMAIL}</a>{" "}
                or by texting us to discuss building-wide exterminator programs.
                We work with co-ops, condos, rental buildings, and housing authorities
                across all five boroughs. Building-wide pest control contracts include
                scheduled treatments, emergency service, and detailed reporting for
                your management records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── OUR SERVICE AREAS ───────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Our Pest Control Service Areas
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            The NYC Exterminator provides professional pest control and exterminator
            services across a wide geographic area covering New York City and the
            surrounding metro region. No matter where you are located, we have
            licensed technicians who know your neighborhood and can respond quickly.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "New Jersey", "Long Island", "Westchester"].map(
              (region) => (
                <div key={region} className="rounded-lg border border-zinc-700 bg-[#1A1A1A] p-4 text-center">
                  <span className="font-semibold text-green-400">{region}</span>
                </div>
              )
            )}
          </div>

          <p className="mt-8 text-zinc-300">
            We serve over {neighborhoods.length} neighborhoods and communities across
            these regions. Whether you need a{" "}
            <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">
              cockroach exterminator in Manhattan
            </Link>, a{" "}
            <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">
              bed bug treatment in Brooklyn
            </Link>, a{" "}
            <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">
              rat exterminator in Queens
            </Link>, or{" "}
            <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">
              termite treatment in Westchester
            </Link>{" "}
            &mdash; we have you covered with local pest control expertise and
            same-day service availability.
          </p>

          <div className="mt-8">
            <Link
              href="/areas"
              className="inline-flex items-center rounded-lg border border-green-600 px-6 py-3 text-sm font-semibold text-green-400 hover:bg-green-600/10"
            >
              View All Service Areas &rarr;
            </Link>
          </div>

          <div className="mt-10">
            <h3 className="text-xl font-semibold text-white">
              Popular Pest Control Services We Offer
            </h3>
            <p className="mt-3 text-zinc-400">
              Contact us about any of the following exterminator services &mdash;
              pricing starts at $49:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {services.slice(0, 12).map((service) => (
                <Link
                  key={service.slug}
                  href={`/${service.slug}`}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-green-500 hover:text-green-400"
                >
                  {service.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── WHY NYC TRUSTS US ───────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Why NYC Property Owners Trust <span className="text-green-500">The NYC Exterminator</span>
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Choosing the right pest control company is one of the most important decisions a property owner or tenant can make. The wrong exterminator wastes your time and money with ineffective treatments that allow infestations to grow worse. At The NYC Exterminator, we&apos;ve built our reputation on doing the job right the first time — with licensed technicians, EPA-approved products, transparent pricing starting at just $49, and a satisfaction guarantee that means we come back at no charge if pests return between treatments.
              </p>
              <p>
                Every exterminator on our team holds an active NYS DEC Commercial Pesticide Applicator license and undergoes continuous training in the latest pest control techniques, product innovations, and safety protocols. Our wildlife control specialists carry additional NYS DEC Nuisance Wildlife Control licenses for <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoon removal</Link>, <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">squirrel removal</Link>, <Link href="/pigeon-control" className="text-green-400 hover:text-green-300">pigeon control</Link>, and <Link href="/bat-removal" className="text-green-400 hover:text-green-300">bat removal</Link>. We maintain comprehensive general liability insurance on every job and provide documentation upon request for property managers, co-op boards, and commercial tenants.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Our pest control services cover the full spectrum of urban and suburban pest challenges — from <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link> in Manhattan high-rises to <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite treatment</Link> for Long Island homes to <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control</Link> for NYC&apos;s thousands of food service establishments. Whether you&apos;re dealing with a minor ant problem or a major rat infestation, our exterminators bring the expertise and equipment to resolve it completely.
              </p>
              <p>
                We&apos;re proud to maintain a 4.9-star rating across thousands of completed pest control jobs. Read our <Link href="/reviews" className="text-green-400 hover:text-green-300">customer reviews</Link> to see what real NYC homeowners, tenants, and business operators say about working with us. Check our <Link href="/pricing" className="text-green-400 hover:text-green-300">transparent pricing page</Link> to see what every service costs. And when you&apos;re ready, <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">text us</a> — it&apos;s the fastest way to get a response. We typically reply within minutes during business hours. Your pest problem ends here.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <CTAGroup variant="final" />
    </div>
  );
}
