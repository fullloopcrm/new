// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/app/site/the-home-services-company/_data/blog-posts";

export const metadata: Metadata = {
  title: "Know Before You Hire — 100 Home Services Guides for Homeowners",
  description: "The Know Before You Hire series: 100 in-depth guides on hiring the right home services contractor, spotting scams, understanding pricing, reading contracts, and managing projects. Expert answers for every trade.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">The Know Before You Hire Series</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Know Before <span className="gradient-text">You Hire</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {BLOG_POSTS.length} guides for homeowners hiring help — every major trade, every red flag, every pricing tactic. Every article includes audio. Click &quot;Listen to Article&quot; on any post.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Browse All {BLOG_POSTS.length} Guides</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Every Guide in the Series</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Every article has an audio reader — click &quot;Listen to Article&quot; to have it read aloud with highlighted text. Browse by category or dive into any topic. <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">See our pricing</Link>, explore <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 40 services</Link>, or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book a service</Link>.
          </p>

          {/* Category filter chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {BLOG_CATEGORIES.map((cat) => {
              const count = BLOG_POSTS.filter((p) => p.category === cat).length;
              return (
                <span key={cat} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 border border-teal-200">
                  {cat} <span className="text-teal-500">({count})</span>
                </span>
              );
            })}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{post.category}</span>
                  {!post.published && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700 border border-amber-200">Coming Soon</span>
                  )}
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{post.title}</h3>
                <p className="mt-2 text-sm text-slate-600 flex-1">{post.excerpt}</p>
                <p className="mt-4 text-sm font-semibold text-teal-600 font-cta">{post.published ? "Read Article →" : "Preview →"}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Ready to Book a Home Service?</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Done Reading? Book a Home Service.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">Starting at $99/hour. Licensed and insured. Upfront pricing. Same-day available.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
