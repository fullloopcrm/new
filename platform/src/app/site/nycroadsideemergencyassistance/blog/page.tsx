import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { BLOG_POSTS } from "@/app/site/nycroadsideemergencyassistance/_data/blog-posts";
import { getBlogPhoto } from "@/app/site/nycroadsideemergencyassistance/_data/blog-photos";
import { JsonLd, breadcrumbSchema, itemListSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export const metadata: Metadata = {
  title: "NYC Tow Truck Blog — Guides on Towing, Flatbeds, EVs, Pricing & Roadside",
  description: `${BLOG_POSTS.length} guides on NYC towing and roadside service. What to do when you break down, flatbed vs. wheel-lift, dead-battery winter calls, pound recovery, and more. One rate: $149/hour, $25 off online ($124 first hour).`,
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Blog", url: "/blog" },
          ]),
          itemListSchema(
            BLOG_POSTS.map((p) => ({
              name: p.title,
              url: `/blog/${p.slug}`,
              description: p.excerpt,
            })),
            "NYC Towing Blog",
          ),
        ]}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{BLOG_POSTS.length} Guides on NYC Towing & Roadside</p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">NYC Tow Truck Blog</span> — Guides on Towing, Pricing &amp; Roadside Service
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Practical guides on NYC breakdowns, flatbed vs. wheel-lift, AWD and EV procedures, impound recovery, fleet accounts, and dealing with NYC tow pricing. Every article has an audio reader — click Listen.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Latest Articles</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Browse by topic or dive in. <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">See pricing</Link>, <Link href="/services" className="text-teal-700 font-semibold hover:underline">all services</Link>, or <Link href="/book-towing-service-today" className="text-teal-700 font-semibold hover:underline">request dispatch</Link>.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => {
              const ph = getBlogPhoto(post.slug);
              return (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-teal-400 hover:shadow-md h-full flex flex-col">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={ph.url}
                    alt={`${post.title} — NYC Roadside Emergency Assistance`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col p-6 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{post.category}</span>
                    <span className="text-xs text-slate-400">{post.date}</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{post.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 flex-1">{post.excerpt}</p>
                  <p className="mt-4 text-sm font-semibold text-teal-600 font-cta">Read Article →</p>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Need a Tow Right Now?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">24/7 dispatch. Flat-rate pricing. Typical 20–40 min arrival across all five boroughs.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}