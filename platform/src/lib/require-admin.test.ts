import { describe, it, expect, vi, beforeEach } from 'vitest'

const getMock = vi.fn()
const verifyAdminTokenMock = vi.fn()

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (...args: unknown[]) => getMock(...args) }),
}))
vi.mock('@/app/api/admin-auth/route', () => ({
  verifyAdminToken: (...args: unknown[]) => verifyAdminTokenMock(...args),
}))

import { requireAdmin } from './require-admin'

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a 401 response when no admin_token cookie is present', async () => {
    getMock.mockReturnValue(undefined)

    const result = await requireAdmin()

    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
    expect(verifyAdminTokenMock).not.toHaveBeenCalled()
  })

  it('returns a 401 response when the token fails verification', async () => {
    getMock.mockReturnValue({ value: 'bad-token' })
    verifyAdminTokenMock.mockReturnValue(false)

    const result = await requireAdmin()

    expect(verifyAdminTokenMock).toHaveBeenCalledWith('bad-token')
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
  })

  it('returns null (authorized) when the token verifies', async () => {
    getMock.mockReturnValue({ value: 'good-token' })
    verifyAdminTokenMock.mockReturnValue(true)

    const result = await requireAdmin()

    expect(result).toBeNull()
  })

  it('reads the token from the admin_token cookie specifically', async () => {
    getMock.mockReturnValue({ value: 'good-token' })
    verifyAdminTokenMock.mockReturnValue(true)

    await requireAdmin()

    expect(getMock).toHaveBeenCalledWith('admin_token')
  })
})
