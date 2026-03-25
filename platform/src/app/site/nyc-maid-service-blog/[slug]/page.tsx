import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BLOG_POSTS, getBlogPost, getAllBlogSlugs } from '@/lib/seo/blog-data'
import { breadcrumbSchema, localBusinessSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import CTABlock from '@/components/marketing/CTABlock'

export function generateStaticParams() {
  return getAllBlogSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}

  return {
    title: `${post.title} | The NYC Maid`,
    description: post.metaDescription,
    alternates: { canonical: `https://www.thenycmaid.com/nyc-maid-service-blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://www.thenycmaid.com/nyc-maid-service-blog/${post.slug}`,
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
    author: { '@type': 'Organization', name: 'The NYC Maid', url: 'https://www.thenycmaid.com' },
    publisher: { '@type': 'Organization', name: 'The NYC Maid', url: 'https://www.thenycmaid.com' },
    mainEntityOfPage: `https://www.thenycmaid.com/nyc-maid-service-blog/${post.slug}`,
  }

  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Blog', url: 'https://www.thenycmaid.com/nyc-maid-service-blog' },
          { name: post.title, url: `https://www.thenycmaid.com/nyc-maid-service-blog/${post.slug}` },
        ]),
        articleSchema,
      ]} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-xs font-medium text-[#A8F0DC] bg-[#A8F0DC]/15 px-3 py-1 rounded-full uppercase tracking-widest">{post.category}</span>
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
                <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mt-10 mb-4">{section.heading}</h2>
              )}
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-gray-700 leading-relaxed mb-4 [&_a]:text-[#1E2A4A] [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[#A8F0DC] hover:[&_a]:decoration-[#1E2A4A]" dangerouslySetInnerHTML={{ __html: p }} />
              ))}
              {section.list && (
                <ul className="space-y-2 mb-4">
                  {section.list.map((item, k) => (
                    <li key={k} className="flex items-start gap-3">
                      <span className="text-[#A8F0DC] mt-1 flex-shrink-0">&#10003;</span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* CTA mid-article */}
        <div className="bg-[#1E2A4A] rounded-xl p-8 my-12 text-center">
          <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-2">Need Help With This?</h3>
          <p className="text-white/70 mb-6">Our professional team handles all of this and more — starting at $49/hr.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="tel:2122028400" className="bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Call (212) 202-8400
            </a>
            <a href="sms:2122028400" className="text-white font-semibold hover:underline underline-offset-4">
              or Text Us
            </a>
          </div>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-16">
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-6">Keep Reading</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map(r => (
                <Link key={r.slug} href={`/nyc-maid-service-blog/${r.slug}`} className="group border border-gray-200 rounded-xl p-6 hover:border-[#A8F0DC] hover:shadow-lg transition-all">
                  <span className="text-xs font-medium text-[#1E2A4A]/60 uppercase tracking-widest">{r.category}</span>
                  <h4 className="font-semibold text-[#1E2A4A] group-hover:text-[#1E2A4A]/80 mt-2 line-clamp-2">{r.title}</h4>
                  <p className="text-gray-500 text-sm mt-2 line-clamp-2">{r.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <CTABlock title="Ready for a Spotless Home?" />
    </>
  )
}
