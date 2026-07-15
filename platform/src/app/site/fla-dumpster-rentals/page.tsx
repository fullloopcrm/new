import type { Metadata } from "next";
import Link from "next/link";
import {
  PHONE,
  SITE_NAME,
  SITE_URL,
  EMAIL,
  ADDRESS,
  getHomePageSchema,
  getFAQPageSchema,
} from "@/app/site/fla-dumpster-rentals/_lib/seo";
import {
  getAllServices,
  getAllNeighborhoods,
  getRegions,
  getNeighborhoodsByRegion,
  getCategories,
  getServicesByCategory,
} from "@/app/site/fla-dumpster-rentals/_lib/data";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

const phonePlain = PHONE.replace(/-/g, "");

export const metadata: Metadata = {
  title: `Florida Dumpster Rentals | 10, 20 & 30 Yard Roll-Off Dumpsters | ${PHONE}`,
  description: `Affordable dumpster rental across all of Florida. 10, 20 & 30 yard roll-off containers for construction, junk removal, home cleanouts, roofing, demolition & more. Same-day delivery. Call ${PHONE} for a free quote.`,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `Florida Dumpster Rentals | Call ${PHONE}`,
    description: `10, 20 & 30 yard roll-off dumpsters delivered across Florida. Same-day delivery, flat-rate pricing, no hidden fees. Call ${PHONE}.`,
    url: SITE_URL,
    type: "website",
  },
};

const faqs = [
  {
    q: "What size dumpster do I need for my project?",
    a: "For small cleanouts and garage cleanups, a 10-yard dumpster handles about 4 pickup truck loads and is usually enough. For renovation projects, roofing tear-offs, and larger cleanouts, a 20-yard dumpster is our most popular size at roughly 8 pickup truck loads. For new construction, demolition, and large commercial projects, go with a 30-yard dumpster which holds approximately 12 pickup truck loads. Not sure? Text us your project details and we will recommend the perfect size — no charge, no obligation.",
  },
  {
    q: "How much does a dumpster rental cost in Florida?",
    a: "Pricing depends on dumpster size, your location in Florida, and how long you need the rental. Our 10-yard dumpsters start around $275 to $350, 20-yard dumpsters range from $350 to $450, and 30-yard dumpsters go from $450 to $750. All pricing is flat-rate with no hidden fees — the price we quote includes delivery, pickup, disposal, and your rental period. Call us at 954-710-2332 for an exact quote specific to your area and project.",
  },
  {
    q: "How long can I keep the dumpster at my property?",
    a: "Standard rental periods are 7 to 10 days, which is enough time for most projects. If you need it longer, no problem at all — just let us know and we can extend your rental at a reasonable daily rate. We understand that projects do not always go according to schedule, especially in Florida where afternoon thunderstorms can slow things down. Flexible scheduling is one of the things our customers appreciate most about working with us.",
  },
  {
    q: "Do you offer same-day dumpster delivery in Florida?",
    a: "Yes, we offer same-day delivery across most of Florida when you text or call us before noon. Next-day delivery is available statewide for orders placed any time. We serve every county in Florida from Miami-Dade to Escambia, and our network of local haulers means we can get a dumpster to your location fast. Text us at 954-710-2332 for the quickest response.",
  },
  {
    q: "What materials can I put in a dumpster?",
    a: "Most household and construction debris is accepted: furniture, appliances, drywall, roofing shingles, wood, concrete, yard waste, general junk, carpet, flooring, siding, and more. Items not accepted include hazardous materials, tires, batteries, paint, chemicals, asbestos, and medical waste. If you are unsure whether a specific material is accepted, text us a photo and we will let you know immediately. For certain materials like concrete and clean fill, we can often arrange special pricing.",
  },
  {
    q: "Do I need a permit to put a dumpster on my property in Florida?",
    a: "If the dumpster is placed on your private property — your driveway, yard, or parking lot — no permit is needed anywhere in Florida. If the dumpster needs to go on a public street, sidewalk, or right-of-way, you may need a permit from your local municipality. Permit requirements and fees vary by city and county. We can help guide you through the process and even handle the permit application in many Florida jurisdictions. Just ask when you call or text.",
  },
  {
    q: "What areas in Florida do you serve with dumpster delivery?",
    a: "We serve the entire state of Florida — all 67 counties, every major city, and hundreds of smaller communities. From Miami and Fort Lauderdale in South Florida to Jacksonville and St. Augustine in the north, from Tampa and St. Petersburg on the Gulf Coast to Daytona Beach and Melbourne on the Atlantic, and everywhere in between including the Florida Keys and the Panhandle. No matter where you are in FL, we can deliver a dumpster to you.",
  },
  {
    q: "How does the dumpster rental ordering process work?",
    a: "It could not be simpler. Step one: text or call us at 954-710-2332 with your project type, location, and preferred delivery date. Step two: we give you an instant flat-rate quote with no hidden fees. Step three: we deliver the dumpster to your location on schedule — same-day or next-day in most areas. Step four: you fill it up on your own schedule during the rental period. Step five: text or call us when you are done and we pick it up and haul everything away. Average time from first text to confirmed booking is about 30 seconds.",
  },
  {
    q: "Do you offer contractor accounts and volume discounts?",
    a: "Absolutely. We offer dedicated contractor and corporate accounts with volume pricing for builders, general contractors, property managers, and businesses with recurring dumpster needs. Contractor accounts include priority scheduling, flexible billing, multi-site delivery coordination, and a dedicated account manager. Many of our contractor clients save 15 to 25 percent compared to one-off rental pricing. Contact us to set up an account — we can usually get you approved and delivering within 24 hours.",
  },
  {
    q: "What happens if I overfill my dumpster or need a swap?",
    a: "Dumpsters should be filled to the top of the container walls — not above them. Overfilled dumpsters create safety hazards during transport on Florida roads. If you have more debris than expected, we offer quick swap service: we pick up the full dumpster and drop off an empty one, often on the same day. If you slightly overfill, we may be able to work with you on a small overage fee rather than requiring a swap. Just communicate with us and we will find the most cost-effective solution.",
  },
  {
    q: "What is your dumpster brokerage service and how does it save me money?",
    a: "We operate as both a direct provider and a dumpster broker. Our brokerage service connects you with the best local haulers in your specific area of Florida, ensuring you get competitive pricing and reliable service no matter where you are in the state. Because we work with a network of vetted haulers, we can often offer better pricing and faster delivery than going direct — especially in rural areas or during high-demand periods like hurricane season. You get one point of contact (us) while we coordinate everything behind the scenes.",
  },
  {
    q: "Can I rent a dumpster for a single day in Florida?",
    a: "Yes, we offer short-term rentals including single-day and weekend rentals for projects that do not need a full 7-day period. Single-day rentals are popular for garage cleanouts, small moving projects, and community cleanup events. Pricing for short-term rentals is slightly different from our standard 7-day rates. Text or call us at 954-710-2332 to get a quote for your specific timeline.",
  },
  {
    q: "How heavy can the debris in my dumpster be?",
    a: "Weight limits vary by dumpster size and hauler. Generally, 10-yard dumpsters have a 2-ton weight limit, 20-yard dumpsters allow 3 to 4 tons, and 30-yard dumpsters handle 4 to 5 tons. Heavy materials like concrete, brick, dirt, and roofing shingles add up fast. If your project involves heavy materials, let us know upfront so we can recommend the right size and ensure the weight limit works for you. Overweight fees apply if you exceed the limit, so it pays to plan ahead.",
  },
  {
    q: "What makes Florida Dumpster Rentals different from other companies?",
    a: "Three things set us apart. First, we serve the entire state of Florida with a single phone number — no need to figure out which local company covers your area. Second, our pricing is transparent and flat-rate with no hidden fees, no fuel surcharges, and no surprise charges. Third, we make it ridiculously easy to order — text us your project details and you will have a confirmed booking in about 30 seconds. We also maintain a 4.9-star rating across over 1,200 verified customer reviews, which means we are consistently delivering on our promises.",
  },
];

