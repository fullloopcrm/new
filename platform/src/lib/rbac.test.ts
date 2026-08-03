import { describe, it, expect } from 'vitest'
import { hasPermission, getRolePermissions, resolvePermissions, type RolePermissionOverrides } from './rbac'

describe('RBAC', () => {
  describe('owner', () => {
    it('has all permissions', () => {
      expect(hasPermission('owner', 'clients.view')).toBe(true)
      expect(hasPermission('owner', 'clients.delete')).toBe(true)
      expect(hasPermission('owner', 'settings.integrations')).toBe(true)
      expect(hasPermission('owner', 'finance.payroll')).toBe(true)
      expect(hasPermission('owner', 'team.delete')).toBe(true)
    })
  })

  describe('admin', () => {
    it('has most permissions', () => {
      expect(hasPermission('admin', 'clients.view')).toBe(true)
      expect(hasPermission('admin', 'clients.delete')).toBe(true)
      expect(hasPermission('admin', 'finance.payroll')).toBe(true)
    })

    it('cannot delete team or access integrations', () => {
      expect(hasPermission('admin', 'team.delete')).toBe(false)
      expect(hasPermission('admin', 'settings.integrations')).toBe(false)
    })
  })

  describe('manager', () => {
    it('can view and edit clients', () => {
      expect(hasPermission('manager', 'clients.view')).toBe(true)
      expect(hasPermission('manager', 'clients.edit')).toBe(true)
    })

    it('cannot delete clients', () => {
      expect(hasPermission('manager', 'clients.delete')).toBe(false)
    })

    it('cannot manage team or payroll', () => {
      expect(hasPermission('manager', 'team.create')).toBe(false)
      expect(hasPermission('manager', 'finance.payroll')).toBe(false)
    })
  })

  describe('staff', () => {
    it('can view clients and bookings', () => {
      expect(hasPermission('staff', 'clients.view')).toBe(true)
      expect(hasPermission('staff', 'bookings.view')).toBe(true)
    })

    it('can create bookings', () => {
      expect(hasPermission('staff', 'bookings.create')).toBe(true)
    })

    it('cannot edit or delete anything', () => {
      expect(hasPermission('staff', 'clients.edit')).toBe(false)
      expect(hasPermission('staff', 'clients.delete')).toBe(false)
      expect(hasPermission('staff', 'bookings.edit')).toBe(false)
      expect(hasPermission('staff', 'bookings.delete')).toBe(false)
    })

    it('cannot access finance, campaigns, or settings', () => {
      expect(hasPermission('staff', 'finance.view')).toBe(false)
      expect(hasPermission('staff', 'campaigns.view')).toBe(false)
      expect(hasPermission('staff', 'settings.view')).toBe(false)
    })
  })

  describe('virtual_assistant', () => {
    it('can view/create/edit clients, bookings, and schedules', () => {
      expect(hasPermission('virtual_assistant', 'clients.view')).toBe(true)
      expect(hasPermission('virtual_assistant', 'clients.create')).toBe(true)
      expect(hasPermission('virtual_assistant', 'clients.edit')).toBe(true)
      expect(hasPermission('virtual_assistant', 'bookings.edit')).toBe(true)
      expect(hasPermission('virtual_assistant', 'schedules.edit')).toBe(true)
    })

    it('can view/create/edit team (HR) but not delete', () => {
      expect(hasPermission('virtual_assistant', 'team.view')).toBe(true)
      expect(hasPermission('virtual_assistant', 'team.create')).toBe(true)
      expect(hasPermission('virtual_assistant', 'team.edit')).toBe(true)
      expect(hasPermission('virtual_assistant', 'team.delete')).toBe(false)
    })

    it('can view/create/send campaigns (marketing)', () => {
      expect(hasPermission('virtual_assistant', 'campaigns.view')).toBe(true)
      expect(hasPermission('virtual_assistant', 'campaigns.send')).toBe(true)
    })

    it('cannot delete anything', () => {
      expect(hasPermission('virtual_assistant', 'clients.delete')).toBe(false)
      expect(hasPermission('virtual_assistant', 'bookings.delete')).toBe(false)
      expect(hasPermission('virtual_assistant', 'team.delete')).toBe(false)
    })

    it('cannot access finance or settings at all', () => {
      expect(hasPermission('virtual_assistant', 'finance.view')).toBe(false)
      expect(hasPermission('virtual_assistant', 'finance.payroll')).toBe(false)
      expect(hasPermission('virtual_assistant', 'finance.expenses')).toBe(false)
      expect(hasPermission('virtual_assistant', 'settings.view')).toBe(false)
      expect(hasPermission('virtual_assistant', 'settings.edit')).toBe(false)
    })

    it('can view/manage sales, referrals, and sales partners but not pay out', () => {
      expect(hasPermission('virtual_assistant', 'sales.view')).toBe(true)
      expect(hasPermission('virtual_assistant', 'sales.edit')).toBe(true)
      expect(hasPermission('virtual_assistant', 'referrals.manage')).toBe(true)
      expect(hasPermission('virtual_assistant', 'referrals.payout')).toBe(false)
      expect(hasPermission('virtual_assistant', 'sales_partners.manage')).toBe(true)
      expect(hasPermission('virtual_assistant', 'sales_partners.payout')).toBe(false)
    })

    it('is customizable per-tenant like admin/manager/staff', () => {
      const overrides: RolePermissionOverrides = { virtual_assistant: { 'finance.view': true } }
      expect(hasPermission('virtual_assistant', 'finance.view', overrides)).toBe(true)
    })
  })

  describe('unknown role', () => {
    it('has no permissions', () => {
      expect(hasPermission('unknown', 'clients.view')).toBe(false)
      expect(hasPermission('', 'clients.view')).toBe(false)
    })
  })

  describe('getRolePermissions', () => {
    it('returns permissions array for valid roles', () => {
      const ownerPerms = getRolePermissions('owner')
      expect(ownerPerms.length).toBeGreaterThan(0)
      expect(ownerPerms).toContain('clients.view')
    })

    it('returns empty array for invalid roles', () => {
      expect(getRolePermissions('unknown')).toEqual([])
    })
  })

  // Per-tenant customization: hard-coded defaults + tenant deltas, connected to
  // the same hasPermission() that every requirePermission() call site uses.
  describe('tenant overrides', () => {
    it('no override → identical to hard-coded defaults (zero behavior change)', () => {
      expect(resolvePermissions('manager')).toEqual(getRolePermissions('manager'))
      expect(resolvePermissions('staff', null)).toEqual(getRolePermissions('staff'))
      expect(resolvePermissions('staff', {})).toEqual(getRolePermissions('staff'))
    })

    it('owner is always full access and ignores overrides (no lockout)', () => {
      const overrides = { admin: { 'settings.edit': false } } as RolePermissionOverrides
      expect(resolvePermissions('owner', overrides)).toEqual(getRolePermissions('owner'))
      expect(hasPermission('owner', 'settings.integrations', overrides)).toBe(true)
    })

    it('a revoke delta removes a default permission for that role only', () => {
      const overrides: RolePermissionOverrides = { admin: { 'finance.payroll': false } }
      expect(hasPermission('admin', 'finance.payroll')).toBe(true)
      expect(hasPermission('admin', 'finance.payroll', overrides)).toBe(false)
      expect(hasPermission('admin', 'clients.create', overrides)).toBe(true)
    })

    it('a grant delta adds a non-default permission', () => {
      expect(hasPermission('staff', 'finance.view')).toBe(false)
      const overrides: RolePermissionOverrides = { staff: { 'finance.view': true } }
      expect(hasPermission('staff', 'finance.view', overrides)).toBe(true)
    })

    it('ignores unknown permission keys in an override', () => {
      const overrides = { staff: { 'not.a.real.permission': true } } as unknown as RolePermissionOverrides
      expect(resolvePermissions('staff', overrides)).toEqual(getRolePermissions('staff'))
    })
  })
})
