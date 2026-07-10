import type { Metadata } from "next";
import ContactForm from "@/app/site/nyc-mobile-salon/_components/ContactForm";
import { breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Contact The NYC Mobile Salon",
  description:
    "Get in touch with The NYC Mobile Salon. Questions about services, bookings, events, or partnerships — we'll get back to you within 24 hours.",
  alternates: { canonical: "https://thenycmobilesalon.com/contact" },
  openGraph: {
    title: "Contact The NYC Mobile Salon",
    description:
      "Get in touch with The NYC Mobile Salon. Questions about services, bookings, events, or partnerships — we'll get back to you within 24 hours.",
    url: "https://thenycmobilesalon.com/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Contact", url: "/contact" },
            ])
          ),
        }}
      />
      <section className="px-4 py-20">
        <div className="mx-auto max-w-lg">
          <div className="mb-10 text-center">
            <h1 className="mb-4 font-display text-4xl font-black tracking-tight md:text-5xl">
              Get in <span className="text-gradient-rose">Touch</span>
            </h1>
            <p className="text-slate-500">
              Questions, custom requests, or partnerships — we&apos;ll hit you back within 24 hours.
            </p>
          </div>

          <ContactForm id="contact-form" />

          {/* Alternative CTAs */}
          <div className="mt-8 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Or reach out directly</p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="sms:+12122029075"
                className="flex items-center gap-2 rounded-full border border-blush bg-white px-6 py-3 text-sm font-bold text-blush-dark transition hover:-translate-y-0.5 hover:bg-blush-light"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Text Us
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-400">Text us anytime: 212.202.9075</p>
          </div>
        </div>
      </section>
    </>
  );
}
