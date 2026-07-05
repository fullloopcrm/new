'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

// HR People hub — the connective people-record layer over the roster. Mirrors
// the finance hub's PROCESS sub-nav so the two sit as siblings. Roster/payroll
// scheduling still live on /dashboard/team; this owns the employee record,
// employment type, comp of record, documents/compliance, and onboarding.
const PROCESS: Array<{ letter: string; label: string; href: string }> = [
  { letter: 'A', label: 'People', href: '/dashboard/hr' },
  { letter: 'B', label: 'Roster & Schedule', href: '/dashboard/team' },
  { letter: 'C', label: 'Ledger & Payroll', href: '/dashboard/books' },
]

type Employee = {
  team_member_id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  active: boolean
  profile_id: string | null
  employment_type: 'contractor_1099' | 'employee_w2'
  hr_status: 'active' | 'on_leave' | 'terminated'
  hire_date: string | null
  title: string | null
  comp_type: 'per_job' | 'hourly' | 'salary'
  pay_rate_cents: number | null
  pay_period: 'per_job' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
  stripe_connected: boolean
}

const EMPLOYMENT_LABEL: Record<Employee['employment_type'], string> = {
  contractor_1099: '1099',
  employee_w2: 'W-2',
}

function fmtPay(e: Employee): string {
  if (e.pay_rate_cents == null) return '—'
  const dollars = (e.pay_rate_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const suffix = e.comp_type === 'hourly' ? '/hr' : e.comp_type === 'salary' ? '/yr' : '/job'
  return `${dollars}${suffix}`
}

export default function HrPeoplePage() {
  useEffect(() => { document.title = 'People · HR' }, [])

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/dashboard/hr')
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
        const json = await res.json()
        if (!cancelled) setEmployees(json.employees || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load people')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    const active = employees.filter(e => e.hr_status === 'active').length
    const w2 = employees.filter(e => e.employment_type === 'employee_w2').length
    const contractors = employees.filter(e => e.employment_type === 'contractor_1099').length
    const connected = employees.filter(e => e.stripe_connected).length
    return { total: employees.length, active, w2, contractors, connected }
  }, [employees])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.title || '').toLowerCase().includes(q))
  }, [employees, search])

  return (
    <main className="p-3 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-2xl font-semibold text-slate-900">People</h2>
      </div>

      {/* PROCESS sub-nav — HR as one connected hub, siblings with Finance */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {PROCESS.map(p => (
          <Link
            key={p.href}
            href={p.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              p.href === '/dashboard/hr'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-xs opacity-50 mr-1.5">{p.letter}</span>{p.label}
          </Link>
        ))}
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Stat label="Headcount" value={stats.total} />
        <Stat label="Active" value={stats.active} accent="text-green-600" />
        <Stat label="1099" value={stats.contractors} />
        <Stat label="W-2" value={stats.w2} />
        <Stat label="Payouts connected" value={`${stats.connected}/${stats.total}`} accent="text-teal-600" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search name, email, role, title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm bg-white focus:ring-2 focus:ring-teal-600 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Title / Role</Th>
                <Th className="text-right">Pay</Th>
                <Th className="text-center">Payouts</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Loading people…</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-red-500">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                  {search ? 'No people match your search' : 'No people yet — add team members in Roster'}
                </td></tr>
              ) : (
                filtered.map(e => (
                  <tr key={e.team_member_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/hr/${e.team_member_id}`} className="text-sm font-medium text-slate-900 hover:text-teal-700">
                        {e.name}
                      </Link>
                      {e.hr_status !== 'active' && (
                        <span className="ml-2 text-xs text-amber-600 capitalize">{e.hr_status.replace('_', ' ')}</span>
                      )}
                      {e.email && <div className="text-xs text-gray-400">{e.email}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.employment_type === 'employee_w2' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {EMPLOYMENT_LABEL[e.employment_type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{e.title || e.role || '—'}</td>
                    <td className="px-5 py-3 text-sm text-right text-slate-900">{fmtPay(e)}</td>
                    <td className="px-5 py-3 text-center">
                      {e.stripe_connected ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Connected
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not set up</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
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
  return (
    <th className={`px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium ${className || 'text-left'}`}>
      {children}
    </th>
  )
}
