'use client'

import { useEffect, useState } from 'react'
import '../sales.css'

// Categories — the shared tree used by Catalog, Vendors, and Inventory.
// Each category can optionally point at a default revenue and/or COGS
// chart-of-accounts entry, so tagging an item tells the system which GL
// bucket it belongs in.
type Category = {
  id: string
  name: string
  parent_id: string | null
  default_revenue_account_id: string | null
  default_cogs_account_id: string | null
  active: boolean
}

type Account = { id: string; code: string; name: string; type: string }

type Draft = { name: string; parent_id: string; default_revenue_account_id: string; default_cogs_account_id: string }
const EMPTY_DRAFT: Draft = { name: '', parent_id: '', default_revenue_account_id: '', default_cogs_account_id: '' }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/categories').then((r) => r.json()).catch(() => ({ categories: [] })),
      fetch('/api/finance/chart-of-accounts').then((r) => r.json()).catch(() => ({ accounts: [] })),
    ])
      .then(([c, a]) => {
        setCategories(c?.categories || [])
        setAccounts(a?.accounts || [])
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const revenueAccounts = accounts.filter((a) => a.type === 'income')
  const cogsAccounts = accounts.filter((a) => a.type === 'expense')
  const byId = new Map(categories.map((c) => [c.id, c]))
  const topLevel = categories.filter((c) => !c.parent_id)
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id)

  async function createCategory() {
    setErr('')
    if (!draft.name.trim()) { setErr('Name the category.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          parent_id: draft.parent_id || null,
          default_revenue_account_id: draft.default_revenue_account_id || null,
          default_cogs_account_id: draft.default_cogs_account_id || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not create category.'); return }
      setDraft(EMPTY_DRAFT); load()
    } finally { setSaving(false) }
  }

  function startEdit(c: Category) {
    setEditingId(c.id)
    setEditDraft({
      name: c.name, parent_id: c.parent_id || '',
      default_revenue_account_id: c.default_revenue_account_id || '',
      default_cogs_account_id: c.default_cogs_account_id || '',
    })
  }

  async function saveEdit(id: string) {
    await fetch('/api/categories', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, name: editDraft.name, parent_id: editDraft.parent_id || null,
        default_revenue_account_id: editDraft.default_revenue_account_id || null,
        default_cogs_account_id: editDraft.default_cogs_account_id || null,
      }),
    })
    setEditingId(null)
    load()
  }

  async function removeCategory(id: string) {
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    load()
  }

  const inp: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 14, width: '100%', background: '#fff', color: 'var(--sl-ink)' }
  const label: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }

  function renderRow(c: Category, depth: number) {
    const revenue = accounts.find((a) => a.id === c.default_revenue_account_id)
    const cogs = accounts.find((a) => a.id === c.default_cogs_account_id)
    return (
      <div key={c.id}>
        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--sl-line,#eee)', paddingLeft: depth * 24 }}>
          {editingId === c.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={grid3}>
                <input style={inp} value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} placeholder="Name" />
                <select style={inp} value={editDraft.default_revenue_account_id} onChange={(e) => setEditDraft({ ...editDraft, default_revenue_account_id: e.target.value })}>
                  <option value="">No revenue account</option>
                  {revenueAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                </select>
                <select style={inp} value={editDraft.default_cogs_account_id} onChange={(e) => setEditDraft({ ...editDraft, default_cogs_account_id: e.target.value })}>
                  <option value="">No COGS account</option>
                  {cogsAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="sl-newlead-btn" onClick={() => saveEdit(c.id)}>Save</button>
                <button type="button" onClick={() => setEditingId(null)} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--sl-muted)', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--sl-display)', fontSize: 15, fontWeight: 600, color: 'var(--sl-ink)', minWidth: 180 }}>{c.name}</span>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--sl-muted)' }}>
                {revenue ? `Revenue → ${revenue.code} ${revenue.name}` : ''}
                {revenue && cogs ? ' · ' : ''}
                {cogs ? `COGS → ${cogs.code} ${cogs.name}` : ''}
                {!revenue && !cogs ? 'No GL account linked' : ''}
              </span>
              <button type="button" onClick={() => startEdit(c)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--sl-ink)', cursor: 'pointer' }}>Edit</button>
              <button type="button" onClick={() => removeCategory(c.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
            </div>
          )}
        </div>
        {childrenOf(c.id).map((child) => renderRow(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="sl-scope">
      <div className="sl-section-head" style={{ marginTop: 6 }}>
        <h2 className="sl-section-title">Categories<em>.</em></h2>
        <span className="sl-section-meta">{categories.length} categor{categories.length === 1 ? 'y' : 'ies'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 16px' }}>
        Shared across Catalog, Vendors, and Inventory. Link a category to a chart-of-accounts revenue/COGS account so tagging an item tells the system which ledger bucket it belongs in.
      </p>

      {/* CREATE */}
      <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ ...grid3, marginBottom: 12 }}>
          <div>
            <label style={label}>Category name</label>
            <input style={inp} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Hardscaping Materials" />
          </div>
          <div>
            <label style={label}>Parent category</label>
            <select style={inp} value={draft.parent_id} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })}>
              <option value="">None — top level</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div />
        </div>
        <div style={{ ...grid3, marginBottom: 12 }}>
          <div>
            <label style={label}>Default revenue account</label>
            <select style={inp} value={draft.default_revenue_account_id} onChange={(e) => setDraft({ ...draft, default_revenue_account_id: e.target.value })}>
              <option value="">No revenue account</option>
              {revenueAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Default COGS account</label>
            <select style={inp} value={draft.default_cogs_account_id} onChange={(e) => setDraft({ ...draft, default_cogs_account_id: e.target.value })}>
              <option value="">No COGS account</option>
              {cogsAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
          </div>
          <div />
        </div>
        {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button type="button" className="sl-newlead-btn" disabled={saving} onClick={createCategory}>{saving ? 'Adding…' : '+ Add category'}</button>
      </div>

      {/* LIST */}
      {loading && <div className="sl-empty">Loading…</div>}
      {!loading && categories.length === 0 && <div className="sl-empty">No categories yet — add your first above.</div>}
      {topLevel.map((c) => renderRow(c, 0))}
    </div>
  )
}
