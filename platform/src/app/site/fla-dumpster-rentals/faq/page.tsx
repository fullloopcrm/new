import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, SITE_URL, EMAIL, ADDRESS } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import { getFAQPageSchema } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

export const metadata: Metadata = {
  title: "FAQ | Florida Dumpster Rentals",
  description:
    "Answers to common questions about dumpster rental in Florida: pricing, sizes, delivery, what you can and can't throw away, permits, and more. Call 954-710-2332.",
  alternates: { canonical: `${SITE_URL}/faq` },
};

const phonePlain = PHONE.replace(/-/g, "");

const faqCategories = [
  {
    category: "Ordering & Pricing",
    faqs: [
      {
        q: "How do I order a dumpster?",
        a: "Text or call us at 954-710-2332 with your project details — type of project, delivery address, and preferred delivery date. We will recommend a dumpster size, give you a flat-rate quote that includes everything, and schedule delivery. The entire ordering process takes 2-3 minutes. You can also book through our online scheduling form. No deposit required for most rentals.",
      },
      {
        q: "How much does a dumpster rental cost in Florida?",
        a: "Our 10 yard dumpsters start at $275, 20 yard from $350, and 30 yard from $450. Every price includes delivery, pickup, a 7-day rental period, and disposal up to the included weight limit. There are no hidden fees — no fuel surcharge, no environmental fee, no admin charge. The price we quote is the price on your invoice. Exact pricing depends on your location within Florida and the type of debris you are disposing of.",
      },
      {
        q: "Is there a deposit required?",
        a: "Most rentals do not require a deposit. Payment is collected at the time of delivery. We accept all major credit cards, debit cards, and cash. Contractors with established accounts can arrange NET-30 billing with consolidated monthly invoicing.",
      },
      {
        q: "What is included in the price?",
        a: "Your flat-rate price includes four things: delivery of the dumpster to your location, a 7-day rental period, pickup of the full container, and disposal at a licensed facility up to the included weight limit (2 tons for 10 yard, 3 tons for 20 yard, 4 tons for 30 yard). There is no separate charge for any of these services. The only potential additional cost is a per-ton overage fee if your load exceeds the weight limit.",
      },
      {
        q: "Do you offer discounts for contractors or repeat customers?",
        a: "Yes. We offer volume pricing for contractors, builders, property managers, and businesses with recurring dumpster needs. Discounts range from 15-25% depending on volume. Contractor accounts include priority scheduling, same-day swap service, NET-30 billing, and a dedicated account manager. Contact us at 954-710-2332 to set up an account.",
      },
      {
        q: "Can I cancel or reschedule my delivery?",
        a: "Yes. If you need to cancel or reschedule, contact us at least 24 hours before your scheduled delivery and there is no charge. Same-day cancellations may incur a fee depending on whether the truck has already been dispatched. We understand that project timelines shift and we are flexible.",
      },
      {
        q: "How does your pricing compare to other dumpster rental companies?",
        a: "Our pricing is competitive with or lower than most Florida dumpster companies — and more importantly, our prices are truly all-inclusive. Many competitors advertise a low base price and then add fuel surcharges, environmental fees, delivery charges, and admin fees that increase the total cost by 30-50%. When you compare total cost (not just the base price), we are consistently among the most affordable options in every market we serve.",
      },
    ],
  },
  {
    category: "Sizes & Capacity",
    faqs: [
      {
        q: "What size dumpster do I need?",
        a: "For small cleanouts (garage, attic, single room), a 10 yard dumpster is usually enough — it holds about 4 pickup truck loads. For renovation projects (kitchen, bathroom, flooring), roofing, and large cleanouts, a 20 yard is most popular at roughly 8 truck loads. For construction, demolition, and large commercial projects, go with a 30 yard at about 12 truck loads. Not sure? Text us your project details or a photo of what you are removing and we will recommend the right size.",
      },
      {
        q: "What are the dimensions of each dumpster size?",
        a: "The 10 yard dumpster measures 12 feet long by 8 feet wide by 3.5 feet high — about the size of a large parking spot. The 20 yard measures 22 feet long by 8 feet wide by 4.5 feet high. The 30 yard measures 22 feet long by 8 feet wide by 6 feet high — same footprint as the 20 yard, just taller. All three sizes have a rear swing door for walk-in loading of heavy items.",
      },
      {
        q: "What are the weight limits for each size?",
        a: "The 10 yard dumpster has a 2-ton (4,000 lb) weight limit. The 20 yard allows up to 3 tons (6,000 lbs). The 30 yard handles up to 4 tons (8,000 lbs). These limits are included in your flat-rate price. If your load exceeds the limit, overage fees of $40-$60 per additional ton apply. Most residential cleanouts and renovations stay well within these limits. The materials that push you over are dense items like concrete, brick, tile, dirt, and roofing shingles.",
      },
      {
        q: "How many pickup truck loads fit in each dumpster?",
        a: "A 10 yard dumpster holds about 4 pickup truck loads of debris. A 20 yard holds about 8 loads. A 30 yard holds about 12 loads. These estimates are based on a standard full-size pickup truck bed. In terms of trash bags, a 10 yard holds about 50-60 bags, a 20 yard about 100-120 bags, and a 30 yard about 150-180 bags.",
      },
      {
        q: "What if I fill my dumpster before my project is done?",
        a: "No problem. We can swap it out for an empty one — typically within hours of your call — or bring a second dumpster to run alongside the first. Many of our contractor customers do multiple pickups per project with continuous rotation service. The swap is billed as a separate rental at our standard rate.",
      },
      {
        q: "How high can I fill the dumpster?",
        a: "Debris must not extend above the top edge of the dumpster walls. This is a DOT safety requirement for transport — overfilled containers cannot be legally hauled on public roads. Our driver will not be able to pick up an overfilled dumpster until the excess material is removed or leveled to the rim. Load level and you will have no issues.",
      },
      {
        q: "What is the difference between a 20 yard and 30 yard dumpster?",
        a: "Both the 20 yard and 30 yard have the same 22-foot by 8-foot footprint — the 30 yard is simply taller (6 feet vs 4.5 feet). This means if a 20 yard fits in your driveway, a 30 yard will too. The 30 yard holds 50% more volume and has a higher weight limit (4 tons vs 3 tons). The price difference is $100. If you are on the fence between sizes, the 30 yard gives you a significant capacity buffer for a modest price increase.",
      },
    ],
  },
  {
    category: "Delivery & Pickup",
    faqs: [
      {
        q: "Do you offer same-day delivery?",
        a: "Yes. Same-day delivery is available across most of Florida when you text or call before noon. Next-day delivery is guaranteed for all orders placed by 5 PM. We maintain dumpster inventory staged in every major Florida region, which allows us to offer fast delivery times statewide. Rural areas and island communities (like the Florida Keys) may require an additional day for scheduling.",
      },
      {
        q: "How long can I keep the dumpster?",
        a: "Every rental includes a standard 7-day rental period. This gives you a full week to load at your own pace. If you need more time, extensions are available at $15/day for 10 yard, $20/day for 20 yard, and $25/day for 30 yard dumpsters. Just text or call us before day 7 to extend. There is no limit on how long you can keep it — extensions are available as long as you need.",
      },
      {
        q: "Can I get the dumpster picked up early?",
        a: "Absolutely. If you finish loading before your 7-day rental period ends, text or call us and we will schedule pickup within 24 hours. There is no penalty for ending your rental early — you are not charged extra for early pickup and we do not refund unused days. Getting the dumpster off your property sooner is a win for everyone.",
      },
      {
        q: "Do I need to be home for delivery?",
        a: "No. As long as the placement area is clear of vehicles, trash cans, and other obstacles, our driver can deliver without you being present. When you order, just tell us exactly where you want the dumpster placed. We send a photo confirmation after delivery so you can verify the placement from wherever you are.",
      },
      {
        q: "Where will the dumpster be placed?",
        a: "The driver will place the dumpster wherever you specify: driveway, yard, parking lot, construction site, or any other accessible area on your property. The delivery truck needs approximately 60 feet of straight-line clearance to back in and about 23 feet of vertical clearance for overhead lines and trees. If your driveway or placement area has limitations, let us know when ordering so our driver can plan the best approach.",
      },
      {
        q: "Will the dumpster damage my driveway?",
        a: "Roll-off dumpsters are designed to sit flat on hard surfaces and damage is rare on driveways in good condition. If you are concerned about your driveway — particularly if it is new, has decorative pavers, or has thin asphalt — we can place plywood boards under the wheels to distribute the weight. Just mention it when you order and our driver will come prepared with boards at no extra charge.",
      },
      {
        q: "What if there is a problem with my delivery?",
        a: "Call or text us immediately. If the dumpster is placed in the wrong spot, we will send the driver back to reposition it. If there is a scheduling issue, we will resolve it the same day. We monitor every delivery and hold our hauler partners accountable for on-time, accurate service. Your satisfaction is our responsibility, not the hauler's.",
      },
    ],
  },
  {
    category: "What Goes In / What Doesn't",
    faqs: [
      {
        q: "What can I put in a dumpster?",
        a: "Most household and construction debris is accepted: furniture (couches, tables, chairs, dressers, bed frames), appliances (with refrigerant removed from fridges and AC units), drywall, roofing shingles, lumber, framing, concrete (within weight limits), brick, tile, carpet, vinyl flooring, hardwood flooring, yard waste, tree branches, shrubs, cardboard, clothing, toys, electronics, kitchenware, and general junk. If it came from your house, your renovation, or your yard, it almost certainly goes in the dumpster.",
      },
      {
        q: "What cannot go in a dumpster?",
        a: "Hazardous materials are not accepted in any dumpster: paint (liquid — dried paint cans are OK), chemicals and solvents, motor oil, antifreeze, pesticides and herbicides, asbestos, batteries (car batteries), medical and biological waste, flammable liquids, propane tanks, and tires in quantities over four. These items require specialized disposal and cannot be taken to standard landfills. If you are unsure about a specific item, text us a photo and we will confirm immediately.",
      },
      {
        q: "Can I put concrete, dirt, or brick in the dumpster?",
        a: "Yes, but these materials are extremely heavy and will reach the weight limit much faster than lighter debris. Concrete weighs approximately 150 lbs per cubic foot — a small pile can weigh thousands of pounds. We recommend keeping heavy materials like concrete, dirt, brick, stone, and ceramic tile in a separate dedicated load rather than mixing them with lighter debris. This prevents weight overages and often saves money. Let us know if your project involves heavy materials and we will advise on the best strategy.",
      },
      {
        q: "Can I throw away appliances?",
        a: "Yes, most appliances can go in the dumpster: washers, dryers, dishwashers, stoves, ovens, microwaves, water heaters, and most small appliances. Refrigerators, freezers, and air conditioning units require Freon removal before disposal — this is an EPA requirement. Many appliance removal services will evacuate the refrigerant for $25-$50. Once the refrigerant is removed, the unit can go in the dumpster. Let us know if you have Freon-containing appliances and we can advise.",
      },
      {
        q: "Can I put yard waste in a dumpster?",
        a: "Yes. Tree branches, brush, dead shrubs, sod, old mulch, palm fronds, and general yard debris are all accepted. Yard waste is typically bulky but light, so you will fill the volume before approaching the weight limit. Large tree trunks and stumps are accepted but can be very heavy — a single large trunk can weigh hundreds of pounds. If your project involves removing large trees, mention it when you order so we can account for the weight.",
      },
      {
        q: "Can I put mattresses in a dumpster?",
        a: "Yes. Mattresses, box springs, and futon mattresses can all go in the dumpster. They are bulky but relatively light (80-150 lbs each). The main consideration is space — a king-size mattress takes up a significant amount of room. If you are disposing of multiple mattresses, consider placing them on their sides to save space for other debris.",
      },
    ],
  },
  {
    category: "Permits & Regulations",
    faqs: [
      {
        q: "Do I need a permit for a dumpster in Florida?",
        a: "If the dumpster is placed on your own private property — your driveway, your yard, your parking lot — no permit is needed in most Florida jurisdictions. If the dumpster must be placed on a public street, sidewalk, or right-of-way, you will likely need a permit from your local city or county. Permit costs are typically $25-$150 and processing takes 1-3 business days. We know the specific permit requirements for every area we serve and will tell you exactly what is needed when you book.",
      },
      {
        q: "Are there HOA restrictions on dumpsters?",
        a: "Many HOAs have rules about dumpster placement, duration, screening requirements, and advance notification. Some require board approval before a dumpster can be placed on a property. Others limit the rental duration or require that the dumpster be screened from street view. Check with your HOA before ordering. In most cases, a dumpster on your driveway for 7 days during an approved renovation is acceptable, but it is always better to confirm in advance than to deal with fines after the fact.",
      },
      {
        q: "What about environmental regulations?",
        a: "All debris is taken to licensed disposal facilities that comply with Florida Department of Environmental Protection (DEP) regulations. These facilities sort, recycle, and dispose of materials according to state and federal environmental laws. Recyclable materials — metals, clean wood, concrete, cardboard — are diverted from landfills when possible. We never illegally dump waste and all of our hauler partners are required to use licensed disposal facilities.",
      },
      {
        q: "Are there any time-of-day restrictions for dumpster delivery?",
        a: "Most Florida municipalities allow dumpster delivery during standard business hours (7 AM to 7 PM). Some residential areas have noise ordinances that restrict early morning deliveries before 7 AM or 8 AM. If you have a specific delivery time requirement, let us know and we will accommodate it within local regulations. Our standard delivery windows are morning (7-12) and afternoon (12-5).",
      },
      {
        q: "How long can a dumpster stay on my property?",
        a: "On private property, there is typically no municipal time limit for dumpster rental in most Florida areas. Some HOAs and a few municipalities have maximum duration rules (usually 14-30 days). Our standard rental period is 7 days with daily extensions available as long as you need. For long-term projects, we can arrange multi-week or monthly rental rates. Let us know your timeline and we will set up the right arrangement.",
      },
    ],
  },
];

