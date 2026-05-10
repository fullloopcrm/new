// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";
import { getPostBySlug, getAllSlugs } from "@/app/site/the-nyc-seo/_lib/blog";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | ${post.seriesLabel} | The NYC SEO`,
    description: post.intro.slice(0, 155) + "...",
    openGraph: {
      title: post.title,
      description: post.intro.slice(0, 155) + "...",
      url: `${SITE_URL}/blog/${post.slug}`,
    },
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const seriesColor = post.series === "seo" ? "bg-[#0080FE]" : "bg-[#EFF70A] text-black";
  const accentColor = post.series === "seo" ? "text-[#0080FE]" : "text-[#EFF70A]";

  return (
    <div className="text-white">
      {/* Hero */}
      <section className="bg-[#0A0A0A] pb-16 pt-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Blog", url: "/blog" }, { name: `${post.seriesLabel}: ${post.letter}`, url: `/blog/${post.slug}` }]} />

          <div className="mt-10">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${seriesColor}`}>
                {post.letter}
              </span>
              <span className={`text-sm font-semibold uppercase tracking-[0.2em] ${accentColor}`}>{post.seriesLabel}</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              {post.intro}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {post.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-2xl font-bold text-white">{section.heading}</h2>
                <p className="mt-4 text-zinc-300 leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="bg-[#0A0A0A] py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-white">Related Services</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {post.relatedServices.map((svc) => (
              <Link
                key={svc.href}
                href={svc.href}
                className="rounded-lg border border-zinc-800 bg-[#141414] px-4 py-2 text-sm font-medium text-[#5CB8FF] hover:border-[#0080FE]/40 hover:bg-[#1a1a1a]"
              >
                {svc.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0080FE] py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Rather Have Experts Handle It?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-blue-100">We implement everything in this guide — and the other 51 — for{" "}<Link href="/businesses" className="text-white underline hover:text-blue-200">service businesses</Link> across NYC, NJ, Long Island &amp; Westchester.</p>
          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/partnership-request-form" className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-lg font-semibold text-[#0080FE] hover:bg-blue-50">Get Better Leads</Link>
            <a href={`tel:${PHONE.replace(/-/g, "")}`} className="inline-flex items-center rounded-lg border-2 border-white px-6 py-3 text-lg font-semibold text-white hover:bg-white/10">Call {PHONE}</a>
          </div>
          <p className="mt-6 text-sm text-blue-200">
            <Link href="/blog" className="text-white underline hover:text-blue-200">&larr; Back to all guides</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
