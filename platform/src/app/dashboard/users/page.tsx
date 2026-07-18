'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTenantSettings } from '@/lib/use-tenant-settings'

interface Member {
  id: string
  email: string
  name: string
  role: string
  status: string
  phone: string | null
  has_pin: boolean
  pin_set_at: string | null
  last_login: string | null
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  manager: 'bg-green-100 text-green-800',
  staff: 'bg-gray-100 text-gray-800',
}

function roleDescriptions(agentName: string): Record<string, string> {
  return {
    owner: 'Full access including billing, settings, and member management',
    admin: 'Full operational access; no billing/settings edits',
    manager: `Bookings, clients, calendar, campaigns, ${agentName}`,
    staff: 'Read-only access to dashboard + assigned bookings',
  }
}

export default function UsersPage() {
  const { tenant } = useTenantSettings()
  const ROLE_DESCRIPTIONS = roleDescriptions((tenant?.agent_name as string) || 'Selena')
  const [users, setUsers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', phone: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loginUrl, setLoginUrl] = useState<string>('')

  // Add-member form
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'staff'>('manager')

  // Issued-PIN reveal (shown once)
  const [issued, setIssued] = useState<{ name: string; pin: string } | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users', { credentials: 'include' })
    if (res.ok) setUsers(await res.json())
    else setError('Failed to load users')
    setLoading(false)
  }, [])

  const loadTenant = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/public', { credentials: 'include' })
      if (res.ok) {
        const t = await res.json()
        if (t.domain) setLoginUrl(`https://${t.domain}/fullloop`)
      }
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { loadUsers(); loadTenant() }, [loadUsers, loadTenant])

  const startEdit = (u: Member) => {
    setEditingId(u.id)
    setEditForm({ name: u.name, email: u.email, role: u.role, phone: u.phone || '' })
    setError('')
  }

  const saveEdit = async () => {
    setError(''); setSuccess('')
    const res = await fetch(`/api/admin/users/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      setSuccess('Saved')
      setEditingId(null)
      loadUsers()
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Save failed')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this member?')) return
    setError(''); setSuccess('')
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) { setSuccess('Removed'); loadUsers() }
    else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Remove failed')
    }
  }

  const addMember = async () => {
    setError(''); setSuccess('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newName, role: newRole }),
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok) {
      setIssued({ name: newName, pin: j.pin })
      setNewName('')
      loadUsers()
    } else {
      setError(j.error || 'Could not add member')
    }
  }

  const resetPin = async (u: Member) => {
    setError(''); setSuccess('')
    const res = await fetch(`/api/admin/users/${u.id}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok) {
      setIssued({ name: u.name, pin: j.pin })
      loadUsers()
    } else {
      setError(j.error || 'Could not reset PIN')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-800 rounded">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-800 rounded">{success}</div>}

      {/* Issued PIN — shown once */}
      {issued && (
        <div className="mb-6 p-4 border-2 border-teal-500 rounded bg-teal-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-teal-900">PIN for {issued.name}</p>
              <p className="text-3xl font-mono font-bold tracking-widest text-teal-900 mt-1">{issued.pin}</p>
              <p className="text-sm text-teal-800 mt-2">
                Copy this now — it won&apos;t be shown again. They sign in at{' '}
                <span className="font-mono">{loginUrl || '<your-domain>/fullloop'}</span>.
              </p>
            </div>
            <button onClick={() => setIssued(null)} className="text-sm text-teal-700 hover:underline">Done</button>
          </div>
        </div>
      )}

      {/* Login link for this tenant */}
      {loginUrl && (
        <div className="mb-6 p-4 border rounded bg-white">
          <p className="text-sm text-gray-500 mb-1">Operator login link (same for everyone; each person uses their own PIN)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 border rounded text-sm">{loginUrl}</code>
            <button
              onClick={() => { navigator.clipboard?.writeText(loginUrl); setSuccess('Login link copied') }}
              className="px-3 py-2 bg-gray-900 text-white rounded text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Add member */}
      <div className="mb-6 p-4 border rounded bg-white">
        <h2 className="font-medium mb-3">Add a member</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full name"
            className="flex-1 px-3 py-2 border rounded"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'admin' | 'manager' | 'staff')}
            className="px-3 py-2 border rounded"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
          <button
            onClick={addMember}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-50"
          >
            Add &amp; generate PIN
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500">No members yet.</p>
      ) : (
        <table className="w-full bg-white border rounded overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Name</th>
              <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Email</th>
              <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Role</th>
              <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">PIN</th>
              <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">
                  {editingId === u.id ? (
                    <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="px-2 py-1 border rounded" />
                  ) : u.name}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {editingId === u.id ? (
                    <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="px-2 py-1 border rounded" />
                  ) : (u.email || <span className="text-gray-400">—</span>)}
                </td>
                <td className="px-4 py-3">
                  {editingId === u.id ? (
                    <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="px-2 py-1 border rounded">
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-xs rounded ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`} title={ROLE_DESCRIPTIONS[u.role]}>
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {u.has_pin
                    ? <span className="text-green-700">Set</span>
                    : <span className="text-gray-400">Not set</span>}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {editingId === u.id ? (
                    <>
                      <button onClick={saveEdit} className="text-sm text-blue-600 hover:underline">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-sm text-gray-500 hover:underline">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => resetPin(u)} className="text-sm text-teal-600 hover:underline">{u.has_pin ? 'Reset PIN' : 'Set PIN'}</button>
                      <button onClick={() => startEdit(u)} className="text-sm text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => remove(u.id)} className="text-sm text-red-600 hover:underline">Remove</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
