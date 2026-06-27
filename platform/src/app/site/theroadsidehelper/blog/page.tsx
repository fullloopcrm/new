// @ts-nocheck
import Link from "next/link";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { BLOG_POSTS } from "@/app/site/theroadsidehelper/_data/blog-posts";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title:
    "Roadside Assistance Tips & Blog — 100 Guides at $149/hr | The Roadside Helper",
  description:
    "100 roadside assistance guides: battery, tires, lockouts, fuel, towing, seasonal prep, regional advice. Flat $149/hr roadside service. Call (888) 944-3001.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">{BLOG_POSTS.length} Practical Articles</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Roadside <span className="text-amber-300">Tips &amp; Blog</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Practical roadside advice — what actually happens, what to do about it, and what it really costs.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Browse Articles</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Latest Articles</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            <Link href="/pricing" className="text-emerald-700 font-semibold hover:underline">See our pricing</Link>, explore <Link href="/services" className="text-emerald-700 font-semibold hover:underline">all services</Link>, or <Link href="/book-roadside-help-now" className="text-emerald-700 font-semibold hover:underline">book a roadside call</Link>.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-emerald-600 hover:shadow-md h-full flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">{post.category}</span>
                  <span className="text-xs text-slate-400">{post.date}</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900 font-heading group-hover:text-emerald-700 transition-colors">{post.title}</h3>
                <p className="mt-2 text-sm text-slate-600 flex-1">{post.excerpt}</p>
                <p className="mt-4 text-sm font-semibold text-emerald-700 font-cta">Read Article →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Need Help Right Now?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/80">Flat $149/hr. 24/7 dispatch. No membership.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}