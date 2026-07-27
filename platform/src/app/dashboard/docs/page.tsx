'use client'

import { useMemo, useState } from 'react'
import { useTenantSettings } from '@/lib/use-tenant-settings'
import { tenantDocCategories } from '@/lib/tenant-docs-content'

// Full-page fallback for the floating Knowledge Panel (see
// src/components/knowledge-panel.tsx) — same content module, same Q&A
// structure, just laid out inline instead of in a slide-over. Reached via
// the "Platform Docs" nav link for anyone who prefers a page over the panel.
export default function DocsPage() {
  const { tenant } = useTenantSettings()
  const agentName = (tenant?.agent_name as string) || 'Selena'
  const categories = useMemo(() => tenantDocCategories(agentName), [agentName])
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.items.length > 0)
  }, [categories, search])

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Knowledge Panel</h2>
      <p className="text-slate-400 text-sm mb-6">
        Everything you need to run your business on Full Loop CRM. The same content is always one click away from the help icon in the top bar of every page.
      </p>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Ask a question or search..."
        className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none mb-8"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No results found</h3>
          <p className="text-gray-400 text-sm">Try a different search term, or ask in Full Loop Support (Loop Connect).</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map(cat => (
            <section key={cat.id}>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">{cat.label}</h3>
              <div className="space-y-4">
                {cat.items.map((item, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold text-slate-900 mb-1">{item.q}</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
