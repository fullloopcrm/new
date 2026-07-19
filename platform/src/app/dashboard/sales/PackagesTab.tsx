'use client'

import { useEffect, useState } from 'react'
import HelpTip from '../_components/HelpTip'

/**
 * Master Catalog — Packages. A package bundles several existing catalog
 * items (services / projects / products) under one package title +
 * description. On a Proposal, picking a package auto-fills the title,
 * description, and every line item (each keeping its own catalog
 * description) in one action. Talks to /api/catalog/packages
 * (catalog_packages table) and reads the item list from /api/catalog.
 */

type CatalogItem = { id: string; name: string; description: string | null; price_cents: number; per_unit: string; active: boolean }

type PackageItem = {
  id: string
  catalog_item_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price_cents: number
}

type Package = {
  id: string
  name: string
  description: string | null
  items: PackageItem[]
  active: boolean
}

function money(cents: number | null | undefined): string {
  return '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
}
function newPackageItem(it: CatalogItem): PackageItem {
  return { id: `pi_${Math.random().toString(36).slice(2, 10)}`, catalog_item_id: it.id, name: it.name, description: it.description || null, quantity: 1, unit_price_cents: it.price_cents }
}
function packageTotal(items: PackageItem[]): number {
  return items.reduce((acc, it) => acc + Math.round((it.quantity || 0) * (it.unit_price_cents || 0)), 0)
}

const emptyForm = { name: '', description: '' }

