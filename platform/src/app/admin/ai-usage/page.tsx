import { supabaseAdmin } from '@/lib/supabase'
import { estimateCostUsd, AI_RATES_PER_MTOK } from '@/lib/ai-usage'

export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 30
const ROW_CAP = 100_000 // app-side aggregation cap; revisit if volume grows

function usd(n: number): string {
  return n < 0.01 && n > 0 ? '<$0.01' : `$${n.toFixed(2)}`
}
function compact(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n)
}

export default async function AdminAiUsagePage() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: tenants }, { data: usage }] = await Promise.all([
    supabaseAdmin.from('tenants').select('id, name, slug, status, anthropic_api_key').order('name'),
    supabaseAdmin.from('ai_usage').select('tenant_id, input_tokens, output_tokens').gte('created_at', since).limit(ROW_CAP),
  ])

  const ownKey = new Map<string, boolean>()
  const meta = new Map<string, { name: string; active: boolean }>()
  for (const t of tenants || []) {
    ownKey.set(t.id, !!t.anthropic_api_key)
    meta.set(t.id, { name: t.name, active: t.status === 'active' })
  }

  const agg = new Map<string, { input: number; output: number }>()
  for (const r of usage || []) {
    const a = agg.get(r.tenant_id) || { input: 0, output: 0 }
    a.input += r.input_tokens || 0
    a.output += r.output_tokens || 0
    agg.set(r.tenant_id, a)
  }

  const rows = [...meta.entries()].map(([id, m]) => {
    const a = agg.get(id) || { input: 0, output: 0 }
    const cost = estimateCostUsd(a.input, a.output)
    return { id, name: m.name, active: m.active, own: ownKey.get(id) || false, input: a.input, output: a.output, cost }
  }).sort((x, y) => y.cost - x.cost)

  const totalTenants = rows.length
  const ownCount = rows.filter(r => r.own).length
  const platformCount = totalTenants - ownCount
  const platformSpend = rows.filter(r => !r.own).reduce((s, r) => s + r.cost, 0)
  const totalSpend = rows.reduce((s, r) => s + r.cost, 0)

  const Card = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-800">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  )

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-semibold text-slate-800">AI Usage &amp; Cost</h1>
      <p className="mt-1 text-sm text-slate-500">
        Per-tenant Anthropic spend, last {WINDOW_DAYS} days. Cost is an estimate at
        ${AI_RATES_PER_MTOK.input}/M input, ${AI_RATES_PER_MTOK.output}/M output —
        authoritative billing is on the Anthropic account. Logged from the SMS/web/telegram
        brains only (dashboard AI routes are low-volume and not tracked).
      </p>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card label="Tenants" value={String(totalTenants)} sub={`${ownCount} own key · ${platformCount} platform`} />
        <Card label="On platform key" value={String(platformCount)} sub="you pay for these" />
        <Card label="Platform-key spend" value={usd(platformSpend)} sub={`${WINDOW_DAYS}d, est.`} />
        <Card label="Total AI spend" value={usd(totalSpend)} sub={`${WINDOW_DAYS}d, est.`} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-medium px-4 py-2">Tenant</th>
              <th className="text-left font-medium px-4 py-2">Key</th>
              <th className="text-right font-medium px-4 py-2">Input</th>
              <th className="text-right font-medium px-4 py-2">Output</th>
              <th className="text-right font-medium px-4 py-2">Est. cost ({WINDOW_DAYS}d)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">
                  {r.name}{!r.active && <span className="ml-2 text-xs text-slate-400">(inactive)</span>}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${r.own ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {r.own ? 'Own key' : 'Platform'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-slate-500">{compact(r.input)}</td>
                <td className="px-4 py-2 text-right text-slate-500">{compact(r.output)}</td>
                <td className="px-4 py-2 text-right text-slate-800 font-medium">{usd(r.cost)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No usage logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
