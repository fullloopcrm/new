// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import Link from "next/link";
import { blogPosts } from "@/app/site/debt-service-ratio-loan/_lib/blogPosts";

export const metadata: Metadata = {
  title: "DSCR Loan Blog — News, Tips & Insights for Real Estate Investors",
  description: "DSCR loan news, investment strategies, market analysis, and expert tips for real estate investors. Updated weekly with actionable insights.",
  alternates: { canonical: "https://www.debtserviceratioloan.com/blog" },
};

export default function BlogPage() {
  return (
    <>
      <JsonLd data={webPageSchema("DSCR Loan Blog", "News, tips & insights for real estate investors.", "https://www.debtserviceratioloan.com/blog")} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://www.debtserviceratioloan.com" },
        { name: "Blog", url: "https://www.debtserviceratioloan.com/blog" },
      ])} />

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            DSCR Loan News, Tips & <span className="text-teal-200">Investor Insights</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Expert guides and strategies for real estate investors using DSCR loans.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {blogPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <div className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full flex flex-col">
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
                    {post.category} &bull; {post.readTime}
                  </p>
                  <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading leading-snug">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 flex-1">
                    {post.excerpt}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-teal-600 font-cta">
                    Read More &rarr;
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
