import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts, getBlogPost } from "@/app/site/debt-service-ratio-loan/_lib/blogPosts";
import { JsonLd, articleSchema, breadcrumbSchema, faqSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";

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
    alternates: { canonical: `https://www.debtserviceratioloan.com/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const pageUrl = `https://www.debtserviceratioloan.com/blog/${post.slug}`;
  const otherPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 4);

  return (
    <>
      <JsonLd
        data={articleSchema(
          post.title,
          post.excerpt,
          pageUrl,
          "2026-03-25",
          "2026-03-25"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
          { name: "Blog", url: "https://www.debtserviceratioloan.com/blog" },
          { name: post.title, url: pageUrl },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
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
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-teal-700 transition-colors hover:bg-teal-50 hover:text-teal-800 font-medium"
              >
                <span className="text-teal-400">&rarr;</span>
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
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-lg font-bold text-slate-900 font-heading">Related DSCR Resources</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { href: "/calculator", label: "DSCR Calculator" },
              { href: "/dscr-101", label: "DSCR 101 Guide" },
              { href: "/services", label: "All 18 DSCR Services" },
              { href: "/locations", label: "Browse 650+ Cities" },
              { href: "/speak-to-a-loan-officer", label: "Speak to a Loan Officer" },
              { href: "/faq", label: "DSCR Loan FAQ" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60">
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
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">{p.category} &bull; {p.readTime}</p>
                  <h3 className="mt-2 text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading leading-snug">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/blog" className="text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta">
              View All Posts &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Get Started with a DSCR Loan?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Calculate your ratio, explore loan programs, or speak to a specialist today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/calculator">
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                DSCR Calculator
              </span>
            </Link>
            <Link href="/speak-to-a-loan-officer">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Speak to a Loan Officer
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
