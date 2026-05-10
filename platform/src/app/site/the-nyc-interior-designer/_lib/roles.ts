// @ts-nocheck
export type AdminRole = 'owner' | 'admin' | 'manager' | 'viewer'

const PAGE_ACCESS: Record<AdminRole, string[]> = {
  owner: ['*'],
  admin: [
    'dashboard', 'projects', 'clients', 'designers', 'finance',
    'feedback', 'notifications', 'applications',
  ],
  manager: [
    'dashboard', 'projects', 'clients', 'leads',
    'feedback', 'applications',
  ],
  viewer: [
    'dashboard', 'projects',
  ],
}

const API_ACCESS: Record<AdminRole, string[]> = {
  owner: ['*'],
  admin: [
    '/api/dashboard', '/api/projects', '/api/clients', '/api/designers',
    '/api/notifications', '/api/finance', '/api/admin/feedback',
    '/api/applications',
  ],
  manager: [
    '/api/dashboard', '/api/projects', '/api/clients',
    '/api/notifications', '/api/admin/feedback', '/api/applications',
  ],
  viewer: [
    '/api/dashboard', '/api/projects', '/api/notifications',
  ],
}

const RESTRICTED: Record<string, AdminRole[]> = {
  'finance': ['owner', 'admin'],
  'settings': ['owner'],
  'designer_pay_rates': ['owner', 'admin'],
  'delete_projects': ['owner', 'admin'],
  'delete_clients': ['owner', 'admin'],
  'manage_users': ['owner'],
  'edit_projects': ['owner', 'admin', 'manager'],
  'create_projects': ['owner', 'admin', 'manager'],
  'view_projects': ['owner', 'admin', 'manager', 'viewer'],
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
