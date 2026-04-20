import type { Metadata } from 'next'
import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/seo/blog-data'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const title = `Blog | ${name}`
  const description = `${name} blog — tips, guides and news for our customers.${phone ? ` Call ${phone}.` : ''}`
  return {
    title,
    description,
    ...(base && { alternates: { canonical: `${base}/nyc-maid-service-blog` } }),
    openGraph: {
      title,
      description,
      ...(base && { url: `${base}/nyc-maid-service-blog` }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function BlogIndexPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const base = tenantSiteUrl(tenant)
  const featured = BLOG_POSTS[0]
  const rest = BLOG_POSTS.slice(1)

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          ...(base ? [{ name: 'Home', url: base }] : []),
          { name: 'Blog', url: `${base}/nyc-maid-service-blog` },
        ]),
      ]} />

      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[var(--brand-accent)] tracking-[0.25em] uppercase mb-4">From the Pros</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide mb-4">{name} Blog</h1>
          <p className="text-white/60 text-lg max-w-3xl mx-auto">Real advice from people who do this every day — no fluff, no stock photos, just what actually works.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Blog', href: '/nyc-maid-service-blog' }]} />

        {/* Featured post */}
        <Link href={`/nyc-maid-service-blog/${featured.slug}`} className="group block border border-gray-200 rounded-xl p-8 md:p-10 mb-12 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-[var(--brand-accent)] bg-[var(--brand-accent)]/15 px-3 py-1 rounded-full uppercase tracking-widest">{featured.category}</span>
            <span className="text-xs text-gray-400">{new Date(featured.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-xs text-gray-400">{featured.readTime} read</span>
          </div>
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[var(--brand)] tracking-wide group-hover:text-[var(--brand)]/80 mb-3">{featured.title}</h2>
          <p className="text-gray-600 text-lg max-w-3xl">{featured.excerpt}</p>
          <span className="inline-block mt-4 text-sm font-semibold text-[var(--brand)] group-hover:underline underline-offset-4">Read more &rarr;</span>
        </Link>

        {/* All posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {rest.map(post => (
            <Link key={post.slug} href={`/nyc-maid-service-blog/${post.slug}`} className="group border border-gray-200 rounded-xl p-6 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-[var(--brand)]/60 uppercase tracking-widest">{post.category}</span>
                <span className="text-xs text-gray-400">{new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <h2 className="font-semibold text-[var(--brand)] group-hover:text-[var(--brand)]/80 mb-2 line-clamp-2">{post.title}</h2>
              <p className="text-gray-500 text-sm line-clamp-3">{post.excerpt}</p>
              <span className="inline-block mt-3 text-xs font-semibold text-[var(--brand)] group-hover:underline underline-offset-4">{post.readTime} read &rarr;</span>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-600">
            Looking for practical how-tos? Check out our <Link href="/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid" className="text-[var(--brand)] font-semibold hover:underline">tips &amp; advice</Link> page.
          </p>
        </div>
      </div>

      <CTABlock title="Ready to Book?" phone={tenant?.phone || ''} />
    </>
  )
}
