import Link from "next/link";
import Image from "next/image";
import { PricingCalculator } from "@/app/site/theroadsidehelper/_components/PricingCalculator";
import {
  PHONE,
  PHONE_HREF,
  SMS_HREF,
  HOURS,
  RATING,
  REVIEW_COUNT,
  CITY_COUNT,
  STATE_COUNT,
  SERVICES,
  PRICING,
  TESTIMONIALS,
  FAQ,
  TOP_CITIES,
  STATES,
} from "@/app/site/theroadsidehelper/_data/content";
import { HERO_PHOTO, SERVICE_PHOTOS, SECTION_PHOTOS, CUSTOMER_PHOTOS } from "@/app/site/theroadsidehelper/_data/photos";
import { faqSchema, jsonLd } from "@/app/site/theroadsidehelper/_lib/schema";

const SITE_URL = "https://www.theroadsidehelper.com";

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "The Roadside Helper",
  publisher: { "@id": `${SITE_URL}/#business` },
  inLanguage: "en-US",
};

const servicesItemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Roadside Assistance Services",
  itemListElement: SERVICES.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Service",
      name: s.title,
      url: `${SITE_URL}/services/${s.slug}`,
      provider: { "@id": `${SITE_URL}/#business` },
    },
  })),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(FAQ)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(servicesItemListSchema) }}
      />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0">
          <Image
            src={HERO_PHOTO.url}
            alt={HERO_PHOTO.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-emerald-900/80" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">
            Stranded? Help is under an hour away.
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            24/7 Roadside Assistance Near Me —
            <span className="block text-amber-300">Jump-Start, Tire, Lockout, Tow</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
            Flat <strong className="text-white">$149/hr</strong>, 1-hour minimum, no membership, no surcharges.
            Jump-starts, flat tire changes, lockouts, fuel delivery, towing, and winch-outs in 900+ cities across all 50 states. Most jobs finish inside the minimum.
          </p>

          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">24/7</p>
              <p className="mt-1 text-sm font-semibold text-amber-200 font-cta">Day or Night</p>
              <p className="mt-1 text-xs text-white/60">Weekends &amp; holidays included</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{RATING} Stars</p>
              <p className="mt-1 text-sm font-semibold text-amber-200 font-cta">{REVIEW_COUNT} Reviews</p>
              <p className="mt-1 text-xs text-white/60">Real customers, real results</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">$149/hr</p>
              <p className="mt-1 text-sm font-semibold text-amber-200 font-cta">No Surcharges</p>
              <p className="mt-1 text-xs text-white/60">Same rate overnight &amp; holidays</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{CITY_COUNT}</p>
              <p className="mt-1 text-sm font-semibold text-amber-200 font-cta">Cities Nationwide</p>
              <p className="mt-1 text-xs text-white/60">Local techs in every state</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg bg-amber-400 px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition-colors hover:bg-amber-300 font-cta">
                Call {PHONE} — Now
              </span>
            </a>
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/70 font-cta">
                Text {PHONE}
              </span>
            </a>
            <Link href="/book-roadside-help-now">
              <span className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/70 font-cta">
                Book Online
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PRICING CALCULATOR ─── */}
      <section className="bg-section-white py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <PricingCalculator />
        </div>
      </section>

      {/* ─── WHAT IS THE ROADSIDE HELPER ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            Honest, Flat-Rate Roadside Assistance
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            What Is The Roadside Helper?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We&apos;re a pay-as-you-go alternative to auto-club memberships. One flat hourly rate,
            no contracts, 24/7 dispatch — across{" "}
            <Link href="/locations" className="text-emerald-700 underline">{CITY_COUNT} cities</Link> in all {STATE_COUNT} states.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              The Roadside Helper exists because the way most Americans pay for roadside assistance is broken. The dominant model — auto-club membership — has been around for over a century, and it has not adapted to how drivers actually use the service today. Most Americans pay between eighty and one hundred and twenty dollars per year for a roadside membership and use it zero or one time. The clubs collect the dues, the wait times still stretch to two and three hours when something actually breaks, and the membership renews automatically every year whether the driver thought about it or not. We built The Roadside Helper to flip that math. You pay only when you actually need help. If you never need us, you owe us nothing.
            </p>
            <p>
              The model is straightforward and the pricing is the same regardless of when you call. One flat rate: <strong>one hundred dollars per hour with a one-hour minimum</strong>. The minimum exists because the cost of dispatching a fully-equipped service vehicle and a trained technician is roughly the same whether the call takes ten minutes or fifty minutes. Most roadside jobs — a jump-start, a lockout, a tire swap — finish inside the first hour. That means the minimum is also the maximum for the typical job. If your situation turns out to be more complex than the average call, the technician quotes the additional time on scene before continuing. Nothing is added to your bill that wasn&apos;t agreed to first.
            </p>
            <p>
              When you call, a real dispatcher answers. No phone tree, no automated voice menu, no eight-step keypad navigation. We ask your exact location, vehicle make and model, the nature of the problem, and any safety concerns — a child in the car, a hazardous shoulder position, low cell signal where you&apos;ve broken down. That information goes straight to the nearest qualified technician, who calls you back with an arrival estimate before they begin driving toward you. You also get a text with their name, a photo so you know who to expect, and a real-time ETA. Average response time across our network is under sixty minutes in the cities we serve.
            </p>
            <p>
              We operate in {CITY_COUNT} cities across all {STATE_COUNT} states with local technicians who know their markets. Service runs twenty-four hours a day, three hundred and sixty-five days a year — no overnight surcharges, no weekend premiums, no holiday markup. The rate at two in the afternoon on a Tuesday is identical to the rate at two in the morning on Christmas. We do that on purpose because emergencies do not respect business hours and a driver stranded at three in the morning deserves the same fair price as a driver stranded at three in the afternoon.
            </p>
            <p>
              We offer <Link href="/services" className="text-emerald-700 underline">twelve specialized roadside services</Link> covering every common breakdown — <Link href="/services/jump-start-service" className="text-emerald-700 underline">jump-starts</Link>, <Link href="/services/flat-tire-change" className="text-emerald-700 underline">flat tire changes</Link>, <Link href="/services/car-lockout-service" className="text-emerald-700 underline">car lockouts</Link>, <Link href="/services/fuel-delivery-service" className="text-emerald-700 underline">fuel delivery</Link>, <Link href="/services/tow-truck-service" className="text-emerald-700 underline">local towing</Link>, <Link href="/services/winch-out-recovery" className="text-emerald-700 underline">winch-outs</Link>, <Link href="/services/battery-replacement-on-site" className="text-emerald-700 underline">on-site battery replacement</Link>, <Link href="/services/motorcycle-roadside" className="text-emerald-700 underline">motorcycle roadside</Link>, <Link href="/services/rv-roadside-service" className="text-emerald-700 underline">RV roadside</Link>, and more. Every service uses the same flat rate. Every technician is licensed, bonded, and insured. See our <Link href="/pricing" className="text-emerald-700 underline">pricing</Link>, check our <Link href="/locations" className="text-emerald-700 underline">locations</Link>, or <Link href="/book-roadside-help-now" className="text-emerald-700 underline">book now</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ─── WHY US — 6 CARDS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            Why Drivers Choose The Roadside Helper
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Six Reasons We Beat Auto-Club Memberships
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "No Membership Required", body: "Pay only when you need help. No annual dues, no auto-renew, no contracts. Drivers who need help once every two years save money the first year." },
              { title: "Flat $149/hr Rate", body: "Same rate overnight, weekends, holidays. No surcharges. The price you're quoted is the price you pay — confirmed twice, once on the call and once by the technician on arrival." },
              { title: "Real Dispatch, Real Fast", body: "A human dispatcher picks up the first ring. Average response time is under an hour in the cities we serve. ETA is based on the nearest technician's current location, not a generic estimate." },
              { title: "Trained Technicians", body: "Every tech is licensed, bonded, background-checked, and insured. Commercial-grade equipment that protects modern vehicle electronics — not consumer cables that can fry your ECU." },
              { title: "Transparent Quotes", body: "If a job needs more time, you're told before any additional work starts. Nothing added you didn't agree to. No buried 'after-the-fact' fees on the invoice." },
              { title: "Nationwide Network", body: "900+ cities across all 50 states. Same flat rate wherever you break down. Whether you're a road tripper hundreds of miles from home or a commuter five minutes from the office, the pricing is identical." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 12 SERVICE CARDS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            Roadside Services
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            12 Roadside Services Available 24/7
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            From the routine to the rare — we handle dead batteries, flat tires, lockouts, empty tanks,
            winch-outs, towing, and specialty vehicle roadside. Same flat rate across every service.
          </p>
          <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => {
              const photo = SERVICE_PHOTOS[s.slug];
              return (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  {photo && (
                    <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                      <Image
                        src={photo.url}
                        alt={photo.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-base font-bold text-slate-900 font-heading">{s.title}</h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 font-cta">{s.subtitle}</p>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">{s.description}</p>
                    <span className="mt-4 inline-block text-sm font-semibold text-emerald-700 group-hover:underline font-cta">
                      Learn more →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link href="/services" className="text-emerald-700 font-semibold text-base hover:underline font-cta">
              View Full Service List →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── DEEP DIVE: EVERY SERVICE EXPLAINED ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Service Deep Dive</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Each Roadside Service Actually Involves</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Marketing copy is one thing. What the technician actually does on scene is another. Here&apos;s the real procedure for every common roadside call.
          </p>

          <div className="mt-12 space-y-12">
            {/* Jump-Start */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-start">
              <div className="relative h-64 overflow-hidden rounded-xl">
                <Image src={SERVICE_PHOTOS["jump-start-service"].url} alt={SERVICE_PHOTOS["jump-start-service"].alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 font-heading">Jump-Start Service</h3>
                <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-emerald-700 font-cta">~25 minutes on scene typical</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>The most common roadside call we dispatch is a jump-start — somebody&apos;s vehicle won&apos;t crank in the morning, often after a cold night. The jump itself takes between five and fifteen minutes depending on how deeply the battery has discharged and the cranking amperage required by your specific vehicle. The real value of professional jump service is what happens after.</p>
                  <p>Two failure modes look identical from the driver&apos;s seat: a one-time drain (interior light left on, short trip in cold weather, a parasitic draw that ran the battery down overnight) and a battery at the end of its life (chemistry breaking down, can&apos;t hold voltage). The first is fixed by a single jump-start. The second will leave you stranded again that night, or the next morning, or in a parking lot two days from now. Our technicians don&apos;t guess. After the jump, they run a quick voltage check with the engine running. A healthy alternator pushes 13.8 to 14.5 volts at idle. If the reading is in that range, the alternator is doing its job and you can usually trust the battery for at least a few more days while you arrange a replacement on your own terms.</p>
                  <p>If the test indicates a failing battery, you have two options: drive directly to an auto-parts store while the engine&apos;s running (don&apos;t shut it off — restarting a failing battery is how you get stranded again), or have us replace the battery on-site. We carry common Group 24, 35, 48, 65, and 78 batteries on every service truck. <Link href="/services/jump-start-service" className="text-emerald-700 font-semibold hover:underline">Read the full jump-start guide</Link>.</p>
                </div>
              </div>
            </div>

            {/* Flat Tire */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-start md:[&>div:first-child]:order-2">
              <div className="relative h-64 overflow-hidden rounded-xl">
                <Image src={SERVICE_PHOTOS["flat-tire-change"].url} alt={SERVICE_PHOTOS["flat-tire-change"].alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 font-heading">Flat Tire Change</h3>
                <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-emerald-700 font-cta">~30 minutes on scene typical</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>When we arrive at a flat tire call, the technician finds the leak first. If the tire is still partially inflated, we use a soap-and-water solution that bubbles at the leak point under pressure. The location of the leak determines what happens next. If the leak is in the tread — the flat surface of the tire that touches the road — most punctures from nails, screws, or sharp gravel can be plug-sealed on-site with a vulcanized plug kit. If the leak is in the sidewall, we mount the spare and refer you to a tire shop for replacement.</p>
                  <p>Locking lug nuts are a common surprise. If your wheels have locking lugs, you need the matching key (usually in the glove box or trunk) to remove them. If you&apos;ve lost the key, we carry a set of common removal sockets that handle most locking lug designs. After the spare is on, the technician torques the lugs to manufacturer spec with a calibrated torque wrench and checks the spare&apos;s air pressure. <Link href="/services/flat-tire-change" className="text-emerald-700 font-semibold hover:underline">Full tire service guide</Link>.</p>
                </div>
              </div>
            </div>

            {/* Lockout */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-start">
              <div className="relative h-64 overflow-hidden rounded-xl">
                <Image src={SERVICE_PHOTOS["car-lockout-service"].url} alt={SERVICE_PHOTOS["car-lockout-service"].alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 font-heading">Car Lockout Service</h3>
                <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-emerald-700 font-cta">~15 minutes on scene typical</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>Car lockouts are common and entirely fixable without damaging your vehicle. We use a wedge-and-rod system, not slim jims. We start with an air wedge — an inflatable bladder that slides between the door and frame, creating a small gap without damaging weatherstripping, paint, or the door frame. Through that gap, we insert a long-reach tool to reach inside the cabin and either pull the door handle, press the unlock button on the door panel, or operate the manual lock post.</p>
                  <p>The whole process takes five to fifteen minutes for most makes and models. For modern luxury cars with hidden door handles, the procedure can be more complex. We require photo ID confirming you&apos;re the vehicle owner or authorized driver before opening any locked vehicle. <Link href="/services/car-lockout-service" className="text-emerald-700 font-semibold hover:underline">Full lockout guide</Link>.</p>
                </div>
              </div>
            </div>

            {/* Fuel Delivery */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-start md:[&>div:first-child]:order-2">
              <div className="relative h-64 overflow-hidden rounded-xl">
                <Image src={SERVICE_PHOTOS["fuel-delivery-service"].url} alt={SERVICE_PHOTOS["fuel-delivery-service"].alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 font-heading">Fuel Delivery Service</h3>
                <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-emerald-700 font-cta">~25 minutes on scene typical</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>Running out of gas is one of those things that happens to almost every driver eventually. Fuel delivery is the fix — a technician brings two to five gallons of gasoline or diesel in approved fuel containers and pours it into your tank. The fuel itself is billed at local pump price plus the standard service rate. No inflated &quot;emergency fuel&quot; markup.</p>
                  <p>Running fully out of gas isn&apos;t great for your fuel pump. The pump is normally cooled by the fuel surrounding it inside the tank. When the tank goes dry, the pump runs hot. Doing this once shouldn&apos;t damage anything, but making a habit will shorten the pump&apos;s life. <Link href="/services/fuel-delivery-service" className="text-emerald-700 font-semibold hover:underline">Full fuel delivery details</Link>.</p>
                </div>
              </div>
            </div>

            {/* Tow */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-start">
              <div className="relative h-64 overflow-hidden rounded-xl">
                <Image src={SERVICE_PHOTOS["tow-truck-service"].url} alt={SERVICE_PHOTOS["tow-truck-service"].alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 font-heading">Local Tow Service</h3>
                <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-emerald-700 font-cta">~50 minutes typical</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>Some breakdowns can&apos;t be fixed roadside. We use flatbed trucks for AWD and 4WD vehicles, low-clearance cars, and any vehicle that shouldn&apos;t be wheel-lifted. Standard wheel-lift towing works fine for most front- or rear-wheel-drive sedans. Local tows are billed at our hourly rate plus per-mile charges past a five-mile included distance.</p>
                  <p>The hookup procedure matters more than most drivers realize. Improper wheel-lift attachment on an AWD vehicle can damage the transfer case to the tune of two to five thousand dollars. Low-front-clearance sports cars need flatbed approach ramps. Our techs are trained on these nuances and use the right truck for the right vehicle. <Link href="/services/tow-truck-service" className="text-emerald-700 font-semibold hover:underline">Full tow service details</Link>.</p>
                </div>
              </div>
            </div>

            {/* Winch */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-start md:[&>div:first-child]:order-2">
              <div className="relative h-64 overflow-hidden rounded-xl">
                <Image src={SERVICE_PHOTOS["winch-out-recovery"].url} alt={SERVICE_PHOTOS["winch-out-recovery"].alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 font-heading">Winch-Out &amp; Recovery</h3>
                <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-emerald-700 font-cta">~30 minutes typical</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>Stuck vehicles come in every flavor — snow drift in winter, soft shoulder after rain, mud on a back road, sand near a beach access, sliding into a ditch on a tight curve. Our recovery trucks carry heavy-duty winches rated for full-size SUVs and pickups, with proper rigging. Most winch-outs are completed in twenty to forty-five minutes at the flat $149/hr — no special &quot;recovery fee.&quot;</p>
                  <p>Winter winch-out volume in cold-weather markets spikes during the first major snowstorm each season. We don&apos;t perform true off-road recovery in genuine off-pavement scenarios — that&apos;s a specialist 4x4 recovery job. <Link href="/services/winch-out-recovery" className="text-emerald-700 font-semibold hover:underline">Winch-out service details</Link>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            How It Works
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            From Stranded to Rolling in Three Steps
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Call or Text", body: `Tap to call ${PHONE}. A real dispatcher answers, confirms your location, vehicle, and the problem, and quotes the rate.` },
              { step: "2", title: "Tech Arrives Fast", body: "The closest qualified technician is dispatched and calls with an arrival estimate. You'll get a text with their name, photo, and ETA." },
              { step: "3", title: "Fixed & Rolling", body: "Most jobs are done inside the 1-hour minimum. You pay only what was quoted — by card, Apple Pay, Venmo, Zelle, or cash." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-2xl font-bold text-white font-heading">{s.step}</span>
                <h3 className="mt-4 text-lg font-bold text-slate-900 font-heading">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The behind-the-scenes operation that makes the three steps fast looks like this. When your call comes in, the dispatcher captures the essentials in under ninety seconds: your name, callback number, exact location (we ask for cross-streets or the nearest mile marker on highways), vehicle year/make/model, the nature of the problem, and any safety concerns. That information is entered into our dispatch system, which immediately surfaces the three nearest qualified technicians for your specific service type — motorcycle calls go to motorcycle-trained techs, diesel calls go to diesel-trained techs, RV calls go to RV-trained techs.</p>
            <p>The dispatcher selects the nearest available tech based on real-time location data and current call queue, sends them the call details, and rings their cell. The tech accepts the dispatch, calls you with an arrival estimate, and starts driving toward your location. You receive a text within a minute or two with the tech&apos;s name, a photo of them in uniform, and an ETA that updates in real-time as they approach. The dispatcher stays available throughout — if anything changes (you need to move to a safer location, conditions worsen, your situation evolves), you can call back and they&apos;ll relay updates to the tech in real time.</p>
            <p>On arrival, the tech confirms the situation visually, walks you through what they&apos;re about to do in plain language, and gets to work. For roadside calls on highways and busy roads, that means positioning the service vehicle to shield you from traffic, deploying cones, and putting on ANSI-compliant high-visibility gear before any work begins. For parking lot calls and driveway calls, it&apos;s a quick situational check and confirmation that the vehicle is stable. Once the scene is safe, work begins immediately. The customer is welcome to watch or stay in their vehicle — whichever feels most comfortable in the moment.</p>
          </div>
        </div>
      </section>

      {/* ─── WHO BENEFITS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            Who We Help
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Built for Every Kind of Driver
          </h2>
          <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Commuters", slug: "commuters", body: "Get back on the road in time for work." },
              { name: "Rideshare Drivers", slug: "rideshare-drivers", body: "Priority dispatch — minimize lost earnings." },
              { name: "Parents", slug: "parents", body: "Priority calls when kids are in the car." },
              { name: "Fleet Managers", slug: "fleet-managers", body: "Flat-rate roadside for any size fleet." },
              { name: "Long-Haul Drivers", slug: "long-haul-drivers", body: "Diesel-specific techs and equipment." },
              { name: "RV Travelers", slug: "rv-travelers", body: "Heavy-duty rigs for Class A, B, C coaches." },
              { name: "Motorcycle Riders", slug: "motorcycle-riders", body: "Bike-specific tow trailers and trained techs." },
              { name: "Road Trippers", slug: "road-trippers", body: "Same flat rate in all 50 states." },
            ].map((c) => {
              const photo = CUSTOMER_PHOTOS[c.slug];
              return (
                <Link key={c.slug} href={`/who-we-serve/${c.slug}`} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
                  {photo && (
                    <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                      <Image src={photo.url} alt={photo.alt} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-base font-bold text-slate-900 font-heading">{c.name}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{c.body}</p>
                    <span className="mt-3 inline-block text-sm font-semibold text-emerald-700 font-cta">Learn more →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CUSTOMER DEEP DIVE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Built Around Real Drivers</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Our Service Fits Different Driving Lives</h2>

          <div className="mt-10 space-y-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-start">
              <div className="relative h-48 overflow-hidden rounded-xl md:col-span-1">
                <Image src={CUSTOMER_PHOTOS.commuters.url} alt={CUSTOMER_PHOTOS.commuters.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="md:col-span-2">
                <h3 className="text-xl font-bold text-slate-900 font-heading">For Commuters</h3>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">Commuters depend on their vehicle running every day. A dead battery in a cold parking garage, a flat tire on the way out the door, an unexpected lockout when you&apos;re already running late — any one of these can ruin your day and cost you a missed meeting or lost wages. We dispatch around the clock with the equipment to fix the most common breakdowns on-site in under an hour. The flat $149/hr rate beats annual auto-club dues for the vast majority of commuters because most people who pay for an auto-club membership use it zero or one time per year. Pay-as-you-go saves money the first time you do the math.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-start">
              <div className="relative h-48 overflow-hidden rounded-xl md:col-span-1 md:order-2">
                <Image src={CUSTOMER_PHOTOS["rideshare-drivers"].url} alt={CUSTOMER_PHOTOS["rideshare-drivers"].alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="md:col-span-2 md:order-1">
                <h3 className="text-xl font-bold text-slate-900 font-heading">For Rideshare &amp; Delivery Drivers</h3>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">For rideshare and delivery drivers, the vehicle is the job. A flat tire, a dead battery, an empty tank — any breakdown is direct lost income. We treat rideshare and delivery drivers as priority dispatch because we understand the economics. Every minute a driver is off the platform is money not earned. We also provide trip receipts and timestamps in formats Uber, Lyft, DoorDash, Instacart, and Amazon Flex accept for vehicle downtime documentation. If you need to dispute a ratings hit, claim breakdown coverage from your platform, or document the downtime for tax purposes, the documentation is included.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-start">
              <div className="relative h-48 overflow-hidden rounded-xl md:col-span-1">
                <Image src={CUSTOMER_PHOTOS.parents.url} alt={CUSTOMER_PHOTOS.parents.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="md:col-span-2">
                <h3 className="text-xl font-bold text-slate-900 font-heading">For Parents</h3>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">A breakdown with children in the car is stressful in a way drivers without kids may not fully appreciate. Hot weather, cold weather, an unhappy toddler, school pickup time ticking away, a baby starting to cry — the pressure compounds. Our dispatch treats calls with children present as priority. The technician arrives quickly, works efficiently, and is trained to keep the situation calm and professional. We can also coordinate with a family member or a rideshare service to get kids home while we work on the vehicle if that&apos;s the better option for your situation. The dispatcher will walk through the options on the call.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-start">
              <div className="relative h-48 overflow-hidden rounded-xl md:col-span-1 md:order-2">
                <Image src={CUSTOMER_PHOTOS["fleet-managers"].url} alt={CUSTOMER_PHOTOS["fleet-managers"].alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="md:col-span-2 md:order-1">
                <h3 className="text-xl font-bold text-slate-900 font-heading">For Fleet &amp; Commercial Operators</h3>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">Commercial fleet roadside is a recurring need, not an emergency exception. Delivery vans, service trucks, sales fleets, and rental cars all break down regularly enough that having a reliable, predictably-priced roadside partner matters. We offer consolidated monthly billing, dedicated dispatch lines, account portals showing every call and every charge, and consistent technician assignments where geography allows. The per-call rate is the same flat $149/hr — fleets don&apos;t get a discounted rate, but they do get operational support: clean accounting documentation, real-time call visibility, monthly breakdown-pattern reports for routing analysis, and a single point of contact for invoicing. <Link href="/commercial" className="text-emerald-700 font-semibold hover:underline">Learn about fleet accounts</Link>.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── US VS AUTO CLUBS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            Roadside Helper vs. Auto Clubs
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Pay-As-You-Go Beats Yearly Dues
          </h2>
          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-cta text-slate-600">&nbsp;</th>
                  <th className="px-4 py-3 text-center font-cta text-emerald-700">The Roadside Helper</th>
                  <th className="px-4 py-3 text-center font-cta text-slate-500">Typical Auto Club</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {[
                  ["Annual fee", "$0", "$80–$120/year"],
                  ["Per-call cost", "$149 flat hourly", "Included (after dues)"],
                  ["Average response", "Under 60 min", "2–3 hours"],
                  ["After-hours surcharge", "None", "Sometimes"],
                  ["Holiday surcharge", "None", "Often"],
                  ["Real human dispatcher", "Yes", "Auto-menu first"],
                  ["Service limits per year", "None", "3–4 calls"],
                  ["Tow miles included", "5 miles", "5–10 miles"],
                  ["Cost if you never call", "$0", "Lost dues"],
                  ["Documentation for fleet/insurance", "Yes, included", "Limited"],
                ].map(([label, us, them]) => (
                  <tr key={label} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-700">{label}</td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">{us}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The math behind pay-as-you-go versus auto-club membership comes down to actual usage. The industry standard for auto-club basic-tier membership is between eighty and one hundred and twenty dollars per year. Industry data consistently suggests the average member uses their roadside benefit roughly four-tenths of a time per year. That number means more than half of all members pay for a year of service they never touch. Many members go three or four years between calls. Some members go five or ten years without ever using the benefit. The membership renews automatically every year regardless.</p>
            <p>Even when members do call, they hit limits. Most basic memberships cap free calls at three or four per year — extras incur fees, sometimes the full per-call retail rate. Tow distance is capped (often five to ten miles included, then per-mile after). Service exclusions are common — some memberships exclude motorcycles, RVs, commercial vehicles, or vehicles registered to a different person than the membership holder.</p>
            <p>Wait times are the bigger complaint. Auto-club roadside is contracted out to local tow companies and roadside operators, who are paid a flat per-call rate by the club. The economics push contractors to prioritize their own retail calls over auto-club calls because the retail rate is typically higher. The result: average wait times of two to three hours during normal demand, much longer during storms, snow events, or peak weekends.</p>
            <p>Pay-as-you-go costs zero dollars per year and one hundred dollars per hour per call. For a driver who needs roadside help once every two years, the math is overwhelming: two years of basic auto-club dues runs roughly two hundred dollars for two years of unused coverage that delivers a two-to-three-hour wait time when finally needed. One pay-as-you-go call costs one hundred dollars with an under-sixty-minute average response.</p>
          </div>
        </div>
      </section>

      {/* ─── PHOTO BREAK 24/7 ─── */}
      <section className="relative h-72 sm:h-96 overflow-hidden">
        <Image
          src={SECTION_PHOTOS.truckAtNight.url}
          alt={SECTION_PHOTOS.truckAtNight.alt}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/60 to-slate-900/30" />
        <div className="relative mx-auto flex h-full max-w-5xl items-center px-6">
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">Available Right Now</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl font-heading">
              24/7/365 — Day, Night, Holiday, Storm
            </h2>
            <p className="mt-3 text-white/80">
              We dispatch around the clock. The rate is the same whether you call at 2pm Tuesday or 2am Christmas morning.
            </p>
            <a href={PHONE_HREF} className="mt-5 inline-block rounded-lg bg-amber-400 px-6 py-3 text-base font-semibold text-slate-900 font-cta hover:bg-amber-300">
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ─── HIGHWAY SAFETY ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Safety First</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">What to Do the First Five Minutes After Breaking Down</h2>
              <div className="mt-6 space-y-4 text-sm text-slate-700 leading-relaxed">
                <p><strong className="text-slate-900">Minute 1 — Get off the road if you can.</strong> If the vehicle is still rolling, coast to a shoulder, off-ramp, parking lot, or any space off the active travel lane. The difference between a vehicle in a travel lane and a vehicle on a shoulder is the difference between high-risk and routine. If the vehicle is dead and you cannot move it, do not try to push it from outside — that&apos;s a separate set of risks.</p>
                <p><strong className="text-slate-900">Minute 2 — Engage hazards and stabilize.</strong> Turn on the hazard lights immediately. If you have flares, road triangles, or LED warning lights, deploy them 50–100 feet behind the vehicle in the direction of oncoming traffic. Put the vehicle in park, set the parking brake, and turn the wheels away from traffic.</p>
                <p><strong className="text-slate-900">Minute 3 — Stay in or exit safely.</strong> On a high-speed highway with no shoulder or a narrow shoulder, staying buckled inside the vehicle is usually safer than standing beside it. On a wide shoulder, low-speed road, or parking lot, exiting on the side facing away from traffic is usually safer. Walk well off the road — 20+ feet if possible.</p>
                <p><strong className="text-slate-900">Minute 4 — Locate yourself precisely.</strong> Open your maps app and screenshot your current location. Note the nearest mile marker, exit number, or cross street. The dispatcher needs precise location to send help — &quot;I&apos;m somewhere on the highway&quot; is not enough.</p>
                <p><strong className="text-slate-900">Minute 5 — Call.</strong> Have ready: your exact location, vehicle year/make/model, the nature of the problem, and any safety concerns. The dispatcher will ask all of these — having them ready makes the call 2 minutes instead of 8. Call <a href={PHONE_HREF} className="text-emerald-700 font-semibold hover:underline">{PHONE}</a>.</p>
              </div>
            </div>
            <div className="relative h-96 overflow-hidden rounded-xl">
              <Image src={SECTION_PHOTOS.brokenDown.url} alt={SECTION_PHOTOS.brokenDown.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SEASONAL ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Seasonal Patterns</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">When Breakdowns Spike — and How to Prepare</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Roadside call volume follows the weather. Knowing the patterns helps you anticipate problems before they strand you.</p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 overflow-hidden">
              <div className="relative -mx-6 -mt-6 mb-4 h-40 overflow-hidden">
                <Image src={SECTION_PHOTOS.snowRoad.url} alt={SECTION_PHOTOS.snowRoad.alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Cold Weather</h3>
              <div className="mt-3 space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>Roadside call volume spikes 40–60% in the first two weeks of real cold each winter. Marginal batteries that survived fall finally die. Underinflated tires lose enough pressure to trigger warning lights. People run out of gas because they didn&apos;t realize their range drops in the cold.</p>
                <p>Five things that actually prevent winter breakdowns: load-test your battery in early November (batteries lose 35% of cranking amps at 32°F and 60% at 0°F — replace anything that tests under 75% capacity), check tire pressure when temperatures drop (tires lose roughly 1 PSI per 10°F drop), keep the fuel tank above half (condensation in the empty space can freeze in fuel lines), diesel drivers watch for gelling (add winter additive starting in October), and pack a winter kit (blanket, flashlight, first aid, phone power bank, ice scraper, hand warmers, water).</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 overflow-hidden">
              <div className="relative -mx-6 -mt-6 mb-4 h-40 overflow-hidden">
                <Image src={SECTION_PHOTOS.rainyRoad.url} alt={SECTION_PHOTOS.rainyRoad.alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Hot Weather &amp; Storms</h3>
              <div className="mt-3 space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>Summer heat shortens battery life dramatically. In desert and southern markets, batteries that would last five years in cooler climates often need replacement at three. Pavement temperatures above 140°F in mid-summer cause tire blowouts at highway speeds — usually older tires with developing sidewall weakness. AC compressor seizures spike during the first multi-day heat wave each summer.</p>
                <p>Storm season patterns: hurricane periods produce sharp post-storm spikes as drivers attempt to clear flooded roads. Heavy rain causes hydroplaning incidents that result in ditch winch-outs. Severe thunderstorms with downed power lines can strand drivers in unsafe positions. Our dispatch surges capacity during named storms and severe weather events. We also flag dangerous-location calls (vehicles in active traffic lanes, flooded zones) for police coordination before sending a tech.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BATTERY DEEP DIVE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Battery Truth</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Long Should a Car Battery Actually Last?</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Most drivers operate on the assumption that a car battery should last as long as the vehicle. That assumption is wrong, and it&apos;s the single most common cause of avoidable roadside calls we see. The realistic expected lifespan of a flooded lead-acid car battery is three to five years in moderate climates. In cold-weather climates, it&apos;s closer to four to six years because cold reduces chemical reaction rates and slows the discharge cycle that wears the battery out. In hot-weather climates, the expected lifespan drops to two-and-a-half to four years because heat accelerates the breakdown of the lead plates inside the battery. Desert markets like Phoenix, Las Vegas, and southern California consistently see the shortest battery lives in the country.</p>
            <p>Modern absorbed-glass-mat (AGM) batteries — the type that comes standard in vehicles with start-stop systems and is increasingly common in luxury and performance cars — last slightly longer on average but cost two to three times as much. The lifespan benefit doesn&apos;t fully offset the higher upfront cost for most drivers, but AGM is required in vehicles with start-stop systems because flooded batteries can&apos;t handle the constant cycling. If your current battery is AGM, you have to replace it with AGM. Using a cheaper flooded replacement will work briefly and then fail prematurely as the start-stop system rapidly cycles it.</p>
            <p>The cold-cranking-amps rating on your battery matters more than most drivers realize. Vehicles have a minimum CCA requirement set by the manufacturer, listed on the door jamb or in the owner&apos;s manual. Replacing a 700 CCA battery with a 500 CCA &quot;equivalent&quot; for fifteen dollars less will result in marginal cold starts and premature failure in the first hard freeze. Always match or exceed the original CCA rating. Going higher than the original rating doesn&apos;t harm anything; going lower is asking for trouble.</p>
            <p>The biggest factor in real-world battery life isn&apos;t the battery itself — it&apos;s your driving pattern. Short trips (under fifteen minutes, mostly stop-and-go) don&apos;t allow the alternator enough time to fully recharge the battery between starts. Over months and years, the battery operates in a perpetually undercharged state, which accelerates sulfation on the lead plates and shortens lifespan. If your daily commute is short, consider a longer drive once a week to give the battery a full charge cycle, or use a smart battery maintainer overnight to keep the battery topped up. This single habit can extend battery life by 30–50% for short-trip drivers.</p>
            <p>Warning signs that your battery is failing before it actually strands you: slow cranking in the morning (the engine takes an extra second to fire), dimming headlights when idling at a stop, accessory power dropping out briefly when you start the engine, the dashboard battery warning light illuminating, and visible corrosion buildup on the battery terminals. If you notice any of these signs, get the battery load-tested. Most auto-parts stores will test it for free in under a minute. A battery that fails a load test will not survive the next cold snap.</p>
          </div>
        </div>
      </section>

      {/* ─── TIRE DEEP DIVE ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Tire Health 101</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Understanding Tire Pressure, Tread, and Replacement Timing</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Tire failures are the second most common roadside call we dispatch, after dead batteries. Most tire failures are preventable with proper maintenance. The first prevention step is tire pressure. Every vehicle has a manufacturer-specified pressure listed on a sticker inside the driver&apos;s door jamb — not the maximum pressure listed on the tire itself, which is the structural maximum, not the operational target. For most passenger vehicles, the door-jamb spec is between 30 and 35 PSI. SUVs and trucks may run slightly higher, and load-rated tires for heavy-duty trucks may run significantly higher when loaded.</p>
            <p>Tire pressure changes with temperature at a rate of approximately one PSI per ten degrees Fahrenheit. If you set your pressures in October at 70°F and the temperature drops to 20°F by December, your tires are now operating roughly five PSI under spec. That&apos;s enough to wear the outer edges of the tread prematurely, hurt fuel economy, reduce cold-weather grip, and trigger the tire pressure monitoring system warning light in most modern vehicles. Check pressures monthly during winter and adjust to door-jamb spec, measured when the tires are cold (have not been driven on for at least three hours).</p>
            <p>Tread depth is the second prevention factor. New tires have approximately 10/32&quot; of tread. Replacement is required by law when tread reaches 2/32&quot;, but performance degrades significantly before that legal minimum. At 4/32&quot;, wet-weather stopping distance increases by roughly 40% compared to new tires. At 3/32&quot;, you&apos;re skating on borrowed time in rain. The penny test is a quick check: insert a penny into the tread with Lincoln&apos;s head facing down. If you can see all of Lincoln&apos;s head, your tread is below 2/32&quot; and the tire is illegal. More reliable is a tread depth gauge, available for two or three dollars at any auto-parts store.</p>
            <p>Tire age matters separately from tread wear. Rubber compounds in tires oxidize and harden over time, losing their grip characteristics even if the tread looks fine. Most tire manufacturers recommend replacement at six to ten years of age regardless of tread depth. The DOT date code on the sidewall (a four-digit number indicating the week and year of manufacture — &quot;3221&quot; means the thirty-second week of 2021) tells you exactly how old the tire is. If your tires are over ten years old, replace them even if the tread looks good. This is especially important for spare tires that sit in the trunk for years without being used — that fifteen-year-old spare you&apos;ve never deployed is structurally compromised and may fail under the load of regular driving.</p>
            <p>Sidewall damage is the deal-breaker on otherwise-fine tires. Cuts, bulges, exposed cords, or sidewall punctures cannot be safely repaired. The sidewall flexes constantly during driving, and any repair will eventually fail at speed. If you see a sidewall problem, the tire is done — replace it. Tread punctures are different: a clean puncture in the tread (not the shoulder area or sidewall) from a nail or screw can be safely plug-sealed if the puncture is smaller than a quarter inch in diameter. Our techs carry vulcanized plug kits and can perform tread repairs on-site for many flat-tire calls.</p>
            <p>Rotation pattern matters for long-term tire life. Vehicles wear front and rear tires at different rates due to weight distribution and steering input. Rotating tires every five to seven thousand miles equalizes the wear and extends overall tire life by 20–30%. Many drivers skip rotation and end up replacing front tires while the rears still have 50% tread remaining. That&apos;s wasted money. Most tire shops include free rotation with tire purchases — take advantage of it.</p>
          </div>
        </div>
      </section>

      {/* ─── MODERN VEHICLE CONSIDERATIONS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Modern Vehicles</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Roadside Considerations for Hybrids, EVs, and Modern Vehicles</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Modern vehicles have brought new wrinkles to roadside service. Hybrid vehicles have two batteries — a high-voltage traction battery (typically 200–600 volts) that powers the electric motor and drives the wheels, and a standard 12-volt auxiliary battery that runs the vehicle&apos;s electrical accessories (lights, infotainment, ECU). When a hybrid won&apos;t start, it&apos;s almost always the 12V auxiliary battery that&apos;s dead — the high-voltage traction battery is healthy. A standard 12V jump-start fixes the problem in five minutes. The high-voltage system requires specialized service and should never be approached by a driver or untrained tech; we coordinate with the dealership for any high-voltage work.</p>
            <p>Full electric vehicles (Teslas, Mustang Mach-Es, Rivians, Lucids, Lightning F-150s, and others) have their own roadside considerations. Range anxiety becomes range depletion when planning goes wrong — a Tesla rated for 300 miles in summer may show 220 in deep cold, which can leave drivers stranded short of their charging destination. We can&apos;t jump-start a depleted high-voltage battery (the only fix is charging it), but most EVs also have a standard 12V auxiliary battery that runs the vehicle&apos;s computers, and that battery can fail just like in a conventional car. A 12V dead auxiliary in a Tesla can leave you unable to open the doors or operate the vehicle, even if the main battery has plenty of charge. Our techs can jump-start the auxiliary 12V safely. For depleted high-voltage batteries, we tow the vehicle to the nearest charging station or service center.</p>
            <p>Start-stop systems in conventional gasoline cars rely on AGM (absorbed-glass-mat) batteries that handle the constant cycling. If you replace an AGM battery with a cheaper flooded battery, the start-stop system rapidly cycles the flooded battery to death. Always replace AGM with AGM. Our techs carry common AGM sizes; if your specific vehicle requires an unusual AGM, we can deliver one on-site within the same call or coordinate next-day delivery.</p>
            <p>Modern vehicles with electronic parking brakes (most cars built after 2015) can&apos;t be towed with a parked-engaged parking brake — the brake will damage the rear brake actuators during the tow. Our techs know how to release electronic parking brakes for tow procedures. Vehicles with active suspension or air suspension need specific procedures to avoid damaging the suspension system during a tow. AWD vehicles must be flatbed-towed; wheel-lift towing damages the transfer case.</p>
            <p>Push-button start vehicles often confuse drivers when the battery dies — the push button doesn&apos;t work without battery power. There&apos;s usually a hidden mechanical key inside the fob or in a hidden slot on the steering column that allows manual unlock and start, but most drivers don&apos;t know about it. We can show you where it is during a service call.</p>
          </div>
        </div>
      </section>

      {/* ─── DISPATCH BEHIND THE SCENES ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-center">
            <div className="relative h-80 overflow-hidden rounded-xl">
              <Image src={SECTION_PHOTOS.dispatch.url} alt={SECTION_PHOTOS.dispatch.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Behind the Scenes</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">How Dispatch Actually Works</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-700 leading-relaxed">
                <p>The dispatch system is the difference between a forty-five-minute response and a three-hour response. Auto-club dispatch is contracted out, which means your call goes through one company before reaching a second company that actually owns the truck. Each handoff adds delay. Our dispatch is in-house, which removes a layer.</p>
                <p>When your call comes in, the dispatcher has a real-time map of every available technician in your area. They can see who&apos;s on a call, who&apos;s wrapping up, who&apos;s en route to a previous call, and who&apos;s available. The selection is based on proximity, qualification for your specific service type, current call queue, and traffic conditions. Most calls are assigned within ninety seconds of pickup.</p>
                <p>Throughout your call, the dispatcher remains your point of contact. If conditions change — you need to move to a safer location, the situation gets worse, you have a question about what the tech will do — call back and the dispatcher relays in real time.</p>
                <p>After the call completes, you receive a digital invoice automatically. The dispatcher tracks completion in real-time and the system generates documentation suitable for insurance, fleet records, or expense reporting without any manual data entry.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TOP CITIES ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            Top Cities We Serve
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Roadside Assistance in Major Cities
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Local technicians in every major U.S. metro. Same flat $149/hr nationwide.
          </p>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {TOP_CITIES.map((city) => (
              <Link key={city} href="/locations" className="rounded-lg border border-slate-200 bg-white p-3 text-center text-sm font-medium text-slate-700 transition-colors hover:border-emerald-600 hover:text-emerald-700">
                {city}
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/locations" className="text-emerald-700 font-semibold text-base hover:underline font-cta">
              View All Locations →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            Pricing
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Flat $149/Hr — That&apos;s It
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            One flat rate. No memberships. No surcharges. 1-hour minimum.
          </p>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {Object.entries(PRICING).map(([key, tier]) => {
              const isPopular = "popular" in tier && tier.popular;
              return (
                <div key={key} className={`relative rounded-xl border ${isPopular ? "border-emerald-700 ring-2 ring-emerald-700/30" : "border-slate-200"} bg-white p-6`}>
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white font-cta">Most Common</span>
                  )}
                  <h3 className="text-lg font-bold text-slate-900 font-heading">{tier.label}</h3>
                  <p className="mt-3 text-4xl font-bold text-slate-900 font-heading">{tier.price}<span className="ml-1 text-sm font-normal text-slate-500">/{tier.unit.split(" ").slice(-1)[0]}</span></p>
                  <p className="text-xs text-slate-500">{tier.unit}</p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <svg className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                        <span className="text-slate-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-emerald-700 font-semibold text-base hover:underline font-cta">
              See Full Pricing Details →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── COVERAGE BY REGION ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Regional Notes</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Our Service Adapts to Your Region</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every region has its own breakdown patterns. Our dispatch and technicians adapt accordingly.</p>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Northeast</h3>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">Cold winters with regular snow drive the year&apos;s peak dispatch demand. Our Northeast network surges capacity from November through March. Battery failure is the dominant call type during the first hard freeze each winter. Pothole-induced flat tires spike in March and April after the freeze-thaw cycle damages roads. Snow-narrowed shoulders make safe pull-off harder; our techs are trained for highway-shoulder positioning in winter conditions. Salt corrosion on battery terminals accelerates failure on vehicles four-plus years old — our techs apply anti-corrosion compound during every winter battery service.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Southeast</h3>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">Hot, humid summers shorten battery life dramatically — replacement intervals here run three to four years versus five to six in cooler climates. Tire blowouts from hot pavement at highway speeds peak in July and August, almost always on older tires with developing sidewall weakness. Hurricane season (June through November) brings sharp post-storm demand spikes as drivers attempt to clear flooded roads. We coordinate with state emergency management during named storms to maintain dispatch capacity in affected areas.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Midwest</h3>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">Extreme cold snaps test batteries to their limits. Winch-out volume spikes during the first major snowstorm each winter as marginal drivers slide off freshly-snowy roads. Diesel gelling and glow-plug failures cluster during deep cold below zero. Rural distances between exits can extend response times beyond the urban sub-sixty-minute average — our rural dispatch sets realistic ETAs upfront rather than promising urban-equivalent timing. Deer collisions on backroads at dawn and dusk drive a meaningful share of post-collision tow calls.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Southwest</h3>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">Desert heat shortens battery life faster than any other climate — replacement at two-and-a-half to three years is normal. Tire blowouts peak in July when pavement temperatures exceed 140°F. Monsoon season in Arizona and New Mexico (July through September) produces sudden flash flooding that strands vehicles in low-water crossings. Sun-cracked sidewalls on older tires are common — our techs check sidewall integrity on every tire service call. Remote desert breakdowns can require longer response times; our dispatch is upfront about this for calls outside major metros.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">West &amp; Mountain</h3>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">Mountain passes with steep grades and unexpected weather changes produce a unique mix of overheating breakdowns in summer and snow-stranded recoveries in winter. Remote rural areas with limited cell coverage extend response times for some calls; we recommend cellular boosters or satellite communicators for drivers regularly traveling through cell-dead zones. High-elevation cold weather causes battery issues even in mild winter regions — Denver, Salt Lake, and Reno see more cold-related calls than their average winter temperatures would suggest.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Pacific Coast</h3>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">Mild year-round climate means roadside demand is steadier without strong seasonal peaks. The Pacific Northwest sees wet-weather hydroplaning incidents during the rainy season (November through March). EV roadside calls are more common here than any other region as adoption rates lead the country. Mountain passes in the Sierra and Cascades have rapid weather changes that strand drivers during shoulder seasons. Wildfire-related road closures in summer and fall occasionally require detours and rerouting of in-progress dispatches.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMMON MISCONCEPTIONS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Common Misconceptions</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Most Drivers Get Wrong About Roadside</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong className="text-slate-900">Misconception: My auto-club membership covers everything.</strong> Most basic memberships cover three to four calls per year with capped tow distances (often five to ten miles included), exclude certain vehicle types (motorcycles, RVs, commercial vehicles), and incur per-call fees once you exceed the included call limit. Some memberships specifically exclude vehicles registered to a different person than the membership holder. The &quot;unlimited&quot; pitch is rarely as unlimited as it sounds. Read the fine print on your specific membership tier.</p>
            <p><strong className="text-slate-900">Misconception: Auto-club roadside is cheaper than pay-as-you-go.</strong> Only for drivers who genuinely need three-plus calls per year and chose a tier that covers those calls without overages. For everyone else — and that&apos;s the vast majority of drivers — pay-as-you-go saves money over multi-year periods because annual dues compound on unused service. Industry data consistently suggests average members use roadside benefits less than half a time per year. Pay-as-you-go costs zero dollars in those zero-call years.</p>
            <p><strong className="text-slate-900">Misconception: All jump-starters are the same.</strong> Consumer-grade jumper cables from the auto parts store can damage modern vehicle electronics when used incorrectly — voltage spikes during connection can fry the engine control unit, infotainment system, or various sensor circuits, leading to repairs that cost thousands of dollars. Professional commercial-grade jump packs include voltage protection, polarity protection, and spark suppression. The cost difference between consumer cables and a fried ECU repair is several thousand dollars.</p>
            <p><strong className="text-slate-900">Misconception: Slim jims are how lockouts are fixed.</strong> Slim jims are a relic of the 1980s and should not exist in modern roadside service. Modern vehicles have power window wiring, door lock motors, and side-impact airbag wiring inside the door panel that slim jims rake against and damage. Wedge-and-rod entry is the modern technique — it creates a small gap between door and frame without damaging anything, then uses a long-reach rod to operate the lock from inside. The whole process takes five to fifteen minutes for most vehicles without any damage.</p>
            <p><strong className="text-slate-900">Misconception: A tow truck is a tow truck.</strong> AWD vehicles require flatbed towing; wheel-lift towing damages the transfer case to the tune of two to five thousand dollars in repairs. Low-clearance sports cars require flatbed ramps; standard ramps scrape the front splitter or air dam. Vehicles with active suspension or air suspension require specific procedures to avoid damaging the suspension system. The right truck for the right vehicle matters more than most drivers realize.</p>
            <p><strong className="text-slate-900">Misconception: Running out of gas isn&apos;t a big deal.</strong> Running fully dry isn&apos;t catastrophic, but it isn&apos;t consequence-free either. The fuel pump is normally cooled by surrounding fuel inside the tank. When the tank goes dry, the pump runs hot for the last few minutes before the engine stalls. Doing this once shouldn&apos;t damage anything, but making a habit shortens the pump&apos;s life and leads to a three-hundred-to-eight-hundred-dollar replacement somewhere down the road. Diesel vehicles are worse: running a diesel dry often introduces air into the fuel lines that must be manually bled before the engine will start, even after fuel is added.</p>
            <p><strong className="text-slate-900">Misconception: Roadside service only matters for emergencies.</strong> Some of the most cost-effective use cases are planned: replacing a battery you know is failing before it strands you, getting a tire patched before a slow leak becomes a flat, having a fuel delivery for a vehicle that&apos;s been parked too long. Same flat rate for planned service as emergency service — no premium for planning ahead.</p>
          </div>
        </div>
      </section>

      {/* ─── EQUIPMENT & TRAINING ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Equipment &amp; Training</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Trained Technicians Actually Bring to a Call</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The difference between a contracted gig roadside operator and a trained technician shows up in the equipment loadout and the procedures. Every service vehicle in our network carries a standardized inventory tailored to the service types it handles. For passenger-vehicle roadside trucks, that loadout includes: commercial jump packs rated for diesel-pusher RVs and high-capacity gasoline vehicles (consumer cables damage modern electronics), a complete socket set with metric and imperial sizes, calibrated torque wrenches for proper lug torque, a portable air compressor for tire pressure adjustment, a comprehensive lockout kit with wedges and rods for every common vehicle make, plug kits for tread tire repair, approved fuel containers for gasoline and diesel delivery, hand tools for emergency battery terminal cleaning, and an inventory of common batteries (Group 24, 35, 48, 65, 78).</p>
            <p>Safety equipment is mandatory on every vehicle. Each tech wears ANSI-compliant Class 2 or Class 3 high-visibility apparel. Each vehicle carries reflective cones, road triangles, LED flashing warning lights for highway-shoulder positioning, and a fire extinguisher rated for automotive fires. For winter operations, each vehicle in cold-weather markets carries tire chains, an emergency blanket, a snow shovel, and traction sand for stuck-vehicle assists.</p>
            <p>Training is more involved than most customers realize. New technicians complete a multi-week paid training program covering safe roadside positioning, proper jump-start procedures for modern vehicles, lockout technique for current vehicle makes (the techniques have evolved as vehicle manufacturers have added security features), tire change protocols with locking-lug-nut handling, fuel system fundamentals for both gasoline and diesel vehicles, basic battery diagnostics, and customer communication standards. Specialty service training (motorcycle roadside, RV roadside, diesel-specific procedures) is additional certification on top of the base training.</p>
            <p>The training includes scenario practice. Technicians practice positioning for highway calls in different shoulder configurations. They practice lockouts on common vehicle makes until the technique is muscle memory. They practice jump-starts with deliberate failure scenarios (cables connected in wrong order, severely depleted battery, hybrid vehicle 12V auxiliary failure) so they know how to handle the situations that arise in the field.</p>
            <p>Ongoing training keeps technicians current as vehicle technology evolves. EV-specific procedures, hybrid-specific procedures, and modern vehicle security features change as manufacturers update their designs. We push quarterly training updates so the techs you call know how to handle the vehicle you actually drive — not just the vehicles that were common five years ago.</p>
            <p>Background checks happen before any technician is dispatched. Every technician on our network passes a criminal background check, a motor vehicle record check (to confirm clean driving history), and a drug screening. Repeat checks happen periodically throughout employment. We don&apos;t hire gig workers from a generic labor pool; the technician dispatched to your call is an employee or carefully-vetted partner operator with documented qualifications.</p>
          </div>
        </div>
      </section>

      {/* ─── PAYMENT, BILLING, DOCS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Payment &amp; Documentation</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Billing Actually Works</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Payment is collected when the service is complete, not before. The technician confirms the vehicle is back in operating condition (or, for tow calls, that it&apos;s delivered to the agreed destination), then presents a digital invoice on a tablet. The invoice shows the time worked, the flat-rate cost, any add-on costs (tow mileage past five included miles, fuel at pump price, replacement parts at retail), and the total.</p>
            <p>Payment methods accepted: all major credit cards (Visa, Mastercard, American Express, Discover), all major debit cards, Apple Pay, Google Pay, Venmo, Zelle, CashApp, and cash. For commercial fleet accounts, billing is consolidated into a monthly invoice with line-item detail per call. For insurance-claim scenarios after accidents, we generate documentation in formats accepted by major insurance carriers.</p>
            <p>A receipt is emailed automatically within minutes of payment completion. The receipt includes the date and time of service, the technician&apos;s name, the location of the service, a description of the work performed, the itemized cost, and the payment method used. This documentation is sufficient for expense reporting, rideshare platform downtime claims, insurance claims, fleet records, and tax purposes.</p>
            <p>For ratings disputes on rideshare platforms (Uber, Lyft) or delivery platforms (DoorDash, Instacart, Amazon Flex), we provide additional documentation including the dispatch timestamp, the on-scene arrival time, and the completion time. Platforms typically accept this documentation when drivers need to dispute a passenger rating or claim breakdown coverage from the platform&apos;s driver-protection insurance.</p>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            Real Reviews from Real Drivers
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            {RATING} Stars Across {REVIEW_COUNT} Verified Reviews
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex gap-1 text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg key={i} className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <p className="mt-4 text-xs font-semibold text-slate-900 font-cta">{t.name}</p>
                <p className="text-xs text-slate-500">{t.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INSURANCE ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-start">
            <div className="relative h-80 overflow-hidden rounded-xl">
              <Image src={SECTION_PHOTOS.serviceTruck.url} alt={SECTION_PHOTOS.serviceTruck.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Insurance &amp; Liability</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">If Something Goes Wrong, You&apos;re Covered</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-700 leading-relaxed">
                <p>Every technician on our network is background-checked before joining, certified in safe roadside procedures, and equipped with commercial-grade tools. Every service vehicle carries comprehensive commercial liability insurance.</p>
                <p>If your vehicle is damaged during a service call — a scratched rim during a tire change, a scuffed bumper during a tow hookup, a chipped paint corner during a winch-out — our liability insurance covers the repair at no cost to you. The technician documents the damage on scene, the claim is filed automatically through our insurance, and the repair is paid for. You don&apos;t fight an insurance company; we do.</p>
                <p>Certificates of insurance (COIs) are available on request for commercial fleet customers, dealerships, property management companies, and rental car operators. COIs include our general liability, commercial auto, workers&apos; compensation, and professional liability coverage. Coverage limits are documented in the COI and can be increased or named-additional-insured per customer requirements.</p>
                <p>Highway safety protocols are non-negotiable on every call. Technicians wear ANSI-compliant Class 2 or Class 3 high-visibility apparel, deploy reflective cones, position the service vehicle to shield the customer from traffic, and follow proper procedures for working in active traffic environments. For active-traffic-lane situations with no shoulder, we coordinate with police or highway patrol to shut down a lane or provide a flashing-light buffer before any work begins.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LOCAL TECHNICIANS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Local Knowledge</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why Local Technicians Matter</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The technician dispatched to your call is local. They live in your city, drive the same roads you drive, know the same highways, and have probably worked roadside calls in your specific neighborhood multiple times before. Local knowledge translates to better roadside service in several specific ways.</p>
            <p>For highway calls, local technicians know which interchanges and shoulders are safe to pull off on, which exits give the tech better positioning to shield your vehicle from traffic, which sections of which highways have decent cell signal versus dead zones, and which nearby exits lead to reputable shops if a tow becomes necessary. For dense urban calls — parking garage lockouts, parallel-parking dead batteries, calls in tight downtown alleys — local techs know the access constraints and bring the right equipment for tight working spaces.</p>
            <p>Regional knowledge matters too. In cold-weather markets, our techs are familiar with the specific battery failure patterns that show up during the first hard freeze each winter. In hot-weather markets, our techs see the specific tire blowout patterns from hot pavement and the AC-compressor failure cluster during August heat waves. In coastal hurricane markets, our techs know how to handle post-storm dispatch surges and which routes are typically passable after major weather events. In mountain markets, our techs are familiar with the overheating patterns on long climbs and the snow-stranded recovery work that&apos;s common during winter shoulder seasons.</p>
            <p>This local expertise is why our average response time is under sixty minutes in the cities we serve. It&apos;s not just that we dispatch fast — it&apos;s that the tech arriving knows the area well enough to take the fastest route, position safely, and complete the work efficiently. Compare that to a contracted auto-club dispatch where the tow operator may have driven thirty miles from a different town and is unfamiliar with your specific neighborhood.</p>
            <p>We hire and train locally in every market we operate. Our technicians are background-checked employees or carefully-vetted partner operators, not anonymous gig contractors. The continuity matters. Our fleet customers consistently report the same technicians appearing on their repeat calls, which builds familiarity with their specific vehicles, locations, and operational patterns.</p>
          </div>
        </div>
      </section>

      {/* ─── ALL 50 STATES ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            Coverage
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Nationwide Roadside in All 50 States
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5 text-sm">
            {STATES.map((state) => (
              <Link key={state} href="/locations" className="rounded px-3 py-2 text-slate-700 transition-colors hover:bg-white hover:text-emerald-700">
                {state}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MISSION ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Why We Exist</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">The Mission Behind The Roadside Helper</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-700 leading-relaxed">
                <p>The roadside assistance industry has been stuck in the same business model for nearly a century. Auto clubs sell annual memberships, contract out the actual work to local tow operators, and rely on the math that most members never use the service. The model survives because customers don&apos;t do the math — they pay the annual dues because that&apos;s what their parents did and what feels &quot;responsible.&quot;</p>
                <p>We started The Roadside Helper because that math doesn&apos;t work for most drivers anymore. Industry data consistently shows the average auto-club member uses the roadside benefit less than once per year. Most members go three or four years between calls. The annual dues add up to two-to-five hundred dollars over those years — for service that was used zero times or once.</p>
                <p>Pay-as-you-go inverts the equation. You owe nothing unless you actually need help. When you do need help, you pay only for the time we&apos;re on scene. The flat rate is the same regardless of when you call. Most calls finish inside the one-hour minimum, which means the minimum is also the maximum for the typical job.</p>
                <p>The other half of our mission is response speed. Auto-club average response times have crept past two and three hours in many markets — sometimes much longer during weather events. Drivers are tired of paying yearly dues and still waiting half a day for help. We dispatch our own network, which removes a layer of contractor handoff and consistently delivers sub-sixty-minute average response in the cities we serve.</p>
                <p>We&apos;re not trying to replace auto-club membership for the rare driver who genuinely calls roadside three-plus times per year and chooses a tier that covers those calls. That driver may still come out ahead with a membership. We&apos;re built for everyone else — the vast majority of drivers who use roadside service rarely or never, and who deserve to pay only when they actually need help.</p>
              </div>
            </div>
            <div className="relative h-96 overflow-hidden rounded-xl">
              <Image src={SECTION_PHOTOS.highwayUSA.url} alt={SECTION_PHOTOS.highwayUSA.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">FAQ</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Common Questions</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer list-none font-semibold text-slate-900 flex items-center justify-between font-heading">
                  {item.q}
                  <svg className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SAFETY ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Safety First</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Licensed, Bonded &amp; Insured in All 50 States
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { title: "Liability Insurance", body: "Every vehicle and tech is fully covered. If your vehicle is damaged during service, our insurance pays for repair at no cost to you." },
              { title: "ANSI Safety Gear", body: "High-visibility reflective gear, cones, and proper highway-side positioning on every roadside call." },
              { title: "Background-Checked Techs", body: "Every technician on our network passes a criminal background check before joining." },
            ].map((s) => (
              <div key={s.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHAT HAPPENS AFTER THE CALL ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">After the Call</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Happens After We Leave</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The service call doesn&apos;t end the moment payment is collected. Several things happen automatically after our technician leaves your location, all designed to give you documentation and recourse if something turns out to be wrong.</p>
            <p><strong className="text-slate-900">Immediate digital receipt.</strong> Within minutes of payment, you receive an itemized digital receipt by email and SMS. The receipt includes the date and time, the technician&apos;s name and ID number, the GPS-tagged service location, the work performed in plain language (not a generic &quot;service call&quot; line item), itemized charges, and the payment method. This receipt is suitable for expense reporting, insurance claims, rideshare platform downtime documentation, fleet records, and tax purposes.</p>
            <p><strong className="text-slate-900">Service quality follow-up.</strong> Twenty-four hours after your call, our system sends a short customer-experience survey by SMS. Most surveys take fifteen seconds to complete. The data goes directly to our quality team, who reviews any low-rated calls within forty-eight hours. If something went wrong on your call, we want to know — and we want to make it right.</p>
            <p><strong className="text-slate-900">Same-issue warranty.</strong> If we performed a service and the same issue recurs within forty-eight hours, our return visit is free. A jump-start that didn&apos;t hold because the battery was failing harder than the initial test indicated, a tire plug that didn&apos;t seat properly, a lockout where the door re-locked itself due to a glitch in the door electronics — we come back at no charge to diagnose and resolve. This warranty applies to the specific service performed, not to unrelated issues that develop separately.</p>
            <p><strong className="text-slate-900">Damage documentation.</strong> If your vehicle was damaged during a service call — which is rare but possible, especially on tow hookups in tight spaces — our technician documents the damage on scene with photos before leaving. The damage claim is filed automatically through our commercial liability insurance. You don&apos;t fight an insurance company; we do. The repair is paid for at no cost to you.</p>
            <p><strong className="text-slate-900">Permanent service history.</strong> Every call you make to The Roadside Helper is logged in your account history (if you have a customer account) or against your phone number. When you call again, the dispatcher can see your previous service history and reference it during the call. This is especially useful for fleet customers who want service-history reports for specific vehicles or drivers, or for insurance claim documentation when establishing patterns of vehicle issues.</p>
          </div>
        </div>
      </section>

      {/* ─── WHY SPEED MATTERS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Why Speed Matters</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">The Real Cost of Slow Roadside Response</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Auto-club roadside response times have crept past two and three hours in many markets — and longer during weather events. That delay isn&apos;t just inconvenient. It has real costs that compound the longer the wait extends.</p>
            <p><strong className="text-slate-900">Safety risk increases with time on the shoulder.</strong> A vehicle parked on a highway shoulder is in a more dangerous position than a vehicle moving in a travel lane. Highway-shoulder fatalities — drivers and passengers struck by passing vehicles while waiting for help — are documented annually in transportation safety statistics. The longer you wait beside a highway, the higher the cumulative risk. Sub-sixty-minute response gets you out of the danger zone faster.</p>
            <p><strong className="text-slate-900">Weather exposure compounds.</strong> A breakdown in mild weather is uncomfortable. A breakdown in freezing temperatures with a dead heater, or in hundred-degree heat with no AC, is dangerous. Hypothermia and heat illness develop faster than most people realize. Children, elderly passengers, and pets in the vehicle are at higher risk. Slow response can turn a routine breakdown into a medical emergency.</p>
            <p><strong className="text-slate-900">Income loss accelerates for working drivers.</strong> For rideshare drivers, delivery drivers, and commercial fleet operators, every hour stranded is direct income loss. A three-hour auto-club wait costs a rideshare driver roughly seventy-five dollars in lost earnings (industry average earnings during peak hours). A sub-sixty-minute response from us costs them roughly twenty-five dollars in lost earnings. The math on response time has direct dollar value for working drivers.</p>
            <p><strong className="text-slate-900">Vehicle-damage risk increases.</strong> A car left running while waiting for a jump-start (because the alternator might be failing and shutting off the engine could leave you fully stranded) uses fuel and adds engine wear. A flat tire driven on at low speed to reach a safer location accelerates damage to the rim. A car overheating that&apos;s being kept running because the owner wasn&apos;t sure what to do can crack the head gasket. Faster service means faster decision points about what to do with the vehicle.</p>
            <p><strong className="text-slate-900">Stress compounds.</strong> The psychological cost of long waits matters too. A driver stranded for thirty minutes with a clear ETA is annoyed. A driver stranded for three hours with vague &quot;someone will be there eventually&quot; messaging is panicked, dehydrated, and considering bad decisions. Sub-sixty-minute response with real-time ETA updates dramatically reduces the stress component of the breakdown experience.</p>
            <p>Our average response time is under sixty minutes in the cities we serve. Some markets average forty minutes, some average fifty-five minutes — depending on call density and geography. The dispatcher gives you a real ETA based on the nearest available tech&apos;s current location, not a generic estimate. If a faster ETA is available, we say so. If realistic timing is longer than the average, we say that too. Honest ETAs beat optimistic ETAs every time.</p>
          </div>
        </div>
      </section>

      {/* ─── INDUSTRY STATISTICS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">By the Numbers</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Roadside Assistance Industry Statistics</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The roadside assistance industry doesn&apos;t love publishing the data behind its economics. The numbers don&apos;t make a strong case for annual membership models. Here&apos;s what the available data actually says.</p>
            <p><strong className="text-slate-900">Average member usage:</strong> roughly 0.4 calls per year per member. More than half of all auto-club members go a full year without using their roadside benefit. Industry surveys consistently show that the &quot;peace of mind&quot; argument is the dominant retention factor, not actual service usage. Members renew because canceling feels risky, not because they&apos;re actively using the benefit.</p>
            <p><strong className="text-slate-900">Average auto-club annual dues:</strong> eighty to one hundred and twenty dollars for the basic tier in 2025. Premium tiers run one hundred and forty to two hundred dollars. Multi-vehicle discounts are common but often less significant than the discount marketing suggests.</p>
            <p><strong className="text-slate-900">Average roadside response time:</strong> industry surveys put the average at roughly two hours and fifteen minutes. Peak demand windows (winter storms, holiday weekends, severe weather events) regularly exceed four to six hours in affected markets. Our network averages under sixty minutes in the cities we serve and surges capacity during predictable demand peaks.</p>
            <p><strong className="text-slate-900">Most common call types:</strong> jump-starts account for approximately forty percent of all roadside calls industry-wide, followed by lockouts (eighteen percent), flat tires (sixteen percent), tows (twelve percent), fuel delivery (eight percent), and miscellaneous (winch-outs, battery replacement, mechanical issues — six percent combined).</p>
            <p><strong className="text-slate-900">Seasonal patterns:</strong> January and February consistently see the highest call volume nationally, driven by cold-weather battery failures. July and August are second-highest, driven by heat-related tire and battery failures plus AC compressor issues. April and October are the lowest-volume months on average. Hurricane season in the Southeast (June through November) produces sharp localized spikes that pull regional response averages up significantly.</p>
            <p><strong className="text-slate-900">Vehicle age vs. call rate:</strong> vehicles under three years old generate roughly half the roadside calls per vehicle compared to vehicles seven-plus years old. Battery and tire failures are the dominant differentiators — newer vehicles have newer components and fewer issues, while older vehicles accumulate component wear that increases failure rates.</p>
            <p><strong className="text-slate-900">EV-specific data:</strong> electric vehicles generate roughly thirty percent fewer roadside calls per vehicle compared to gasoline vehicles of equivalent age, primarily because EVs have far fewer fluid-based mechanical systems that fail. The dominant EV roadside call is range depletion (running out of charge before reaching a charging station), which requires a tow to the nearest charger rather than a roadside fix.</p>
          </div>
        </div>
      </section>

      {/* ─── HELPING SOMEONE ELSE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Helping a Friend</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What to Do If Someone You Know Is Stranded</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Sometimes the call comes from someone else — a family member calls because a relative is stranded, a friend reaches out because their friend&apos;s phone died, a manager calls because an employee broke down on a delivery run. The dispatcher handles these calls the same way as direct calls, with a few additional considerations.</p>
            <p><strong className="text-slate-900">Booking on someone else&apos;s behalf.</strong> You can book a roadside call for another driver. The dispatcher needs the stranded driver&apos;s contact information (the technician calls the driver directly with the ETA), the stranded driver&apos;s exact location, and the vehicle details. Payment can be processed on your card; the receipt can be sent to either of you. This is especially common for parents of teen or young-adult drivers, family members helping elderly relatives, and managers handling fleet vehicle situations.</p>
            <p><strong className="text-slate-900">When the stranded driver has no phone.</strong> If a driver&apos;s phone is dead or out of cell range, we work with whatever contact channel is available. A family member can serve as the relay between us and the stranded driver. The technician can also use the police-coordination procedure if the driver is in a genuinely dangerous location without cell service — local police can radio the driver&apos;s location to us through the technician&apos;s mobile dispatch.</p>
            <p><strong className="text-slate-900">Stay-with-driver scenarios.</strong> Many callers ask whether they should drive to the stranded driver&apos;s location themselves. The honest answer is: it depends. For breakdowns in safe locations (parking lots, low-traffic neighborhoods, suburban driveways), driving to provide company while waiting is fine and often welcomed by the stranded driver. For breakdowns in dangerous locations (highway shoulders, active traffic lanes, severe weather), driving to the location adds a second vehicle to a hazardous situation and rarely helps. The dispatcher can advise based on the specific situation.</p>
            <p><strong className="text-slate-900">Paying for a friend or family member&apos;s call.</strong> If you want to cover the cost for someone else but not be physically present, the dispatcher can quote the call, lock in your payment authorization, and dispatch the technician to the stranded driver. The stranded driver doesn&apos;t need to handle payment on scene. The technician confirms the work is complete with the stranded driver, and the receipt is emailed to whichever address you specify.</p>
          </div>
        </div>
      </section>

      {/* ─── BREAKDOWN PREVENTION ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Prevention</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How to Avoid Most Roadside Calls in the First Place</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>We make money when drivers need us. But the honest truth is that most roadside calls are avoidable with a few simple habits, and we&apos;d rather help you avoid the breakdown than collect a fee for fixing one. Here&apos;s the short list of habits that prevent roughly seventy percent of the calls we dispatch.</p>
            <p><strong className="text-slate-900">Test your battery in October.</strong> Cold weather is the single biggest cause of roadside calls in winter markets. A battery that&apos;s marginal in fall will be dead in January. Auto-parts stores test batteries for free in under a minute. If yours tests below seventy-five percent capacity, replace it before the first cold snap. The fifteen-minute investment in a fall battery test prevents far more dead-battery calls than any other single habit.</p>
            <p><strong className="text-slate-900">Check tire pressure monthly.</strong> Tires lose pressure over time even without leaks, and the rate of loss accelerates with temperature swings. Monthly checks with a five-dollar gauge from the auto-parts store catch slow leaks before they become flats, catch underinflation before it causes uneven wear, and keep fuel economy at optimal. The whole check takes under three minutes for a four-tire vehicle.</p>
            <p><strong className="text-slate-900">Don&apos;t run the fuel tank below a quarter.</strong> Running on empty risks fuel pump damage from heat, accelerates the deposit buildup that clogs fuel filters, and introduces water condensation into the fuel system from the empty space in the tank. Top up at a quarter tank as a habit. The fuel pump replacement costs three to eight hundred dollars; the discipline of topping up costs nothing.</p>
            <p><strong className="text-slate-900">Keep a spare key somewhere accessible.</strong> A hidden spare key in a magnetic box on the vehicle frame, a spare with a trusted neighbor, or a spare in a desk at work prevents the lockout that happens at the worst possible time. The five minutes it takes to set up a backup option saves the eighty-plus minutes of stranded waiting that a lockout typically requires.</p>
            <p><strong className="text-slate-900">Carry a basic emergency kit.</strong> Blanket, flashlight, phone power bank, small first aid kit, bottled water, hand warmers in winter regions. The kit lives in the trunk year-round and turns a stressful breakdown into a manageable wait. The whole kit costs under forty dollars to assemble and lasts years.</p>
            <p><strong className="text-slate-900">Pay attention to early warning signs.</strong> Slow cranking in the morning means the battery is dying. Vibration at highway speed means a tire is failing or a wheel is unbalanced. Dashboard warning lights mean something specific — look up the codes; they&apos;re informative. Strange smells mean something is leaking. Strange sounds mean something is wearing. Cars communicate their problems for weeks or months before they catastrophically fail. Drivers who pay attention catch the issues during business hours at a shop they trust; drivers who ignore the signs catch them on the highway shoulder at 2am.</p>
          </div>
        </div>
      </section>

      {/* ─── CALLING IS THE FIRST STEP ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Final Word</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Calling Us Is the First Step. We Handle the Rest.</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>The moment you call, the work of getting you back on the road becomes our job. The dispatcher captures the essentials, identifies the closest qualified technician, sends them your details, and provides you with an ETA. Throughout the wait, you have the dispatcher available for follow-up questions and the technician available for direct communication once they&apos;re en route. On arrival, the technician handles the actual repair work while you stay safe and comfortable.</p>
            <p>The pricing is predictable: a flat one hundred dollars per hour with a one-hour minimum. The response time is fast: under sixty minutes on average in the cities we serve. The technicians are qualified: licensed, bonded, insured, and trained on the specific service type you need. The documentation is thorough: receipts, service history, damage coverage, all generated automatically and emailed within minutes. The follow-up is real: same-issue warranty, customer-experience survey, and a quality team that reviews issues within forty-eight hours.</p>
            <p>If you&apos;re stranded right now, the next step is the phone call. <a href={PHONE_HREF} className="text-emerald-700 font-semibold hover:underline">{PHONE}</a> connects you directly to a real dispatcher within seconds. If you&apos;re planning ahead — researching options for the future, comparing roadside service providers, or considering whether to cancel an auto-club membership — the math we&apos;ve laid out throughout this page reflects what your real costs and response times look like in actual practice. Pay-as-you-go is the more honest model for the way most drivers actually use roadside service. We built The Roadside Helper to be that honest option. When you need us, we&apos;re here.</p>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM CTA ─── */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">
            Stranded Right Now?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Call {PHONE} for the fastest dispatch. We&apos;re picking up 24 hours a day, every day.
            {" "}{HOURS}.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg bg-amber-400 px-8 py-3.5 text-base font-semibold text-slate-900 font-cta hover:bg-amber-300">Call {PHONE}</span>
            </a>
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white font-cta hover:border-white/70">Text {PHONE}</span>
            </a>
            <Link href="/book-roadside-help-now">
              <span className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white font-cta hover:border-white/70">Book Online</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}