// Role-based access control for FIELD STAFF in the team portal (/team).
//
// This is a SEPARATE system from src/lib/rbac.ts:
//   rbac.ts        → operator dashboard users (tenant_members): owner/admin/manager/staff
//   portal-rbac.ts → field staff (team_members): worker/lead/manager
//
// Same shape as the dashboard: the sets below are the hard-coded standard, and a
// tenant may re-tune them via a delta override stored in
// tenants.selena_config.portal_role_permissions. There is no "owner" tier in the
// portal — `manager` is the top field tier, and it IS customizable (a portal role
// can never lock the tenant's operators out of the dashboard).

export type PortalRole = 'worker' | 'lead' | 'manager'

export type PortalPermission =
  | 'jobs.view_own' | 'jobs.view_unassigned' | 'jobs.claim' | 'jobs.release_own'
  | 'jobs.view_crew' | 'jobs.reassign'
  | 'schedule.view_crew'
  | 'team.view_roster'
  | 'earnings.view_own' | 'earnings.view_crew'
  | 'availability.edit_own' | 'availability.manage_others'
  | 'messages.use'

// Sparse per-tenant deviations from the defaults, keyed by portal role.
export type PortalRolePermissionOverrides = Partial<
  Record<PortalRole, Partial<Record<PortalPermission, boolean>>>
>

const PORTAL_ROLE_PERMISSIONS: Record<PortalRole, PortalPermission[]> = {
  worker: [
    'jobs.view_own', 'jobs.view_unassigned', 'jobs.claim', 'jobs.release_own',
    'earnings.view_own',
    'availability.edit_own',
    'messages.use',
  ],
  lead: [
    'jobs.view_own', 'jobs.view_unassigned', 'jobs.claim', 'jobs.release_own',
    'jobs.view_crew', 'jobs.reassign',
    'schedule.view_crew',
    'team.view_roster',
    'earnings.view_own',
    'availability.edit_own',
    'messages.use',
  ],
  manager: [
    'jobs.view_own', 'jobs.view_unassigned', 'jobs.claim', 'jobs.release_own',
    'jobs.view_crew', 'jobs.reassign',
    'schedule.view_crew',
    'team.view_roster',
    // earnings.view_crew (pay visibility) is intentionally OFF even for manager —
    // it's the highest-risk grant (a field manager could poach at known rates).
    // A tenant must explicitly opt in via the portal permission matrix.
    'earnings.view_own',
    'availability.edit_own', 'availability.manage_others',
    'messages.use',
  ],
}

// --- Catalog (drives the tenant-facing customization UI) ---

export type PortalPermissionGroup = {
  key: string
  label: string
  permissions: { value: PortalPermission; label: string }[]
}

export const PORTAL_PERMISSION_CATALOG: PortalPermissionGroup[] = [
  { key: 'jobs', label: 'Jobs', permissions: [
    { value: 'jobs.view_own', label: 'See own assigned jobs' },
    { value: 'jobs.view_unassigned', label: 'See the open (unassigned) job pool' },
    { value: 'jobs.claim', label: 'Claim open jobs' },
    { value: 'jobs.release_own', label: 'Release own job back to the pool' },
    { value: 'jobs.view_crew', label: "See teammates' jobs" },
    { value: 'jobs.reassign', label: 'Assign / reassign jobs to others' },
  ] },
  { key: 'schedule', label: 'Schedule', permissions: [
    { value: 'schedule.view_crew', label: "See the whole crew's schedule" },
  ] },
  { key: 'team', label: 'Team', permissions: [
    { value: 'team.view_roster', label: 'See the team roster' },
  ] },
  { key: 'earnings', label: 'Earnings', permissions: [
    { value: 'earnings.view_own', label: 'See own earnings' },
    { value: 'earnings.view_crew', label: "See the crew's earnings" },
  ] },
  { key: 'availability', label: 'Availability', permissions: [
    { value: 'availability.edit_own', label: 'Edit own availability' },
    { value: 'availability.manage_others', label: "Manage others' availability" },
  ] },
  { key: 'messages', label: 'Messages', permissions: [
    { value: 'messages.use', label: 'Use portal messaging' },
  ] },
]

export const ALL_PORTAL_PERMISSIONS: PortalPermission[] = PORTAL_PERMISSION_CATALOG.flatMap(
  (g) => g.permissions.map((p) => p.value),
)

const ALL_PORTAL_PERMISSIONS_SET = new Set<string>(ALL_PORTAL_PERMISSIONS)

export function isValidPortalPermission(value: string): value is PortalPermission {
  return ALL_PORTAL_PERMISSIONS_SET.has(value)
}

export const PORTAL_ROLES: { value: PortalRole; label: string; description: string }[] = [
  { value: 'worker', label: 'Worker', description: 'Does jobs — sees and claims their own work' },
  { value: 'lead', label: 'Lead', description: 'Runs a crew — sees teammates and can reassign jobs' },
  { value: 'manager', label: 'Manager', description: 'Full field oversight including crew earnings' },
]

const PORTAL_ROLE_SET = new Set<string>(PORTAL_ROLES.map((r) => r.value))

export function isPortalRole(value: string): value is PortalRole {
  return PORTAL_ROLE_SET.has(value)
}

// Normalize any stored/legacy team_members.role value to a valid portal role.
// Unknown values (and the legacy 'worker' default) fall back to least privilege.
export function normalizePortalRole(value: string | null | undefined): PortalRole {
  return value && isPortalRole(value) ? value : 'worker'
}

// --- Resolution ---

export function resolvePortalPermissions(
  role: string,
  overrides?: PortalRolePermissionOverrides | null,
): PortalPermission[] {
  const normalized = normalizePortalRole(role)
  const defaults = PORTAL_ROLE_PERMISSIONS[normalized]
  if (!overrides) return [...defaults]

  const roleOverrides = overrides[normalized]
  if (!roleOverrides) return [...defaults]

  const effective = new Set<PortalPermission>(defaults)
  for (const [perm, allowed] of Object.entries(roleOverrides)) {
    if (!isValidPortalPermission(perm)) continue
    if (allowed) effective.add(perm)
    else effective.delete(perm)
  }
  return [...effective]
}

export function hasPortalPermission(
  role: string,
  permission: PortalPermission,
  overrides?: PortalRolePermissionOverrides | null,
): boolean {
  return resolvePortalPermissions(role, overrides).includes(permission)
}

// Hard-coded defaults for a portal role, ignoring any tenant customization.
export function getPortalRolePermissions(role: string): PortalPermission[] {
  return PORTAL_ROLE_PERMISSIONS[normalizePortalRole(role)] || []
}
