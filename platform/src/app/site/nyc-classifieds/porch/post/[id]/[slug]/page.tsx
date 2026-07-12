import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { buildMetadata } from '@/app/site/nyc-classifieds/_lib/seo'
import PorchPostClient from './PorchPostClient'

interface PostData {
  title?: string
  body?: string
  created_at?: string
  updated_at?: string
  borough_slug?: string
  neighborhood_slug?: string
  user?: { name?: string }
  reply_count?: number
  replies?: { body: string; created_at: string; users: { name: string } }[]
}

async function fetchPost(id: string): Promise<PostData | null> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com'
  try {
    // Try the single-post endpoint first (includes replies)
    const res = await fetch(`${siteUrl}/api/porch/${id}`, { next: { revalidate: 60 } })
    if (res.ok) {
      const data = await res.json()
      if (data.post) {
        return { ...data.post, replies: data.replies || [], user: data.post.users }
      }
    }
    // Fallback to list endpoint
    const res2 = await fetch(`${siteUrl}/api/porch?post_id=${id}`, { next: { revalidate: 60 } })
    if (!res2.ok) return null
    const data2 = await res2.json()
    return data2.posts?.[0] || data2.post || null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug: string }> }): Promise<Metadata> {
  const { id, slug } = await params

  const post = await fetchPost(id)
  if (post) {
    const titleText = post.title || slug.replace(/-/g, ' ')
    const neighborhood = post.neighborhood_slug?.replace(/-/g, ' ') || ''
    const borough = post.borough_slug?.replace(/-/g, ' ') || ''
    const location = neighborhood && borough ? ` in ${neighborhood}, ${borough}` : ''
    return buildMetadata({
      title: `${titleText}${location} — The Porch | NYC Classifieds`,
      description: post.body?.slice(0, 160) || `Community discussion${location} on The Porch.`,
      path: `/porch/post/${id}/${slug}`,
    })
  }

  const readableSlug = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  return buildMetadata({
    title: `${readableSlug} — The Porch | NYC Classifieds`,
    description: `Community discussion on The Porch. Join the conversation with your NYC neighbors.`,
    path: `/porch/post/${id}/${slug}`,
  })
}

export default async function PorchPostPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com'

  const post = await fetchPost(id)

  const readableSlug = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  const authorName = post?.user?.name || 'NYC Resident'
  const headline = post?.title || readableSlug
  const neighborhood = post?.neighborhood_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || ''
  const borough = post?.borough_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || ''

  const forumLd = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline,
    text: post?.body || readableSlug,
    url: `${siteUrl}/porch/post/${id}/${slug}`,
    datePublished: post?.created_at || new Date().toISOString(),
    ...(post?.updated_at && { dateModified: post.updated_at }),
    author: { '@type': 'Person', name: authorName },
    ...(post?.replies && post.replies.length > 0 && {
      commentCount: post.replies.length,
      comment: post.replies.map(r => ({
        '@type': 'Comment',
        text: r.body,
        datePublished: r.created_at,
        author: { '@type': 'Person', name: r.users?.name || 'NYC Resident' },
      })),
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post.replies.length,
      },
    }),
    ...(post?.reply_count != null && !post?.replies?.length && { commentCount: post.reply_count }),
    ...(neighborhood && borough && {
      spatialCoverage: {
        '@type': 'Place',
        name: `${neighborhood}, ${borough}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: borough,
          addressRegion: 'NY',
          addressCountry: 'US',
        },
      },
    }),
    isPartOf: {
      '@type': 'DiscussionForum',
      name: 'The Porch — NYC Neighborhood Feed',
      url: `${siteUrl}/porch`,
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'The Porch', item: `${siteUrl}/porch` },
      { '@type': 'ListItem', position: 3, name: headline, item: `${siteUrl}/porch/post/${id}/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(forumLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
        <PorchPostClient postId={id} />
      </Suspense>
    </>
  )
}
