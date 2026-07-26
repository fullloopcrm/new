import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: vi.fn(async (slug: string) =>
    slug === 'nycmaid' ? { id: 'tenant-nycmaid', slug: 'nycmaid', name: 'The NYC Maid', domain: 'thenycmaid.com', status: 'active' } : null,
  ),
}))
vi.mock('@/lib/tenant-header-sig', () => ({
  signTenantHeader: (tenantId: string) => `sig-for-${tenantId}`,
}))

import ClientErrorMonitor from './ClientErrorMonitor'

describe('ClientErrorMonitor', () => {
  it('renders the err.js script with a signed tenant id for a known tenant', async () => {
    const el = await ClientErrorMonitor({ slug: 'nycmaid' })
    expect(el).not.toBeNull()
    expect(el?.props.src).toBe('/err.js')
    expect(el?.props['data-tenant-id']).toBe('tenant-nycmaid')
    expect(el?.props['data-tenant-sig']).toBe('sig-for-tenant-nycmaid')
  })

  it('renders nothing for a tenant that does not resolve', async () => {
    const el = await ClientErrorMonitor({ slug: 'not-a-real-tenant' })
    expect(el).toBeNull()
  })
})
