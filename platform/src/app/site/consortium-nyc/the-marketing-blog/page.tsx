// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";
import BlogSidebar from "@/app/site/consortium-nyc/_components/blog/BlogSidebar";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";

const title = "NYC Marketing Blog | SEO, Web Design & Growth Strategies | The NYC Marketing Company";
const description =
  "Actionable digital marketing strategies, SEO tips, and growth tactics for NYC, Long Island, and Westchester businesses. No fluff — just what works. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/the-marketing-blog";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing blog",
    "SEO tips NYC",
    "digital marketing strategies",
    "NYC business growth",
    "local SEO blog",
    "web design tips",
    "NYC marketing company blog",
    "marketing insights New York",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "The NYC Marketing Company",
    type: "website",
    images: [{ url: "https://www.consortiumnyc.com/og-image.jpg", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://www.consortiumnyc.com/og-image.jpg"],
  },
};

const posts = [
  {
    title: "10 SEO Mistakes NYC Businesses Make in 2026",
    excerpt:
      "Most NYC businesses are sabotaging their own search rankings without realizing it. From ignoring local citations to neglecting mobile speed, these ten mistakes are costing you customers every single day.",
    slug: "10-seo-mistakes-nyc-businesses-2026",
    category: "SEO",
  },
  {
    title: "Local SEO vs National SEO: What Your Business Actually Needs",
    excerpt:
      "The strategies that rank you nationally are completely different from the ones that dominate local search. Here's how to figure out which approach — or combination — will drive the most revenue for your business.",
    slug: "local-seo-vs-national-seo",
    category: "SEO",
  },
  {
    title: "How to Choose a Marketing Company (Without Getting Burned)",
    excerpt:
      "The agency landscape is full of big promises and little accountability. We break down the exact questions to ask, red flags to watch for, and benchmarks to demand before signing any contract.",
    slug: "how-to-choose-digital-marketing-agency",
    category: "Strategy",
  },
];

const breadcrumbs = [
  { name: "Home", url: "https://www.consortiumnyc.com" },
  { name: "Blog", url },
];

export default function BlogPage() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {/* Hero */}
      <section className="pt-32 pb-12 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            NYC Marketing Blog
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
            Marketing Insights for{" "}
            <span className="text-teal-400">NYC Businesses</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Actionable strategies and honest analysis from 25 years of growing businesses across New York City, Long Island, and beyond.
          </p>
        </div>
      </section>

      <TipBlurb
        tip={<>Most marketing blogs exist to <strong>sell you something</strong>. Ours exist to <strong>teach you something</strong>. If you can do it yourself after reading, good. If you want help, we&apos;re here.</>}
      />

      {/* Sidebar + Content */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-12">
          <BlogSidebar />

          {/* Posts */}
          <div className="flex-1 min-w-0">
            <div className="space-y-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/the-marketing-blog/${post.slug}`}
                  className="group block rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-teal-300 p-8 transition-all"
                >
                  <span className="text-teal-600 text-xs font-bold uppercase tracking-wider font-cta">
                    {post.category}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-teal-600 transition-colors mt-3 mb-3 font-heading">
                    {post.title}
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <span className="text-teal-600 text-sm font-semibold font-cta">
                    Read More &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
