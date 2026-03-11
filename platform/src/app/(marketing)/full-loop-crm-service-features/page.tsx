import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, webPageSchema, breadcrumbSchema, serviceSchema, localBusinessSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title:
    "Home Service CRM Features | AI-Powered Field Service Platform — Full Loop CRM",
  description:
    "Explore every feature of Full Loop CRM — the all-in-one home service CRM with AI lead generation, automated sales, smart scheduling, GPS field operations, invoicing, review management, and client retargeting. Replace 9+ tools with one platform.",
  keywords: [
    "home service CRM features",
    "field service CRM",
    "automated CRM platform",
    "AI-powered CRM",
    "service business software",
    "home service scheduling software",
    "GPS field operations CRM",
    "AI sales chatbot CRM",
    "review management CRM",
    "client retargeting software",
  ],
  openGraph: {
    title:
      "Home Service CRM Features | AI-Powered Field Service Platform — Full Loop CRM",
    description:
      "Explore every feature of Full Loop CRM — the all-in-one home service CRM with AI lead generation, automated sales, smart scheduling, GPS field operations, invoicing, review management, and client retargeting.",
    url: "https://www.fullloopcrm.com/full-loop-crm-service-features",
    type: "website",
  },
  alternates: {
    canonical: "https://www.fullloopcrm.com/full-loop-crm-service-features",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Home Service CRM Features | AI-Powered Field Service Platform — Full Loop CRM",
    description:
      "Explore every feature of Full Loop CRM — AI lead generation, automated sales, smart scheduling, GPS field operations, invoicing, review management, and client retargeting.",
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://www.fullloopcrm.com" },
  { name: "Features", url: "https://www.fullloopcrm.com/full-loop-crm-service-features" },
];

