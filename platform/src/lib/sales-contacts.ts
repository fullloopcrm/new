/**
 * Canonical sales contacts. Every lead (partner_requests) attaches to one
 * contact, deduped by email. Call upsertSalesContact() when a lead is created
 * to get (or create) its contact id, then store it on the lead's contact_id.
 */
import { supabaseAdmin } from './supabase'

export interface LeadContactInput {
  business_name?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  service_category?: string | null
  city?: string | null
  state?: string | null
  source?: string | null
}

const clean = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

// Returns the contact id for this lead, creating the contact if new.
// Returns null (never throws) if there's no email or the write fails, so lead
// creation is never blocked by contact bookkeeping.
export async function upsertSalesContact(input: LeadContactInput): Promise<string | null> {
  const email = (input.email || '').trim().toLowerCase()
  if (!email) return null

  try {
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing?.id) {
      // Non-destructive refresh — only overwrite with non-empty values.
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (clean(input.business_name)) patch.business_name = clean(input.business_name)
      if (clean(input.contact_name)) patch.contact_name = clean(input.contact_name)
      if (clean(input.phone)) patch.phone = clean(input.phone)
      await supabaseAdmin.from('contacts').update(patch).eq('id', existing.id)
      return existing.id
    }

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        business_name: clean(input.business_name),
        contact_name: clean(input.contact_name),
        email,
        phone: clean(input.phone),
        service_category: clean(input.service_category),
        city: clean(input.city),
        state: clean(input.state),
        source: clean(input.source),
      })
      .select('id')
      .single()

    if (error) {
      console.error('[sales-contacts] insert failed:', error.message)
      return null
    }
    return data.id
  } catch (err) {
    console.error('[sales-contacts] upsert error:', err)
    return null
  }
}
