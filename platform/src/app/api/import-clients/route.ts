/**
 * Bulk client import. Admin-only. Tenant-scoped.
 * Uses crypto.randomInt for PIN generation (migration 014 enforces unique PIN
 * per tenant, so collisions 409 — caller retries with a different seed).
 */
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

interface ClientInput {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

// Matches the hardened sibling /api/clients/import's array cap, and the
// per-field caps used elsewhere for the same columns (client/book's
// MAX_NOTES=2000, clients/import's address<=500) — this route had none of
// either, so an authenticated tenant-admin session could post an unbounded
// array of unbounded-length strings and either time out the function or
// bloat the clients table with no limit.
const MAX_CLIENTS = 5000
const MAX_NAME = 200
const MAX_PHONE = 30
const MAX_EMAIL = 254
const MAX_ADDRESS = 500
const MAX_NOTES = 2000

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('clients.create')
    if (authError) return authError
    const { tenantId } = tenant
    const { clients } = await request.json() as { clients?: ClientInput[] }
    if (!Array.isArray(clients)) {
      return NextResponse.json({ error: 'clients must be an array' }, { status: 400 })
    }
    if (clients.length > MAX_CLIENTS) {
      return NextResponse.json({ error: `Maximum ${MAX_CLIENTS} clients per import.` }, { status: 400 })
    }

    let success = 0, failed = 0, skipped = 0

    for (const c of clients) {
      if (!c?.name || c.name.length > MAX_NAME) { failed++; continue }
      const pin = String(100000 + crypto.randomInt(0, 900000))

      const { error } = await supabaseAdmin.from('clients').insert({
        tenant_id: tenantId,
        name: c.name,
        phone: c.phone ? c.phone.slice(0, MAX_PHONE) : null,
        email: c.email ? c.email.slice(0, MAX_EMAIL) : null,
        address: c.address ? c.address.slice(0, MAX_ADDRESS) : null,
        notes: c.notes ? c.notes.slice(0, MAX_NOTES) : null,
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
