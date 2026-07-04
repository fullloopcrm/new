// Role-based access control for tenant members
// Roles: owner > admin > manager > staff
//
// Model: the permission SETS below are the hard-coded standard (the defaults
// every tenant starts from). A tenant may re-tune what admin/manager/staff can
// do via a per-tenant DELTA override stored in tenants.selena_config.role_permissions.
// `owner` is never customizable — it always keeps every permission, which is
// what prevents a tenant from locking itself out.

export type Role = 'owner' | 'admin' | 'manager' | 'staff'

export type Permission =
  | 'clients.view' | 'clients.create' | 'clients.edit' | 'clients.delete'
  | 'bookings.view' | 'bookings.create' | 'bookings.edit' | 'bookings.delete'
  | 'team.view' | 'team.create' | 'team.edit' | 'team.delete'
  | 'finance.view' | 'finance.payroll' | 'finance.expenses'
  | 'campaigns.view' | 'campaigns.create' | 'campaigns.send'
  | 'settings.view' | 'settings.edit' | 'settings.integrations'
  | 'schedules.view' | 'schedules.create' | 'schedules.edit'
  | 'reviews.view' | 'reviews.request'
  | 'referrals.view' | 'referrals.create' | 'referrals.payout'
  | 'leads.view'
  | 'notifications.view'
  | 'audit.view'

// A per-tenant override is a sparse map of deviations from the defaults.
// { admin: { 'finance.payroll': false }, staff: { 'clients.edit': true } }
// A missing entry means "use the hard-coded default for that permission".
// `owner` is intentionally not part of this — it is always full access.
export type RolePermissionOverrides = Partial<
  Record<Exclude<Role, 'owner'>, Partial<Record<Permission, boolean>>>
>

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete',
    'team.view', 'team.create', 'team.edit', 'team.delete',
    'finance.view', 'finance.payroll', 'finance.expenses',
    'campaigns.view', 'campaigns.create', 'campaigns.send',
    'settings.view', 'settings.edit', 'settings.integrations',
    'schedules.view', 'schedules.create', 'schedules.edit',
    'reviews.view', 'reviews.request',
    'referrals.view', 'referrals.create', 'referrals.payout',
    'leads.view', 'notifications.view', 'audit.view',
  ],
  admin: [
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete',
    'team.view', 'team.create', 'team.edit',
    'finance.view', 'finance.payroll', 'finance.expenses',
    'campaigns.view', 'campaigns.create', 'campaigns.send',
    'settings.view', 'settings.edit',
    'schedules.view', 'schedules.create', 'schedules.edit',
    'reviews.view', 'reviews.request',
    'referrals.view', 'referrals.create', 'referrals.payout',
    'leads.view', 'notifications.view', 'audit.view',
  ],
  manager: [
    'clients.view', 'clients.create', 'clients.edit',
    'bookings.view', 'bookings.create', 'bookings.edit',
    'team.view',
    'finance.view',
    'campaigns.view',
    'settings.view',
    'schedules.view', 'schedules.create', 'schedules.edit',
    'reviews.view', 'reviews.request',
    'referrals.view',
    'leads.view', 'notifications.view',
  ],
  staff: [
    'clients.view',
    'bookings.view', 'bookings.create',
    'team.view',
    'schedules.view',
    'reviews.view',
    'notifications.view',
  ],
}

// --- Catalog (drives the tenant-facing customization UI) ---

export type PermissionGroup = {
  key: string
  label: string
  permissions: { value: Permission; label: string }[]
}

