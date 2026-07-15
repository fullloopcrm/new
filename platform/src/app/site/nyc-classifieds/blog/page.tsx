import type { Metadata } from 'next'
import { buildMetadata, breadcrumbSchema, SITE_NAME, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'
import { blogPosts, BLOG_CATEGORIES } from '@/app/site/nyc-classifieds/_lib/blog-posts'
import BlogIndexClient from './BlogIndexClient'

export const metadata: Metadata = buildMetadata({
  title: `Blog — ${SITE_NAME}`,
  description: 'News, stories, and updates from NYC Classifieds. Learn about our features, verification process, community, and what makes us different.',
  path: '/blog',
})

function blogListSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Blog — ${SITE_NAME}`,
    description: 'News, stories, and updates from NYC Classifieds.',
    url: `${SITE_URL}/blog`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: blogPosts.length,
      itemListElement: blogPosts.map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  }
}

export default function BlogIndexPage() {
  const schemas = [
    blogListSchema(),
    breadcrumbSchema([{ name: 'Blog', url: '/blog' }]),
  ]

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s).replace(/</g, '\\u003c') }} />
      ))}
      <BlogIndexClient
        posts={blogPosts}
        categories={BLOG_CATEGORIES as unknown as string[]}
      />
    </>
  )
}
