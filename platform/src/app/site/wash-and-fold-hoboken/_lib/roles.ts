// Role-Based Access Control for Admin Users

export type AdminRole = 'owner' | 'admin' | 'manager' | 'viewer'

// Pages each role can access
const PAGE_ACCESS: Record<AdminRole, string[]> = {
  owner: ['*'], // everything
  admin: [
    'dashboard', 'bookings', 'calendar', 'clients', 'team', 'finance',
    'feedback', 'notifications',
  ],
  manager: [
    'dashboard', 'bookings', 'calendar', 'clients', 'selena', 'leads',
    'feedback',
  ],
  viewer: [
    'dashboard', 'bookings', 'calendar',
  ],
}

// API route prefixes each role can access
const API_ACCESS: Record<AdminRole, string[]> = {
  owner: ['*'],
  admin: [
    '/api/dashboard', '/api/bookings', '/api/clients', '/api/cleaners',
    '/api/admin/recurring', '/api/notifications', '/api/finance',
    '/api/admin/feedback',
  ],
  manager: [
    '/api/dashboard', '/api/bookings', '/api/clients', '/api/admin/selena',
    '/api/admin/recurring', '/api/notifications', '/api/admin/leads',
    '/api/admin/feedback',
  ],
  viewer: [
    '/api/dashboard', '/api/bookings', '/api/notifications',
  ],
}

// Features restricted from certain roles
const RESTRICTED: Record<string, AdminRole[]> = {
  'finance': ['owner', 'admin'],
  'settings': ['owner'],
  'team_pay_rates': ['owner', 'admin'],
  'delete_bookings': ['owner', 'admin'],
  'delete_clients': ['owner', 'admin'],
  'manage_users': ['owner'],
  'edit_bookings': ['owner', 'admin', 'manager'],
  'create_bookings': ['owner', 'admin', 'manager'],
  'view_bookings': ['owner', 'admin', 'manager', 'viewer'],
}

export function canAccessPage(role: AdminRole, page: string): boolean {
  const pages = PAGE_ACCESS[role]
  return pages.includes('*') || pages.includes(page)
}

export function canAccessAPI(role: AdminRole, path: string): boolean {
  const routes = API_ACCESS[role]
  if (routes.includes('*')) return true
  return routes.some(r => path.startsWith(r))
}

export function hasPermission(role: AdminRole, feature: string): boolean {
  const allowed = RESTRICTED[feature]
  if (!allowed) return true // not restricted = everyone can access
  return allowed.includes(role)
}

export function getAccessiblePages(role: AdminRole): string[] {
  return PAGE_ACCESS[role]
}
