// @ts-nocheck
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buildMetadata, breadcrumbSchema, articleSchema, SITE_NAME } from '@/app/site/nyc-classifieds/_lib/seo'
import { blogPosts, getPostBySlug, getAllSlugs, BLOG_CATEGORIES } from '@/app/site/nyc-classifieds/_lib/blog-posts'
import { getSecondarySchemas } from '@/app/site/nyc-classifieds/_lib/blog-schemas'
import BlogPostClient from './BlogPostClient'

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return buildMetadata({
    title: `${post.title} — ${SITE_NAME}`,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    type: 'article',
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  // Estimate read time
  const wordCount = post.content.split(/\s+/).length
  const readTime = Math.max(1, Math.round(wordCount / 250))

  // Strip markdown for articleBody (clean text for AI crawlers)
  const articleBody = post.content
    .replace(/##\s?/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^- /gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()

  const postUrl = `/blog/${post.slug}`
  const schemas = [
    articleSchema({
      title: post.title,
      description: post.excerpt,
      url: postUrl,
      datePublished: post.date,
      author: post.author,
      category: post.category,
      tags: post.tags,
      wordCount,
      articleBody,
    }),
    breadcrumbSchema([
      { name: 'Blog', url: '/blog' },
      { name: post.category, url: '/blog' },
      { name: post.title, url: postUrl },
    ]),
    ...getSecondarySchemas(post.slug, postUrl),
  ]

  // Related posts (same category first, then others)
  const related = [
    ...blogPosts.filter(p => p.slug !== post.slug && p.category === post.category),
    ...blogPosts.filter(p => p.slug !== post.slug && p.category !== post.category),
  ].slice(0, 3)

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <BlogPostClient
        post={post}
        readTime={readTime}
        categories={BLOG_CATEGORIES as unknown as string[]}
        relatedPosts={related}
        allPosts={blogPosts}
      />
    </>
  )
}
