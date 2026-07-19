'use client'

import { useMemo, useState } from 'react'

interface KBEntry {
  q: string
  a: string
}

interface KBCategory {
  category: string
  entries: KBEntry[]
}

export default function KnowledgePanel({ categories }: { categories: KBCategory[] }) {
  const [query, setQuery] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(categories[0]?.category ?? null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories
      .map((c) => ({
        category: c.category,
        entries: c.entries.filter((e) => e.q.toLowerCase().includes(q) || e.a.toLowerCase().includes(q)),
      }))
      .filter((c) => c.entries.length > 0)
  }, [categories, query])

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-sm mb-2">Knowledge Base</h3>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pricing, services, policies…"
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-400 text-sm">No matches — try a different search.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((c) => (
            <div key={c.category}>
              <button
                type="button"
                onClick={() => setOpenCategory(openCategory === c.category ? null : c.category)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                {c.category}
                <span className="text-gray-400">{openCategory === c.category || query ? '−' : '+'}</span>
              </button>
              {(openCategory === c.category || query) && (
                <div className="px-4 pb-3 space-y-3">
                  {c.entries.map((e) => (
                    <div key={e.q}>
                      <p className="text-sm font-medium text-gray-800">{e.q}</p>
                      <p className="text-sm text-gray-500">{e.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
