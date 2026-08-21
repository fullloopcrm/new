import { SERVICES } from '@/app/site/wash-and-fold-nyc/_lib/seo/services'
import { washFoldMicrositeSchemas } from '../../_lib/emd/schema'
import { getOtherWashFoldSites } from '../../_lib/emd/registry'
import {
  PARENT_BRAND_NAME,
  SITE_URL,
  PHONE_DISPLAY,
  PHONE_SMS,
  BOOK_URL,
  GENERAL_FAQS,
  ADDRESS,
} from '../../_lib/emd/shared-content'
import type { WashFoldMicrositeConfig } from '../../_lib/emd/types'
import JsonLd from '@/components/site/JsonLd'

// Verbatim from washandfoldnyc.com's own homepage — ported, not summarized,
// so the depth of this page matches the real site (~10k words), not a
// condensed teaser. Only "917-970-6002" was swapped in for the site's
// spelled-out phone digits, via PHONE_DISPLAY, for maintainability.
const WHY_CARDS = [
  { t: 'Transparent Pricing With Zero Hidden Fees', d: 'Three dollars per pound. That is the rate. It does not change based on your neighborhood, the time of year, how busy we are, or how much laundry you have. There are no fuel surcharges, no delivery fees, no tip expectations, no minimum that shifts depending on the day, and no extra charge for sorting, stain treatment, or premium detergent. The price on our website is the price on your bill. We also publish our dry cleaning and comforter rates in full — every item, every price — because we believe pricing should be transparent enough that you never need to ask.' },
  { t: 'Free Pickup and Free Delivery on Every Order', d: 'Every order over the thirty-nine dollar minimum includes free pickup and free delivery to any address in Manhattan, Brooklyn, or Queens. We come to your door, your lobby, or your doorman — wherever is most convenient. You never have to carry a laundry bag, hail a cab, wait for a machine, or fold a single shirt. We deliver back to the exact same location within twenty-four to forty-eight hours. For buildings with doormen or concierge services, we coordinate directly with the front desk. For walkups, we come to your floor. The pickup and delivery is genuinely free — it is not built into a higher per-pound price or recovered through hidden fees.' },
  { t: 'Your Laundry Is Processed Separately — Never Mixed', d: 'This is one of the most important things that sets us apart from laundromats and some competitors. Every single customer order is processed in its own separate batch from start to finish. Your clothes are never thrown into a machine with a stranger laundry. We tag your bag with your name and order number at pickup, maintain that separation through sorting, washing, drying, and folding, and cross-check the inventory before packaging. This is how we prevent lost items, cross-contamination, and the kind of quality inconsistency that happens when multiple orders are processed together. It takes longer and costs us more, but it is the right way to do it.' },
  { t: 'Premium Detergent and Professional Equipment', d: 'We use commercial-grade machines and premium detergent — not the cheap stuff from a vending machine dispenser. Every load is sorted by color and fabric type, stains are pre-treated individually with the appropriate solution, and items are dried on the correct heat setting for the fabric. We stock fragrance-free, eco-friendly, and hypoallergenic detergent options for customers with sensitive skin, allergies, or preferences — all at no extra charge. The machines we use operate at higher water pressure and longer cycles than consumer machines, which means deeper cleaning and better results on every load.' },
  { t: 'Hand-Folded by Trained Professionals', d: 'Every single item in your order is hand-folded by a trained team member. Shirts are folded flat and stacked. Pants are creased and laid flat. Towels are folded into uniform thirds. Socks are paired. Underwear is folded, not rolled. Everything is organized by garment type — shirts together, pants together, socks and underwear together, towels separate. When you open your bag, it looks like a display at a department store, not the bottom of a laundromat basket. This is the standard on every order, every time — your first order or your hundredth.' },
  { t: 'Real Human Communication — Not Bots, Not Forms', d: `When you text ${PHONE_DISPLAY}, you are communicating with a real person. Not a chatbot, not an automated response system, not a form that goes into a queue. A real human reads your message and responds — typically within minutes during business hours. You get text updates at every stage: when your pickup is scheduled, when the driver picks up your bag, when your laundry is being processed, and when it is on its way back to your door. If anything is wrong or you have a question, you text the same number and a real person handles it. This is a deliberate choice. We believe that a service handling your personal belongings should be run by people you can actually talk to.` },
  { t: 'Consistent Quality on Every Single Order', d: 'We use the same twelve-step standardized process on every order: intake, color sort, fabric sort, stain pre-treatment, wash, dry, fold, organize, package, quality check, and deliver. There is no variation in this process from one order to the next, from one day to the next, from one team member to the next. The checklist is the checklist. This consistency is why our quality does not fluctuate — whether it is a Monday morning rush or a quiet Wednesday afternoon, the output is the same. It is also why our Google rating is five-point-zero with zero negative reviews. Consistency compounds over time, and our customers notice.' },
  { t: 'Licensed, Insured, and Background-Checked', d: `Wash and Fold NYC is a fully licensed business registered in New York State with general liability insurance that covers your garments and property on every order. Every team member — drivers, attendants, route managers — passes a background check before handling customer laundry. Our business address is ${ADDRESS}. We can provide proof of insurance and licensing upon request. We are a real company with real accountability, not a gig-economy platform where anonymous contractors handle your belongings with no oversight or recourse if something goes wrong.` },
  { t: 'Subscription Savings That Actually Add Up', d: 'Weekly subscribers save ten percent on every pound. For a single person doing fifteen pounds per week, that saves eighteen dollars per month. For a couple doing twenty pounds per week, that saves twenty-four dollars per month. Over a year, a couple on the weekly twenty-pound plan saves two hundred eighty-eight dollars — more than a month of free laundry service. And the savings are not the only benefit. Subscribers get a consistent pickup schedule on the same day every week, the same route driver who knows their building and preferences, priority processing so orders are completed faster, and the ability to pause, skip, or cancel at any time with zero penalties. The subscription is the best way to use our service, and the vast majority of our long-term customers are on a plan.' },
]

