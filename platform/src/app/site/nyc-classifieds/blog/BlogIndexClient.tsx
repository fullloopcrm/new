// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { BlogPost } from '@/app/site/nyc-classifieds/_lib/blog-posts'

function useIsMobile(bp = 640) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const c = () => setM(window.innerWidth < bp)
    c()
    window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [bp])
  return m
}

export default function BlogIndexClient({
  posts,
  categories,
}: {
  posts: BlogPost[]
  categories: string[]
}) {
  const [active, setActive] = useState('All Posts')
  const mobile = useIsMobile()

  const filtered = active === 'All Posts'
    ? posts
    : posts.filter(p => p.category === active)

  return (
    <main style={{ maxWidth: '1050px', margin: '0 auto', padding: mobile ? '20px 16px 48px' : '40px 20px 64px', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: mobile ? '16px' : '24px' }}>
        <Link href="/" style={{ color: '#2563eb' }}>Home</Link>
        <span style={{ margin: '0 6px' }}>&rsaquo;</span>
        <span style={{ color: '#111827' }}>Blog</span>
      </nav>

      {/* Header */}
      <h1 style={{ fontSize: mobile ? '1.5rem' : '2.25rem', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
        The NYC Classifieds Blog
      </h1>
      <p style={{ fontSize: mobile ? '0.875rem' : '1rem', color: '#6b7280', marginBottom: mobile ? '20px' : '40px' }}>
        Building NYC&apos;s free classifieds & community platform. One update at a time.
      </p>

      {/* Mobile: horizontal category pills */}
      {mobile && (
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '20px',
          borderBottom: '1px solid #e5e7eb',
          WebkitOverflowScrolling: 'touch',
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: '20px',
                border: active === cat ? '1px solid #2563eb' : '1px solid #e5e7eb',
                backgroundColor: active === cat ? '#eff6ff' : '#fff',
                color: active === cat ? '#2563eb' : '#374151',
                fontWeight: active === cat ? 600 : 400,
                fontSize: '0.8125rem',
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {!mobile && <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '32px' }} />}

      {/* Two column on desktop, single on mobile */}
      <div style={{ display: 'flex', gap: '48px' }}>
        {/* Sidebar — desktop only */}
        {!mobile && (
          <aside style={{ width: '180px', flexShrink: 0 }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#6b7280',
              marginBottom: '12px',
            }}>
              Categories
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    padding: '6px 0',
                    fontSize: '0.9375rem',
                    fontFamily: "'DM Sans', sans-serif",
                    color: active === cat ? '#2563eb' : '#374151',
                    fontWeight: active === cat ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Posts */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0 && (
            <p style={{ color: '#6b7280', padding: '20px 0' }}>No posts in this category yet.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
            {filtered.map(post => (
              <article key={post.slug} style={{ paddingBottom: '36px', borderBottom: '1px solid #f3f4f6' }}>
                {/* Category badge + date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#2563eb',
                    border: '1px solid #dbeafe',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    backgroundColor: '#eff6ff',
                  }}>
                    {post.category}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                    {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                {/* Title */}
                <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                  <h2 style={{ fontSize: mobile ? '1.125rem' : '1.5rem', fontWeight: 600, color: '#111827', marginBottom: '8px', lineHeight: 1.3 }}>
                    {post.title}
                  </h2>
                </Link>

                {/* Excerpt */}
                <p style={{ color: '#4b5563', lineHeight: 1.7, marginBottom: '12px', fontSize: '0.9375rem' }}>
                  {post.excerpt}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {post.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #f3f4f6',
                      borderRadius: '4px',
                      padding: '2px 8px',
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* Footer message */}
          <div style={{
            marginTop: '48px',
            padding: '24px',
            border: '2px dashed #e5e7eb',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '0.9375rem',
          }}>
            More updates coming soon. We&apos;re just getting started.
          </div>
        </div>
      </div>
    </main>
  )
}
