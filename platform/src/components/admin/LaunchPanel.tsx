'use client'

import { useState } from 'react'
import type { ActivationResult, StepStatus } from '@/lib/activate-tenant'
import type { SiteReadinessResult, ReadinessCheck, CheckStatus } from '@/lib/site-readiness'

const STATUS_STYLE: Record<StepStatus, { dot: string; text: string; label: string }> = {
  done: { dot: 'bg-green-500', text: 'text-green-600', label: 'Done' },
  skipped: { dot: 'bg-slate-300', text: 'text-slate-400', label: 'Skipped' },
  action_needed: { dot: 'bg-amber-500', text: 'text-amber-600', label: 'Action' },
  failed: { dot: 'bg-red-500', text: 'text-red-600', label: 'Failed' },
}

const CHECK_STYLE: Record<CheckStatus, { dot: string; text: string; label: string }> = {
  pass: { dot: 'bg-green-500', text: 'text-green-600', label: 'Pass' },
  fail: { dot: 'bg-red-500', text: 'text-red-600', label: 'Fail' },
  action_needed: { dot: 'bg-amber-500', text: 'text-amber-600', label: 'Action' },
}

const GROUP_LABEL: Record<ReadinessCheck['group'], string> = {
  content: 'Content depth',
  seo: 'On-page SEO',
  ops: 'Operational',
  trust: 'Trust & brand',
  compliance: 'Compliance',
}

interface LaunchPanelProps {
  tenantId: string
  slug: string
}

