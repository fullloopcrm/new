// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import ContactForm from "@/app/site/the-nyc-seo/_components/ContactForm";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title:
    "Partnership Request | SEO & AI Search for Your Business | The NYC SEO",
  description:
    "Tell us about your service business. We'll show you exactly what we'd build — the SEO pages, the AI search strategy, the structured data, the full plan. No cost. No commitment. Built by Consortium NYC.",
  openGraph: {
    title: "Partnership Request | SEO & AI Search for Your Business",
    description:
      "Tell us about your service business. We'll show you the SEO and AI search strategy. No cost. No commitment.",
    url: `${SITE_URL}/partnership-request-form`,
  },
  alternates: {
    canonical: `${SITE_URL}/partnership-request-form`,
  },
};

export default function PartnershipRequestPage() {
  return (
    <div className="text-white">
      {/* Hero — dark */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Partnership Request", url: "/partnership-request-form" }]} />

          <div className="mt-10 grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                Start Here
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Let&apos;s Build Your
                <span className="text-[#EFF70A]"> Organic Lead Machine</span>
              </h1>
              <p className="mt-4 text-lg text-zinc-300">
                If you&apos;re serious about growing your{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  business
                </Link>{" "}
                the right way &mdash; with{" "}
                <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  real organic leads and AI search visibility
                </Link>{" "}
                that last &mdash; tell us where you are and where you want to be.
              </p>

              <div className="mt-8 rounded-xl border border-zinc-800 bg-[#141414] p-6 sm:p-8">
                <div className="[&_input]:border-zinc-700 [&_input]:bg-[#1a1a1a] [&_input]:text-white [&_input]:placeholder:text-zinc-500 [&_label]:text-zinc-300 [&_select]:border-zinc-700 [&_select]:bg-[#1a1a1a] [&_select]:text-white [&_textarea]:border-zinc-700 [&_textarea]:bg-[#1a1a1a] [&_textarea]:text-white [&_textarea]:placeholder:text-zinc-500">
                  <ContactForm />
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <h2 className="text-lg font-semibold text-white">
                  Prefer to Talk?
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Call us directly. No sales pitch &mdash; just a real conversation
                  about your business and how{" "}
                  <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                    SEO and AI search
                  </Link>{" "}
                  can grow it.
                </p>
                <a
                  href={`tel:${PHONE.replace(/-/g, "")}`}
                  className="mt-4 inline-block text-2xl font-bold text-[#0080FE] hover:text-blue-300"
                >
                  {PHONE}
                </a>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <h2 className="text-lg font-semibold text-white">
                  What Happens Next?
                </h2>
                <ol className="mt-4 space-y-3 text-sm text-zinc-400">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-[#0080FE]">
                      1
                    </span>
                    <span>We review your request and research your market</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-[#0080FE]">
                      2
                    </span>
                    <span>If we&apos;re a good fit, we schedule a call to walk through the SEO &amp; AI search strategy</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-[#0080FE]">
                      3
                    </span>
                    <span>We show you exactly what we&apos;d build &mdash; the pages, the structured data, the full plan</span>
                  </li>
                </ol>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <h2 className="text-lg font-semibold text-white">
                  What You Get
                </h2>
                <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                  <li className="flex gap-2">
                    <span className="text-green-400">&#10003;</span>
                    <span>Custom{" "}
                      <Link href="/services#search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                        SEO
                      </Link>{" "}
                      &amp;{" "}
                      <Link href="/services#ai-search-optimization-(geo)" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                        AI search strategy
                      </Link>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-400">&#10003;</span>
                    Multi-engine optimization plan
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-400">&#10003;</span>
                    Competitor analysis for your market
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-400">&#10003;</span>
                    <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                      Transparent pricing
                    </Link>{" "}
                    — no surprises
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <h2 className="text-lg font-semibold text-white">
                  The Right Fit Matters
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  We don&apos;t take every client. The{" "}
                  <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                    businesses
                  </Link>{" "}
                  we do our best work with are the ones ready to think long-term, trust
                  the process, and build something real. If that sounds like you,
                  we&apos;re going to get along great.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
