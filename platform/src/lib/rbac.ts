// Role-based access control for tenant members
// Roles: owner > admin > manager > staff

type Role = 'owner' | 'admin' | 'manager' | 'staff'

type Permission =
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

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role]
  if (!perms) return false
  return perms.includes(permission)
}

export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as Role] || []
}

export const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'owner', label: 'Owner', description: 'Full access to everything' },
  { value: 'admin', label: 'Admin', description: 'Full access except deleting team and integrations' },
  { value: 'manager', label: 'Manager', description: 'Manage day-to-day operations, no finance payroll or settings' },
  { value: 'staff', label: 'Staff', description: 'View-only access, can create bookings' },
]
