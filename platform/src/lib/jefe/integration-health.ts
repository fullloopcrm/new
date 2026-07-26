// Jefe — integration-health sweep. Periodically validates every tenant's
// vendor keys (Telnyx/Resend/Stripe + a tenant's own Anthropic key, if set)
// so a dead key surfaces to Jeff BEFORE a tenant's client hits it. Reuses the
// exact same live checks as /api/admin/businesses/[id]/verify-checklist
// (src/lib/onboarding-verify.ts) — this is the same verification, run for
// every tenant on a cron instead of one tenant on demand.
//
// Runs on a cron (src/app/api/cron/integration-health-sweep) and persists
// the latest result per tenant into jefe_integration_health. Jefe's
// getPlatformHealth() reads that table (cheap), never runs the live checks
// itself — vendor API calls are too slow/costly to run on every chat turn.
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptSecret } from '@/lib/secret-crypto'
import { runAllChecks, type TenantForVerify } from '@/lib/onboarding-verify'

interface TenantRow extends TenantForVerify {
  name: string
  anthropic_api_key: string | null
}

const TENANT_COLS =
  'id, name, domain, resend_api_key, resend_domain, telnyx_api_key, telnyx_phone, stripe_api_key, stripe_account_id, anthropic_api_key'

// Only the vendor checks that represent an ONGOING operational risk (a key
// going dead after setup). DNS/SSL/MX are onboarding-readiness checks, not
// something that regresses on its own — excluded here to keep the sweep
// focused and avoid false "integration" alarms for a DNS blip.
const VENDOR_CHECK_KEYS = ['resend_domain_verified', 'telnyx_number_active', 'stripe_account', 'stripe_webhook_configured'] as const

async function checkTenantAnthropic(key: string | null): Promise<{ ok: boolean; detail: string } | null> {
  if (!key) return null // no tenant-level override — platform key is covered by cron/anthropic-health
  try {
    const client = new Anthropic({ apiKey: decryptSecret(key) })
    await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] })
    return { ok: true, detail: 'tenant Anthropic key valid' }
  } catch (e) {
    return { ok: false, detail: `tenant Anthropic key failed: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown'}` }
  }
}

// Small concurrency cap so a sweep across every tenant doesn't fire dozens of
// simultaneous DNS/HTTPS/vendor-API calls at once.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export interface SweepSummary {
  tenants_checked: number
  tenants_with_failures: number
}

export async function sweepIntegrationHealth(): Promise<SweepSummary> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com').replace(/\/$/, '')

  const { data, error } = await supabaseAdmin.from('tenants').select(TENANT_COLS).neq('status', 'deleted')
  if (error) throw new Error(`fetch tenants failed: ${error.message}`)
  const tenants = (data || []) as TenantRow[]

  let tenantsWithFailures = 0

  await mapWithConcurrency(tenants, 4, async (t) => {
    const tenantForVerify: TenantForVerify = {
      id: t.id,
      domain: t.domain,
      resend_api_key: t.resend_api_key ? decryptSecret(t.resend_api_key) : t.resend_api_key,
      resend_domain: t.resend_domain,
      telnyx_api_key: t.telnyx_api_key ? decryptSecret(t.telnyx_api_key) : t.telnyx_api_key,
      telnyx_phone: t.telnyx_phone,
      stripe_api_key: t.stripe_api_key ? decryptSecret(t.stripe_api_key) : t.stripe_api_key,
      stripe_account_id: t.stripe_account_id,
    }

    const allChecks = await runAllChecks(tenantForVerify, appUrl)
    const anthropicCheck = await checkTenantAnthropic(t.anthropic_api_key)

    const checks: Record<string, { ok: boolean; detail: string }> = {}
    for (const key of VENDOR_CHECK_KEYS) checks[key] = allChecks[key]
    if (anthropicCheck) checks.anthropic_key = anthropicCheck

    // A missing key isn't a "failure" (many tenants legitimately haven't
    // provisioned a vendor yet — that's Jefe's `provisioning` pillar, not
    // this one). Only count checks that ran against a configured key and
    // came back broken.
    const configured = {
      resend_domain_verified: !!tenantForVerify.resend_api_key,
      telnyx_number_active: !!tenantForVerify.telnyx_api_key,
      stripe_account: !!tenantForVerify.stripe_api_key,
      stripe_webhook_configured: !!tenantForVerify.stripe_api_key,
      anthropic_key: !!t.anthropic_api_key,
    }
    const failed = Object.entries(checks)
      .filter(([key, result]) => configured[key as keyof typeof configured] && !result.ok)
      .map(([key]) => key)

    if (failed.length > 0) tenantsWithFailures++

    await supabaseAdmin.from('jefe_integration_health').upsert({
      tenant_id: t.id,
      tenant_name: t.name,
      checks,
      failed,
      failed_count: failed.length,
      checked_at: new Date().toISOString(),
    })
  })

  return { tenants_checked: tenants.length, tenants_with_failures: tenantsWithFailures }
}
