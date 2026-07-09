import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, SMS_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/we-pay-you-junk/_data/content";
import { SERVICES, SERVICE_CATEGORIES, getExtendedContent } from "@/app/site/we-pay-you-junk/_data/services";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) return {};
  return {
    title: `${service.title} — Nationwide Junk Removal`,
    description: `${service.description} Simple hourly rate, dump fees included, 50% Resale Credit (when applicable). ${CITY_COUNT} cities, all ${STATE_COUNT} states.`,
    alternates: { canonical: `/services/${slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) notFound();

  const serviceIndex = SERVICES.indexOf(service);
  const category = SERVICE_CATEGORIES[service.category];
  const relatedServices = SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug);
  const otherServices = SERVICES.filter((s) => s.category !== service.category).slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {category.label} — Service #{serviceIndex + 1} of {SERVICES.length}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            {service.title}
          </h1>
          <p className="mt-4 text-2xl font-bold text-teal-200 font-heading">
            {service.subtitle}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {service.description}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {service.ideal.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-sm text-teal-200 backdrop-blur-sm">{tag}</span>
            ))}
          </div>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Long description */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            About {service.title}
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>{service.longDescription}</p>
          </div>
        </div>
      </section>

      {/* Extended deep-dive content */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Everything You Need to Know About {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            {getExtendedContent(service).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Complete guide */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Complete Guide to {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>{service.title} is one of our most requested services nationwide, and it&apos;s a perfect example of why the We Pay You model works better than traditional junk removal. When you call a flat-rate company for {service.title.toLowerCase()}, they estimate the truck volume, charge you $200-$800+ depending on the load size, and haul everything away. Any items with resale value get resold for their own profit. You paid the removal fee and lost the resale value — a double hit to your wallet.</p>
            <p>With our {service.title.toLowerCase()} service, the economics are completely different. You pay a transparent hourly rate — $200/hr for a 1-person crew, $300/hr for a 2-person crew, or +$100/hr per additional person for emergency same-day. Dump fees, transfer station costs, and all disposal charges are included (an industry first). As our crew loads your items, they identify everything with resale value and appraise it at current fair market rates. You receive 50% of each item&apos;s appraised value (when applicable) as an immediate credit on your bill. If the total credits exceed the total bill, we pay you the difference.</p>
            <p>The typical {service.title.toLowerCase()} customer uses our crew and the job takes 1.5-3 hours, putting the pre-credit cost at $225-$450. Resale credits typically range from $50-$300+ depending on the items involved, bringing the out-of-pocket cost to $100-$350 — significantly less than the $350-$700+ a flat-rate company would charge for the same job. On larger {service.title.toLowerCase()} projects with high-value items, credits frequently cover the entire bill or result in a payout.</p>
            <p>Our crews are specifically trained in {service.title.toLowerCase()} — they understand the particular challenges, safety considerations, and item categories involved. They carry the right equipment, know the most efficient techniques, and can handle everything from a quick single-item pickup to a large-scale multi-hour project. Same-day appointments are available when you call before noon, and we operate 7 days a week, 7AM-8PM.</p>
          </div>
        </div>
      </section>

      {/* What earns credit */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What Items Earn You Credit During {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>During {service.title.toLowerCase()} jobs, we commonly encounter items with significant resale value that earn customers substantial credits. Furniture in good condition is the most frequent credit generator — dining tables, dressers, desks, bookshelves, bed frames, and entertainment centers all have active resale markets. Brand-name furniture from Pottery Barn, Restoration Hardware, West Elm, Ethan Allen, and similar manufacturers commands premium resale prices and higher credits.</p>
            <p>Working appliances are another major credit category. Refrigerators, washers, dryers, dishwashers, ovens, and microwaves less than 10 years old typically qualify for credit. Stainless steel finishes and energy-efficient models bring higher values. Even older appliances in working condition have value — landlords and property flippers are always looking for functional, affordable appliances. A working refrigerator alone can generate $100-$300 in credit, immediately reducing your {service.title.toLowerCase()} bill by that amount.</p>
            <p>Electronics hold value within their useful life — flat screen TVs less than 5-6 years old, gaming consoles, desktop computers, laptops (especially Apple products), monitors, audio equipment, and smart home devices all have active resale markets. Tools are consistently valuable — DeWalt, Milwaukee, Makita, Bosch, and Ridgid power tools hold 40-70% of retail value. Quality hand tools, shop equipment, and lawn/garden equipment also generate credits.</p>
            <p>Other credit-earning categories include exercise equipment (treadmills, Peloton bikes, weight sets), musical instruments (pianos, guitars, drums, amplifiers), outdoor recreation gear (bikes, kayaks, grills, patio sets), antiques and vintage items, and designer or brand-name household goods. Our crew evaluates every item during {service.title.toLowerCase()} — you might be surprised how much credit your &quot;junk&quot; earns you.</p>
            <p>Items that generally don&apos;t earn credit include broken or heavily damaged items, stained mattresses, construction debris, yard waste, and general household trash. These are still removed as part of your hourly rate with dump fees included — they just don&apos;t generate resale credit. Our crew clearly communicates which items qualify and which don&apos;t, so there are no surprises on your final bill.</p>
          </div>
        </div>
      </section>

      {/* Scenarios */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Common {service.title} Scenarios and What They Cost</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Quick Pickup (1-3 items):</strong> You have a couple of pieces of furniture, an old appliance, or a few boxes that need to go. Our crew handles this in 30-60 minutes for $200 (1 hour minimum). If any items have resale value — a working dryer, a solid wood desk — the credit comes right off the top. Many quick pickups cost $50-$150 out of pocket after credits. Traditional companies charge $100-$200 flat for the same job.</p>
            <p><strong>Medium Job (partial room or multiple items):</strong> You&apos;re clearing a room, removing a set of furniture, or doing a moderate declutter. Our crew tackles this in 1-2 hours for $200-$400. Resale credits from furniture and electronics typically run $50-$150, bringing the cost to $50-$350. A flat-rate company would charge $250-$450 for the same volume.</p>
            <p><strong>Large Job (full room or major cleanout):</strong> A full garage, basement, or multi-room clear. Our crew takes 2-3 hours at $200-$300. Resale credits on larger jobs run higher — $100-$400+ — because there are more items to appraise. Out-of-pocket costs typically land at $150-$350 for jobs that flat-rate companies price at $400-$700+.</p>
            <p><strong>Major Project (estate, office, or full property):</strong> A complete estate cleanout, full office clearing, or whole-property removal. Our crew works 4-8+ hours at $400-$800. But these jobs have the highest concentration of valuable items — complete furniture sets, full kitchens of appliances, decades of accumulated tools, office equipment. Credits regularly reach $500-$2,000+, and payouts to the customer are common. Traditional companies charge $1,500-$5,000+ for comparable work and keep all resale value.</p>
          </div>
        </div>
      </section>

      {/* vs DIY */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">{service.title} vs. DIY — Why Professional Removal Saves You Money</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>The DIY approach to {service.title.toLowerCase()} seems cheaper until you add up the real costs. Renting a pickup truck or trailer: $50-$150 per day. Dump fees at local transfer stations: $30-$100+ per load depending on weight and material type. Gas to haul items: $10-$30. That&apos;s $90-$280 in hard costs alone — before accounting for your time, which is the most expensive cost of all.</p>
            <p>A DIY {service.title.toLowerCase()} project typically takes 4-8 hours when you factor in loading, driving to the dump, waiting in line, unloading, driving back, and repeating for multiple loads. If your time is worth $25-$50/hr (a conservative estimate for most working adults), that&apos;s $100-$400 in opportunity cost. Add the hard costs and you&apos;re at $190-$680 — comparable to or more than our professional service, and you did all the heavy lifting yourself.</p>
            <p>The hidden cost of DIY that most people don&apos;t consider: you get zero resale credit. Every valuable item goes straight to the dump. That working refrigerator worth $300, the solid wood desk worth $150, the power tools worth $200 — all gone, with zero return. With our service, those same items generate $325 in credits that reduce your bill. When you factor in resale credits, professional {service.title.toLowerCase()} is almost always cheaper than DIY.</p>
            <p>And then there&apos;s the physical risk. {service.title} involves heavy lifting, awkward carrying, and navigating stairs, doorways, and tight spaces with bulky items. Back injuries, strained muscles, dropped items, scratched floors, dented walls, and damaged doorframes are common when untrained individuals attempt this work. Our insured, trained crews handle these challenges daily with proper equipment and techniques. If something does get damaged, our insurance covers the repair. With DIY, you&apos;re on your own.</p>
          </div>
        </div>
      </section>

      {/* When to book */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">When to Book {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Same-Day Service:</strong> Available for calls placed before noon in most markets. Our dispatch routes the nearest available crew to your location, typically arriving within 2-4 hours. Same-day is ideal for urgent {service.title.toLowerCase()} needs — move-out deadlines, time-sensitive renovations, pre-listing cleanouts, or simply wanting it done today.</p>
            <p><strong>Scheduled Appointments:</strong> Book 24 hours to 4 weeks in advance and lock in your preferred date and time. We offer 2-hour arrival windows for all scheduled appointments. This is the best option if you have a specific date in mind and want guaranteed availability. Weekend and holiday appointments are available at no extra charge.</p>
            <p><strong>Seasonal Considerations:</strong> Spring and early summer (March-June) are the busiest seasons for {service.title.toLowerCase()} as people do spring cleaning, prepare homes for sale, and tackle home improvement projects. Booking 3-5 days ahead during these months ensures availability. Fall and winter tend to have more open scheduling. Holiday weekends are popular for home projects — book early for Memorial Day, July 4th, and Labor Day weekends.</p>
            <p><strong>Large Projects:</strong> For major {service.title.toLowerCase()} jobs — estate cleanouts, office clearing, multi-room or multi-day work — schedule 3-5 days in advance. This allows us to assign the optimal crew, ensure truck availability, and plan for multi-truck service if needed. Large projects may also qualify for multi-hour scheduling efficiencies.</p>
          </div>
        </div>
      </section>

      {/* How it works - expanded */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            How {service.title} Works — Step by Step
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Call & Describe", desc: `Call ${PHONE} and describe your ${service.title.toLowerCase()} job — what items need to go, how many, and any access challenges. We confirm pricing and schedule your appointment. Same-day available before noon.` },
              { step: "2", title: "We Show Up", desc: `Your crew arrives in a branded truck within the 2-hour window. They walk through the job with you, confirm the scope, and start loading immediately. Items are sorted as they go — valuables set aside for appraisal.` },
              { step: "3", title: "Appraise & Credit", desc: `Every item with resale value gets appraised at current fair market rates. You see the valuation, understand the basis, and approve before credit is applied. 50% of appraised value goes directly to reducing your bill.` },
              { step: "4", title: "Pay Less or Get Paid", desc: `Credits are subtracted from total hours worked. If credits exceed the bill, we pay you the difference on the spot by check or digital transfer. Final walkthrough ensures your space is clean and clear.` },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">{item.step}</div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Environmental */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Environmental Impact of {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Every {service.title.toLowerCase()} job we complete diverts a significant percentage of items from landfills. Traditional junk removal companies send 70-80% of everything they collect straight to the dump — including items with years of useful life remaining. Because our business model creates a financial incentive to resell rather than dump, we approach every job with a sorting-first mindset. Items with resale value get routed to our resale network. Usable items below our resale threshold get donated to local charities and nonprofits. Recyclable materials — metals, electronics, cardboard, certain plastics — go to certified recycling facilities. Only items with truly zero remaining value in any category reach the landfill.</p>
            <p>The result: approximately 60% of all items removed during {service.title.toLowerCase()} jobs are diverted from landfills. This isn&apos;t a marketing claim or a feel-good initiative — it&apos;s a direct consequence of our business model. We make more money when we resell items than when we dump them, so we have every incentive to maximize resale and minimize waste. Your environmental values and our financial incentives are perfectly aligned.</p>
            <p>For electronics removed during {service.title.toLowerCase()}, we use certified e-waste recyclers that comply with EPA regulations and responsible recycling standards. This ensures hazardous materials in electronics — lead, mercury, cadmium — are properly handled rather than leaching into groundwater at a landfill. For appliances containing refrigerants, we use EPA-certified technicians for proper refrigerant recovery under the Clean Air Act. These aren&apos;t optional extras — they&apos;re standard practice on every job.</p>
            <p>When you choose We Pay You Junk Removal for your {service.title.toLowerCase()} needs, you&apos;re making the most environmentally responsible choice available. You save money through resale credits, you get paid for valuable items, and you know that the maximum possible percentage of your items will be reused, recycled, or donated rather than buried in a landfill. It&apos;s better for your wallet, better for your community, and better for the planet.</p>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Choose We Pay You for {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>There are plenty of companies that offer {service.title.toLowerCase()} — national chains like 1-800-GOT-JUNK and Junk King, regional operators, and local haulers with a truck and a phone number. But none of them share the resale value of your items with you. They all use the same model: charge you a flat fee, haul everything away, resell the good stuff for their own profit, and dump the rest. You pay the maximum price and get zero return on items that have real market value.</p>
            <p>We Pay You Junk Removal is the only {service.title.toLowerCase()} provider in America that credits you 50% of resale value (when applicable) on every item worth something. Our transparent hourly pricing means you know exactly what you&apos;re paying — no volume estimates, no truck space judgments, no ambiguity. Our trained, insured crews handle the heavy lifting safely and professionally. Our real-time appraisal system ensures fair, accurate valuations based on current market data. And our commitment to eco-friendly disposal means 60% of items stay out of landfills.</p>
            <p>We&apos;re fully licensed, bonded, and insured. Every crew member is background-checked. We carry comprehensive liability coverage. We offer same-day service, evening and weekend appointments, and operate 7 days a week. No contracts, no minimums, no recurring fees. Just the best {service.title.toLowerCase()} service in the country — one that actually values your stuff and values you as a customer. Text {PHONE} today and experience the difference.</p>
          </div>
        </div>
      </section>

      {/* Pricing reminder */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {service.title} Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            Simple hourly pricing. Book your pickup. Dump fees included (an industry first).
          </p>
          <div className="mt-8 max-w-sm mx-auto">
            <div className="rounded-xl border-2 border-teal-400 bg-white p-6 text-center shadow-md">
              <p className="text-5xl font-bold text-teal-700 font-heading">$100</p>
              <p className="mt-1 text-base text-slate-600">per hour &bull; 1 hour minimum</p>
              <p className="mt-3 text-sm text-slate-500">Dump fees included (an industry first) &bull; 50% Resale Credit (when applicable)</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            All prices include dump fees. Valuable items credited at 50% (when applicable) resale value (when applicable).
          </p>
          <div className="mt-6">
            <Link href="/pricing" className="text-teal-700 font-semibold text-sm hover:underline font-cta">
              View Full Pricing Details →
            </Link>
          </div>
        </div>
      </section>

      {/* Related services */}
      {relatedServices.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              Related {category.label}
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedServices.map((s) => (
                <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                  <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                  <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Other services */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Other Junk Removal Services
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="text-teal-700 font-semibold text-sm hover:underline font-cta">
              View All {SERVICES.length} Services →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Book {service.title} Today
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            One call. Simple hourly rate. Dump fees included (an industry first). Items with value earn you 50% credit. Same-day available in {CITY_COUNT} cities.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
