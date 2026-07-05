export type AdminRole = 'owner' | 'admin' | 'manager' | 'viewer'

const PAGE_ACCESS: Record<AdminRole, string[]> = {
  owner: ['*'],
  admin: [
    'dashboard', 'leads', 'applications', 'calendar', 'clients', 'team', 'finance', 'feedback',
  ],
  manager: [
    'dashboard', 'leads', 'applications', 'calendar', 'clients', 'feedback',
  ],
  viewer: [
    'dashboard', 'leads', 'applications',
  ],
}

const API_ACCESS: Record<AdminRole, string[]> = {
  owner: ['*'],
  admin: [
    '/api/dashboard', '/api/admin/leads', '/api/admin/applications', '/api/clients',
    '/api/admin/stylists', '/api/finance', '/api/admin/feedback',
  ],
  manager: [
    '/api/dashboard', '/api/admin/leads', '/api/admin/applications', '/api/clients',
    '/api/admin/feedback',
  ],
  viewer: [
    '/api/dashboard', '/api/admin/leads', '/api/admin/applications',
  ],
}

const RESTRICTED: Record<string, AdminRole[]> = {
  'finance': ['owner', 'admin'],
  'settings': ['owner'],
  'team_pay_rates': ['owner', 'admin'],
  'manage_users': ['owner'],
  'delete_leads': ['owner', 'admin'],
  'delete_applications': ['owner', 'admin'],
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
  if (!allowed) return true
  return allowed.includes(role)
}

export function getAccessiblePages(role: AdminRole): string[] {
  return PAGE_ACCESS[role]
}
