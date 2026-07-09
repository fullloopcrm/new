import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, SMS_HREF } from "@/app/site/we-pay-you-junk/_data/content";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";

const LEFT_DATES = ['Jun 14, 2023', 'Jul 22, 2023', 'Jul 25, 2023', 'Aug 01, 2023', 'Aug 05, 2023', 'Aug 28, 2023', 'Sep 02, 2023', 'Oct 21, 2023', 'Nov 09, 2023', 'Nov 11, 2023', 'Nov 26, 2023', 'Dec 07, 2023', 'Dec 09, 2023', 'Dec 16, 2023', 'Dec 27, 2023', 'Dec 27, 2023', 'Jan 15, 2024', 'Feb 11, 2024', 'Mar 12, 2024', 'Apr 14, 2024', 'Apr 22, 2024', 'Jun 28, 2024', 'Jul 12, 2024', 'Aug 14, 2024', 'Aug 21, 2024'];
const RIGHT_DATES = ['Aug 25, 2024', 'Aug 31, 2024', 'Sep 09, 2024', 'Sep 19, 2024', 'Sep 19, 2024', 'Oct 14, 2024', 'Nov 23, 2024', 'Dec 15, 2024', 'Dec 21, 2024', 'Dec 21, 2024', 'Jan 13, 2025', 'Jan 21, 2025', 'Apr 20, 2025', 'Apr 27, 2025', 'May 05, 2025', 'Jun 05, 2025', 'Jun 10, 2025', 'Jul 15, 2025', 'Jul 18, 2025', 'Oct 07, 2025', 'Oct 12, 2025', 'Oct 13, 2025', 'Dec 06, 2025', 'Dec 27, 2025', 'Mar 31, 2026'];

export const metadata: Metadata = {
  title: "Junk Removal FAQ — 50 Questions Answered About Pricing, Credits, Services & More",
  description: "50 frequently asked questions about junk removal. Pricing, 50% resale credit, scheduling, what we take, what we don't, insurance, and how we compare to 1-800-GOT-JUNK and others.",
  alternates: { canonical: "/faq" },
};

