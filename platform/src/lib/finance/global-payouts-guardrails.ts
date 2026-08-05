/**
 * Guardrails for the Global Payouts auto-pay run (Jeff, 08-04): a per-run
 * dollar cap, a per-person hold-for-review threshold, and a cooldown between
 * runs. Anything held waits for an SMS approval from an admin: reply YES to
 * approve, then GO to actually send it — two separate steps on purpose, so
 * an ambiguous "yes" reply can't itself trigger money movement.
 */
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase'
import { getAdminContacts } from '../admin-contacts'
import { sendSMS } from '../sms'
import { decryptSecret } from '../secret-crypto'
import { getStorageFinancialAccount, executeGroups } from './global-payouts'
import type { TeamMemberPayoutGroup } from './global-payouts-eligibility'

export const RUN_CAP_CENTS = 250000
export const INDIVIDUAL_HOLD_CENTS = 45000
export const COOLDOWN_SECONDS = 300

export async function checkCooldown(tenantId: string): Promise<{ onCooldown: boolean; secondsRemaining: number }> {
  const { data } = await supabaseAdmin
    .from('global_payouts_runs')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.created_at) return { onCooldown: false, secondsRemaining: 0 }
  const elapsedSeconds = (Date.now() - new Date(data.created_at as string).getTime()) / 1000
  const remaining = COOLDOWN_SECONDS - elapsedSeconds
  return remaining > 0 ? { onCooldown: true, secondsRemaining: Math.ceil(remaining) } : { onCooldown: false, secondsRemaining: 0 }
}

export async function logRun(opts: { tenantId: string; totalCents: number; paidCount: number; heldCount: number }): Promise<void> {
  await supabaseAdmin.from('global_payouts_runs').insert({
    tenant_id: opts.tenantId,
    total_cents: opts.totalCents,
    paid_count: opts.paidCount,
    held_count: opts.heldCount,
  })
}

function generateCode(): string {
  // Short, speakable/typeable over SMS — 4 uppercase alnum chars, no 0/O/1/I confusion.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}

export interface HeldGroup {
  code: string
  kind: 'individual' | 'run_cap'
  group: TeamMemberPayoutGroup
}

/**
 * Creates a hold row + texts the admin. Returns the code the admin will
 * reply with (e.g. "YES ABCD" then "GO ABCD").
 */
export async function createHoldAndNotify(opts: {
  tenantId: string
  kind: 'individual' | 'run_cap'
  group: TeamMemberPayoutGroup
  reason: string
}): Promise<string> {
  const code = generateCode()
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, sms_from_number')
    .eq('id', opts.tenantId)
    .single()

  const admins = await getAdminContacts(opts.tenantId)
  const adminPhone = admins.find(a => a.phone)?.phone || null

  await supabaseAdmin.from('payout_holds').insert({
    tenant_id: opts.tenantId,
    code,
    kind: opts.kind,
    summary: `${opts.group.name}: $${(opts.group.totalCents / 100).toFixed(2)} — ${opts.reason}`,
    total_cents: opts.group.totalCents,
    payload: opts.group,
    admin_phone: adminPhone,
    status: 'pending',
  })

  if (adminPhone && tenant?.telnyx_api_key && tenant?.telnyx_phone) {
    const amount = (opts.group.totalCents / 100).toFixed(2)
    const body = `${tenant.name}: payout for ${opts.group.name} ($${amount}) needs approval — ${opts.reason}. Reply "YES ${code}" to approve, then "GO ${code}" to send.`
    sendSMS({
      to: adminPhone,
      body,
      telnyxApiKey: tenant.telnyx_api_key as string,
      telnyxPhone: (tenant.sms_from_number as string | null) || (tenant.telnyx_phone as string),
    }).catch(err => console.error('[global-payouts] hold approval SMS failed:', err))
  }

  return code
}

interface PayoutHoldRow {
  id: string
  tenant_id: string
  code: string
  status: string
  payload: TeamMemberPayoutGroup
  admin_phone: string | null
  summary: string
  total_cents: number
}

/**
 * A code is only ever actionable by the exact phone number it was texted to
 * — scoping the lookup by admin_phone means a stray SMS from someone else
 * guessing a 4-char code can't approve or fire a real payout.
 */
async function findHoldByCodeAndPhone(code: string, adminPhone: string): Promise<PayoutHoldRow | null> {
  const { data } = await supabaseAdmin
    .from('payout_holds')
    .select('id, tenant_id, code, status, payload, admin_phone, summary, total_cents')
    .eq('code', code.toUpperCase())
    .eq('admin_phone', adminPhone)
    .in('status', ['pending', 'approved'])
    .maybeSingle()
  return data as PayoutHoldRow | null
}

async function replyToAdmin(tenantId: string, adminPhone: string, body: string): Promise<void> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('telnyx_api_key, telnyx_phone, sms_from_number')
    .eq('id', tenantId)
    .single()
  if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) return
  await sendSMS({
    to: adminPhone,
    body,
    telnyxApiKey: tenant.telnyx_api_key as string,
    telnyxPhone: (tenant.sms_from_number as string | null) || (tenant.telnyx_phone as string),
  }).catch(err => console.error('[global-payouts] admin reply SMS failed:', err))
}

