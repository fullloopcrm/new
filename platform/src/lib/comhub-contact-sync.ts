import { tenantDb } from '@/lib/tenant-db'

/**
 * The booking and collect forms are the two places a caller hands us their
 * real name directly. Everywhere else ComHub contacts get their name from
 * (comhub_get_or_create_contact_by_phone, fired by the inbound-SMS mirror
 * trigger) only fills it in when currently null and never touches it again
 * -- so a contact that only ever texted in shows nothing but a raw phone
 * number in the right panel forever, even after that same person books or
 * fills out Collect Info with their name. This overrides that placeholder
 * outright, since a form-supplied name is more trustworthy than an SMS
 * caller-ID guess (which is usually unavailable anyway).
 */
export async function syncComhubContactName(
  tenantId: string,
  params: { name: string; phone?: string | null; email?: string | null; clientId?: string | null },
): Promise<void> {
  const name = params.name.trim()
  if (!name || (!params.phone && !params.email)) return
  const db = tenantDb(tenantId)

  let contactId: string | null = null
  if (params.phone) {
    const { data } = await db
      .from('comhub_contacts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', params.phone)
      .maybeSingle()
    contactId = data?.id || null
  }
  if (!contactId && params.email) {
    const { data } = await db
      .from('comhub_contacts')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', params.email)
      .maybeSingle()
    contactId = data?.id || null
  }

  if (contactId) {
    // A phone/email match against an EXISTING contact only proves this form
    // submission used the same phone/email already on file — not that it's
    // the same person. If that contact is already linked to a different
    // client, renaming it (or repointing client_id) would silently relabel
    // someone else's real conversation history as this new submitter's.
    // comhub_contacts has a unique (tenant_id, phone) constraint, so a
    // genuinely reused/reassigned number can't get its own row here; leave
    // the existing link alone rather than guess which person actually owns it.
    const { data: existing } = await db
      .from('comhub_contacts')
      .select('client_id')
      .eq('id', contactId)
      .maybeSingle()
    const conflictingClient = !!existing?.client_id && !!params.clientId && existing.client_id !== params.clientId
    if (!conflictingClient) {
      await db
        .from('comhub_contacts')
        .update({ name, client_id: params.clientId || existing?.client_id || undefined, updated_at: new Date().toISOString() })
        .eq('id', contactId)
    }
  } else {
    await db
      .from('comhub_contacts')
      .insert({ tenant_id: tenantId, name, phone: params.phone || null, email: params.email || null, client_id: params.clientId || null })
  }
}
