// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CITY_COUNT, STATE_COUNT, PHONE, PHONE_HREF } from "@/app/site//_data/content";
import { CUSTOMER_TYPES } from "@/app/site//_data/customer-types";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";

export const metadata: Metadata = {
  title: "Who We Serve — Home Services for Homeowners, Businesses, Property Managers & More",
  description: `We serve 13 customer types across ${CITY_COUNT} cities. Homeowners, renters, property managers, realtors, businesses, estate managers, contractors, and more. Starting at $99/hour.`,
  alternates: { canonical: "/who-we-serve" },
};

export default function WhoWeServePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{CUSTOMER_TYPES.length} Customer Types Across {CITY_COUNT}+ Cities</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Who We Serve — <span className="gradient-text">Home Services for Everyone</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Whether you&apos;re a homeowner, a property manager, or a business — one vendor for every home service you need. 40 services starting at $99/hour.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Home Services Services Tailored to Your Situation</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{CUSTOMER_TYPES.length} Customer Types We Serve</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Click your category to see how our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link> and consolidated service model work for your specific situation. Every type gets the same $99/hour starting rate across the same <Link href="/services" className="text-teal-700 font-semibold hover:underline">40 services</Link> in <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT} cities</Link>.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CUSTOMER_TYPES.map((ct) => (
              <Link key={ct.slug} href={`/who-we-serve/${ct.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{ct.name}</h3>
                <p className="mt-3 text-sm text-slate-600 flex-1">{ct.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {ct.services.slice(0, 3).map((sSlug) => (
                    <span key={sSlug} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{sSlug.replace(/-/g, " ")}</span>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Every Audience, One Standard</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How the Same Company Serves {CUSTOMER_TYPES.length} Different Audiences</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>A home services company typically specializes in one audience. Residential-only shops handle homeowners and renters, commercial-only shops handle offices and businesses, and property-management specialists serve portfolios. Each specialization runs its own sales playbook, its own pricing structure, and its own operating norms. Home Services Co is built differently — one company, one standard, across {CUSTOMER_TYPES.length} distinct customer types. The operational benefit of this consolidation is consistency. The same licensed technicians who handle a single-family home in the morning can handle a twenty-unit apartment building in the afternoon, an office cleanout the next day, and a realtor&apos;s pre-listing prep the day after. The quality bar is the same across every audience.</p>
            <p>For <Link href="/who-we-serve/homeowners" className="text-teal-700 font-semibold hover:underline">homeowners</Link> specifically, the pitch is straightforward — one phone number for every home service need, from emergency repairs to project work to recurring maintenance. For <Link href="/who-we-serve/renters-movers" className="text-teal-700 font-semibold hover:underline">renters and movers</Link>, the consolidated move-in and move-out services save the hassle of booking separate cleaning, handyman, and rekeying appointments. For <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property managers</Link>, dedicated account coordination handles scheduling, escalations, COI tracking, and consolidated billing across portfolio properties. See our <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial services</Link> page for full details on multi-property accounts.</p>
            <p>For <Link href="/who-we-serve/realtors" className="text-teal-700 font-semibold hover:underline">realtors</Link>, the combination of fast turnaround and documentation that holds up in real estate transactions is the core value — pre-listing prep, inspection-response repairs, and post-sale cleanup all handled with written records and timestamped photos. For <Link href="/who-we-serve/businesses" className="text-teal-700 font-semibold hover:underline">small businesses</Link>, after-hours and weekend service at the same starting rate keeps facility work from disrupting operations. For <Link href="/who-we-serve/estate-managers" className="text-teal-700 font-semibold hover:underline">estate managers</Link> and <Link href="/who-we-serve/seniors-downsizers" className="text-teal-700 font-semibold hover:underline">seniors downsizing</Link>, patient coordination across cleaning, handyman, painting, landscaping, and sometimes HVAC/plumbing/electrical is handled by a single project manager rather than a rotating cast of independent contractors.</p>
            <p>For <Link href="/who-we-serve/contractors" className="text-teal-700 font-semibold hover:underline">contractors</Link> needing supplemental labor or specialized trades outside their core, we operate as a B2B capacity partner. For <Link href="/who-we-serve/churches-nonprofits" className="text-teal-700 font-semibold hover:underline">churches and nonprofits</Link>, we offer nonprofit rates and flexible scheduling that works around event calendars. For <Link href="/who-we-serve/schools-universities" className="text-teal-700 font-semibold hover:underline">schools and universities</Link>, large-scale end-of-year turns and semester-break facility work is coordinated through dedicated account teams. For <Link href="/who-we-serve/hotels-hospitality" className="text-teal-700 font-semibold hover:underline">hotels and hospitality</Link>, recurring room-turn work and on-demand repairs happen without disrupting guest-facing operations. For <Link href="/who-we-serve/warehouses" className="text-teal-700 font-semibold hover:underline">warehouses</Link> and <Link href="/who-we-serve/retail" className="text-teal-700 font-semibold hover:underline">retail</Link>, we handle facility services that keep operations running without pulling your internal facilities team into a full-time vendor-management role.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Account Types and Pricing Structures</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Single Appointments, Recurring Accounts, and Portfolio Contracts</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The account structure you set up with us depends on how you plan to use the service. One-time appointments require no account setup — call <Link href="/book" className="text-teal-700 font-semibold hover:underline">book online</Link>, describe the service, get an estimate, pay on completion. This is how most <Link href="/who-we-serve/homeowners" className="text-teal-700 font-semibold hover:underline">homeowners</Link> and <Link href="/who-we-serve/renters-movers" className="text-teal-700 font-semibold hover:underline">renters</Link> first encounter us, and one-time service is often the path that leads to a recurring relationship after the first appointment goes well.</p>
            <p>Recurring service accounts are the next step — weekly or biweekly <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning</Link>, monthly <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link>, seasonal <Link href="/services/lawn-care" className="text-teal-700 font-semibold hover:underline">lawn care</Link>, year-round <Link href="/services/pool-services" className="text-teal-700 font-semibold hover:underline">pool service</Link>. Recurring accounts get consistent technician assignments so the same team learns your property. Pricing for recurring accounts remains the same starting rate — no discount for commitment, no upcharge either. The benefit of recurring service is the reliability, not a pricing gimmick.</p>
            <p>Portfolio and commercial contracts are structured for <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property managers</Link>, <Link href="/who-we-serve/businesses" className="text-teal-700 font-semibold hover:underline">businesses</Link>, and multi-property operators. These accounts include dedicated coordinators, negotiated rate cards for high-volume relationships, consolidated billing formats that match accounting systems, and COI and compliance documentation handled centrally. Net-15 or net-30 payment terms apply on approved accounts. For large portfolios, custom billing splits by property or cost center can be set up to match your internal accounting.</p>
            <p>Whichever account type fits, the underlying operating standards are identical — <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">upfront pricing</Link>, <Link href="/blog/licensed-and-insured-what-it-means" className="text-teal-700 font-semibold hover:underline">licensed and insured</Link> technicians, written estimates, clean workmanship, and accountable follow-up. The difference between account types is the operational wrapper around the service, not the service itself.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Real Cost of Vendor Fragmentation</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Most customers underestimate what fragmented vendor relationships actually cost them. The obvious cost is the price differential between vendors for the same service — flat-rate shops charge more than honest hourly billing, marketplace bids include lead-generation fees, franchise networks add brand-premium markup. These pricing inefficiencies across a dozen vendor relationships compound into meaningful money across a year of home service needs. The average homeowner who consolidates vendor relationships with us typically saves twenty to forty percent on total home service spend compared to the equivalent services at flat-rate competitors.</p>
            <p>The less obvious cost is time. Every new vendor search takes 30-60 minutes between Googling, reading reviews, getting callback quotes, comparing options, and making a decision. Every new appointment requires re-explaining the property, the access, the preferences, and any prior service history. Every new vendor relationship requires vetting credentials, tracking invoices, and building up the trust that lets you actually delegate the work. Multiply these time costs across fifteen vendor relationships and the hourly cost of your own time at whatever rate, and the real annual cost of fragmented vendors often exceeds the direct dollar cost of the services themselves.</p>
            <p>The hidden cost is accountability. When something goes wrong — a repair that did not hold, a bill that does not match the quote, damage caused during the work, a service that was never completed — fragmented vendor relationships leave you navigating finger-pointing between independent contractors who all disclaim responsibility. The resolution of one bad outcome can consume hours of phone calls, weeks of follow-up, and in some cases small-claims litigation. Consolidated accountability through a single accountable company eliminates this hidden cost by making resolution a single phone call rather than a multi-vendor dispute.</p>
            <p>The stacked cost of all three — pricing inefficiency, time investment, and accountability gaps — is why the one-vendor consolidation model produces such substantial total savings for customers who use it seriously. Customers who track their home service spending carefully across the first year of working with us typically report savings in the range of twenty to forty percent on total outlay, plus several dozen hours of reclaimed time that used to go into vendor management, plus the reduction in residual stress from knowing that accountability for every home service runs through one company rather than scattering across a dozen.</p>
            <p>For customers ready to try consolidation rather than continuing to juggle vendors, the starting point is simple: the next time a home service need comes up, call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a> or book online instead of going through the usual vendor search. The first appointment is the test. If it meets your standard, the natural next step is to keep using us as additional needs come up. Within six to twelve months of consistent use, most customers find that the vendor list they used to juggle has largely been replaced by a single account with us.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How We Match Services to Customer Type</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Each of the {CUSTOMER_TYPES.length} customer types we serve has a distinct pattern of service needs, scheduling preferences, and operational constraints. Our scheduling and dispatch systems are built to recognize those patterns so the customer experience matches the situation rather than forcing every customer through the same template.</p>
            <p>For <Link href="/who-we-serve/homeowners" className="text-teal-700 font-semibold hover:underline">homeowners</Link>, the default pattern is reactive service calls (something broke or needs maintenance) combined with occasional project work (remodels, upgrades) and a few recurring relationships (cleaning, lawn care, pest control). Our scheduling defaults, pricing presentation, and communication cadence are tuned for homeowners because they are the largest share of our customer base across {CITY_COUNT} cities.</p>
            <p>For <Link href="/who-we-serve/renters-movers" className="text-teal-700 font-semibold hover:underline">renters and movers</Link>, the service pattern concentrates around move-in and move-out transitions — cleaning, handyman punch lists, rekeying, small repairs, and furniture assembly. We offer bundled move-in/move-out packages at the same starting rate, coordinated as a single appointment rather than three separate vendor visits.</p>
            <p>For <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property managers</Link>, the pattern shifts to portfolio-scale recurring work, fast tenant-issue response, documentation that property-management accounting systems can process, and compliance paperwork (COIs, W-9s, vendor onboarding). We assign dedicated account coordinators to property management customers so the relationship has a single point of contact across multiple properties and many appointments.</p>
            <p>For <Link href="/who-we-serve/realtors" className="text-teal-700 font-semibold hover:underline">realtors</Link>, the service pattern runs on transaction timelines — pre-listing prep, inspection-response repairs, closing-table emergencies, and post-sale cleanup. Speed and documentation quality matter more here than raw pricing, because a delayed service that blocks a closing is far more expensive than the cost differential between providers.</p>
            <p>For <Link href="/who-we-serve/businesses" className="text-teal-700 font-semibold hover:underline">small businesses</Link>, facility services often need to happen outside of operating hours to avoid disrupting customers or employees. We default commercial accounts to after-hours or weekend scheduling at the same starting rate, with no premium for off-hours work. Business customers also typically need net-15 or net-30 payment terms and invoices that flow into accounting systems cleanly.</p>
            <p>For <Link href="/who-we-serve/estate-managers" className="text-teal-700 font-semibold hover:underline">estate managers</Link> and <Link href="/who-we-serve/seniors-downsizers" className="text-teal-700 font-semibold hover:underline">seniors downsizing</Link>, service often spans multiple trades over weeks or months as a property gets prepared for sale, probate closeout, or family transition. A single project manager coordinates across cleaning, handyman, painting, landscaping, and sometimes HVAC/plumbing/electrical work. Patience and respect in the customer interaction matter substantially in these scenarios, and our technicians are trained for that context.</p>
            <p>For <Link href="/who-we-serve/contractors" className="text-teal-700 font-semibold hover:underline">contractors</Link> needing supplemental capacity outside their core trade, we operate as a B2B resource. For <Link href="/who-we-serve/churches-nonprofits" className="text-teal-700 font-semibold hover:underline">churches and nonprofits</Link>, flexible scheduling works around event calendars and sensitivity to budget constraints applies. For <Link href="/who-we-serve/schools-universities" className="text-teal-700 font-semibold hover:underline">schools and universities</Link>, we coordinate large-scale end-of-year work and semester-break facility projects through account teams.</p>
            <p>For <Link href="/who-we-serve/hotels-hospitality" className="text-teal-700 font-semibold hover:underline">hotels and hospitality</Link>, discreet off-hours service keeps guest-facing operations undisturbed. For <Link href="/who-we-serve/warehouses" className="text-teal-700 font-semibold hover:underline">warehouses</Link> and <Link href="/who-we-serve/retail" className="text-teal-700 font-semibold hover:underline">retail</Link>, we handle facility services without pulling your internal facilities team into a full-time vendor-management role.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Service Experience Across Every Customer Type</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Consistency across customer types is one of the operational features that matters most in practice, and it is one of the hardest things for fragmented home service vendors to deliver. Most customers have experienced the quality variance that comes from working with many independent contractors — one month the service is excellent because the technician who showed up happened to be skilled and motivated, the next month the service is disappointing because a different technician from a different company is handling the work. This variance is what our operating model specifically tries to eliminate. The same training standards, the same credential verification, the same communication protocols, the same invoicing structure, and the same follow-up standards apply to every {CUSTOMER_TYPES.length} customer types we serve, across every trade we operate in, in every city we cover.</p>
            <p>What varies between customer types is the account wrapper, not the service itself. A homeowner in a single-family residence gets the same technician showing up with the same training and tools as a property manager running a fifty-unit apartment building. The differences are in how the appointment is scheduled, how the invoice is formatted, what documentation flows afterward, and who the primary point of contact is for the account. The underlying work is the same, and the quality expectation is the same.</p>
            <p>For customers who have experienced our service on a single appointment and are evaluating whether to expand the relationship to cover more of their home service needs, the practical test is whether the consistency holds up over the second, third, and fourth appointments. Most home service quality problems show up on the second or third visit rather than the first, because first visits from any vendor get more attention as the vendor tries to earn the relationship. Our operating standards are designed explicitly to hold the same line on every appointment regardless of whether it is the first or the hundredth.</p>
            <p>Longitudinal relationships with customers across multiple years end up being the natural outcome of the consistency, and the economics of our model depend on those long relationships. A customer who uses us once, likes the experience, and comes back repeatedly for a decade is far more valuable to the business than a customer who gets squeezed on a single high-margin appointment and never returns. This alignment of interests — we make more money when customers stay longer, customers get better service when vendors are incentivized for retention — is the operating foundation that the flat-rate franchise model fundamentally does not share.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Customer-Type Pages Exist Separately</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>We maintain separate content and dedicated service pages for each of the {CUSTOMER_TYPES.length} customer types because the right answer for a homeowner is often the wrong answer for a property manager, and the right answer for a business is often the wrong answer for a realtor. Generic "we serve everyone" marketing glosses over the real operational differences that make a home services company actually work for a specific customer type.</p>
            <p>The most important differences across customer types are not the service quality standard — that is consistent across every customer we serve — but rather the account structure, the scheduling defaults, the billing format, and the communication cadence. A homeowner expects a phone call to confirm each appointment. A property manager wants appointment confirmations flowing into their property-management software via email. A realtor needs same-day confirmations because transactions move fast. A business needs after-hours scheduling that does not disrupt operations. A school needs coordination around academic calendars. Each of these is a real operational pattern, not a marketing differentiation.</p>
            <p>Our pricing is constant across customer types — <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">$99/hour starting rate</Link> for every trade, every customer, every market. But how the bill presents differs by customer type. Homeowners pay on completion via card or digital transfer. Property managers and commercial accounts get consolidated monthly invoicing with per-property breakdowns. Realtors get transaction-tagged invoices that can be expensed to specific closings. Estate managers get consolidated project invoices with milestone breakdowns. Schools get RFP-format quotes and budget-line-item invoicing. The pricing is honest across every customer type; the format adapts to how each customer type actually uses the invoice.</p>
            <p>For customers who fall into multiple categories — a property manager who also owns a personal residence, a realtor who also manages rental portfolios, a business owner who also needs service at home — a single account can carry multiple relationship types. Our scheduling system recognizes the different contexts and applies the appropriate billing and communication defaults automatically. This is the kind of back-end sophistication that most home service companies do not invest in because it is invisible to single-transaction customers, and it is exactly the kind of infrastructure that matters for customers with complex relationships across multiple roles.</p>
            <p>If you are not sure which customer type best fits your situation, call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a> and the scheduling team will walk through the options. For the most common scenarios, the right customer-type page is obvious from the name. For edge cases where multiple categories could apply, we tend to set up accounts with the primary relationship as the default and add other contexts as needed.</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Same Rate for Every Customer Type</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">One Phone Number, Every Home Service</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">Starting at $99/hour. Licensed and insured. Upfront pricing. Same-day available.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
