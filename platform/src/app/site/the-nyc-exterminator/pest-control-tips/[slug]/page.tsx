// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllTips, getTipBySlug } from "@/app/site/the-nyc-exterminator/_data/tips";
import {
  PHONE,
  SITE_URL,
  SITE_NAME,
} from "@/app/site/the-nyc-exterminator/_lib/seo";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";

const phonePlain = PHONE.replace(/-/g, "");

export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const tip = getTipBySlug(slug);
  if (!tip) return {};

  return {
    title: tip.metaTitle,
    description: tip.metaDescription,
    keywords: tip.keywords,
    openGraph: {
      title: tip.metaTitle,
      description: tip.metaDescription,
      url: `${SITE_URL}/pest-control-tips/${tip.slug}`,
      siteName: SITE_NAME,
      type: "article",
      locale: "en_US",
    },
    alternates: {
      canonical: `${SITE_URL}/pest-control-tips/${tip.slug}`,
    },
  };
}

export default async function TipPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const tip = getTipBySlug(slug);
  if (!tip) notFound();

  const allTips = getAllTips();
  const sameCategoryTips = allTips.filter(
    (t) => t.category === tip.category && t.slug !== tip.slug
  );
  const otherTips = allTips.filter(
    (t) => t.category !== tip.category && t.slug !== tip.slug
  );
  const relatedTips = [...sameCategoryTips, ...otherTips].slice(0, 3);

  return (
    <div className="text-white">
      {/* JSON-LD (LocalBusiness emitted globally in layout.tsx). Article schema
          adds the required `image` and `datePublished` fields Google demands
          for Article rich results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: tip.title,
            description: tip.metaDescription,
            url: `${SITE_URL}/pest-control-tips/${tip.slug}`,
            image: `${SITE_URL}/icon.svg`,
            datePublished: new Date().toISOString().slice(0, 10),
            dateModified: new Date().toISOString().slice(0, 10),
            author: {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
            },
            publisher: {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/icon.svg`,
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${SITE_URL}/pest-control-tips/${tip.slug}`,
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_URL,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Pest Control Tips",
                item: `${SITE_URL}/pest-control-tips`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: tip.title,
                item: `${SITE_URL}/pest-control-tips/${tip.slug}`,
              },
            ],
          }),
        }}
      />

      {/* ── BREADCRUMB ── */}
      <div className="bg-[#0A0A0A] pt-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-300">Home</Link>
            <span>/</span>
            <Link href="/pest-control-tips" className="hover:text-zinc-300">Pest Control Tips</Link>
            <span>/</span>
            <span className="text-zinc-400">{tip.title}</span>
          </nav>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] pb-12 pt-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <span className="rounded-md bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">
            {tip.category}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {tip.title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            {tip.intro}
          </p>
          <div className="mt-6 flex items-center gap-4 text-sm text-zinc-500">
            <span>By <strong className="text-zinc-300">The NYC Exterminator Team</strong></span>
            <span>&bull;</span>
            <span>NYS DEC Licensed Pest Control Technicians</span>
          </div>
        </div>
      </section>

      {/* ── TABLE OF CONTENTS ── */}
      <div className="border-y border-zinc-800 bg-zinc-900/50 py-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">In This Guide</h2>
          <ul className="mt-3 space-y-2">
            {tip.sections.map((section, i) => (
              <li key={i}>
                <a
                  href={`#section-${i}`}
                  className="text-sm text-green-400 hover:text-green-300"
                >
                  {section.heading}
                </a>
              </li>
            ))}
            <li>
              <a href="#pro-tip" className="text-sm text-green-400 hover:text-green-300">
                Pro Tip
              </a>
            </li>
            <li>
              <a href="#when-to-call" className="text-sm text-green-400 hover:text-green-300">
                When to Call a Professional
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ── ARTICLE CONTENT ── */}
      <article className="bg-[#0A0A0A] py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {tip.sections.map((section, i) => (
              <section key={i} id={`section-${i}`}>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  {section.heading}
                </h2>
                <div className="mt-6 space-y-4 text-zinc-300 leading-7">
                  {section.content.split("\n\n").map((paragraph, j) => {
                    if (paragraph.startsWith("- ") || paragraph.includes("\n- ")) {
                      const items = paragraph.split("\n").filter(line => line.startsWith("- "));
                      const intro = paragraph.split("\n")[0];
                      const hasIntro = !intro.startsWith("- ");
                      return (
                        <div key={j}>
                          {hasIntro && <p className="mb-2">{intro}</p>}
                          <ul className="list-inside space-y-1.5 text-sm text-zinc-400">
                            {items.map((item, k) => (
                              <li key={k} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                                <span>{item.replace(/^- /, "")}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return <p key={j}>{paragraph}</p>;
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* ── PRO TIP CALLOUT ── */}
          <div id="pro-tip" className="mt-12 rounded-xl border border-green-500/30 bg-green-950/20 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="shrink-0 rounded-md bg-green-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-green-400">
                Pro Tip
              </span>
              <p className="text-sm leading-7 text-zinc-300">{tip.proTip}</p>
            </div>
          </div>

          {/* ── WHEN TO CALL A PRO ── */}
          <div id="when-to-call" className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-950/10 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="shrink-0 rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-yellow-400">
                When to Call a Pro
              </span>
              <p className="text-sm leading-7 text-zinc-300">{tip.whenToCallPro}</p>
            </div>
          </div>
        </div>
      </article>

      {/* ── MID CTA ── */}
      <CTAGroup
        variant="mid"
        title="Need Help With This?"
        subtitle="Text us a photo or description of your situation. We'll give you an honest, no-pressure assessment — and if you don't need us, we'll tell you that too."
      />

      {/* ── RELATED GUIDES ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Related Guides</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {relatedTips.map((related) => (
              <Link
                key={related.slug}
                href={`/pest-control-tips/${related.slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-green-500/50 hover:-translate-y-0.5"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-green-500">{related.category}</span>
                <h3 className="mt-2 font-semibold text-white group-hover:text-green-400 line-clamp-2">{related.title}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500 line-clamp-2">{related.intro}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/pest-control-tips"
              className="inline-flex items-center text-sm font-semibold text-green-500 hover:text-green-400"
            >
              &larr; Back to all pest control tips
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <CTAGroup
        variant="final"
        title="Can't Solve It Yourself? No Judgment."
        subtitle="Some pest problems need professional tools and expertise. Text us what you're dealing with and we'll give you an honest assessment — free."
      />
    </div>
  );
}
