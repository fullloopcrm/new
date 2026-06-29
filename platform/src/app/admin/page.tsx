import Link from 'next/link'
import { getPlatformHealth } from '@/lib/jefe/health'

// Platform-operator dashboard. This is what Jefe watches: tenant health,
// provisioning gaps, comms/cron/error signals, and (soon) tenant comms.
// NOT a build checklist and NOT tenant ops.

export const dynamic = 'force-dynamic'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const GAP_LABEL: Record<string, string> = { sms: 'Text', email: 'Email', payments: 'Charge' }

export default async function AdminOverviewPage() {
  const h = await getPlatformHealth()

  const stats = [
    { label: 'Tenants', value: h.provisioning.tenants_total, accent: 'border-l-slate-400' },
    { label: 'New · 7d', value: h.lifecycle.new_7d, accent: 'border-l-teal-500' },
    { label: 'Issues · 24h', value: h.stability.issues_24h, accent: h.stability.issues_24h > 0 ? 'border-l-amber-500' : 'border-l-slate-300' },
    { label: 'Comms · 24h', value: `${h.comms.success_rate}%`, accent: h.comms.success_rate < 95 ? 'border-l-red-500' : 'border-l-green-500' },
    { label: 'Stuck Pay', value: h.payments.stuck_unpaid_24h, accent: h.payments.stuck_unpaid_24h > 0 ? 'border-l-amber-500' : 'border-l-slate-300' },
    { label: 'Errors · 24h', value: h.errors.last_24h, accent: h.errors.last_24h > 0 ? 'border-l-red-500' : 'border-l-slate-300' },
  ]

  return (
    <div>
      {/* HEADER */}
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '44px', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
          Platform<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--color-loop-muted)' }}>.</em>
        </h1>
        <p className="mt-2" style={{ fontSize: '13px', color: 'var(--color-loop-muted)' }}>
          Live health across every tenant on Full Loop &mdash; what Jefe watches.
        </p>
      </div>

      {/* REVENUE ROW — placeholder until seat-based billing ($1k/admin + $100/team + setup) is wired. */}
      <div className="grid grid-cols-3 gap-3 mb-4 rounded-lg border border-slate-200 bg-slate-900 px-5 py-4">
        {[
          { label: 'MRR', value: '$0' },
          { label: 'ARR', value: '$0' },
          { label: 'Setup Collected', value: '$0' },
        ].map((r) => (
          <div key={r.label}>
            <p className="text-[10px] uppercase tracking-wide text-white/40">{r.label}</p>
            <p className="text-3xl font-bold font-mono mt-1 text-white">{r.value}</p>
          </div>
        ))}
      </div>

      {/* STAT STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`border-l-4 ${s.accent} pl-4 py-3`}>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* TENANT COMMUNICATION — placeholder (system not built yet) */}
      <div className="mb-8 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider">Tenant Communication</h2>
            <p className="text-xs text-slate-500 mt-1">
              Broadcast and 1:1 messaging to tenant operators. Not built yet &mdash; coming.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded text-[10px] font-medium bg-slate-200 text-slate-500 uppercase tracking-wide">Coming</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
        {/* TENANTS NEEDING ATTENTION */}
        <section>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider">Tenants Needing Attention</h2>
            <Link href="/admin/businesses" className="text-xs text-teal-600 hover:text-teal-700">All tenants</Link>
          </div>
          <div className="divide-y divide-slate-200">
            {h.tenants_with_issues.slice(0, 8).map((t) => (
              <Link
                key={t.tenant_id}
                href={`/admin/businesses/${t.tenant_id}`}
                className="flex items-start justify-between py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium text-slate-900">{t.tenant_name}</p>
                  <p className="text-xs text-slate-500 truncate">{t.latest}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                    {t.total} {t.total === 1 ? 'issue' : 'issues'}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(t.latest_at)}</p>
                </div>
              </Link>
            ))}
            {h.tenants_with_issues.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-sm">No tenants with open issues</div>
            )}
          </div>
        </section>

        {/* PROVISIONING GAPS */}
        <section>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider">Can&rsquo;t Operate Yet</h2>
            <span className="text-xs text-slate-400">
              {h.provisioning.fully_unprovisioned} fully blocked
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {h.provisioning.by_gap.slice(0, 8).map((g) => (
              <div key={g.tenant_name} className="flex items-center justify-between py-3">
                <p className="text-sm font-medium text-slate-900">{g.tenant_name}</p>
                <div className="flex gap-1.5">
                  {g.missing.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
                      No {GAP_LABEL[m] ?? m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {h.provisioning.by_gap.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-sm">Every tenant can text, email &amp; charge</div>
            )}
          </div>
        </section>

        {/* PLATFORM SIGNALS */}
        <section>
          <div className="pb-3 mb-3 border-b border-slate-200">
            <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider">Platform Signals</h2>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Silent crons</dt>
              <dd className={`font-mono ${h.crons.silent.length > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                {h.crons.silent.length === 0 ? 'all firing' : h.crons.silent.map((c) => c.name).join(', ')}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Comms failed · 24h</dt>
              <dd className={`font-mono ${h.comms.failed_24h > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>{h.comms.failed_24h}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Errors · 1h / 24h / 7d</dt>
              <dd className="font-mono text-slate-700">{h.errors.last_1h} / {h.errors.last_24h} / {h.errors.last_7d}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Security events · 24h</dt>
              <dd className="font-mono text-slate-700">{h.security.events_24h}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">New inquiries · 7d</dt>
              <dd className="font-mono text-slate-700">{h.sales.inquiries_new_7d}</dd>
            </div>
          </dl>
        </section>

        {/* QUIET / STUCK */}
        <section>
          <div className="pb-3 mb-3 border-b border-slate-200">
            <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider">Stuck Payments &amp; Quiet Tenants</h2>
          </div>
          {h.payments.by_tenant.length > 0 ? (
            <div className="divide-y divide-slate-200 mb-4">
              {h.payments.by_tenant.slice(0, 5).map((p) => (
                <div key={p.tenant_name} className="flex items-center justify-between py-2.5">
                  <p className="text-sm text-slate-900">{p.tenant_name}</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                    {p.count} unpaid &gt;24h
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-4">No payments stuck over 24h.</p>
          )}
          {h.lifecycle.inactive.length > 0 && (
            <>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1.5">Gone quiet</p>
              <div className="flex flex-wrap gap-1.5">
                {h.lifecycle.inactive.slice(0, 8).map((t) => (
                  <span key={t.tenant_name} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    {t.tenant_name} · {timeAgo(t.last_active)}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
