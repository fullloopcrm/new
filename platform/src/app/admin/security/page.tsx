import { supabaseAdmin } from '@/lib/supabase'
import { isEncrypted } from '@/lib/secret-crypto'
import Link from 'next/link'

const eventColors: Record<string, string> = {
  suspicious_login: 'bg-red-50 text-red-600 border border-red-200',
  api_key_change: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
  status_change: 'bg-teal-50 text-teal-600 border border-teal-200',
  plan_change: 'bg-teal-50 text-teal-600 border border-teal-200',
  login: 'bg-green-50 text-green-600 border border-green-200',
  impersonation: 'bg-purple-50 text-purple-600 border border-purple-200',
}

type Check = { label: string; ok: boolean | null; detail: string }

function StatusDot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? 'bg-slate-300' : ok ? 'bg-green-500' : 'bg-red-500'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
}

export default async function AdminSecurityPage() {
  // --- Data (all platform-admin, read-only) ---
  const [{ data: events }, { data: tenants }, { data: impersonations }] = await Promise.all([
    supabaseAdmin.from('security_events').select('*, tenants(name, slug)').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('tenants').select('id, name, slug, stripe_api_key, telnyx_api_key, resend_api_key').order('name'),
    supabaseAdmin.from('impersonation_events').select('id, actor_kind, actor_id, tenant_id, ip, created_at').order('created_at', { ascending: false }).limit(50),
  ])

  const tenantName: Record<string, string> = {}
  for (const t of tenants || []) tenantName[t.id] = t.name

  // --- Secret health: booleans only, never the key value ---
  const SECRET_COLS = ['stripe_api_key', 'telnyx_api_key', 'resend_api_key'] as const
  let plaintextCount = 0
  const secretRows = (tenants || []).map((t) => {
    const cols = SECRET_COLS.map((c) => {
      const v = (t as Record<string, unknown>)[c] as string | null
      const present = !!v
      const enc = present ? isEncrypted(v) : null
      if (present && enc === false) plaintextCount++
      return { col: c, present, enc }
    })
    return { id: t.id, name: t.name, cols }
  })

  // --- Posture checks ---
  const unsignedImpersonation = process.env.IMPERSONATION_ALLOW_UNSIGNED === '1'
  const checks: Check[] = [
    { label: 'Per-tenant secrets encrypted at rest', ok: plaintextCount === 0, detail: plaintextCount === 0 ? 'No plaintext keys found' : `${plaintextCount} plaintext key(s) — re-save to encrypt` },
    { label: 'Unsigned impersonation disabled', ok: !unsignedImpersonation, detail: unsignedImpersonation ? 'IMPERSONATION_ALLOW_UNSIGNED=1 — forgeable!' : 'Signed impersonation only' },
    { label: 'Tenant isolation enforced by RLS', ok: null, detail: 'Pending — positive RLS policies + tenantDb() wrapper not yet landed' },
  ]

  // --- Webhook signature secrets configured? ---
  const webhooks = [
    { name: 'Stripe', ok: !!process.env.STRIPE_WEBHOOK_SECRET },
    { name: 'Clerk', ok: !!process.env.CLERK_WEBHOOK_SECRET },
    { name: 'Resend', ok: !!process.env.RESEND_WEBHOOK_SECRET },
    { name: 'Telnyx', ok: !!process.env.TELNYX_PUBLIC_KEY },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-slate-900 font-heading text-2xl font-bold">Security</h1>
        <p className="text-sm text-slate-500">Platform posture, secrets, impersonation, and events</p>
      </div>

      {/* POSTURE CHECKS */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">System posture</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {checks.map((c) => (
            <div key={c.label} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <StatusDot ok={c.ok} />
                <span className="text-sm font-medium text-slate-900">{c.label}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{c.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WEBHOOK STATUS */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Webhook signature verification</h2>
        <div className="flex flex-wrap gap-2">
          {webhooks.map((w) => (
            <div key={w.name} className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <StatusDot ok={w.ok} />
              <span className="text-sm text-slate-700">{w.name}</span>
              <span className="text-xs text-slate-400">{w.ok ? 'configured' : 'missing'}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SECRET HEALTH — booleans only, never the values */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Per-tenant secret health</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="px-3 py-2 font-medium">Business</th>
                {SECRET_COLS.map((c) => (
                  <th key={c} className="px-3 py-2 font-medium">{c.replace('_api_key', '').replace('_', ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {secretRows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700">{r.name}</td>
                  {r.cols.map((c) => (
                    <td key={c.col} className="px-3 py-2">
                      {!c.present ? (
                        <span className="text-slate-300">—</span>
                      ) : c.enc ? (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-200">encrypted</span>
                      ) : (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">plaintext</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {secretRows.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No tenants</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* IMPERSONATION AUDIT */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Impersonation audit (last 50)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Into tenant</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(impersonations || []).map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700">{e.actor_kind}<span className="text-slate-400"> · {e.actor_id}</span></td>
                  <td className="px-3 py-2 text-slate-700">{tenantName[e.tenant_id] || e.tenant_id}</td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-xs">{e.ip || '—'}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                </tr>
              ))}
              {(!impersonations || impersonations.length === 0) && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No impersonation events</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECURITY EVENTS FEED (existing) */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Security events (last 100)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="px-3 py-2 font-medium">Business</th>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(events || []).map((e) => {
                const tenant = e.tenants as unknown as { name: string; slug: string } | null
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      {tenant ? (
                        <Link href={`/admin/businesses/${e.tenant_id}`} className="text-teal-600 hover:text-teal-700">{tenant.name}</Link>
                      ) : (<span className="text-slate-500">—</span>)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${eventColors[e.type] || 'bg-slate-200 text-slate-400'}`}>{e.type?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{e.description}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">{e.ip_address || '—'}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(e.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</td>
                  </tr>
                )
              })}
              {(!events || events.length === 0) && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No events recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
