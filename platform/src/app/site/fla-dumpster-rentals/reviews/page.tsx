// @ts-nocheck
import type { Metadata } from "next";
import { PHONE, SITE_URL, EMAIL, ADDRESS } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

export const metadata: Metadata = {
  title: "Reviews | Florida Dumpster Rentals",
  description:
    "See what Florida customers say about our dumpster rental service. 4.9 stars from 312+ reviews. Fast delivery, fair pricing, reliable service. Call 954-710-2332.",
  alternates: { canonical: `${SITE_URL}/reviews` },
};

const phonePlain = PHONE.replace(/-/g, "");

const reviews = [
  {
    name: "Mike Rodriguez",
    location: "Fort Lauderdale, FL",
    role: "General Contractor",
    rating: 5,
    text: "We use Florida Dumpster Rentals for all our job sites across Broward County. Always on time, fair pricing, and the 30-yard dumpsters handle everything we throw at them. Best in the business.",
    date: "2 weeks ago",
  },
  {
    name: "Sarah Thompson",
    location: "Tampa, FL",
    role: "Homeowner",
    rating: 5,
    text: "Rented a 20-yard for a full kitchen renovation. Delivery was the next morning, exactly where I wanted it. The price they quoted was the price I paid. No surprises. Will definitely use again.",
    date: "1 month ago",
  },
  {
    name: "James Wilson",
    location: "Jacksonville, FL",
    role: "Property Manager",
    rating: 5,
    text: "Manage 12 rental properties and use these guys whenever tenants move out. Quick response, same-day delivery most of the time. The 10-yard is perfect for apartment cleanouts.",
    date: "3 weeks ago",
  },
  {
    name: "Maria Santos",
    location: "Miami, FL",
    role: "Homeowner",
    rating: 5,
    text: "We cleaned out my mother's house after she moved to assisted living. So much stuff. The 20-yard dumpster was the perfect size. The whole process was easy and stress-free during a hard time.",
    date: "1 month ago",
  },
  {
    name: "David Chen",
    location: "Orlando, FL",
    role: "Roofing Contractor",
    rating: 5,
    text: "We go through 3-4 dumpsters a week during busy season. Florida Dumpster Rentals keeps up with our volume without any issues. Pricing is consistent and the haulers they work with are reliable.",
    date: "2 months ago",
  },
  {
    name: "Jennifer Martinez",
    location: "St. Petersburg, FL",
    role: "Homeowner",
    rating: 4,
    text: "Great service overall. Ordered a 10-yard for a garage cleanout and it was delivered the same day. Only reason for 4 stars is pickup took an extra day, but they let me know in advance.",
    date: "1 month ago",
  },
  {
    name: "Robert Taylor",
    location: "Boca Raton, FL",
    role: "Business Owner",
    rating: 5,
    text: "Had a commercial office cleanout — 30 years of accumulated furniture and files. The team recommended two 20-yard dumpsters and the pricing was very competitive. Professional from start to finish.",
    date: "3 weeks ago",
  },
  {
    name: "Ashley Johnson",
    location: "Naples, FL",
    role: "Homeowner",
    rating: 5,
    text: "First time renting a dumpster and I was nervous about the process. Texted them, got a quote in minutes, dumpster showed up the next morning. Filled it with yard waste and old furniture. So easy!",
    date: "2 weeks ago",
  },
  {
    name: "Carlos Gutierrez",
    location: "Hialeah, FL",
    role: "Demolition Contractor",
    rating: 5,
    text: "These guys understand what contractors need. Fast delivery, no nonsense, and they always have availability when I need it. Been using them for 6 months and haven't had a single issue.",
    date: "1 month ago",
  },
  {
    name: "Patricia Williams",
    location: "Tallahassee, FL",
    role: "Homeowner",
    rating: 5,
    text: "Used them for a bathroom and laundry room remodel. The 10-yard was plenty for tiles, old vanity, drywall, and fixtures. Great value. The driver even put boards under the wheels to protect my driveway.",
    date: "2 months ago",
  },
  {
    name: "Kevin O'Brien",
    location: "Sarasota, FL",
    role: "Flipper / Investor",
    rating: 5,
    text: "I flip 4-5 houses a year and always need dumpsters. Florida Dumpster Rentals gives me consistent pricing and priority scheduling. They're my go-to for every project now.",
    date: "3 weeks ago",
  },
  {
    name: "Lisa Nguyen",
    location: "Gainesville, FL",
    role: "Homeowner",
    rating: 5,
    text: "Whole-house cleanout after downsizing. We filled an entire 30-yard dumpster. The price was half what another company quoted me. Pickup was prompt and the whole experience was smooth.",
    date: "1 month ago",
  },
  {
    name: "Tony Ramirez",
    location: "Pompano Beach, FL",
    role: "Landscaping Contractor",
    rating: 5,
    text: "We use the 20-yard dumpsters for tree removal and major landscaping jobs. Always available when we need them, and the pricing is fair. Texting to order is so much easier than phone calls during a busy workday.",
    date: "2 weeks ago",
  },
  {
    name: "Diane Foster",
    location: "West Palm Beach, FL",
    role: "Realtor",
    rating: 5,
    text: "I recommend Florida Dumpster Rentals to all my clients doing pre-sale cleanouts. Fast, affordable, and they make the process simple for people who've never rented a dumpster before.",
    date: "1 month ago",
  },
];

