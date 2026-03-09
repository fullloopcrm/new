import { vi } from 'vitest'

// Mock Supabase client
export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
}

// Mock tenant context
export const mockTenantContext = {
  userId: 'user_test123',
  tenantId: '550e8400-e29b-41d4-a716-446655440000',
  tenant: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Business',
    slug: 'test-business',
    status: 'active',
  },
  role: 'owner',
}

// Helper to create mock Request
export function createMockRequest(options: {
  method?: string
  body?: Record<string, unknown>
  headers?: Record<string, string>
  searchParams?: Record<string, string>
} = {}) {
  const url = new URL('http://localhost:3000/api/test')
  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value)
    }
  }

  return new Request(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...(options.body && { body: JSON.stringify(options.body) }),
  })
}
