import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BLOG_POSTS, getBlogPost, getAllBlogSlugs } from '@/lib/seo/blog-data'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'

export function generateStaticParams() {
  return getAllBlogSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}

  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const base = tenantSiteUrl(tenant)
  const url = `${base}/nyc-maid-service-blog/${post.slug}`

  return {
    title: `${post.title} | ${name}`,
    description: post.metaDescription,
    ...(base && { alternates: { canonical: url } }),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      ...(base && { url }),
      type: 'article',
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.metaDescription,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const base = tenantSiteUrl(tenant)

  const dateStr = new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // Find related posts (same category, excluding current)
  const related = BLOG_POSTS.filter(p => p.slug !== post.slug && p.category === post.category).slice(0, 3)
  if (related.length < 3) {
    const more = BLOG_POSTS.filter(p => p.slug !== post.slug && !related.includes(p)).slice(0, 3 - related.length)
    related.push(...more)
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    ...(base && {
      author: { '@type': 'Organization', name, url: base },
      publisher: { '@type': 'Organization', name, url: base },
      mainEntityOfPage: `${base}/nyc-maid-service-blog/${post.slug}`,
    }),
  }

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          ...(base ? [{ name: 'Home', url: base }] : []),
          { name: 'Blog', url: `${base}/nyc-maid-service-blog` },
          { name: post.title, url: `${base}/nyc-maid-service-blog/${post.slug}` },
        ]),
        articleSchema,
      ]} />

      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-xs font-medium text-[var(--brand-accent)] bg-[var(--brand-accent)]/15 px-3 py-1 rounded-full uppercase tracking-widest">{post.category}</span>
            <span className="text-white/50 text-sm">{dateStr}</span>
            <span className="text-white/50 text-sm">{post.readTime} read</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl lg:text-5xl text-white tracking-wide leading-tight">{post.title}</h1>
          <p className="text-white/60 text-lg mt-4 max-w-2xl mx-auto">{post.excerpt}</p>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Blog', href: '/nyc-maid-service-blog' },
          { name: post.title, href: `/nyc-maid-service-blog/${post.slug}` },
        ]} />

        <div className="prose prose-lg max-w-none">
          {post.sections.map((section, i) => (
            <div key={i} className="mb-8">
              {section.heading && (
                <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mt-10 mb-4">{section.heading}</h2>
              )}
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-gray-700 leading-relaxed mb-4 [&_a]:text-[var(--brand)] [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[var(--brand-accent)] hover:[&_a]:decoration-[var(--brand)]" dangerouslySetInnerHTML={{ __html: p }} />
              ))}
              {section.list && (
                <ul className="space-y-2 mb-4">
                  {section.list.map((item, k) => (
                    <li key={k} className="flex items-start gap-3">
                      <span className="text-[var(--brand-accent)] mt-1 flex-shrink-0">&#10003;</span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* CTA mid-article */}
        {phone && (
          <div className="bg-[var(--brand)] rounded-xl p-8 my-12 text-center">
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-2">Need Help With This?</h3>
            <p className="text-white/70 mb-6">Our professional team handles all of this and more.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`tel:${phoneDigits}`} className="bg-[var(--brand-accent)] text-[var(--brand)] px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                Call {phone}
              </a>
              <a href={`sms:${phoneDigits}`} className="text-white font-semibold hover:underline underline-offset-4">
                or Text Us
              </a>
            </div>
          </div>
        )}

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-16">
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-6">Keep Reading</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map(r => (
                <Link key={r.slug} href={`/nyc-maid-service-blog/${r.slug}`} className="group border border-gray-200 rounded-xl p-6 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all">
                  <span className="text-xs font-medium text-[var(--brand)]/60 uppercase tracking-widest">{r.category}</span>
                  <h4 className="font-semibold text-[var(--brand)] group-hover:text-[var(--brand)]/80 mt-2 line-clamp-2">{r.title}</h4>
                  <p className="text-gray-500 text-sm mt-2 line-clamp-2">{r.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <CTABlock title="Ready to Book?" phone={phone} />
    </>
  )
}
