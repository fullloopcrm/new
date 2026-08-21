import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/nyc-commercial-exterminator/_components/Breadcrumbs";
import ContactForm from "@/app/site/nyc-commercial-exterminator/_components/ContactForm";
import { PHONE, SITE_URL, SITE_NAME, getFAQPageSchema } from "@/app/site/nyc-commercial-exterminator/_lib/seo";

export const metadata: Metadata = {
  title: "Schedule Service | $249/hr Fully Inclusive | The Only NYC Pest Control That Bills Hourly",
  description:
    "Schedule a licensed NYC exterminator. $249/hr (fully inclusive — save money). The only NYC pest control service that bills fully inclusive hourly. Labor, products, treatment, follow-up — all in the rate. Pay only when the job is done. No contracts. No deposits. No catches. Call or text 212-202-8545.",
  keywords:
    "schedule NYC exterminator, hourly exterminator NYC, pay-on-completion pest control, no contract exterminator, $249 per hour exterminator, fully inclusive pest control pricing, NYC pest control booking, same-day exterminator",
  openGraph: {
    title: "Schedule Service | $249/hr Fully Inclusive | The Only NYC Pest Control That Bills Hourly",
    description:
      "$249/hr (fully inclusive — save money). The only NYC pest control service that bills fully inclusive hourly. Pay on completion. Schedule in under 2 minutes.",
    url: `${SITE_URL}/schedule-service`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: `${SITE_URL}/schedule-service`,
  },
};

const faqs = [
  {
    q: "What does the $249/hour rate actually include?",
    a: "Everything. Labor, EPA-registered products, all treatment methods, equipment, sealing materials for entry points, written treatment plan, and the free re-treatment visit if pests return. There are no per-room fees, no product upcharges, no trip fees, no inspection fees, no contract minimums. The hour you pay for is the only hour you pay for.",
  },
  {
    q: "Why is hourly better than a flat-rate quote?",
    a: "Flat-rate quotes are priced for the worst-case version of your problem the exterminator has never seen. If your job is actually simpler, you still pay the inflated number. Hourly bills you for what your specific problem actually takes — a small ant trail might be 30 minutes ($125), a serious roach job might be 90 minutes ($375). You pay for time, not for the company's guess at a worst case. We're the only fully inclusive hourly exterminator pricing platform in NYC built around this.",
  },
  {
    q: "Do I pay anything upfront?",
    a: "No. You pay nothing upfront and nothing during the inspection. We bill on completion — after the technician has finished the job and you can see the work was done. If you're not satisfied, you don't pay. No deposits, no holds, no card-on-file required to book.",
  },
  {
    q: "Are there any contracts or recurring charges?",
    a: "No contracts. No recurring charges. No monthly minimums. No auto-renewals. You book a single visit, we solve the problem, you pay for that hour (or fraction of an hour), and we're done. If pests come back inside the guarantee window, we return at no charge. If you want a follow-up later, you book another single visit at the same $249/hour rate.",
  },
  {
    q: "What are the catches?",
    a: "There are no catches. We were tired of NYC pest control being a 'call for a quote' black box where the price is whatever the company thinks you'll pay. $249/hour, billed in 15-minute increments after the first hour, fully inclusive, pay on completion. That's the entire pricing model. No hidden fees, no chemical surcharges, no weekend rates, no upsells.",
  },
  {
    q: "How quickly will I hear back after scheduling?",
    a: "We respond to every booking request within 10 to 30 minutes during business hours (Monday-Friday 7 AM-8 PM, Saturday 8 AM-6 PM, Sunday 9 AM-5 PM). If you submit your request after hours, you'll hear from a licensed pest control technician first thing the next morning. For emergencies, call or text 212-202-8545 for the fastest response.",
  },
  {
    q: "How soon can a technician come to my property?",
    a: "Usually next business day. Same-day service is available for active emergencies — bed bug discoveries, rat sightings, wasps near doorways. We serve all five NYC boroughs, northern New Jersey, Long Island, and Westchester County. Every appointment has a tight 1-hour arrival window — no 'between 8 AM and 5 PM' nonsense.",
  },
  {
    q: "What pest services can I book at the $249/hr rate?",
    a: "Every service we offer is billed at the same $249/hour rate — cockroaches, bed bugs, rats, mice, ants, termites, wasps, fleas, wildlife removal, commercial accounts, all of it. The pest type doesn't change the price. The only thing that affects what you pay is how long the job actually takes.",
  },
];

