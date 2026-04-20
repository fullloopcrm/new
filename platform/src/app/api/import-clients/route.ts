/**
 * Bulk client import. Admin-only. Tenant-scoped.
 * Uses crypto.randomInt for PIN generation (migration 014 enforces unique PIN
 * per tenant, so collisions 409 — caller retries with a different seed).
 */
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

interface ClientInput {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { clients } = await request.json() as { clients?: ClientInput[] }
    if (!Array.isArray(clients)) {
      return NextResponse.json({ error: 'clients must be an array' }, { status: 400 })
    }

    let success = 0, failed = 0, skipped = 0

    for (const c of clients) {
      if (!c?.name) { failed++; continue }
      const pin = String(100000 + crypto.randomInt(0, 900000))

      const { error } = await supabaseAdmin.from('clients').insert({
        tenant_id: tenantId,
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        notes: c.notes || null,
        pin,
        status: 'active',
      })

      if (error) {
        if (error.message.includes('duplicate')) skipped++
        else { failed++; console.error('[import-clients] insert failed:', error.message) }
      } else {
        success++
      }
    }

    return NextResponse.json({ success, failed, skipped })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('import-clients error:', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
