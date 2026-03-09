import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d\s\-+().]{7,20}$/

const VALID_STATUSES = ['active', 'lead', 'at_risk', 'churned', 'inactive']

type ClientRow = {
  name?: string
  phone?: string
  email?: string
  address?: string
  source?: string
  notes?: string
  status?: string
}

function validateRow(row: ClientRow, index: number): { valid: boolean; data?: Record<string, unknown>; error?: string } {
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  const phone = typeof row.phone === 'string' ? row.phone.trim() : ''

  if (!name) {
    return { valid: false, error: `Row ${index + 1}: name is required` }
  }
  if (name.length > 200) {
    return { valid: false, error: `Row ${index + 1}: name exceeds 200 characters` }
  }
  if (!phone) {
    return { valid: false, error: `Row ${index + 1}: phone is required` }
  }
  if (!PHONE_RE.test(phone)) {
    return { valid: false, error: `Row ${index + 1}: invalid phone format "${phone}"` }
  }

  const data: Record<string, unknown> = { name, phone }

  // Optional: email
  if (row.email && typeof row.email === 'string' && row.email.trim()) {
    const email = row.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      return { valid: false, error: `Row ${index + 1}: invalid email "${row.email}"` }
    }
    data.email = email
  }

  // Optional: address
  if (row.address && typeof row.address === 'string' && row.address.trim()) {
    const address = row.address.trim()
    if (address.length > 500) {
      return { valid: false, error: `Row ${index + 1}: address exceeds 500 characters` }
    }
    data.address = address
  }

  // Optional: source
  if (row.source && typeof row.source === 'string' && row.source.trim()) {
    const source = row.source.trim()
    if (source.length > 100) {
      return { valid: false, error: `Row ${index + 1}: source exceeds 100 characters` }
    }
    data.source = source
  }

  // Optional: notes
  if (row.notes && typeof row.notes === 'string' && row.notes.trim()) {
    data.notes = row.notes.trim()
  }

  // Optional: status
  if (row.status && typeof row.status === 'string' && row.status.trim()) {
    const status = row.status.trim().toLowerCase()
    if (!VALID_STATUSES.includes(status)) {
      return { valid: false, error: `Row ${index + 1}: invalid status "${row.status}". Must be one of: ${VALID_STATUSES.join(', ')}` }
    }
    data.status = status
  } else {
    data.status = 'active'
  }

  return { valid: true, data }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('clients.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    if (!Array.isArray(body.clients)) {
      return NextResponse.json(
        { error: 'Request body must contain a "clients" array' },
        { status: 400 }
      )
    }

    const clients: ClientRow[] = body.clients
    if (clients.length === 0) {
      return NextResponse.json(
        { error: 'No clients to import' },
        { status: 400 }
      )
    }

    if (clients.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 clients per import. Please split your file into smaller batches.' },
        { status: 400 }
      )
    }

    const validRows: Record<string, unknown>[] = []
    const errors: string[] = []

    for (let i = 0; i < clients.length; i++) {
      const result = validateRow(clients[i], i)
      if (result.valid && result.data) {
        validRows.push({ ...result.data, tenant_id: tenantId })
      } else if (result.error) {
        errors.push(result.error)
      }
    }

    let imported = 0
    if (validRows.length > 0) {
      // Insert in batches of 50 to avoid payload limits
      const batchSize = 50
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize)
        const { data, error } = await supabaseAdmin
          .from('clients')
          .insert(batch)
          .select('id')

        if (error) {
          errors.push(`Database error on batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        } else {
          imported += data?.length || 0
        }
      }
    }

    const skipped = clients.length - imported

    await audit({
      tenantId,
      action: 'client.created',
      entityType: 'client',
      details: { type: 'csv_import', imported, skipped, totalRows: clients.length },
    })

    return NextResponse.json({ imported, skipped, errors })
  } catch (e) {
    console.error('Import error:', e)
    return NextResponse.json(
      { error: 'Import failed. Please check your data and try again.' },
      { status: 500 }
    )
  }
}
