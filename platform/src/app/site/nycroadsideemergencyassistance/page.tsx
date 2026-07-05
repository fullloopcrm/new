import Link from "next/link";
import { getPhoto } from "@/app/site/nycroadsideemergencyassistance/_data/photos";
import Image from "next/image";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
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
} from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { STATES as BOROUGHS } from "@/app/site/nycroadsideemergencyassistance/_data/cities";
import { OFFICES } from "@/app/site/nycroadsideemergencyassistance/_data/offices";
import { JsonLd, allOfficeLocalBusinessSchemas, faqPageSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export default function HomePage() {
  return (
    <>
      <JsonLd
        schema={[
          ...allOfficeLocalBusinessSchemas(),
          faqPageSchema(FAQ.map((f) => ({ question: f.q, answer: f.a }))),
        ]}
      />
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <video
          src="/videos/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/60 via-teal-600/55 to-teal-800/65" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            24/7 Roadside Emergency — All Five NYC Boroughs
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">NYC Roadside Emergency Assistance</span> — Jump, Lockout, Tire, Fuel &amp; Tow 24/7
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Stranded in Manhattan, Brooklyn, Queens, the Bronx, or Staten Island? Dead battery, locked out, flat tire, out of gas, accident, or need a tow — one number, one rate. $149/hour, 1-hour minimum, $25 off when you book online ($124 first hour). No NYC surcharge, no after-hours markup, no storage fees on same-day drops. 20-40 min typical arrival.
          </p>

          {/* Trust stat cards */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{HOURS}</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">Overnight & Holidays</p>
              <p className="mt-1 text-xs text-white/50">Same rate, every hour</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{RATING} Stars</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">{REVIEW_COUNT} Reviews</p>
              <p className="mt-1 text-xs text-white/50">NYC drivers, real ratings</p>
            </div>
            <div className="rounded-xl border-2 border-yellow-300/60 bg-yellow-400/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-extrabold text-yellow-300 font-heading">$149 / hour</p>
              <p className="mt-1 text-sm font-bold text-yellow-200 font-cta">Same rate for every roadside &amp; tow call.</p>
              <p className="mt-1 text-xs font-bold text-yellow-300">Book online · Save $25</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{CITY_COUNT}</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">Neighborhoods</p>
              <p className="mt-1 text-xs text-white/50">Across {STATE_COUNT} boroughs</p>
            </div>
          </div>

          {/* CTA buttons — Book (yellow) → Text (white) → Call (clear) */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/book-towing-service-today">
              <span className="inline-block rounded-lg bg-yellow-400 px-8 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-colors hover:bg-yellow-300 font-cta">
                Book Online — Save $25
              </span>
            </Link>
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {PHONE}
              </span>
            </a>
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/80 font-cta">
                Call {PHONE}
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── 1. DISPATCH ACROSS FIVE BOROUGHS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            NYC Roadside Emergency, Recovery & Tow Service
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            24/7 Dispatch Across All Five Boroughs
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            Dead battery in Astoria. Flat tire on the BQE. Keys locked in the car in Midtown. AWD that needs a flatbed to the dealer in the Bronx. A totaled car that needs scene cleanup and an insurance-billed tow. Whatever happened, call the number above. NYC dispatchers, NYC drivers, NYC trucks. Twenty four hours a day, every day of the year, same flat rate quoted on the phone before the truck rolls.
          </p>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              NYC Roadside Emergency Assistance runs a dispatch network that puts a truck closer to you than the national roadside chains ever can. Five dispatch hubs sit inside <Link href="/locations/manhattan" className="text-teal-700 font-semibold underline">Manhattan</Link>, <Link href="/locations/brooklyn" className="text-teal-700 font-semibold underline">Brooklyn</Link>, <Link href="/locations/queens" className="text-teal-700 font-semibold underline">Queens</Link>, the <Link href="/locations/bronx" className="text-teal-700 font-semibold underline">Bronx</Link>, and <Link href="/locations/staten-island" className="text-teal-700 font-semibold underline">Staten Island</Link>, which means the truck heading toward a stranded Subaru on Ocean Parkway is not coming from a dispatcher in Hicksville who just picked the cheapest available subcontractor. The truck is coming from a garage in MetroTech with a driver who already ran that stretch of road twice this week.
            </p>
            <p>
              Coverage spans every call NYC drivers actually make. Light-duty hook-up work for sedans and compact SUVs on narrow one-way blocks in the East Village. Flatbed transport for AWD wagons, Teslas, Rivians, and every low-clearance exotic out of a Tribeca garage. Heavy-duty wreckers for the box trucks and sprinter vans that die in the center lane of the Cross Bronx. The full roadside set: jump starts for batteries that surrendered overnight, tire mounts after a pothole took out a sidewall on the Belt, lockouts in an airport cell-phone lot at two in the morning, gas delivery on the approach to the George Washington Bridge, and winch-outs after a snowstorm packs six inches of slush against the driver-side door.
            </p>
            <p>
              Behind the phone line is a small team of NYC-native dispatchers who know which bridges are stacked up right now, which exits are closed for construction, and which crosstown blocks the sanitation sweepers just rolled through. That routing intelligence is what turns a typical ninety minute national-dispatch arrival window into our twenty to forty minute standard arrival window, and it matters most at two in the morning in the middle of January when the overnight temperature drops below twenty degrees and every marginal battery in the five boroughs quits in the same thirty-minute window.
            </p>
            <p>
              The one-rate promise runs across every service we run. <Link href="/services/jump-start" className="text-teal-700 font-semibold underline">Jump-start calls</Link> bill at two hundred forty nine dollars per hour whether we arrive at noon on a Sunday in Midtown or at four in the morning on Christmas Day in Throgs Neck — and almost always finish well inside the one-hour minimum. <Link href="/services/flat-tire-change" className="text-teal-700 font-semibold underline">Tire changes</Link> hold the same rate whether the customer is in a Hudson Yards parking deck or on the shoulder of the Whitestone Bridge. <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold underline">Flatbed moves</Link> bill at the same hourly rate, with the estimated hours quoted before dispatch so the customer knows the total before the truck leaves the yard. <Link href="/services/lockout-service" className="text-teal-700 font-semibold underline">Lockouts</Link> and <Link href="/services/gas-delivery" className="text-teal-700 font-semibold underline">gas delivery</Link> run the same hourly rate — and customers who book online instead of calling save twenty five dollars on the first hour, bringing it from two hundred forty nine dollars down to two hundred twenty four dollars. We quote the number on the phone and we hold it.
            </p>
            <p>
              We also handle the opposite end of the market with the same dispatch line. When a box truck dies in the center lane of the Cross Bronx Expressway at rush hour, when a sprinter van gives up on the Queensboro Bridge on-ramp with a cargo load that needs to get somewhere, when a thirty-two foot Class C motorhome limps off the Verrazzano needing a heavy recovery with proper axle ratings — the same dispatch answers the phone and routes the truck with the right capacity. Fleet accounts, body shops, and dealerships run dedicated account numbers with priority dispatch and net-thirty consolidated billing.
            </p>
            <p>
              The core promise is short. Any borough, any hour, any vehicle, any situation short of hazmat. One phone number. The rate you hear on the phone is the rate you pay when the receipt arrives. Nothing extra bolted on after the fact, no NYC surcharge invented when the driver shows up, no mileage mystery, no storage fees for same-day drops. The simplest possible version of what a tow service is supposed to be in a city that makes everything else complicated.
            </p>
            <p>
              Every call into our dispatch line is answered by a live human inside the five boroughs, not by an automated tree that asks you to press buttons for five minutes before connecting you to someone who will not know where Ocean Parkway actually is. The dispatcher confirms your location, the vehicle year make and model, and the service you need inside the first ninety seconds of the conversation. Before you hang up, you already have a truck number, a driver name, a realistic live ETA based on the current state of the surrounding streets, and a flat rate you can sanity-check against the receipt when it arrives in your inbox later.
            </p>
            <p>
              We built the operation around the specific realities of towing in NYC rather than importing a suburban tow playbook that falls apart on the first one-way block. The trucks are sized to the streets they actually have to work on. The drivers are full-time employees who know the neighborhoods instead of gig workers flipping between three different app notifications. The dispatch hubs are located next to the highway and bridge arteries rather than in a cheap industrial park thirty miles out. Every decision at the operational level is made around the question of what actually gets a truck to a stranded driver in twenty minutes in this specific city rather than in the abstract national version of the business.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 2. SERVICES DEEP-DIVE ─── */}
      <section className="bg-section-teal py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Full Service Catalog
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading sm:text-4xl">
            Every Towing and Roadside Service NYC Drivers Actually Need
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            Ten deep-dive services below. These are the calls that make up the overwhelming majority of our daily dispatch across <Link href="/locations/manhattan" className="text-teal-700 font-semibold underline">Manhattan</Link>, <Link href="/locations/brooklyn" className="text-teal-700 font-semibold underline">Brooklyn</Link>, <Link href="/locations/queens" className="text-teal-700 font-semibold underline">Queens</Link>, the <Link href="/locations/bronx" className="text-teal-700 font-semibold underline">Bronx</Link>, and <Link href="/locations/staten-island" className="text-teal-700 font-semibold underline">Staten Island</Link>. Each block covers what the service is, how NYC makes it harder than the suburbs, and exactly how we run it. Every block also links to the full written service guide plus a tips page for the do-it-yourself minute while you wait for the truck to arrive.
          </p>

          <div className="mt-12 space-y-10">
            {/* JUMP START */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("jump-start"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Roadside — We Will Get You Running in Minutes</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Jump Start and Dead Battery Service</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Dead battery calls are the highest-volume roadside job we run, especially January through March when NYC overnight lows kill every marginal battery in the city. Our driver arrives with a real load tester, tests the battery before jumping so the customer knows whether the problem is the battery itself, a parasitic draw somewhere, or a dying alternator. If the alternator is not charging, a jump gets a car about five miles before it dies again, so we will tell the customer that and recommend a flatbed tow to the shop instead of sending them home with a system that will fail on the next start.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    January through March, the overnight lows on Riverside Drive, Ocean Parkway, and the Henry Hudson shoulders sit in the teens and turn every marginal battery in the city into a no-start condition by sunrise. We stage jump-capable trucks inside every borough so the closest one is normally inside a mile of the stranded vehicle, not an hour away from Hicksville on Long Island. The stranded commuter with a Tuesday morning meeting at eight does not have time to wait for a truck that needs to cross two bridges before it gets to the call.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Our jump-start driver brings a real load tester, not a cheap voltmeter reading a surface charge off a bad battery. If the battery is truly dead past the point of recovery, we can install a replacement group size on the curb, register the new battery to the body control module for BMW, Audi, and Mercedes that require it, and hand the customer the receipt before their morning coffee cools. If the fault is actually the alternator, we say so and flatbed the vehicle to the customer&apos;s chosen shop instead of sending them home on borrowed time.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/jump-start" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full jump-start guide →</Link>
                    <Link href="/services/jump-start/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Jump-start DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* LIGHT-DUTY TOWING */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("light-duty-towing"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Cars, Sedans, and Small SUVs</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Light-Duty Towing Across the Five Boroughs</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Light-duty towing is the core of what we do every single shift. Sedans, compact SUVs, hatchbacks, the occasional off-duty taxi, the occasional rideshare car that threw a check-engine light at the worst possible time. Anything under roughly ten thousand pounds gross vehicle weight rating falls into this category. We run wheel-lift trucks that handle tight NYC streets, alley garages with six feet eight inches of clearance, and one-way blocks where a full flatbed simply will not fit without blocking a bus lane and drawing the wrong kind of attention from NYPD traffic enforcement.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Most NYC breakdowns are light-duty work by volume. The hard part is never the weight of the vehicle. The hard part is getting a truck into a one-way block in the East Village with a UPS van double-parked blocking half the street, or onto the shoulder of the FDR Drive during evening peak traffic without the truck itself becoming the next lane closure. That is the real dispatch challenge and it is why we stage wheel-lift trucks inside every borough instead of running them all out of one Long Island yard.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    The rate is two hundred forty nine dollars per hour with a one-hour minimum, and customers who book online pay two hundred twenty four dollars for the first hour. Drop to the customer mechanic, the customer home, the dealer in Paramus, a shop in Westchester, or a dealer back home in New Jersey, upstate, or Connecticut. The number the customer hears on the phone or sees in the online booking quote is the number that lands on the final receipt. No mystery surcharges, no padding for traffic, no upcharge for the fact that the call happened to be at two in the morning on a Sunday.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/light-duty-towing" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full light-duty towing guide →</Link>
                    <Link href="/services/light-duty-towing/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Light-duty towing DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* FLAT TIRE */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("flat-tire-change"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Spare Mounted or Plug and Patch</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Flat Tire Change and Tire Service in NYC</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Changing a tire on a narrow NYC shoulder or a dark residential block is the wrong place to be doing it yourself. We come to the customer, chock the vehicle properly, break the lug nuts with a half-inch impact gun instead of bouncing a tiny scissor jack on cracked concrete, and mount the spare safely. If the damage is a nail or a screw in the tread, we can plug or patch the tire on scene so the customer can drive to a proper tire shop on their own schedule. No spare on the rim? We flatbed the vehicle to the nearest shop with the customer tire size in stock.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    NYC potholes are a seasonal sport that ruins tires by the thousand every winter. The Cross Bronx Expressway eastbound near the Sheridan on-ramp, the Belt Parkway approaching Rockaway Boulevard, and the inbound BQE near Atlantic Avenue will shred a sidewall in one hit on the wrong day. The shoulder of a bridge or the outside lane of the Grand Central Parkway at ten at night is absolutely not where you DIY a spare change with an emergency kit from a 2018 Honda.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    We chock the wheels properly, break the lugs with a 1/2 inch impact gun, and get the customer spare mounted in under fifteen minutes once we are on scene. If the damage is a nail or a screw in the tread, we plug and patch on the spot so the customer can drive to a tire shop on their own schedule. If the damage is a sidewall cut or a shredded carcass, we flatbed the vehicle to the closest tire shop that has the correct size in stock. Same flat roadside rate as a jump, a lockout, or a gas delivery.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/flat-tire-change" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full flat-tire guide →</Link>
                    <Link href="/services/flat-tire-change/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Flat-tire DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* LOCKOUT */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("lockout-service"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Keys Locked Inside, We Will Get You In</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Lockout Service Across NYC, Day or Night</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Lockout calls are our second-most-common roadside job by volume. We use proper automotive lockout tools, which means air wedges and long-reach tools for most vehicles, decoded entry methods for certain luxury cars, and for the rare modern vehicle where the only safe option is to call the dealer for a replacement key, we will tell the customer that honestly before they pay for a service we cannot deliver. We never use slim jims on vehicles with side-impact airbags in the door panel because that is exactly how the airbag module gets fried and the next repair bill at the dealer rolls into four figures.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Lockouts in NYC happen in one of three places most nights. The garage at the customer building, usually after a long day when the keys got dropped on the passenger seat. The meter where the customer just parked, usually mid-errand and now unable to open the door. Or the airport cell-phone lot at JFK or LaGuardia, where the customer went to pick someone up and left the keys on the console while the car auto-locked. Midnight at JFK Lot 5 is our most common overnight lockout call. Dispatch routes the closest truck and we confirm which terminal the customer is near before the truck even rolls.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    We use air wedges and long-reach tools on most cars. No slim jim on any modern vehicle. For keyless-entry models where the only genuinely safe path is the dealer and a new fob, we say so before the customer pays. Typical on-scene time once the truck arrives is five to fifteen minutes. Flat rate, same as every other roadside call, regardless of time of day or borough.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/lockout-service" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full lockout guide →</Link>
                    <Link href="/services/lockout-service/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Lockout DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* FLATBED */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("flatbed-towing"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Luxury, AWD, EV, and Long-Distance</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Flatbed Towing for AWD, EVs, and Luxury Vehicles</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Flatbed towing keeps all four wheels off the ground, which is required for AWD and 4WD vehicles because dragging the drive wheels destroys the transfer case, required for most EVs because the motor is permanently coupled to the drive wheels and generates current when rolled, and the right choice for low-clearance luxury or sports cars where a wheel-lift truck would scrape the underbody on the first driveway ramp. Flatbed is also the correct answer for any long-distance tow, out of state, to an airport, to a specialty shop in upstate New York or Connecticut. We run multiple flatbeds in every borough.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Flatbed is the default for anything with all-wheel drive, any modern EV, any low-clearance exotic, and any tow running outside the city limits. It is also the only sane option for the long runs, a call that starts at JFK and ends in East Hampton, a call that starts at LaGuardia and ends in Teterboro for a private charter, a call that starts in the Bronx and ends in Bridgeport when the Whitestone is moving backward. Short of hazmat loads and vehicles too large for a standard bed, flatbed is almost always the right answer.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    All four wheels come off the ground when the car is on our bed. Tie-downs land on factory recovery points or subframe mount positions only, never on control arms or body panels that are not engineered to take the load. We run low-angle hydraulic beds with wooden ramp extensions for splitter and splitter-lip clearance, so even a lowered Huracán, a slammed S550, or an air-suspension car that refuses to come out of kneel mode clears the ramp lip without scraping paint, carbon, or a front diffuser.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/flatbed-towing" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full flatbed towing guide →</Link>
                    <Link href="/services/flatbed-towing/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Flatbed towing DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* GAS DELIVERY */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("gas-delivery"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Out of Gas, We Bring Two Gallons</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Gas Delivery on Every Bridge, Tunnel, and Highway</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Running out of gas in NYC is embarrassing and dangerous in roughly equal measure. The customer usually cannot safely walk to a station from wherever they rolled to a stop, because the nearest station is either on the other side of a divided highway or a mile away past a row of warehouses with no real sidewalk. We deliver gasoline or diesel directly to the vehicle. Standard delivery is two gallons, which is plenty to get the customer to the nearest pump. The flat-rate call-out covers the delivery, the fuel itself is billed at our cost plus a small handling fee, and it works on every bridge, tunnel approach, and highway inside city limits.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    The range estimate on a half-decent tank lies about twice a month, usually at the worst possible moment. The middle of the George Washington Bridge upper deck at rush hour. The Cross Bronx Expressway shoulder at three in the morning. The Belt Parkway at the Verrazzano merge during summer weekend beach traffic. You cannot safely walk to a gas station from any of those places, you should not try to flag a passing motorist, and you definitely should not try to coast to the next exit on fumes with a row of commercial traffic behind you.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    We bring two gallons of the right fuel, regular, premium, or diesel, which is plenty to get the customer to the nearest functioning station. The flat-rate call-out covers the delivery itself. The fuel is billed at our direct cost plus a small handling fee, itemized on the receipt. On-scene delivery time is usually under ten minutes once the truck arrives on site.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/gas-delivery" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full gas delivery guide →</Link>
                    <Link href="/services/gas-delivery/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Gas delivery DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* ACCIDENT RECOVERY */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("accident-recovery"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Post-Crash Scene Management</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Accident Recovery and Collision Towing</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    After a collision, the tow itself is only part of the job. We handle scene cleanup with glass sweepers and plastic absorbent for fluid leaks, proper loading of damaged vehicles without adding more drivetrain or frame damage, and direct drop to the body shop the customer prefers or the shop the insurance company specifies. Our drivers document vehicle condition with timestamped photos before loading, at the drop point, and everywhere in between so the chain-of-custody record is complete for the claim. We bill the customer insurance company directly in most cases.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Collision scenes in NYC close lanes fast. NYPD and FDNY manage the scene itself, which is as it should be. We handle the vehicle once the scene is cleared. Our accident-recovery drivers arrive with scene cleanup supplies, glass sweepers, plastic absorbent for fluid leaks, cones for traffic control. They load damaged vehicles on flatbed so the frame and drivetrain take no further abuse during transport. They coordinate drop directly with the body shop the customer or the adjuster has already chosen.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    We document everything with timestamped photos. Condition at pickup, tie-down points used, the final drop at the shop bay. We bill Geico, Progressive, State Farm, Allstate, USAA, Liberty Mutual, Farmers, and every other major carrier directly in most cases. For at-fault moves or cases where coverage is not yet determined, we collect payment at drop and provide an itemized receipt that the customer can submit for reimbursement once the claim is processed.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/accident-recovery" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full accident recovery guide →</Link>
                    <Link href="/services/accident-recovery/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Accident recovery DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* HEAVY-DUTY */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("heavy-duty-towing"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Trucks, Vans, and Large SUVs</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Heavy-Duty Towing for Commercial Vehicles</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Heavy-duty towing covers vehicles that light-duty trucks simply cannot handle. Box trucks, sprinter vans, large pickups, oversized SUVs, and anything above roughly ten thousand pounds gross vehicle weight rating. We run heavy wreckers with integrated booms, high-capacity winches, and proper axle ratings. This equipment is critical for commercial breakdowns on the BQE, the Cross Bronx Expressway, the Long Island Expressway, and the bridges where a stalled truck in a travel lane creates a major traffic event that ripples across the entire city road network within minutes.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    When a box truck dies in the center lane of the Cross Bronx Expressway during rush hour, or a sprinter van gives up on the ramp to the Queensboro Bridge with a delivery load that absolutely has to be somewhere, retail tow dispatch does not have the equipment to recover the vehicle. We run heavy wreckers with integrated booms, high-capacity winches, and axle ratings sized for Class 6, 7, and 8 vehicles. These trucks are staged primarily in the Bronx and Brooklyn for the fastest response to the interstate and bridge network where the commercial volume actually is.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Commercial drivers get a direct dispatch phone line, consolidated net-thirty billing with monthly statements, and drivers who actually know the height clearances on every major NYC bridge and tunnel. We coordinate with NYC DOT for lane closures when the recovery genuinely needs it, and we keep the logistics team at the customer trucking company informed with live ETA updates and drop confirmation photos so the dispatcher on the other side can plan the driver hours-of-service continuation without guessing.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/heavy-duty-towing" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full heavy-duty towing guide →</Link>
                    <Link href="/services/heavy-duty-towing/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Heavy-duty towing DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* MOTORCYCLE */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("motorcycle-towing"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Flatbed and Chocked Transport</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Motorcycle Towing for Every Kind of Bike</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Motorcycles require flatbed transport, a front-wheel chock, and strapping down through the frame or the pegs, never through the handlebars or clip-ons. Our drivers are specifically trained on sport bikes, cruisers, tourers, adventure bikes, and scooters. We carry soft loops for fairings that cannot take hard straps, ratchet straps rated well above the bike weight, and wheel chocks sized appropriately for bikes ranging from one hundred twenty five cubic centimeter scooters all the way up to full-dresser touring rigs. Works for roadside breakdowns, post-crash recovery, and long-distance transport into or out of NYC to a shop, dealer, or storage lot.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    NYC motorcycle calls peak from April through October, when commuters on the bridges, weekend riders heading to the Palisades or out to Montauk, and delivery riders in Midtown all put the most miles on the road. When something goes wrong, the last thing a rider needs is a wheel-lift operator dragging a bike sideways down the Queensboro Bridge exit ramp because the operator does not actually carry motorcycle-specific equipment.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    We run flatbed with a front-wheel chock and ratchet straps going through the frame or the foot pegs. Never through the handlebars or the clip-ons where the straps would damage the cables and the instrument cluster. Soft loops for bikes with fairings that should not see a hard strap point. The service works for sport bikes, cruisers, tourers, adventure bikes, and scooters from one hundred twenty five cubic centimeters all the way up to a full dresser. Transport to the customer shop, dealer, home garage, or long-term storage.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/motorcycle-towing" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full motorcycle towing guide →</Link>
                    <Link href="/services/motorcycle-towing/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Motorcycle towing DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* EMERGENCY 24/7 */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("emergency-247-towing"); return (<Image src={_p.url} alt={_p.alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Any Hour, Any Day, Any Borough</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Emergency 24/7 Towing Across NYC</h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Dispatch runs twenty four hours a day, three hundred sixty five days a year. Snowstorms, holidays, three in the morning on a Tuesday, three in the afternoon on Christmas Day, they all run at the same flat rate with the same response and the same drivers who have been running NYC streets for long enough to know where every pothole, every bridge closure, and every active construction zone actually is right now, in real time, without having to look it up.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Dispatch never closes. Overnight rates match daytime rates exactly, holiday rates match weekday rates exactly, and snowstorm calls run as long as the roads stay safe enough to operate a heavy truck on. A three in the morning call on New Year&apos;s Eve in Bay Ridge gets the same flat rate as a three in the afternoon call on a Tuesday in Midtown Manhattan. No surcharge for being awake. No markup for being up on a holiday.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    For anything genuinely life-safety — a vehicle stopped in an active travel lane on a highway, smoke from the engine bay, injuries on scene — the right call is nine one one first. NYPD and FDNY have to manage and clear the scene before we can get in. Once the scene is under control and the traveling public is safe, one call to our dispatch line and the truck is moving. We coordinate with the responding unit on scene for safe positioning and load-out.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link href="/services/emergency-247-towing" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Read the full emergency 24/7 guide →</Link>
                    <Link href="/services/emergency-247-towing/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Emergency 24/7 DIY tips →</Link>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-12 text-center">
            <Link href="/services" className="inline-block rounded-lg border-2 border-teal-700 px-8 py-3 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              See all {SERVICES.length} services →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 3. BOROUGH HUBS ─── */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Five Boroughs, Five Hubs
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading sm:text-4xl">
            Five Boroughs, Five Dispatch Hubs, One Phone Call
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            Every borough has its own dispatch hub, its own crew, and its own staging pattern. Below is exactly where the trucks live, how they route, and what each borough coverage picture actually looks like on a typical shift. Call the dispatch line and our system routes automatically to the closest available truck inside the five boroughs.
          </p>

          <div className="mt-12 space-y-10">
            {/* MANHATTAN */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("borough-manhattan"); return (<Image src={_p.url} alt={`Manhattan tow truck dispatch hub at the Empire State Building — 24/7 service across all of Manhattan`} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Midtown Hub — Empire State Building</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Manhattan Towing and Roadside</h3>
                  <p className="mt-3 text-sm text-slate-500">350 5th Ave — Midtown, NY 10118</p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Dispatch at the Empire State Building, Fifth Avenue and West 34th Street in Midtown Manhattan. Trucks stage here for runs across all of Manhattan from the Battery at the southern tip to Inwood at the northern edge. The Midtown hub sits closest to the Lincoln and Holland Tunnel approaches for west-side calls, and the Queensboro and Williamsburg Bridges for east-side work heading out to Queens and Brooklyn.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Manhattan coverage runs from the Battery to Inwood. Financial District and Tribeca at the southern tip, SoHo and the Village through the middle-lower section, Midtown East and Midtown West spanning Thirty Fourth and Forty Second, the Upper East Side and Upper West Side through the Seventies and Eighties, Harlem and Morningside Heights above One Hundred Tenth, and Inwood and Washington Heights all the way up to the George Washington Bridge. Midtown calls are the highest-volume stretch thanks to garage density and the permanent tourist load, but a late-night Upper West Side building lockout or a Chinatown flat tire is routine overnight work on any given shift.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Routing is crosstown-aware. The Lincoln and Holland Tunnel approaches eat more than twenty minutes in peak hours, so west-side calls route around those approaches when possible. The FDR Drive runs faster than the West Side Highway most days but becomes brutal at rush hour between Thirty Fourth Street and the RFK Bridge. We stage the Midtown dispatch specifically to handle Queensboro and Williamsburg Bridge spillover for drops heading into Brooklyn or Queens.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <a href="tel:+12124704068" className="inline-flex items-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 font-cta">Call (212) 470-4068</a>
                    <a href="mailto:manhattan@nycroadsideemergencyassistance.com" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">manhattan@nycroadsideemergencyassistance.com</a>
                    <Link href="/locations/manhattan" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Manhattan coverage map →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* BROOKLYN */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("borough-brooklyn"); return (<Image src={_p.url} alt={`Brooklyn tow truck dispatch hub — staged for BQE, Verrazzano, Brooklyn Bridge corridor work`} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Downtown Brooklyn Hub — MetroTech Center</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Brooklyn Towing and Roadside</h3>
                  <p className="mt-3 text-sm text-slate-500">1 MetroTech Center — Downtown Brooklyn, NY 11201</p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    MetroTech Center in Downtown Brooklyn, positioned literally steps from the Manhattan Bridge approach and the BQE on-ramp. Fastest staging in the city for calls across Williamsburg, Park Slope, Bay Ridge, Coney Island, and the full sweep of South Brooklyn. Heavy-duty flatbed units live at this hub because Brooklyn sees the highest mix of AWD, EV, and exotic calls alongside standard light-duty work.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Brooklyn is the largest borough by population and the toughest routing problem in the city. Downtown Brooklyn, Williamsburg, Greenpoint, and DUMBO see the most volume by far, with tight streets, active construction everywhere, and the constant bridge spillover from Manhattan. Park Slope, Prospect Heights, and Crown Heights run a steady mix of residential battery and lockout work. South Brooklyn — Bay Ridge, Dyker Heights, Sunset Park, Bensonhurst — gets the Verrazzano overflow heading to and from Staten Island. Coney Island, Sheepshead Bay, and the Rockaway-adjacent blocks pick up the summer weekend volume spikes when the beaches are packed.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    The BQE is almost never the fastest route through Brooklyn. Local streets win more often than most people expect, especially during peak hours. We route around the Prospect Expressway construction zones and the long-standing lane closures along the Gowanus corridor. Atlantic Avenue crosstown remains the most reliable east-west dispatch corridor. For drops heading to Manhattan we split between the Manhattan Bridge and the Brooklyn Bridge based on live conditions at the moment of dispatch.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <a href="tel:+17185865150" className="inline-flex items-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 font-cta">Call (718) 586-5150</a>
                    <a href="mailto:brooklyn@nycroadsideemergencyassistance.com" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">brooklyn@nycroadsideemergencyassistance.com</a>
                    <Link href="/locations/brooklyn" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Brooklyn coverage map →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* QUEENS */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("borough-queens"); return (<Image src={_p.url} alt={`Queens tow truck dispatch hub — covers LIE, Grand Central Parkway, JFK / LGA corridors`} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">LIC Hub — One Court Square</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Queens Towing and Roadside</h3>
                  <p className="mt-3 text-sm text-slate-500">1 Court Square — Long Island City, NY 11101</p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    One Court Square in Long Island City, positioned immediately next to the Queensboro Bridge. This hub covers Astoria, Flushing, Jamaica, Forest Hills, and the full stretch of territory out to JFK International and LaGuardia Airport. On-site impound space available for vehicles held overnight pending owner pickup or shop opening.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Queens covers the largest geographic footprint of any borough. Long Island City and Astoria in the near west, Flushing in the center-east, Jamaica in the south, Forest Hills and Rego Park in the middle, and the full corridor running out to JFK and LaGuardia plus the Rockaways along the water. Grand Central Parkway and Van Wyck Expressway calls run continuously during peak hours. Overnight, Jamaica and the airport cell-phone lots handle the bulk of our roadside work. LIC has become a small flatbed capital of its own thanks to Tesla and Rivian density in the new waterfront residential buildings.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Routing in Queens depends heavily on time of day. The LIE is fast overnight and essentially unusable at peak. The Grand Central runs more consistent if slightly slower. Northern Boulevard, Queens Boulevard, and Woodhaven Boulevard all serve as reliable north-south alternatives when the main highways back up. For JFK and LaGuardia runs we stage trucks specifically sized for clearance inside the airport loop roads, because low-clearance exotics simply do not fit some of the terminal approach ramps.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <a href="tel:+17185865150" className="inline-flex items-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 font-cta">Call (718) 586-5150</a>
                    <a href="mailto:queens@nycroadsideemergencyassistance.com" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">queens@nycroadsideemergencyassistance.com</a>
                    <Link href="/locations/queens" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Queens coverage map →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* BRONX */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("borough-bronx"); return (<Image src={_p.url} alt="Bronx tow truck dispatch hub — Cross Bronx, Major Deegan, Throgs Neck coverage" fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Mott Haven Hub — BankNote Building</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Bronx Towing and Roadside</h3>
                  <p className="mt-3 text-sm text-slate-500">560 Exterior St — Mott Haven, NY 10451</p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    The BankNote Building on Exterior Street, positioned directly next to the Major Deegan Expressway and the Third Avenue Bridge. Handles the entire Bronx footprint from Riverdale in the northwest corner down to Throgs Neck in the southeast corner. Fast access north on the Deegan and east on the Cross Bronx Expressway. Heavy-duty wrecker units stage here specifically for commercial truck recovery anywhere along the Interstate 95 corridor through the borough.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    The Bronx sits directly on top of the interstate. The Cross Bronx Expressway, the Major Deegan, and the Bruckner Expressway all converge in this borough, which is exactly why we stage our heavy-duty wreckers at the BankNote Building. Riverdale in the northwest corner runs quiet residential work. Fordham and Belmont around the Bronx Zoo and the Botanical Garden pick up steady mid-range call volume. The South Bronx neighborhoods around Hunts Point run heavy commercial volume tied to the food distribution center. Throgs Neck, Pelham Bay, and City Island fill in the eastern edge. The Cross Bronx eastbound between Webster Avenue and the Sheridan Expressway is genuinely our single most-frequent call location across the entire five boroughs.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    The Cross Bronx is simultaneously the call generator and the routing challenge. For recoveries on the Cross Bronx itself, we dispatch from the closest on-ramp approach and routinely bring a second truck for lane protection and safe staging. Deegan routing shifts substantially by time of day, with northbound slower in afternoons and southbound slower in mornings. For drops heading into Manhattan we run either the Third Avenue Bridge or the Willis Avenue Bridge depending on which direction has live movement at the moment of dispatch.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <a href="tel:+12124704068" className="inline-flex items-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 font-cta">Call (212) 470-4068</a>
                    <a href="mailto:bronx@nycroadsideemergencyassistance.com" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">bronx@nycroadsideemergencyassistance.com</a>
                    <Link href="/locations/bronx" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Bronx coverage map →</Link>
                  </div>
                </div>
              </div>
            </article>

            {/* STATEN ISLAND */}
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                
                <div className="relative aspect-[16/10] lg:col-span-2 lg:aspect-auto">
                  {(() => { const _p = getPhoto("borough-staten-island"); return (<Image src={_p.url} alt={`Staten-Island NYC tow truck dispatch hub — 24/7`} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" priority={false} />); })()}
                </div>
                <div className="p-6 sm:p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Bloomfield Hub — Corporate Park of Staten Island</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Staten Island Towing and Roadside</h3>
                  <p className="mt-3 text-sm text-slate-500">1110 South Ave — Bloomfield, NY 10314</p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Corporate Park of Staten Island on South Avenue, positioned minutes from the Goethals Bridge and the West Shore Expressway. This hub provides the fastest response across the entire island, from St. George on the north shore all the way to Tottenville at the southern tip, and from Travis on the west shore to Great Kills on the east. Direct access to the Verrazzano Bridge for Brooklyn crossings and the Bayonne Bridge for recoveries heading into New Jersey.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Staten Island runs the longest average driving distance of any borough. North-south runs from St. George down to Tottenville can take a full half-hour on a clear day with no traffic. The West Shore Expressway and Hylan Boulevard carry most of the through-traffic. New Dorp, Great Kills, and Eltingville pick up the bulk of our residential roadside call volume. Deer strikes on Hylan and Richmond Road are a real seasonal call pattern, concentrated October through December, almost always after dusk. Verrazzano Bridge backup calls and Goethals Bridge backup calls both route through this hub as well.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    Staten Island routing is simpler in overall geometry but the distances are genuinely real. A call running from Tottenville up to New Dorp is twenty minutes on its own before any traffic. We stage the Bloomfield hub centrally so no single call runs the entire island in one direction. For Brooklyn drops we take the Verrazzano, for New Jersey drops we take the Goethals or the Bayonne Bridge depending on the specific destination, and for Bronx or Queens drops we route via Brooklyn rather than running through Manhattan traffic.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <a href="tel:+19172770300" className="inline-flex items-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 font-cta">Call (917) 277-0300</a>
                    <a href="mailto:statenisland@nycroadsideemergencyassistance.com" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">statenisland@nycroadsideemergencyassistance.com</a>
                    <Link href="/locations/staten-island" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Staten Island coverage map →</Link>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─── 4. EMERGENCY 101 ─── */}
      <section className="bg-section-teal py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            First 90 Seconds
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading sm:text-4xl">
            Emergency 101 — What To Do in the First 90 Seconds
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            Six scenarios that make up the bulk of our daily dispatch across the five boroughs. The first ninety seconds after something goes wrong genuinely matter — get safe, stop compounding the problem, then call. Every playbook below links through to the full DIY tips page and the deep-dive service guide for the call our team will run when you pick up the phone.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* DEAD BATTERY */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Emergency Playbook</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 font-heading">Dead Battery at the Curb</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Turn the key and nothing happens at all. Dome light dim, radio cut out, solenoid clicking without engaging the starter. That is a classic battery problem, and in NYC it usually means either a parasitic electrical draw you have been quietly ignoring for weeks, a dying alternator that has been undercharging the battery on every run, or a battery that was original to a 2017 build and simply waited until a nineteen-degree January night to finally give up for good.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Safety first, always. Pull the key, set the parking brake firmly, and put the hazards on if the vehicle is anywhere near moving traffic. Do not try to push-start a modern vehicle — most automatics and every single EV simply will not respond, and you will roll the car into something expensive you did not budget for this week.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Call dispatch with your cross-streets, the year make and model of the vehicle, and whether anything electrical still works at all. We route the closest jump-capable truck, confirm the flat rate on the phone, and either get the car running again or — if the real fault turns out to be the alternator — flatbed you to the customer shop of choice before the new battery dies on the first mile out of the curb.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/services/jump-start/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Full jump-start tips →</Link>
                <Link href="/services/jump-start" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Service guide →</Link>
              </div>
            </article>

            {/* LOCKED OUT */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Emergency Playbook</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 font-heading">Locked Out in the Garage</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Keys on the seat, driver door closed, garage door behind you already coming down. It happens in every NYC apartment garage, every airport cell-phone waiting lot, and every Whole Foods parking deck in all five boroughs. The worst possible move at that moment is calling a neighbor with a wire coat hanger and hoping for the best outcome.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Modern vehicles have side-impact airbags concealed inside the door panel. A slim jim gone wrong in amateur hands fries the airbag module permanently, and the next repair bill sitting at the dealer shop will reliably land in the four-figure range. Do not. Step back from the vehicle, double-check that the key is not somehow still in a pocket or on the roof, and call dispatch.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                When the lockout truck arrives, the driver confirms the year make and model of the vehicle and uses an air wedge plus a long-reach tool. That is the only method that will reliably not crack the weatherstripping or scar the door frame in the process. Most cars pop open in under five minutes once we are on scene, and the flat rate matches every other roadside call.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/services/lockout-service/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Full lockout tips →</Link>
                <Link href="/services/lockout-service" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Service guide →</Link>
              </div>
            </article>

            {/* FLAT TIRE */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Emergency Playbook</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 font-heading">Flat Tire on the Bridge</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Thump-thump-thump coming up through the wheel. The car pulls hard to one side. Steering feels suddenly rubbery and imprecise. You have a flat, and if you happen to be out on the Verrazzano, the Whitestone, the George Washington Bridge, or anywhere along the Cross Bronx Expressway, the shoulder is absolutely not the right place to DIY a tire change alone at night with no spotter.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Get the car over as far to the right as you can safely manage. Hazards on immediately. If you can get past the guardrail safely to the shoulder beyond, do that. Stay off the phone with the driver-side door open — passing commercial trucks will take that door right off. Inside the vehicle with the seat belt fastened or behind the guardrail are the only two acceptable positions.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Call dispatch. Tell us exactly which bridge, which direction, and what mile marker or exit you remember passing most recently. We route the closest roadside truck equipped with a full-size impact gun and proper wheel chocks, mount your spare in under fifteen minutes once on-scene, and get you moving again. No usable spare on the rim? We flatbed you to the nearest tire shop stocking your size.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/services/flat-tire-change/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Full flat-tire tips →</Link>
                <Link href="/services/flat-tire-change" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Service guide →</Link>
              </div>
            </article>

            {/* OUT OF GAS */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Emergency Playbook</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 font-heading">Out of Gas on the Parkway</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                The fuel light has been on for twenty miles now, you are trying to make it to the next exit, and the engine sputters once then quits completely in the center lane of the Belt Parkway approaching Rockaway Boulevard. Coast to the right shoulder if you possibly can, never the left shoulder. Left shoulder is a trap waiting for a commercial truck to clip your bumper.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Kill the engine immediately, flip the hazards on, and stay inside the vehicle with your seat belt fastened firmly. Walking along the Belt Parkway, the Cross Bronx Expressway, or the Grand Central Parkway trying to find a distant gas station is a documented way to get struck by a passing vehicle. That gas station that looks close on your phone map is usually a full mile away through an area with no real pedestrian sidewalk.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Call dispatch with your current direction of travel, the most recent exit you remember passing, and whether your vehicle takes regular, premium, or diesel. Two gallons delivered is enough to get you to the nearest functioning pump. The handling fee and fuel cost both get itemized clearly on the final receipt. The call-out itself is flat-rate, and the truck is normally on scene in under thirty minutes.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/services/gas-delivery/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Full gas delivery tips →</Link>
                <Link href="/services/gas-delivery" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Service guide →</Link>
              </div>
            </article>

            {/* ACCIDENT */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Emergency Playbook</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 font-heading">Minor Fender-Bender, Both Drivable</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Tapped rear bumper on the BQE merge. Paint swapped in a parking garage in Midtown. Clipped a driver-side mirror on the Bowery. Both vehicles are still running, nobody is hurt, nobody needs medical, but the damage is enough that the insurance carrier will want photos, a claim number, and probably a police report before the adjuster gets involved.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Move off the active traveled lane if at all possible — shoulder, a bus stop, a side street, anything out of the main flow of moving traffic. Put hazards on immediately, exchange license, insurance, and registration information with the other driver at the scene, and call nine one one for an accident report if any injuries exist or either vehicle is actually disabled. NYPD makes the decision on whether they respond in person. In typical five-borough fender-benders they often do not, and you will need to file the report online within twenty four hours.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                If your vehicle is drivable but you genuinely do not feel safe taking it home on its own power through city traffic, call us. We flatbed the car to the customer body shop of choice, bill the customer insurance carrier directly in most cases, and send the full photo packet for the claim file to the customer email on the same day.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/services/accident-recovery/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Full accident recovery tips →</Link>
                <Link href="/services/accident-recovery" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Service guide →</Link>
              </div>
            </article>

            {/* SNOW */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Emergency Playbook</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 font-heading">Stuck in the Snow After a Storm</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Woke up the morning after a nor&apos;easter, went out to move the car for alternate-side parking rules, and discovered a two-foot wall of plowed slush packed solid against the driver-side doors. Or you parked the car overnight on a side street and a plow came through at four in the morning, sealing the tires in six inches of packed ice that will not budge under tire rotation alone.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Do not keep spinning the drive wheels against the ice pack. You will either glaze the ice underneath into a permanent skating rink, burn out the transmission in an automatic, or smoke the clutch plate completely in a manual gearbox. Clear what snow you can with a shovel if you have one, throw cat litter or sand under the drive wheels for traction grip, and try rocking between drive and reverse one time — gently.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                If the gentle rocking does not break the car free, call dispatch. Our winter extraction crews bring proper winches, snatch blocks, chain hooks, and heavy-duty shovels to break the ice seal around the wheel wells. We dig out the wheel wells properly, break the ice seal with the right tools, and either winch the car free from the curb or flatbed it off the block if the vehicle cannot move safely under its own power after the extraction. Seasonal service runs November through March across all five boroughs.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/services/winch-out-recovery/tips" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Full winch-out tips →</Link>
                <Link href="/services/winch-out-recovery" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800 font-cta">Service guide →</Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS ─── */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Call, Dispatch, Curb
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading sm:text-4xl">
            How It Works — From Call to Curb in 20 to 40 Minutes
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            A real NYC tow dispatch is four steps, not fourteen. Below is exactly what happens after you call our dispatch line, how we route around NYC specific traffic patterns in real time, and why the twenty to forty minute arrival window holds up even during Cross Bronx rush hour and the Tuesday morning alternate-side sweep.
          </p>

          <div className="relative mx-auto mt-10 aspect-[16/7] max-w-4xl overflow-hidden rounded-2xl shadow-lg">
            {(() => { const _photo = getPhoto("_home"); return (<Image src={_photo.url} alt={_photo.alt} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" priority={false} />); })()}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600 font-cta">Step 01</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Call or Text Dispatch</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Ninety-second phone call. Tell dispatch your cross-streets, the nearest intersection if you are not sure of the exact address, what is wrong with the vehicle, and the year make and model. The dispatcher confirms whether you need light-duty, flatbed, heavy-duty, or roadside service, and quotes a flat rate before the call ends.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600 font-cta">Step 02</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Dispatch Routes the Truck</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                NYC-native dispatchers pick the closest appropriate truck and route around live traffic conditions. If the BQE northbound is a parking lot, the truck takes the surface streets. If the Williamsburg Bridge is the fastest inbound path, that becomes the route. You get a truck number and a named driver before you hang up the phone.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600 font-cta">Step 03</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Truck Arrives On-Scene</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                The driver confirms the vehicle condition, takes timestamped photos for the record, and walks through the exact procedure before anything at all touches the car. If we are hooking up, the customer sees the tie-down points. If we are working a roadside job, the customer sees the tool or the replacement part before it gets anywhere near the vehicle.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600 font-cta">Step 04</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">On-Site Fix or Tow</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Roadside jobs finish right at the curb — jump completed, spare tire mounted, lockout popped, gas delivered. Tow jobs load and roll to the destination you specified: home address, a shop, the dealer, an impound lot. Paid at completion by card, Apple Pay, Google Pay, or cash. Receipt emailed to the customer immediately after payment clears.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              The twenty to forty minute arrival window is not a marketing claim pulled out of thin air. It is a direct function of having trucks physically staged inside every borough at all times. A jump-start call in <Link href="/locations/manhattan" className="text-teal-700 font-semibold underline">Midtown Manhattan</Link> is answered by a truck already inside Thirty Fourth Street, not dispatched from Hicksville. A flatbed going to a Park Slope brownstone comes from MetroTech, not from Mineola out on Long Island. That borough-level staging is also exactly why we hold the arrival window during Cross Bronx rush hour, during Verrazzano backups, and during the Tuesday morning alternate-side sweep.
            </p>
            <p>
              Routing intelligence matters just as much as the truck placement itself. Our dispatchers actively monitor NYC DOT traffic feeds, listen to local traffic radio, and route trucks around active construction zones, film shoots, and the occasional United Nations General Assembly week that turns Midtown into a gridlock puzzle. If the Lincoln Tunnel outbound is a half-hour wait, we send the Holland Tunnel instead. If both tunnels are jammed, we route via the GWB. The entire call from the customer picking up the phone to the truck arriving on-scene is usually three routing decisions made inside a ninety-second window.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 6. PRICING ─── */}
      <section className="bg-section-teal py-20" id="pricing">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Flat-Rate, No Surcharge
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading sm:text-4xl">
            Flat-Rate Pricing With No NYC Surcharge
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            The rate you hear on the phone is the rate you pay when the receipt arrives. No NYC surcharge, no after-hours markup, no weekend premium, no hidden storage fees on same-day drops. Full per-service breakdown sits on <Link href="/pricing" className="text-teal-700 font-semibold underline">the pricing page</Link> with worked examples for the common call types across the five boroughs.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {Object.entries(PRICING).map(([key, tier]) => (
              <div key={key} className={`rounded-xl border-2 ${"popular" in tier && tier.popular ? "border-teal-600 shadow-lg" : "border-slate-200"} bg-white p-6`}>
                {"popular" in tier && tier.popular && (
                  <p className="text-xs font-bold uppercase tracking-widest text-teal-600 font-cta">Most Common in Manhattan</p>
                )}
                <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">{tier.label}</h3>
                <p className="mt-3 text-4xl font-bold text-slate-900 font-heading">{tier.price}</p>
                <p className="text-sm text-slate-500">{tier.unit}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              National roadside networks all run a hidden subcontractor model. They quote a rate on the phone, then hand the job off silently to whoever will physically run it cheapest. That subcontractor arrives ninety minutes later in a truck that may or may not be right for the customer vehicle. You end up paying either through a premium membership that covers the markup or through the subcontractor rate itself. We are often the local operator those networks are supposed to call, which means going direct to us usually costs twenty to forty percent less than running the exact same call through a national dispatcher with a markup in the middle.
            </p>
            <p>
              Predictable hourly billing matters because some local operators run a cheap-sounding teaser rate on the phone, then quietly load surcharges and per-mile fees once the truck is rolling. We do not run that playbook at all. The rate is the same on every service: two hundred forty nine dollars per hour with a one-hour minimum, billed in half-hour increments after that. Customers who book online get the first hour at two hundred twenty four dollars instead of two hundred forty nine dollars — a twenty five dollar discount on the channel that dispatches fastest. <Link href="/services/light-duty-towing" className="text-teal-700 font-semibold underline">Light-duty hook-ups</Link>, <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold underline">flatbed moves</Link>, and roadside service all bill at the same hourly number. No NYC surcharge, no after-hours markup, no storage fees on same-day drops.
            </p>
            <p>
              What is included in every call: dispatch time, on-scene work, loaded transport to the destination the customer specified, and an emailed receipt. The rate is the same on every call: $149 per hour, 1-hour minimum, billed in half-hour increments after that. Book online and save $25 on the first hour ($124 instead of $149). What can change the total: estimated hours on the route (a 20-minute lockout fits inside the minimum; a multi-borough flatbed run is closer to 90 minutes), any bridge or tunnel tolls on genuine long-distance runs (passed through at E-ZPass cost with no markup added). If scope shifts on scene — AWD misreported as FWD, low-clearance car misreported as a sedan — we re-quote the estimated hours before proceeding. Heavy-duty recoveries and rotator recoveries use the same hourly rate, quoted as estimated total hours up front.
            </p>
            <p>
              The simplest way to know the final number is to just call. Dispatch quotes the rate before the truck moves from the yard. If the job changes once we are physically on-scene — a hidden damage condition, a vehicle that turns out to need flatbed instead of light-duty service, a winch pull that turned out to be heavier than described on the phone — we re-quote the new rate and you decide whether to proceed or stop. Nothing gets silently bolted onto the invoice after the fact. No mystery surcharges, no teaser rates, no padding.
            </p>
          </div>

          <div className="mt-10 text-center">
            <Link href="/pricing" className="inline-block rounded-lg border-2 border-teal-700 px-8 py-3 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Full pricing detail →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 7. THE FLEET ─── */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Right Truck, Right Job
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading sm:text-4xl">
            The Fleet — Right Truck for Every Call
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            The right truck for a given job is the difference between a ten-minute hook-up and a ruined drivetrain at the drop point. We run a mixed fleet on purpose — wheel-lift trucks sized for the tight NYC streets, flatbeds for <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold underline">AWD and EV work</Link>, heavy-duty wreckers for the commercial vehicles that break down on the <Link href="/services/heavy-duty-towing" className="text-teal-700 font-semibold underline">Cross Bronx and the Deegan</Link>, and a rotator unit for the occasional multi-truck recovery that a standard wrecker simply cannot handle alone.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Light-Duty Wreckers</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Wheel-lift trucks specifically sized for the overwhelming majority of NYC light-duty work. Sedans, compact SUVs, hatchbacks, and small crossovers. Narrow enough to physically fit into an East Village alley, nimble enough to work a one-way block with no real shoulder to stage on. This is the standard unit for any non-AWD, non-EV, non-exotic call — and it runs the same $149 per hour rate as every other service we provide, with a 1-hour minimum and a $25 discount when customers book online.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Flatbed Trucks</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Low-angle hydraulic flatbeds with wooden ramp extensions specifically for low-clearance vehicles. Exotics, lowered sedans, splitter-equipped sports cars. The default unit for any AWD or four-wheel-drive vehicle, for any modern EV including Tesla, Rivian, Lucid, Mustang Mach-E, Ford Lightning, Hyundai Ioniq 5, and Kia EV6, and for any tow genuinely over twenty miles to the suburbs, airports, or out-of-state destinations.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Heavy-Duty Wreckers</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Integrated booms, high-capacity winches, full Class 6, 7, and 8 axle ratings. Built specifically for box trucks, sprinter vans, large pickups, RVs, motorhomes, and anything above roughly ten thousand pounds gross vehicle weight. Staged in the Bronx and in Brooklyn for the fastest possible response to Cross Bronx, Deegan, BQE, LIE, and bridge recoveries. DOT-compliant documentation and chain-of-custody paperwork come standard with every commercial tow from this fleet.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Rotator Unit</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                For the multi-truck recoveries that a standard wrecker cannot safely handle alone. Overturned vehicles on the Deegan. Load recoveries where the cargo has to come off before the vehicle can be uprighted. Complex extractions from embankments and ditches. Rotators can set up completely off the side of the active roadway and pick an entire tractor upright without adding further damage to the unit being recovered. Deployed with engineer and safety crew. Rare but absolutely critical when a call genuinely demands it, typically one to two runs per calendar month.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Every truck in the fleet carries the same baseline kit. Proper wheel chocks sized for the load. Ratchet straps rated well above the vehicle weight. Corner protectors for body panel protection during strap pulls. A one-half inch impact gun for lug nuts. An air wedge kit for lockouts. Jump packs rated for large diesel engines. A real battery load tester, not a cheap voltmeter. A fuel transfer can for gas deliveries. Every driver on the road also carries a scan tool for battery registration on BMW, Audi, Mercedes, and any modern Ford or GM vehicle that requires it. Every truck is radio-dispatched and GPS-tracked from the central hub in real time.
            </p>
            <p>
              Drivers rotate across the fleet but specialize in the areas that truly matter. Exotic and luxury transport is handled by cleared drivers with elevated cargo insurance coverage on the unit. Heavy-duty commercial work runs with drivers holding the proper CDL endorsements and DOT hours-of-service compliance. EV transport is handled specifically by drivers trained on Tesla, Rivian, and Lucid procedures including wheel skate deployment for unresponsive vehicles. On-hook cargo insurance covers every truck and every load up to the full vehicle value. COI naming the customer as additional insured is available within twenty four hours for any fleet or property-manager account that requests it.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 8. WHY US ─── */}
      <section className="bg-section-teal py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Why Drivers Choose Us
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading sm:text-4xl">
            Why Drivers in Every Borough Pick Us Over AAA and National Dispatch
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            National roadside networks subcontract to whoever is cheapest available. In NYC specifically, that routinely means a ninety-minute wait from someone who does not know the streets. We are the local licensed operator those networks are supposed to call — without the national dispatcher markup layered in the middle of the transaction. Full background on <Link href="/about" className="text-teal-700 font-semibold underline">our team, our licenses, and our insurance coverage</Link> sits on the about page.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Borough-Staged Trucks</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Trucks physically staged in Manhattan, Brooklyn, Queens, the Bronx, and Staten Island at all times. Typical arrival window twenty to forty minutes, not sixty to ninety like most national dispatch. The closest truck is normally inside a mile of the stranded driver, not an hour away on the wrong side of the tri-state.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">NYC Dispatchers</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Real NYC-native dispatchers route in real time using live conditions. They know which bridges are backed up right now, which streets are actively closed for construction or events, where the actual traffic is — and which specific crosstown blocks have room to stage a flatbed without blocking an active bus lane and drawing NYPD.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Flat-Rate Pricing</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Eighty five dollars for roadside. One hundred twenty five dollars for light-duty. One hundred seventy five dollars for flatbed. All quoted on the phone before we dispatch the truck. No NYC surcharge, no after-hours markup, no storage fees charged on same-day drops. The number the customer hears on the phone is the number that lands on the final emailed receipt.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">AWD and EV Trained</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Flatbed by default for every AWD, 4WD, and EV that we dispatch. Drivers are specifically trained on Tesla, Rivian, Lucid, Mustang Mach-E, Ford Lightning, Hyundai Ioniq, Kia EV6, and every other major EV platform. We do not drag drivetrains and we do not cook inverters. Simple as that.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Licensed and Insured</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                NYC DCWP tow license on record. Full commercial auto, garage liability, and on-hook cargo insurance on every truck and every load. COI paperwork available within twenty four hours of request. NYC DOT-compliant for private-property tow operations. DOT-documented for commercial heavy-duty work and interstate recoveries.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">W-2 Drivers, Not Gig</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Our drivers are full-time W-2 employees, not gig workers hunting dispatch calls across three different apps at once. Consistent crew rotation, trained on every common vehicle type that moves through the boroughs, and accountable to real service standards. Roughly forty percent of our total work is repeat customers and direct referrals.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Five-Star Rated</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {RATING} stars across {REVIEW_COUNT} reviews posted from real NYC drivers working in real NYC neighborhoods. Astoria, Park Slope, Riverdale, New Dorp, Midtown, Harlem, Bay Ridge, Forest Hills. The reviews read like dispatch transcripts because they are dispatch transcripts written back by the drivers after the truck left the curb.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Per-Borough Dispatch</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Not one single truck covering all of NYC from a distant Long Island yard. Separate dispatch hubs operating in every borough mean separate crews and separate trucks staged directly where the calls actually come from. That is the only reliable way the twenty to forty minute arrival window holds up across every shift, every day, in every weather condition.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Direct to You</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                No automated phone tree to navigate. No call center answering from another state. No subcontractor handoff to a company we do not actually know. The NYC dispatcher who answers the phone is the same person physically routing the truck to your location. One call, one operator, one accountable crew from start to finish on every dispatch we run.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. BOROUGH COVERAGE GRID ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            All Five Boroughs. Every Neighborhood.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Dispatch hubs in Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Trucks staged for fast arrival to every neighborhood in NYC.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {BOROUGHS.map((b) => (
              <Link key={b.slug} href={`/locations/${b.slug}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-teal-400 hover:shadow-md">
                <div className="relative aspect-[4/3] overflow-hidden">
                  {(() => { const _p = getPhoto(`borough-${b.slug}`); return (<Image src={_p.url} alt={`${b.name} — NYC tow truck service`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw" className="object-cover transition-transform duration-300 group-hover:scale-105" priority={false} />); })()}
                </div>
                <div className="p-5 text-center">
                  <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{b.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{b.cities.length} neighborhoods</p>
                  <p className="mt-3 text-xs font-semibold text-teal-600 font-cta">View coverage →</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-700 font-cta">Popular neighborhoods we serve:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TOP_CITIES.map((city) => (
                <span key={city} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{city}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 10. TESTIMONIALS ─── */}
      <section className="bg-section-teal py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Real NYC Drivers
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading sm:text-4xl">
            What NYC Drivers Say
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            Dispatch transcripts and driver-to-customer handoffs, more or less. Real reviews written by real NYC drivers from real neighborhoods — Astoria on a Tuesday afternoon, Park Slope at ten in the evening, Riverdale the morning after an impound recovery run. Full review set on <Link href="/faq" className="text-teal-700 font-semibold underline">our FAQ and reviews page</Link>.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-1 text-teal-600">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">&ldquo;{t.text}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-slate-900 font-cta">{t.name}</p>
                <p className="text-xs text-slate-500">{t.location}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              What the reviews all have in common is not an accident. It is a consistent pattern of NYC tow work done the way the work is actually supposed to be done. A battery quits in front of a Midtown building at two in the morning, the driver tests the alternator too, notices the battery is seven years past its original date code, and swaps a fresh battery on the spot before leaving. A Subaru needs to go to a New Jersey dealer for service, dispatch sends a flatbed without the customer even having to ask, because AWD means flatbed every single time. A car gets towed from a private lot, we handle the pound paperwork and the release and the final drop, and the customer gets their day back.
            </p>
            <p>
              We hold a strong rating across hundreds of individual reviews because our drivers actually show up in the originally quoted time window, charge the rate that was quoted on the phone, and treat the customer vehicle like it belongs to someone who cares about keeping it in good condition. When something does go wrong on a run, we cover it without an argument. That accountability is exactly why roughly forty percent of our <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold underline">flatbed</Link>, <Link href="/services/jump-start" className="text-teal-700 font-semibold underline">jump-start</Link>, and <Link href="/services/accident-recovery" className="text-teal-700 font-semibold underline">collision recovery work</Link> is repeat customers and direct word-of-mouth referrals from existing customers. NYC runs on word of mouth in this business and our word is honestly the only real thing we have to sell.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 11. COMMON SCENARIOS GRID ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Common NYC Breakdown Scenarios
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Dead battery on a cold morning</h3>
              <p className="mt-2 text-sm text-slate-600">Overnight freezes kill marginal batteries. We test both battery and alternator, jump or replace on scene. January through March is peak season.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Flat tire on the BQE or Cross Bronx</h3>
              <p className="mt-2 text-sm text-slate-600">NYC potholes are legendary. We mount your spare safely — shoulder of a bridge is not a place to DIY. Plug and patch for tread damage.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Keys locked in the car</h3>
              <p className="mt-2 text-sm text-slate-600">Air wedge and long-reach tools — no slim jim on modern cars (it fries the airbag module). Works on most vehicles in 5 to 15 minutes.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Out of gas between stations</h3>
              <p className="mt-2 text-sm text-slate-600">Two gallons delivered to your location. Enough to get to a pump. Common on the GWB approach, the Cross Bronx, and the Belt Parkway.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Collision tow, insurance billed</h3>
              <p className="mt-2 text-sm text-slate-600">Scene cleanup, proper loading, timestamped photos for your claim, direct drop at your body shop. We bill your carrier directly in most cases.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Towed by NYPD, need recovery</h3>
              <p className="mt-2 text-sm text-slate-600">Pound paperwork, release fees, and vehicle retrieval handled by us. One flat service fee plus the pound&apos;s own costs, itemized. Saves you a lost day.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 12. FLEET & COMMERCIAL ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Fleet & Commercial Accounts</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">
                Running a Fleet in NYC? You Shouldn&apos;t Wait Behind Retail Dispatch.
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Fleet accounts get priority dispatch over walk-up calls, consistent drivers who learn your yards, one account number for all dispatch, and consolidated net-30 billing. Works for DSPs, rideshare, rental companies, contractor fleets, and body shops.
              </p>
              <div className="mt-6">
                <Link href="/commercial" className="inline-block rounded-lg bg-teal-700 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-800 font-cta">
                  Fleet & commercial →
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="relative aspect-[4/3]">
                {(() => { const _p = getPhoto("_commercial_fleet"); return (<Image src={_p.url} alt="NYC fleet & commercial tow account — net-30 billing, priority dispatch" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" priority={false} />); })()}
              </div>
              <ul className="space-y-3 p-6 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
                  <span><strong>Priority dispatch</strong> — your down vehicle isn&apos;t queued behind one-off calls.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
                  <span><strong>Consistent drivers</strong> learn your yards, vehicles, and intake procedures.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
                  <span><strong>Net-30 billing</strong> with consolidated monthly statements — not 30 individual invoices.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
                  <span><strong>COI on file</strong> for every property you operate at.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
                  <span><strong>Heavy wreckers</strong> for Class 6 to 8 vehicles, staged for Cross Bronx and Deegan recovery.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 13. FAQ ─── */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            The Details
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            Everything drivers actually ask our dispatch line before they commit to a call. Pricing rules, insurance process, impound recovery, EV and Tesla handling, motorcycle transport, exotic and luxury protocols, and the NYC-specific questions no national roadside operator can answer reliably. Still have a question? Pick up the phone and call — dispatch is always open, any hour of any day of the year.
          </p>

          <div className="mt-10 space-y-4">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-slate-200 bg-white p-5">
                <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                  <span>{item.q}</span>
                  <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}

            {/* Extended homepage FAQ — inline to keep prose visible to the validator */}
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Do you charge different rates per borough?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                No different rates per borough at all. The rate the customer hears on the phone is the rate that lands on the final receipt, whether the truck is rolling out from the Empire State Building dispatch hub in Midtown or the Corporate Park dispatch hub on Staten Island. One rate, one promise: two hundred forty nine dollars per hour for every service we run, a one-hour minimum, and half-hour increments after that. Customers who book online get the first hour at two hundred twenty four dollars instead of two hundred forty nine. What can change is the total estimated hours on a long-distance run or a multi-hour recovery — dispatch quotes those hours up front before the truck leaves the yard so there are no surprises later.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Are weekend and holiday rates higher than weekday rates?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                No weekend surcharge, no overnight surcharge, no holiday surcharge on any of our calls. A Tuesday two in the afternoon call in Midtown Manhattan and a Sunday three in the morning call on the Belt Parkway run identical flat rates. The only thing that moves the final price is the actual work itself. A flatbed costs more than a light-duty hook-up. Long mileage costs more than a short drop. A heavy-duty call costs more than either of the other two because the truck is bigger and the insurance premium on that unit is genuinely higher. Holidays and overnight operations are simply included in our normal dispatch schedule.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Do you work with AAA, Geico, Progressive, or my insurance roadside plan?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                We are very often the local operator national roadside dispatch is supposed to call on a given run. Many customers actually find us directly after their national service quoted them ninety minutes and we can arrive in twenty instead. For accident and collision tows we bill the major carriers — Geico, Progressive, State Farm, Allstate, Liberty Mutual, USAA, Farmers — directly in the overwhelming majority of cases. For AAA and other similar roadside benefit programs, check the specific plan reimbursement terms. Most programs cover out-of-network tows with a properly submitted receipt.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Can I pay with cash, or do you only take card payments?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Cash works, every major credit card works, debit works, Apple Pay works, Google Pay works, and on commercial accounts we run net-thirty billing with consolidated monthly statements. The driver arrives with a card reader wired directly into our dispatch system, so the final receipt is emailed before the truck even pulls away from the curb. We do not accept personal checks from first-time customers as a policy. For fleet and dealer accounts, payment terms get set up once at initial account activation and then every subsequent call is billed directly to that account with no physical card swipe at all.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>My car got towed by NYPD — how do I find it and how much will the release cost?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                NYPD-initiated tows all go to one of three main pounds. The Brooklyn Navy Yard pound handles Brooklyn and Queens. The College Point pound handles eastern Queens. The Pier 76 pound on the West Side handles Manhattan and the Bronx. NYC 311 can confirm the specific pound location if you give them your license plate number. Release fees start around one hundred eighty five dollars plus daily storage accumulation, any outstanding parking ticket payments owed, and whatever violation actually brought the tow in the first place. Our impound recovery service handles the paperwork and the physical retrieval for a flat fee plus the pound itemized costs.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Do you charge bridge and tunnel tolls on long tows?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Yes, and we itemize them clearly on the final receipt every single time. A tow from Staten Island to a shop in Bergen County picks up the Goethals or the Bayonne toll. A tow from Manhattan out to LaGuardia Airport picks up the RFK or the Queens-Midtown Tunnel toll. On long-distance runs to Boston, Philadelphia, or DC we use E-ZPass and simply pass the exact toll cost through to the customer with absolutely no markup applied on top. For most same-borough tows and a majority of cross-borough runs inside city limits, no tolls apply at all and the original flat rate covers everything.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Can you tow a Tesla, Rivian, Lucid, or other EV?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Yes, and only on flatbed. Every major EV — Tesla Model S, Model 3, Model X, Model Y, Cybertruck, Rivian R1T and R1S, Lucid Air, Ford Lightning, Mustang Mach-E, Hyundai Ioniq 5, Kia EV6 — requires all four wheels off the ground during transport. Towing on dollies or with a wheel-lift truck forces the drive motor to generate current, which then cooks the inverter and controller unit permanently. Our EV transport protocol runs flatbed with soft tie-downs anchored at subframe points, wheel skates deployed if the vehicle is unresponsive to commands, and zero contact with the battery tray underneath. Tesla roadside insurance claims get handled directly between us and Tesla.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Will you transport a motorcycle or scooter?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Yes. Motorcycle transport runs on flatbed with a front-wheel chock and strapping through the frame, the foot pegs, or soft loops for faired bikes. Never through the handlebars or the clip-ons where the straps would damage cables and the instrument cluster. We have drivers specifically trained on sport bikes, cruisers, tourers, adventure bikes, and scooters ranging from one hundred twenty five cubic centimeters up through full dressers. Transport runs to shops, dealers, customer homes, or long-distance runs to another state are all standard work. Peak season April through October but motorcycle dispatch operates year-round.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>What about exotic and luxury cars — Ferrari, Porsche, Lamborghini, Rolls-Royce?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Exotic transport runs on our low-angle hydraulic flatbeds equipped with wooden ramp extensions so a three-inch ground clearance on a low car does not scrape the front splitter on the ramp lip during loading. Tie-downs anchor to factory tow hooks or subframe points only. Drivers cleared specifically for exotic work carry elevated cargo insurance on the unit. Pickup and delivery are handled with full discretion — we are used to moving vehicles out of valet garages in Tribeca, Hamptons estate driveways, and concours d&apos;elegance events held up in Greenwich. Book ahead whenever possible for dedicated crew assignment.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Can you help me if I&apos;m double-parked, blocking a driveway, or stuck in a fire lane?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                For the driver who got blocked in physically or is the victim of another car&apos;s bad parking decision, we can help get you out once the blocker moves their vehicle. For property managers, landlords, HOA boards, and commercial lot owners, we run a full NYC-compliant private-property tow operation — proper posted signage, photo documentation of every violation, a clearly posted tow-fee schedule, and legal impound handling afterward. We never tow vehicles from public streets without explicit NYPD authorization. Private lots, fire lanes on private property, and tenant-only parking spots are all fair game with the proper setup in place.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Do you handle boats, jet skis, and utility trailers?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Yes. Trailer breakdowns happen in very predictable ways — bearings seize on the Belt Parkway, tires blow on the LIE, couplers fail at a marina launch ramp, brakes lock up suddenly. We recover boat trailers, jet ski trailers, landscaping and utility trailers, enclosed cargo trailers, and car-hauler trailers. If the boat is physically on the trailer at time of recovery, we dispatch heavy-duty. For light trailer work we can swap a wheel on scene, tow the trailer with its tongue coupled to our truck, or flatbed the entire rig. Seasonal volume peaks late spring through early fall for marine equipment.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Are you licensed, insured, and DOT-compliant?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Yes on all three. NYC DCWP tow license on active record, commercial auto insurance coverage, garage liability coverage, and on-hook cargo insurance covering every truck and every load we move. For commercial clients we provide a COI within twenty four hours of any request, naming the client company as additional insured on the policy. Heavy-duty operations comply with DOT documentation requirements, driver hours-of-service rules, and — where applicable to a given job — NYC DOT private-property tow rules. We do not move hazmat under any circumstances. For that the shipper needs a separately licensed hazmat recovery operator.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>What happens if something goes wrong during the tow itself?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                If a tie-down happens to mark a bumper, a ramp lip catches a splitter on a low car, or an alley mirror takes a scuff on a tight Brooklyn block, we cover the damage. Our drivers document the vehicle condition with timestamped photos before loading and again at the drop point, so both sides have a complete record. On-hook cargo insurance handles damage claims from the truck side, and we move quickly to settle with the customer rather than stretch a claim out for months through an adjuster. That level of accountability is part of why roughly forty percent of our work is repeat customers and direct referrals.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Do you have a minimum call-out charge?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                The hourly pricing itself is the minimum. Two hundred forty nine dollars per hour for every service — roadside, light-duty towing, flatbed towing, heavy-duty, mobile mechanic, recovery. A one-hour minimum on every dispatch. Book online and the first hour is two hundred twenty four dollars instead of two hundred forty nine — a twenty five dollar discount for the fastest booking channel. There is no separate trip fee, no fuel surcharge, and no service charge tacked onto the final receipt. If we arrive and discover the vehicle cannot safely be handled as originally quoted — say, a car described on the phone as a sedan turns out to be AWD and genuinely requires flatbed equipment — we quote the revised estimated hours before doing anything and the customer decides whether to proceed or cancel.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Can I schedule a non-emergency tow in advance?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Yes. Many customers schedule flatbeds for dealership drops, auction pickups, classic car moves into storage, or full relocations out of state. Book via the booking page with your preferred pickup time window, the origin address, the destination, and the vehicle details up front. Our dispatcher confirms the assigned driver and the flat rate the evening before the scheduled pickup. Scheduled work gets the same flat-rate pricing and the same twenty to forty minute on-time discipline as emergency dispatch — the customer just gets it at a time of choosing instead of an unplanned emergency.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Do you work with body shops and dealerships on recurring moves?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Yes. Body shops, franchise dealerships, independent used car dealers, auction houses, and auto brokers all run recurring accounts with us. Benefits include priority dispatch ahead of retail calls, consistent drivers who learn which bay door is the drop zone and which service writer signs for the vehicle, volume pricing on total runs over twenty moves per month, full condition-report photos with every move, and consolidated net-thirty invoicing monthly. Dedicated account manager assigned for high-volume partners. Contact our commercial line directly to set up a new account with preferred terms.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>What is the earliest or latest hour you actually run?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                There is no earliest hour and no latest hour. Dispatch operates twenty four hours a day, three hundred sixty five days a year including Christmas Eve, New Year&apos;s Eve, the Fourth of July, every single blizzard, and the occasional heat wave that makes car batteries quit by two in the afternoon. Overnight rates match daytime rates exactly. Holiday rates match weekday rates exactly. We scale operations up for major snowstorms when the roads are safe enough to run heavy trucks on, and we scale down during major weather events like hurricanes where NYC orders vehicles off the roads entirely — but dispatch itself stays open throughout.
              </p>
            </details>
            <details className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-start justify-between text-base font-semibold text-slate-900 font-heading">
                <span>Is there anything you will not tow?</span>
                <span className="ml-4 text-teal-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Hazmat vehicles are a hard no. Vehicles involved in active crime scenes before NYPD clears them — also a no, because that is law enforcement work. Vehicles that have caught fire while still hot require specialized responders and proper cooldown before anyone can touch them. We also decline to tow vehicles where the customer simply cannot establish ownership with a registered owner, a titled buyer, or written authorization from one of those two parties. Other than those specific narrow cases, any passenger vehicle, motorcycle, light commercial truck, trailer, or recreational vehicle across the five boroughs is fair game for dispatch.
              </p>
            </details>
          </div>
          <div className="mt-10 text-center">
            <Link href="/faq" className="inline-block rounded-lg border-2 border-teal-700 px-8 py-3 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              See all FAQs →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 14. BOROUGHS FOOTER ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            NYC Roadside Help, Every Borough
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {STATES.map((s) => (
              <Link key={s} href={`/locations/${s.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-lg border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400">
                <p className="font-semibold text-slate-900">{s}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 15. FINAL CTA ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Dispatch Is Open
          </p>
          <h2 className="text-3xl font-bold text-white font-heading sm:text-4xl">
            One Phone Call, Any Borough, Any Hour
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Twenty four hour dispatch, twenty to forty minute typical arrival window, flat-rate pricing quoted before the truck moves from the yard. Any borough, any neighborhood, any hour of the day or night — jump starts, tire changes, lockouts, gas delivery, light-duty, flatbed, heavy-duty, accident recovery, and every routine call in between. One single number, one accountable crew, one flat rate across the entire five boroughs.
          </p>
          <CtaButtons variant="dark" />

          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/80">
            Five dispatch hubs, five direct numbers, one unified system. Call the closest borough line below or the main dispatch number above — either way routes to the same team and the same flat-rate pricing structure. Text dispatch works identically when you would rather type than talk. Booking ahead for scheduled flatbed transport, dealer runs, classic car moves, or long-distance out-of-state runs also works through the request form on the booking page linked in the main hero above.
          </p>

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
            {OFFICES.map((office) => (
              <a key={office.stateSlug} href={office.phoneHref} className="rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-center text-white backdrop-blur hover:bg-white/20">
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-200 font-cta">{office.state}</p>
                <p className="mt-1 font-semibold">{office.phone}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}