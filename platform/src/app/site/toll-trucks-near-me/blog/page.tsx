import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/toll-trucks-near-me/_components/CtaButtons";
import { BLOG_POSTS } from "@/app/site/toll-trucks-near-me/_data/blog-posts";

export const metadata: Metadata = {
  title: "Roadside Tips & Blog — Expert Guides, Resale Value Tips & Industry Secrets",
  description: "26 expert articles on tow truck service. Resale value guides, pricing tips, estate cleanout advice, eco-friendly disposal, and the industry secrets other companies don't want you to know.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{BLOG_POSTS.length} Expert Articles on Tow Truck Dispatch</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Tow Truck Dispatch <span className="gradient-text">Tips &amp; Blog</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Expert guides on resale value, pricing, preparation, eco-friendly disposal, and the industry secrets other companies don&apos;t want you to know. Every article includes audio — click Listen to Article.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Browse All {BLOG_POSTS.length} Tow Truck Dispatch Articles</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Latest Articles</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Every article has an audio reader — click &quot;Listen to Article&quot; to have it read aloud with highlighted text. Browse by category or dive into any topic. <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">See our pricing</Link>, explore <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 34 services</Link>, or <Link href="/book-tow-truck-now" className="text-teal-700 font-semibold hover:underline">book your pickup</Link>.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{post.category}</span>
                  <span className="text-xs text-slate-400">{post.date}</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{post.title}</h3>
                <p className="mt-2 text-sm text-slate-600 flex-1">{post.excerpt}</p>
                <p className="mt-4 text-sm font-semibold text-teal-600 font-cta">Read Article →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Ready to See What Your Vehicle Is Worth?</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Done Reading? Book Your Pickup.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">Starting at $95 hookup. Flat upfront pricing with no surcharge games. flat upfront pricing. Same-day available.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