const allFaqs = faqCategories.flatMap((cat) =>
  cat.faqs.map((faq) => ({ q: faq.q, a: faq.a }))
);

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(getFAQPageSchema(allFaqs)),
        }}
      />

      {/* Hero */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Got Questions?
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-stone-400">
            Everything you need to know about renting a dumpster in Florida.
            We have compiled the most common questions we get from homeowners,
            contractors, and businesses across the state. Can&apos;t find your
            answer here? Text or call us anytime and get a real answer from a
            real person.
          </p>
          <CTAGroup variant="hero" />
        </div>
      </section>

      {/* Quick Nav */}
      <section className="bg-white border-b border-zinc-200 py-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {faqCategories.map((cat) => (
              <a
                key={cat.category}
                href={`#${cat.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-orange-300 hover:text-orange-600"
              >
                {cat.category}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {faqCategories.map((cat) => (
              <div
                key={cat.category}
                id={cat.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
              >
                <h2 className="text-2xl font-bold text-zinc-900">{cat.category}</h2>
                <div className="mt-6 space-y-6">
                  {cat.faqs.map((faq) => (
                    <div key={faq.q} className="border-b border-zinc-100 pb-6">
                      <h3 className="text-lg font-semibold text-zinc-900">{faq.q}</h3>
                      <p className="mt-2 text-zinc-600">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions? */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Still Have Questions?
          </h2>
          <p className="mt-3 text-lg text-stone-500">
            We are here to help. Text or call us anytime and get a real answer
            from a real person — not a chatbot, not a form submission, not a
            callback request. A real person who knows dumpsters.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={`sms:${phonePlain}`}
              className="inline-flex items-center rounded-lg bg-orange-600 px-6 py-3 text-lg font-semibold text-white hover:bg-orange-700"
            >
              Text Us
            </a>
            <a
              href={`tel:${phonePlain}`}
              className="inline-flex items-center rounded-lg border border-zinc-300 px-6 py-3 text-lg font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Call {PHONE}
            </a>
            <Link
              href="/schedule-dumpster-rental-form"
              className="inline-flex items-center rounded-lg border border-zinc-300 px-6 py-3 text-lg font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Book Online
            </Link>
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "You Probably Need a 20-Yarder",
            body: "It's our most popular size for a reason. Whether you're doing a kitchen remodel, a roof tear-off, or a whole-house cleanout, the 20-yard dumpster handles it. It fits in a standard driveway and holds about 8 pickup truck loads of debris.",
          },
          {
            title: "Rain Makes Everything Heavier",
            body: "Florida's afternoon thunderstorms can add hundreds of pounds of water weight to your dumpster — especially if it's full of drywall, cardboard, or insulation. Toss a tarp over it between loading sessions. Thirty seconds of effort can save you $50-100 in overage fees.",
          },
          {
            title: "We Don't Judge Your Hoard",
            body: "We've hauled away 30 years of National Geographic collections, entire garages full of mystery boxes, and things we genuinely can't identify. No shame, no judgment — just a dumpster and a fresh start. That's what we're here for.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </>
  );
}
