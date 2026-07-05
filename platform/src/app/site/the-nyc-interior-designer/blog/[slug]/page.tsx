import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts, getBlogPost } from "@/app/site/the-nyc-interior-designer/_lib/blogPosts";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_DOMAIN, PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-nyc-interior-designer/_lib/siteData";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${SITE_DOMAIN}/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const pageUrl = `${SITE_DOMAIN}/blog/${post.slug}`;
  const otherPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 4);

  return (
    <>
      <JsonLd
        data={articleSchema(
          post.title,
          post.excerpt,
          pageUrl,
          "2026-04-02",
          "2026-04-02"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Blog", url: `${SITE_DOMAIN}/blog` },
          { name: post.title, url: pageUrl },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300 font-cta">
            {post.category} &bull; {post.readTime} read
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {post.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {post.excerpt}
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="bg-section-white py-10 border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-base font-bold text-slate-900 font-heading">In This Article</h2>
          <nav className="mt-3 space-y-1">
            {post.content.map((section, i) => (
              <a
                key={i}
                href={`#section-${i}`}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-blue-800 transition-colors hover:bg-blue-50 hover:text-blue-900 font-medium"
              >
                <span className="text-blue-400">&rarr;</span>
                {section.heading}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Content */}
      <article className="bg-section-white py-12">
        <div className="mx-auto max-w-3xl px-6">
          {post.content.map((section, i) => (
            <div key={i} id={`section-${i}`} className={i > 0 ? "mt-12" : ""}>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">{section.heading}</h2>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="mt-4 text-base leading-relaxed text-slate-600" dangerouslySetInnerHTML={{ __html: p }} />
              ))}
            </div>
          ))}
        </div>
      </article>

      {/* Inner Links */}
      <section className="bg-section-alt py-12">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-lg font-bold text-slate-900 font-heading">Related Interior Design Resources</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { href: "/pricing", label: "Pricing Guide" },
              { href: "/interior-design-101", label: "Interior Design 101" },
              { href: "/services", label: "All 18 Services" },
              { href: "/areas", label: "Browse NYC Areas" },
              { href: "/get-a-free-consultation", label: "Get a Free Consultation" },
              { href: "/faq", label: "Interior Design FAQ" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Other Posts */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">More from the Blog</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {otherPosts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-400 hover:shadow-md h-full">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{p.category} &bull; {p.readTime}</p>
                  <h3 className="mt-2 text-base font-bold text-slate-900 group-hover:text-blue-700 font-heading leading-snug">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/blog" className="text-sm font-semibold text-blue-700 hover:text-blue-800 font-cta">
              View All Posts &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Transform Your Interior?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free consultation, explore our services, or talk to an interior design specialist today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition-colors hover:bg-blue-50 font-cta">
                Text Us
              </span>
            </a>
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {PHONE}
              </span>
            </a>
            <Link href="/contact">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Free Consultation
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
