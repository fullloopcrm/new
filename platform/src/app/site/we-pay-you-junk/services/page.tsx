// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/we-pay-you-junk/_data/content";
import { SERVICES, SERVICE_CATEGORIES } from "@/app/site/we-pay-you-junk/_data/services";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";

export const metadata: Metadata = {
  title: "Junk Removal Services — 34 Service Types Nationwide | starting at $100/hr",
  description: "34 specialized junk removal services with 50% Resale Credit (when applicable). Residential cleanouts, furniture removal, estate cleanouts, construction debris, commercial services, and more. starting at $100/hr, dump fees included.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  const categories = Object.entries(SERVICE_CATEGORIES) as [keyof typeof SERVICE_CATEGORIES, typeof SERVICE_CATEGORIES[keyof typeof SERVICE_CATEGORIES]][];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {SERVICES.length} Specialized Junk Removal Service Types
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Every Junk Removal Service You Need<br />
            <span className="gradient-text">Under One Roof — And We Pay You</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {SERVICES.length} specialized services. starting at $100/hr flat rate with dump fees included. 1 hour minimum. Every item with resale value earns you 50% credit toward your bill — or we pay you the difference.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* ===== INTRO: What makes our services different ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Your Local Junk Removal Crew That Pays You Back</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How It Works When We Show Up at Your Door — starting at $100/hr, We Handle Everything</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">When you call us, you&apos;re not talking to a call center. You&apos;re booking a local crew that knows your area, your dump sites, and your neighborhood. Here&apos;s what happens from the moment we pull up — whether it&apos;s <Link href="/services/furniture-removal" className="text-teal-700 font-semibold hover:underline">a couch in your living room</Link>, <Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">a full estate your family needs cleared</Link>, or <Link href="/services/office-cleanouts" className="text-teal-700 font-semibold hover:underline">an office your business is moving out of</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Here&apos;s what nobody in the junk removal industry wants to talk about: <strong>every company out there has been charging you for the service AND keeping 35%+ of your items to resell for their own profit.</strong> Your working fridge, your solid wood table, your power tools — they charge you to take them, then flip them for hundreds of dollars. You got nothing. We built this company to end that. Our crew pulls up, introduces themselves, and walks through your space with you. You point at what goes and what stays. We do everything else — loading, carrying, stairs, hauling, dump. Starting at $100/hr, 1 hour minimum, dump fees included (an industry first). Whether you need a <Link href="/services/full-service-junk-removal" className="text-teal-700 font-semibold hover:underline">full house cleared</Link>, a <Link href="/services/hot-tub-removal" className="text-teal-700 font-semibold hover:underline">hot tub torn apart</Link>, or a <Link href="/services/construction-debris-removal" className="text-teal-700 font-semibold hover:underline">jobsite cleaned up</Link> — same rate, and you get paid for what&apos;s worth something.</p>
            <p>Here&apos;s the part no other local junk company does: as we load, we look at every single item. That dresser your kids grew up with? If it&apos;s solid wood and in decent shape, it has resale value — and we credit you 50% (when applicable) of what it&apos;s worth. The fridge you&apos;re replacing? If it still works, that&apos;s $150-$300 in credit right off your bill. Your dad&apos;s old power tools? DeWalt and Milwaukee hold their value for years. We appraise everything right there in your driveway, you see every number, you approve every credit. If your credits add up to more than our hours, we hand you a check. That happens more than you&apos;d think — especially on <Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">estate cleanouts</Link> and <Link href="/services/office-cleanouts" className="text-teal-700 font-semibold hover:underline">office jobs</Link>.</p>
            <p>We&apos;re local. Our crews live in the communities they serve. They know which items sell well in your area, where the recycling centers are, which charities accept donations nearby. That local knowledge means better appraisals, faster jobs, and more money back in your pocket. We&apos;re in <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT}+ cities</Link> — but every job is personal. You&apos;re not a ticket number. You&apos;re the homeowner on Elm Street whose garage hasn&apos;t fit a car in three years, or the property manager who needs Unit 4B cleared by Friday, or the family dealing with Mom&apos;s house after she moved to assisted living. We get it, and we show up accordingly.</p>
          </div>
        </div>
      </section>

      {/* ===== RESIDENTIAL CLEANOUTS ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Your Garage, Basement, Attic, Storage — We Clear It All</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Residential Junk Removal — We Come to Your Home and Handle Everything</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">These are the jobs our crews do every single day in neighborhoods just like yours. Garages that haven&apos;t fit a car in years. Basements full of boxes from three moves ago. Attics nobody&apos;s opened since 2015. We walk in, we clear it out, we credit you for the good stuff. Most jobs take 1-3 hours.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>You&apos;d be amazed what&apos;s hiding in the average home. That workbench your husband swore he&apos;d use? It&apos;s solid maple and worth $200 on the resale market. The treadmill that became a clothes rack? NordicTrack holds its value — that&apos;s $150 credit. The old fridge in the <Link href="/services/garage-cleanouts" className="text-teal-700 font-semibold hover:underline">garage</Link> you keep &quot;just in case&quot;? If it runs, it&apos;s worth $200-$400. Other junk companies haul all of this and sell it themselves. We walk through your space with you, point out what has value, and credit you half. Most homeowners save 25-40% compared to calling the other guys.</p>
            <p><Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">Estate cleanouts</Link> are where families see the biggest impact. When you&apos;re clearing a parent&apos;s home — decades of furniture, a full kitchen of appliances, tools in every drawer, closets full of things you didn&apos;t know existed — the last thing you need is a $3,000 bill from a junk company that&apos;s going to flip all of it. We&apos;ve had families walk away from estate cleanouts with a check for $500+ because Grandma&apos;s dining set and Grandpa&apos;s tool collection were worth more than the removal cost. That&apos;s the way it should work when you&apos;re already going through a hard time. <Link href="/services/hoarder-cleanouts" className="text-teal-700 font-semibold hover:underline">Hoarder cleanouts</Link> and <Link href="/services/storage-unit-cleanouts" className="text-teal-700 font-semibold hover:underline">storage unit clearing</Link> follow the same model — we handle it with care and credit you for everything worth something.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "residential").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ITEM-SPECIFIC REMOVAL ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">One Couch, One Fridge, One Piano — We Pick It Up</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Single Item Removal — We Come Get It, You Get Paid for It</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Got one thing that needs to go? A couch that won&apos;t fit through the door, a fridge you just replaced, a treadmill you haven&apos;t touched in two years? We come to your house, pick it up, and if it&apos;s worth something, you get credit. Most pickups are done in under an hour — you pay the $100 minimum and often get money back.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>This is where calling us instead of &quot;the other guys&quot; makes the biggest difference per item. When you call a flat-rate company to haul a single refrigerator, they charge $150-$250 — doesn&apos;t matter if it&apos;s a dead unit from 2005 or a 3-year-old Samsung French door that works perfectly. With us, you pay $100 for the hour. That Samsung? It&apos;s worth $500 on the secondary market. We credit you $250. You just got paid $150 to have your fridge removed. Call <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">any other company in your area</Link> and ask if they&apos;ll do that.</p>
            <p><Link href="/services/furniture-removal" className="text-teal-700 font-semibold hover:underline">Furniture</Link> is the #1 call we get. That Pottery Barn sectional you bought for $4,000? Still worth $800-$1,200 in good condition. You get $400-$600 credited. The solid oak dining table from your parents? $200-$400 resale, $100-$200 back to you. Even that IKEA dresser has a buyer if it&apos;s not falling apart. <Link href="/services/appliance-removal" className="text-teal-700 font-semibold hover:underline">Appliances</Link> are right behind — every working washer, dryer, dishwasher, and oven has a landlord or flipper who wants it. <Link href="/services/exercise-equipment-removal" className="text-teal-700 font-semibold hover:underline">Gym equipment</Link> is the sleeper — that Peloton collecting dust is still worth $500+, and your weight set is basically cash by the pound.</p>
            <p>Then there are the big, ugly jobs nobody else wants to touch. A <Link href="/services/piano-removal" className="text-teal-700 font-semibold hover:underline">piano</Link> that weighs 800 lbs and needs to go down a flight of stairs. A <Link href="/services/hot-tub-removal" className="text-teal-700 font-semibold hover:underline">hot tub</Link> that needs to be cut apart and hauled off in pieces. A <Link href="/services/pool-table-removal" className="text-teal-700 font-semibold hover:underline">pool table</Link> with a slate top that&apos;ll crush your toes if you look at it wrong. Our crew handles all of it — disassembly, demolition, stairs, tight corners, whatever. Same starting at $100/hr, no &quot;heavy item surcharge,&quot; no drama.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "item-specific").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STRUCTURE REMOVAL ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">We Tear It Down, Load It Up, Haul It Off</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Shed, Fence, Deck & Trampoline Demolition — Your Crew Brings the Tools</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">That rotting shed in the back corner. The fence that&apos;s been leaning since last winter. The deck that&apos;s one good rain away from collapsing. Our crew shows up with the tools, tears it apart, loads every piece, and leaves your yard clean. starting at $100/hr — demo, hauling, dump fees, all of it.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Most people think they need to hire a demolition company AND a hauling company for this stuff. You don&apos;t. Our crew does both. <Link href="/services/shed-removal" className="text-teal-700 font-semibold hover:underline">Shed removal</Link> — we tear down the walls, rip off the roof, pull up the floor, and load every piece. <Link href="/services/deck-removal" className="text-teal-700 font-semibold hover:underline">Deck removal</Link> — we pull every board, every railing, every post, and haul it all. <Link href="/services/fence-removal" className="text-teal-700 font-semibold hover:underline">Fence removal</Link> — wood, chain link, vinyl, wrought iron, we pull the posts or cut them at ground level, your call. Same starting at $100/hr for all of it.</p>
            <p>Here&apos;s the bonus most people don&apos;t expect: metal has scrap value. That <Link href="/services/fence-removal" className="text-teal-700 font-semibold hover:underline">chain link fence</Link>? Scrap credit. The metal shed? Scrap credit. Steel fasteners, aluminum flashing, copper pipe in the old shed plumbing — it all adds up. And if there&apos;s stuff inside the structure — tools in the shed, old furniture stored under the deck — we appraise those separately. One crew, one rate, everything handled. You go inside and make coffee while we turn your eyesore into an empty yard.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "structure").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONSTRUCTION & SPECIALTY ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Reno Debris, Yard Waste, Scrap, Flooring — Loaded and Gone</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Construction Cleanup and Specialty Hauling — Skip the Dumpster, Call Us</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Knee-deep in drywall dust from a bathroom reno? Backyard full of branches after a storm? Pile of copper pipe from a replumb? Our crew shows up, loads it all by hand, and hauls it. starting at $100/hr. No dumpster blocking your driveway for a week. No weight limits. No overage fees.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Dumpster rental is a racket — $300-$800 per week, weight limits that renovation debris blows through in a day, and you still have to load the thing yourself. With <Link href="/services/construction-debris-removal" className="text-teal-700 font-semibold hover:underline">construction debris removal</Link>, our crew does the loading. Concrete, drywall, lumber, tile, roofing — unlimited weight, starting at $100/hr, dump fees included. If you&apos;re mid-renovation and need pickups every few days, we set up a recurring schedule. Your jobsite stays clean, your driveway stays open, and you don&apos;t spend your Saturday hauling demo waste to the transfer station.</p>
            <p>If you&apos;re ripping out anything metal, pay attention: <Link href="/services/scrap-metal-removal" className="text-teal-700 font-semibold hover:underline">scrap metal</Link> is where contractors get real money back. Copper pipe runs $3-$5 a pound. That replumb you just did? Could be $100-$200 in scrap credit sitting in a pile in the garage. Steel studs, old ductwork, aluminum flashing — it all has value. <Link href="/services/carpet-flooring-removal" className="text-teal-700 font-semibold hover:underline">Carpet and flooring rip-up</Link> is another one we handle start to finish — pull it, roll it, load it, haul it. If there&apos;s hardwood underneath worth salvaging, you get credit for that too.</p>
            <p>After a storm? <Link href="/services/yard-waste-removal" className="text-teal-700 font-semibold hover:underline">Yard waste</Link> — branches, downed limbs, mulch, soil, fencing that blew over. We load it all. Doing a kitchen or bath reno? <Link href="/services/renovation-waste-removal" className="text-teal-700 font-semibold hover:underline">Renovation waste</Link> — old cabinets, countertops, fixtures, tile. Solid wood cabinets earn credit. That granite countertop you&apos;re replacing? Somebody wants it.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "specialty").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMMERCIAL ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Offices, Warehouses, Stores, Hotels — Your Business, Our Crew</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Commercial Junk Removal — The Jobs Where Businesses Actually Get a Check</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">If you run a business, manage property, or oversee a commercial space — this is where our model hits hardest. <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">Commercial furniture and equipment</Link> have the strongest resale markets of anything we touch. Our crew comes in after hours, clears your space, and the credits from your Herman Millers and standing desks often cover the whole bill.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Let&apos;s talk real numbers. Your <Link href="/services/office-cleanouts" className="text-teal-700 font-semibold hover:underline">office has 50 Herman Miller chairs</Link>. Each one resells for $150-$500. That&apos;s $7,500-$25,000 in total resale value — and you get half. Meanwhile, the removal itself might take 8 hours starting at $100/hr = $800. Do the math. We&apos;ve literally handed business owners checks for $3,000-$8,000 after clearing their office. The other guys? They charge you $5,000 for the same job and sell your chairs on their own dime. You&apos;d never know.</p>
            <p><Link href="/services/warehouse-cleanouts" className="text-teal-700 font-semibold hover:underline">Warehouses</Link> are scrap metal heaven — racking, equipment, pallets, steel everywhere. <Link href="/services/retail-cleanouts" className="text-teal-700 font-semibold hover:underline">Retail stores</Link> closing or remodeling have commercial fixtures and shelving with active secondary markets. <Link href="/services/hotel-cleanouts" className="text-teal-700 font-semibold hover:underline">Hotels cycling furniture</Link> — we&apos;ll come in on a Tuesday night, clear 30 rooms worth of beds, dressers, and TVs, and the credit from bulk commercial furniture makes the whole job nearly free. <Link href="/services/property-management-cleanouts" className="text-teal-700 font-semibold hover:underline">Property managers</Link> — we&apos;ll be your regular crew. Same guys every time, they learn your buildings, your tenants&apos; typical left-behinds, and they turn units fast.</p>
            <p><Link href="/services/church-nonprofit-cleanouts" className="text-teal-700 font-semibold hover:underline">Churches</Link> don&apos;t think of themselves as having valuable stuff — until we appraise those 40-year-old pews and the commercial kitchen equipment. <Link href="/services/school-university-cleanouts" className="text-teal-700 font-semibold hover:underline">Schools and universities</Link> — end-of-year dorm furniture, lab equipment, cafeteria tables — it all has buyers. We work evenings and weekends for commercial clients, provide COIs, and document everything for your records. Your schedule, your terms, our crew.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "commercial").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW PRICING WORKS ACROSS ALL SERVICES ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Transparent Junk Removal Pricing For Every Service Type</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Junk Removal Pricing Works — starting at $100/hr Flat Rate With 50% Resale Credit (when applicable) on All {SERVICES.length} Services</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">No matter which of our {SERVICES.length} services you book, the pricing is identical. Here&apos;s exactly how it works so there are zero surprises. See our full <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing page</Link> for examples and math breakdowns.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>The rate:</strong> $100 per hour, 1 hour minimum. This covers everything — labor, truck, fuel, dump fees, transfer station costs, and disposal. There are no add-on charges for heavy items, stairs, long carries, distance to the dump, demolition work, or anything else. If our crew works 2.5 hours, you pay $250 before credits. If they finish in 45 minutes, you pay the $100 minimum.</p>
            <p><strong>The credit:</strong> As items are loaded, our crew appraises anything with fair market resale value. You see every appraisal, you approve every credit. 50% of each item&apos;s appraised value is credited to your bill immediately. A $400 dining table earns you $200 credit. A $300 working refrigerator earns you $150. A $200 set of power tools earns you $100. Credits stack — the more valuable items in your job, the less you pay.</p>
            <p><strong>The payout:</strong> If your total credits exceed your total hours, we pay you the difference. This is most common on <Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">estate cleanouts</Link>, <Link href="/services/office-cleanouts" className="text-teal-700 font-semibold hover:underline">office cleanouts</Link>, and <Link href="/services/garage-cleanouts" className="text-teal-700 font-semibold hover:underline">garage cleanouts</Link> with high concentrations of valuable items. We process payouts by check or digital transfer on the spot.</p>
            <p><strong>No contracts:</strong> Every job is standalone. No subscriptions, no recurring charges, no minimums beyond the 1 hour minimum. <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">Book when you need us</Link>, pay for the time we work, get credited for valuable items. That&apos;s it.</p>
          </div>
        </div>
      </section>

      {/* ===== WHY NOT OTHER COMPANIES ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Why Every Other Junk Removal Company Costs You More</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">We Pay You Junk Removal vs. 1-800-GOT-JUNK, Junk King & Traditional Haulers</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every other junk removal company in America uses the same broken model: charge you by truck volume, haul everything away, resell your valuable items for their own profit. Here&apos;s why that costs you more on every single one of these {SERVICES.length} services.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Traditional junk removal companies charge $200-$800+ based on how much space your items take up in the truck. This volume-based pricing is inherently opaque — you can&apos;t verify how much space your items actually occupy, and the company has every incentive to round up. They also profit twice: once from your removal fee and again from reselling your valuable items. A couch worth $300 on the resale market costs you $150 to remove and makes them $300 in revenue. Your total loss: $450. Their total gain: $450.</p>
            <p>With We Pay You Junk Removal, that same couch costs you starting at $100/hr for removal time, and you get $150 credited to your bill (50% (when applicable) of $300 resale value). If the job takes one hour, you net $50 in credit toward other items on the truck. Even in the worst case — no valuable items at all — our starting at $100/hr rate is almost always cheaper than flat-rate pricing for the same volume of stuff, because you&apos;re paying for actual time, not an inflated volume estimate.</p>
            <p>This applies across all {SERVICES.length} of our services. <Link href="/services/furniture-removal" className="text-teal-700 font-semibold hover:underline">Furniture removal</Link> with us saves 30-50% vs flat-rate. <Link href="/services/appliance-removal" className="text-teal-700 font-semibold hover:underline">Appliance removal</Link> frequently results in payouts. <Link href="/services/office-cleanouts" className="text-teal-700 font-semibold hover:underline">Office cleanouts</Link> save businesses thousands. There is no scenario where the traditional model is cheaper than ours — the math always favors the customer.</p>
          </div>
        </div>
      </section>

      {/* ===== NATIONWIDE COVERAGE ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">All {SERVICES.length} Services Available in {CITY_COUNT}+ Cities</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Nationwide Junk Removal — Every Service Available in Every City We Serve</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">All {SERVICES.length} junk removal services are available in every one of our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT}+ cities across {STATE_COUNT} states</Link>. Same rate, same credit system, same quality. <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">Book now</Link> or call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a> for same-day service.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>We operate from 50 offices — one in every state — with local crews who know their markets. Whether you need <Link href="/services/full-service-junk-removal" className="text-teal-700 font-semibold hover:underline">full-service junk removal</Link> in New York City, <Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">estate cleanouts</Link> in Los Angeles, <Link href="/services/construction-debris-removal" className="text-teal-700 font-semibold hover:underline">construction debris hauling</Link> in Chicago, or <Link href="/services/office-cleanouts" className="text-teal-700 font-semibold hover:underline">office cleanouts</Link> in Houston — same starting rate, same 50% Resale Credit (when applicable), same professional crew. Same-day service available in most cities for calls placed before noon.</p>
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Book Any of Our {SERVICES.length} Services — starting at $100/hr Nationwide
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Same rate on every service. Dump fees included (an industry first). 50% Resale Credit (when applicable). Same-day available in {CITY_COUNT}+ cities.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
