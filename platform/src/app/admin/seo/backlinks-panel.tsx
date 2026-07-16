'use client'

import { useEffect, useState } from 'react'

type CitationListing = { description: string; primaryCategory: string; website: string }
type EditorialListing = { title: string; hook: string; anchorTextOptions: string[] }

type Opportunity = {
  id: string
  tenant_id: string | null
  tenant_name: string | null
  property: string
  kind: 'citation' | 'editorial'
  source_key: string
  source_name: string
  source_url: string | null
  category: string | null
  rationale: string | null
  listing: CitationListing | EditorialListing
  proposed_at: string
}

const domainOf = (property: string) => property.replace(/^sc-domain:/, '')

function isCitation(kind: string, listing: Opportunity['listing']): listing is CitationListing {
  return kind === 'citation' && 'description' in listing
}

// Review queue for backlinks.ts's citation/editorial proposals
// (seo_backlink_opportunities, status='proposed'). Approve/reject here only
// updates the ledger row — actual directory submission stays a manual,
// out-of-band step (see backlinks.ts header for why this isn't hub-and-spoke).
export function BacklinksPanel() {
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () =>
    fetch('/api/admin/seo/backlinks')
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j.error || r.statusText))))
      .then((j) => setOpportunities(j.opportunities))
      .catch((e) => setError(String(e)))

  useEffect(() => {
    load()
  }, [])

  async function review(id: string, action: 'approve' | 'reject') {
    setBusy(id)
    try {
      const res = await fetch('/api/admin/seo/backlinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) throw new Error((await res.json()).error || res.statusText)
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }

  if (error) return <div className="text-sm text-rose-600">Couldn’t load backlink proposals: {error}</div>
  if (!opportunities || opportunities.length === 0) return null

  return (
    <div className="mt-8">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-600">
        Backlinks · {opportunities.length} proposals awaiting review
      </p>
      <div className="flex flex-col gap-3">
        {opportunities.map((o) => (
          <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="font-medium text-slate-900">{o.tenant_name ?? domainOf(o.property)}</span>
                <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-slate-400">
                  {o.kind} · {domainOf(o.property)}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => review(o.id, 'reject')}
                  disabled={busy === o.id}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => review(o.id, 'approve')}
                  disabled={busy === o.id}
                  className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {busy === o.id ? 'Saving…' : 'Approve'}
                </button>
              </div>
            </div>

            <div className="mt-3 text-sm">
              <div className="font-mono text-[10px] uppercase tracking-wide text-slate-400">
                {o.source_url ? (
                  <a href={o.source_url} target="_blank" rel="noreferrer" className="hover:text-cyan-600">
                    {o.source_name}
                  </a>
                ) : (
                  o.source_name
                )}
              </div>
              {isCitation(o.kind, o.listing) ? (
                <p className="mt-1 text-slate-700">{o.listing.description}</p>
              ) : (
                <>
                  <div className="mt-1 font-medium text-slate-900">{(o.listing as EditorialListing).title}</div>
                  <p className="mt-1 text-slate-700">{(o.listing as EditorialListing).hook}</p>
                  <div className="mt-1 text-xs text-slate-400">
                    anchors: {(o.listing as EditorialListing).anchorTextOptions.join(' · ')}
                  </div>
                </>
              )}
            </div>
            {o.rationale && <div className="mt-2 text-xs text-slate-400">{o.rationale}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