// A loud activation client. Every outcome is shown — HTTP status, raw error,
// per-step result. It never fails silently, so "it didn't work" always comes
// with the exact reason on screen instead of a blank button.
export function LaunchPanel({ tenantId, slug }: LaunchPanelProps) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ActivationResult | null>(null)
  const [error, setError] = useState('')
  const [httpNote, setHttpNote] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [readiness, setReadiness] = useState<SiteReadinessResult | null>(null)
  const [auditing, setAuditing] = useState(false)
  const [readinessError, setReadinessError] = useState('')

  const carryingUrl = `https://${slug}.fullloopcrm.com`

  async function runAudit() {
    setAuditing(true)
    setReadinessError('')
    setReadiness(null)
    try {
      const res = await fetch(`/api/admin/businesses/${tenantId}/readiness`, { credentials: 'include' })
      if (res.status === 401) {
        setReadinessError('Not signed in as admin (401).')
        return
      }
      const data = (await res.json().catch(() => null)) as SiteReadinessResult | { error?: string } | null
      if (!res.ok || !data || 'error' in (data as object)) {
        setReadinessError((data as { error?: string })?.error || `Audit failed (HTTP ${res.status})`)
        return
      }
      setReadiness(data as SiteReadinessResult)
    } catch (e) {
      setReadinessError(e instanceof Error ? e.message : 'Audit never completed')
    } finally {
      setAuditing(false)
    }
  }

  async function activate() {
    setRunning(true)
    setError('')
    setHttpNote('')
    setResult(null)
    try {
      const res = await fetch(`/api/admin/businesses/${tenantId}/activate`, {
        method: 'POST',
        // credentials:'include' is explicit so the admin cookie is always sent,
        // even if the panel is reached across an apex→www redirect.
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      setHttpNote(`HTTP ${res.status}`)

      if (res.status === 401) {
        setError('Not signed in as admin (401). Sign out and back in, then re-run.')
        return
      }

      const raw = await res.text()
      let data: unknown = null
      try {
        data = raw ? JSON.parse(raw) : null
      } catch {
        // Non-JSON body (e.g. an HTML error page from a redirect) — show it raw
        // so the failure is legible instead of a bare "failed".
        setError(`Server returned a non-JSON response (HTTP ${res.status}). First 300 chars:\n${raw.slice(0, 300)}`)
        return
      }

      if (!res.ok) {
        const d = data as { error?: string } | null
        setError(d?.error || `Activation failed (HTTP ${res.status})`)
        return
      }

      setResult(data as ActivationResult)
      setShowSummary(true)
    } catch (e) {
      setError(e instanceof Error ? `Request never completed: ${e.message}` : 'Request never completed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
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

      {running && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-500">
          Running activation… this can take up to a minute (settings, domain, owner login, smoke test).
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
          {httpNote && <span className="font-mono text-xs text-red-500 block mb-1">{httpNote}</span>}
          {error}
        </div>
      )}

      {result && (
        <>
          <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            result.activated || result.ready
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {httpNote && <span className="font-mono text-xs opacity-60 block mb-1">{httpNote}</span>}
            {result.activated
              ? 'Tenant is LIVE — status set to active.'
              : result.ready
                ? 'Ready to go live.'
                : 'Not live yet — resolve the amber/red steps below, then re-run.'}
          </div>

          {result.ownerPin && (
            <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold">Owner PIN — shown once</p>
              <p className="text-2xl font-mono font-bold text-teal-800 mt-1">{result.ownerPin}</p>
              <p className="text-xs text-teal-600 mt-1">Relay to the owner. It can&apos;t be recovered later.</p>
            </div>
          )}

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

          {showSummary && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
              onClick={() => setShowSummary(false)}>
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    result.activated || result.ready ? 'bg-green-50' : 'bg-amber-50'
                  }`}>
                    <span className={`text-lg ${result.activated || result.ready ? 'text-green-600' : 'text-amber-600'}`}>
                      {result.activated || result.ready ? '✓' : '!'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-bold text-lg text-slate-900">
                      {result.activated ? 'Tenant is LIVE' : result.ready ? 'Ready to go live' : 'Auto-setup ran — items need attention'}
                    </h3>
                    <a href={carryingUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:text-teal-700 font-mono">
                      {slug}.fullloopcrm.com ↗
                    </a>
                  </div>
                </div>

                {result.ownerPin && (
                  <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 mb-4">
                    <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold">Owner PIN — shown once</p>
                    <p className="text-2xl font-mono font-bold text-teal-800 mt-1">{result.ownerPin}</p>
                    <p className="text-xs text-teal-600 mt-1">Relay to the owner. It can&apos;t be recovered later.</p>
                  </div>
                )}

                <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">What auto-setup did</p>
                <ul className="space-y-1.5 mb-5">
                  {result.steps.map((s) => {
                    const st = STATUS_STYLE[s.status]
                    return (
                      <li key={s.key} className="flex items-start gap-2.5 text-sm">
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${st.dot}`} />
                        <span className="text-slate-700 flex-1">{s.label}</span>
                        <span className={`text-xs font-semibold ${st.text} flex-shrink-0`}>{st.label}</span>
                      </li>
                    )
                  })}
                </ul>

                <button onClick={() => setShowSummary(false)}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-lg text-sm font-cta font-semibold transition-colors">
                  Done
                </button>
              </div>
            </div>
          )}

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

      {/* Site-Readiness — the global new-tenant build standard, report-only. */}
      <div className="border-t border-slate-200 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading font-semibold text-slate-900 text-lg">Site readiness</h3>
            <p className="text-sm text-slate-500 mt-1">
              Audits the public site against the build standard: content word counts, on-page SEO,
              and the ops/brand basics. Report-only — it never changes status.
            </p>
          </div>
          <button onClick={runAudit} disabled={auditing}
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg text-sm font-cta font-bold disabled:opacity-50 transition-colors shadow-sm flex-shrink-0">
            {auditing ? 'Auditing…' : readiness ? 'Re-run audit' : 'Run site audit'}
          </button>
        </div>

        {auditing && (
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-500">
            Fetching every page and counting words… can take up to a minute.
          </div>
        )}

        {readinessError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
            {readinessError}
          </div>
        )}

        {readiness && (
          <div className="mt-4 space-y-4">
            <div className={`rounded-lg px-4 py-3 text-sm font-semibold flex items-center justify-between ${
              readiness.passed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span>{readiness.passed ? 'Meets the build standard.' : 'Below standard — required checks failing.'}</span>
              <span className="font-mono">{readiness.score}%</span>
            </div>

            {(['content', 'seo', 'ops', 'trust', 'compliance'] as const).map((group) => {
              const rows = readiness.checks.filter((c) => c.group === group)
              if (rows.length === 0) return null
              return (
                <div key={group}>
                  <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1.5">{GROUP_LABEL[group]}</p>
                  <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {rows.map((c) => {
                      const st = CHECK_STYLE[c.status]
                      return (
                        <div key={c.key} className="flex items-start gap-3 px-4 py-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${st.dot}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">
                              {c.label}
                              {c.severity === 'recommended' && <span className="text-[10px] uppercase tracking-wide text-slate-400 ml-2">optional</span>}
                            </p>
                            {c.detail && <p className="text-xs text-slate-500 mt-0.5">{c.detail}</p>}
                          </div>
                          <span className={`text-xs font-semibold ${st.text} flex-shrink-0`}>{st.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
