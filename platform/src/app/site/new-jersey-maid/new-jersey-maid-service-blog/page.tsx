import type { Metadata } from 'next'
import Link from 'next/link'
import { BLOG_POSTS } from '@/app/site/new-jersey-maid/_lib/seo/blog-data'
import { breadcrumbSchema, localBusinessSchema } from '@/app/site/new-jersey-maid/_lib/seo/schema'
import JsonLd from '@/app/site/new-jersey-maid/_components/JsonLd'
import Breadcrumbs from '@/app/site/new-jersey-maid/_components/Breadcrumbs'
import CTABlock from '@/app/site/new-jersey-maid/_components/CTABlock'

export const metadata: Metadata = {
  title: 'Blog | New Jersey Cleaning Tips & News | The New Jersey Maid',
  description: 'The New Jersey Maid blog — cleaning tips, guides & news for New Jersey residents. Apartment care, eco-friendly products & pro advice. Service from $59/hr. (973) 370-8800',
  alternates: { canonical: 'https://www.thenewjerseymaid.com/new-jersey-maid-service-blog' },
  openGraph: {
    title: 'Blog | The New Jersey Maid',
    description: 'Expert cleaning tips and guides for New Jersey residents.',
    url: 'https://www.thenewjerseymaid.com/new-jersey-maid-service-blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | New Jersey Cleaning Tips & News | The New Jersey Maid',
    description: 'Expert cleaning tips and guides for New Jersey residents.',
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
          { name: 'Home', url: 'https://www.thenewjerseymaid.com' },
          { name: 'Blog', url: 'https://www.thenewjerseymaid.com/new-jersey-maid-service-blog' },
        ]),
      ]} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.25em] uppercase mb-4">From the Pros</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide mb-4">The New Jersey Maid Blog</h1>
          <p className="text-white/60 text-lg max-w-3xl mx-auto">Real cleaning advice from people who do this every day — no fluff, no stock photos, just what actually works in New Jersey apartments.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Blog', href: '/new-jersey-maid-service-blog' }]} />

        {/* Featured post */}
        <Link href={`/new-jersey-maid-service-blog/${featured.slug}`} className="group block border border-gray-200 rounded-xl p-8 md:p-10 mb-12 hover:border-[#A8F0DC] hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-[#A8F0DC] bg-[#A8F0DC]/15 px-3 py-1 rounded-full uppercase tracking-widest">{featured.category}</span>
            <span className="text-xs text-gray-400">{new Date(featured.date + 'T12:00:00').toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-xs text-gray-400">{featured.readTime} read</span>
          </div>
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/80 mb-3">{featured.title}</h2>
          <p className="text-gray-600 text-lg max-w-3xl">{featured.excerpt}</p>
          <span className="inline-block mt-4 text-sm font-semibold text-[#1E2A4A] group-hover:underline underline-offset-4">Read more &rarr;</span>
        </Link>

        {/* All posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {rest.map(post => (
            <Link key={post.slug} href={`/new-jersey-maid-service-blog/${post.slug}`} className="group border border-gray-200 rounded-xl p-6 hover:border-[#A8F0DC] hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-[#1E2A4A]/60 uppercase tracking-widest">{post.category}</span>
                <span className="text-xs text-gray-400">{new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })}</span>
              </div>
              <h2 className="font-semibold text-[#1E2A4A] group-hover:text-[#1E2A4A]/80 mb-2 line-clamp-2">{post.title}</h2>
              <p className="text-gray-500 text-sm line-clamp-3">{post.excerpt}</p>
              <span className="inline-block mt-3 text-xs font-semibold text-[#1E2A4A] group-hover:underline underline-offset-4">{post.readTime} read &rarr;</span>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-600">
            Looking for practical how-tos? Check out our <Link href="/new-jersey-maid-and-cleaning-tips-and-advice-by-the-new-jersey-maid" className="text-[#1E2A4A] font-semibold hover:underline">100 cleaning tips</Link> page.
          </p>
        </div>
      </div>

      <CTABlock title="Ready for a Spotless Home?" />
    </>
  )
}
