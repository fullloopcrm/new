import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/app/site/we-pay-you-junk/_data/blog-posts";
import { AudioReader } from "@/app/site/we-pay-you-junk/_components/AudioReader";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const postIndex = BLOG_POSTS.indexOf(post);
  const related = BLOG_POSTS.filter((p) => p.slug !== slug && p.category === post.category).slice(0, 3);
  const others = BLOG_POSTS.filter((p) => p.slug !== slug && p.category !== post.category).slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-teal-200 font-semibold">{post.category}</span>
            <span className="text-xs text-teal-200/60">{post.date}</span>
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
          {/* Audio reader */}
          <div className="mb-8 flex items-center justify-between">
            <AudioReader contentId="article-content" />
            <span className="text-xs text-slate-400">{post.content.length} min read</span>
          </div>

          {/* Article content */}
          <div id="article-content" className="space-y-5 text-base leading-relaxed text-slate-700">
            {post.content.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {/* Post-article CTA */}
          <div className="mt-12 rounded-xl border-2 border-teal-400 bg-teal-50 p-6 text-center">
            <p className="text-lg font-bold text-slate-900 font-heading">Ready to see what your junk is worth?</p>
            <p className="mt-2 text-sm text-slate-600">Starting at $100/hr. Dump fees included (an industry first). 50% Resale Credit (when applicable).</p>
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/book-junk-removal-service-today" className="inline-block rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 font-cta">Book Now &amp; Save $10</Link>
              <Link href="/pricing" className="inline-block rounded-lg border border-teal-700 px-6 py-2.5 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">See Pricing</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">More {post.category} Articles</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Related Articles</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{r.category}</span>
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
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Explore More Junk Removal Topics</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">More Articles</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {others.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{r.category}</span>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700">{r.title}</h3>
                  <p className="mt-2 text-xs text-slate-500">{r.excerpt}</p>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/blog" className="text-teal-700 font-semibold text-sm hover:underline font-cta">All {BLOG_POSTS.length} Articles →</Link>
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Book Your Junk Removal Today</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Done Reading? Let&apos;s Get Your Junk Handled.</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
