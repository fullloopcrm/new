'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EMPLOYMENT_TYPES, HR_STATUSES, COMP_TYPES, PAY_PERIODS,
  EMPLOYMENT_TYPE_LABEL, COMP_TYPE_LABEL, PAY_PERIOD_LABEL,
  type EmploymentType, type HrStatus, type CompType, type PayPeriod,
} from '@/lib/company-team'

interface Member {
  id: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
  department: string | null
  employment_type: EmploymentType
  hr_status: HrStatus
  hire_date: string | null
  comp_type: CompType
  pay_rate_cents: number | null
  pay_period: PayPeriod
  notes: string | null
  stripe_account_id: string | null
}

const emptyForm = {
  name: '', email: '', phone: '', title: '', department: '',
  employment_type: 'contractor_1099' as EmploymentType,
  hr_status: 'active' as HrStatus,
  hire_date: '',
  comp_type: 'per_job' as CompType,
  pay_rate: '',
  pay_period: 'per_job' as PayPeriod,
  notes: '',
}

function fmtPay(m: Member): string {
  if (m.pay_rate_cents == null) return '—'
  const dollars = (m.pay_rate_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const suffix = m.comp_type === 'hourly' ? '/hr' : m.comp_type === 'salary' ? '/yr' : '/job'
  return `${dollars}${suffix}`
}

export default function CompanyTeamPage() {
  useEffect(() => { document.title = 'Company Team | FullLoop Admin' }, [])

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/company/team')
    const data = await res.json().catch(() => ({ members: [] }))
    setMembers(data.members || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const active = members.filter((m) => m.hr_status === 'active').length
    const w2 = members.filter((m) => m.employment_type === 'employee_w2').length
    const contractors = members.filter((m) => m.employment_type === 'contractor_1099').length
    const connected = members.filter((m) => m.stripe_account_id).length
    return { total: members.length, active, w2, contractors, connected }
  }, [members])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.title || '').toLowerCase().includes(q))
  }, [members, search])

  function resetForm() {
    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  function startEdit(m: Member) {
    setEditingId(m.id)
    setForm({
      name: m.name,
      email: m.email || '',
      phone: m.phone || '',
      title: m.title || '',
      department: m.department || '',
      employment_type: m.employment_type,
      hr_status: m.hr_status,
      hire_date: m.hire_date || '',
      comp_type: m.comp_type,
      pay_rate: m.pay_rate_cents != null ? String(m.pay_rate_cents / 100) : '',
      pay_period: m.pay_period,
      notes: m.notes || '',
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const payRateCents = form.pay_rate ? Math.round(parseFloat(form.pay_rate) * 100) : null
      const body = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        title: form.title.trim() || null,
        department: form.department.trim() || null,
        employment_type: form.employment_type,
        hr_status: form.hr_status,
        hire_date: form.hire_date || null,
        comp_type: form.comp_type,
        pay_rate_cents: payRateCents,
        pay_period: form.pay_period,
        notes: form.notes.trim() || null,
      }
      const res = await fetch(editingId ? `/api/admin/company/team/${editingId}` : '/api/admin/company/team', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return
      }
      resetForm()
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this team member?')) return
    await fetch(`/api/admin/company/team/${id}`, { method: 'DELETE' })
    if (editingId === id) resetForm()
    await load()
  }

  async function connectPayouts(id: string) {
    const res = await fetch(`/api/admin/company/team/${id}/stripe-onboard`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.url) {
      window.alert(data.error || 'Could not start Stripe onboarding')
      return
    }
    window.location.href = data.url
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 font-heading text-2xl font-bold">Company Team</h1>
          <p className="text-sm text-slate-500">Who works for Full Loop itself — not any tenant&rsquo;s roster.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm && !editingId) {
              resetForm()
            } else {
              resetForm()
              setShowForm(true)
            }
          }}
          className="px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >
          {showForm && !editingId ? 'Cancel' : '+ Add person'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <Stat label="Headcount" value={stats.total} />
        <Stat label="Active" value={stats.active} accent="text-green-600" />
        <Stat label="1099" value={stats.contractors} />
        <Stat label="W-2" value={stats.w2} />
        <Stat label="Payouts connected" value={`${stats.connected}/${stats.total}`} accent="text-teal-600" />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
          {editingId && (
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-gray-400">Editing</span>
              <button type="button" onClick={resetForm} className="text-xs text-gray-400 hover:text-gray-700">Cancel</button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Title">
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Department">
              <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Hire date">
              <input type="date" value={form.hire_date} onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Employment type">
              <select value={form.employment_type} onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value as EmploymentType }))} className={inputCls}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.hr_status} onChange={(e) => setForm((f) => ({ ...f, hr_status: e.target.value as HrStatus }))} className={inputCls}>
                {HR_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Comp type">
              <select value={form.comp_type} onChange={(e) => setForm((f) => ({ ...f, comp_type: e.target.value as CompType }))} className={inputCls}>
                {COMP_TYPES.map((c) => <option key={c} value={c}>{COMP_TYPE_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="Pay rate">
              <input type="number" step="0.01" value={form.pay_rate} onChange={(e) => setForm((f) => ({ ...f, pay_rate: e.target.value }))} placeholder="0.00" className={inputCls} />
            </Field>
            <Field label="Pay period">
              <select value={form.pay_period} onChange={(e) => setForm((f) => ({ ...f, pay_period: e.target.value as PayPeriod }))} className={inputCls}>
                {PAY_PERIODS.map((p) => <option key={p} value={p}>{PAY_PERIOD_LABEL[p]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} />
          </Field>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={!form.name.trim() || saving}
            className="px-4 py-2 bg-teal-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add person'}
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Search name, email, title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm bg-white focus:ring-2 focus:ring-teal-600 outline-none"
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Title</Th>
                <Th className="text-right">Pay</Th>
                <Th className="text-center">Payouts</Th>
                <Th className="text-right">{''}</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                  {search ? 'No one matches your search' : 'No one added yet'}
                </td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <button type="button" onClick={() => startEdit(m)} className="text-sm font-medium text-slate-900 hover:text-teal-700 text-left">
                        {m.name}
                      </button>
                      {m.hr_status !== 'active' && <span className="ml-2 text-xs text-amber-600 capitalize">{m.hr_status.replace('_', ' ')}</span>}
                      {m.email && <div className="text-xs text-gray-400">{m.email}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.employment_type === 'employee_w2' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                        {EMPLOYMENT_TYPE_LABEL[m.employment_type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{m.title || '—'}</td>
                    <td className="px-5 py-3 text-sm text-right text-slate-900">{fmtPay(m)}</td>
                    <td className="px-5 py-3 text-center">
                      {m.stripe_account_id ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Connected
                        </span>
                      ) : (
                        <button type="button" onClick={() => connectPayouts(m.id)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                          Connect
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" onClick={() => remove(m.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium ${className || 'text-left'}`}>{children}</th>
}
