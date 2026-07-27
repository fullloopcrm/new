'use client'

import { useMemo, useState } from 'react'
import { useTenantSettings } from '@/lib/use-tenant-settings'
import { tenantDocCategories, type DocCategory } from '@/lib/tenant-docs-content'

// Floating "knowledge panel" — a single button (topbar icon, matches the
// settings-gear and notification-bell buttons next to it) that opens a
// searchable Q&A slide-over. Self-contained: no provider needed, drop
// <KnowledgePanelButton /> anywhere once. Content lives in
// src/lib/tenant-docs-content.ts so the full-page fallback at
// /dashboard/docs renders the identical data — one source of truth.
export function KnowledgePanelButton() {
  const [open, setOpen] = useState(false)
  const { tenant } = useTenantSettings()
  const agentName = (tenant?.agent_name as string) || 'Selena'
  const categories = useMemo(() => tenantDocCategories(agentName), [agentName])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open help & knowledge panel"
        title="Help & knowledge panel"
        className="relative flex-shrink-0 flex items-center justify-center rounded-md transition-transform hover:scale-105"
        style={{
          width: 32,
          height: 32,
          background: open ? 'var(--color-loop-ink)' : 'rgba(0,0,0,0.05)',
          color: open ? '#fff' : 'var(--color-loop-muted)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9.879 7.519a3 3 0 015.657 1.09c0 1.5-1.5 2.25-2.25 2.842A2.25 2.25 0 0012 13.5" />
          <circle cx="12" cy="12" r="9" />
          <path d="M12 17h.01" strokeLinecap="round" />
        </svg>
      </button>
      {open && <KnowledgePanelOverlay categories={categories} onClose={() => setOpen(false)} />}
    </>
  )
}

function KnowledgePanelOverlay({ categories, onClose }: { categories: DocCategory[]; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.items.length > 0 && (!activeCategory || cat.id === activeCategory))
  }, [categories, search, activeCategory])

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Knowledge panel">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(28,28,28,0.35)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="relative h-full w-full sm:w-[440px] flex flex-col"
        style={{ background: 'var(--color-loop-bg)', borderLeft: '1px solid var(--color-loop-ink)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: '1px solid var(--color-loop-line)' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em', color: 'var(--color-loop-ink)' }}>
              Knowledge Panel
            </h2>
            <p style={{ fontSize: 11.5, color: 'var(--color-loop-muted)', marginTop: 2 }}>
              Everything about running your business on Full Loop
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close knowledge panel"
            className="flex items-center justify-center rounded-md"
            style={{ width: 28, height: 28, color: 'var(--color-loop-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-5 pt-3 pb-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ask a question or search..."
            className="w-full px-3 py-2 rounded-md text-sm outline-none"
            style={{ border: '1px solid var(--color-loop-line)', background: 'var(--color-loop-canvas)', color: 'var(--color-loop-ink)' }}
            autoFocus
          />
        </div>

        <div className="px-5 pb-3 flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className="flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium"
            style={{
              fontFamily: 'var(--mono)',
              background: activeCategory === null ? 'var(--color-loop-ink)' : 'transparent',
              color: activeCategory === null ? '#fff' : 'var(--color-loop-muted)',
              border: '1px solid var(--color-loop-line)',
            }}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap"
              style={{
                fontFamily: 'var(--mono)',
                background: activeCategory === cat.id ? 'var(--color-loop-ink)' : 'transparent',
                color: activeCategory === cat.id ? '#fff' : 'var(--color-loop-muted)',
                border: '1px solid var(--color-loop-line)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--color-loop-muted)', fontSize: 13 }}>
              No matches. Try a different search, or ask in Full Loop Support (Loop Connect).
            </div>
          ) : (
            filtered.map(cat => (
              <div key={cat.id} className="mb-5">
                <h3
                  className="mb-2 pb-1"
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'var(--color-loop-muted)', borderBottom: '1px solid var(--color-loop-line-soft)',
                  }}
                >
                  {cat.label}
                </h3>
                <div className="space-y-3">
                  {cat.items.map((item, i) => (
                    <details key={i} className="group" style={{ borderBottom: '1px solid var(--color-loop-line-soft)' }}>
                      <summary
                        className="cursor-pointer list-none py-2 flex items-start justify-between gap-2"
                        style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-loop-ink)' }}
                      >
                        {item.q}
                        <span className="flex-shrink-0 transition-transform group-open:rotate-180" style={{ color: 'var(--color-loop-muted-2)' }}>▾</span>
                      </summary>
                      <p className="pb-3" style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-loop-graphite)' }}>
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
