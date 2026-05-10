// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";
import { PHONE, SITE_URL, getFAQPageSchema } from "@/app/site/fla-dumpster-rentals/_lib/seo";

export const metadata: Metadata = {
  title:
    "Get a Free Dumpster Rental Quote | Same-Day Pricing | Florida Dumpster Rentals",
  description:
    "Get a free, no-obligation dumpster rental quote in minutes. Flat-rate pricing on 10, 20 & 30 yard roll-off dumpsters across Florida. Text or call 954-710-2332 for instant pricing.",
  openGraph: {
    title:
      "Get a Free Dumpster Rental Quote | Same-Day Pricing | Florida Dumpster Rentals",
    description:
      "Free dumpster rental quotes with flat-rate pricing. 10, 20 & 30 yard roll-off containers delivered across Florida. No hidden fees.",
    url: `${SITE_URL}/free-quote`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/free-quote` },
};

const phonePlain = PHONE.replace(/-/g, "");

const faqs = [
  {
    q: "How fast can I get a dumpster rental quote?",
    a: "Instantly. Text or call us at 954-710-2332 and you will have a flat-rate quote within minutes. Tell us your project type, delivery address, and preferred date — we handle the rest. No callbacks, no waiting for email responses, no online forms that disappear into a void.",
  },
  {
    q: "Is the quote really free with no obligation?",
    a: "Yes. There is zero cost and zero obligation. We give you a complete price including delivery, pickup, a 7-day rental, and disposal. If the price works for you, we schedule delivery. If not, no hard feelings. We never pressure anyone into booking.",
  },
  {
    q: "What information do I need to get a quote?",
    a: "Three things: your project type (renovation, cleanout, construction, landscaping), your delivery address, and your preferred delivery date. From those three details we can recommend the right dumpster size and give you a firm, all-inclusive price. If you are not sure about the size, describe your project or text us a photo and we will recommend the best option.",
  },
  {
    q: "Will the price change after I get my quote?",
    a: "No. The price we quote is the price on your invoice. We do not add fuel surcharges, environmental fees, delivery charges, or admin fees after the fact. The only way your price changes is if you exceed the included weight limit or extend your rental past 7 days — and we communicate those costs upfront before they apply.",
  },
  {
    q: "Can I get a quote for multiple dumpsters or ongoing service?",
    a: "Absolutely. If you need multiple dumpsters on the same job, continuous rotation service, or recurring rentals across several projects, we offer volume pricing with discounts of 15-25%. Contact us and we will build a custom quote for your exact needs, including NET-30 billing for qualified contractors.",
  },
  {
    q: "Do you offer same-day quotes and delivery?",
    a: "Yes. Text or call before noon and we can typically quote you and deliver a dumpster the same day. Next-day delivery is guaranteed for all orders placed by 5 PM. We keep inventory staged across every major Florida region so we can respond fast.",
  },
];

export default function FreeQuotePage() {
  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "Get a Free Dumpster Rental Quote",
              description:
                "Request a free, no-obligation dumpster rental quote for any project in Florida. Flat-rate pricing on 10, 20 & 30 yard roll-off containers.",
              url: `${SITE_URL}/free-quote`,
              provider: {
                "@type": "Organization",
                name: "Florida Dumpster Rentals",
                url: SITE_URL,
                telephone: PHONE,
              },
            },
            getFAQPageSchema(faqs),
          ]),
        }}
      />

      {/* Hero */}
      <section className="bg-stone-950 pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[{ name: "Free Quote", url: "/free-quote" }]}
            dark
          />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              No Obligation, No Hassle
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Get a Free Dumpster Rental Quote
              <br />
              <span className="text-orange-500">In Minutes, Not Days.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              Text or call us with your project details and get a flat-rate price
              that includes everything — delivery, pickup, a 7-day rental
              period, and disposal. No hidden fees, no callbacks, no waiting.
              Just a straight answer and an honest price.
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* How to Get a Quote */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How to Get Your Free Dumpster Rental Quote
          </h2>
          <p className="mt-4 text-lg leading-8 text-stone-300">
            Getting a dumpster rental quote from us takes less time than ordering
            coffee. There are no forms to fill out, no account to create, and no
            sales pitch to sit through. Here is how it works.
          </p>

          <div className="mt-10 space-y-8">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold">Text or Call Us</h3>
                <p className="mt-2 text-stone-300 leading-7">
                  Reach out at{" "}
                  <a
                    href={`tel:${phonePlain}`}
                    className="text-orange-400 hover:underline"
                  >
                    {PHONE}
                  </a>{" "}
                  via text or phone call. Texting is the fastest way — most
                  people get a quote back within 2-3 minutes. You can also{" "}
                  <Link
                    href="/schedule-dumpster-rental-form"
                    className="text-orange-400 hover:underline"
                  >
                    book online
                  </Link>{" "}
                  through our scheduling form if you prefer.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  Tell Us About Your Project
                </h3>
                <p className="mt-2 text-stone-300 leading-7">
                  Share three simple details: what type of project you are
                  working on (renovation, cleanout, construction, landscaping,
                  roofing), your delivery address, and when you need the
                  dumpster. If you are unsure about the size, describe what you
                  are removing or send us a photo. We have sized thousands of
                  orders from a single text message.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  Get Your All-Inclusive Price
                </h3>
                <p className="mt-2 text-stone-300 leading-7">
                  We reply with a recommended dumpster size and a flat-rate price
                  that covers everything: delivery, a 7-day rental period,
                  pickup, and disposal up to the included weight limit. No fuel
                  surcharges, no environmental fees, no admin charges. The quoted
                  price is the invoiced price.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Pricing by Project */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Sample Pricing by Project Type
          </h2>
          <p className="mt-4 text-lg leading-8 text-stone-300">
            Every project is different, but these estimates give you a realistic
            idea of what to expect when you request a quote. All prices include
            delivery, pickup, disposal, and a 7-day rental. For exact pricing
            based on your location and project,{" "}
            <a
              href={`sms:${phonePlain}`}
              className="text-orange-400 hover:underline"
            >
              text us now
            </a>
            .
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="pb-3 pr-6 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    Project Type
                  </th>
                  <th className="pb-3 pr-6 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    Recommended Size
                  </th>
                  <th className="pb-3 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    Starting Price
                  </th>
                </tr>
              </thead>
              <tbody className="text-stone-300">
                {[
                  ["Garage / Attic Cleanout", "10 Yard", "$275"],
                  ["Single Room Renovation", "10 Yard", "$275"],
                  ["Kitchen or Bathroom Remodel", "20 Yard", "$350"],
                  ["Whole-House Cleanout", "20 Yard", "$350"],
                  ["Roof Tear-Off (Single Layer)", "20 Yard", "$350"],
                  ["Landscaping / Yard Debris", "20 Yard", "$350"],
                  ["Estate Cleanout", "30 Yard", "$450"],
                  ["New Construction Debris", "30 Yard", "$450"],
                  ["Demolition Project", "30 Yard", "$450"],
                  ["Commercial Build-Out", "30 Yard", "$450"],
                ].map(([project, size, price]) => (
                  <tr key={project} className="border-b border-stone-800">
                    <td className="py-3 pr-6">{project}</td>
                    <td className="py-3 pr-6">{size}</td>
                    <td className="py-3 font-semibold text-orange-400">
                      {price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-sm text-stone-500">
            Prices vary by location and debris type. Contact us for an exact
            quote tailored to your specific project and delivery address.
          </p>

          <div className="mt-6">
            <Link
              href="/pricing"
              className="text-orange-400 hover:underline font-semibold"
            >
              View full pricing details &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Why Flat-Rate Matters */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Flat-Rate Pricing Matters
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              Most dumpster rental companies advertise a low base price and then
              pile on extra charges: fuel surcharges, environmental fees,
              delivery fees, admin fees, and disposal costs that are not
              disclosed until after you have committed. By the time you get your
              final invoice, the actual cost is 30-50% higher than the
              advertised price. That is not how we operate.
            </p>
            <p>
              When we give you a quote, that number includes every cost
              associated with your rental. Delivery of the dumpster to your
              location. A full 7-day rental period. Pickup of the loaded
              container. Disposal at a licensed facility up to your included
              weight limit. There is nothing hidden, nothing buried in fine
              print, and nothing that shows up on your invoice as a surprise.
            </p>
            <p>
              Our flat-rate model makes budgeting simple. Whether you are a
              homeowner planning a weekend cleanout or a contractor bidding a
              renovation, you know exactly what the dumpster costs before you
              commit. No estimates, no ranges, no &ldquo;starting at&rdquo;
              gimmicks. One price, all-inclusive, every time.
            </p>
            <p>
              This approach also eliminates the most common complaint in the
              dumpster rental industry: surprise fees. We have heard from
              hundreds of customers who switched to us after getting blindsided
              by hidden charges from other companies. One customer reported
              paying $200 more than the quoted price from a competitor because of
              a &ldquo;fuel surcharge&rdquo; and an &ldquo;environmental
              recovery fee&rdquo; that were never mentioned during booking. That
              does not happen with us. Your quote is your price.
            </p>
          </div>
        </div>
      </section>

      {/* What We Need From You */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Information Do We Need for Your Quote?
          </h2>
          <p className="mt-4 text-lg text-stone-300">
            We keep it simple. Here is everything we need to give you an
            accurate, all-inclusive price:
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Project Type",
                desc: "What are you working on? Renovation, cleanout, roofing, construction, landscaping, demolition, or something else. This helps us recommend the right dumpster size and accounts for the type of debris going into the container.",
              },
              {
                title: "Delivery Address",
                desc: "Where should the dumpster be dropped off? Your address determines which hauler services your area and the exact pricing for your location. We serve all of Florida — from Miami to Jacksonville, Tampa to the Panhandle.",
              },
              {
                title: "Preferred Delivery Date",
                desc: "When do you need it? Same-day delivery is available for orders placed before noon. Next-day delivery is guaranteed for all orders by 5 PM. If your timeline is flexible, we can often offer the best availability within a day or two.",
              },
              {
                title: "Debris Description (Optional)",
                desc: "What are you throwing away? Describing the materials — or better yet, texting us a photo — helps us nail the right size and avoid weight limit surprises. Heavy materials like concrete, tile, and roofing shingles require special consideration.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-stone-800 bg-stone-800/50 p-6"
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

          <p className="mt-8 text-stone-300 leading-7">
            That is it. No credit card required to get a quote. No deposit to
            hold your date. No account to create. Just those basic details and
            we will have a price for you in minutes. If you are not sure about
            any of these details — especially the size — just tell us what you
            are working on and we will figure out the rest. We have quoted tens
            of thousands of dumpster rentals. We know what you need before you
            do.
          </p>
        </div>
      </section>

      {/* Mid CTA */}
      <CTABanner
        title="Get Your Free Quote Right Now"
        subtitle="Text us your project details and get an all-inclusive price in minutes. Same-day delivery available across Florida."
      />

      {/* Dumpster Sizes Quick Reference */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Dumpster Sizes at a Glance
          </h2>
          <p className="mt-4 text-lg text-stone-300">
            Not sure which size to request a quote for? Here is a quick
            breakdown of our three container options. Every size includes
            delivery, pickup, and a 7-day rental period.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                size: "10 Yard",
                price: "From $275",
                capacity: "~4 pickup truck loads",
                weight: "2-ton limit (4,000 lbs)",
                best: "Garage cleanouts, small renovations, decluttering",
                dims: '12\' L x 8\' W x 3.5\' H',
              },
              {
                size: "20 Yard",
                price: "From $350",
                capacity: "~8 pickup truck loads",
                weight: "3-ton limit (6,000 lbs)",
                best: "Kitchen/bath remodels, roofing, large cleanouts",
                dims: '22\' L x 8\' W x 4.5\' H',
              },
              {
                size: "30 Yard",
                price: "From $450",
                capacity: "~12 pickup truck loads",
                weight: "4-ton limit (8,000 lbs)",
                best: "Construction, demolition, estate cleanouts",
                dims: '22\' L x 8\' W x 6\' H',
              },
            ].map((d) => (
              <div
                key={d.size}
                className="rounded-xl border border-stone-700 bg-stone-800/50 p-6"
              >
                <h3 className="text-2xl font-bold text-orange-400">{d.size}</h3>
                <p className="mt-1 text-2xl font-extrabold">{d.price}</p>
                <ul className="mt-4 space-y-2 text-sm text-stone-300">
                  <li>
                    <span className="text-orange-400">&#10003;</span> {d.capacity}
                  </li>
                  <li>
                    <span className="text-orange-400">&#10003;</span> {d.weight}
                  </li>
                  <li>
                    <span className="text-orange-400">&#10003;</span> {d.dims}
                  </li>
                  <li>
                    <span className="text-orange-400">&#10003;</span> {d.best}
                  </li>
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-4">
            <Link
              href="/dumpster-sizes"
              className="text-orange-400 hover:underline font-semibold"
            >
              Full size guide &rarr;
            </Link>
            <Link
              href="/pricing"
              className="text-orange-400 hover:underline font-semibold"
            >
              Detailed pricing &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Who Requests Quotes */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Who Requests Dumpster Rental Quotes?
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              We get quote requests from every type of customer across Florida.
              Homeowners tackling a weekend garage cleanout. Contractors running
              six renovation jobs simultaneously. Property managers clearing out
              units between tenants. Real estate agents prepping houses for
              listing. Roofers, landscapers, demolition crews, and businesses of
              all sizes.
            </p>
            <p>
              The common thread is that everyone wants the same thing: a straight
              price with no games. Homeowners want to know exactly what a
              dumpster costs before they commit to a project. Contractors want
              reliable pricing they can build into their bids. Property managers
              want predictable costs they can plan around. We deliver that for
              every customer, on every quote, for every project.
            </p>
            <p>
              If you have a project that generates debris — any project, any
              size, anywhere in Florida — we can quote it. From a single
              10-yard dumpster for a small cleanout to multiple 30-yard
              containers for a commercial demolition, our quoting process is the
              same: fast, transparent, and all-inclusive.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Homeowners & DIYers",
              "General Contractors",
              "Roofers & Siding Contractors",
              "Property Managers",
              "Real Estate Agents",
              "Landscapers",
              "Demolition Companies",
              "Commercial Businesses",
            ].map((type) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-orange-400">&#10003;</span>
                <span className="text-stone-300">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Dumpster Rental Quote FAQ
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
          <h2 className="text-2xl font-bold">Related Resources</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { href: "/pricing", label: "Dumpster Rental Pricing" },
              { href: "/dumpster-sizes", label: "Dumpster Size Guide" },
              {
                href: "/schedule-dumpster-rental-form",
                label: "Schedule a Dumpster Online",
              },
              { href: "/services", label: "All Dumpster Services" },
              { href: "/how-it-works", label: "How Dumpster Rental Works" },
              { href: "/areas", label: "Florida Service Areas" },
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
            title: "Text Us a Photo for the Most Accurate Quote",
            body: "Snap a picture of the space you're cleaning out or the materials you're removing and text it to us. We can recommend the right dumpster size from a photo faster than a 10-minute phone call. A picture really is worth a thousand cubic yards.",
          },
          {
            title: "Book Before You Need It",
            body: "If you know a project is coming up, get your quote and lock in your delivery date early. This is especially important during hurricane season (June-November) when demand spikes 300-500% after storms. Early booking guarantees availability.",
          },
          {
            title: "Size Up, Not Down",
            body: "If you're torn between two sizes, go with the bigger one. The price difference between a 20-yard and 30-yard is about $100 — but running out of space and needing a second dumpster costs a full additional rental. Bigger is almost always the smarter play.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
