import type { Metadata } from "next";
import FoundingCEOApplicationForm from "@/app/site/nyc-mobile-salon/_components/FoundingCEOApplicationForm";
import { breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Apply — Founding CEO / Head of Operations | The NYC Mobile Salon",
  description:
    "Apply to be the Founding CEO / Head of Operations at The NYC Mobile Salon. Video intro + in-depth questions. For ex-marketplace operators (Glamsquad, Soothe, StyleSeat, Priv, Urban Company, or similar) who have scaled supply-constrained services platforms.",
  alternates: {
    canonical: "https://thenycmobilesalon.com/founding-ceo-position-search/application",
  },
  openGraph: {
    title: "Apply — Founding CEO / Head of Operations | The NYC Mobile Salon",
    description:
      "In-depth application for the founding operator role at NYC's newest mobile beauty platform. Video intro required.",
    url: "https://thenycmobilesalon.com/founding-ceo-position-search/application",
  },
};

export default function FoundingCEOApplicationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Founding CEO", url: "/founding-ceo-position-search" },
              { name: "Apply", url: "/founding-ceo-position-search/application" },
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
            Founding CEO Application
          </h1>
          <p className="mx-auto max-w-xl text-lg text-white/90">
            This is not a resume drop. Tell us your marketplace story, record a 2-3 minute video intro, and give us your 30/60/90 plan. If it&rsquo;s a fit, you&rsquo;ll hear back within 72 hours.
          </p>
        </div>
      </section>

      <section className="bg-charcoal px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <FoundingCEOApplicationForm />

          <div className="mt-8 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/40">
              Or reach out directly
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="mailto:hey@thenycmobilesalon.com?subject=Founding%20CEO%20Inquiry"
                className="flex items-center gap-2 rounded-full border border-purple-200 bg-white px-6 py-3 text-sm font-bold text-purple-600 transition hover:-translate-y-0.5 hover:bg-purple-50"
              >
                Email Founder
              </a>
              <a
                href="tel:+12122029075"
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:-translate-y-0.5 hover:bg-gray-50"
              >
                Call Founder
              </a>
            </div>
            <p className="mt-3 text-xs text-white/40">
              212.202.9075 — call or text anytime
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