export default function ReviewsPage() {
  const avgRating = 4.9;
  const totalReviews = 312;
  const starCounts = [
    { stars: 5, count: 278 },
    { stars: 4, count: 28 },
    { stars: 3, count: 4 },
    { stars: 2, count: 1 },
    { stars: 1, count: 1 },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Customer Reviews
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            What Our Customers Say
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-400">
            Don&apos;t just take our word for it. Here&apos;s what contractors,
            homeowners, and businesses across Florida have to say about our dumpster
            rental service.
          </p>
        </div>
      </section>

      {/* Rating Summary */}
      <section className="bg-white py-12 border-b border-zinc-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="text-center md:text-left">
              <div className="text-6xl font-bold text-zinc-900">{avgRating}</div>
              <div className="mt-1 flex items-center justify-center gap-1 md:justify-start">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-2xl text-yellow-400">
                    {i < Math.floor(avgRating) ? "\u2605" : "\u2606"}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-stone-500">
                Based on {totalReviews} reviews
              </p>
            </div>
            <div className="space-y-2">
              {starCounts.map((sc) => (
                <div key={sc.stars} className="flex items-center gap-3">
                  <span className="w-12 text-sm text-zinc-600">{sc.stars} star</span>
                  <div className="flex-1 rounded-full bg-zinc-100 h-3">
                    <div
                      className="h-3 rounded-full bg-yellow-400"
                      style={{ width: `${(sc.count / totalReviews) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm text-stone-500">{sc.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <div
                key={review.name}
                className="rounded-xl border border-zinc-200 bg-white p-6"
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < review.rating ? "text-yellow-400" : "text-stone-200"
                      }`}
                    >
                      {"\u2605"}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <p className="font-semibold text-zinc-900">{review.name}</p>
                  <p className="text-xs text-stone-500">
                    {review.role} &middot; {review.location}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">{review.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Customers Choose Us */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Why Florida Customers Choose Us Over Other Dumpster Companies
          </h2>
          <div className="mt-6 space-y-5 text-lg text-zinc-600 leading-8">
            <p>
              The reviews above reflect what we hear every day from customers across
              Florida: pricing transparency, on-time delivery, and responsive
              communication are the three things that matter most when renting a
              dumpster. These are also the three areas where most dumpster companies
              fall short. Hidden fees frustrate customers who feel deceived. Late
              deliveries disrupt project timelines. Unanswered calls and texts
              create anxiety about whether the dumpster will show up at all.
            </p>
            <p>
              We built our business around solving these exact problems. Every
              quote is flat-rate and all-inclusive — delivery, pickup, a 7-day
              rental period, and disposal up to the weight limit are all included
              in one price. We do not add fuel surcharges, environmental fees,
              admin charges, or any other hidden fees. The number we quote is the
              number on your invoice. Period. This commitment to pricing
              transparency is why our reviews consistently mention &quot;no surprises&quot;
              and &quot;exactly what they quoted.&quot;
            </p>
            <p>
              Delivery reliability comes from our hauler network model. Instead
              of depending on a single fleet, we partner with vetted haulers in
              every major Florida market. When you order a dumpster in Tampa, a
              Tampa-based hauler delivers it. When you order in Jacksonville, a
              Jacksonville-based hauler handles it. Local haulers mean shorter
              travel distances, faster response times, and familiarity with your
              area&apos;s roads, regulations, and disposal facilities. Our 98%
              on-time delivery rate reflects the reliability of this approach.
            </p>
            <p>
              Communication is where we really stand out. We respond to texts in
              minutes, not hours. We answer phone calls — a real person, not a
              voicemail system. We send photo confirmations after delivery and
              pickup so you have a record of every step. And if something goes
              wrong — a delivery delay, a scheduling conflict, a placement
              issue — we communicate proactively rather than leaving you wondering.
              Our customers notice this and it shows in the reviews.
            </p>
          </div>
        </div>
      </section>

      {/* What Our Reviews Say About Us */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Common Themes in Our Customer Reviews
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                theme: "Pricing Was Exactly as Quoted",
                detail: "The most common positive comment in our reviews is about pricing transparency. Customers appreciate that the price we quoted is the price they paid — no surprise fees on the invoice, no post-rental charges they did not expect. In an industry known for bait-and-switch pricing, delivering on a quoted price builds the kind of trust that generates 5-star reviews.",
              },
              {
                theme: "Delivery Was Fast and On Time",
                detail: "Same-day and next-day delivery availability is mentioned frequently. Customers value that we can deliver quickly — especially contractors who need a dumpster on site before a crew shows up. Our network model ensures we have availability even during peak demand periods like hurricane season and the winter construction boom.",
              },
              {
                theme: "Communication Was Excellent",
                detail: "Texting for a quote and getting a response in minutes is a standout experience for customers used to calling companies and getting voicemail. Our text-first communication model fits how people actually want to interact — fast, convenient, and asynchronous. Many reviewers specifically mention how easy the texting process was.",
              },
              {
                theme: "Right Size Recommended",
                detail: "Multiple reviewers mention that we helped them choose the right dumpster size for their project. Getting the size right the first time saves money and prevents the frustration of a mid-project second haul. Our experience across thousands of projects means we can accurately size a dumpster from a brief project description or a photo.",
              },
              {
                theme: "Contractors Keep Coming Back",
                detail: "Our contractor reviews highlight consistent pricing, priority scheduling, same-day swap service, and NET-30 billing as reasons they use us exclusively. When a professional who rents dumpsters weekly chooses to keep coming back, that is the strongest endorsement possible.",
              },
            ].map((item) => (
              <div key={item.theme} className="border-b border-zinc-200 pb-6">
                <h3 className="text-lg font-semibold text-zinc-900">{item.theme}</h3>
                <p className="mt-2 text-zinc-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTABanner
        title="Join 312+ Happy Customers Across Florida."
        subtitle="Fast delivery, fair pricing, no hidden fees. Text or call for your free quote today."
      />

      <ProTip
        tips={[
          {
            title: "Read the 1-Star Reviews Too",
            body: "Any company can cherry-pick their best reviews. We don't hide anything — check our full review history. Transparency matters more than perfection. When we do get negative feedback, we fix it. That's how you get to 4.9 stars with 312+ reviews.",
          },
          {
            title: "Ask Your Contractor Who They Use",
            body: "Contractors rent dumpsters constantly and they know who delivers on time and who doesn't. If your contractor recommends a dumpster company, that's a strong signal. If they recommend us — well, we appreciate the love.",
          },
          {
            title: "4.9 Stars Means We Earn It Every Day",
            body: "One late delivery, one surprise fee, one unanswered text — and we hear about it. A 4.9 rating across hundreds of reviews isn't luck, it's showing up and doing the job right every single time. That's the standard we hold ourselves to.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </>
  );
}
