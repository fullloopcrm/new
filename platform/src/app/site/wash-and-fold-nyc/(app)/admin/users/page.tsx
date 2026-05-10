// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  status: string
  last_login: string | null
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  manager: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access to everything including finance, settings, and user management',
  admin: 'Full access except settings, finance details, and team pay rates',
  manager: 'Bookings, clients, calendar, leads, Selena, feedback',
  viewer: 'Read-only access to dashboard, bookings, and calendar',
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'manager' })
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', status: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  const createUser = async () => {
    setError('')
    setSuccess('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setSuccess('User created')
      setShowCreate(false)
      setForm({ email: '', name: '', password: '', role: 'manager' })
      loadUsers()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to create user')
    }
  }

  const updateUser = async (id: string) => {
    setError('')
    setSuccess('')
    const updates: Record<string, string> = {}
    if (editForm.name) updates.name = editForm.name
    if (editForm.email) updates.email = editForm.email
    if (editForm.role) updates.role = editForm.role
    if (editForm.status) updates.status = editForm.status
    if (editForm.password) updates.password = editForm.password

    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      setSuccess('User updated')
      setEditingId(null)
      loadUsers()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to update user')
    }
  }

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSuccess('User deleted')
      loadUsers()
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2A4A]">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage admin accounts and permissions</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[#1E2A4A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2a3a5e]"
        >
          {showCreate ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Create User Form */}
      {showCreate && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1E2A4A] mb-4">New User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]" placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]" placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]" placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
              >
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[form.role]}</p>
            </div>
          </div>
          <button
            onClick={createUser}
            className="mt-4 bg-[#1E2A4A] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#2a3a5e]"
          >
            Create User
          </button>
        </div>
      )}

      {/* Role Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
          <div key={role} className="bg-white border border-gray-200 rounded-lg p-3">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[role]}`}>{role}</span>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No users yet</p>
            <p className="text-sm mt-1">Click "+ Add User" to create the first account</p>
          </div>
        )}

        {users.map(user => (
          <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-4">
            {editingId === user.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text" defaultValue={user.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm" placeholder="Name"
                  />
                  <input
                    type="email" defaultValue={user.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm" placeholder="Email"
                  />
                  <select
                    defaultValue={user.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text" onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm" placeholder="New password (leave blank to keep)"
                  />
                  <select
                    defaultValue={user.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => updateUser(user.id)} className="flex-1 bg-[#1E2A4A] text-white px-4 py-2 rounded-lg text-sm">Save</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#1E2A4A] flex items-center justify-center text-white font-semibold text-sm">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1E2A4A]">{user.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                      {user.status === 'disabled' && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">disabled</span>}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {user.last_login ? `Last login: ${new Date(user.last_login).toLocaleDateString()}` : 'Never logged in'}
                  </span>
                  <button
                    onClick={() => { setEditingId(user.id); setEditForm({ name: '', email: '', role: '', status: '', password: '' }) }}
                    className="text-sm text-[#1E2A4A] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteUser(user.id, user.name)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
