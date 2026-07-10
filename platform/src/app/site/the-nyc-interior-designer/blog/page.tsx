import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_DOMAIN } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import Link from "next/link";
import { blogPosts } from "@/app/site/the-nyc-interior-designer/_lib/blogPosts";

export const metadata: Metadata = {
  title: "NYC Interior Design Blog — Tips, Guides & Design Inspiration",
  description: "NYC interior design tips, renovation guides, color trends, and expert advice for property owners. Updated regularly with actionable insights.",
  alternates: { canonical: `${SITE_DOMAIN}/blog` },
};

export default function BlogPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Interior Design Blog", "Tips, guides & design inspiration for NYC property owners.", `${SITE_DOMAIN}/blog`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_DOMAIN },
        { name: "Blog", url: `${SITE_DOMAIN}/blog` },
      ])} />

      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            NYC Interior Design Tips & <span className="text-blue-300">Expert Advice</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Practical guides, design trends, and renovation advice for NYC property owners.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {blogPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <div className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-400 hover:shadow-md h-full flex flex-col">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    {post.category} &bull; {post.readTime}
                  </p>
                  <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-blue-700 font-heading leading-snug">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 flex-1">
                    {post.excerpt}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-blue-700 font-cta">
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
