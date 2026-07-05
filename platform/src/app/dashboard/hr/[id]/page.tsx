'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type EmploymentType = 'contractor_1099' | 'employee_w2'
type HrStatus = 'active' | 'on_leave' | 'terminated'
type CompType = 'per_job' | 'hourly' | 'salary'
type PayPeriod = 'per_job' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

type Member = {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
}
type Profile = {
  employment_type: EmploymentType
  hr_status: HrStatus
  hire_date: string | null
  termination_date: string | null
  title: string | null
  department: string | null
  comp_type: CompType
  pay_rate_cents: number | null
  pay_period: PayPeriod
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  date_of_birth: string | null
} | null
type DocRow = {
  id: string
  doc_type: string
  label: string | null
  status: string
  file_url: string | null
  issued_on: string | null
  expires_on: string | null
}
type Requirement = {
  doc_type: string
  label: string
  applies_to: 'all' | EmploymentType
  required: boolean
  has_expiry: boolean
  sort_order: number
}
type NoteRow = { id: string; kind: string; body: string; author_name: string | null; created_at: string }

type Editable = {
  employment_type: EmploymentType
  hr_status: HrStatus
  title: string
  department: string
  hire_date: string
  comp_type: CompType
  pay_rate_dollars: string
  pay_period: PayPeriod
  emergency_contact_name: string
  emergency_contact_phone: string
  date_of_birth: string
}

function emptyEditable(): Editable {
  return {
    employment_type: 'contractor_1099', hr_status: 'active', title: '', department: '',
    hire_date: '', comp_type: 'per_job', pay_rate_dollars: '', pay_period: 'per_job',
    emergency_contact_name: '', emergency_contact_phone: '', date_of_birth: '',
  }
}

function fromProfile(p: Profile): Editable {
  if (!p) return emptyEditable()
  return {
    employment_type: p.employment_type,
    hr_status: p.hr_status,
    title: p.title || '',
    department: p.department || '',
    hire_date: p.hire_date || '',
    comp_type: p.comp_type,
    pay_rate_dollars: p.pay_rate_cents != null ? (p.pay_rate_cents / 100).toString() : '',
    pay_period: p.pay_period,
    emergency_contact_name: p.emergency_contact_name || '',
    emergency_contact_phone: p.emergency_contact_phone || '',
    date_of_birth: p.date_of_birth || '',
  }
}

const DAY = 86400000

