// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";
import { PHONE, SITE_URL, getBlogPostSchema, getBreadcrumbSchema } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import { getPostBySlug, getAllSlugs } from "@/app/site/fla-dumpster-rentals/_lib/blog";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | ${post.seriesLabel} | Florida Dumpster Rentals`,
    description: post.intro.slice(0, 155) + "...",
    openGraph: {
      title: post.title,
      description: post.intro.slice(0, 155) + "...",
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedDate,
    },
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const seriesColor =
    post.series === "seo" ? "bg-orange-600" : "bg-orange-400 text-black";
  const accentColor =
    post.series === "seo" ? "text-orange-500" : "text-orange-400";

  const phonePlain = PHONE.replace(/-/g, "");

  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getBlogPostSchema(post)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getBreadcrumbSchema([
            { name: "Blog", url: "/blog" },
            { name: post.title, url: `/blog/${post.slug}` },
          ])),
        }}
      />
      {/* Hero */}
      <section className="bg-stone-950 pb-16 pt-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Blog", url: "/blog" },
              {
                name: `${post.seriesLabel}: ${post.letter}`,
                url: `/blog/${post.slug}`,
              },
            ]}
          />

          <div className="mt-10">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${seriesColor}`}
              >
                {post.letter}
              </span>
              <span
                className={`text-sm font-semibold uppercase tracking-[0.2em] ${accentColor}`}
              >
                {post.seriesLabel}
              </span>
            </div>
            <time dateTime={post.publishedDate} className="mt-2 block text-sm text-stone-500">
              {new Date(post.publishedDate + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <p className="mt-6 text-lg leading-8 text-stone-300">
              {post.intro}
            </p>
            <div className="mt-8 rounded-xl border border-orange-600/30 bg-orange-950/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">Quick Answer</p>
              <p className="mt-2 text-base leading-relaxed text-stone-200">{post.quickAnswer}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {post.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-2xl font-bold text-white">
                  {section.heading}
                </h2>
                <p className="mt-4 text-stone-300 leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="bg-stone-950 py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-white">Related Services</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {post.relatedServices.map((svc) => (
              <Link
                key={svc.href}
                href={svc.href}
                className="rounded-lg border border-stone-800 bg-stone-950 px-4 py-2 text-sm font-medium text-orange-400 hover:border-orange-600/40 hover:bg-stone-900"
              >
                {svc.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Reading Is Great. Texting Is Faster.",
            body: "You've clearly done your homework — respect. But if you already know what you need, just text us at 954-710-2332 with your project details and zip code. We'll have a quote back before you finish the next article.",
          },
          {
            title: "Save This for Later",
            body: "Bookmark this page. When your project kicks off and you're knee-deep in demo debris wondering about weight limits or sizing, you'll be glad you did.",
          },
          {
            title: "We Wrote 52 of These. Ask Us Anything.",
            body: "If we missed something or you have a question that none of our guides cover, just reach out. We genuinely love talking about dumpsters. Somebody has to.",
          },
        ]}
      />

      {/* CTA */}
      <section className="bg-orange-600 py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Need a Dumpster for Your Project?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-orange-100">
            10, 20 &amp; 30 yard roll-off dumpsters delivered anywhere in
            Florida. Same-day delivery available.
          </p>
          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={`sms:${phonePlain}`}
              className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-lg font-semibold text-orange-600 hover:bg-orange-50"
            >
              Text Us for a Quote
            </a>
            <a
              href={`tel:${phonePlain}`}
              className="inline-flex items-center rounded-lg border-2 border-white px-6 py-3 text-lg font-semibold text-white hover:bg-white/10"
            >
              Call {PHONE}
            </a>
            <a
              href="/schedule-dumpster-rental-form"
              className="inline-flex items-center rounded-lg border-2 border-white/50 px-6 py-3 text-lg font-semibold text-white hover:border-white hover:bg-white/10"
            >
              Book Online
            </a>
          </div>
          <p className="mt-6 text-sm text-orange-200">
            <Link
              href="/blog"
              className="text-white underline hover:text-orange-200"
            >
              &larr; Back to all guides
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