const LEFT_FAQS = [
  { q: "How much does junk removal cost?", a: <>Our rates start at $200/hr for a 1-person crew, $300/hr for a 2-person crew, and +$100/hr per additional person for emergency same-day. Dump fees included (an industry first). 1 hour minimum. See our full <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing breakdown</Link>.</> },
  { q: "What is the 50% resale credit?", a: <>As we load your items, we appraise anything with resale value and credit you 50% (when applicable) toward your bill. A $400 couch = $200 credit. If credits exceed the bill, <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">we pay you the difference</Link>.</> },
  { q: "Can I really get paid for junk removal?", a: <>Yes. If your item credits add up to more than the hours worked, we hand you a check on the spot. This happens regularly on <Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">estate cleanouts</Link> and <Link href="/services/office-cleanouts" className="text-teal-700 font-semibold hover:underline">office cleanouts</Link>.</> },
  { q: "Do you offer same-day junk removal?", a: <>Yes. Call before noon and we can typically have a crew at your door within 2-4 hours. Need it faster? Our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">emergency same-day rate</Link> guarantees arrival within 2 hours.</> },
  { q: "What items do you NOT take?", a: <>Hazardous chemicals, asbestos, wet paint, biological waste, oil drums, full propane tanks, ammunition, compressed gas cylinders. See the full list on our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing page</Link>. Everything else — we handle it.</> },
  { q: "Are dump fees really included?", a: <>Yes — an industry first. Transfer station costs, landfill fees, recycling fees — all baked into the hourly rate. No surprise charges at the end. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">what&apos;s included</Link>.</> },
  { q: "How does furniture removal work?", a: <>We come to your home, load the furniture, and haul it away. Quality furniture gets appraised — Pottery Barn, West Elm, Restoration Hardware pieces hold serious value. See our <Link href="/services/furniture-removal" className="text-teal-700 font-semibold hover:underline">furniture removal service</Link>.</> },
  { q: "Do you remove appliances?", a: <>Yes. Refrigerators, washers, dryers, ovens, dishwashers — we disconnect (when applicable) and haul. Working appliances earn you significant <Link href="/services/appliance-removal" className="text-teal-700 font-semibold hover:underline">resale credits</Link>.</> },
  { q: "What about electronics and e-waste?", a: <>We remove TVs, computers, monitors, printers, and all electronics. Working items earn you credit. Non-working items get <Link href="/services/tv-electronics-removal" className="text-teal-700 font-semibold hover:underline">recycled through certified e-waste facilities</Link>.</> },
  { q: "Can you remove a piano?", a: <>Yes. Uprights, grands, baby grands — our crew handles the weight and the stairs. Working pianos in good condition earn credit. See <Link href="/services/piano-removal" className="text-teal-700 font-semibold hover:underline">piano removal details</Link>.</> },
  { q: "Do you do hot tub removal?", a: <>Yes. We demo the shell, disconnect plumbing/electrical, load everything, and haul it away. All included in the hourly rate. See <Link href="/services/hot-tub-removal" className="text-teal-700 font-semibold hover:underline">hot tub removal</Link>.</> },
  { q: "What about construction debris?", a: <>Drywall, lumber, concrete, tile, roofing — we load and haul it all. No weight limits, no overage fees. Better than a dumpster rental. See <Link href="/services/construction-debris-removal" className="text-teal-700 font-semibold hover:underline">construction debris removal</Link>.</> },
  { q: "Do you remove sheds and decks?", a: <>Yes. Full demolition and haul-away for <Link href="/services/shed-removal" className="text-teal-700 font-semibold hover:underline">sheds</Link>, <Link href="/services/deck-removal" className="text-teal-700 font-semibold hover:underline">decks</Link>, <Link href="/services/fence-removal" className="text-teal-700 font-semibold hover:underline">fences</Link>, and <Link href="/services/trampoline-removal" className="text-teal-700 font-semibold hover:underline">trampolines</Link>. Same hourly rate covers demo + hauling.</> },
  { q: "How do estate cleanouts work?", a: <>We clear the entire property room by room. Every item with resale value gets appraised and credited. Estates have the highest credit density — families frequently get a check instead of a bill. See <Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">estate cleanout details</Link>.</> },
  { q: "Do you handle hoarder cleanouts?", a: <>Yes, with sensitivity and professionalism. Our crews are trained for heavy accumulation situations. We sort carefully, credit valuable items, and clear the space completely. See <Link href="/services/hoarder-cleanouts" className="text-teal-700 font-semibold hover:underline">hoarder cleanout service</Link>.</> },
  { q: "Can you clear a storage unit?", a: <>Yes. We coordinate with your facility for access and clear the entire unit. Stop paying monthly rent on stuff you don&apos;t need. See <Link href="/services/storage-unit-cleanouts" className="text-teal-700 font-semibold hover:underline">storage unit cleanouts</Link>.</> },
  { q: "What areas do you serve?", a: <>We operate in 900+ cities across all 50 states from 50 local offices. Find your city on our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">locations page</Link>.</> },
  { q: "Do you have an office near me?", a: <>We have one office in every state — 50 total. Each staffed with local crews. See all <Link href="/locations" className="text-teal-700 font-semibold hover:underline">50 office addresses with directions</Link>.</> },
  { q: "Are you licensed and insured?", a: <>Fully licensed, bonded, and insured in every state. Every crew member is background-checked. We carry comprehensive liability coverage. Learn more <Link href="/about" className="text-teal-700 font-semibold hover:underline">about our team</Link>.</> },
  { q: "Do you charge extra for stairs?", a: <>No. Third-floor walkup, basement, attic with a pull-down ladder — same hourly rate. No stair fees, no heavy item surcharges, no distance fees. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">our no-hidden-fees policy</Link>.</> },
  { q: "Is there a minimum charge?", a: <>1 hour minimum per job. If your job takes 45 minutes, you pay for 1 hour. After the first hour, we bill in 15-minute increments. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing details</Link>.</> },
  { q: "Do you charge more on weekends?", a: <>No. Same rate 7 days a week, 365 days a year. Saturdays, Sundays, holidays — no surcharges, no overtime. <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">Book any day</Link>.</> },
  { q: "How do I book junk removal?", a: <><Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">Book online</Link>, <a href={SMS_HREF} className="text-teal-700 font-semibold hover:underline">text us</a>, or <a href={SMS_HREF} className="text-teal-700 font-semibold hover:underline">text {PHONE}</a>. Takes about 2 minutes. We confirm the rate, estimate time, and schedule your crew.</> },
  { q: "How far in advance do I need to book?", a: <>Same-day is available. We also take bookings up to 4 weeks out. 24-48 hours ahead guarantees your preferred time slot. <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">Book now</Link>.</> },
  { q: "Do I need to be home?", a: <>For items with resale value — yes, so you can approve appraisals and credits. For pure junk with no valuable items, we can work without you present as long as we have access. <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-700 font-semibold hover:underline">Contact us</Link> to discuss.</> },
];

const RIGHT_FAQS = [
  { q: "How is your pricing different from 1-800-GOT-JUNK?", a: <>They charge $200-$800 per truckload based on volume and keep 100% of resale profit. We charge by the hour and credit you 50% (when applicable) of resale value. The math always favors you. See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">side-by-side comparison</Link>.</> },
  { q: "What items earn the most resale credit?", a: <>Quality furniture (Pottery Barn, Restoration Hardware), working appliances (Samsung, LG), power tools (DeWalt, Milwaukee), exercise equipment (Peloton), and musical instruments. See the full <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">item value guide</Link>.</> },
  { q: "What if I disagree with an appraisal?", a: <>Every appraisal is a conversation. We show you comparable sales data and explain our valuation. If you have evidence of higher value, we adjust. Nothing is credited without your approval. <Link href="/about" className="text-teal-700 font-semibold hover:underline">Learn about our process</Link>.</> },
  { q: "What if none of my items have resale value?", a: <>You pay the hourly rate with dump fees included (an industry first). Even with zero credits, our hourly rate is competitive with or cheaper than flat-rate pricing for the same volume. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing examples</Link>.</> },
  { q: "How do you determine resale value?", a: <>Real-time comparable sales from major resale platforms, local dealer networks, and auction results. Not inflated retail, not lowball — actual current market value. Our crews are trained appraisers. <Link href="/about" className="text-teal-700 font-semibold hover:underline">Learn more</Link>.</> },
  { q: "Do you offer commercial junk removal?", a: <>Yes — offices, warehouses, retail stores, hotels, schools, churches, and property management. Commercial furniture has the highest resale value. See all <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial services</Link>.</> },
  { q: "Can you clear an entire office?", a: <>Yes. From a 5-person startup to a 500-seat corporate floor. Herman Miller chairs, Steelcase desks, monitors — the credits on office jobs regularly cover the entire bill. See <Link href="/services/office-cleanouts" className="text-teal-700 font-semibold hover:underline">office cleanout details</Link>.</> },
  { q: "Do you work with property managers?", a: <>Yes. Recurring service, priority scheduling, consistent crew assignments. Tenant turnovers, evictions, foreclosures — items left behind earn credits toward your bill. See <Link href="/services/property-management-cleanouts" className="text-teal-700 font-semibold hover:underline">property management service</Link>.</> },
  { q: "Do you do foreclosure cleanouts?", a: <>Yes. Fast turnaround for banks, property managers, and realtors. We get properties market-ready quickly and credit you for valuable items left behind. See <Link href="/services/foreclosure-cleanouts" className="text-teal-700 font-semibold hover:underline">foreclosure cleanouts</Link>.</> },
  { q: "Can you remove carpet and flooring?", a: <>Yes. We rip up and haul away carpet, tile, hardwood, laminate, and vinyl. Hardwood in good condition earns resale credit. See <Link href="/services/carpet-flooring-removal" className="text-teal-700 font-semibold hover:underline">carpet &amp; flooring removal</Link>.</> },
  { q: "Do you take scrap metal?", a: <>Yes — and it earns you credit. Steel, aluminum, copper, brass all have scrap value. Copper pipe runs $3-$5/lb. Metal-heavy jobs frequently result in big credits. See <Link href="/services/scrap-metal-removal" className="text-teal-700 font-semibold hover:underline">scrap metal removal</Link>.</> },
  { q: "What about yard waste?", a: <>Branches, soil, mulch, sod, landscaping timbers, storm debris — we load and haul it all. See <Link href="/services/yard-waste-removal" className="text-teal-700 font-semibold hover:underline">yard waste removal</Link>.</> },
  { q: "Do you remove exercise equipment?", a: <>Treadmills, Pelotons, ellipticals, weight sets, home gyms. The fitness resale market is strong — many of these items generate credits that cover the entire job. See <Link href="/services/exercise-equipment-removal" className="text-teal-700 font-semibold hover:underline">exercise equipment removal</Link>.</> },
  { q: "Can you remove a pool table?", a: <>Yes. We disassemble slate tops, rails, and frame. Quality pool tables earn resale credit. See <Link href="/services/pool-table-removal" className="text-teal-700 font-semibold hover:underline">pool table removal</Link>.</> },
  { q: "Do you remove mattresses?", a: <>Yes. Mattresses, box springs, and bed frames. Frames in good condition earn credit. Mattresses go to mattress recyclers where available. See <Link href="/services/mattress-removal" className="text-teal-700 font-semibold hover:underline">mattress removal</Link>.</> },
  { q: "Do you recycle?", a: <>Yes. Approximately 60% of items we remove are diverted from landfills through resale, donation, and recycling. Our business model incentivizes reuse over disposal. <Link href="/about" className="text-teal-700 font-semibold hover:underline">Learn about our environmental impact</Link>.</> },
  { q: "Where do donated items go?", a: <>Local charities and nonprofits in your area. Usable items below our resale threshold get donated rather than dumped. We partner with organizations in every market we serve. See <Link href="/locations" className="text-teal-700 font-semibold hover:underline">your local office</Link>.</> },
  { q: "Do you provide certificates of insurance?", a: <>Yes. COIs available on request for commercial customers, property managers, and realtors. We carry comprehensive general liability and workers&apos; comp. <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-700 font-semibold hover:underline">Request a COI</Link>.</> },
  { q: "What payment methods do you accept?", a: <>Credit cards, debit cards, checks, Venmo, Zelle, and CashApp. For payouts (credits exceeding your bill), we process by check or digital transfer on the spot. <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">Book now</Link>.</> },
  { q: "Do you have contracts or recurring fees?", a: <>No. Every job is standalone. No subscriptions, no recurring charges, no cancellation penalties. Book when you need us. <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">See pricing</Link>.</> },
  { q: "Are you bringing on partners?", a: <>Yes — in all 50 states. It&apos;s a 1099 partner role: $100/hr as the lead with your own truck, $50/hr per additional laborer, plus 60% resale. Bring your own truck, license, and insurance. See <Link href="/careers" className="text-teal-700 font-semibold hover:underline">partner opportunities</Link>.</> },
  { q: "Do you offer franchise opportunities?", a: <>Yes. The only junk removal franchise with a dual revenue model — hourly fees plus resale income. See <Link href="/franchise" className="text-teal-700 font-semibold hover:underline">franchise details</Link>.</> },
  { q: "How do I contact you for non-booking questions?", a: <>Use our <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-700 font-semibold hover:underline">contact form</Link> for general inquiries, partnerships, media, or feedback. For booking, use the <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">booking page</Link>.</> },
  { q: "Why don't other companies do this?", a: <>Most junk companies charge you to haul your items and then resell the valuable ones for 100% profit. They have no incentive to share. We built a different model — see <Link href="/about" className="text-teal-700 font-semibold hover:underline">our story</Link>.</> },
  { q: "How many services do you offer?", a: <>34 specialized junk removal services — residential cleanouts, single item pickup, structure demolition, construction debris, and commercial services. Browse all <Link href="/services" className="text-teal-700 font-semibold hover:underline">34 services</Link>.</> },
];

export default function FAQPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">50 Junk Removal Questions Answered</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Junk Removal FAQ — <span className="gradient-text">Everything You Need to Know</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Pricing, credits, scheduling, what we take, what we don&apos;t, how we compare. 50 answers — no dropdowns, no hiding.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* ===== PRICING & CREDITS FAQS ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Junk Removal Pricing, Resale Credits, and How the Math Works</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">50 Frequently Asked Questions About Junk Removal</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Everything from <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">how pricing works</Link> to <Link href="/services" className="text-teal-700 font-semibold hover:underline">what services we offer</Link> to <Link href="/locations" className="text-teal-700 font-semibold hover:underline">where we operate</Link>. Still have questions? <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-700 font-semibold hover:underline">Contact us</Link> or <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">book your pickup</Link>.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
            {/* Left column — 25 */}
            <div className="space-y-6">
              {LEFT_FAQS.map((faq, i) => (
                <div key={i}>
                  <h3 className="text-base font-bold text-slate-900">{faq.q}</h3>
                  <p className="mt-1 text-xs text-slate-400">Last updated: {LEFT_DATES[i]}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>

            {/* Right column — 25 */}
            <div className="space-y-6">
              {RIGHT_FAQS.map((faq, i) => (
                <div key={i}>
                  <h3 className="text-base font-bold text-slate-900">{faq.q}</h3>
                  <p className="mt-1 text-xs text-slate-400">Last updated: {RIGHT_DATES[i]}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== BUSINESS MODEL ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How the Only Junk Removal Company That Pays You Actually Works</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Understanding Our Business Model — Why We Share Resale Value With You</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Learn how our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">hourly pricing</Link> and 50% Resale Credit (when applicable) model creates a better deal for customers, a sustainable business for us, and a <Link href="/about" className="text-teal-700 font-semibold hover:underline">better outcome for the environment</Link>. Browse all <Link href="/services" className="text-teal-700 font-semibold hover:underline">34 services</Link> or <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">book your pickup</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Traditional junk companies charge you a flat fee based on truck volume, haul everything away, and resell your valuable items for their own profit. They make money twice — once from you and once from your stuff. You pay full price and get nothing back.</p>
            <p>We charge a transparent hourly rate with dump fees included (an industry first). As we load your items, we appraise anything with resale value and credit you 50% (when applicable) of fair market value toward your bill. If your credits exceed the bill, we pay you the difference.</p>
            <p>This works because we&apos;ve built efficient resale channels — secondhand furniture dealers, appliance refurbishers, electronics resellers, tool dealers, and online marketplaces across the country. When we remove a working refrigerator worth $400, we sell it for that price. You get $200 credited, we net $200 from the sale, and the fridge goes to a new home instead of a landfill.</p>
            <p>The result: customers save 25-40% compared to flat-rate haulers. Large cleanouts regularly result in payouts. And because we profit from resale rather than dumping, approximately 60% of items stay out of landfills. Everyone wins.</p>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Ready to See What Your Junk Is Worth?</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Still Have Questions? We&apos;ve Got Answers.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">
            Text, call, or book online. Our team is standing by 7 days a week.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
