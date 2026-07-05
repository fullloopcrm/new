import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBlogPost, getAllBlogSlugs } from '@/app/site/sunnyside-clean-nyc/_lib/seo/blog-data'
import { breadcrumbSchema, localBusinessSchema } from '@/app/site/sunnyside-clean-nyc/_lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import CTABlock from '@/components/marketing/CTABlock'

interface Props {
  params: Promise<{ slug: string }>
}

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}

  const url = `https://www.cleaningservicesunnysideny.com/cleaning-tips-and-tricks/${slug}`
  const title = `${post.title} | Sunnyside Clean NYC`

  return {
    title: { absolute: title },
    description: post.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: post.metaDescription,
      url,
      type: 'article',
      siteName: 'Sunnyside Clean NYC',
      locale: 'en_US',
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: post.metaDescription,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Organization',
      name: 'Sunnyside Clean NYC',
      url: 'https://www.cleaningservicesunnysideny.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sunnyside Clean NYC',
      url: 'https://www.cleaningservicesunnysideny.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.cleaningservicesunnysideny.com/cleaning-tips-and-tricks/${slug}`,
    },
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.cleaningservicesunnysideny.com' },
          { name: 'Blog', url: 'https://www.cleaningservicesunnysideny.com/blog' },
          { name: post.title, url: `https://www.cleaningservicesunnysideny.com/cleaning-tips-and-tricks/${slug}` },
        ]),
        articleSchema,
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="px-3 py-1 bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold tracking-[0.15em] uppercase rounded-full">{post.category}</span>
            <span className="text-blue-200/50 text-sm">{formattedDate}</span>
            <span className="text-blue-200/50 text-sm">&middot;</span>
            <span className="text-blue-200/50 text-sm">{post.readTime} read</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide leading-[0.95] mb-6">
            {post.title}
          </h1>
          <p className="text-blue-200/60 text-lg leading-relaxed max-w-2xl mx-auto">{post.excerpt}</p>
          <p className="text-[#A8F0DC]/60 text-sm font-medium tracking-wide uppercase mt-6">Sunnyside Clean NYC — A NYC Maid Services Company</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { name: 'Blog', href: '/blog' },
          { name: post.title, href: `/cleaning-tips-and-tricks/${slug}` },
        ]} />
      </div>

      {/* Article content */}
      <article className="max-w-3xl mx-auto px-4 pb-20">
        {post.sections.map((section, i) => (
          <div key={i} className="mb-10">
            {section.heading && (
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[#1E2A4A] tracking-wide mb-4 mt-12">
                {section.heading}
              </h2>
            )}
            {section.paragraphs.map((p, j) => (
              <p key={j} className="text-gray-600 text-[17px] leading-relaxed mb-5">
                {p}
              </p>
            ))}
            {section.list && (
              <ul className="space-y-3 mb-5 pl-1">
                {section.list.map((item, k) => (
                  <li key={k} className="flex items-start gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-gray-600 text-[17px] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Divider */}
        <div className="w-16 h-[2px] bg-[#A8F0DC] mx-auto my-12" />

        {/* Bottom CTA */}
        <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-2xl p-8 md:p-10 text-center">
          <p className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[#1E2A4A] tracking-wide mb-3">Ready for a Professionally Clean Home?</p>
          <p className="text-gray-500 max-w-lg mx-auto mb-6">
            Sunnyside Clean NYC provides professional cleaning services across New York City. Licensed, insured, and background-checked cleaners from $59/hr.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://www.thenycmaid.com/book/new" className="bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
              Self Booking $20 OFF
            </a>
            <a href="tel:2122028400" className="text-[#1E2A4A] font-semibold hover:underline underline-offset-4">
              Call (212) 202-8400
            </a>
          </div>
        </div>

        {/* Back to blog */}
        <div className="text-center mt-10">
          <Link href="/cleaning-tips-and-tricks" className="text-[#1E2A4A] font-semibold text-sm hover:underline underline-offset-4">
            &larr; Back to all articles
          </Link>
        </div>
      </article>

      <CTABlock title="Book Your NYC Cleaning Service Today" subtitle="Sunnyside Clean NYC — trusted by New Yorkers across all five boroughs." />
    </>
  )
}
