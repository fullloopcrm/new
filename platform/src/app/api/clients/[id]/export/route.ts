/**
 * GDPR / CCPA data-subject export for a single client.
 * GET /api/clients/[id]/export?format=json|csv (default json)
 *
 * Bundles everything the tenant holds on this client: profile, bookings,
 * invoices, SMS communications, and freeform notes. Tenant-scoped — a
 * client belonging to another tenant 404s rather than leaking data.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { audit } from '@/lib/audit'

function csvEscape(v: string | number | boolean | null | undefined): string {
  if (v == null) return ''
  let s = String(v)
  // Neutralize CSV formula injection — Excel/Calc execute cells that start
  // with =, +, -, @, tab, or CR as formulas. Prefix with single-quote.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

// Filenames land in a Content-Disposition header — strip anything that
// isn't a safe filename character so client-controlled data (name) can't
// inject header syntax or path segments.
function safeFilenamePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'client'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant, error: authError } = await requirePermission('clients.view')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const format = new URL(request.url).searchParams.get('format') === 'csv' ? 'csv' : 'json'

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, address, unit, notes, special_instructions, source, referral_code, email_opt_in, sms_opt_in, status, created_at, updated_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [{ data: bookings }, { data: invoices }, { data: communications }] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select('id, start_time, end_time, service_type, status, price, payment_status, payment_method, payment_date, notes, special_instructions, created_at')
        .eq('client_id', id)
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: false }),
      supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, status, total_cents, amount_paid_cents, due_date, issued_at, paid_at, notes, created_at')
        .eq('client_id', id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('client_sms_messages')
        .select('id, direction, message, created_at')
        .eq('client_id', id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
    ])

    await audit({ tenantId, action: 'client.data_exported', entityType: 'client', entityId: id, details: { format } })

    const filenameBase = `client-export-${safeFilenamePart(client.name || id)}`

    if (format === 'json') {
      const body = {
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        profile: client,
        notes: client.notes || null,
        bookings: bookings || [],
        invoices: invoices || [],
        communications: communications || [],
      }
      return new NextResponse(JSON.stringify(body, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameBase}.json"`,
        },
      })
    }

    const lines: string[] = []

    lines.push('# PROFILE')
    lines.push(['id', 'name', 'email', 'phone', 'address', 'unit', 'status', 'source', 'email_opt_in', 'sms_opt_in', 'created_at'].join(','))
    lines.push([
      csvEscape(client.id), csvEscape(client.name), csvEscape(client.email), csvEscape(client.phone),
      csvEscape(client.address), csvEscape(client.unit), csvEscape(client.status), csvEscape(client.source),
      csvEscape(client.email_opt_in), csvEscape(client.sms_opt_in), csvEscape(client.created_at),
    ].join(','))

    lines.push('')
    lines.push('# NOTES')
    lines.push('note')
    lines.push(csvEscape(client.notes || ''))
    if (client.special_instructions) lines.push(csvEscape(client.special_instructions))

    lines.push('')
    lines.push('# BOOKINGS')
    lines.push(['id', 'start_time', 'end_time', 'service_type', 'status', 'price', 'payment_status', 'payment_method', 'notes'].join(','))
    for (const b of bookings || []) {
      lines.push([
        csvEscape(b.id), csvEscape(b.start_time), csvEscape(b.end_time), csvEscape(b.service_type),
        csvEscape(b.status), csvEscape(((Number(b.price) || 0) / 100).toFixed(2)),
        csvEscape(b.payment_status), csvEscape(b.payment_method), csvEscape(b.notes),
      ].join(','))
    }

    lines.push('')
    lines.push('# INVOICES')
    lines.push(['id', 'invoice_number', 'status', 'total', 'amount_paid', 'due_date', 'issued_at', 'notes'].join(','))
    for (const inv of invoices || []) {
      lines.push([
        csvEscape(inv.id), csvEscape(inv.invoice_number), csvEscape(inv.status),
        csvEscape(((Number(inv.total_cents) || 0) / 100).toFixed(2)),
        csvEscape(((Number(inv.amount_paid_cents) || 0) / 100).toFixed(2)),
        csvEscape(inv.due_date), csvEscape(inv.issued_at), csvEscape(inv.notes),
      ].join(','))
    }

    lines.push('')
    lines.push('# COMMUNICATIONS')
    lines.push(['id', 'direction', 'message', 'created_at'].join(','))
    for (const c of communications || []) {
      lines.push([csvEscape(c.id), csvEscape(c.direction), csvEscape(c.message), csvEscape(c.created_at)].join(','))
    }

    const csv = lines.join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/clients/[id]/export', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
