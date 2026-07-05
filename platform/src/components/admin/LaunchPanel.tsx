'use client'

import { useState } from 'react'
import type { ActivationResult, StepStatus } from '@/lib/activate-tenant'

const STATUS_STYLE: Record<StepStatus, { dot: string; text: string; label: string }> = {
  done: { dot: 'bg-green-500', text: 'text-green-600', label: 'Done' },
  skipped: { dot: 'bg-slate-300', text: 'text-slate-400', label: 'Skipped' },
  action_needed: { dot: 'bg-amber-500', text: 'text-amber-600', label: 'Action' },
  failed: { dot: 'bg-red-500', text: 'text-red-600', label: 'Failed' },
}

interface LaunchPanelProps {
  tenantId: string
  slug: string
}

export function LaunchPanel({ tenantId, slug }: LaunchPanelProps) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ActivationResult | null>(null)
  const [error, setError] = useState('')

  const carryingUrl = `https://${slug}.fullloopcrm.com`

  async function activate() {
    setRunning(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/businesses/${tenantId}/activate`, { method: 'POST' })
      // 401 = admin session expired. This is the #1 cause of a silent "it just
      // stopped" — the request never reaches the activation logic. Say so plainly
      // instead of showing a bare "Activation failed" that reads like a real bug.
      if (res.status === 401) {
        setError('Your admin session expired — reload the page and log in again, then re-run activation.')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Activation failed (HTTP ${res.status})`)
        return
      }
      setResult(data as ActivationResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activation failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header + action */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading font-semibold text-slate-900 text-lg">Tenant activation</h3>
          <p className="text-sm text-slate-500 mt-1">
            Runs the full launch: settings, domain, checklist, owner login, and a live smoke test.
            Safe to re-run.
          </p>
          <a href={carryingUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm text-teal-600 hover:text-teal-700 font-mono mt-2 inline-block">
            {slug}.fullloopcrm.com ↗
          </a>
        </div>
        <button onClick={activate} disabled={running}
          className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-lg text-sm font-cta font-bold disabled:opacity-50 transition-colors shadow-sm flex-shrink-0">
          {running ? 'Activating…' : result ? 'Re-run activation' : 'Activate tenant'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {result && (
        <>
          {/* Verdict banner */}
          <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            result.activated
              ? 'bg-green-50 text-green-700 border border-green-200'
              : result.ready
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {result.activated
              ? 'Tenant is LIVE — status set to active.'
              : result.ready
                ? 'Ready to go live.'
                : 'Not live yet — resolve the amber/red steps below, then re-run.'}
          </div>

          {/* Owner PIN — shown once */}
          {result.ownerPin && (
            <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold">Owner PIN — shown once</p>
              <p className="text-2xl font-mono font-bold text-teal-800 mt-1">{result.ownerPin}</p>
              <p className="text-xs text-teal-600 mt-1">Relay to the owner. It can&apos;t be recovered later.</p>
            </div>
          )}

          {/* Step list */}
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {result.steps.map((s) => {
              const st = STATUS_STYLE[s.status]
              return (
                <div key={s.key} className="flex items-start gap-3 px-4 py-3">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${st.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{s.label}</p>
                    {s.detail && <p className="text-xs text-slate-500 mt-0.5">{s.detail}</p>}
                  </div>
                  <span className={`text-xs font-semibold ${st.text} flex-shrink-0`}>{st.label}</span>
                </div>
              )
            })}
          </div>

          {/* Custom-domain DNS records */}
          {result.customDomain && result.customDomain.records.length > 0 && (
            <div>
              <h4 className="font-heading font-semibold text-slate-900 text-sm mb-1">
                Custom domain DNS — {result.customDomain.domain}
                {result.customDomain.verified && <span className="text-green-600 ml-2">verified</span>}
              </h4>
              <p className="text-xs text-slate-500 mb-3">Set these at the registrar, then re-run to verify.</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {result.customDomain.records.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-700">{r.type}</td>
                        <td className="px-3 py-2 text-slate-700 break-all">{r.name}</td>
                        <td className="px-3 py-2 text-slate-700 break-all">{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