export default function Home() {
  const services = getAllServices();
  const neighborhoods = getAllNeighborhoods();
  const regions = getRegions();
  const byRegion = getNeighborhoodsByRegion();
  const categories = getCategories();
  const servicesByCategory = getServicesByCategory();

  const totalPages = services.length * neighborhoods.length + neighborhoods.length + services.length;
  const cityCount = neighborhoods.filter((n) => n.type === "city").length;
  const countyCount = neighborhoods.filter((n) => n.type === "county").length;
  const communityCount = neighborhoods.filter(
    (n) => n.type === "community" || n.type === "neighborhood"
  ).length;

  return (
    <>
      {getHomePageSchema().map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getFAQPageSchema(faqs)).replace(/</g, '\\u003c'),
        }}
      />

      {/* ============================================= */}
      {/* HERO — Split layout: copy left, trust boxes right */}
      {/* ============================================= */}
      <section className="relative overflow-hidden bg-stone-950 py-20 sm:py-28">
        <div className="pointer-events-none absolute -right-64 -top-64 h-[500px] w-[500px] rounded-full bg-orange-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[300px] w-[300px] rounded-full bg-orange-600/[0.05] blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            {/* Left: Copy */}
            <div>
              <p className="inline-block rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-orange-400 shadow-sm shadow-orange-500/10">
                Serving All 67 Florida Counties
              </p>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Florida Dumpster Rental.{" "}
                <span className="text-orange-400">Your Junk, Gone.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-stone-300">
                10, 20 &amp; 30 yard roll-off dumpsters delivered anywhere in
                Florida. Same-day available. Flat-rate pricing. No hidden fees.
                Text us, get a quote in 30 seconds, and we handle the rest.
              </p>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-400">
                Construction, roofing, demolition, home cleanouts, junk removal,
                storm debris — we have hauled it all across every corner of
                Florida. We are not here to judge your garage. Just to empty it.
              </p>
              {/* Trust row */}
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-orange-400">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  No money up front
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-orange-400">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  Pay when done
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-orange-400">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  Top-tier communication &amp; service
                </div>
              </div>
              <CTAGroup variant="hero" />
              <p className="mt-6 text-xs text-stone-400">
                {ADDRESS}
              </p>
            </div>

            {/* Right: 4 Trust Point Boxes with SEO descriptions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="group rounded-2xl border border-stone-800/80 bg-stone-900/40 p-5 backdrop-blur-sm transition-all duration-300 hover:border-orange-500/30 hover:bg-stone-900/60 hover:shadow-lg hover:shadow-orange-500/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-400/10">
                    <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {neighborhoods.length}+
                    </p>
                    <p className="text-xs font-semibold text-stone-300">
                      Florida Areas Served
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-stone-300">
                  Cities, counties, and communities across all of Florida —
                  from Miami-Dade to the Panhandle.
                </p>
              </div>

              <div className="group rounded-2xl border border-stone-800/80 bg-stone-900/40 p-5 backdrop-blur-sm transition-all duration-300 hover:border-yellow-500/30 hover:bg-stone-900/60 hover:shadow-lg hover:shadow-yellow-500/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      4.9 Stars
                    </p>
                    <p className="text-xs font-semibold text-stone-300">
                      1,247 Verified Reviews
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-stone-400">
                  Top-rated FL dumpster rental — trusted by homeowners,
                  contractors, and property managers statewide.
                </p>
              </div>

              <div className="group rounded-2xl border border-stone-800/80 bg-stone-900/40 p-5 backdrop-blur-sm transition-all duration-300 hover:border-orange-500/30 hover:bg-stone-900/60 hover:shadow-lg hover:shadow-orange-500/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-400/10">
                    <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">~30 Sec</p>
                    <p className="text-xs font-semibold text-stone-300">
                      Book by Text Message
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-stone-400">
                  Text your zip code and project type — get a flat-rate
                  dumpster quote back in seconds. No forms, no hold music.
                </p>
              </div>

              <div className="group rounded-2xl border border-stone-800/80 bg-stone-900/40 p-5 backdrop-blur-sm transition-all duration-300 hover:border-orange-500/30 hover:bg-stone-900/60 hover:shadow-lg hover:shadow-orange-500/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-400/10">
                    <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">$0 Hidden</p>
                    <p className="text-xs font-semibold text-stone-300">
                      Flat-Rate Dumpster Pricing
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-stone-400">
                  Delivery, pickup, rental period, and disposal included. No
                  fuel surcharges, no surprise fees. Ever.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* HOW IT WORKS — Moved up for engagement */}
      {/* ============================================= */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            How Dumpster Rental Works in Florida
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-stone-500">
            We have stripped out every unnecessary step. No account creation, no
            lengthy forms, no waiting on hold. Here is the entire process — it
            takes about 30 seconds.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Text or Call Us",
                desc: "Send us a text or call 954-710-2332 with your project type, address, and preferred delivery date. We respond within minutes — often within seconds. No phone trees, no hold music, no robots. Just a real person who knows dumpsters and knows Florida.",
                humor:
                  "Seriously, you can order a dumpster faster than you can order a coffee at the drive-through. We timed it.",
              },
              {
                step: "2",
                title: "We Deliver — Fast",
                desc: "We drop off the dumpster right where you need it — your driveway, job site, parking lot, or wherever works best. Same-day delivery is available in most Florida metro areas for orders placed before noon. Next-day delivery is available statewide.",
                humor:
                  "We have delivered dumpsters to beach houses, orange groves, and one memorable llama farm in Ocala. If you have an address in Florida, we can get a dumpster there.",
              },
              {
                step: "3",
                title: "Fill It Up, We Haul It Away",
                desc: "Take your time filling the dumpster during your rental period — 7 to 10 days standard. When you are done, text or call us. We come pick it up and dispose of everything properly. Your project is done and your property is clean.",
                humor:
                  "The only hard part is deciding what to throw away. That bread maker from 2009 that you have used exactly once? In the dumpster. Your ex's stuff that is still in the garage? Definitely in the dumpster.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-xl font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mt-4 text-xl font-bold text-zinc-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-zinc-600">{s.desc}</p>
                <p className="mt-3 text-sm italic text-stone-400">{s.humor}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* PRICING BREAKDOWN — Moved up */}
      {/* ============================================= */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            Dumpster Rental Pricing in Florida — What to Expect
          </h2>
          <div className="mt-6 max-w-4xl space-y-4 text-lg leading-relaxed text-stone-300">
            <p>
              Dumpster rental pricing in Florida varies based on three main
              factors: the size of the dumpster, your location within the state,
              and how long you need the rental. Urban areas like Miami, Tampa,
              and Orlando tend to have slightly higher pricing due to landfill
              costs and demand, while rural areas and smaller cities often come
              in at the lower end of the range.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-xl border border-stone-800">
            <table className="w-full text-left">
              <thead className="bg-stone-900">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-stone-200">
                    Size
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-stone-200">
                    Price Range
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-stone-200">
                    Rental Period
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-stone-200">
                    Weight Limit
                  </th>
                  <th className="hidden px-6 py-4 text-sm font-semibold text-stone-200 sm:table-cell">
                    Best For
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                <tr className="bg-stone-900/50">
                  <td className="px-6 py-4 font-medium text-white">
                    10 Yard
                  </td>
                  <td className="px-6 py-4 font-semibold text-orange-400">
                    $275 - $350
                  </td>
                  <td className="px-6 py-4 text-stone-300">7 days</td>
                  <td className="px-6 py-4 text-stone-300">2 tons</td>
                  <td className="hidden px-6 py-4 text-sm text-stone-400 sm:table-cell">
                    Garage cleanouts, small remodels
                  </td>
                </tr>
                <tr className="bg-stone-900/50">
                  <td className="px-6 py-4 font-medium text-white">
                    20 Yard
                  </td>
                  <td className="px-6 py-4 font-semibold text-orange-400">
                    $350 - $450
                  </td>
                  <td className="px-6 py-4 text-stone-300">7-10 days</td>
                  <td className="px-6 py-4 text-stone-300">3-4 tons</td>
                  <td className="hidden px-6 py-4 text-sm text-stone-400 sm:table-cell">
                    Renovations, roofing, large cleanouts
                  </td>
                </tr>
                <tr className="bg-stone-900/50">
                  <td className="px-6 py-4 font-medium text-white">
                    30 Yard
                  </td>
                  <td className="px-6 py-4 font-semibold text-orange-400">
                    $450 - $750
                  </td>
                  <td className="px-6 py-4 text-stone-300">7-10 days</td>
                  <td className="px-6 py-4 text-stone-300">4-5 tons</td>
                  <td className="hidden px-6 py-4 text-sm text-stone-400 sm:table-cell">
                    Construction, demolition, storm debris
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-6 max-w-4xl space-y-4 text-lg leading-relaxed text-stone-300">
            <p>
              All of our pricing is flat-rate. The quote you receive includes
              delivery, pickup, disposal fees, and your entire rental period.
              There are no hidden fuel surcharges, no environmental fees, and no
              surprise add-ons. If you go over the weight limit, we will notify
              you before any additional charges apply.
            </p>
            <p>
              For the most accurate pricing for your specific project and
              location, text or call us at{" "}
              <a href={`tel:${phonePlain}`} className="font-semibold text-orange-400 hover:text-orange-300">
                {PHONE}
              </a>
              . We can usually get you a quote in under a minute.
            </p>
          </div>
          <CTAGroup variant="hero" />
        </div>
      </section>

      {/* ============================================= */}
      {/* INTRO — Why Florida Is the Busiest Market */}
      {/* ============================================= */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
            Why Florida Is the Busiest Dumpster Rental Market in America
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-stone-500">
            22 million residents. 67 counties. Constant construction. Here is
            why Florida generates more dumpster demand than almost any other
            state.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {/* Growth & Construction */}
            <div className="rounded-xl border border-zinc-200 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900">
                Fastest-Growing State in the Country
              </h3>
              <p className="mt-2 leading-relaxed text-zinc-600">
                Florida is not just the Sunshine State — it is the
                fastest-growing state in the country, and that growth generates
                an enormous amount of waste. With over 22 million residents and
                hundreds of thousands of new residents moving in every year,{" "}
                <Link href="/construction-dumpster-rental" className="font-medium text-orange-600 hover:text-orange-700">
                  construction is booming
                </Link>{" "}
                from the Panhandle to the Keys. New housing developments,{" "}
                <Link href="/commercial-dumpster-rental" className="font-medium text-orange-600 hover:text-orange-700">
                  commercial projects
                </Link>
                , infrastructure upgrades, and{" "}
                <Link href="/renovation-dumpster-rental" className="font-medium text-orange-600 hover:text-orange-700">
                  renovations of aging properties
                </Link>{" "}
                create a constant demand for reliable, affordable dumpster
                rental services.
              </p>
            </div>

            {/* Hurricane Season */}
            <div className="rounded-xl border border-zinc-200 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.194-.14 1.743" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900">
                Hurricane Season Creates Massive Demand
              </h3>
              <p className="mt-2 leading-relaxed text-zinc-600">
                Beyond new construction, Florida homeowners face unique
                challenges that make dumpster rental essential. Hurricane season
                runs from June through November, and even a single storm can
                generate massive amounts of debris — fallen trees, damaged
                roofing, destroyed fencing, waterlogged furniture, and ruined
                building materials. After Hurricane Ian in 2022, demand for{" "}
                <Link href="/storm-debris-dumpster-rental" className="font-medium text-orange-600 hover:text-orange-700">
                  storm debris dumpster rentals
                </Link>{" "}
                in{" "}
                <Link href="/areas#southwest-florida" className="font-medium text-orange-600 hover:text-orange-700">
                  Southwest Florida
                </Link>{" "}
                surged by over 400 percent. Having a trusted dumpster rental
                provider on speed dial is not optional — it is a necessity.
              </p>
            </div>

            {/* Climate Wear & Tear */}
            <div className="rounded-xl border border-zinc-200 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900">
                The Florida Climate Takes a Toll Year-Round
              </h3>
              <p className="mt-2 leading-relaxed text-zinc-600">
                The intense heat, humidity, salt air along the coasts, and
                frequent afternoon thunderstorms accelerate wear and tear on
                everything from{" "}
                <Link href="/roofing-dumpster-rental" className="font-medium text-orange-600 hover:text-orange-700">
                  roofing shingles
                </Link>{" "}
                to exterior siding to{" "}
                <Link href="/landscaping-dumpster-rental" className="font-medium text-orange-600 hover:text-orange-700">
                  landscaping
                </Link>
                . Florida homeowners replace roofs more frequently, renovate more
                often, and maintain their properties more actively than
                homeowners in most other states. Every one of those projects
                generates debris that needs to go somewhere — and that somewhere
                is a roll-off dumpster in your driveway.
              </p>
            </div>

            {/* Contractors */}
            <div className="rounded-xl border border-zinc-200 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.194-.14 1.743" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900">
                Contractors Need Reliable Waste Partners
              </h3>
              <p className="mt-2 leading-relaxed text-zinc-600">
                For{" "}
                <Link href="/construction-dumpster-rental" className="font-medium text-orange-600 hover:text-orange-700">
                  contractors and builders
                </Link>
                , Florida is the land of opportunity — but only if you can keep
                your job sites clean, organized, and compliant with local
                ordinances. A reliable dumpster rental partner is as important as
                your subcontractors. Late deliveries, missed pickups, and
                surprise fees can throw off your schedule and blow your budget.
                That is exactly why Florida contractors trust us: we deliver on
                time, price with{" "}
                <Link href="/pricing" className="font-medium text-orange-600 hover:text-orange-700">
                  flat-rate transparency
                </Link>
                , and make scheduling as easy as sending a text message.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* DUMPSTER SIZES — Detailed breakdown */}
      {/* ============================================= */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Choose Your Dumpster Size
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-stone-500">
            Not sure which size you need? Text us your project details at{" "}
            <a href={`sms:${phonePlain}`} className="text-orange-600 font-semibold">
              {PHONE}
            </a>{" "}
            and we will recommend the right one — free, no obligation.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                size: "10",
                label: "10 Yard Dumpster",
                dimensions: "12' L x 8' W x 3.5' H",
                capacity: "4 pickup truck loads (~2 tons)",
                bestFor:
                  "Small cleanouts, garage cleanups, small bathroom or kitchen remodels, single-room renovations",
                price: "Starting at $275",
                idealFor:
                  "The 10-yard dumpster is perfect for smaller residential projects. Think garage decluttering, a single bathroom remodel, a small landscaping project, or cleaning out a one-bedroom apartment. It fits easily in a standard driveway and holds about 4 pickup truck loads of debris. For Florida homeowners doing a weekend clean-up project, this is often the most cost-effective choice.",
                weight: "2-ton weight limit",
              },
              {
                size: "20",
                label: "20 Yard Dumpster",
                dimensions: "22' L x 8' W x 4.5' H",
                capacity: "8 pickup truck loads (~3-4 tons)",
                bestFor:
                  "Renovations, roofing tear-offs, large cleanouts, deck removal, flooring, full-kitchen remodels",
                price: "Starting at $350",
                popular: true,
                idealFor:
                  "Our most popular size for a reason. The 20-yard dumpster handles the majority of residential renovation projects, roofing tear-offs for average-sized Florida homes, and large cleanouts. It is the sweet spot between capacity and footprint — big enough for serious projects but compact enough to fit in most driveways. If you are not sure between sizes, the 20-yard is almost always the right call.",
                weight: "3-4 ton weight limit",
              },
              {
                size: "30",
                label: "30 Yard Dumpster",
                dimensions: "22' L x 8' W x 6' H",
                capacity: "12 pickup truck loads (~4-5 tons)",
                bestFor:
                  "New construction, demolition, large commercial projects, whole-house cleanouts, storm debris",
                price: "Starting at $450",
                idealFor:
                  "The 30-yard dumpster is built for big jobs. New construction waste, whole-house demolitions, large commercial cleanouts, and major storm debris cleanup all call for this size. Florida contractors use 30-yard dumpsters on most commercial job sites. For homeowners, this is the right choice when you are gutting an entire house, doing a major addition, or dealing with significant hurricane damage.",
                weight: "4-5 ton weight limit",
              },
            ].map((d) => (
              <div
                key={d.size}
                className={`relative rounded-2xl border p-8 ${
                  d.popular
                    ? "border-orange-600 shadow-lg shadow-orange-100"
                    : "border-zinc-200"
                }`}
              >
                {d.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-orange-600 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <div>
                  <span className="text-5xl font-bold text-orange-600">
                    {d.size}
                  </span>
                  <span className="ml-1 text-lg font-medium text-stone-500">
                    yard
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-zinc-900">
                  {d.label}
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {d.dimensions}
                </p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-orange-600">&#10003;</span>
                    <span className="text-sm text-zinc-700">{d.capacity}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-orange-600">&#10003;</span>
                    <span className="text-sm text-zinc-700">{d.bestFor}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-orange-600">&#10003;</span>
                    <span className="text-sm text-zinc-700">{d.weight}</span>
                  </div>
                </div>
                <p className="mt-6 text-lg font-bold text-zinc-900">
                  {d.price}
                </p>
                <a
                  href={`sms:${phonePlain}?body=I'm interested in a ${d.size} yard dumpster`}
                  className="mt-4 block w-full rounded-lg bg-orange-600 py-3 text-center text-sm font-semibold text-white hover:bg-orange-700"
                >
                  Text for a Quote
                </a>
                <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                  {d.idealFor}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/dumpster-sizes"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              View detailed size comparison guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTAGroup variant="mid" />

      {/* ============================================= */}
      {/* WHY CHOOSE US — Detailed value props */}
      {/* ============================================= */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Why Florida Trusts Us With Their Dumpster Rentals
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-stone-500">
            We are not the only dumpster rental company in Florida. But we are
            the one that over 1,200 customers have rated 4.9 stars. Here is why.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Flat-Rate, Transparent Pricing",
                desc: "The price we quote is the price you pay. Period. No fuel surcharges, no environmental fees, no delivery charges tacked on at the end. Our flat-rate pricing includes delivery, pickup, disposal, and your full rental period. You will never open a bill from us and wonder where the extra charges came from.",
              },
              {
                title: "Same-Day & Next-Day Delivery",
                desc: "When you need a dumpster, you usually need it now — not next week. We offer same-day delivery in most Florida metro areas for orders placed before noon. Next-day delivery is available statewide. Our network of local haulers across all 67 Florida counties means we are never far from your location.",
              },
              {
                title: "Text-First Communication",
                desc: "We get it — nobody wants to sit on hold or play phone tag. That is why we built our entire operation around text messaging. Text us your project details, get a quote back in minutes, confirm your booking with a reply, and schedule your pickup the same way. It is 2026. Ordering a dumpster should be as easy as ordering dinner.",
              },
              {
                title: "Every Size for Every Project",
                desc: "Whether you are cleaning out a single closet or demolishing an entire building, we have the right dumpster for you. Our 10, 20, and 30 yard roll-off containers cover the full range of residential, commercial, and industrial projects. Not sure which size? We help you choose — no upselling, just honest recommendations based on your project.",
              },
              {
                title: "Statewide Coverage, Local Service",
                desc: "One phone number covers all of Florida. You do not need to figure out which local company serves your area, call multiple providers for quotes, or deal with a company that does not understand your region. We serve every county from Monroe to Escambia, and we partner with local haulers who know every road, every neighborhood, and every dump site in their area.",
              },
              {
                title: "Contractor & Business Accounts",
                desc: "If you rent dumpsters regularly, our contractor and corporate accounts save you time and money. Volume pricing, priority scheduling, consolidated invoicing, dedicated account management, and multi-site coordination. We work with some of the largest builders and property managers in Florida, and we would love to work with you too.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-zinc-200 p-6"
              >
                <h3 className="text-lg font-bold text-zinc-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* SERVICES — All services with descriptions */}
      {/* ============================================= */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Dumpster Rental for Every Type of Project in Florida
          </h2>
          <p className="mt-3 text-lg text-stone-500">
            {services.length} specialized services across{" "}
            {neighborhoods.length}+ Florida locations. Whatever your project,
            we have the right dumpster and the experience to support it.
          </p>
          <div className="mt-10 space-y-12">
            {categories.map((category) => {
              const catServices = servicesByCategory[category];
              if (!catServices || catServices.length === 0) return null;
              return (
                <div key={category}>
                  <h3 className="text-xl font-bold text-zinc-800">
                    {category} Dumpster Services
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {catServices.map((svc) => (
                      <Link
                        key={svc.slug}
                        href={`/${svc.slug}`}
                        className="group rounded-xl border border-zinc-200 bg-white p-6 hover:border-orange-300 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-zinc-900 group-hover:text-orange-600">
                            {svc.name}
                          </h4>
                          <div className="flex items-center gap-1 text-sm text-stone-400">
                            <svg
                              className="h-4 w-4 text-yellow-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>
                              {svc.avgRating} ({svc.reviewCount})
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                          {svc.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
                          <span>{svc.priceRange}</span>
                          <span>Recommended: {svc.recommendedSize}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8">
            <Link
              href="/services"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              View all {services.length} services with full details &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* WHAT GOES IN / WHAT STAYS OUT */}
      {/* ============================================= */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            What Can You Put in a Dumpster in Florida?
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-stone-500">
            Knowing what is accepted saves you time, money, and headaches. Here
            is the full breakdown for Florida dumpster rentals.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-8">
              <h3 className="text-xl font-bold text-orange-800">
                Accepted Materials
              </h3>
              <p className="mt-2 text-sm text-orange-700">
                These items can go in your dumpster with no issues.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {[
                  "Household furniture",
                  "Appliances (most)",
                  "Drywall & sheetrock",
                  "Roofing shingles",
                  "Wood & lumber",
                  "Concrete & brick",
                  "Yard waste & branches",
                  "General junk & clutter",
                  "Carpet & padding",
                  "Flooring materials",
                  "Siding & gutters",
                  "Windows & doors",
                  "Cabinets & countertops",
                  "Fencing materials",
                  "Cardboard & paper",
                  "Clothing & textiles",
                  "Toys & sporting goods",
                  "Small electronics",
                  "Mattresses & box springs",
                  "Bathroom fixtures",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-orange-800">
                    <span className="text-orange-600">&#10003;</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-8">
              <h3 className="text-xl font-bold text-red-800">
                Not Accepted
              </h3>
              <p className="mt-2 text-sm text-red-700">
                These items require special disposal and cannot go in a standard
                dumpster. Florida law prohibits dumping hazardous materials.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Hazardous waste & chemicals",
                  "Paint, stains & solvents",
                  "Asbestos-containing materials",
                  "Tires (special disposal required)",
                  "Batteries (all types)",
                  "Medical & biological waste",
                  "Propane tanks & compressed gas",
                  "Refrigerants & freon appliances (unless drained)",
                  "Motor oil & automotive fluids",
                  "Pesticides & herbicides",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-red-800">
                    <span className="text-red-600">&#10007;</span> {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-red-700">
                Not sure if something is accepted? Text us a photo at {PHONE}{" "}
                and we will let you know in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-FAQ CTA */}
      <CTAGroup variant="preFaq" />

      {/* ============================================= */}
      {/* SERVICE AREAS — Detailed region breakdown */}
      {/* ============================================= */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Dumpster Delivery Across All of Florida
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-stone-500">
            We deliver roll-off dumpsters to {neighborhoods.length}+ locations
            across {regions.length} Florida regions — {countyCount} counties,{" "}
            {cityCount} cities, and {communityCount} communities and
            neighborhoods. If you have a Florida address, we can get a dumpster
            to you.
          </p>
          <div className="mt-10 space-y-8">
            {regions.map((region) => {
              const regionNeighborhoods = byRegion[region];
              if (!regionNeighborhoods || regionNeighborhoods.length === 0)
                return null;
              return (
                <div
                  key={region}
                  id={region.toLowerCase().replace(/\s+/g, "-")}
                >
                  <h3 className="text-xl font-bold text-zinc-800">
                    Dumpster Rental in {region}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    {regionNeighborhoods.length} locations served
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {regionNeighborhoods.map((n) => (
                      <Link
                        key={n.slug}
                        href={`/areas/${n.slug}`}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 hover:border-orange-300 hover:text-orange-700"
                      >
                        {n.name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10">
            <Link
              href="/areas"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Browse all {neighborhoods.length} locations &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* FLORIDA-SPECIFIC TIPS */}
      {/* ============================================= */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Dumpster Rental Tips Specific to Florida
          </h2>
          <p className="mt-3 text-lg text-stone-500">
            Florida is not like other states when it comes to dumpster rental.
            Here are the things every Florida customer should know.
          </p>
          <div className="mt-8 space-y-6">
            {[
              {
                title: "Plan Around Hurricane Season (June - November)",
                content:
                  "Dumpster demand spikes dramatically after tropical storms and hurricanes. If a storm is forecast, book your dumpster as early as possible — availability can dry up fast in affected areas. After a major storm, expect 1-3 day delays for delivery as the entire waste management industry in the affected region works to clear debris. We prioritize storm debris cleanup and expand our hauler network during active hurricane responses.",
              },
              {
                title: "Watch for HOA Dumpster Rules",
                content:
                  "Many Florida neighborhoods, especially in South Florida and the Tampa Bay area, have strict HOA rules about dumpster placement, duration, and even the color of tarps or covers. Before ordering, check with your HOA about any restrictions. Some HOAs require advance notification, limit rental duration to 72 hours, or mandate that dumpsters be placed in specific locations. We can help you navigate these requirements — just let us know you are in an HOA community when you order.",
              },
              {
                title: "Florida Heat Means Plan Your Fill Time",
                content:
                  "Working outside in Florida heat is no joke, especially from May through October. Plan your heaviest loading for early morning or late afternoon. If you have a 7-day rental, you do not need to rush — spread the work across multiple cooler sessions rather than trying to fill the dumpster in one sweltering afternoon. Your dumpster is not going anywhere, and neither should you if the heat index is over 105.",
              },
              {
                title: "Afternoon Thunderstorms Are Real — Cover Your Load",
                content:
                  "Florida's famous afternoon thunderstorms can dump inches of rain in minutes. If your dumpster is full of materials that absorb water — like carpet, clothing, drywall, or cardboard — the added water weight can push you over your weight limit and increase disposal costs. Use a tarp to cover your dumpster between loading sessions, especially during summer months.",
              },
              {
                title: "Concrete and Heavy Debris Need Special Planning",
                content:
                  "Florida construction often involves concrete block construction, stucco, and tile — all heavy materials. A 10-yard dumpster filled with concrete will exceed its weight limit fast. If your project generates heavy materials, tell us upfront so we can recommend the right size and set appropriate weight expectations. In many cases, we can arrange a dedicated heavy-debris dumpster at special pricing.",
              },
              {
                title: "Yard Waste Is Year-Round in Florida",
                content:
                  "Unlike northern states where yard work is seasonal, Florida landscaping generates waste 12 months a year. Palm fronds, tropical overgrowth, fallen branches from storms, and lawn renovation debris all need to go somewhere. Our yard waste dumpster rentals are among our most popular services — and since yard waste often qualifies for cheaper disposal rates, we can frequently offer better pricing for clean yard waste loads.",
              },
            ].map((tip) => (
              <div key={tip.title} className="border-b border-zinc-200 pb-6">
                <h3 className="text-lg font-semibold text-zinc-900">
                  {tip.title}
                </h3>
                <p className="mt-2 leading-relaxed text-zinc-600">
                  {tip.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Inline CTA */}
      <CTAGroup variant="inline" />

      {/* ============================================= */}
      {/* WHO WE SERVE — Customer segments */}
      {/* ============================================= */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Who Rents Dumpsters in Florida?
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-stone-500">
            The short answer: everyone. The long answer is a bit more
            interesting.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Homeowners",
                desc: "The backbone of our business. Florida homeowners rent dumpsters for everything from garage cleanouts to full kitchen renovations. Spring cleaning, moving, downsizing, decluttering — if you own a home in Florida, you will eventually need a dumpster. Most homeowners go with a 10 or 20 yard and are surprised at how easy the process is.",
              },
              {
                title: "General Contractors",
                desc: "Florida's construction boom means contractors need reliable waste hauling on every project. Our contractor accounts provide volume pricing, priority scheduling, and multi-site coordination. Whether you are building single-family homes in Cape Coral or high-rises in Miami, we keep your sites clean and compliant.",
              },
              {
                title: "Roofing Companies",
                desc: "Florida roofs take a beating from sun, rain, and hurricanes. Roofing companies are some of our most frequent customers. A 20-yard dumpster handles most single-family re-roofing jobs, while commercial roofing projects typically need 30-yard containers. We coordinate delivery timing with your crew schedule so the dumpster is there when you need it.",
              },
              {
                title: "Property Managers",
                desc: "Managing rental properties, apartment complexes, or commercial buildings in Florida means dealing with tenant turnovers, cleanouts, and maintenance projects constantly. Our corporate accounts give property managers a single point of contact for all their dumpster needs across multiple properties. Consolidated billing makes accounting simple.",
              },
              {
                title: "Real Estate Investors",
                desc: "Fix-and-flip investors and rental property buyers need dumpsters for renovation and cleanout projects. In Florida's competitive real estate market, speed matters — getting a property cleaned out, renovated, and back on the market quickly can mean thousands of dollars in profit. We deliver fast so you can start working fast.",
              },
              {
                title: "Storm Cleanup Teams",
                desc: "After hurricanes and tropical storms, the cleanup is massive. Insurance restoration companies, tree removal services, municipal crews, and volunteer organizations all need dumpsters — and lots of them. We scale up our capacity during storm events and work directly with restoration companies to coordinate multi-site debris removal across affected areas.",
              },
            ].map((segment) => (
              <div
                key={segment.title}
                className="rounded-xl border border-zinc-200 p-6"
              >
                <h3 className="text-lg font-bold text-zinc-900">
                  {segment.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  {segment.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* PERMIT INFO */}
      {/* ============================================= */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Do You Need a Permit for a Dumpster in Florida?
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
            <p>
              This is one of the most common questions we get, and the answer
              depends on where you place the dumpster. If the dumpster goes on
              your private property — your driveway, yard, or private parking
              lot — you do not need a permit anywhere in Florida. This covers
              the vast majority of residential dumpster rentals.
            </p>
            <p>
              If the dumpster needs to be placed on a public street, sidewalk,
              alley, or right-of-way, you will likely need a permit from your
              city or county. Permit requirements, fees, and processing times
              vary significantly across Florida municipalities. In Miami-Dade
              County, for example, a right-of-way permit typically costs $50 to
              $150 and takes 3 to 5 business days to process. In smaller cities,
              permits may be free or available same-day.
            </p>
            <p>
              Some Florida cities also have specific rules about how long a
              dumpster can remain on a public street, what type of traffic
              control (cones, signs) is required, and whether the dumpster
              needs reflective tape for visibility at night. If you need a
              street placement, let us know when you order and we will walk you
              through the specific requirements for your area — or in many
              cases, we can handle the permit application for you.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* FAQ — Expanded */}
      {/* ============================================= */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Frequently Asked Questions About Dumpster Rental in Florida
          </h2>
          <p className="mt-3 text-stone-500">
            We have answered thousands of questions from Florida customers. Here
            are the ones that come up most often.
          </p>
          <div className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-zinc-100 pb-6">
                <h3 className="text-lg font-semibold text-zinc-900">
                  {faq.q}
                </h3>
                <p className="mt-2 leading-relaxed text-zinc-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* EDUCATION TEASER */}
      {/* ============================================= */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Want to Learn More? Read Our Complete Guide
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-zinc-700">
            We put together the most comprehensive dumpster rental guide in
            Florida — over 10,000 words covering everything from choosing the
            right size to understanding Florida disposal regulations, permit
            processes by county, weight limit calculations, and project-specific
            tips. Whether you are a first-time renter or a seasoned contractor,
            our guide has something for you.
          </p>
          <div className="mt-6">
            <Link
              href="/guide"
              className="inline-flex items-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Read the Complete Guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Text Us a Photo — Seriously",
            body: "Not sure what size dumpster you need? Snap a picture of your mess and text it to 954-710-2332. We can usually tell you the right size in under a minute. It's the fastest way to get an accurate quote without overthinking it.",
          },
          {
            title: "Florida Rain + Open Dumpster = Expensive",
            body: "Those afternoon thunderstorms can add hundreds of pounds of water weight to your load. Grab a $15 tarp from any hardware store and throw it over the dumpster when you're not actively loading. Your wallet will thank you.",
          },
          {
            title: "Your HOA Probably Has Rules. Ask First.",
            body: "Half of Florida lives in an HOA community, and many have strict rules about dumpster placement, duration, and even what color tarp you use. Check before you book — or just ask us. We deal with Florida HOAs every single day.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </>
  );
}
