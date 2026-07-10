import type { Metadata } from 'next'
import Link from 'next/link'
import { BLOG_POSTS } from '@/app/site/the-florida-maid/_lib/seo/blog-data'
import { breadcrumbSchema, localBusinessSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/the-florida-maid/_components/marketing/Breadcrumbs'
import CTABlock from '@/app/site/the-florida-maid/_components/marketing/CTABlock'

export const metadata: Metadata = {
  title: 'Blog | Florida Cleaning Tips & News | The Florida Maid',
  description: 'The Florida Maid Blog — cleaning tips, guides & news for Florida residents. Home care, eco-friendly products & pro advice. Over 25,000 homes served. From $49/hr. (954) 710-3636',
  alternates: { canonical: 'https://www.thefloridamaid.com/florida-maid-service-blog' },
  openGraph: {
    title: 'Blog | The Florida Maid',
    description: 'Expert cleaning tips and guides for Florida residents.',
    url: 'https://www.thefloridamaid.com/florida-maid-service-blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Florida Cleaning Tips & News | The Florida Maid',
    description: 'Expert cleaning tips and guides for Florida residents.',
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
          { name: 'Home', url: 'https://www.thefloridamaid.com' },
          { name: 'Blog', url: 'https://www.thefloridamaid.com/florida-maid-service-blog' },
        ]),
      ]} />

      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#34D399] tracking-[0.25em] uppercase mb-4">From the Pros</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide mb-4">The Florida Maid Blog</h1>
          <p className="text-white/60 text-lg max-w-3xl mx-auto">Real cleaning advice from people who do this every day — no fluff, no stock photos, just what actually works in Florida homes.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Blog', href: '/florida-maid-service-blog' }]} />

        {/* Featured post */}
        <Link href={`/florida-maid-service-blog/${featured.slug}`} className="group block border border-gray-200 rounded-xl p-8 md:p-10 mb-12 hover:border-[#34D399] hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-[#34D399] bg-[#34D399]/15 px-3 py-1 rounded-full uppercase tracking-widest">{featured.category}</span>
            <span className="text-xs text-gray-400">{new Date(featured.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-xs text-gray-400">{featured.readTime} read</span>
          </div>
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/80 mb-3">{featured.title}</h2>
          <p className="text-gray-600 text-lg max-w-3xl">{featured.excerpt}</p>
          <span className="inline-block mt-4 text-sm font-semibold text-[#CC6222] group-hover:underline underline-offset-4">Read more &rarr;</span>
        </Link>

        {/* All posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {rest.map(post => (
            <Link key={post.slug} href={`/florida-maid-service-blog/${post.slug}`} className="group border border-gray-200 rounded-xl p-6 hover:border-[#34D399] hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-[#CC6222]/60 uppercase tracking-widest">{post.category}</span>
                <span className="text-xs text-gray-400">{new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <h2 className="font-semibold text-[#CC6222] group-hover:text-[#CC6222]/80 mb-2 line-clamp-2">{post.title}</h2>
              <p className="text-gray-500 text-sm line-clamp-3">{post.excerpt}</p>
              <span className="inline-block mt-3 text-xs font-semibold text-[#CC6222] group-hover:underline underline-offset-4">{post.readTime} read &rarr;</span>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-600">
            Looking for practical how-tos? Check out our <Link href="/florida-maid-and-cleaning-tips-and-advice-by-the-florida-maid" className="text-[#CC6222] font-semibold hover:underline">100 cleaning tips</Link> page.
          </p>
        </div>
      </div>

      <CTABlock title="Ready for a Spotless Home?" />
    </>
  )
}
