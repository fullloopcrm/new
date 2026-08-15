// Role-based access control for tenant members
// General hierarchy: owner > admin > manager > staff.
// virtual_assistant is a lateral specialized role, not slotted into that
// ladder — front-office/operations support, not a rung of general authority.
//
// Model: the permission SETS below are the hard-coded standard (the defaults
// every tenant starts from). A tenant may re-tune any CUSTOMIZABLE_ROLES entry
// via a per-tenant DELTA override stored in tenants.selena_config.role_permissions.
// `owner` is never customizable — it always keeps every permission, which is
// what prevents a tenant from locking itself out.

export type Role = 'owner' | 'admin' | 'manager' | 'staff' | 'virtual_assistant' | 'contractor'

export type Permission =
  | 'clients.view' | 'clients.create' | 'clients.edit' | 'clients.delete'
  | 'bookings.view' | 'bookings.create' | 'bookings.edit' | 'bookings.delete'
  | 'team.view' | 'team.create' | 'team.edit' | 'team.delete'
  | 'team.compensation'
  | 'finance.view' | 'finance.payroll' | 'finance.expenses'
  | 'campaigns.view' | 'campaigns.create' | 'campaigns.send'
  | 'settings.view' | 'settings.edit' | 'settings.integrations'
  | 'schedules.view' | 'schedules.create' | 'schedules.edit'
  | 'reviews.view' | 'reviews.request'
  | 'referrals.view' | 'referrals.create' | 'referrals.manage' | 'referrals.payout'
  | 'sales_partners.view' | 'sales_partners.manage' | 'sales_partners.payout'
  | 'sales.view' | 'sales.edit'
  | 'leads.view'
  | 'notifications.view'
  | 'audit.view'
  | 'tenant.activate'
  | 'boards.view' | 'boards.edit'

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
    'team.view', 'team.create', 'team.edit', 'team.delete', 'team.compensation',
    'finance.view', 'finance.payroll', 'finance.expenses',
    'campaigns.view', 'campaigns.create', 'campaigns.send',
    'settings.view', 'settings.edit', 'settings.integrations',
    'schedules.view', 'schedules.create', 'schedules.edit',
    'reviews.view', 'reviews.request',
    'referrals.view', 'referrals.create', 'referrals.manage', 'referrals.payout',
    'sales_partners.view', 'sales_partners.manage', 'sales_partners.payout',
    'sales.view', 'sales.edit',
    'leads.view', 'notifications.view', 'audit.view',
    'tenant.activate',
    'boards.view', 'boards.edit',
  ],
  admin: [
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete',
    'team.view', 'team.create', 'team.edit', 'team.compensation',
    'finance.view', 'finance.payroll', 'finance.expenses',
    'campaigns.view', 'campaigns.create', 'campaigns.send',
    'settings.view', 'settings.edit',
    'schedules.view', 'schedules.create', 'schedules.edit',
    'reviews.view', 'reviews.request',
    'referrals.view', 'referrals.create', 'referrals.manage', 'referrals.payout',
    'sales_partners.view', 'sales_partners.manage', 'sales_partners.payout',
    'sales.view', 'sales.edit',
    'leads.view', 'notifications.view', 'audit.view',
    'tenant.activate',
    'boards.view', 'boards.edit',
  ],
  manager: [
    'clients.view', 'clients.create', 'clients.edit',
    'bookings.view', 'bookings.create', 'bookings.edit',
    'team.view', 'team.compensation',
    'finance.view',
    'campaigns.view',
    'settings.view',
    'schedules.view', 'schedules.create', 'schedules.edit',
    'reviews.view', 'reviews.request',
    'referrals.view',
    'sales_partners.view',
    'sales.view', 'sales.edit',
    'leads.view', 'notifications.view',
    'boards.view', 'boards.edit',
  ],
  staff: [
    'clients.view',
    'bookings.view', 'bookings.create',
    'team.view',
    'schedules.view',
    'reviews.view',
    'sales.view',
    'notifications.view',
    'boards.view', 'boards.edit',
  ],
  // Front-office/remote support: The Loop, clients, ComHub/Connect, sales,
  // production (bookings/schedules), full HR (team roster including PIN
  // resets and compensation/compliance-doc visibility, plus payroll data),
  // and marketing (campaigns). Deliberately no delete anywhere and no
  // settings access. team.compensation was granted 2026-08-12 specifically
  // to unlock PIN reset (gated on it in /api/team/[id]'s PUT handler as "same
  // tier as viewing it") — pay-rate/compliance-doc visibility comes along
  // with that grant, which is why it's a deliberate, not incidental, choice.
  // finance.payroll (running actual payouts) stays owner/admin-only —
  // finance.view only, so payroll data is visible but not executable.
  // 2026-08-03, first VA hire onboarding role.
  virtual_assistant: [
    'clients.view', 'clients.create', 'clients.edit',
    'bookings.view', 'bookings.create', 'bookings.edit',
    'schedules.view', 'schedules.create', 'schedules.edit',
    'team.view', 'team.create', 'team.edit', 'team.compensation',
    'finance.view',
    'campaigns.view', 'campaigns.create',
    'reviews.view', 'reviews.request',
    'referrals.view', 'referrals.create',
    'sales_partners.view',
    'sales.view', 'sales.edit',
    'leads.view', 'notifications.view',
    'boards.view', 'boards.edit',
  ],
  // External fulfillment partner (e.g. a licensed sub-contractor selling
  // under their own license via a signed contractor agreement): full
  // visibility into how the tenant runs, zero write access anywhere in the
  // back end. Their actual day-to-day work (accepting/completing jobs) happens
  // in the team portal via a separate team_members/portal-rbac.ts account, not
  // here. team.compensation deliberately excluded — that's other people's pay
  // rates/compliance docs, out of scope for "view how the business runs."
  // Global role, usable by any tenant. 2026-08-14.
  contractor: [
    'clients.view',
    'bookings.view',
    'schedules.view',
    'team.view',
    'finance.view',
    'campaigns.view',
    'reviews.view',
    'referrals.view',
    'sales_partners.view',
    'sales.view',
    'leads.view', 'notifications.view',
    'boards.view',
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
    { value: 'team.compensation', label: 'View/edit pay rate, employment classification, and compliance documents' },
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
    { value: 'referrals.manage', label: 'Manage referrers (commission rate, recruiting sales partner, active status)' },
    { value: 'referrals.payout', label: 'Pay out referrals' },
  ] },
  { key: 'sales_partners', label: 'Sales Partners', permissions: [
    { value: 'sales_partners.view', label: 'View sales partners' },
    { value: 'sales_partners.manage', label: 'Manage sales partners (tier, active status)' },
    { value: 'sales_partners.payout', label: 'Pay out sales partner commissions' },
  ] },
  { key: 'sales', label: 'Sales & Documents', permissions: [
    { value: 'sales.view', label: 'View proposals & documents' },
    { value: 'sales.edit', label: 'Create / edit / send documents' },
  ] },
  { key: 'settings', label: 'Settings', permissions: [
    { value: 'settings.view', label: 'View settings' },
    { value: 'settings.edit', label: 'Edit settings' },
    { value: 'settings.integrations', label: 'Manage integrations' },
  ] },
  { key: 'boards', label: 'Task Board', permissions: [
    { value: 'boards.view', label: 'View task boards' },
    { value: 'boards.edit', label: 'Create / edit boards, groups, items, and columns' },
  ] },
  { key: 'other', label: 'Other', permissions: [
    { value: 'leads.view', label: 'View leads' },
    { value: 'notifications.view', label: 'View notifications' },
    { value: 'audit.view', label: 'View audit log' },
    { value: 'tenant.activate', label: 'Activate tenant (go live) and manage onboarding checklist' },
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
export const CUSTOMIZABLE_ROLES: Exclude<Role, 'owner'>[] = ['admin', 'manager', 'staff', 'virtual_assistant', 'contractor']

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
  { value: 'virtual_assistant', label: 'Virtual Assistant', description: 'The Loop, clients, ComHub/Connect, sales, production, full HR (including PIN reset and compensation data), payroll data, and marketing — no delete anywhere, no settings access, cannot run payroll' },
  { value: 'contractor', label: 'Contractor', description: 'View-only across clients, ComHub, sales, production, and finance — no create, edit, or delete anywhere, no settings access' },
]
