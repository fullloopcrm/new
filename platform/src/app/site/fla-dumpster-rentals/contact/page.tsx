import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, SITE_URL, EMAIL, ADDRESS } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import GeneralContactForm from "@/app/site/fla-dumpster-rentals/_components/GeneralContactForm";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

const phonePlain = PHONE.replace(/-/g, "");

export const metadata: Metadata = {
  title: `Contact Us | ${PHONE} | Florida Dumpster Rentals`,
  description: `Get in touch with Florida Dumpster Rentals. Call ${PHONE}, text us, or email ${EMAIL}. Fort Lauderdale office serving all of Florida with same-day dumpster delivery.`,
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-orange-600 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Let&apos;s Get Your{" "}
            <span className="text-orange-100">Dumpster Scheduled</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-orange-50">
            Whether you&apos;re ready to schedule a dumpster rental or just have
            a question about how we work — we&apos;re here. No pressure. No
            hidden fees.
          </p>
        </div>
      </section>

      {/* Two Option Cards */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Schedule a Dumpster */}
            <div className="rounded-xl border border-stone-800 bg-stone-900 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6 text-orange-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                  />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-bold text-white">
                Schedule a Dumpster
              </h2>
              <p className="mt-2 text-sm text-stone-400">
                Ready to rent a dumpster? Tell us your{" "}
                <span className="font-medium text-stone-300">
                  project details
                </span>{" "}
                and{" "}
                <span className="font-medium text-stone-300">
                  delivery location
                </span>
                . We&apos;ll get you a flat-rate quote within the hour.
              </p>
              <Link
                href="/schedule-dumpster-rental-form"
                className="mt-5 inline-flex items-center text-sm font-semibold text-orange-400 hover:text-orange-300"
              >
                Schedule your rental &rarr;
              </Link>
            </div>

            {/* General Inquiry */}
            <div className="rounded-xl border border-stone-800 bg-stone-900 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6 text-orange-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-bold text-white">
                General Inquiry
              </h2>
              <p className="mt-2 text-sm text-stone-400">
                Have a question about our{" "}
                <span className="font-medium text-stone-300">
                  dumpster rental services
                </span>
                , our{" "}
                <span className="font-medium text-stone-300">
                  service areas
                </span>
                , or just curious about something? Send us a message.
              </p>
              <a
                href="#contact-form"
                className="mt-5 inline-flex items-center text-sm font-semibold text-orange-400 hover:text-orange-300"
              >
                Send a message &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form + Sidebar */}
      <section id="contact-form" className="bg-stone-900 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-5">
            {/* Form */}
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-bold text-white">
                Send Us a Message
              </h2>
              <p className="mt-2 text-stone-400">
                Have a question about our dumpster rental services, want to learn
                more about how we work, or just want to say hello? Drop us a
                line and we&apos;ll get back to you.
              </p>
              <div className="mt-8 rounded-xl border border-stone-700 bg-stone-800 p-6 sm:p-8">
                <GeneralContactForm />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 lg:col-span-2">
              {/* Prefer to Talk */}
              <div className="rounded-xl border border-stone-800 bg-stone-800 p-6">
                <h3 className="text-lg font-bold text-white">
                  Prefer to Talk?
                </h3>
                <p className="mt-2 text-sm text-stone-400">
                  Call or text us directly — no sales pitch, just a straight
                  answer about your dumpster rental.
                </p>
                <a
                  href={`tel:${phonePlain}`}
                  className="mt-3 block text-xl font-bold text-orange-400 hover:text-orange-300"
                >
                  {PHONE}
                </a>
              </div>

              {/* What Happens Next */}
              <div className="rounded-xl border border-stone-800 bg-stone-800 p-6">
                <h3 className="text-lg font-bold text-white">
                  What Happens Next?
                </h3>
                <ol className="mt-4 space-y-3">
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-600/20 text-xs font-bold text-orange-400">
                      1
                    </span>
                    <span className="text-sm text-stone-300">
                      We review your message and get back to you within the hour
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-600/20 text-xs font-bold text-orange-400">
                      2
                    </span>
                    <span className="text-sm text-stone-300">
                      We give you a flat-rate quote with no hidden fees or
                      surprises
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-600/20 text-xs font-bold text-orange-400">
                      3
                    </span>
                    <span className="text-sm text-stone-300">
                      Say the word and we deliver your dumpster — often same-day
                    </span>
                  </li>
                </ol>
              </div>

              {/* Office */}
              <div className="rounded-xl border border-stone-800 bg-stone-800 p-6">
                <h3 className="text-lg font-bold text-white">Our Office</h3>
                <p className="mt-2 text-sm text-stone-300">{ADDRESS}</p>
                <p className="mt-1 text-sm text-stone-400">
                  Serving all of Florida from Fort Lauderdale.
                </p>
                <a
                  href={`mailto:${EMAIL}`}
                  className="mt-3 block text-sm font-medium text-orange-400 hover:text-orange-300"
                >
                  {EMAIL}
                </a>
              </div>
            </div>
          </div>

          {/* Bottom link */}
          <div className="mt-10 text-center">
            <p className="text-sm text-stone-500">
              Or call us at{" "}
              <a
                href={`tel:${phonePlain}`}
                className="font-medium text-orange-400 hover:text-orange-300"
              >
                {PHONE}
              </a>
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Looking to{" "}
              <Link
                href="/schedule-dumpster-rental-form"
                className="font-medium text-orange-400 hover:text-orange-300"
              >
                schedule a dumpster rental
              </Link>
              ?{" "}
              <Link
                href="/schedule-dumpster-rental-form"
                className="text-orange-400 hover:text-orange-300"
              >
                Start here instead &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Text Beats Email Every Time",
            body: "Want the fastest way to get a quote? Text us. We respond in minutes — not hours, not \"1-2 business days.\" Just send your project details and zip code to our number and we'll have a price back to you before you finish your coffee.",
          },
          {
            title: "Include Your Zip Code",
            body: "Dumpster pricing varies by location in Florida because landfill tipping fees differ by county. Including your zip code in your first message lets us give you an accurate, all-inclusive quote right away — no back-and-forth needed.",
          },
          {
            title: "Photos Help Us Help You",
            body: "Not sure what size dumpster you need? Snap a photo of your project — the pile of demo debris, the garage full of stuff, the roof that's coming off — and text it to us. We can usually recommend the right size in under a minute from a picture.",
          },
        ]}
      />
    </>
  );
}