// Every permission, grouped and labeled for the Permissions matrix UI.
// Order here is the display order.
export const PERMISSION_CATALOG: PermissionGroup[] = [
  { key: 'clients', label: 'Clients', permissions: [
    { value: 'clients.view', label: 'View clients' },
    { value: 'clients.create', label: 'Create clients' },
    { value: 'clients.edit', label: 'Edit clients' },
    { value: 'clients.delete', label: 'Delete clients' },
  ] },
  { key: 'bookings', label: 'Bookings', permissions: [
    { value: 'bookings.view', label: 'View bookings' },
    { value: 'bookings.create', label: 'Create bookings' },
    { value: 'bookings.edit', label: 'Edit bookings' },
    { value: 'bookings.delete', label: 'Delete bookings' },
  ] },
  { key: 'schedules', label: 'Schedules', permissions: [
    { value: 'schedules.view', label: 'View schedules' },
    { value: 'schedules.create', label: 'Create schedules' },
    { value: 'schedules.edit', label: 'Edit schedules' },
  ] },
  { key: 'team', label: 'Team', permissions: [
    { value: 'team.view', label: 'View team' },
    { value: 'team.create', label: 'Add team members' },
    { value: 'team.edit', label: 'Edit team members' },
    { value: 'team.delete', label: 'Remove team members' },
  ] },
  { key: 'finance', label: 'Finance', permissions: [
    { value: 'finance.view', label: 'View finance' },
    { value: 'finance.payroll', label: 'Run payroll / payouts' },
    { value: 'finance.expenses', label: 'Manage expenses' },
  ] },
  { key: 'campaigns', label: 'Campaigns', permissions: [
    { value: 'campaigns.view', label: 'View campaigns' },
    { value: 'campaigns.create', label: 'Create campaigns' },
    { value: 'campaigns.send', label: 'Send campaigns' },
  ] },
  { key: 'reviews', label: 'Reviews', permissions: [
    { value: 'reviews.view', label: 'View reviews' },
    { value: 'reviews.request', label: 'Request reviews' },
  ] },
  { key: 'referrals', label: 'Referrals', permissions: [
    { value: 'referrals.view', label: 'View referrals' },
    { value: 'referrals.create', label: 'Create referrals' },
    { value: 'referrals.payout', label: 'Pay out referrals' },
  ] },
  { key: 'settings', label: 'Settings', permissions: [
    { value: 'settings.view', label: 'View settings' },
    { value: 'settings.edit', label: 'Edit settings' },
    { value: 'settings.integrations', label: 'Manage integrations' },
  ] },
  { key: 'other', label: 'Other', permissions: [
    { value: 'leads.view', label: 'View leads' },
    { value: 'notifications.view', label: 'View notifications' },
    { value: 'audit.view', label: 'View audit log' },
  ] },
]

// Flat list of every valid permission — used to validate override payloads.
export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATALOG.flatMap(
  (g) => g.permissions.map((p) => p.value),
)

const ALL_PERMISSIONS_SET = new Set<string>(ALL_PERMISSIONS)

export function isValidPermission(value: string): value is Permission {
  return ALL_PERMISSIONS_SET.has(value)
}

// Roles a tenant is allowed to customize (owner is excluded on purpose).
export const CUSTOMIZABLE_ROLES: Exclude<Role, 'owner'>[] = ['admin', 'manager', 'staff']

export function isCustomizableRole(value: string): value is Exclude<Role, 'owner'> {
  return (CUSTOMIZABLE_ROLES as string[]).includes(value)
}

// --- Resolution ---

// The effective permission set for a role, after applying a tenant's overrides.
// Owner is always full access (overrides are ignored for owner → no lockout).
export function resolvePermissions(
  role: string,
  overrides?: RolePermissionOverrides | null,
): Permission[] {
  const defaults = ROLE_PERMISSIONS[role as Role]
  if (!defaults) return []
  if (role === 'owner' || !overrides) return [...defaults]

  const roleOverrides = overrides[role as Exclude<Role, 'owner'>]
  if (!roleOverrides) return [...defaults]

  const effective = new Set<Permission>(defaults)
  for (const [perm, allowed] of Object.entries(roleOverrides)) {
    if (!isValidPermission(perm)) continue
    if (allowed) effective.add(perm)
    else effective.delete(perm)
  }
  return [...effective]
}

export function hasPermission(
  role: string,
  permission: Permission,
  overrides?: RolePermissionOverrides | null,
): boolean {
  if (role === 'owner') return true
  return resolvePermissions(role, overrides).includes(permission)
}

// Hard-coded defaults for a role, ignoring any tenant customization.
// Used by the UI to show what "Restore defaults" would produce.
export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as Role] || []
}

export const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'owner', label: 'Owner', description: 'Full access to everything' },
  { value: 'admin', label: 'Admin', description: 'Full access except deleting team and integrations' },
  { value: 'manager', label: 'Manager', description: 'Manage day-to-day operations, no finance payroll or settings' },
  { value: 'staff', label: 'Staff', description: 'View-only access, can create bookings' },
]