const PROCESS_STEPS: [string, string][] = [
  ['Pickup & Intake', 'Our driver arrives at your door, lobby, or doorman during your scheduled window. Your bag is collected and immediately tagged with your name and a unique order number. This tag stays with your order through every step of the process. The driver sends you a text confirming the pickup is complete. Your laundry is transported to our processing facility in an insulated, clean vehicle — never in a personal car trunk or mixed with other pickups in a way that could cause cross-contamination.'],
  ['Inventory Count', 'At the facility, your bag is opened and every item is counted. This intake inventory serves as our baseline — we cross-check against it at delivery to ensure nothing is missing. If we notice any items that appear to be dry-clean-only based on the fabric or care label, we flag them and set them aside. We text you to ask whether you want those items sent to our dry cleaning partner or returned unwashed. This prevents accidental damage to delicate garments.'],
  ['Sort by Color', 'Your laundry is separated into four color groups: whites, darks, colors, and brights. This prevents color bleeding and ensures that your white shirts stay white, your dark jeans do not stain your light blouses, and your bright colors maintain their vibrancy. Each color group is washed as its own separate load. Yes, this means your fifteen-pound order might require three or four individual wash cycles — that is exactly why the results are better than what you get at a laundromat where everything goes into one machine together.'],
  ['Sort by Fabric', 'Within each color group, we further sort by fabric weight and care requirements. Delicates — silk, lace, cashmere, anything with beading or embellishments — go into mesh laundry bags for protection. Heavy items like jeans, sweatshirts, and towels are grouped together. Regular-weight items like t-shirts, dress shirts, and underwear are grouped separately. This ensures that every item is washed on the appropriate cycle and temperature for its fabric, extending the life of your clothes.'],
  ['Stain Pre-Treatment', 'Before any item goes into a machine, we inspect it for stains. Every stain we find is pre-treated individually with the appropriate stain removal solution — enzyme-based treatments for protein stains like food and blood, solvent-based treatments for oil and grease, and oxidizing treatments for tannin stains like coffee, wine, and tea. Pre-treatment happens before the wash cycle because heat from the dryer can permanently set a stain that was not addressed beforehand. This step alone makes a significant difference in results compared to a standard laundromat wash where stains are not inspected.'],
  ['Wash', 'Each sorted load is washed in a commercial-grade machine with premium detergent at the correct temperature for the fabric type — hot for whites and towels, warm for regular colors, cold for darks and delicates. Our commercial machines operate at higher water pressure and use longer cycles than consumer machines, which produces a deeper clean. If you have requested fragrance-free, eco-friendly, or hypoallergenic detergent, we use that for every load in your order. Your preferences are noted on your order tag so the attendant does not need to guess.'],
  ['Dry', 'Tumble drying is done on the appropriate heat setting for each fabric. Towels and heavy items go on high heat for maximum fluffiness and bacteria elimination. Regular items go on medium. Delicates go on low heat or are laid flat to air dry, depending on the care label. We never over-dry — that is what causes shrinkage, fading, and fabric damage. Our attendants check items before the end of the cycle and remove anything that is dry early rather than leaving it in to cook.'],
  ['Hand-Fold', 'This is where the difference between our service and a laundromat becomes most visible. Every single item is hand-folded by a trained professional. Shirts are folded flat into a uniform rectangle. Pants are folded with a crease. Towels are folded into precise thirds. Socks are paired and folded together — never balled. Underwear is folded flat, not rolled or bunched. The standard is the same for every order: when you open your bag, it should look like it came from a high-end retail store.'],
  ['Organize by Type', 'After folding, items are organized by garment type. Shirts go together, pants together, socks and underwear together, towels and linens separate. This makes putting your laundry away fast and effortless — you can grab the shirts stack and put it directly in a drawer, grab the towels and put them in the linen closet. We have had customers tell us this organization step alone is worth the price of the service because it saves them the twenty to thirty minutes of sorting they used to do after folding.'],
  ['Package', 'Your folded, organized laundry is placed in clean, sealed bags. The bags are labeled with your name and order number. For customers with multiple loads — a family with items sorted by household member, for example — we can package each person separately. The sealed bag protects your clean laundry during transport and delivery, ensuring it arrives at your door as clean as it was when it left our facility.'],
  ['Quality Check', 'Before your order goes out for delivery, a quality check is performed. The attendant verifies the item count against the intake inventory to ensure nothing is missing. They inspect the overall quality of the fold — anything that does not meet our standard is re-folded. They confirm that any special instructions on your order were followed. This checkpoint is the last line of defense before your laundry goes on the truck, and it is why our error rate is near zero.'],
  ['Delivery', 'Your sealed, labeled package is loaded onto a delivery vehicle and routed to your address. You receive a text when your order is on its way. The driver delivers to your door, lobby, doorman, or designated secure location — the same spot where it was picked up. You receive a final text confirming delivery and the exact location where your laundry was left. Payment is collected at this point — credit card, Zelle, Venmo, Apple Pay, or cash. The entire process from pickup to delivery takes twenty-four to forty-eight hours for standard orders, or same-day for rush orders placed before ten in the morning.'],
]

