'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'

type CrewJob = {
  id: string
  start_time: string
  end_time: string | null
  status: string
  service_type: string | null
  team_member_id: string | null
  team_members: { name: string | null } | { name: string | null }[] | null
  clients: { name: string | null; address: string | null } | { name: string | null; address: string | null }[] | null
}
type Member = { id: string; name: string | null }
type Earning = { id: string; name: string | null; jobs: number; earnings: number }

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v
}

export default function CrewPage() {
  const { auth, authLoaded, t } = useTeamAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<CrewJob[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [earnings, setEarnings] = useState<Earning[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${auth?.token}`, 'Content-Type': 'application/json' }),
    [auth],
  )

  const load = useCallback(async () => {
    if (!auth) return
    setLoading(true)
    try {
      const [sched, mem] = await Promise.all([
        fetch('/api/team-portal/crew/schedule', { headers: headers() }).then((r) => (r.ok ? r.json() : { jobs: [] })),
        fetch('/api/team-portal/crew/members', { headers: headers() }).then((r) => (r.ok ? r.json() : { members: [] })),
      ])
      setJobs(sched.jobs || [])
      setMembers(mem.members || [])
      // Earnings is the sensitive, opt-in permission — a 403 just means "hidden".
      const earnRes = await fetch('/api/team-portal/crew/earnings', { headers: headers() })
      setEarnings(earnRes.ok ? (await earnRes.json()).members || [] : null)
    } catch {
      setError('Could not load crew')
    } finally {
      setLoading(false)
    }
  }, [auth, headers])

  useEffect(() => {
    // authLoaded gates the redirect: auth is null both while the layout's
    // localStorage read is pending AND when truly logged out.
    if (!authLoaded) return
    if (!auth) { router.push('/team/login'); return }
    load()
  }, [auth, authLoaded, router, load])

  async function reassign(bookingId: string, toMemberId: string) {
    if (!toMemberId) return
    setBusy(bookingId); setError('')
    const res = await fetch('/api/team-portal/jobs/reassign', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ booking_id: bookingId, to_member_id: toMemberId }),
    })
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || 'Reassign failed')
    setBusy(null)
    load()
  }

  async function release(bookingId: string) {
    setBusy(bookingId); setError('')
    const res = await fetch('/api/team-portal/jobs/release', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ booking_id: bookingId }),
    })
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || 'Release failed')
    setBusy(null)
    load()
  }

  if (!auth) return null

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-slate-800 mb-1">{t('Crew', 'Equipo')}</h1>
      <p className="text-sm text-slate-400 mb-6">{t('Your crew’s upcoming work', 'El trabajo de tu equipo')}</p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
      {loading && <p className="text-center py-10 text-slate-400">{t('Loading…', 'Cargando…')}</p>}

      {!loading && jobs.length === 0 && (
        <p className="text-center py-10 text-slate-400">{t('No upcoming crew jobs', 'Sin trabajos próximos')}</p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => {
          const assignee = one(job.team_members)?.name || t('Unassigned', 'Sin asignar')
          const client = one(job.clients)
          const isMine = job.team_member_id === auth.member.id
          return (
            <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{job.service_type || t('Service', 'Servicio')}</p>
                  <p className="text-sm text-slate-400">{new Date(job.start_time).toLocaleString()}</p>
                  {client?.name && <p className="text-sm text-slate-500 truncate">{client.name}</p>}
                  {client?.address && <p className="text-xs text-slate-400 truncate">📍 {client.address}</p>}
                </div>
                <span className="shrink-0 text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                  {assignee}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <select
                  defaultValue={job.team_member_id || ''}
                  disabled={busy === job.id}
                  onChange={(e) => reassign(job.id, e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="" disabled>{t('Reassign to…', 'Reasignar a…')}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name || '—'}</option>
                  ))}
                </select>
                {isMine && (
                  <button
                    onClick={() => release(job.id)}
                    disabled={busy === job.id}
                    className="text-sm px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium disabled:opacity-50"
                  >
                    {t('Release', 'Soltar')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {earnings && earnings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {t('Crew earnings · 30 days', 'Ganancias · 30 días')}
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {earnings.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{e.name || '—'}</p>
                  <p className="text-xs text-slate-400">{e.jobs} {t('jobs', 'trabajos')}</p>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  ${(e.earnings || 0).toLocaleString('en-US')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
