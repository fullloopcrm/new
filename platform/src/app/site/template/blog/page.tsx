import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { blogPosts } from '@/app/site/template/_lib/content/longform'
import { getSeoOverride } from '@/lib/seo/overrides'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const p = industryProfile(config.industry)
  const url = `${config.identity.url}/blog`
  const override = await getSeoOverride(url)
  const title = override?.title || `${config.identity.name} Blog — ${p.serviceLabel} Tips & Guides`
  const description = override?.description || `Practical guides and honest advice about ${p.serviceNoun}: how to choose a company, what to expect, pricing, and more — from ${config.identity.name}.`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  }
}

export default async function BlogIndexPage() {
  const config = await getSiteConfig()
  const p = industryProfile(config.industry)
  const posts = blogPosts(config)

  return (
    <div>
      <section className="bg-[var(--brand)] text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28">
          <p className="text-xs font-semibold text-[var(--accent)] tracking-[0.25em] uppercase mb-4">Blog</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl tracking-wide leading-[0.95] mb-6">
            {p.serviceLabel} Tips &amp; Guides
          </h1>
          <p className="text-white/75 text-lg md:text-xl max-w-2xl">
            Practical, honest advice about {p.serviceNoun} — how to choose a company, what to expect, how pricing works, and how to avoid getting burned. No fluff, just useful guidance from {config.identity.name}.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="border border-gray-200 rounded-2xl p-8 hover:border-[var(--brand)] transition-colors block group"
            >
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[var(--brand)] tracking-wide mb-3 leading-tight">
                {post.page.h1}
              </h2>
              <p className="text-gray-500 text-[15px] leading-relaxed mb-4">{post.excerpt}</p>
              <span className="text-[var(--brand)] font-semibold text-sm tracking-widest uppercase group-hover:underline">
                Read more →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
