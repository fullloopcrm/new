import type { Metadata } from "next";
import ApplicationForm from "@/app/site/nyc-mobile-salon/_components/ApplicationForm";
import { breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Apply Now — Join The NYC Mobile Salon Team",
  description:
    "Submit your application to join The NYC Mobile Salon. Licensed hairstylists, barbers, nail techs, makeup artists, estheticians, and waxing specialists — $49/hr paid via Zelle or Apple Cash. Apply in under 5 minutes.",
  alternates: { canonical: "https://thenycmobilesalon.com/join/application" },
  openGraph: {
    title: "Apply Now — Join The NYC Mobile Salon Team",
    description:
      "Submit your application to join The NYC Mobile Salon. $49/hr paid instantly. No booth rental fees. All 5 NYC boroughs.",
    url: "https://thenycmobilesalon.com/join/application",
  },
};

export default function ApplicationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Join Our Team", url: "/join" },
              { name: "Apply", url: "/join/application" },
            ])
          ),
        }}
      />

      <section
        className="relative overflow-hidden px-4 py-16 text-white md:py-20"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)",
        }}
      >
        <div className="relative mx-auto max-w-2xl text-center">
          <h1 className="mb-4 font-display text-4xl font-black tracking-tight md:text-5xl">
            Apply Now
          </h1>
          <p className="mx-auto max-w-xl text-lg text-white/90">
            $49/hr via Zelle or Apple Cash — paid within 30 minutes of job completion. Fill out the form below to get started.
          </p>
        </div>
      </section>

      <section className="bg-charcoal px-4 py-16">
        <div className="mx-auto max-w-lg">
          <ApplicationForm />

          <div className="mt-8 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/40">Or reach out directly</p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="sms:+12122029075"
                className="flex items-center gap-2 rounded-full border border-purple-200 bg-white px-6 py-3 text-sm font-bold text-purple-600 transition hover:-translate-y-0.5 hover:bg-purple-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Text Us
              </a>
              <a
                href="tel:+12122029075"
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:-translate-y-0.5 hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Us
              </a>
            </div>
            <p className="mt-3 text-xs text-white/40">212.202.9075 — call or text anytime</p>
          </div>
        </div>
      </section>
    </>
  );
}