export default function HrEmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [member, setMember] = useState<Member | null>(null)
  const [documents, setDocuments] = useState<DocRow[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [stripeConnected, setStripeConnected] = useState(false)
  const [form, setForm] = useState<Editable>(emptyEditable())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [noteKind, setNoteKind] = useState('note')
  const [stripeBusy, setStripeBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/hr/${id}`)
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
      const json = await res.json()
      setMember(json.member)
      setDocuments(json.documents || [])
      setRequirements(json.requirements || [])
      setNotes(json.notes || [])
      setStripeConnected(!!json.stripe_connected)
      setForm(fromProfile(json.profile))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employee')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const set = <K extends keyof Editable>(k: K, v: Editable[K]) => setForm(f => ({ ...f, [k]: v }))

  const saveProfile = async () => {
    setSaving(true); setSavedMsg(null)
    try {
      const rate = form.pay_rate_dollars.trim()
      const pay_rate_cents = rate === '' ? null : Math.round(parseFloat(rate) * 100)
      if (pay_rate_cents != null && (Number.isNaN(pay_rate_cents) || pay_rate_cents < 0))
        throw new Error('Enter a valid pay rate')
      const res = await fetch(`/api/dashboard/hr/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employment_type: form.employment_type,
          hr_status: form.hr_status,
          title: form.title || null,
          department: form.department || null,
          hire_date: form.hire_date || null,
          comp_type: form.comp_type,
          pay_rate_cents,
          pay_period: form.pay_period,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          date_of_birth: form.date_of_birth || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(null), 2000)
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const startStripe = async () => {
    setStripeBusy(true)
    try {
      const res = await fetch(`/api/team-members/${id}/stripe-onboard`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start payout setup')
      window.location.href = json.url
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : 'Payout setup failed')
      setStripeBusy(false)
    }
  }

  const setDocStatus = async (docType: string, patch: Record<string, unknown>, existing?: DocRow) => {
    try {
      if (existing) {
        const res = await fetch(`/api/dashboard/hr/${id}/documents`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: existing.id, ...patch }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Update failed')
      } else {
        const req = requirements.find(r => r.doc_type === docType)
        const res = await fetch(`/api/dashboard/hr/${id}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_type: docType, label: req?.label, ...patch }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Create failed')
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Document update failed')
    }
  }

  const addNote = async () => {
    const text = noteText.trim()
    if (!text) return
    try {
      const res = await fetch(`/api/dashboard/hr/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: noteKind, body: text }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add note')
      setNoteText('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add note')
    }
  }

  if (loading) return <main className="p-6 text-gray-400">Loading employee…</main>
  if (error && !member) return <main className="p-6 text-red-500">{error}</main>
  if (!member) return <main className="p-6 text-gray-400">Employee not found</main>

  // Requirements applicable to this employment type, merged with actual docs.
  const applicable = requirements.filter(r => r.applies_to === 'all' || r.applies_to === form.employment_type)
  const docByType = new Map(documents.map(d => [d.doc_type, d]))
  const extraDocs = documents.filter(d => !applicable.some(r => r.doc_type === d.doc_type))

  return (
    <main className="p-3 md:p-6 max-w-5xl">
      <div className="mb-4">
        <Link href="/dashboard/hr" className="text-sm text-gray-500 hover:text-teal-700">← People</Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">{member.name}</h2>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          form.employment_type === 'employee_w2' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
        }`}>{form.employment_type === 'employee_w2' ? 'W-2 Employee' : '1099 Contractor'}</span>
        {form.hr_status !== 'active' && (
          <span className="text-xs text-amber-600 capitalize">{form.hr_status.replace('_', ' ')}</span>
        )}
        {member.role && <span className="text-sm text-gray-400 capitalize">{member.role}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile & employment */}
        <Card title="Profile & Employment">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employment type">
              <Select value={form.employment_type} onChange={v => set('employment_type', v as EmploymentType)}
                opts={[['contractor_1099', '1099 Contractor'], ['employee_w2', 'W-2 Employee']]} />
            </Field>
            <Field label="Status">
              <Select value={form.hr_status} onChange={v => set('hr_status', v as HrStatus)}
                opts={[['active', 'Active'], ['on_leave', 'On leave'], ['terminated', 'Terminated']]} />
            </Field>
            <Field label="Title"><Input value={form.title} onChange={v => set('title', v)} /></Field>
            <Field label="Department"><Input value={form.department} onChange={v => set('department', v)} /></Field>
            <Field label="Hire date"><Input type="date" value={form.hire_date} onChange={v => set('hire_date', v)} /></Field>
            <Field label="Date of birth"><Input type="date" value={form.date_of_birth} onChange={v => set('date_of_birth', v)} /></Field>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">Compensation of record</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Comp type">
                <Select value={form.comp_type} onChange={v => set('comp_type', v as CompType)}
                  opts={[['per_job', 'Per job'], ['hourly', 'Hourly'], ['salary', 'Salary']]} />
              </Field>
              <Field label="Rate ($)"><Input type="number" value={form.pay_rate_dollars} onChange={v => set('pay_rate_dollars', v)} /></Field>
              <Field label="Pay period">
                <Select value={form.pay_period} onChange={v => set('pay_period', v as PayPeriod)}
                  opts={[['per_job', 'Per job'], ['weekly', 'Weekly'], ['biweekly', 'Biweekly'], ['semimonthly', 'Semi-monthly'], ['monthly', 'Monthly']]} />
              </Field>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">Emergency contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><Input value={form.emergency_contact_name} onChange={v => set('emergency_contact_name', v)} /></Field>
              <Field label="Phone"><Input value={form.emergency_contact_phone} onChange={v => set('emergency_contact_phone', v)} /></Field>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button onClick={saveProfile} disabled={saving}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            {savedMsg && <span className="text-sm text-gray-500">{savedMsg}</span>}
          </div>
        </Card>

        <div className="space-y-6">
          {/* Payouts */}
          <Card title="Payouts (Stripe Connect)">
            {stripeConnected ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Connected — auto-paid after each completed job.
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">
                  Not set up. Once connected, {member.name.split(' ')[0]} is auto-paid to their bank/debit card after each job — no manual payout.
                </p>
                <button onClick={startStripe} disabled={stripeBusy}
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                  {stripeBusy ? 'Opening…' : 'Set up payouts'}
                </button>
              </div>
            )}
          </Card>

          {/* Documents & compliance */}
          <Card title="Documents & Compliance">
            <div className="space-y-2">
              {applicable.length === 0 && extraDocs.length === 0 && (
                <p className="text-sm text-gray-400">No document requirements configured.</p>
              )}
              {applicable.map(req => {
                const doc = docByType.get(req.doc_type)
                return <DocRowView key={req.doc_type} label={req.label} required={req.required}
                  hasExpiry={req.has_expiry} doc={doc}
                  onStatus={(s) => setDocStatus(req.doc_type, { status: s }, doc)}
                  onExpiry={(d) => setDocStatus(req.doc_type, { expires_on: d, status: doc?.status || 'submitted' }, doc)} />
              })}
              {extraDocs.map(doc => (
                <DocRowView key={doc.id} label={doc.label || doc.doc_type} required={false}
                  hasExpiry={!!doc.expires_on} doc={doc}
                  onStatus={(s) => setDocStatus(doc.doc_type, { status: s }, doc)}
                  onExpiry={(d) => setDocStatus(doc.doc_type, { expires_on: d, status: doc.status }, doc)} />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Notes */}
      <Card title="Notes & Log" className="mt-6">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select value={noteKind} onChange={e => setNoteKind(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-900">
            <option value="note">Note</option>
            <option value="kudos">Kudos</option>
            <option value="writeup">Write-up</option>
            <option value="review">Review</option>
          </select>
          <input value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note about this person…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none" />
          <button onClick={addNote} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Add</button>
        </div>
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-sm text-gray-400">No notes yet.</p>
          ) : notes.map(n => (
            <div key={n.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className={`mt-0.5 inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                n.kind === 'kudos' ? 'bg-green-50 text-green-700' :
                n.kind === 'writeup' ? 'bg-amber-50 text-amber-700' :
                n.kind === 'review' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
              }`}>{n.kind}</span>
              <div className="flex-1">
                <p className="text-sm text-slate-800">{n.body}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {n.author_name ? `${n.author_name} · ` : ''}{new Date(n.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  )
}

function DocRowView({ label, required, hasExpiry, doc, onStatus, onExpiry }: {
  label: string; required: boolean; hasExpiry: boolean; doc?: DocRow
  onStatus: (s: string) => void; onExpiry: (d: string) => void
}) {
  const status = doc?.status || 'pending'
  const expiringSoon = doc?.expires_on
    ? (new Date(doc.expires_on).getTime() - Date.now()) < 30 * DAY : false
  const expired = doc?.expires_on ? new Date(doc.expires_on).getTime() < Date.now() : false
  const dot = expired ? 'bg-red-500' : status === 'approved' ? 'bg-green-500'
    : status === 'submitted' ? 'bg-blue-500' : status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'
  return (
    <div className="flex flex-wrap items-center gap-2 py-2 border-b border-gray-50 last:border-0">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-sm text-slate-800 flex-1 min-w-[8rem]">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        {expired && <span className="ml-2 text-xs text-red-600">expired</span>}
        {!expired && expiringSoon && <span className="ml-2 text-xs text-amber-600">expiring soon</span>}
      </span>
      <select value={status} onChange={e => onStatus(e.target.value)}
        className="px-2 py-1 border border-gray-200 rounded text-xs bg-white text-slate-700">
        <option value="pending">Pending</option>
        <option value="submitted">Submitted</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="expired">Expired</option>
      </select>
      {hasExpiry && (
        <input type="date" value={doc?.expires_on || ''} onChange={e => onExpiry(e.target.value)}
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white text-slate-700" title="Expiry date" />
      )}
    </div>
  )
}

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function Input({ value, onChange, type = 'text' }: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none" />
  )
}

function Select({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: [string, string][] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-slate-900">
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}
