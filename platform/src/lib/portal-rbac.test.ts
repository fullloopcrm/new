import { describe, it, expect } from 'vitest'
import {
  resolvePortalPermissions,
  hasPortalPermission,
  getPortalRolePermissions,
  normalizePortalRole,
  type PortalRolePermissionOverrides,
} from './portal-rbac'

describe('portal-rbac (field staff tiers)', () => {
  it('worker < lead < manager on crew visibility', () => {
    expect(hasPortalPermission('worker', 'jobs.view_crew')).toBe(false)
    expect(hasPortalPermission('lead', 'jobs.view_crew')).toBe(true)
    expect(hasPortalPermission('manager', 'jobs.view_crew')).toBe(true)
  })

  it('crew earnings (pay visibility) is OFF for everyone by default — opt-in only', () => {
    expect(hasPortalPermission('worker', 'earnings.view_crew')).toBe(false)
    expect(hasPortalPermission('lead', 'earnings.view_crew')).toBe(false)
    expect(hasPortalPermission('manager', 'earnings.view_crew')).toBe(false)
  })

  it('a tenant can explicitly grant crew earnings to manager', () => {
    const overrides: PortalRolePermissionOverrides = { manager: { 'earnings.view_crew': true } }
    expect(hasPortalPermission('manager', 'earnings.view_crew', overrides)).toBe(true)
  })

  it('everyone sees and claims their own work by default', () => {
    for (const role of ['worker', 'lead', 'manager']) {
      expect(hasPortalPermission(role, 'jobs.view_own')).toBe(true)
      expect(hasPortalPermission(role, 'jobs.claim')).toBe(true)
      expect(hasPortalPermission(role, 'earnings.view_own')).toBe(true)
    }
  })

  it('unknown / legacy role falls back to least-privilege worker', () => {
    expect(normalizePortalRole(null)).toBe('worker')
    expect(normalizePortalRole('supervisor')).toBe('worker')
    expect(resolvePortalPermissions('supervisor')).toEqual(getPortalRolePermissions('worker'))
  })

  it('no override → identical to hard-coded defaults', () => {
    expect(resolvePortalPermissions('lead')).toEqual(getPortalRolePermissions('lead'))
    expect(resolvePortalPermissions('worker', {})).toEqual(getPortalRolePermissions('worker'))
  })

  it('tenant can revoke a default (lock leads out of the open pool)', () => {
    const overrides: PortalRolePermissionOverrides = { lead: { 'jobs.view_unassigned': false } }
    expect(hasPortalPermission('lead', 'jobs.view_unassigned')).toBe(true)
    expect(hasPortalPermission('lead', 'jobs.view_unassigned', overrides)).toBe(false)
    // other lead permissions untouched
    expect(hasPortalPermission('lead', 'jobs.view_crew', overrides)).toBe(true)
  })

  it('tenant can grant a non-default (let workers see the crew)', () => {
    const overrides: PortalRolePermissionOverrides = { worker: { 'jobs.view_crew': true } }
    expect(hasPortalPermission('worker', 'jobs.view_crew', overrides)).toBe(true)
    // does not leak to the manager row
    expect(getPortalRolePermissions('worker')).not.toContain('jobs.view_crew')
  })

  it('ignores unknown permission keys in an override', () => {
    const overrides = { worker: { 'jobs.teleport': true } } as unknown as PortalRolePermissionOverrides
    expect(resolvePortalPermissions('worker', overrides)).toEqual(getPortalRolePermissions('worker'))
  })
})
