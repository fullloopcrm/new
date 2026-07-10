import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-exterminator/_components/Breadcrumbs";
import ContactForm from "@/app/site/the-nyc-exterminator/_components/ContactForm";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";
import { PHONE, SITE_URL, getBreadcrumbSchema } from "@/app/site/the-nyc-exterminator/_lib/seo";
import { getAllServices, getAllNeighborhoods } from "@/app/site/the-nyc-exterminator/_lib/data";

export const metadata: Metadata = {
  title: "Free Pest Control Quote NYC | No-Obligation Exterminator Estimate",
  description:
    "Request a free, no-obligation pest control quote from licensed NYC exterminators. Includes free on-site inspection, written treatment plan, and upfront pricing. Cockroaches, bed bugs, rats, mice, termites & more. Same-day service available across all 5 boroughs, NJ, Long Island & Westchester. Text us.",
  keywords:
    "free pest control quote NYC, exterminator estimate, pest control inspection free, cockroach extermination quote, bed bug treatment estimate, rat control quote, free exterminator inspection NYC",
  openGraph: {
    title: "Free Pest Control Quote NYC | No-Obligation Exterminator Estimate",
    description:
      "Free pest control quote from licensed NYC exterminators. Free inspection, upfront pricing, same-day service. Text us.",
    url: `${SITE_URL}/quote-request`,
  },
  alternates: {
    canonical: `${SITE_URL}/quote-request`,
  },
};