export default function ScheduleServicePage() {
  // Breadcrumb schema is injected once, by the <Breadcrumbs> component below.
  // PestControlService schema is injected once, globally, by layout.tsx.
  const faqSchema = getFAQPageSchema(faqs);

  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── HERO + FORM ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Schedule Service", url: "/schedule-service" }]} />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              NYC&apos;s Only Fully Inclusive Hourly Exterminator
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                $249/hour
              </span>{" "}
              flat. Pay only when the job is done.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-300">
              Fully inclusive &mdash; labor, products, treatment, follow-up. No contracts.
              No catches. No money upfront. The only pest control company in NYC that bills you
              for the <span className="font-semibold text-white">actual time your problem takes</span>{" "}
              instead of a bloated flat-rate quote built for the worst case.
            </p>
          </div>

          {/* ── Why Hourly Wins ── */}
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-green-700/40 bg-green-950/30 p-5">
              <p className="text-sm font-bold text-green-400">Pay for time, not for fear</p>
              <p className="mt-2 text-sm text-zinc-300">
                Flat-rate quotes are priced for a worst-case version of your problem the exterminator
                has never seen. Hourly bills you for what your job actually takes &mdash; a quick ant
                trail might be 30 minutes ($125). You don&apos;t subsidize the company&apos;s worst-day math.
              </p>
            </div>
            <div className="rounded-xl border border-green-700/40 bg-green-950/30 p-5">
              <p className="text-sm font-bold text-green-400">Pay on completion</p>
              <p className="mt-2 text-sm text-zinc-300">
                Nothing upfront. No deposits. No card-on-file to book. We finish the work, you see
                the result, and only then do we send the invoice. If you&apos;re not satisfied,
                you don&apos;t pay.
              </p>
            </div>
            <div className="rounded-xl border border-green-700/40 bg-green-950/30 p-5">
              <p className="text-sm font-bold text-green-400">No contracts. Ever.</p>
              <p className="mt-2 text-sm text-zinc-300">
                No monthly minimums, no auto-renewals, no recurring charges, no &ldquo;maintenance
                plan&rdquo; you have to cancel. Book one visit. We solve the problem. You&apos;re done.
              </p>
            </div>
            <div className="rounded-xl border border-green-700/40 bg-green-950/30 p-5">
              <p className="text-sm font-bold text-green-400">Fully inclusive &mdash; no add-ons</p>
              <p className="mt-2 text-sm text-zinc-300">
                $249/hour covers all products, equipment, treatment methods, entry-point sealing,
                written plan, and the free re-treatment visit if pests come back. No chemical
                surcharges. No trip fees. No per-room fees. No weekend rates.
              </p>
            </div>
          </div>

          {/* ── 3-Step Visual ── */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
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
          <div className="mt-10 overflow-hidden rounded-xl border border-green-700/40 bg-[#141414] shadow-lg shadow-green-900/10">
            <div className="border-b border-green-700/30 bg-gradient-to-r from-green-900/50 via-green-800/30 to-emerald-900/40 px-6 py-4 sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-green-300">
                    Online-Only Discount
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-white sm:text-xl">
                    Save <span className="text-green-300">$25</span> when you self-book below.
                  </p>
                </div>
                <div className="hidden shrink-0 rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-green-300 sm:block">
                  Fastest Path
                </div>
              </div>
              <p className="mt-2 text-xs text-green-100/80">
                Self-booking is the fastest path for same-day &amp; emergency service &mdash; auto-routed to dispatch the moment you hit submit.
              </p>
            </div>
            <div className="p-6 sm:p-8">
              <h2 className="mb-2 text-2xl font-bold">
                Schedule Your <span className="text-green-400">$249/hr Service</span>
              </h2>
              <p className="mb-6 text-sm text-zinc-400">
                Tell us about your pest problem. We&apos;ll match you with a certified NYC technician,
                confirm the visit, and bill you on completion. No contracts. No upfront payment.
                <span className="font-semibold text-green-300"> $25 self-book discount applied automatically.</span>
              </p>
              <ContactForm dark />
            </div>
          </div>

          {/* ── Call CTA ── */}
          <div className="mt-8 text-center">
            <p className="text-zinc-500">Need to talk to a human right now?</p>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="mt-1 inline-block text-2xl font-bold text-green-500 hover:text-green-400"
            >
              {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ── HOURLY VS FLAT-RATE COMPARISON ── */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Hourly vs. <span className="text-green-400">Everyone Else</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
            Here&apos;s exactly why every other NYC pest control company charges flat-rate &mdash;
            and exactly why that&apos;s worse for you.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-red-400">
                Flat-rate quote (everyone else)
              </p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                <li>&times; Priced for the worst-case version of your problem</li>
                <li>&times; You pay the inflated number even if your job is simple</li>
                <li>&times; &ldquo;Per-room&rdquo; pricing inflates with every extra space</li>
                <li>&times; Product upcharges, chemical fees, trip fees show up later</li>
                <li>&times; Deposit or full payment due before the tech leaves</li>
                <li>&times; &ldquo;Maintenance contract&rdquo; pressure to lock you in</li>
                <li>&times; Set pricing on a problem nobody&apos;s even seen yet</li>
              </ul>
            </div>

            <div className="rounded-xl border border-green-700/40 bg-green-950/30 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-green-400">
                $249/hr fully inclusive (us)
              </p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                <li>&#10003; Pay for the exact minutes your job actually takes</li>
                <li>&#10003; Simple problem = small bill. No worst-case math</li>
                <li>&#10003; No per-room fees, no square-foot fees, no add-ons</li>
                <li>&#10003; Products, equipment, sealing, follow-up all included</li>
                <li>&#10003; Pay on completion. Nothing upfront. Card not on file</li>
                <li>&#10003; No contracts. No auto-renewals. No monthly minimums</li>
                <li>&#10003; Free re-treatment if pests return inside the guarantee</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-zinc-700 bg-zinc-900/60 p-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
              The honest math
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-300">
              Most one-bedroom roach jobs take <span className="font-bold text-white">45 to 60 minutes</span>{" "}
              &mdash; that&apos;s <span className="font-bold text-white">$187 to $249</span> all-in, products and follow-up included.
              Mouse exclusion on a small office is typically <span className="font-bold text-white">60 to 90 minutes</span>{" "}
              &mdash; <span className="font-bold text-white">$249 to $374</span>. The same jobs flat-rate elsewhere
              in NYC quote at $400 to $800+, then add chemical and trip fees on top. Hourly with no add-ons
              is almost always less &mdash; and you only ever pay for time spent solving <em>your</em> problem.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHAT HAPPENS AFTER YOU SCHEDULE ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            What Happens After You{" "}
            <span className="text-green-400">Schedule</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
            Start to finish, here&apos;s exactly how the visit goes &mdash; and exactly when (and how)
            you pay.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                1
              </div>
              <div>
                <p className="font-semibold text-white">We respond within 10&ndash;30 minutes</p>
                <p className="mt-1 text-sm text-zinc-400">
                  A real person from our scheduling team calls or texts to confirm details and lock
                  in your preferred appointment time. No voicemail runaround, no AI chatbot loop.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                2
              </div>
              <div>
                <p className="font-semibold text-white">Next-day scheduling. Tight 1-hour arrival window.</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Usually next business day. Same-day for emergencies. You get a 1-hour arrival
                  window and a text when the technician is on the way. No &ldquo;between 8 AM and 5 PM.&rdquo;
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                3
              </div>
              <div>
                <p className="font-semibold text-white">Free on-site inspection. No clock running yet.</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Your licensed exterminator inspects the property, identifies the pest, locates
                  entry points and nesting areas, and walks you through the plan. The hourly clock
                  doesn&apos;t start until you approve the work.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                4
              </div>
              <div>
                <p className="font-semibold text-white">Treatment at $249/hr &mdash; everything included</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Billed in 15-minute increments after the first hour. Products, equipment,
                  entry-point sealing, and written treatment plan are all included in the rate.
                  No add-ons, no surprises, no second-stop fees.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400">
                5
              </div>
              <div>
                <p className="font-semibold text-white">Pay on completion. No contracts. Guaranteed.</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Invoice goes out when the work is done. Pay by card, ACH, Zelle &mdash; whatever&apos;s
                  easiest. If pests come back inside the guarantee window, we return free of charge.
                  No contract to sign, no monthly minimum, nothing to cancel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIPS FOR FILLING OUT THE FORM ── */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Tips to <span className="text-green-400">Speed Up</span> Your Booking
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
            The more details you give us upfront, the faster we can dispatch the right technician
            with the right equipment &mdash; and the shorter your hourly clock runs.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="font-semibold text-green-400">Describe the pest you&apos;re seeing</p>
              <p className="mt-1 text-sm text-zinc-400">
                &ldquo;Small brown roaches in the kitchen at night&rdquo; tells us far more than
                &ldquo;bugs.&rdquo; Include size, color, location, and time of day. Not sure what
                it is? Describe what you see &mdash; the tech identifies it on-site during the
                free inspection.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="font-semibold text-green-400">Include your neighborhood or address</p>
              <p className="mt-1 text-sm text-zinc-400">
                Lets us dispatch the closest available technician. We serve 280+ neighborhoods
                across NYC, NJ, Long Island, and Westchester &mdash; the closer the match, the
                sooner they arrive.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="font-semibold text-green-400">Flag any urgency</p>
              <p className="mt-1 text-sm text-zinc-400">
                Active bed bugs, rats inside living spaces, wasps near doorways &mdash; tell us
                if it&apos;s an emergency so we can fast-track for same-day dispatch.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="font-semibold text-green-400">Text us photos after submitting</p>
              <p className="mt-1 text-sm text-zinc-400">
                Photos of the pest, droppings, damage, or nesting areas help the tech prep the
                right gear before arrival. Text to{" "}
                <a href={`sms:${PHONE.replace(/-/g, "")}`} className="text-green-400 hover:text-green-300">
                  {PHONE}
                </a>{" "}
                after submitting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Hourly Pricing{" "}
            <span className="text-green-400">Questions Answered</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
            Everything about how the $249/hr model works &mdash; what&apos;s included, when you pay,
            why it&apos;s usually less than flat-rate quotes, and what the catches are
            (spoiler: none).
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
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to Schedule Your{" "}
            <span className="text-green-400">$249/hr Service</span>?
          </h2>
          <p className="mt-3 text-zinc-400">
            Scroll up to book in under 2 minutes &mdash; or call/text us right now. Same hourly rate,
            same fully inclusive pricing, same pay-on-completion. No contracts, no catches.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="#top"
              className="inline-flex items-center rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/25 hover:bg-green-500"
            >
              Self-Book &mdash; Save $25 &uarr;
            </a>
            <a
              href={`sms:${PHONE.replace(/-/g, "")}`}
              className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
            >
              Text {PHONE}
            </a>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="inline-flex items-center rounded-lg px-6 py-3 text-sm font-semibold text-green-400 hover:text-green-300"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
