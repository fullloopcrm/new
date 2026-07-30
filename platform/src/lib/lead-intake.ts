/**
 * Shared "turn a contact point into a real, source-attributed lead" seam.
 *
 * Extracted from the pattern already proven in api/lead, api/contact, and
 * api/ingest/lead (find-or-create client → portal_leads row → open a sales
 * deal, idempotent on an existing open deal). 2026-07-30 pipeline trace
 * found two sources that skipped this entirely — unknown-number inbound SMS
 * and AI-chat visitors who give a phone but don't book — leaving them
 * invisible to Sales (only an admin notification, which can be missed).
 * Use this for any NEW non-web-form source instead of re-deriving the
 * pattern; the three existing web-form routes are left as-is (not
 * refactored onto this) to avoid touching already-working, already-tested
 * code for an unrelated fix.
 */
import { tenantDb } from '@/lib/tenant-db'
import { createPrimaryContact } from '@/lib/client-contacts'
import { normalizePhone } from '@/lib/phone'
import { formatName } from '@/lib/format'
import { randomInt } from 'crypto'

export interface CreateLeadInput {
  name?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  source: string
}

export interface CreateLeadResult {
  clientId: string
  dealId: string | null
  wasExistingClient: boolean
}

/**
 * Find-or-create a client by phone, then open (or bump) a sales deal for
 * them. Non-throwing on the deal-entry step is the CALLER's job (see
 * lib/error-tracking's trackError — every caller of this should still wrap
 * its own call so a pipeline-entry failure surfaces, not just console.error).
 */
export async function createLeadAndEnterPipeline(
  tenantId: string,
  input: CreateLeadInput,
): Promise<CreateLeadResult> {
  const db = tenantDb(tenantId)
  const name = formatName((input.name || '').trim() || 'Unknown')
  const phone = input.phone ? normalizePhone(input.phone) : null
  const email = input.email?.trim().toLowerCase() || null
  const cleanPhone = input.phone ? input.phone.replace(/\D/g, '') : ''

  const { data: existing } = cleanPhone.length >= 7
    ? await db.from('clients').select('id').ilike('phone', `%${cleanPhone.slice(-10)}%`).limit(1)
    : { data: null as { id: string }[] | null }

  let clientId: string
  const wasExistingClient = !!(existing && existing.length > 0)

  if (wasExistingClient) {
    clientId = existing![0].id
  } else {
    const { data: inserted, error } = await db
      .from('clients')
      .insert({ name, email, phone, notes: input.notes || null, pin: randomInt(100000, 1000000).toString() })
      .select('id')
      .single()
    if (error) throw error
    clientId = inserted.id
    // Every client-creation path must call this or the client silently
    // never receives any SMS/email — see createPrimaryContact's docstring.
    await createPrimaryContact(tenantId, clientId, { name, phone, email }).catch(() => {})
  }

  await db
    .from('portal_leads')
    .insert({ name, email, phone, notes: input.notes || null, source: input.source, client_id: clientId })
    .then(() => {}, () => {})

  let dealId: string | null = null
  const { data: openDeal } = await db
    .from('deals')
    .select('id')
    .eq('client_id', clientId)
    .in('stage', ['new', 'qualifying', 'quoted', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nowIso = new Date().toISOString()
  if (openDeal) {
    dealId = openDeal.id
    await db.from('deal_activities').insert({
      deal_id: openDeal.id, type: 'note',
      description: `New contact via ${input.source}${input.notes ? `\n${input.notes}` : ''}`,
      metadata: { source: input.source },
    })
    await db.from('deals').update({ last_activity_at: nowIso }).eq('id', openDeal.id)
  } else {
    const { data: newDeal } = await db.from('deals').insert({
      client_id: clientId,
      title: name || 'New lead', stage: 'new', mode: 'sales',
      value_cents: 0, probability: 10, source: input.source,
      notes: input.notes || null, status: 'active', last_activity_at: nowIso,
    }).select('id').single()
    if (newDeal) {
      dealId = newDeal.id
      await db.from('deal_activities').insert({
        deal_id: newDeal.id, type: 'note',
        description: `Lead captured via ${input.source}${input.notes ? `\n${input.notes}` : ''}`,
        metadata: { source: input.source },
      })
    }
  }

  return { clientId, dealId, wasExistingClient }
}
