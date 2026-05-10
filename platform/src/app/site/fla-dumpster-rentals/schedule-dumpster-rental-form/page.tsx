// @ts-nocheck
import type { Metadata } from "next";
import { PHONE, SITE_URL, EMAIL, ADDRESS } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import ContactForm from "@/app/site/fla-dumpster-rentals/_components/ContactForm";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

const phonePlain = PHONE.replace(/-/g, "");

export const metadata: Metadata = {
  title: `Schedule a Dumpster Rental | ${PHONE} | Florida Dumpster Rentals`,
  description: `Schedule your dumpster rental online in 30 seconds. Call ${PHONE} for same-day delivery across Florida. 10, 20 & 30 yard roll-off dumpsters. No hidden fees. Flat-rate pricing.`,
  alternates: { canonical: `${SITE_URL}/schedule-dumpster-rental-form` },
};

export default function ScheduleDumpsterRentalPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Schedule Your Rental
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Schedule a Dumpster Rental
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-300">
            Fill out the form below and we&apos;ll have your quote ready within
            the hour. Most dumpsters delivered same-day or next-day anywhere in
            Florida. No commitment required.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href={`sms:${phonePlain}`}
              className="inline-flex items-center rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Prefer to text? Send us a message
            </a>
            <a
              href={`tel:${phonePlain}`}
              className="inline-flex items-center rounded-lg border border-stone-700 px-5 py-2.5 text-sm font-semibold text-white hover:border-zinc-500"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-2xl font-bold text-zinc-900">
              Request a Free Quote
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              Tell us about your project and we&apos;ll get back to you with
              flat-rate pricing. No surprises, no hidden fees.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>

          {/* Trust signals */}
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">Same-Day Delivery</h3>
              <p className="mt-1 text-xs text-stone-500">Order by noon, delivered today across most of Florida.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">No Hidden Fees</h3>
              <p className="mt-1 text-xs text-stone-500">Flat-rate pricing. The quote you get is the price you pay.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">4.9 Star Rating</h3>
              <p className="mt-1 text-xs text-stone-500">1,247+ reviews. Florida&apos;s top-rated dumpster rental service.</p>
            </div>
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Morning Deliveries Fill Up Fast",
            body: "If you need your dumpster first thing in the morning, book early. AM delivery slots are the most popular and fill up quickest — especially during busy season. Afternoon delivery is almost always available same-day if you order by noon.",
          },
          {
            title: "Weekend Rentals Are a Thing",
            body: "Need a dumpster for a weekend DIY project? We do Friday delivery, Monday pickup all the time. It's perfect for garage cleanouts, small demo projects, and yard work. You get the whole weekend to fill it at your own pace.",
          },
          {
            title: "Don't Stress the Details",
            body: "Not sure what size you need? Not sure about the exact delivery date? Don't let that stop you from reaching out. Fill out what you know and we'll figure out the rest together. That's literally our job, and we're good at it.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </>
  );
}
