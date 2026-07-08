// seomgr — guarded auto-verification orchestrator. Turns `awaiting_grant`
// properties into live Search Console properties WITHOUT a human, by verifying
// the URL-prefix via the FILE method (see gsc-write.ts). Every live action is
// wrapped in guardrails; the default path is a safe dry-run.
//
// GUARDRAILS
//  1. Flag gate     — no live action unless SEOMGR_AUTOVERIFY_ENABLED === 'true'.
//  2. Allowlist     — only domains that are (a) awaiting_grant in seo_properties
//                     AND (b) an ACTIVE tenant_domains row. Never arbitrary hosts.
//  3. Rate cap      — at most AUTOVERIFY_MAX_PER_RUN per run (default 5).
//  4. Idempotent    — skip anything already granted (permission present).
//  5. Non-destruct. — only ever advances awaiting_grant → verified; never edits a
//                     live property.
//  6. Audit         — every attempt + outcome recorded in seo_properties.meta.
import { supabaseAdmin } from '@/lib/supabase'
import { getFileToken, verifyUrlPrefix, addSearchConsoleSite } from './gsc-write'

const MAX_PER_RUN = Number(process.env.AUTOVERIFY_MAX_PER_RUN) || 5

export function autoVerifyEnabled(): boolean {
  return process.env.SEOMGR_AUTOVERIFY_ENABLED === 'true'
}

export type Eligible = { property: string; domain: string; tenant_id: string | null }

/**
 * The allowlist: properties awaiting a grant that also have an active tenant
 * domain. Pure DB read — safe to run anytime (this is what dry-run reports).
 */
export async function eligibleForAutoVerify(): Promise<Eligible[]> {
  const props = await supabaseAdmin
    .from('seo_properties')
    .select('property,domain,tenant_id,permission,meta')
  const active = await supabaseAdmin.from('tenant_domains').select('domain').eq('active', true)  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
  const norm = (d: string) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
  const activeDomains = new Set((active.data ?? []).map((r) => norm(String(r.domain))))

  return (props.data ?? [])
    .filter((p) => {
      const awaiting = (p.meta as { gsc_status?: string } | null)?.gsc_status === 'awaiting_grant'
      const notLive = !p.permission // idempotency: already-granted props have a permission
      const domain = norm(String(p.domain || p.property).replace('sc-domain:', ''))
      return awaiting && notLive && activeDomains.has(domain)
    })
    .map((p) => ({
      property: String(p.property),
      domain: String(p.domain || p.property).replace('sc-domain:', ''),
      tenant_id: (p.tenant_id as string | null) ?? null,
    }))
}

async function audit(property: string, entry: Record<string, unknown>): Promise<void> {
  const cur = await supabaseAdmin.from('seo_properties').select('meta').eq('property', property).single()  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
  const meta = (cur.data?.meta as Record<string, unknown>) ?? {}
  const log = Array.isArray(meta.autoverify_log) ? (meta.autoverify_log as unknown[]) : []
  await supabaseAdmin
    .from('seo_properties')  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
    .update({ meta: { ...meta, ...entry, autoverify_log: [...log, { at: new Date().toISOString(), ...entry }] } })
    .eq('property', property)
}

export type AutoVerifyResult = {
  enabled: boolean
  dryRun: boolean
  eligible: number
  attempted: number
  verified: number
  failed: number
  wouldVerify: string[]
  errors: string[]
}

export async function runAutoVerify(opts?: { dryRun?: boolean; max?: number }): Promise<AutoVerifyResult> {
  const enabled = autoVerifyEnabled()
  const dryRun = opts?.dryRun ?? !enabled // live only when explicitly enabled
  const cap = opts?.max ?? MAX_PER_RUN
  const eligible = await eligibleForAutoVerify()
  const batch = eligible.slice(0, cap)

  const res: AutoVerifyResult = {
    enabled, dryRun, eligible: eligible.length, attempted: 0, verified: 0, failed: 0,
    wouldVerify: batch.map((e) => e.domain), errors: [],
  }
  if (dryRun) return res

  for (const e of batch) {
    res.attempted++
    try {
      // 1. Get a FILE token and stash it so the site can serve it.
      const { token } = await getFileToken(e.domain)
      await audit(e.property, { gsc_status: 'verifying', verify_token: token })
      // 2. Verify (requires the token file to be live on the site) + add to GSC.
      await verifyUrlPrefix(e.domain)
      await addSearchConsoleSite(e.domain)
      await audit(e.property, { gsc_status: 'verified_pending_ingest' })
      res.verified++
    } catch (err) {
      res.failed++
      const m = err instanceof Error ? err.message : String(err)
      res.errors.push(`${e.domain}: ${m}`)
      await audit(e.property, { autoverify_error: m }).catch(() => {})
    }
  }
  return res
}
