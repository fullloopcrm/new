/**
 * Entity helpers. Entities are sub-units under one tenant —
 * separate legal/accounting but same platform login.
 *
 * Most finance API routes accept an optional ?entity_id=X filter. When
 * absent, queries span all entities under the tenant (consolidated).
 */
import { supabaseAdmin } from './supabase'

export interface Entity {
  id: string
  tenant_id: string
  name: string
  legal_name: string | null
  ein: string | null
  entity_type: string | null
  is_default: boolean
  active: boolean
}

export async function listEntities(tenantId: string): Promise<Entity[]> {
  const { data, error } = await supabaseAdmin
    .from('entities')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })
  if (error) throw error
  return (data || []) as Entity[]
}

export async function getDefaultEntityId(tenantId: string): Promise<string | null> {
  // `active` matters here: DELETE /api/finance/entities/[id] guards against
  // archiving the current default, but that guard used to be a
  // check-then-act race (see set_default_entity migration notes). If a
  // default entity was ever archived through that window, every writer that
  // falls back to "the default entity" when no entity_id is given (this
  // function's 4 callers, plus post_journal_entry's own SQL-side fallback)
  // must not keep silently resolving to a dead entity.
  const { data } = await supabaseAdmin
    .from('entities')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_default', true)
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  return data?.id || null
}

/** Resolve ?entity_id= from URL; if absent, returns null = consolidated. */
export function entityIdFromUrl(url: URL): string | null {
  const raw = url.searchParams.get('entity_id')
  if (!raw || raw === 'all' || raw === 'consolidated') return null
  return raw
}

// entity_id is a cross-table FK — confirm it belongs to this tenant before
// writing it onto another row (expense/invoice/accounting_period/…), or a
// caller could tag their own row with another tenant's entity_id and
// exfiltrate that entity's name/legal_name/EIN via any entities() embed
// (e.g. GET /api/finance/periods already does `select('*, entities(name))`).
export async function verifyEntityId(tenantId: string, entityId: string | null | undefined): Promise<string | null> {
  if (!entityId) return null
  const { data } = await supabaseAdmin
    .from('entities')
    .select('id')
    .eq('id', entityId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return data?.id || null
}
