import { NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase'
import { verifyToken } from '@/app/api/team-portal/auth/route'
import {
  hasPortalPermission,
  type PortalPermission,
  type PortalRolePermissionOverrides,
} from './portal-rbac'

export type PortalAuth = { id: string; tid: string; role: string }

// Verify the portal bearer token → { memberId, tenantId, role }.
export function getPortalAuth(request: Request): PortalAuth | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifyToken(token)
}

// Load this tenant's portal permission overrides (deltas) from selena_config.
async function loadPortalOverrides(tenantId: string): Promise<PortalRolePermissionOverrides | null> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('selena_config')
    .eq('id', tenantId)
    .single()
  const raw = (data?.selena_config as { portal_role_permissions?: unknown } | null)?.portal_role_permissions
  if (!raw || typeof raw !== 'object') return null
  return raw as PortalRolePermissionOverrides
}

// Gate a portal route on a field-staff permission. Verifies the token, confirms
// the member is still active (instant revocation — a suspended/removed member is
// locked out immediately, not at token expiry), then checks the member's role
// against the tenant's effective permission set (defaults + tenant overrides).
export async function requirePortalPermission(
  request: Request,
  permission: PortalPermission,
): Promise<
  { auth: PortalAuth; error: null } | { auth: null; error: NextResponse }
> {
  const auth = getPortalAuth(request)
  if (!auth) {
    return { auth: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Instant revocation: the token carries the role, but access dies the moment
  // the member is suspended/removed — re-check status every gated call.
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('status')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()
  if (!member || member.status !== 'active') {
    return { auth: null, error: NextResponse.json({ error: 'Account inactive' }, { status: 401 }) }
  }

  const overrides = await loadPortalOverrides(auth.tid)
  if (!hasPortalPermission(auth.role, permission, overrides)) {
    return {
      auth: null,
      error: NextResponse.json({ error: 'Forbidden: your role cannot do this' }, { status: 403 }),
    }
  }

  return { auth, error: null }
}

// The set of team_member IDs this member is allowed to see, by role + crews:
//   worker  → just themselves
//   lead    → everyone sharing at least one crew with them (else just themselves)
//   manager → all active field staff in the tenant
// Degrades gracefully: with no crews configured, managers see all, leads/workers
// see only themselves.
export async function scopedMemberIds(auth: PortalAuth): Promise<string[]> {
  if (auth.role === 'manager') {
    const { data } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('tenant_id', auth.tid)
      .eq('status', 'active')
    return (data || []).map((m) => m.id)
  }

  if (auth.role === 'lead') {
    const { data: myCrews } = await supabaseAdmin
      .from('crew_members')
      .select('crew_id')
      .eq('team_member_id', auth.id)
    const crewIds = (myCrews || []).map((c) => c.crew_id)
    if (crewIds.length === 0) return [auth.id]

    const { data: peers } = await supabaseAdmin
      .from('crew_members')
      .select('team_member_id')
      .in('crew_id', crewIds)
    const ids = new Set<string>([auth.id])
    for (const p of peers || []) ids.add(p.team_member_id)
    return [...ids]
  }

  return [auth.id]
}
