// @ts-nocheck
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/app/site/nycroadsideemergencyassistance/_data/blog-posts";
import { AudioReader } from "@/app/site/nycroadsideemergencyassistance/_components/AudioReader";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { getBlogImage } from "@/app/site/nycroadsideemergencyassistance/_lib/blog-images";
import { getBlogPhoto } from "@/app/site/nycroadsideemergencyassistance/_data/blog-photos";
import { JsonLd, breadcrumbSchema, articleSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

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
  const blogPhoto = getBlogPhoto(post.slug);
  // Prefer per-post Pexels topic-matched photo over the legacy Unsplash mapping.
  const heroImg = post.heroImage ?? blogPhoto.url ?? getBlogImage(post.slug, 2000);
  // SEO-rich alt: post title + site brand. Pexels alt is too generic.
  const heroAlt = `${post.title} — NYC Roadside Emergency Assistance`;

  // Auto-detect "Step N: ..." paragraphs and emit HowTo schema (Google rich results).
  const stepRe = /^Step\s+(\d+):\s*(.+)$/i;
  const steps = post.content
    .map((p) => {
      const m = p.match(stepRe);
      if (!m) return null;
      return { num: parseInt(m[1], 10), text: m[2] };
    })
    .filter((x): x is { num: number; text: string } => x !== null)
    .sort((a, b) => a.num - b.num);
  const hasHowTo = steps.length >= 3;
  const howToSchema = hasHowTo
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: post.title,
        description: post.excerpt,
        image: heroImg,
        step: steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: `Step ${s.num}`,
          text: s.text,
        })),
      }
    : null;

  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: post.title, url: `/blog/${post.slug}` },
          ]),
          articleSchema({
            title: post.title,
            description: post.excerpt,
            url: `/blog/${post.slug}`,
            image: heroImg,
            datePublished: post.date,
            section: post.category,
          }),
          ...(howToSchema ? [howToSchema] : []),
        ]}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
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
          {/* Article lead image — topic-matched, SEO alt */}
          <figure className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl shadow-lg">
            <Image
              src={heroImg}
              alt={heroAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 768px"
              className="object-cover"
              priority
            />
            {blogPhoto.photographer && (
              <figcaption className="absolute bottom-0 right-0 bg-black/40 px-2 py-0.5 text-[10px] text-white/70">
                Photo: {blogPhoto.photographer_url ? (
                  <a href={blogPhoto.photographer_url} className="underline" rel="nofollow noopener noreferrer" target="_blank">{blogPhoto.photographer}</a>
                ) : blogPhoto.photographer} via <a href={blogPhoto.pexels_url ?? "https://www.pexels.com"} className="underline" rel="nofollow noopener noreferrer" target="_blank">Pexels</a>
              </figcaption>
            )}
          </figure>

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
            <p className="text-lg font-bold text-slate-900 font-heading">Need dispatch right now?</p>
            <p className="mt-2 text-sm text-slate-600">24/7 NYC towing and roadside. Flat-rate pricing. 20–40 min typical arrival.</p>
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/book-towing-service-today" className="inline-block rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 font-cta">Request a Tow</Link>
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
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Explore More Towing & Roadside Topics</p>
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Need Dispatch?</p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Call Or Text Dispatch — 24/7</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}