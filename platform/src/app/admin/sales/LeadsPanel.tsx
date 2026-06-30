'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LEAD_STAGES,
  PIPELINE_STAGES,
  STAGE_LABELS,
  type LeadStage,
} from '@/lib/lead-stages'

interface Lead {
  id: string
  business_name: string
  contact_name: string
  email: string
  phone: string
  service_category: string
  city: string
  state: string
  monthly_revenue: string | null
  referral_source: string | null
  pitch: string | null
  status: LeadStage
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
  converted_tenant_id: string | null
}

type Counts = Record<string, number>

const STAGE_BADGE: Record<LeadStage, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-violet-50 text-violet-700 border-violet-200',
  sold: 'bg-teal-50 text-teal-700 border-teal-200',
  onboarded: 'bg-green-50 text-green-700 border-green-200',
  lost: 'bg-slate-100 text-slate-500 border-slate-200',
}

export function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [counts, setCounts] = useState<Counts>({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertErr, setConvertErr] = useState('')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('status', filter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/requests?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLeads(data.requests || [])
      setCounts(data.counts || { total: 0 })
    }
    setLoading(false)
  }, [filter, search])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const selected = leads.find(l => l.id === selectedId) || null

  function selectLead(lead: Lead) {
    setSelectedId(lead.id)
    setNotes(lead.admin_notes || '')
    setSavedFlash(false)
  }

  async function patchLead(body: Record<string, unknown>) {
    setSaving(true)
    const res = await fetch('/api/admin/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      setSavedFlash(true)
      await fetchLeads()
    }
  }

  async function saveNotes() {
    if (!selected) return
    await patchLead({ id: selected.id, admin_notes: notes })
  }

  async function setStage(stage: LeadStage) {
    if (!selected) return
    await patchLead({ id: selected.id, status: stage, admin_notes: notes })
  }

  async function convertToTenant() {
    if (!selected) return
    setConverting(true); setConvertErr('')
    try {
      const res = await fetch('/api/admin/requests/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Convert failed')
      await fetchLeads()
      if (data.tenant?.id) window.open(`/admin/businesses/${data.tenant.id}`, '_blank')
    } catch (e) {
      setConvertErr(e instanceof Error ? e.message : 'Convert failed')
    }
    setConverting(false)
  }

  async function deleteLead() {
    if (!selected) return
    if (!confirm(`Delete ${selected.business_name}? This permanently removes the lead and cannot be undone.`)) return
    setSaving(true)
    const res = await fetch(`/api/admin/requests?id=${selected.id}`, { method: 'DELETE' })
    setSaving(false)
    if (res.ok) {
      setSelectedId(null)
      setNotes('')
      await fetchLeads()
    }
  }

  const filterButtons = ['all', ...LEAD_STAGES]

  return (
    <div>
      {/* Pipeline stat cards (click to filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        <StatCard label="Total" value={counts.total || 0} active={filter === 'all'} onClick={() => setFilter('all')} color="border-l-slate-400" />
        {LEAD_STAGES.map(stage => (
          <StatCard
            key={stage}
            label={STAGE_LABELS[stage]}
            value={counts[stage] || 0}
            active={filter === stage}
            onClick={() => setFilter(stage)}
            color={stage === 'lost' ? 'border-l-slate-300' : 'border-l-teal-500'}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search business, contact, email, city..."
          className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-teal-600"
        />
        {filterButtons.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {f === 'all' ? 'All' : STAGE_LABELS[f as LeadStage]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-5">
        {/* LIST */}
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          {loading ? (
            <p className="text-slate-400 py-12 text-center text-sm">Loading...</p>
          ) : leads.length === 0 ? (
            <p className="text-slate-400 py-12 text-center text-sm">No leads found</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {leads.map(l => (
                <button
                  key={l.id}
                  onClick={() => selectLead(l)}
                  className={`w-full text-left px-4 py-3 transition-colors ${selectedId === l.id ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{l.business_name}</p>
                    <span className={`shrink-0 inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${STAGE_BADGE[l.status]}`}>{STAGE_LABELS[l.status]}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {l.contact_name} &middot; {l.service_category?.replace(/_/g, ' ')} &middot; {l.city}, {l.state}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(l.created_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DETAIL */}
        <div className="border border-slate-100 rounded-xl p-5">
          {!selected ? (
            <p className="text-slate-400 py-12 text-center text-sm">Select a lead to view details</p>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                <div className="min-w-0">
                  <h2 className="text-lg font-heading font-bold text-slate-900 truncate">{selected.business_name}</h2>
                  <p className="text-sm text-slate-500">{selected.contact_name}</p>
                </div>
                <span className={`shrink-0 inline-block px-2.5 py-1 rounded text-xs font-medium border ${STAGE_BADGE[selected.status]}`}>
                  {STAGE_LABELS[selected.status]}
                </span>
              </div>

              {/* Pipeline stepper */}
              <div className="mb-5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Pipeline stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const isCurrent = selected.status === stage
                    const currentIdx = PIPELINE_STAGES.indexOf(selected.status as LeadStage)
                    const isDone = currentIdx > -1 && i < currentIdx
                    return (
                      <button
                        key={stage}
                        onClick={() => setStage(stage)}
                        disabled={saving}
                        className={`flex-1 min-w-[80px] px-2 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                          isCurrent
                            ? 'bg-teal-600 text-white border-teal-600'
                            : isDone
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-teal-400'
                        }`}
                      >
                        {STAGE_LABELS[stage]}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  {selected.status !== 'lost' ? (
                    <button
                      onClick={() => setStage('lost')}
                      disabled={saving}
                      className="text-xs text-slate-500 hover:text-red-600 underline underline-offset-2 disabled:opacity-50"
                    >
                      Mark as Lost
                    </button>
                  ) : (
                    <button
                      onClick={() => setStage('new')}
                      disabled={saving}
                      className="text-xs text-teal-600 hover:text-teal-700 underline underline-offset-2 disabled:opacity-50"
                    >
                      Reopen lead
                    </button>
                  )}
                </div>
              </div>

              {/* Convert to tenant — the Sales spine. Available once Sold/Onboarded. */}
              {selected.converted_tenant_id ? (
                <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <span className="text-xs font-medium text-green-700">✓ This lead is now a tenant</span>
                  <a
                    href={`/admin/businesses/${selected.converted_tenant_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Open tenant →
                  </a>
                </div>
              ) : (selected.status === 'sold' || selected.status === 'onboarded') ? (
                <div className="mb-5">
                  <button
                    onClick={convertToTenant}
                    disabled={converting}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {converting ? 'Creating tenant…' : 'Convert to tenant →'}
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Creates a pending tenant prefilled from this lead, seeds industry defaults, and marks the lead onboarded.
                  </p>
                  {convertErr && <p className="text-xs text-red-600 mt-1">{convertErr}</p>}
                </div>
              ) : null}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
                <Field label="Email">
                  {selected.email ? <a href={`mailto:${selected.email}`} className="text-teal-700 hover:underline break-all">{selected.email}</a> : <span className="text-slate-400">—</span>}
                </Field>
                <Field label="Phone">
                  {selected.phone ? <a href={`tel:${selected.phone}`} className="text-teal-700 hover:underline">{selected.phone}</a> : <span className="text-slate-400">—</span>}
                </Field>
                <Field label="Category"><span className="capitalize">{selected.service_category?.replace(/_/g, ' ') || '—'}</span></Field>
                <Field label="Location">{selected.city}, {selected.state}</Field>
                <Field label="Monthly Revenue">{selected.monthly_revenue || '—'}</Field>
                <Field label="Source">{selected.referral_source || '—'}</Field>
                <Field label="Received">{new Date(selected.created_at).toLocaleString()}</Field>
                <Field label="Last activity">{selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString() : '—'}</Field>
              </dl>

              {selected.pitch && (
                <div className="mb-5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Their message</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{selected.pitch}</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Sales notes</p>
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setSavedFlash(false) }}
                  placeholder="Calls, follow-ups, objections, next steps..."
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-teal-600"
                />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save notes'}
                  </button>
                  {savedFlash && <span className="text-xs text-green-600">Saved</span>}
                </div>
              </div>

              {/* Danger zone */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={deleteLead}
                  disabled={saving}
                  className="text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Delete lead
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, active, onClick, color }: { label: string; value: number; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-left border-l-4 ${color} pl-3 py-2 transition-colors ${active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
    >
      <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate">{label}</p>
      <p className="text-xl font-bold font-mono text-slate-900">{value}</p>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-slate-700 mt-0.5">{children}</dd>
    </div>
  )
}
