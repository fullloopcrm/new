/**
 * Communications gate trace — for every active tenant, evaluates the REAL
 * isCommEnabled() logic (same code the live routes call) against that
 * tenant's REAL stored preferences and REAL Resend/Telnyx capability, for
 * every comm this session wired into the gate. Read-only: does not send
 * any email/SMS, does not create bookings/leads/clients.
 *
 * Run: npx tsx scripts/verify-comms-gate.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

async function main() {
  const { isCommEnabled, deriveCapabilities } = await import('../src/lib/comms-prefs')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, slug, status, owner_email, resend_api_key, telnyx_api_key, telnyx_phone')
    .eq('status', 'active')
    .order('name')

  if (error) throw error
  if (!tenants || tenants.length === 0) {
    console.log('No active tenants found.')
    return
  }

  // (comm key, channel) pairs this session actually wired into a send path.
  const CHECKS: Array<{ key: string; channel: 'email' | 'sms' }> = [
    { key: 'lead_received', channel: 'email' },
    { key: 'owner_new_lead', channel: 'email' },
    { key: 'owner_new_application', channel: 'email' },
    { key: 'owner_new_booking', channel: 'email' },
    { key: 'booking_received', channel: 'email' },
    { key: 'booking_received', channel: 'sms' },
    { key: 'booking_confirmed', channel: 'email' },
    { key: 'booking_confirmed', channel: 'sms' },
    { key: 'team_assignment', channel: 'sms' },
    { key: 'reschedule', channel: 'email' },
    { key: 'reschedule', channel: 'sms' },
    { key: 'cancellation', channel: 'sms' },
    { key: 'team_daily_summary', channel: 'sms' },
    { key: 'confirmation_reminder', channel: 'sms' },
    { key: 'payment_reminder', channel: 'sms' },
    { key: 'rating_prompt', channel: 'sms' },
    { key: 'retention', channel: 'sms' },
    { key: 'owner_late_alert', channel: 'sms' },
  ]

  let totalRows = 0
  let noEmailAddr = 0
  let noEmailCap = 0
  let noSmsCap = 0
  let gatedOff = 0
  let wouldFire = 0

  for (const t of tenants) {
    const caps = deriveCapabilities(t as { resend_api_key?: string | null; telnyx_api_key?: string | null; telnyx_phone?: string | null })
    const ownerEmail = (t as { owner_email?: string | null }).owner_email
    console.log(`\n=== ${t.name} (${t.slug}) ===`)
    console.log(`  owner_email: ${ownerEmail || '⚠️  MISSING'}   caps: email=${caps.email ? '✓' : '✗'} sms=${caps.sms ? '✓' : '✗'}`)
    if (!ownerEmail) noEmailAddr++

    for (const check of CHECKS) {
      totalRows++
      const enabled = await isCommEnabled(t.id, check.key, check.channel)
      const hasCap = check.channel === 'email' ? caps.email : caps.sms
      let verdict: string
      if (!enabled) {
        verdict = 'GATED OFF (tenant disabled this comm)'
        gatedOff++
      } else if (!hasCap) {
        verdict = `WOULD SKIP — no ${check.channel} capability configured`
        if (check.channel === 'email') noEmailCap++
        else noSmsCap++
      } else {
        verdict = 'WOULD SEND'
        wouldFire++
      }
      console.log(`  ${check.key}:${check.channel.padEnd(5)} → ${verdict}`)
    }
  }

  console.log(`\n\n=== SUMMARY: ${tenants.length} active tenants × ${CHECKS.length} comm/channel checks = ${totalRows} rows ===`)
  console.log(`  WOULD SEND:        ${wouldFire}`)
  console.log(`  GATED OFF:         ${gatedOff}  (tenant explicitly disabled — expected, not a bug)`)
  console.log(`  NO EMAIL CAPABILITY: ${noEmailCap}  (no Resend key, platform fallback unavailable)`)
  console.log(`  NO SMS CAPABILITY:   ${noSmsCap}  (no Telnyx key/phone)`)
  console.log(`  TENANTS MISSING owner_email: ${noEmailAddr}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