export default function QuoteRequestPage() {
  const breadcrumbSchema = getBreadcrumbSchema([{ name: "Free Quote", url: "/quote-request" }]);
  const services = getAllServices();
  const allServices = services;
  const totalNeighborhoods = getAllNeighborhoods().length;
  const phonePlain = PHONE.replace(/-/g, "");

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How much does pest control cost in NYC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pest control pricing starts at $49 for basic treatments. Cockroach extermination ranges from $150 to $400, bed bug treatment from $300 to $1,500 per room, rat extermination from $200 to $600, and mouse extermination from $150 to $400. Every quote includes a free inspection with no obligation.",
        },
      },
      {
        "@type": "Question",
        name: "Is the pest control inspection really free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Every new client receives a completely free, no-obligation pest control inspection. A licensed exterminator visits your property, identifies the pest, assesses the infestation, and provides a transparent quote before any work begins.",
        },
      },
      {
        "@type": "Question",
        name: "How long does it take to get a pest control quote?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "After you submit your quote request, we review it within 2 hours during business hours and contact you to schedule a free inspection. Many clients receive their on-site quote the same day they submit the form.",
        },
      },
    ],
  };

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ───────── HERO ───────── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Get a Free Quote", url: "/quote-request" }]} />

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              Free Inspection &middot; Upfront Pricing &middot; Same-Day Available
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Get a Free{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                Pest Control
              </span>{" "}
              Quote
            </h1>
            <p className="mt-6 text-lg text-zinc-300">
              Tell us about your pest problem. A licensed exterminator will
              contact you within 2 hours during business hours to schedule
              your free inspection. Pest control pricing starts at $49, and every
              quote is backed by a thorough on-site assessment &mdash; not a guess
              over the phone.
            </p>
            <p className="mt-4 text-lg text-zinc-300">
              The NYC Exterminator serves all five NYC boroughs, New Jersey, Long
              Island, and Westchester County. Whether you are dealing with{" "}
              <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroaches</Link>,{" "}
              <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bugs</Link>,{" "}
              <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rats</Link>,{" "}
              <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mice</Link>,{" "}
              <Link href="/ant-control" className="text-green-400 hover:text-green-300">ants</Link>,{" "}
              or any other pest, filling out this form is the first step toward a
              pest-free property. Same-day exterminator service is available for
              urgent situations &mdash; just mention it in your message.
            </p>
            <p className="mt-4 text-zinc-400">
              Prefer to skip the form? Text{" "}
              <a href={`sms:${phonePlain}`} className="font-bold text-green-400 hover:text-green-300">
                us
              </a>{" "}
              for the fastest response. You can also{" "}
              <Link href="/contact" className="text-green-400 hover:text-green-300">
                visit our contact page
              </Link>{" "}
              for all the ways to reach us.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── WHAT TO INCLUDE IN YOUR QUOTE REQUEST ───────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            What to Include in Your Quote Request
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            The more details you provide in the form below, the faster and more
            accurately our pest control team can prepare for your free inspection.
            Here is what helps us give you the best exterminator quote possible:
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-700 bg-[#1A1A1A] p-6">
              <h3 className="font-semibold text-green-400">Pest Type</h3>
              <p className="mt-2 text-sm text-zinc-300">
                Tell us what you have seen or suspect. Common pests include{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroaches</Link>,{" "}
                <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bugs</Link>,{" "}
                <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rats</Link>,{" "}
                <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mice</Link>,{" "}
                <Link href="/ant-control" className="text-green-400 hover:text-green-300">ants</Link>, and{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termites</Link>.
                If you are not sure, describe what you saw &mdash; our exterminators
                can identify most pests from a description or photo.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-[#1A1A1A] p-6">
              <h3 className="font-semibold text-green-400">Property Type</h3>
              <p className="mt-2 text-sm text-zinc-300">
                Let us know if it is a residential apartment, condo, co-op,
                townhouse, single-family home, multi-unit building, restaurant,
                retail space, office, or warehouse. Different property types require
                different pest control approaches, and this helps our exterminator
                bring the right equipment.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-[#1A1A1A] p-6">
              <h3 className="font-semibold text-green-400">Your Address</h3>
              <p className="mt-2 text-sm text-zinc-300">
                Include your full address so we can assign the nearest available
                pest control technician and confirm that your property falls within
                our{" "}
                <Link href="/areas" className="text-green-400 hover:text-green-300">service area</Link>.
                We cover all of NYC, New Jersey, Long Island, and Westchester County.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-[#1A1A1A] p-6">
              <h3 className="font-semibold text-green-400">Urgency Level</h3>
              <p className="mt-2 text-sm text-zinc-300">
                Is this an emergency that needs same-day exterminator service, or
                are you planning ahead? Let us know your timeline so we can
                prioritize accordingly. We offer same-day pest control for urgent
                situations at no extra charge.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-[#1A1A1A] p-6">
              <h3 className="font-semibold text-green-400">Rooms Affected</h3>
              <p className="mt-2 text-sm text-zinc-300">
                How many rooms or areas are affected? Is the pest confined to one
                room (like the kitchen or bedroom), or have you noticed signs in
                multiple areas? This helps our exterminator estimate the scope of
                treatment and provide a more accurate pest control quote.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-[#1A1A1A] p-6">
              <h3 className="font-semibold text-green-400">Photos (Optional)</h3>
              <p className="mt-2 text-sm text-zinc-300">
                If you can include photos of the pest, droppings, damage, or
                affected areas, it makes identification much faster. Even blurry
                phone photos are helpful. You can also text photos directly to{" "}
                <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">us</a>{" "}
                before or after submitting this form.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── THE FORM ───────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Request Your Free Pest Control Quote
          </h2>
          <p className="mt-3 text-zinc-400">
            Fill out the form below and a licensed NYC exterminator will contact you
            within 2 hours during business hours. Pricing starting at $49. No
            obligation, no pressure.
          </p>

          <div className="mt-10 rounded-xl border border-zinc-800 bg-[#141414] p-6 sm:p-8">
            <ContactForm dark />
          </div>

          <div className="mt-8 text-center">
            <p className="text-zinc-500">Prefer to text?</p>
            <a
              href={`sms:${phonePlain}`}
              className="mt-1 inline-block text-2xl font-bold text-green-500 hover:text-green-400"
            >
              Text Us
            </a>
            <p className="mt-2 text-sm text-zinc-600">
              Text us for the fastest response — a real exterminator
              answers. Or <Link href="/book-exterminator-today" className="font-semibold text-green-400 hover:text-green-300">book online and save $10</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── WHAT HAPPENS AFTER YOU SUBMIT ───────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            What Happens After You Submit Your Quote Request
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            Once you hit submit, your pest control quote request enters our dispatch
            system and a licensed exterminator begins reviewing it immediately. Here
            is the step-by-step process so you know exactly what to expect.
          </p>

          <div className="mt-12 space-y-10">
            <div className="flex gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">We Review Your Request Within 2 Hours</h3>
                <p className="mt-2 text-zinc-300">
                  During business hours (Monday&ndash;Friday 7am&ndash;8pm, Saturday
                  8am&ndash;6pm, Sunday 9am&ndash;5pm), a member of our pest control
                  team reviews every quote request within two hours of submission. We
                  look at the pest type you described, your property details, and your
                  urgency level to determine which licensed exterminator is the best
                  fit for your situation. If you included photos, our team analyzes
                  them for species identification before we even contact you.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">We Call to Schedule Your Free Inspection</h3>
                <p className="mt-2 text-zinc-300">
                  One of our exterminators will text you to confirm the details
                  of your pest problem and schedule a free on-site inspection at a
                  time that works for you. We offer morning, afternoon, and evening
                  appointments seven days a week. If your situation is urgent, we will
                  do our best to send a pest control technician the same day. During
                  this call, we may ask additional questions about the layout of your
                  property, the severity of the infestation, and any previous pest
                  control treatments you have tried.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Our Exterminator Arrives Same-Day or Next-Day</h3>
                <p className="mt-2 text-zinc-300">
                  A licensed, insured pest control technician arrives at your property
                  at the scheduled time. They conduct a comprehensive inspection of
                  every affected area, identify the pest species with certainty, locate
                  entry points and nesting areas, and assess the full scope of the
                  infestation. This free inspection is thorough &mdash; we check behind
                  appliances, inside cabinets, along baseboards, in crawl spaces, and
                  everywhere else pests like to hide. Once the inspection is complete,
                  the exterminator presents you with a transparent, itemized quote. If
                  you approve, treatment can begin immediately. Pest control pricing
                  starts at $49, and there are never hidden fees or surprise charges.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── MID CTA ───────── */}
      <CTAGroup variant="mid" />

      {/* ───────── WHY GET A PROFESSIONAL QUOTE ───────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Why Get a Professional Pest Control Quote
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            Many NYC residents and business owners attempt to handle pest problems
            on their own before calling an exterminator. While we understand the
            impulse, there are critical reasons why a professional pest control
            quote should be your first step &mdash; not your last resort.
          </p>

          <div className="mt-10 space-y-8">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Proper Pest Identification Matters
              </h3>
              <p className="mt-3 text-zinc-300">
                Store-bought sprays and traps are designed for general use, but
                effective pest control requires accurate species identification.
                German cockroaches require different treatment than American
                cockroaches. Norway rats behave differently than roof rats.{" "}
                <Link href="/carpenter-ant-control" className="text-green-400 hover:text-green-300">
                  Carpenter ants
                </Link>{" "}
                cause structural damage that regular{" "}
                <Link href="/ant-control" className="text-green-400 hover:text-green-300">ant control</Link>{" "}
                products cannot address. A licensed exterminator identifies the exact
                species during the free inspection and selects the precise treatment
                method for that pest. This targeted approach is why professional pest
                control resolves infestations that months of DIY attempts could not.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                DIY Pest Control Often Makes It Worse
              </h3>
              <p className="mt-3 text-zinc-300">
                Over-the-counter bug bombs, foggers, and sprays can actually scatter
                pests deeper into walls, spread the infestation to new areas of your
                property, and make the colony harder to eliminate. Improperly placed
                rodent bait can cause animals to die inside walls, creating secondary
                pest problems and foul odors. DIY bed bug treatments almost never
                work and give the infestation time to multiply exponentially. By the
                time many of our clients call an exterminator, the problem has grown
                significantly from what it was when they first tried to handle it
                themselves. A professional pest control quote upfront can save you
                weeks of frustration and significantly more money in the long run.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="text-lg font-semibold text-green-400">
                A Free Quote Costs You Nothing
              </h3>
              <p className="mt-3 text-zinc-300">
                There is literally zero risk in requesting a professional pest
                control quote from The NYC Exterminator. The inspection is free. The
                quote is free. There is no obligation to proceed with treatment.
                You get a licensed exterminator&apos;s expert assessment of your pest
                problem, a clear understanding of the species involved, and
                transparent pricing for the recommended treatment &mdash; all at no
                cost. Compare that to spending $50 to $200 on store-bought products
                that may not work (and often do not), and the value of a professional
                quote becomes clear. Our pest control pricing starts at $49, which is
                competitive with many DIY products and delivers far better results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── OUR PRICING APPROACH ───────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Our Pest Control Pricing Approach
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            At The NYC Exterminator, we believe in complete pricing transparency.
            There are no hidden fees, no surprise charges, and no high-pressure
            sales tactics. Here is how our exterminator pricing works.
          </p>

          <div className="mt-10 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Pricing Starting at $49</h3>
                <p className="mt-1 text-zinc-300">
                  Our pest control services start at just $49 for basic treatments.
                  The exact price depends on the pest type, severity of the
                  infestation, property size, and treatment method required. You will
                  know the exact cost before any work begins.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">No Hidden Fees</h3>
                <p className="mt-1 text-zinc-300">
                  The price our exterminator quotes after the free inspection is the
                  price you pay. We do not add travel fees, emergency surcharges, or
                  inspection charges. If additional treatment is needed beyond the
                  original scope, we discuss it with you and provide a new quote
                  before proceeding.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Quote Before Treatment</h3>
                <p className="mt-1 text-zinc-300">
                  We never begin pest control treatment without your explicit approval
                  of the quoted price. Our exterminator presents the findings from the
                  inspection, explains the recommended treatment plan, and provides a
                  clear price. You decide whether to proceed. No pressure, no
                  obligation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Maintenance Plans Available</h3>
                <p className="mt-1 text-zinc-300">
                  For ongoing pest prevention, we offer monthly and quarterly
                  maintenance plans at discounted rates. These are especially popular
                  with restaurants, multi-unit buildings, and property management
                  companies. Ask about maintenance plans when you{" "}
                  <Link href="/contact" className="text-green-400 hover:text-green-300">contact us</Link>{" "}
                  or during your free inspection.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-lg border border-green-600 px-6 py-3 text-sm font-semibold text-green-400 hover:bg-green-600/10"
            >
              View Full Pricing Details &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── COMMON PEST CONTROL QUOTES ───────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Common Pest Control Quotes &amp; Pricing Ranges
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            While every pest control situation is unique and pricing depends on the
            specifics of your property and infestation, here are typical pricing
            ranges for our most popular exterminator services in the NYC metro area.
            All quotes include a free inspection, and pricing starts at $49.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { slug: "cockroach-extermination", name: "Cockroach Extermination", range: "$150 - $400", note: "German and American cockroach treatments for apartments, homes, and restaurants. Multi-unit building discounts available." },
              { slug: "bed-bug-treatment", name: "Bed Bug Treatment", range: "$300 - $1,500/room", note: "Heat treatment and chemical applications. K-9 detection available. Follow-up inspections included in the quoted price." },
              { slug: "rat-extermination", name: "Rat Extermination", range: "$200 - $600", note: "Trapping, exclusion, and baiting for Norway and roof rats. Entry point sealing included to prevent re-entry." },
              { slug: "mouse-extermination", name: "Mouse Extermination", range: "$150 - $400", note: "Comprehensive trapping and exclusion. Includes sealing entry points and sanitation recommendations." },
              { slug: "ant-control", name: "Ant Control", range: "$150 - $350", note: "Targeted baiting and barrier treatments. Carpenter ant control available at higher price points for structural infestations." },
              { slug: "termite-treatment", name: "Termite Treatment", range: "$800 - $3,000", note: "Liquid treatment, baiting systems, and wood treatment. Includes annual monitoring and warranty options." },
              { slug: "mosquito-control", name: "Mosquito Control", range: "$75 - $200", note: "Yard treatment and larvicide application. Monthly maintenance plans available for ongoing protection." },
              { slug: "flea-treatment", name: "Flea Treatment", range: "$200 - $400", note: "Whole-home treatment targeting adult fleas, eggs, and larvae. Pet-safe products used throughout." },
            ].map((item) => (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className="group block rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-green-500"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white group-hover:text-green-400">
                    {item.name}
                  </h3>
                  <span className="shrink-0 rounded-lg bg-green-600/20 px-3 py-1 text-sm font-bold text-green-400">
                    {item.range}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{item.note}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-green-500">
                  Learn more about {item.name.toLowerCase()} &rarr;
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-zinc-400">
            These are estimated ranges based on typical NYC pest control jobs.
            Your actual quote may be higher or lower depending on the severity of
            the infestation, the size of your property, and the treatment method
            required. The only way to get an exact price is through our{" "}
            <strong className="text-zinc-300">free on-site inspection</strong>.
            Submit the form above or text{" "}
            <a href={`sms:${phonePlain}`} className="font-bold text-green-400 hover:text-green-300">
              us
            </a>{" "}
            to get started.
          </p>

          <div className="mt-6">
            <p className="text-zinc-400">
              Looking for a pest not listed here? We handle over{" "}
              {services.length} different pest control services including{" "}
              <Link href="/spider-control" className="text-green-400 hover:text-green-300">spider control</Link>,{" "}
              <Link href="/wasp-removal" className="text-green-400 hover:text-green-300">wasp removal</Link>,{" "}
              <Link href="/tick-control" className="text-green-400 hover:text-green-300">tick control</Link>,{" "}
              and more. Visit our{" "}
              <Link href="/services" className="text-green-400 hover:text-green-300">
                full services page
              </Link>{" "}
              to see everything our NYC exterminators can treat.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── WHAT CUSTOMERS SAY ───────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            What Customers Say About Our <span className="text-green-500">Free Quote Process</span>
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Maria T.", area: "Upper West Side", text: "I texted them about a cockroach problem in my apartment and within 10 minutes I had a response. The exterminator came the next morning, did a thorough inspection, and gave me a clear quote with no pressure. Treatment started that same day. Pest control pricing was very fair — much less than I expected." },
              { name: "David R.", area: "Park Slope", text: "After finding bed bug bites, I panicked and called three different exterminators. The NYC Exterminator was the only one who offered a free inspection before quoting. Their heat treatment quote was competitive and they explained every step of the process. Truly professional pest control service." },
              { name: "Jennifer K.", area: "Hoboken", text: "We needed a termite inspection for our home purchase. The exterminator was incredibly thorough — spent over an hour inspecting the foundation, crawl space, and all wood contact areas. The detailed report helped us negotiate with the seller. Highly recommend their pest control team." },
              { name: "Marcus L.", area: "Astoria", text: "Restaurant owner here. Getting a pest control quote from The NYC Exterminator was refreshingly straightforward. They walked through my entire kitchen, identified potential problem areas, and put together a maintenance plan that keeps us DOH-compliant. No surprises on the bill, ever." },
              { name: "Sarah W.", area: "Williamsburg", text: "Mice in my brownstone basement were driving me crazy. I submitted a quote request online at midnight and had a response by 8am. The exterminator came that afternoon, found where they were getting in, sealed everything up, and set traps. Problem solved within a week. Starting at $49 was a great deal." },
              { name: "Tom H.", area: "White Plains", text: "Raccoons in our attic were keeping the whole family up at night. The wildlife control specialist they sent was knowledgeable and humane. The quote was transparent and they explained exactly what the removal process involved. Excellent pest control company — we use them for annual maintenance now." },
            ].map((review) => (
              <div key={review.name} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
                <div className="flex items-center gap-1 text-yellow-400 text-sm">★★★★★</div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">&ldquo;{review.text}&rdquo;</p>
                <p className="mt-3 text-xs text-zinc-500">{review.name} — {review.area}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/reviews" className="inline-flex items-center text-sm font-semibold text-green-500 hover:text-green-400">
              Read all customer reviews &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── WHAT MAKES US DIFFERENT ───────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            What Makes Our <span className="text-green-500">Pest Control Quotes</span> Different
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Many pest control companies in NYC provide vague estimates over the phone, then surprise customers with higher prices once the technician arrives. At The NYC Exterminator, we believe in complete transparency. Our free quote process starts with a thorough on-site inspection by a NYS DEC-licensed exterminator who identifies the exact pest species, assesses the severity of the infestation, locates entry points and nesting sites, and evaluates property-specific factors that affect treatment. Only then do we provide a detailed written quote that includes the treatment plan, products to be used, number of visits, preparation requirements, safety precautions, and total cost. No hidden fees. No surprise charges. No pressure to buy services you don&apos;t need.
              </p>
              <p>
                Our pest control pricing starts at just $49 for basic treatments, with most residential services ranging from $125 to $600 depending on the pest type and property size. Specialized services like <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug heat treatment</Link> and comprehensive <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite treatment programs</Link> are priced higher due to the specialized equipment and extended treatment protocols involved. Visit our <Link href="/pricing" className="text-green-400 hover:text-green-300">pricing page</Link> for detailed price ranges across all {allServices.length} services we offer.
              </p>
              <p>
                We also offer monthly, bi-monthly, and quarterly pest control maintenance plans that provide the best long-term value for both residential and <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial properties</Link>. Maintenance plans include scheduled inspections, preventive treatments, unlimited callbacks between visits, and priority scheduling for emergencies. For <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurants and food service businesses</Link>, our maintenance programs include NYC DOH-compliant treatment documentation for health inspections.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <h3 className="text-xl font-semibold text-white">Our Guarantee</h3>
              <p>
                Every pest control treatment we perform comes with a satisfaction guarantee. If pests return between scheduled treatments or within our guarantee period, we come back and re-treat at absolutely no additional charge. General pest control carries a 30-day guarantee. <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">Bed bug heat treatment</Link> includes a 90-day guarantee. <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">Termite treatment</Link> with bait station monitoring carries an annual renewable guarantee. We explain your specific guarantee terms before any work begins.
              </p>
              <h3 className="text-xl font-semibold text-white">Serving the Entire NYC Metro Area</h3>
              <p>
                Our licensed exterminators provide pest control services across <Link href="/areas" className="text-green-400 hover:text-green-300">{totalNeighborhoods}+ neighborhoods</Link> in all five NYC boroughs, northern New Jersey, Long Island, and Westchester County. No matter where your property is located in the metro area, we can provide a free on-site inspection and quote. Same-day appointments are often available for urgent pest situations. <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">Text us</a> right now to describe your pest problem — we&apos;ll respond fast with a plan.
              </p>
              <p>
                Join thousands of satisfied NYC property owners who trust The NYC Exterminator for reliable, affordable pest control. Read our <Link href="/reviews" className="text-green-400 hover:text-green-300">customer reviews</Link>, check our <Link href="/pricing" className="text-green-400 hover:text-green-300">transparent pricing</Link>, and learn more <Link href="/about" className="text-green-400 hover:text-green-300">about our company</Link>. Have questions? Visit our <Link href="/faq" className="text-green-400 hover:text-green-300">FAQ page</Link> or <Link href="/contact" className="text-green-400 hover:text-green-300">contact us</Link> directly. We&apos;re here to help you take back your property from pests — starting today.
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