const REAL_COST_PARAGRAPHS = [
  'Most New Yorkers underestimate what laundry costs them because they only count the machine fees. But the true cost includes your time, your supplies, and the opportunity cost of spending two to three hours every week on something a service can handle for you. Here is the honest math for three different scenarios.',
  'Scenario one: doing it yourself at a laundromat. A typical single person does three to four loads per week. Each load costs about three dollars in machine fees — one fifty for the washer, one fifty for the dryer. That is nine to twelve dollars per week in machine fees. Add two to three dollars per week for detergent and fabric softener. Add the two to three hours of your time — carrying bags to the laundromat, waiting for machines, switching loads, folding, carrying bags home. At any reasonable value for your time, even fifteen dollars per hour, that is thirty to forty-five dollars of time cost per week. Total real cost: forty to sixty dollars per week. Over a month, that is one hundred sixty to two hundred forty dollars when you include your time.',
  'Scenario two: using Wash and Fold NYC. The same single person generates about ten to fifteen pounds of laundry per week. At three dollars per pound, that is thirty to forty-five dollars per week — with free pickup and delivery, zero time spent washing, drying, or folding, and every item hand-folded and organized. On a weekly subscription at ten percent off, a fifteen-pound plan costs one hundred sixty-two dollars per month. The total time investment on your end is approximately ninety seconds: sending one text message and leaving a bag at your door.',
  'Scenario three: the couple comparison. A couple typically generates twenty to twenty-five pounds of laundry per week. At the laundromat, that is five to six loads — fifteen to eighteen dollars in machine fees, three to four hours of combined time, and four to five dollars in supplies. Real cost: seventy to one hundred dollars per week including time value. With Wash and Fold NYC, twenty to twenty-five pounds costs sixty to seventy-five dollars per week with zero time. On the weekly twenty-pound plan, you pay two hundred sixteen dollars per month — saving ten percent and eliminating twelve to sixteen hours of laundry time every month. That is three to four hours per week you get back.',
  'The bottom line: when you factor in your time, laundry service is not more expensive than doing it yourself — it is comparable or cheaper, and you get your entire weekend back. The thirty-nine dollar minimum means even a small order is worth the pickup. And if you subscribe weekly, the ten percent discount makes the math even more favorable. If your time is worth more than fifteen dollars an hour — and in New York City, it almost certainly is — using our service is not a luxury. It is a rational economic decision.',
]

