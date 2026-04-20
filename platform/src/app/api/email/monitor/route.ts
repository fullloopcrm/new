/**
 * Email monitor — polls each tenant's IMAP inbox for Zelle/Venmo confirmations.
 * Ported from nycmaid (2026-04-19), tenant-aware.
 *
 * For each tenant with email_monitor_enabled=true and IMAP creds:
 *   1. Pulls unread emails
 *   2. Detects Zelle/Venmo via subject + sender
 *   3. Tries to match each payment to a pending booking (sender_name → client.name
 *      or bookings.payment_sender_name; falls back to most recent unpaid)
 *   4. Inserts into payments + updates booking; if no match, opens unmatched_payments
 *   5. Marks the email as read so we don't double-process
 *
 * POST is the trigger entry. Auth: ?key=ELCHAPO_MONITOR_KEY OR cron Bearer.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchUnreadEmails, markEmailRead, type ImapConfig } from '@/lib/email-monitor'
import { detectPaymentEmail, parsePaymentEmail, type EmailPayment } from '@/lib/payment-email-parser'
import { sendSMS } from '@/lib/sms'

export const maxDuration = 60

interface TenantRow {
  id: string
  name: string | null
  imap_host: string | null
  imap_port: number | null
  imap_user: string | null
  imap_pass: string | null
  email_monitor_enabled: boolean | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
}

async function authorize(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true
  const url = req.nextUrl
  const key = url.searchParams.get('key')
  if (key && process.env.ELCHAPO_MONITOR_KEY && key === process.env.ELCHAPO_MONITOR_KEY) return true
  try {
    const body = await req.json()
    if (body?.key && process.env.ELCHAPO_MONITOR_KEY && body.key === process.env.ELCHAPO_MONITOR_KEY) return true
  } catch {}
  return false
}

async function processTenant(tenant: TenantRow): Promise<{ tenantId: string; matched: number; unmatched: number; errors: string[] }> {
  const cfg: ImapConfig = {
    host: tenant.imap_host!,
    port: tenant.imap_port || 993,
    user: tenant.imap_user!,
    pass: tenant.imap_pass!,
  }

  const errors: string[] = []
  let matched = 0
  let unmatched = 0

  let emails: Awaited<ReturnType<typeof fetchUnreadEmails>>
  try {
    emails = await fetchUnreadEmails(cfg, 25)
  } catch (e) {
    errors.push(`fetch: ${e instanceof Error ? e.message : 'unknown'}`)
    return { tenantId: tenant.id, matched, unmatched, errors }
  }

  for (const email of emails) {
    const method = detectPaymentEmail(email.from, email.subject, email.text)
    if (!method) {
      // Not a payment email — leave it unread for human handling
      continue
    }

    const payment = parsePaymentEmail(method, email.from, email.fromName, email.subject, email.text, email.date, email.messageId)
    if (!payment) continue

    // Idempotency on messageId
    const { data: dup } = await supabaseAdmin
      .from('payments').select('id')
      .eq('tenant_id', tenant.id).eq('raw_email_id', payment.referenceId).limit(1)
    if (dup && dup.length > 0) {
      await markEmailRead(cfg, email.uid).catch(() => {})
      continue
    }

    // Match to booking
    const matchResult = await matchPaymentToBooking(tenant, payment)
    if (matchResult.bookingId && matchResult.clientId) {
      await supabaseAdmin.from('payments').insert({
        tenant_id: tenant.id,
        booking_id: matchResult.bookingId,
        client_id: matchResult.clientId,
        amount_cents: payment.amountCents,
        method: payment.method,
        status: 'completed',
        sender_name: payment.senderName,
        raw_email_id: payment.referenceId,
        received_at: payment.date.toISOString(),
      })
      await supabaseAdmin
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_method: payment.method,
          payment_date: new Date().toISOString(),
        })
        .eq('id', matchResult.bookingId)
        .eq('tenant_id', tenant.id)

      // Notify client
      if (tenant.telnyx_api_key && tenant.telnyx_phone && matchResult.clientPhone) {
        sendSMS({
          to: matchResult.clientPhone,
          body: `Got your ${payment.method} payment of $${payment.amount.toFixed(0)} — thank you! 😊`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(() => {})
      }

      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenant.id,
        type: 'payment_received',
        title: `${payment.method.toUpperCase()} Payment — $${payment.amount.toFixed(2)}`,
        message: `${payment.senderName || payment.senderEmail} paid $${payment.amount.toFixed(2)} (${payment.method})`,
        channel: 'in_app',
      })
      matched++
    } else {
      // No match — open reconciliation task
      await supabaseAdmin.from('unmatched_payments').insert({
        tenant_id: tenant.id,
        amount_cents: payment.amountCents,
        method: payment.method,
        sender_name: payment.senderName,
        sender_email: payment.senderEmail,
        raw_email_id: payment.referenceId,
        raw_email_subject: email.subject,
        raw_email_body: email.text.slice(0, 2000),
        status: 'pending',
        received_at: payment.date.toISOString(),
      })
      await supabaseAdmin.from('admin_tasks').insert({
        tenant_id: tenant.id,
        type: 'unmatched_payment',
        priority: 'normal',
        title: `Unmatched ${payment.method} — $${payment.amount.toFixed(2)} from ${payment.senderName || payment.senderEmail}`,
        description: `Could not match this ${payment.method} to a pending booking. Reconcile manually.`,
        related_type: 'payment',
      })
      unmatched++
    }

    await markEmailRead(cfg, email.uid).catch(() => {})
  }

  return { tenantId: tenant.id, matched, unmatched, errors }
}

interface MatchResult {
  bookingId?: string
  clientId?: string
  clientPhone?: string
}

async function matchPaymentToBooking(tenant: TenantRow, payment: EmailPayment): Promise<MatchResult> {
  const senderLower = (payment.senderName || '').toLowerCase().trim()

  // 1. Match by bookings.payment_sender_name (Selena confirm_payment recorded a custom payer name)
  if (senderLower) {
    const { data: byPayer } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, clients(phone)')
      .eq('tenant_id', tenant.id)
      .neq('payment_status', 'paid')
      .ilike('payment_sender_name', `%${senderLower}%`)
      .order('start_time', { ascending: false })
      .limit(1)
    if (byPayer && byPayer.length > 0) {
      const c = byPayer[0].clients as unknown as { phone?: string } | null
      return { bookingId: byPayer[0].id, clientId: byPayer[0].client_id || undefined, clientPhone: c?.phone }
    }
  }

  // 2. Match by client.name
  if (senderLower) {
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, phone')
      .eq('tenant_id', tenant.id)
      .ilike('name', `%${senderLower}%`)
      .limit(5)
    for (const client of clients || []) {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('client_id', client.id)
        .neq('payment_status', 'paid')
        .order('start_time', { ascending: false })
        .limit(1)
        .single()
      if (booking) return { bookingId: booking.id, clientId: client.id, clientPhone: client.phone || undefined }
    }
  }

  // 3. Fallback: most recent unpaid booking with a matching amount (within $1)
  const targetCents = payment.amountCents
  const { data: candidates } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, price, clients(phone)')
    .eq('tenant_id', tenant.id)
    .neq('payment_status', 'paid')
    .gte('price', targetCents - 100)
    .lte('price', targetCents + 100)
    .order('start_time', { ascending: false })
    .limit(1)
  if (candidates && candidates.length > 0) {
    const c = candidates[0].clients as unknown as { phone?: string } | null
    return { bookingId: candidates[0].id, clientId: candidates[0].client_id || undefined, clientPhone: c?.phone }
  }

  return {}
}

export async function POST(req: NextRequest) {
  if (!await authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, imap_host, imap_port, imap_user, imap_pass, email_monitor_enabled, telnyx_api_key, telnyx_phone')
    .eq('email_monitor_enabled', true)
    .not('imap_host', 'is', null)
    .not('imap_user', 'is', null)
    .not('imap_pass', 'is', null)
    .limit(1000)

  if (!tenants || tenants.length === 0) {
    return NextResponse.json({ ok: true, tenants: 0, summary: 'No tenants with email monitor enabled' })
  }

  const results = []
  for (const t of tenants as TenantRow[]) {
    const r = await processTenant(t)
    results.push(r)
  }

  return NextResponse.json({
    ok: true,
    tenants: tenants.length,
    matched: results.reduce((a, r) => a + r.matched, 0),
    unmatched: results.reduce((a, r) => a + r.unmatched, 0),
    errors: results.flatMap(r => r.errors),
  })
}

// GET = same behaviour, makes Vercel cron easier
export async function GET(req: NextRequest) {
  return POST(req)
}
