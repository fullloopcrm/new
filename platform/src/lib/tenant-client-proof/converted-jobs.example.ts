/**
 * PROOF OF CONVERSION — jobs list + money rollup — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/jobs/route.ts  (GET: every job for the tenant + a per-job payment rollup)
 *
 * What this route adds over prior proofs: MIXED EMBED SAFETY in a single `.select()`. The
 * read embeds TWO child tables with OPPOSITE tier-ordering safety:
 *
 *   - `clients(name)`               — child `clients` is tier #1, BEFORE parent `jobs` #26.
 *                                     SAFE: the child policy is load-bearing before cutover
 *                                     (same class as the reviews / quotes safe embeds).
 *   - `job_payments(amount_cents,…)`— child `job_payments` is tier #28, AFTER parent `jobs`
 *                                     #26. INVERSION HAZARD: at the moment `jobs` cuts over,
 *                                     `job_payments` has NO policy yet, so a scoped read of
 *                                     the embed default-denies and the money rollup silently
 *                                     computes from an empty payment set (contracted/paid/…
 *                                     all 0) — no throw, wrong numbers.
 *
 * So this route is NEITHER a clean floor case NOR a uniform hold: PART of the embed is
 * cutover-ready and PART is not. CUTOVER RULE: HOLD until `job_payments` (tier #28) is
 * load-bearing — do not cut `jobs` over on the strength of the safe `clients` embed alone.
 * (Contrast: reviews = all-safe embed; bank-accounts = parent-before-both-children hold;
 * here the split is WITHIN one select.) This is the same silent-degradation class as
 * sidebar-counts, not the null-sub-object class — the embed resolves to `[]`, the rollup
 * just under-counts.
 *
 * Secondary variant preserved verbatim: a POST-FETCH money rollup transform (per-job
 * contracted/paid/due/overdue + a tenant-wide total), orthogonal to the client swap. The
 * `overdue` bucket compares `due_at < now`, so the proof injects the clock (`nowMs`) to keep
 * that boundary deterministic — the live route uses `new Date().toISOString()`.
 *
 * ERROR HANDLING — faithful: the live route returns a 500 on a read error (it does NOT
 * swallow to `[]`). The extracted function surfaces that by `throw`ing the error; the route
 * layer is what turns it into the 500 JSON.
 *
 * Auth entry is unchanged: the live GET authenticates via `getTenantForRequest()`. This proof
 * takes `tenantId` + `nowMs` directly so the isolation test exercises the mixed embed and the
 * deterministic rollup without the auth layer.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** The columns/embeds the live route selects (order preserved for a faithful proof). */
const JOBS_SELECT =
  'id, title, status, total_cents, created_at, client_id, clients(name), job_payments(amount_cents, status, due_at)'

interface PaymentRow {
  amount_cents: number
  status: string
  due_at: string | null
}

/** Per-job money rollup — ported verbatim from the live route. */
function rollup(payments: PaymentRow[], nowIso: string) {
  let contracted = 0, paid = 0, due = 0, overdue = 0
  for (const p of payments) {
    contracted += p.amount_cents
    if (p.status === 'paid') paid += p.amount_cents
    else if (p.status === 'invoiced') {
      due += p.amount_cents
      if (p.due_at && p.due_at < nowIso) overdue += p.amount_cents
    }
  }
  return { contracted, paid, due, overdue }
}

/**
 * Converted read path of GET /api/jobs. Fetches every job for the tenant (with the
 * clients + job_payments embeds) through the scoped client, keeping the tenant scope, the
 * created-at-desc order and the 500 cap, then applies the per-job + tenant-wide money
 * rollup. Surfaces a read error via `throw` (the route maps it to a 500).
 */
export async function listJobsConverted(tenantId: string, nowMs: number) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — select/scope/order/limit unchanged
  const nowIso = new Date(nowMs).toISOString()

  const { data: jobs, error } = await db
    .from('jobs')
    .select(JOBS_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error

  const rows = (jobs ?? []).map((j: Record<string, unknown>) => {
    const payments = (j.job_payments as PaymentRow[]) ?? []
    const money = rollup(payments, nowIso)
    const client = j.clients as { name?: string } | null
    return {
      id: j.id as string,
      title: (j.title as string) || 'Job',
      status: j.status as string,
      client_name: client?.name ?? null,
      created_at: j.created_at as string,
      ...money,
    }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      contracted: acc.contracted + r.contracted,
      paid: acc.paid + r.paid,
      due: acc.due + r.due,
      overdue: acc.overdue + r.overdue,
    }),
    { contracted: 0, paid: 0, due: 0, overdue: 0 },
  )

  return { jobs: rows, totals }
}
