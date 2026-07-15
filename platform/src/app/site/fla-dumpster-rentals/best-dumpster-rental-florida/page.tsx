import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";
import { PHONE, SITE_URL, getFAQPageSchema } from "@/app/site/fla-dumpster-rentals/_lib/seo";

export const metadata: Metadata = {
  title:
    "Best Dumpster Rental Service in Florida | 4.9★ Rating | Florida Dumpster Rentals",
  description:
    "Rated 4.9 stars from 1,247+ reviews. Florida's top-rated dumpster rental service with flat-rate pricing, same-day delivery & statewide coverage. Call 954-710-2332.",
  openGraph: {
    title:
      "Best Dumpster Rental Service in Florida | 4.9★ Rating | Florida Dumpster Rentals",
    description:
      "Florida's highest-rated dumpster rental company. 4.9-star rating, 1,247+ reviews, flat-rate pricing, and same-day delivery statewide.",
    url: `${SITE_URL}/best-dumpster-rental-florida`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/best-dumpster-rental-florida` },
};

const phonePlain = PHONE.replace(/-/g, "");

const faqs = [
  {
    q: "What makes Florida Dumpster Rentals the best in the state?",
    a: "Three things that matter most to customers: transparent flat-rate pricing with no hidden fees, fast delivery (same-day available), and responsive customer service where a real person answers your call or text within minutes. Our 4.9-star rating across 1,247+ reviews reflects consistently excellent service on every rental.",
  },
  {
    q: "How does your pricing compare to other Florida dumpster companies?",
    a: "Our total cost is competitive with or lower than most Florida dumpster companies — and more importantly, our pricing is genuinely all-inclusive. Many competitors advertise low base prices then add fuel surcharges, environmental fees, and delivery charges. When you compare total cost (not just the advertised price), we are consistently among the most affordable in every market we serve.",
  },
  {
    q: "Do you serve all of Florida?",
    a: "Yes. We serve every city, county, and community in Florida — from Miami to Jacksonville, Tampa to Pensacola, the Keys to the Panhandle, and everywhere in between. Our hauler network covers every zip code in the state with same-day delivery available in most metro and suburban areas.",
  },
  {
    q: "What sizes of dumpsters do you offer?",
    a: "We offer 10-yard, 20-yard, and 30-yard roll-off dumpsters. The 10-yard starts at $275 and holds about 4 pickup truck loads. The 20-yard starts at $350 and holds about 8 truck loads — it's our most popular size. The 30-yard starts at $450 and holds about 12 truck loads. All sizes include delivery, pickup, a 7-day rental, and disposal.",
  },
  {
    q: "Do you have a satisfaction guarantee?",
    a: "Yes. We stand behind every rental. If there is a problem with your delivery — wrong size, wrong location, late arrival, or any other issue — we resolve it the same day at no additional cost to you. Our 4.9-star rating is not an accident. It reflects thousands of rentals where we delivered exactly what we promised, on time and at the quoted price.",
  },
  {
    q: "How do I leave a review after my rental?",
    a: "After your dumpster is picked up, we send a follow-up message with a link to leave a review. We appreciate honest feedback — it helps future customers make informed decisions and helps us identify any areas where we can improve. Over 95% of our reviews are 5 stars, and we take the few that are not as seriously as the rest.",
  },
];

const testimonials = [
  {
    quote:
      "Ordered a 20-yard dumpster for a kitchen renovation. Delivered the next morning exactly where I asked. Filled it over the weekend and they picked it up Monday. Price was exactly what they quoted — no surprises. This is how every service company should operate.",
    name: "Michael R.",
    location: "Fort Lauderdale, FL",
    project: "Kitchen Renovation",
  },
  {
    quote:
      "We use Florida Dumpster Rentals for all of our roofing jobs across South Florida. They handle 15-20 dumpsters a month for us with volume pricing and NET-30 billing. Never missed a delivery, never a surprise on the invoice. Our dedicated account manager knows our jobs before we even call.",
    name: "Rodriguez Roofing",
    location: "Miami, FL",
    project: "Commercial Roofing Contractor",
  },
  {
    quote:
      "After Hurricane Ian we needed three dumpsters for debris cleanup. Most companies had 2-week wait times. Florida Dumpster Rentals had all three delivered within 48 hours. Same flat-rate pricing — no storm surge pricing. That earned our loyalty for life.",
    name: "Sarah T.",
    location: "Cape Coral, FL",
    project: "Storm Damage Cleanup",
  },
  {
    quote:
      "I called four companies for quotes on a 30-yard dumpster. Three of them quoted a base price and then added fees when I asked about the total. Florida Dumpster Rentals gave me one number that included everything. They were the second-lowest base price but the lowest total cost by far.",
    name: "David K.",
    location: "Tampa, FL",
    project: "Home Demolition",
  },
  {
    quote:
      "Managing 200+ rental units means I need dumpsters regularly for tenant turnovers and unit renovations. The NET-30 billing and consolidated invoicing saves my office manager hours of bookkeeping every month. And the response time is unmatched — I text them and have a dumpster scheduled within minutes.",
    name: "Coastal Property Management",
    location: "Jacksonville, FL",
    project: "Property Management",
  },
  {
    quote:
      "Cleaned out my late father's house — 40 years of accumulation. I was overwhelmed. They recommended a 30-yard dumpster and told me to take my time with the 7-day rental. Filled it completely. Price was exactly what they quoted. No judgment, no hassle, just a dumpster and some peace of mind.",
    name: "Jennifer M.",
    location: "Orlando, FL",
    project: "Estate Cleanout",
  },
];

export default function BestDumpsterRentalFloridaPage() {
  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "Florida Dumpster Rentals",
              description:
                "Florida's top-rated dumpster rental service with flat-rate pricing, same-day delivery, and statewide coverage.",
              url: `${SITE_URL}/best-dumpster-rental-florida`,
              telephone: PHONE,
              address: {
                "@type": "PostalAddress",
                streetAddress: "500 E Broward Blvd",
                addressLocality: "Fort Lauderdale",
                addressRegion: "FL",
                postalCode: "33394",
                addressCountry: "US",
              },
              areaServed: {
                "@type": "State",
                name: "Florida",
              },
              priceRange: "$275 - $750",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "1247",
                bestRating: "5",
              },
            },
            getFAQPageSchema(faqs),
          ]).replace(/</g, '\\u003c'),
        }}
      />

      {/* Hero */}
      <section className="bg-stone-950 pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              {
                name: "Best Dumpster Rental Florida",
                url: "/best-dumpster-rental-florida",
              },
            ]}
            dark
          />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              4.9 Stars From 1,247+ Reviews
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Florida&apos;s Best-Rated
              <br />
              <span className="text-orange-500">Dumpster Rental Service</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              Transparent pricing. Same-day delivery. A real person who answers
              when you call. These are the basics that most dumpster companies
              get wrong — and the standards that have earned us a 4.9-star
              rating from over 1,247 customers across every corner of Florida.
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* What Makes a Great Dumpster Company */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Makes a Great Dumpster Rental Company
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              Choosing a dumpster rental company is not like choosing a
              restaurant — you cannot browse photos of the food and read
              detailed descriptions of the experience. You are trusting a
              company to deliver a heavy piece of equipment to your property,
              leave it for a week, and come back to haul it away full of your
              debris. A lot can go wrong.
            </p>
            <p>
              After tens of thousands of dumpster rentals across Florida, we
              have learned what matters most to customers. It is not the flashy
              website or the slick marketing. It comes down to five things:
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {[
              {
                title: "Transparent Pricing With No Hidden Fees",
                desc: "The number one complaint in the dumpster rental industry is hidden fees. Companies advertise a low price, then add fuel surcharges, environmental fees, delivery charges, and disposal costs after you have committed. The best companies — the ones with high ratings and repeat customers — quote one all-inclusive price and honor it. No surprises, no games, no fine print.",
              },
              {
                title: "Fast, Reliable Delivery",
                desc: "When you need a dumpster, you usually need it soon. The best companies offer same-day delivery and consistently hit their delivery windows. A dumpster that arrives two hours late wastes your time and can derail your project schedule. Reliability is not a bonus — it is a baseline expectation.",
              },
              {
                title: "Responsive Customer Service",
                desc: "Can you reach a real person when you call? How fast do they respond to a text? Do they answer your questions directly or give you the runaround? The best dumpster companies are immediately responsive and staffed by people who actually know the product — not a call center reading from a script.",
              },
              {
                title: "Genuine Customer Reviews",
                desc: "Reviews do not lie — at least not in aggregate. A company with hundreds of reviews averaging 4.5 stars or higher is consistently delivering good service. Look for reviews that mention specific details: on-time delivery, accurate pricing, good communication. Generic five-star reviews with no detail are less reliable than detailed reviews that describe the experience.",
              },
              {
                title: "Statewide Coverage With Local Knowledge",
                desc: "The best Florida dumpster companies serve the entire state while maintaining local expertise. They know permit requirements in your city, landfill regulations in your county, and which haulers provide the best service in your area. Broad coverage without local knowledge leads to logistical problems.",
              },
            ].map((item) => (
              <div key={item.title} className="border-b border-stone-600 pb-6">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-stone-300 leading-7">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Differentiators */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Customers Rate Us #1 in Florida
          </h2>
          <p className="mt-4 text-lg text-stone-300">
            Our 4.9-star rating is not an accident. It reflects tens of
            thousands of rentals where we delivered exactly what we promised.
            Here is what sets us apart.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                stat: "4.9",
                label: "Average Star Rating",
                desc: "Across 1,247+ verified customer reviews",
              },
              {
                stat: "95%+",
                label: "5-Star Reviews",
                desc: "The vast majority of our customers rate us the maximum",
              },
              {
                stat: "< 3 min",
                label: "Average Response Time",
                desc: "Text or call — we respond in minutes, not hours",
              },
              {
                stat: "$0",
                label: "Hidden Fees Charged",
                desc: "Your quoted price is your invoiced price. Always.",
              },
              {
                stat: "Same Day",
                label: "Delivery Available",
                desc: "Order before noon, get your dumpster the same day",
              },
              {
                stat: "100%",
                label: "Florida Coverage",
                desc: "Every city, county, and zip code in the state",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-stone-700 bg-stone-800/50 p-6 text-center"
              >
                <p className="text-3xl font-extrabold text-orange-400">
                  {item.stat}
                </p>
                <p className="mt-1 text-sm font-bold uppercase tracking-wider">
                  {item.label}
                </p>
                <p className="mt-2 text-sm text-stone-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Our Customers Say
          </h2>
          <p className="mt-4 text-lg text-stone-300">
            Real reviews from real customers across Florida. These are the
            experiences that built our 4.9-star reputation.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-stone-600 bg-stone-800/30 p-6"
              >
                <div className="flex gap-1 text-orange-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s}>&#9733;</span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-stone-300">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 border-t border-stone-700 pt-3">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-stone-500">
                    {t.location} &mdash; {t.project}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/reviews"
              className="text-orange-400 hover:underline font-semibold"
            >
              Read all customer reviews &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTABanner
        title="Experience the Difference Yourself"
        subtitle="Join 1,247+ satisfied customers. Text or call for an instant, all-inclusive quote — and see why we're Florida's top-rated dumpster service."
      />

      {/* Service Guarantees */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our Service Guarantees
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              Every dumpster rental comes with these guarantees — not as
              marketing promises, but as operational standards that we hold
              ourselves to on every single order.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {[
              {
                title: "Price Guarantee",
                desc: "The price we quote is the price on your invoice. No fuel surcharges, no environmental fees, no admin charges, no delivery fees. If your invoice ever shows a charge that was not in your original quote, we remove it immediately. This has happened exactly zero times because we do not add hidden charges.",
              },
              {
                title: "Delivery Window Guarantee",
                desc: "We commit to a delivery window and we hit it. If we are running behind for any reason, we communicate proactively — you will know before the window closes, not after. If our delay impacts your project, we make it right.",
              },
              {
                title: "Responsive Communication Guarantee",
                desc: "When you text or call, you get a response from a real person within minutes. Not a chatbot, not an auto-reply, not a voicemail with a callback promise. A real person who can answer your question, schedule your delivery, or resolve your issue right now.",
              },
              {
                title: "Satisfaction Resolution Guarantee",
                desc: "If something goes wrong — wrong size delivered, dumpster placed in the wrong spot, scheduling mix-up — we resolve it the same day at no additional cost. We own the problem, fix it immediately, and follow up to make sure you are satisfied with the resolution.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-stone-700 bg-stone-800/50 p-6"
              >
                <h3 className="text-lg font-bold text-orange-400">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-300">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statewide Coverage */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Serving Every Corner of Florida
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              We are not a single-market dumpster company that serves one city
              and hopes you do not need a container outside our zone. We serve
              the entire state of Florida — every city, every county, every zip
              code. Our hauler network spans from Key West to Pensacola and
              every community in between.
            </p>
            <p>
              This statewide coverage means you get consistent service and
              consistent pricing regardless of where your project is located.
              Whether you are a homeowner in Jacksonville, a contractor working
              in Orlando, or a property manager with units across South
              Florida, you get the same flat-rate pricing, the same fast
              delivery, and the same responsive service.
            </p>
            <p>
              For contractors and businesses with projects across multiple
              Florida markets, our statewide coverage is particularly valuable.
              One account, one set of rates, one invoice — regardless of how
              many different cities or counties your projects are in. No need
              to manage relationships with a different dumpster company in every
              market.
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/areas"
              className="text-orange-400 hover:underline font-semibold"
            >
              View all Florida service areas &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-stone-800 pb-6">
                <h3 className="text-lg font-semibold">{faq.q}</h3>
                <p className="mt-2 text-stone-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Explore Our Services</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { href: "/reviews", label: "Customer Reviews" },
              { href: "/areas", label: "Florida Service Areas" },
              { href: "/services", label: "All Dumpster Services" },
              { href: "/free-quote", label: "Get a Free Quote" },
              { href: "/pricing", label: "Dumpster Rental Pricing" },
              { href: "/how-it-works", label: "How It Works" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-stone-700 px-4 py-3 text-orange-400 hover:border-orange-600 hover:bg-orange-600/10 font-semibold"
              >
                {link.label} &rarr;
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Read Reviews With Specifics",
            body: "When comparing dumpster companies, look for reviews that mention specific details: was the delivery on time, was the price accurate, did they communicate well? Vague 5-star reviews are less useful than detailed ones that describe the actual experience.",
          },
          {
            title: "Ask for the Total Out-the-Door Price",
            body: "The single best question to ask any dumpster company: 'What is my total cost including delivery, pickup, rental, and disposal?' Any company that can't or won't give you one all-inclusive number is hiding fees. We always give you the total upfront.",
          },
          {
            title: "Check Statewide Availability",
            body: "If you're a contractor or property manager working across multiple Florida markets, choose a company with genuine statewide coverage. Managing one dumpster provider is infinitely easier than juggling different companies in different cities.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
