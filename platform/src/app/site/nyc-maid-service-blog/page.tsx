import type { Metadata } from 'next'
import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/seo/blog-data'
import { breadcrumbSchema, localBusinessSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import CTABlock from '@/components/marketing/CTABlock'

export const metadata: Metadata = {
  title: 'Blog | NYC Cleaning Tips & News | The NYC Maid',
  description: 'The NYC Maid blog — cleaning tips, guides & news for NYC residents. Apartment care, eco-friendly products & pro advice. Service from $49/hr. (212) 202-8400',
  alternates: { canonical: 'https://www.thenycmaid.com/nyc-maid-service-blog' },
  openGraph: {
    title: 'Blog | The NYC Maid',
    description: 'Expert cleaning tips and guides for NYC residents.',
    url: 'https://www.thenycmaid.com/nyc-maid-service-blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | NYC Cleaning Tips & News | The NYC Maid',
    description: 'Expert cleaning tips and guides for NYC residents.',
  },
}

export default function BlogIndexPage() {
  const featured = BLOG_POSTS[0]
  const rest = BLOG_POSTS.slice(1)

  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Blog', url: 'https://www.thenycmaid.com/nyc-maid-service-blog' },
        ]),
      ]} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.25em] uppercase mb-4">From the Pros</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide mb-4">The NYC Maid Blog</h1>
          <p className="text-white/60 text-lg max-w-3xl mx-auto">Real cleaning advice from people who do this every day — no fluff, no stock photos, just what actually works in NYC apartments.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Blog', href: '/nyc-maid-service-blog' }]} />

        {/* Featured post */}
        <Link href={`/nyc-maid-service-blog/${featured.slug}`} className="group block border border-gray-200 rounded-xl p-8 md:p-10 mb-12 hover:border-[#A8F0DC] hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-[#A8F0DC] bg-[#A8F0DC]/15 px-3 py-1 rounded-full uppercase tracking-widest">{featured.category}</span>
            <span className="text-xs text-gray-400">{new Date(featured.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-xs text-gray-400">{featured.readTime} read</span>
          </div>
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/80 mb-3">{featured.title}</h2>
          <p className="text-gray-600 text-lg max-w-3xl">{featured.excerpt}</p>
          <span className="inline-block mt-4 text-sm font-semibold text-[#1E2A4A] group-hover:underline underline-offset-4">Read more &rarr;</span>
        </Link>

        {/* All posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {rest.map(post => (
            <Link key={post.slug} href={`/nyc-maid-service-blog/${post.slug}`} className="group border border-gray-200 rounded-xl p-6 hover:border-[#A8F0DC] hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-[#1E2A4A]/60 uppercase tracking-widest">{post.category}</span>
                <span className="text-xs text-gray-400">{new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <h2 className="font-semibold text-[#1E2A4A] group-hover:text-[#1E2A4A]/80 mb-2 line-clamp-2">{post.title}</h2>
              <p className="text-gray-500 text-sm line-clamp-3">{post.excerpt}</p>
              <span className="inline-block mt-3 text-xs font-semibold text-[#1E2A4A] group-hover:underline underline-offset-4">{post.readTime} read &rarr;</span>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-600">
            Looking for practical how-tos? Check out our <Link href="/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid" className="text-[#1E2A4A] font-semibold hover:underline">100 cleaning tips</Link> page.
          </p>
        </div>
      </div>

      <CTABlock title="Ready for a Spotless Home?" />
    </>
  )
}
