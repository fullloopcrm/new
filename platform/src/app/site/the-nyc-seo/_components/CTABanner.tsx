import Link from "next/link";
import { PHONE } from "@/app/site/the-nyc-seo/_lib/seo";

interface CTABannerProps {
  title?: string;
  subtitle?: string;
}

export default function CTABanner({
  title = "Ready to Own Your Organic Search & AI Visibility?",
  subtitle = "Tell us about your business. We'll show you the SEO and AI search strategy, the pages, and the full plan. No cost. No commitment.",
}: CTABannerProps) {
  return (
    <section className="bg-[#0080FE] py-12">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        <p className="mt-3 text-lg text-blue-100">{subtitle}</p>
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/partnership-request-form"
            className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-lg font-semibold text-[#0080FE] shadow-sm hover:bg-blue-50"
          >
            Get Better Leads
          </Link>
          <a
            href={`tel:${PHONE.replace(/-/g, "")}`}
            className="inline-flex items-center rounded-lg border-2 border-white px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700"
          >
            Call {PHONE}
          </a>
        </div>
      </div>
    </section>
  );
}