export default function PackagesTab() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [form, setForm] = useState({ ...emptyForm })
  const [formItems, setFormItems] = useState<PackageItem[]>([])
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyForm })
  const [editItems, setEditItems] = useState<PackageItem[]>([])
  const [editSaving, setEditSaving] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/catalog').then((r) => r.json()).then((d) => (d?.items || []).filter((i: CatalogItem) => i.active !== false)),
      fetch('/api/catalog/packages').then((r) => r.json()).then((d) => d?.packages || []),
    ])
      .then(([items, pkgs]) => { setCatalog(items); setPackages(pkgs) })
      .catch(() => { setCatalog([]); setPackages([]) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function addItemTo(setter: (fn: (prev: PackageItem[]) => PackageItem[]) => void, catalogItemId: string) {
    const it = catalog.find((c) => c.id === catalogItemId)
    if (!it) return
    setter((prev) => [...prev, newPackageItem(it)])
  }
  function updateItemIn(setter: (fn: (prev: PackageItem[]) => PackageItem[]) => void, id: string, patch: Partial<PackageItem>) {
    setter((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }
  function removeItemFrom(setter: (fn: (prev: PackageItem[]) => PackageItem[]) => void, id: string) {
    setter((prev) => prev.filter((it) => it.id !== id))
  }

  async function addPackage() {
    setErr('')
    if (!form.name.trim()) { setErr('Package name is required.'); return }
    if (formItems.length === 0) { setErr('Add at least one catalog item to the package.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/catalog/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined, items: formItems }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not create package.'); return }
      setForm({ ...emptyForm })
      setFormItems([])
      load()
    } finally { setSaving(false) }
  }

  function startEdit(pkg: Package) {
    setErr('')
    setEditingId(pkg.id)
    setEditForm({ name: pkg.name, description: pkg.description || '' })
    setEditItems(pkg.items)
  }
  function cancelEdit() { setEditingId(null) }
  async function saveEdit() {
    setErr('')
    if (!editForm.name.trim()) { setErr('Package name is required.'); return }
    if (editItems.length === 0) { setErr('A package needs at least one item.'); return }
    setEditSaving(true)
    try {
      const res = await fetch('/api/catalog/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: editForm.name.trim(), description: editForm.description.trim() || null, items: editItems }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not save package.'); return }
      setEditingId(null)
      load()
    } finally { setEditSaving(false) }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch('/api/catalog/packages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: !active }) })
    load()
  }
  async function remove(id: string) {
    await fetch(`/api/catalog/packages?id=${id}`, { method: 'DELETE' })
    load()
  }

  const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 13, color: 'var(--sl-ink)', width: '100%', background: '#fff' }
  const lbl: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, marginBottom: 3, display: 'block' }

  function renderItemBuilder(items: PackageItem[], setter: (fn: (prev: PackageItem[]) => PackageItem[]) => void) {
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={lbl}>Package items <HelpTip text="Each item keeps its own name + description from the catalog. Quantity and price are editable per package." /></label>
        {catalog.length > 0 && (
          <select style={{ ...inp, marginBottom: 8 }} value="" onChange={(e) => { if (e.target.value) { addItemTo(setter, e.target.value); e.target.value = '' } }}>
            <option value="">+ Add item from catalog…</option>
            {catalog.map((c) => <option key={c.id} value={c.id}>{c.name} — {money(c.price_cents)}/{c.per_unit}</option>)}
          </select>
        )}
        {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--sl-muted)' }}>No items yet — add from the catalog above.</div>}
        {items.map((it) => (
          <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.9fr 0.3fr', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sl-ink)' }}>{it.name}</div>
              {it.description && <div style={{ fontSize: 11, color: 'var(--sl-muted)' }}>{it.description}</div>}
            </div>
            <input type="number" min="0" step="1" value={it.quantity} onChange={(e) => updateItemIn(setter, it.id, { quantity: Number(e.target.value) || 0 })} style={inp} title="Quantity" />
            <input type="number" min="0" step="0.01" value={(it.unit_price_cents / 100).toFixed(2)} onChange={(e) => updateItemIn(setter, it.id, { unit_price_cents: Math.round((Number(e.target.value) || 0) * 100) })} style={inp} title="Unit price $" />
            <button type="button" onClick={() => removeItemFrom(setter, it.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Remove</button>
          </div>
        ))}
        {items.length > 0 && <div style={{ fontSize: 12, color: 'var(--sl-muted)', marginTop: 4 }}>Package total: <strong style={{ color: 'var(--sl-ink)' }}>{money(packageTotal(items))}</strong></div>}
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 12 }}>
      {err && <div style={{ background: '#fdecea', color: '#c0392b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div className="sl-section-head">
        <h2 className="sl-section-title">Packages<em>.</em></h2>
        <span className="sl-section-meta">{packages.length} package{packages.length === 1 ? '' : 's'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 14px' }}>
        Bundle catalog items under one package title + description. On a Proposal, picking a package auto-fills the
        title, description, and every line item — the tenant just adds job-specific notes and sends.
      </p>

      {/* ADD FORM */}
      <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Package name <HelpTip text="Shows as the proposal title when this package is picked." /></label>
          <input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Move-In Deep Clean Bundle" />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Package description <HelpTip text="Shows as the proposal description when this package is picked — scope, what's included." /></label>
          <input style={inp} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional — shown on the proposal" />
        </div>
        {renderItemBuilder(formItems, setFormItems)}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="sl-newlead-btn" disabled={saving} onClick={addPackage}>{saving ? 'Creating…' : '+ Create package'}</button>
        </div>
      </div>

      {/* LIST */}
      <div>
        {loading && <div className="sl-empty">Loading…</div>}
        {!loading && packages.length === 0 && <div className="sl-empty">No packages yet — build your first above.</div>}
        {packages.map((pkg) => {
          if (editingId === pkg.id) {
            return (
              <div key={pkg.id} style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>Package name</label>
                  <input style={inp} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>Package description</label>
                  <input style={inp} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                {renderItemBuilder(editItems, setEditItems)}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={cancelEdit} style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>Cancel</button>
                  <button type="button" className="sl-newlead-btn" disabled={editSaving} onClick={saveEdit}>{editSaving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            )
          }
          return (
            <div key={pkg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--sl-line,#eee)', opacity: pkg.active ? 1 : 0.5 }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--sl-ink)' }}>{pkg.name}</span>
                {pkg.description && <span style={{ display: 'block', fontSize: 12, color: 'var(--sl-muted)' }}>{pkg.description}</span>}
                <span style={{ display: 'block', fontSize: 11, color: 'var(--sl-muted)', marginTop: 2 }}>
                  {pkg.items.length} item{pkg.items.length === 1 ? '' : 's'} · {pkg.items.map((it) => it.name).join(', ')}
                </span>
              </span>
              <span style={{ fontSize: 14, color: 'var(--sl-ink)', minWidth: 90, textAlign: 'right', paddingTop: 2 }}>{money(packageTotal(pkg.items))}</span>
              <button type="button" onClick={() => startEdit(pkg)} style={{ fontSize: 11, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>Edit</button>
              <button type="button" onClick={() => toggleActive(pkg.id, pkg.active)} style={{ fontSize: 11, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>{pkg.active ? 'Active' : 'Off'}</button>
              <button type="button" onClick={() => remove(pkg.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
