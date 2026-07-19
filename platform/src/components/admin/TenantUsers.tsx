'use client'

/**
 * Platform-admin user management for a tenant — list / add (PIN) / remove.
 * Lives as the Users tab on the tenant profile so it's all one page.
 */
import { useEffect, useState, useCallback } from 'react'

interface TenantUser {
  id: string
  name: string
  email: string | null
  role: string
  phone: string | null
  status: string
  last_login: string | null
}

const ROLES = ['owner', 'admin', 'manager', 'staff', 'va']

export function TenantUsers({ tenantId }: { tenantId: string }) {
  const [users, setUsers] = useState<TenantUser[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState('staff')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [newPin, setNewPin] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/businesses/${tenantId}/users`)
    if (res.ok) { const d = await res.json(); setUsers(d.users || []) }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  async function add() {
    if (!name.trim()) return
    setSaving(true); setErr(''); setNewPin('')
    try {
      const res = await fetch(`/api/admin/businesses/${tenantId}/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, email, phone }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Failed')
      setNewPin(d.pin || '')
      setName(''); setEmail(''); setPhone(''); setRole('staff')
      await load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Remove this user?')) return
    await fetch(`/api/admin/businesses/${tenantId}/users?user_id=${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="border border-slate-200 rounded-xl p-4">
        <h3 className="font-heading font-semibold text-slate-900 mb-3">Add user</h3>
        <div className="grid grid-cols-2 gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name *" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <select value={role} onChange={e => setRole(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={add} disabled={saving || !name.trim()}
          className="mt-3 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
          {saving ? 'Creating…' : 'Create user + PIN'}
        </button>
        {newPin && <p className="mt-2 text-sm text-green-700">PIN (shown once): <span className="font-mono font-bold">{newPin}</span> — hand this to the user.</p>}
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>

      <div>
        <h3 className="font-heading font-semibold text-slate-900 mb-2">Users ({users.length})</h3>
        <div className="border border-slate-100 rounded-xl divide-y divide-slate-100">
          {users.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No users yet</p>}
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{u.name} <span className="text-xs text-slate-400 capitalize">· {u.role}</span></p>
                <p className="text-xs text-slate-500 truncate">{u.email || u.phone || '—'} · {u.status}{u.last_login ? ` · last login ${new Date(u.last_login).toLocaleDateString()}` : ''}</p>
              </div>
              <button onClick={() => remove(u.id)} className="text-xs text-slate-400 hover:text-red-600 shrink-0">remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
