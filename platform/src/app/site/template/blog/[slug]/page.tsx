import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { blogPosts } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { getSeoOverride } from '@/lib/seo/overrides'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const config = await getSiteConfig()
  const post = blogPosts(config).find((x) => x.slug === slug)
  if (!post) return {}
  const c = post.page
  const url = `${config.identity.url}/blog/${slug}`
  const override = await getSeoOverride(url)
  const title = override?.title || c.title
  const description = override?.description || c.metaDescription
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = await getSiteConfig()
  const post = blogPosts(config).find((x) => x.slug === slug)
  if (!post) notFound()

  return (
    <LongformArticle
      config={config}
      content={post.page}
      eyebrow="Blog"
      ctaHeading="Have a Question?"
      ctaBody="Text us with your situation and we'll give you a straight answer — no pressure, no obligation."
    />
  )
}
