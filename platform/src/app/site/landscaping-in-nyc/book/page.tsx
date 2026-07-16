import type { Metadata } from "next";
import { SITE_NAME, SITE_DOMAIN, PHONE } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { BookingForm } from "@/app/site/landscaping-in-nyc/_components/BookingForm";

export const metadata: Metadata = {
  title: `Book a Free Landscaping Consultation | ${SITE_NAME}`,
  description: "Book a free on-site landscaping consultation in NYC. Tell us about your project and pick a time — our designer walks the property and scopes the work.",
  alternates: { canonical: `https://${SITE_DOMAIN}/book` },
};

export default function BookPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-green-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-300 font-cta">Free On-Site Consultation</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Book Your Free Landscaping Consultation
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Pick a time and we&apos;ll send a designer to walk your property. Prefer to talk first? Call{" "}
            <a href={`tel:${PHONE.replace(/\D/g, "")}`} className="text-green-300 hover:underline">{PHONE}</a>.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">How It Works</h2>
              <div className="mt-6 space-y-6">
                {[
                  { step: "1", title: "Tell Us About Your Project", desc: "Property size, what you want done, and photos if you have them." },
                  { step: "2", title: "Pick a Visit Time", desc: "We confirm within 1 business day and send a designer to walk the property." },
                  { step: "3", title: "Get a Written Estimate", desc: "3+ options with scope, materials, timeline, and pricing — no pressure." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-700 text-base font-bold text-white">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <BookingForm />
          </div>
        </div>
      </section>
    </>
  );
}