/** Handles an inbound "YES <code>" reply — approves, does not move money. */
export async function handleApprovalReply(adminPhone: string, code: string): Promise<boolean> {
  const hold = await findHoldByCodeAndPhone(code, adminPhone)
  if (!hold || hold.status !== 'pending') return false
  await supabaseAdmin.from('payout_holds').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', hold.id)
  await replyToAdmin(hold.tenant_id, adminPhone, `Approved: ${hold.summary}. Reply "GO ${hold.code}" to send it now.`)
  return true
}

/** Handles an inbound "GO <code>" reply — must already be approved. Actually moves money. */
export async function handleExecutionReply(adminPhone: string, code: string): Promise<boolean> {
  const hold = await findHoldByCodeAndPhone(code, adminPhone)
  if (!hold) return false
  if (hold.status !== 'approved') {
    await replyToAdmin(hold.tenant_id, adminPhone, `${hold.code} isn't approved yet — reply "YES ${hold.code}" first.`)
    return true
  }

  const tenantId = hold.tenant_id
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('stripe_api_key, telnyx_api_key, telnyx_phone, sms_from_number, telegram_bot_token, telegram_chat_id')
    .eq('id', tenantId)
    .single()
  const apiKey = tenant?.stripe_api_key ? decryptSecret(tenant.stripe_api_key as string) : (process.env.STRIPE_SECRET_KEY || null)
  if (!apiKey) {
    await replyToAdmin(tenantId, adminPhone, `${hold.code} failed: Stripe not configured.`)
    return true
  }
  const stripe = new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })

  const financialAccount = await getStorageFinancialAccount(apiKey)
  if (!financialAccount) {
    await replyToAdmin(tenantId, adminPhone, `${hold.code} failed: no Financial Account found.`)
    return true
  }

  const { paid, skipped } = await executeGroups(tenantId, stripe, apiKey, financialAccount.id, [hold.payload], {
    telnyxApiKey: (tenant?.telnyx_api_key as string | null) || null,
    telnyxPhone: (tenant?.telnyx_phone as string | null) || null,
    smsFromNumber: (tenant?.sms_from_number as string | null) || null,
    telegramBotToken: (tenant?.telegram_bot_token as string | null) || null,
    telegramChatId: (tenant?.telegram_chat_id as string | null) || null,
  })

  await supabaseAdmin.from('payout_holds').update({ status: 'executed', executed_at: new Date().toISOString() }).eq('id', hold.id)

  const paidTotal = paid.reduce((s, p) => s + p.amountCents, 0)
  await replyToAdmin(
    tenantId,
    adminPhone,
    skipped.length > 0
      ? `${hold.code}: sent $${(paidTotal / 100).toFixed(2)}, ${skipped.length} item(s) failed — check the dashboard.`
      : `${hold.code}: sent $${(paidTotal / 100).toFixed(2)} to ${hold.summary.split(':')[0]}. Done.`,
  )
  return true
}