const COMPARISON: [string, string, string, string][] = [
  ['Price (wash & fold)', '$3/lb', '$2.50–$4.00/load + your time', '$3.50–$5.00/lb'],
  ['Pickup & delivery', 'Free on all orders', 'You carry it both ways', '$5–$10 delivery fee'],
  ['Turnaround time', '24–48 hours', '2–3 hours of your time', '2–5 business days'],
  ['Color sorting', 'Every load, always', 'Only if you do it yourself', 'Varies by provider'],
  ['Stain pre-treatment', 'Included on every item', 'DIY if you remember', 'Varies — often skipped'],
  ['Hand-folded', 'Every single item', 'You fold it yourself', 'Sometimes, often rolled'],
  ['Laundry separated', 'Always — never mixed', 'Communal machines', 'Varies — often batched'],
  ['Subscription discount', '10% weekly, 5% biweekly', 'None available', 'Varies'],
  ['Insurance coverage', 'Full general liability', 'None — use at own risk', 'Limited or none'],
  ['Cancel/pause anytime', 'Yes, no penalties', 'N/A', 'Often locked into plans'],
]

const WHO_WE_SERVE: [string, string][] = [
  ['Busy Professionals Who Value Their Time', 'This is our largest customer segment. Lawyers, bankers, doctors, tech workers, consultants, teachers — people who work fifty to sixty hours a week and do not want to spend their limited free time at a laundromat. They text us on Sunday night, leave a bag at their door Monday morning, and have clean folded laundry back by Tuesday evening. The weekly subscription is the most popular option for this group because it automates something they used to dread. Many tell us it is the single best quality-of-life improvement they have made since moving to the city.'],
  ['Couples Who Split Household Responsibilities', 'Laundry is one of the most common sources of friction in shared living. Who does it, when, and how well. By outsourcing it entirely, couples eliminate the argument. At sixty to seventy-five dollars per week for two people, it costs roughly the same as doing it yourself when you factor in supplies and time — except neither person has to do it. The twenty-pound weekly plan at two hundred sixteen dollars per month is designed specifically for couples.'],
  ['Families With Young Children', 'Kids generate an absurd amount of laundry — stained onesies, school uniforms, sports clothes, bedsheets that need washing multiple times per week, towels, jackets, and the endless stream of socks that somehow lose their partners. Our family customers typically process thirty to fifty pounds per week. At three dollars per pound, that is ninety to one hundred fifty dollars per week. Expensive? Compare it to the eight to twelve hours per week that laundry consumes for a family of four and the math starts making sense. We also sort and package by family member on request, which makes putting laundry away significantly faster.'],
  ['New Residents Who Just Moved to NYC', 'If you just moved to New York from a city where you had your own washer and dryer, the adjustment to NYC laundry infrastructure is jarring. Most apartments do not have in-unit machines. The building laundry room — if it exists — is often a dungeon with two twenty-year-old machines. The nearest laundromat might be three blocks away. Our service eliminates this entire learning curve. You do not need to find a laundromat, figure out the quarter situation, or compete for machines. You just text us. Many of our new-to-NYC customers tell us they signed up within their first week in the city and never looked back.'],
  ['Airbnb Hosts Managing Turnovers', 'Between-guest linen turnovers are time-critical and labor-intensive. Sheets, pillowcases, towels, bath mats, and kitchen linens all need to be washed, dried, folded, and restocked before the next guest checks in — often within a three to four hour window. Our Airbnb linen service is designed for exactly this scenario. We pick up dirty linens at checkout and deliver fresh ones before check-in. Same-day turnaround is available when scheduled in advance. Most hosts pass the laundry cost through as part of their cleaning fee and use our service as a reliable logistics partner rather than trying to do it themselves.'],
  ['Elderly or Mobility-Limited Residents', 'For residents who have difficulty carrying laundry bags, navigating stairs, or standing at a folding table, our door-to-door service removes the physical burden entirely. We pick up and deliver to the apartment door — no stairs, no carrying, no trips to the basement or laundromat. Several of our customers are elderly residents whose children set up a weekly subscription so their parent always has clean laundry without the physical strain. The same-driver consistency of our subscription plans is especially valued by this group because it creates a familiar, trusted routine.'],
]

