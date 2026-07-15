import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/app/site/the-home-services-company/_data/blog-posts";
import { AudioReader } from "@/app/site/the-home-services-company/_components/AudioReader";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { SITE_URL } from "@/app/site/the-home-services-company/_data/content";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} — Know Before You Hire`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `${SITE_URL}/blog/${slug}`,
      siteName: "Home Services Co",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = BLOG_POSTS.filter((p) => p.slug !== slug && p.category === post.category).slice(0, 3);
  const others = BLOG_POSTS.filter((p) => p.slug !== slug && p.category !== post.category).slice(0, 3);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    articleSection: post.category,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${slug}`,
    },
    author: {
      "@type": "Organization",
      name: "Home Services Co",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Home Services Co",
      url: SITE_URL,
    },
    inLanguage: "en-US",
    isPartOf: {
      "@type": "CreativeWorkSeries",
      name: "Know Before You Hire",
      url: `${SITE_URL}/blog`,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Know Before You Hire", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }} />

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-teal-200 font-semibold">{post.category}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-teal-200/80 font-semibold">Know Before You Hire</span>
            {!post.published && (
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs text-amber-200 font-semibold border border-amber-300/30">Coming Soon</span>
            )}
          </div>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {post.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {post.excerpt}
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          {post.published ? (
            <>
              {/* Audio reader */}
              <div className="mb-8 flex items-center justify-between">
                <AudioReader contentId="article-content" />
                <span className="text-xs text-slate-400">{post.content.length} min read</span>
              </div>

              {/* Article content */}
              <div id="article-content" className="space-y-5 text-base leading-relaxed text-slate-700">
                {post.content.map((paragraph, i) => (
                  <p key={i} dangerouslySetInnerHTML={{ __html: paragraph }} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">In the Pipeline</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">This Guide Is Being Written</h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
                {post.excerpt}
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500">
                Full article publishing soon. In the meantime, browse the rest of the Know Before You Hire series below, or call us about your project — starting at $99/hour with upfront pricing.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/blog" className="inline-block rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 font-cta">Back to All Guides</Link>
                <Link href="/book" className="inline-block rounded-lg border border-teal-700 px-6 py-2.5 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">Book a Service</Link>
              </div>
            </div>
          )}

          {/* Post-article CTA */}
          {post.published && (
            <div className="mt-12 rounded-xl border-2 border-teal-400 bg-teal-50 p-6 text-center">
              <p className="text-lg font-bold text-slate-900 font-heading">Ready to book a home service?</p>
              <p className="mt-2 text-sm text-slate-600">Starting at $99/hour. Upfront pricing. Licensed and insured. 40 services under one roof.</p>
              <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/book" className="inline-block rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 font-cta">Book Now</Link>
                <Link href="/pricing" className="inline-block rounded-lg border border-teal-700 px-6 py-2.5 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">See Pricing</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">More {post.category} Guides</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Related Articles</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{r.category}</span>
                    {!r.published && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Soon</span>}
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700">{r.title}</h3>
                  <p className="mt-2 text-xs text-slate-500">{r.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Explore More Home Services Topics</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">More Guides</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {others.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{r.category}</span>
                    {!r.published && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Soon</span>}
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700">{r.title}</h3>
                  <p className="mt-2 text-xs text-slate-500">{r.excerpt}</p>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/blog" className="text-teal-700 font-semibold text-sm hover:underline font-cta">All {BLOG_POSTS.length} Guides →</Link>
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Book Your Home Services Today</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Done Reading? Book a Home Service.</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