const dashboardPages = [
  {
    name: "Executive Dashboard",
    desc: "Revenue, bookings, lead conversion, and team performance at a glance.",
  },
  {
    name: "Client Management",
    desc: "Full client profiles with service history, notes, preferences, and LTV tracking.",
  },
  {
    name: "Bookings & Calendar",
    desc: "Drag-and-drop scheduling with real-time availability and conflict detection.",
  },
  {
    name: "Team Management",
    desc: "Assign crews, track hours, manage pay rates, and monitor GPS check-ins.",
  },
  {
    name: "Lead Tracking",
    desc: "Pipeline view from first touch to closed deal with source attribution.",
  },
  {
    name: "Finance & P&L",
    desc: "Revenue, expenses, payroll, and profit/loss — updated in real time.",
  },
  {
    name: "Notification Center",
    desc: "Centralized alerts for new leads, bookings, payments, and team activity.",
  },
  {
    name: "AI Dashboard",
    desc: "Monitor Selenas AI performance — response times, conversion rates, and conversation logs.",
  },
  {
    name: "Referral Program",
    desc: "Track referral sources, commissions earned, and payout status.",
  },
  {
    name: "Settings",
    desc: "Business hours, service areas, pricing rules, team permissions, and integrations.",
  },
  {
    name: "Documentation",
    desc: "Built-in guides, video walkthroughs, and API documentation for your team.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Schema Markup */}
      <JsonLd
        data={webPageSchema(
          "Home Service CRM Features | Full Loop CRM",
          "Explore every feature of Full Loop CRM — the all-in-one home service CRM with AI lead generation, automated sales, smart scheduling, GPS field operations, invoicing, review management, and client retargeting.",
          "https://www.fullloopcrm.com/full-loop-crm-service-features",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={serviceSchema(
          "Full Loop CRM Platform",
          "features",
          "All-in-one home service CRM with AI lead generation, automated sales, smart scheduling, GPS field operations, invoicing, review management, and client retargeting."
        )}
      />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* ── Hero ── */}
      <section className="bg-slate-900 py-24 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-mono text-sm uppercase tracking-widest text-teal-400 mb-4">
            Full Loop CRM Features
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Every Feature a Home Service Business Needs
            <span className="text-teal-400"> — In One Platform</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            Most home service businesses juggle 9+ disconnected tools — a website builder, a CRM, a scheduler, a payment
            processor, a review tool, and more. Full Loop CRM replaces all of them with a single, AI-powered platform
            built from the ground up for field service companies.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/crm-partnership-request-form"
              className="font-cta inline-block rounded-lg bg-teal-400 px-8 py-4 text-lg font-bold text-slate-900 hover:bg-teal-300 transition-colors"
            >
              Request Your Partnership
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200 font-cta text-lg"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stage 1: Lead Generation ── */}
      <section className="bg-white py-20 px-6 sm:px-8 lg:px-12" id="lead-generation">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4">
            <span className="font-mono text-sm uppercase tracking-widest text-teal-600">
              Stage 1 of 7
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">
            Lead Generation
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-3xl">
            Most CRMs start after you already have a lead. Full Loop starts by <em>creating</em> them.
            We build and manage a multi-domain SEO network that generates organic leads 24/7 — no ad
            spend required.
          </p>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Multi-Domain SEO Network
              </h3>
              <p className="text-slate-600">
                We don&apos;t rely on a single website. Full Loop builds and manages multiple
                SEO-optimized domains targeting your service areas and specialties — casting a wider
                net than any single-site strategy. Each domain is purpose-built to rank for
                high-intent local searches.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Domain Performance Analytics
              </h3>
              <p className="text-slate-600">
                Track every domain in your network from a single dashboard. See which domains are
                generating the most traffic, which keywords are ranking, and where your next
                opportunity lies. No more logging into separate analytics accounts.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Traffic Source Intelligence
              </h3>
              <p className="text-slate-600">
                Know exactly where every visitor comes from — organic search, direct, referral, or
                social. Full Loop&apos;s traffic intelligence shows you which channels are worth
                doubling down on and which ones are wasting your time.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Smart Lead Attribution
              </h3>
              <p className="text-slate-600">
                Every lead is tagged with its source domain, landing page, and search query so you
                know exactly what brought them in. Connect the dots from first click to closed deal
                — no guesswork, no wasted budget.
              </p>
            </div>
          </div>

          <p className="mt-8 text-slate-600">
            Want to understand why organic lead generation outperforms paid ads for service
            businesses?{" "}
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              Learn why we built Full Loop differently
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Stage 2: AI Sales & Conversion ── */}
      <section className="bg-slate-50 py-20 px-6 sm:px-8 lg:px-12" id="ai-sales">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4">
            <span className="font-mono text-sm uppercase tracking-widest text-teal-600">
              Stage 2 of 7
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">
            AI Sales & Conversion
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-3xl">
            Meet <strong>Selenas</strong> — your AI-powered SMS sales agent that responds to leads in
            seconds, not hours. Selenas qualifies prospects, answers questions, and books appointments
            while you focus on running your business.
          </p>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Selenas AI SMS Chatbot
              </h3>
              <p className="text-slate-600">
                Selenas is not a generic chatbot — she&apos;s trained on your specific services,
                pricing, availability, and service areas. She responds to inbound leads via SMS
                within seconds, keeping your response time under 60 seconds — the window where
                conversion rates are highest.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                24/7 Bilingual Coverage
              </h3>
              <p className="text-slate-600">
                Selenas operates around the clock in both English and Spanish. Leads that come in at
                11 PM on a Sunday get the same fast, professional response as those arriving at
                10 AM on a Tuesday. No missed opportunities, no language barriers.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Lead Qualification
              </h3>
              <p className="text-slate-600">
                Before booking, Selenas asks the right questions — service type, property size,
                preferred dates, and budget range. She filters out tire-kickers and sends you only
                qualified leads that are ready to book, saving you hours of back-and-forth.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                12+ Automated Responses
              </h3>
              <p className="text-slate-600">
                Selenas handles the most common questions your leads ask — pricing, availability,
                service areas, cancellation policies, payment methods, and more. She&apos;s trained
                on 12+ question categories so she can hold a natural conversation without human
                intervention.
              </p>
            </div>
          </div>

          <p className="mt-8 text-slate-600">
            New to CRM automation?{" "}
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              Read our CRM 101 guide
            </Link>{" "}
            to understand how AI sales agents transform service businesses.
          </p>
        </div>
      </section>

      {/* ── Stage 3: Scheduling & Dispatch ── */}
      <section className="bg-white py-20 px-6 sm:px-8 lg:px-12" id="scheduling">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4">
            <span className="font-mono text-sm uppercase tracking-widest text-teal-600">
              Stage 3 of 7
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">
            Scheduling & Dispatch
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-3xl">
            Stop managing your calendar in spreadsheets and text messages. Full Loop&apos;s scheduling
            engine handles recurring appointments, team availability, and client self-booking — all in
            one place.
          </p>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Smart Scheduling
              </h3>
              <p className="text-slate-600">
                Real-time availability checks prevent double-bookings. The system accounts for
                travel time between jobs, crew assignments, and service duration to build the most
                efficient schedule possible. Drag-and-drop rescheduling when plans change.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                7 Recurring Patterns
              </h3>
              <p className="text-slate-600">
                Support for weekly, biweekly, every 3 weeks, monthly, every 6 weeks, every 2
                months, and quarterly recurring appointments. Set it once and the system generates
                future bookings automatically — no manual re-entry.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Client Booking Portal
              </h3>
              <p className="text-slate-600">
                Give clients a branded portal where they can view upcoming appointments, request
                changes, and book new services. Reduces phone calls and gives clients the
                self-service experience they expect.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Automated Confirmations
              </h3>
              <p className="text-slate-600">
                Appointment confirmations and reminders go out automatically via SMS. Reduce
                no-shows with 24-hour and same-day reminders. Clients can confirm or request
                rescheduling with a simple text reply.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stage 4: GPS Field Operations ── */}
      <section className="bg-slate-50 py-20 px-6 sm:px-8 lg:px-12" id="field-operations">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4">
            <span className="font-mono text-sm uppercase tracking-widest text-teal-600">
              Stage 4 of 7
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">
            GPS Field Operations
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-3xl">
            Know exactly when your team arrives and leaves every job site. Full Loop&apos;s GPS-verified
            check-in system eliminates time theft, automates payroll calculations, and gives your
            clients proof of service.
          </p>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                GPS-Verified Check-In/Out
              </h3>
              <p className="text-slate-600">
                Team members check in and out of job sites using their phones. GPS coordinates are
                recorded and verified against the client&apos;s address. No more relying on the
                honor system — you have a verifiable record of every visit.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                528ft Distance Validation
              </h3>
              <p className="text-slate-600">
                Check-ins are only accepted when the team member is within 528 feet (one-tenth of a
                mile) of the job site. This prevents remote check-ins and ensures your team is
                actually on location before the clock starts.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Bilingual Team Portal (EN/ES)
              </h3>
              <p className="text-slate-600">
                Your field team accesses their daily schedule, job details, and check-in system
                through a mobile-optimized portal available in both English and Spanish. No app
                download required — it works in any mobile browser.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                PIN-Based Login & Auto Pay Calculation
              </h3>
              <p className="text-slate-600">
                Each team member gets a unique PIN for secure, fast login — no passwords to forget.
                Hours are calculated automatically from check-in/out times and multiplied by their
                pay rate. Payroll is ready before you even ask.
              </p>
            </div>
          </div>

          <p className="mt-8 text-slate-600">
            See how GPS field operations work across{" "}
            <Link
              href="/full-loop-crm-service-business-industries"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              50+ home service industries
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Stage 5: Payments & Invoicing ── */}
      <section className="bg-white py-20 px-6 sm:px-8 lg:px-12" id="payments">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4">
            <span className="font-mono text-sm uppercase tracking-widest text-teal-600">
              Stage 5 of 7
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">
            Payments & Invoicing
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-3xl">
            Get paid faster with flexible payment tracking and automatic invoicing. Full Loop supports
            every payment method your clients actually use — not just credit cards.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Every Payment Method
              </h3>
              <p className="text-slate-600">
                Track payments via Zelle, Apple Pay, Venmo, cash, check, and credit card. In the
                real world, home service clients pay however is convenient — Full Loop tracks them
                all in one place.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Auto-Generated Invoices
              </h3>
              <p className="text-slate-600">
                Invoices are generated automatically after each service with the correct amount,
                payment method, and service details. Send them to clients via SMS or email with one
                click.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                1-Click Payroll
              </h3>
              <p className="text-slate-600">
                Review calculated pay for each team member — based on GPS-verified hours and their
                pay rate — and mark them as paid with a single click. No spreadsheets, no manual
                calculations.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                1099 Reports
              </h3>
              <p className="text-slate-600">
                At tax time, generate 1099 contractor reports with all payment history already
                tracked. Full Loop keeps a running total of contractor payments so you&apos;re
                always audit-ready.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6 sm:col-span-2 lg:col-span-2">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Real-Time Financial Dashboard
              </h3>
              <p className="text-slate-600">
                See revenue, outstanding invoices, payroll costs, and profit/loss in real time. Full
                Loop&apos;s finance dashboard gives you the financial clarity most service business
                owners never had — without hiring a bookkeeper. Compare with{" "}
                <Link
                  href="/full-loop-crm-pricing"
                  className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
                >
                  our pricing plans
                </Link>{" "}
                to see how much you save by consolidating tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stage 6: Review & Reputation ── */}
      <section className="bg-slate-50 py-20 px-6 sm:px-8 lg:px-12" id="reviews">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4">
            <span className="font-mono text-sm uppercase tracking-widest text-teal-600">
              Stage 6 of 7
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">
            Review & Reputation Management
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-3xl">
            Your reputation is your most valuable asset. Full Loop automates the entire post-service
            follow-up process — collecting reviews, catching negative sentiment before it goes public,
            and turning happy clients into repeat customers.
          </p>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Automated Post-Service Follow-Up
              </h3>
              <p className="text-slate-600">
                After every service, clients automatically receive a follow-up SMS asking about
                their experience. Happy clients are directed to leave a review. The timing is
                optimized — sent while the experience is still fresh.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                10% Rebooking Discount
              </h3>
              <p className="text-slate-600">
                Every follow-up includes a 10% discount offer for rebooking. This single feature
                dramatically increases recurring client rates — turning one-time jobs into ongoing
                revenue streams.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Negative Sentiment Detection
              </h3>
              <p className="text-slate-600">
                Full Loop&apos;s AI analyzes client responses for negative sentiment before they
                become public reviews. If a client expresses dissatisfaction, the system flags the
                conversation immediately so you can intervene.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                AI Escalation to Phone
              </h3>
              <p className="text-slate-600">
                When Selenas detects frustration or a complex issue, she escalates the conversation
                from SMS to a phone call recommendation — connecting the client with a human before
                a negative review is posted. Prevention over damage control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stage 7: Retargeting & Rebooking ── */}
      <section className="bg-white py-20 px-6 sm:px-8 lg:px-12" id="retargeting">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4">
            <span className="font-mono text-sm uppercase tracking-widest text-teal-600">
              Stage 7 of 7
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">
            Retargeting & Rebooking
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-3xl">
            The most profitable client is one you&apos;ve already served. Full Loop closes the loop by
            identifying at-risk clients, running automated win-back campaigns, and tracking referral
            commissions — so no client ever slips through the cracks.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Client Lifecycle Analytics
              </h3>
              <p className="text-slate-600">
                Track lifetime value (LTV), churn risk, and booking frequency for every client.
                Full Loop scores clients as active, at-risk, or churned — so you know exactly where
                to focus your retention efforts.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Win-Back Campaigns
              </h3>
              <p className="text-slate-600">
                Automated SMS and email campaigns target clients who haven&apos;t booked in a set
                period. Personalized messages with special offers bring lapsed clients back — without
                you lifting a finger.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                Referral Program
              </h3>
              <p className="text-slate-600">
                Built-in referral tracking with commission management. When a client refers a
                friend, Full Loop tracks the referral source, credits the commission, and manages
                payouts — turning your best clients into your best salespeople.
              </p>
            </div>
          </div>

          <p className="mt-8 text-slate-600">
            This is what makes it a <em>full loop</em>.{" "}
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              Learn why the loop matters
            </Link>{" "}
            and how it compounds your growth over time.
          </p>
        </div>
      </section>

      {/* ── Command Center ── */}
      <section className="bg-slate-900 py-20 px-6 sm:px-8 lg:px-12" id="command-center">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="font-mono text-sm uppercase tracking-widest text-teal-400 mb-4">
              Your Command Center
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mb-6">
              11 Dashboard Pages. Zero Tab Switching.
            </h2>
            <p className="text-lg text-slate-300 max-w-3xl mx-auto">
              Every aspect of your business lives in one platform. No more logging into 5 different
              apps to understand what&apos;s happening. Full Loop&apos;s command center gives you
              complete visibility from a single login.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dashboardPages.map((page) => (
              <div
                key={page.name}
                className="rounded-xl border border-slate-700 bg-slate-800 p-6"
              >
                <h3 className="font-heading text-lg font-bold text-white mb-2">
                  {page.name}
                </h3>
                <p className="text-sm text-slate-400">{page.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Replace ── */}
      <section className="bg-slate-50 py-20 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6 text-center">
            One Platform. Nine Tools Replaced.
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-3xl mx-auto text-center">
            Full Loop CRM eliminates the need for separate subscriptions, integrations, and logins.
            Here is what you stop paying for:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="font-heading py-3 pr-4 text-slate-900 font-bold">Tool Category</th>
                  <th className="font-heading py-3 pr-4 text-slate-900 font-bold">Examples</th>
                  <th className="font-heading py-3 text-slate-900 font-bold">Full Loop Replacement</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-medium">Website/SEO</td>
                  <td className="py-3 pr-4">Wix, Squarespace, WordPress</td>
                  <td className="py-3">Multi-domain SEO network</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-medium">CRM</td>
                  <td className="py-3 pr-4">HubSpot, Salesforce, Jobber</td>
                  <td className="py-3">Built-in client management</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-medium">AI Chatbot</td>
                  <td className="py-3 pr-4">Intercom, Drift, ManyChat</td>
                  <td className="py-3">Selenas AI SMS agent</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-medium">Scheduling</td>
                  <td className="py-3 pr-4">Calendly, Acuity, ServiceTitan</td>
                  <td className="py-3">Smart scheduling engine</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-medium">GPS/Time Tracking</td>
                  <td className="py-3 pr-4">TSheets, Clockify, Homebase</td>
                  <td className="py-3">GPS-verified check-in/out</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-medium">Invoicing</td>
                  <td className="py-3 pr-4">QuickBooks, FreshBooks, Wave</td>
                  <td className="py-3">Auto-generated invoices</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-medium">Review Management</td>
                  <td className="py-3 pr-4">Podium, Birdeye, NiceJob</td>
                  <td className="py-3">Automated review collection</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-medium">Email/SMS Marketing</td>
                  <td className="py-3 pr-4">Mailchimp, Twilio, SimpleTexting</td>
                  <td className="py-3">Win-back campaigns</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-medium">Referral Tracking</td>
                  <td className="py-3 pr-4">ReferralCandy, spreadsheets</td>
                  <td className="py-3">Built-in referral program</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-8 text-center text-slate-600">
            See the full cost comparison on our{" "}
            <Link
              href="/full-loop-crm-pricing"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              pricing page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-slate-900 py-24 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mb-6">
            Ready to Run Your Business on One Platform?
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
            Full Loop CRM is not sold off the shelf — we partner with home service businesses and
            build your system from the ground up. Limited partnerships available.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/crm-partnership-request-form"
              className="font-cta inline-block rounded-lg bg-teal-400 px-8 py-4 text-lg font-bold text-slate-900 hover:bg-teal-300 transition-colors"
            >
              Request Your Partnership
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200 font-cta text-lg"
            >
              View Pricing
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-slate-400">
            <a
              href="tel:+12122029220"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              Call (212) 202-9220
            </a>
            <span className="hidden sm:inline text-slate-600">|</span>
            <a
              href="sms:+12122029220"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              Text (212) 202-9220
            </a>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Learn more about{" "}
            <Link
              href="/about-full-loop-crm"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              who we are
            </Link>
            ,{" "}
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              why we built Full Loop
            </Link>
            , or explore our{" "}
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              CRM 101 guide
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
