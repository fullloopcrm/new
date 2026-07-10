import type { Metadata } from "next";
import LeadForm from "@/app/site/nyc-mobile-salon/_components/LeadForm";
import { breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Book Your Appointment — Mobile Beauty to Your Door | The NYC Mobile Salon",
  description: "Book a mobile beauty appointment with The NYC Mobile Salon. Hair, nails, makeup, grooming — we come to you anywhere in NYC. $99/hr, 1-hour minimum. All 5 boroughs.",
  alternates: { canonical: "https://thenycmobilesalon.com/book" },
  openGraph: {
    title: "Book Your Appointment — Mobile Beauty to Your Door | The NYC Mobile Salon",
    description: "Book a mobile beauty appointment with The NYC Mobile Salon. Hair, nails, makeup, grooming — we come to you anywhere in NYC. $99/hr, 1-hour minimum. All 5 boroughs.",
    url: "https://thenycmobilesalon.com/book",
  },
};

export default function BookPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Book Your Appointment", url: "/book" },
            ])
          ),
        }}
      />
      <section className="px-4 py-20">
      <div className="mx-auto max-w-lg">
        <div className="mb-10 text-center">
          <h1 className="mb-4 font-display text-4xl font-black tracking-tight md:text-5xl">
            Book <span className="text-gradient-rose">Mobile Beauty in NYC</span>
          </h1>
          <p className="text-slate-500">
            Book online and take <strong className="text-blush-dark">$20 off your service</strong> — fill it out and we&apos;ll confirm within 24 hours. Easy.
          </p>
        </div>

        <LeadForm id="book-form" />

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
