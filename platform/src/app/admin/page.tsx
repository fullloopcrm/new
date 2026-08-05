import Link from 'next/link'
import { getPlatformHealth } from '@/lib/jefe/health'
import { STAGE_LABELS, PIPELINE_STAGES, type LeadStage } from '@/lib/lead-stages'

// Platform-operator dashboard. This is what Jefe watches: tenant health,
// provisioning gaps, comms/cron/error signals, tenant comms, and — as of this
// redesign — Full Loop's own revenue and sales pipeline. One snapshot, same
// "ladder row" visual language as /dashboard (The Loop), just platform-wide
// instead of single-tenant.

export const dynamic = 'force-dynamic'

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)', muted2: 'var(--color-loop-muted-2)',
  good: 'var(--color-loop-good)', warn: 'var(--color-loop-warn)',
  display: 'var(--display)', mono: 'var(--mono)',
}

const formatMoney = (cents: number) =>
  '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')

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

// One row of bordered stat cells — the shared unit every ladder on this page
// is built from (same shape as /dashboard's revenue/sales/jobs ladders).
function Ladder({ cells }: { cells: Array<{ label: string; val: string | number; sub?: string; emphasize?: boolean; warn?: boolean; good?: boolean }> }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)`, background: V.canvas, border: `1px solid ${V.line}` }}>
      {cells.map((c, i, arr) => (
        <div key={c.label} className="px-5 py-1.5" style={{ borderRight: i < arr.length - 1 ? `1px solid ${V.line}` : 'none', background: c.emphasize ? '#FBFBF6' : V.canvas }}>
          <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.muted, fontWeight: 600, marginBottom: 3 }}>{c.label}</div>
          <div style={{ fontFamily: V.display, fontSize: c.emphasize ? '26px' : '21px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: c.warn ? V.warn : c.good ? V.good : V.ink, fontFeatureSettings: '"tnum","lnum"' }}>{c.val}</div>
          {c.sub && <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted, marginTop: 2 }}>{c.sub}</div>}
        </div>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-block mb-2" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>
      {children}
    </div>
  )
}

export default async function AdminOverviewPage() {
  const h = await getPlatformHealth()

  const financialLadder = [
    { label: 'MRR', val: formatMoney(h.financial.mrr_cents) },
    { label: 'ARR', val: formatMoney(h.financial.arr_cents), emphasize: true },
    { label: 'Setup Collected', val: formatMoney(h.financial.setup_collected_cents) },
    { label: 'At-Risk Revenue', val: formatMoney(h.financial.at_risk_cents), warn: h.financial.at_risk_cents > 0 },
    { label: 'Past-Due Tenants', val: h.financial.past_due_count, warn: h.financial.past_due_count > 0 },
  ]

  const leadsLadder = [
    { label: 'Total Leads', val: h.sales_pipeline.total },
    { label: 'New · 7d', val: h.sales_pipeline.new_7d },
    { label: 'Sold', val: h.sales_pipeline.sold_total },
    { label: 'Conversion %', val: `${h.sales_pipeline.conversion_pct}%` },
  ]
  const stageLadder = PIPELINE_STAGES.concat(['lost'] as LeadStage[]).map((stage) => ({
    label: STAGE_LABELS[stage],
    val: h.sales_pipeline.by_stage[stage] || 0,
  }))

  const tenantLadder = [
    { label: 'Total Tenants', val: h.provisioning.tenants_total, emphasize: true },
    { label: 'Active', val: h.tenant_status.active },
    { label: 'Setup', val: h.tenant_status.setup },
    { label: 'Pending', val: h.tenant_status.pending },
    { label: 'Suspended', val: h.tenant_status.suspended, warn: h.tenant_status.suspended > 0 },
    { label: 'Cancelled', val: h.tenant_status.cancelled },
  ]

  const healthLadder = [
    { label: 'New · 7d', val: h.lifecycle.new_7d },
    { label: 'Gone Quiet', val: h.lifecycle.inactive.length, warn: h.lifecycle.inactive.length > 0 },
    { label: "Can't Operate", val: h.provisioning.fully_unprovisioned, warn: h.provisioning.fully_unprovisioned > 0 },
    { label: 'Sites Down', val: h.uptime.failing.length, warn: h.uptime.failing.length > 0 },
    { label: 'SSL Expiring · 14d', val: h.uptime.expiring_certs.length, warn: h.uptime.expiring_certs.length > 0 },
  ]

  const seoLadder = [
    { label: 'First-Page Rankings', val: h.seo.first_page_count, good: h.seo.first_page_count > 0, emphasize: true, sub: h.seo.rankings_as_of ? `as of ${h.seo.rankings_as_of}` : 'no data yet' },
    { label: 'Improvement Rate', val: `${h.seo.improvement_pct}%`, good: h.seo.improvement_pct >= 50 },
    { label: 'Improved · 7d', val: h.seo.improved_count, good: h.seo.improved_count > 0 },
    { label: 'Declined · 7d', val: h.seo.declined_count, warn: h.seo.declined_count > 0 },
    { label: 'Tenants Tracked', val: h.seo.tenants_tracked },
    { label: 'Alerts · 24h', val: h.seo.alerts_24h, warn: h.seo.alerts_24h > 0 },
  ]

  const commsLadder = [
    { label: 'Total · 7d', val: h.communications.total_7d, emphasize: true },
    { label: 'SMS · 7d', val: h.communications.sms_7d },
    { label: 'Calls · 7d', val: h.communications.calls_7d },
    { label: 'Email · 7d', val: h.communications.email_7d },
    { label: 'Web Chats · 7d', val: h.communications.webchats_7d },
  ]

  const errorLadder = [
    { label: 'Errors · 1h', val: h.errors.last_1h, warn: h.errors.last_1h > 0 },
    { label: 'Errors · 24h', val: h.errors.last_24h, warn: h.errors.last_24h > 0 },
    { label: 'Errors · 7d', val: h.errors.last_7d },
    { label: 'Security · 24h', val: h.security.events_24h, warn: h.security.events_24h > 0 },
    { label: 'Comms Success', val: `${h.comms.success_rate}%`, warn: h.comms.success_rate < 95 },
    { label: 'Silent Crons', val: h.crons.silent.length, warn: h.crons.silent.length > 0 },
  ]

  return (
    <div>
      {/* HEADER */}
      <div className="mb-4">
        <h1 style={{ fontFamily: V.display, fontSize: '44px', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
          Platform<em style={{ fontStyle: 'italic', fontWeight: 400, color: V.muted }}>.</em>
        </h1>
        <p className="mt-2" style={{ fontSize: '13px', color: V.muted }}>
          Full Loop&rsquo;s own revenue, pipeline, and health — across every tenant.
        </p>
      </div>

      {/* FINANCIAL */}
      <div className="mb-4">
        <SectionLabel>Financial</SectionLabel>
        <Ladder cells={financialLadder} />
      </div>

      {/* SALES / LEADS */}
      <div className="mb-4">
        <SectionLabel>Sales &middot; Leads</SectionLabel>
        <div className="mb-2"><Ladder cells={leadsLadder} /></div>
        <Ladder cells={stageLadder} />
      </div>

      {/* TENANTS */}
      <div className="mb-4">
        <SectionLabel>Tenants</SectionLabel>
        <Ladder cells={tenantLadder} />
      </div>

      {/* TENANT HEALTH */}
      <div className="mb-4">
        <SectionLabel>Tenant Health</SectionLabel>
        <Ladder cells={healthLadder} />
      </div>

      {/* SEO */}
      <div className="mb-4">
        <SectionLabel>SEO</SectionLabel>
        <Ladder cells={seoLadder} />
      </div>

      {/* COMMUNICATIONS */}
      <div className="mb-4">
        <SectionLabel>Communications</SectionLabel>
        <Ladder cells={commsLadder} />
      </div>

      {/* PLATFORM ERRORS & OPS */}
      <div className="mb-4">
        <SectionLabel>Errors &amp; Platform Ops</SectionLabel>
        <Ladder cells={errorLadder} />
      </div>

      {/* TENANTS NEEDING ATTENTION + CAN'T OPERATE YET */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Tenants Needing Attention</SectionLabel>
            <Link href="/admin/businesses" style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted }}>All tenants &rarr;</Link>
          </div>
          <div style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
            {h.tenants_with_issues.length === 0 ? (
              <p className="p-4" style={{ color: V.muted }}>No tenants with open issues.</p>
            ) : h.tenants_with_issues.slice(0, 8).map((t, i, arr) => (
              <Link
                key={t.tenant_id}
                href={`/admin/businesses/${t.tenant_id}`}
                className="flex items-start justify-between p-3"
                style={{ borderBottom: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}
              >
                <div className="min-w-0 pr-3">
                  <p className="font-medium truncate" style={{ color: V.ink }}>{t.tenant_name}</p>
                  <p className="text-sm truncate" style={{ color: V.muted }}>{t.latest}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.warn }}>{t.total} {t.total === 1 ? 'issue' : 'issues'}</span>
                  <p style={{ fontFamily: V.mono, fontSize: '9.5px', color: V.muted, marginTop: 2 }}>{timeAgo(t.latest_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Can&rsquo;t Operate Yet</SectionLabel>
            <span style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted }}>{h.provisioning.fully_unprovisioned} fully blocked</span>
          </div>
          <div style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
            {h.provisioning.by_gap.length === 0 ? (
              <p className="p-4" style={{ color: V.muted }}>Every tenant can text, email &amp; charge.</p>
            ) : h.provisioning.by_gap.slice(0, 8).map((g, i, arr) => (
              <div key={g.tenant_name} className="flex items-center justify-between p-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
                <p className="font-medium" style={{ color: V.ink }}>{g.tenant_name}</p>
                <div className="flex gap-1.5">
                  {g.missing.map((m) => (
                    <span key={m} style={{ fontFamily: V.mono, fontSize: '9.5px', color: V.warn, border: `1px solid ${V.line}`, borderRadius: 4, padding: '2px 6px' }}>
                      No {GAP_LABEL[m] ?? m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* INTEGRATION HEALTH + STUCK PAYMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div>
          <SectionLabel>Integration Health</SectionLabel>
          <div style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
            {h.integrations.tenants_with_failures.length === 0 ? (
              <p className="p-4" style={{ color: V.muted }}>
                {h.integrations.swept_at ? 'All tenant keys passing.' : 'No sweep has run yet.'}
              </p>
            ) : h.integrations.tenants_with_failures.slice(0, 8).map((t, i, arr) => (
              <div key={t.tenant_name} className="flex items-center justify-between p-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
                <p className="font-medium" style={{ color: V.ink }}>{t.tenant_name}</p>
                <div className="flex gap-1.5">
                  {t.failed.map((f) => (
                    <span key={f} style={{ fontFamily: V.mono, fontSize: '9.5px', color: V.warn, border: `1px solid ${V.line}`, borderRadius: 4, padding: '2px 6px' }}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {h.integrations.swept_at && (
            <p style={{ fontFamily: V.mono, fontSize: '9.5px', color: V.muted, marginTop: 6 }}>Last swept {timeAgo(h.integrations.swept_at)}</p>
          )}
        </div>

        <div>
          <SectionLabel>Stuck Payments &amp; Quiet Tenants</SectionLabel>
          <div style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
            {h.payments.by_tenant.length === 0 ? (
              <p className="p-4" style={{ color: V.muted }}>No payments stuck over 24h.</p>
            ) : h.payments.by_tenant.slice(0, 5).map((p, i, arr) => (
              <div key={p.tenant_name} className="flex items-center justify-between p-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
                <p style={{ color: V.ink }}>{p.tenant_name}</p>
                <span style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.warn }}>{p.count} unpaid &gt;24h</span>
              </div>
            ))}
          </div>
          {h.lifecycle.inactive.length > 0 && (
            <div className="mt-3">
              <p style={{ fontFamily: V.mono, fontSize: '10px', color: V.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Gone quiet</p>
              <div className="flex flex-wrap gap-1.5">
                {h.lifecycle.inactive.slice(0, 8).map((t) => (
                  <span key={t.tenant_name} style={{ fontFamily: V.mono, fontSize: '9.5px', color: V.muted, border: `1px solid ${V.line}`, borderRadius: 4, padding: '2px 6px' }}>
                    {t.tenant_name} &middot; {timeAgo(t.last_active)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="mb-4">
        <SectionLabel>Recent Activity</SectionLabel>
        <div style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
          {h.recent_issues.length === 0 ? (
            <p className="p-4" style={{ color: V.muted }}>No recent platform issues.</p>
          ) : h.recent_issues.map((it, i, arr) => (
            <div key={`${it.tenant_id}-${it.created_at}-${i}`} className="flex items-start gap-3 p-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${V.line}` : 'none' }}>
              <span style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: V.warn, width: 130, flexShrink: 0, marginTop: 2 }}>{it.type.replace(/_/g, ' ')}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate" style={{ color: V.ink }}>{it.title || it.message}</p>
                <p style={{ fontFamily: V.mono, fontSize: '10px', color: V.muted, marginTop: 2 }}>{it.tenant_name}</p>
              </div>
              <span style={{ fontFamily: V.mono, fontSize: '10px', color: V.muted, flexShrink: 0 }}>{timeAgo(it.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
