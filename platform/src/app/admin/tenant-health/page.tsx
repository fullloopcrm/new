import { supabaseAdmin } from '@/lib/supabase'

// Fortress board — every tenant site's live health at a glance. Data is written
// by the /api/cron/tenant-health cron (every 15 min). Read-only.

export const dynamic = 'force-dynamic'

interface Row {
  slug: string
  domain: string
  status: string
  matched_path: string | null
  checks: { reachable?: boolean; routing?: boolean; noLoop?: boolean; formWired?: boolean } | null
  detail: string | null
  checked_at: string | null
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never'
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const CHECK_LABELS: [keyof NonNullable<Row['checks']>, string][] = [
  ['reachable', 'Up'],
  ['routing', 'Own site'],
  ['noLoop', 'No loop'],
  ['formWired', 'Form'],
]

export default async function TenantHealthPage() {
  const { data } = await supabaseAdmin
    .from('tenant_health')
    .select('slug, domain, status, matched_path, checks, detail, checked_at')
    .order('status', { ascending: true }) // 'fail' < 'pass'
    .order('slug', { ascending: true })

  const rows = (data ?? []) as Row[]
  const failing = rows.filter((r) => r.status === 'fail')
  const passing = rows.length - failing.length
  const lastRun = rows.reduce<string | null>((acc, r) => (r.checked_at && (!acc || r.checked_at > acc) ? r.checked_at : acc), null)
  const allGreen = failing.length === 0 && rows.length > 0

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fortress — Tenant Health</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live site checks, refreshed every 15 min · last run {timeAgo(lastRun)}
          </p>
        </div>
        <div
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            allGreen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {allGreen ? `All ${rows.length} tenants healthy` : `${failing.length} failing · ${passing} healthy`}
        </div>
      </div>

      {rows.length === 0 && (
        <p className="mt-10 text-slate-500">No health data yet — the cron hasn’t run. Trigger it or wait for the next 15-min tick.</p>
      )}

      <ul className="mt-8 space-y-2">
        {rows.map((r) => {
          const ok = r.status === 'pass'
          return (
            <li
              key={r.domain}
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 ${
                ok ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-900">{r.slug}</div>
                <a
                  href={`https://${r.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs text-slate-500 hover:text-slate-700 hover:underline"
                >
                  {r.domain}
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                {CHECK_LABELS.map(([key, label]) => {
                  const val = r.checks?.[key]
                  return (
                    <span
                      key={key}
                      title={label}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        val === false ? 'bg-red-200 text-red-900' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
              {!ok && r.detail && (
                <div className="w-full text-xs font-medium text-red-700 sm:w-auto sm:flex-1 sm:text-right">
                  {r.detail}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
