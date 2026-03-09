import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing audit
vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}))

import { audit } from './audit'
import { supabaseAdmin } from './supabase'

describe('audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts an audit log entry', async () => {
    await audit({
      tenantId: 'tenant-123',
      action: 'client.created',
      entityType: 'client',
      entityId: 'client-456',
      details: { name: 'John' },
    })

    expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_logs')
  })

  it('does not throw on error', async () => {
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      insert: vi.fn().mockRejectedValue(new Error('DB error')),
    } as unknown as ReturnType<typeof supabaseAdmin.from>)

    // Should not throw
    await expect(audit({
      tenantId: 'tenant-123',
      action: 'client.created',
      entityType: 'client',
    })).resolves.toBeUndefined()
  })
})
