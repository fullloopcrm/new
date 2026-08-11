import type { TenantDb } from '@/lib/tenant-db'

// Shared by the contact detail panel (context/route.ts) and the thread list
// (threads/route.ts) so linkage happens automatically as soon as a contact
// shows up anywhere in ComHub, not only once an admin opens their panel.
// Matches an unlinked comhub_contacts row against clients / team_members /
// team_applications by phone or email, and backfills client_id/team_member_id
// plus a real display name (never overwriting a name with the phone-digit
// placeholder some intake paths still write for brand-new leads).

export type ResolvedContact = {
  id: string
  name: string | null
  phone: string | null
  client_id: string | null
  team_member_id: string | null
}

const digitsOf = (v: string | null | undefined) => (v || '').replace(/\D/g, '')

export const isPlaceholderName = (name: string | null | undefined, phone: string | null | undefined) => {
  const nameDigits = digitsOf(name)
  const phoneDigits = digitsOf(phone)
  return !!nameDigits && !!phoneDigits && nameDigits.slice(-10) === phoneDigits.slice(-10)
}

/**
 * Resolves and backfills a single contact's linkage + name in place. Returns
 * the (possibly updated) id/name/client_id/team_member_id — cheap no-op when
 * the contact is already fully linked with a real name.
 */
export async function resolveContactLinkage(
  db: TenantDb,
  tenantId: string,
  contact: { id: string; name: string | null; phone: string | null; email: string | null; client_id: string | null; team_member_id: string | null },
): Promise<ResolvedContact> {
  let clientId = contact.client_id
  let teamMemberId = contact.team_member_id
  // A contact is a client OR a team member, never both — requiring BOTH to be
  // set meant an already-correctly-linked client (team_member_id forever
  // null) never short-circuited here, so every load re-ran the fuzzy
  // ilike substring re-match below against it.
  const alreadyResolved = (!!clientId || !!teamMemberId) && !isPlaceholderName(contact.name, contact.phone)
  if (alreadyResolved) {
    return { id: contact.id, name: contact.name, phone: contact.phone, client_id: clientId, team_member_id: teamMemberId }
  }

  const last10 = digitsOf(contact.phone)

  if (!clientId && last10) {
    const { data } = await db.from('clients').select('id').eq('tenant_id', tenantId).ilike('phone', `%${last10}%`).limit(1)
    if (data && data.length > 0) clientId = data[0].id as string
  }
  if (!clientId && contact.email) {
    const { data } = await db.from('clients').select('id').eq('tenant_id', tenantId).ilike('email', contact.email).limit(1)
    if (data && data.length > 0) clientId = data[0].id as string
  }
  if (!teamMemberId && last10) {
    const { data } = await db.from('team_members').select('id').eq('tenant_id', tenantId).ilike('phone', `%${last10}%`).limit(1)
    if (data && data.length > 0) teamMemberId = data[0].id as string
  }
  if (!teamMemberId && contact.email) {
    const { data } = await db.from('team_members').select('id').eq('tenant_id', tenantId).ilike('email', contact.email).limit(1)
    if (data && data.length > 0) teamMemberId = data[0].id as string
  }

  let bestName: string | null = null
  if (teamMemberId) {
    const { data: tm } = await db.from('team_members').select('name').eq('id', teamMemberId).maybeSingle()
    if (tm?.name && !isPlaceholderName(tm.name as string, contact.phone)) bestName = tm.name as string
  }
  if (!bestName && clientId) {
    const { data: cl } = await db.from('clients').select('name').eq('id', clientId).maybeSingle()
    if (cl?.name && !isPlaceholderName(cl.name as string, contact.phone)) bestName = cl.name as string
  }
  if (!bestName && !clientId && !teamMemberId) {
    // Not a client or team member — check whether they're a job applicant.
    if (last10) {
      const { data: app } = await db.from('team_applications').select('name').eq('tenant_id', tenantId).ilike('phone', `%${last10}%`).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (app?.name) bestName = app.name as string
    }
    if (!bestName && contact.email) {
      const { data: app } = await db.from('team_applications').select('name').eq('tenant_id', tenantId).ilike('email', contact.email).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (app?.name) bestName = app.name as string
    }
  }

  const nameNeedsUpdate = bestName && (!contact.name || isPlaceholderName(contact.name, contact.phone))
  const linkageChanged = clientId !== contact.client_id || teamMemberId !== contact.team_member_id

  if (nameNeedsUpdate || linkageChanged) {
    await db.from('comhub_contacts').update({
      ...(linkageChanged ? { client_id: clientId, team_member_id: teamMemberId } : {}),
      ...(nameNeedsUpdate ? { name: bestName } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', contact.id)
  }

  return {
    id: contact.id,
    name: nameNeedsUpdate ? bestName : contact.name,
    phone: contact.phone,
    client_id: clientId,
    team_member_id: teamMemberId,
  }
}