function money(rows: [string, string][]) {
  return rows.map(([a, b]) => (
    <div key={a} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0 text-sm">
      <span className="text-zinc-500">{a}</span>
      <span className="font-bold text-zinc-900">{b}</span>
    </div>
  ))
}

export default function WashFoldMicrosite({ config }: { config: WashFoldMicrositeConfig }) {
  const allFaqs = [...config.localFaqs, ...GENERAL_FAQS]
  const schemas = washFoldMicrositeSchemas(config, allFaqs)
  const otherSites = getOtherWashFoldSites(config)

  return (
    <>
      <JsonLd data={schemas} />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pb-16 pt-12 text-white">
        <div className="relative mx-auto max-w-5xl px-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7EC8E3]/80">
            {config.areaName}, {config.borough} &middot; Licensed &amp; Insured &middot; Free Pickup &amp; Delivery
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {config.brandName}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-sky-100">
            {config.brandName} is the {config.areaName} laundry pickup and delivery team behind{' '}
            <a href={SITE_URL} className="text-[#7EC8E3] hover:text-white underline underline-offset-2">Wash and Fold NYC</a> —
            NYC&apos;s $3/lb, licensed wash and fold company. Same twelve-step process, same free pickup and delivery, same flat rate
            — focused specifically on {config.areaName}.
          </p>

          <div className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm">
            <span>&#10003; $3/lb — same rate everywhere</span>
            <span>&#10003; Free pickup &amp; delivery</span>
            <span>&#10003; $39 minimum order</span>
            <span>&#10003; Same-day rush +$20</span>
            <span>&#10003; 10% off weekly subscriptions</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={BOOK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-[#2B7BB0] shadow-lg transition-all hover:bg-sky-50">
              Book {config.areaName} Pickup
            </a>
            <a href={PHONE_SMS} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-base font-bold text-white transition-all hover:bg-white/20">
              Text {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      {/* ── INTRO ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 space-y-6">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#2B7BB0]">{config.areaName} Wash &amp; Fold</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Your Local {config.areaName} Laundry Pickup Team
          </h2>
          {config.introParagraphs.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed text-zinc-700">{p}</p>
          ))}
        </div>
      </section>

      {/* ── AREA CHALLENGES ── */}
      <section className="bg-[#1a3a5c] py-16 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#7EC8E3] text-center">Local Laundry Logistics</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-center sm:text-4xl">
            Why {config.areaName} Needs a Dedicated Wash &amp; Fold Team
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {config.areaChallenges.map(c => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-6">
                <h3 className="text-lg font-bold text-[#7EC8E3]">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sky-100">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="bg-[#F0F8FF] py-16 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#2B7BB0] text-center">Every Service, {config.areaName}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            {SERVICES.length} Laundry Services in {config.areaName}
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-center text-zinc-600">
            {config.brandName} covers every service {PARENT_BRAND_NAME} offers — the same licensed team, same $3/lb rate, focused on {config.areaName}.
          </p>
          <div className="mt-10 space-y-6">
            {SERVICES.map(s => (
              <div key={s.slug} className="rounded-2xl border border-zinc-200 bg-white p-7">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xl font-bold text-zinc-900">{s.name} in {config.areaName}</h3>
                  <span className="text-sm font-bold text-[#2B7BB0]">{s.priceRange} &middot; {s.duration}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{s.description}</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">What&apos;s Included</p>
                    <ul className="mt-2 space-y-1">
                      {s.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                          <span className="mt-0.5 text-[#2B7BB0]">&#10003;</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Ideal For</p>
                    <ul className="mt-2 space-y-1">
                      {s.idealFor.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                          <span className="mt-0.5 text-[#2B7BB0]">&#10003;</span>{f} in {config.areaName}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="bg-white py-16 scroll-mt-20">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#2B7BB0] text-center">{config.areaName} Pricing</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            $3/lb. No Hidden Fees. Ever.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-zinc-700">
            {config.brandName} charges the exact rate every {PARENT_BRAND_NAME} customer pays: $3 per pound, $39 minimum, free
            pickup and delivery in {config.areaName}. No distance surcharges, no neighborhood zones.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h3 className="font-bold text-zinc-900 mb-3">Standard Wash &amp; Fold</h3>
              {money([['Wash & fold', '$3/lb'], ['Minimum order', '$39'], ['Pickup & delivery', 'Free'], ['Turnaround', '24–48 hours'], ['Same-day rush', '+$20 flat fee']])}
            </div>
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h3 className="font-bold text-zinc-900 mb-3">Subscriptions — Save Up to 10%</h3>
              {money([['Weekly 15 lb', '$162/mo (save $18)'], ['Weekly 20 lb', '$216/mo (save $24)'], ['Biweekly 15 lb', '$85.50/mo (save $4.50)']])}
            </div>
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h3 className="font-bold text-zinc-900 mb-3">Comforters &amp; Bulky Items</h3>
              {money([['Twin comforter', '$35'], ['Full/Queen comforter', '$45'], ['King comforter', '$55'], ['Duvet cover', '$20'], ['Pillow (each)', '$12']])}
            </div>
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h3 className="font-bold text-zinc-900 mb-3">Dry Cleaning</h3>
              {money([['Dress shirt', '$10'], ['Suit (2-piece)', '$34'], ['Dress', '$28'], ['Winter coat', '$45'], ['Wedding dress', '$350']])}
            </div>
          </div>
        </div>
      </section>

      {/* ── REAL COST BREAKDOWN ── */}
      <section className="bg-[#1a3a5c] py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 space-y-5">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            What Laundry Actually Costs in {config.areaName} — The Real Math
          </h2>
          {REAL_COST_PARAGRAPHS.map((p, i) => (
            <p key={i} className="text-sky-100 leading-relaxed">{p}</p>
          ))}
        </div>
      </section>

      {/* ── 12-STEP PROCESS ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#2B7BB0] text-center">Our Process</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            The 12-Step Process Behind Every {config.areaName} Order
          </h2>
          <div className="mt-10 space-y-3">
            {PROCESS_STEPS.map(([t, d], i) => (
              <div key={t} className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-[#F0F8FF] p-4">
                <span className="text-lg font-black text-[#2B7BB0]/40 w-8 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">{t}</p>
                  <p className="mt-1 text-sm text-zinc-600 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="bg-[#F0F8FF] py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            Why {config.areaName} Trusts {config.brandName}
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_CARDS.map(c => (
              <div key={c.t} className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h3 className="font-bold text-zinc-900 text-sm mb-2">{c.t}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="bg-[#1a3a5c] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-center sm:text-4xl">
            {config.brandName} vs. The Alternatives
          </h2>
          <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b-2 border-[#4BA3D4]">
                  <th className="text-left py-3 px-4 text-sky-200/70">Factor</th>
                  <th className="text-center py-3 px-4 text-[#7EC8E3] font-bold">{config.brandName}</th>
                  <th className="text-center py-3 px-4 text-sky-200/40">Laundromat</th>
                  <th className="text-center py-3 px-4 text-sky-200/40">Delivery Apps</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([f, us, l, a]) => (
                  <tr key={f} className="border-b border-white/10">
                    <td className="py-3 px-4 font-medium">{f}</td>
                    <td className="py-3 px-4 text-center font-semibold text-[#7EC8E3]">{us}</td>
                    <td className="py-3 px-4 text-center text-sky-200/50">{l}</td>
                    <td className="py-3 px-4 text-center text-sky-200/50">{a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── WHO WE SERVE ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Who Uses {config.brandName} — And Why They Stay
          </h2>
          {WHO_WE_SERVE.map(([t, d]) => (
            <p key={t} className="text-zinc-700 leading-relaxed">
              <strong className="text-zinc-900">{t}.</strong> {d}
            </p>
          ))}
        </div>
      </section>

      {/* ── AREA DIRECTORY ── */}
      <section id="areas" className="bg-[#F0F8FF] py-16 scroll-mt-20">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#2B7BB0] text-center">Coverage</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            {config.areaName} Neighborhoods We Serve
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-center text-zinc-600">
            {config.brandName} is backed by {PARENT_BRAND_NAME}&apos;s full coverage across Manhattan, Brooklyn, and Queens.
            Every neighborhood below gets the same $3/lb rate.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {config.featuredNeighborhoods.map(n => (
              <span key={n} className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700">
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-white py-16 scroll-mt-20">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#2B7BB0] text-center">FAQ</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            {config.brandName} — Frequently Asked Questions
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {allFaqs.map(f => (
              <details key={f.question} className="group rounded-xl border border-zinc-200 bg-[#F0F8FF] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-900">{f.question}</summary>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── SISTER SITES ── */}
      {otherSites.length > 0 && (
        <section className="bg-[#F0F8FF] py-14 border-t border-zinc-200">
          <div className="mx-auto max-w-4xl px-4">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#2B7BB0] text-center">Wash and Fold NYC Neighborhood Network</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 text-center">
              Also Serving These NYC Areas
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {otherSites.map(s => (
                <a
                  key={s.domain}
                  href={`https://www.${s.domain}`}
                  className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-[#2B7BB0] hover:text-[#2B7BB0]"
                >
                  {s.brandName}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      <section className="bg-[#2B7BB0] py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready for Fresh, Folded Laundry in {config.areaName}?
          </h2>
          <p className="max-w-xl text-sky-50">
            $3/lb, free pickup &amp; delivery, 24–48 hour turnaround across {config.areaName} and every {PARENT_BRAND_NAME} service area.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href={BOOK_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-[#2B7BB0] hover:bg-sky-50">
              Book Pickup
            </a>
            <a href={PHONE_SMS} className="rounded-xl border-2 border-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-white/10">
              Text {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      <p className="bg-[#1a3a5c] py-6 text-center text-xs text-sky-200/60">
        <a href={SITE_URL} className="underline hover:text-white">
          Part of {PARENT_BRAND_NAME}&apos;s family of NYC laundry &amp; wash and fold services
        </a>
      </p>
    </>
  )
}
