import { describe, it, expect, beforeEach, vi } from 'vitest'

const cookieJar = new Map<string, { value: string }>()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => {
      cookieJar.set(name, { value })
    },
  }),
}))

describe('the-home-services-company admin-auth', () => {
  const OLD_ENV = process.env.ADMIN_PASSWORD

  beforeEach(() => {
    cookieJar.clear()
    process.env.ADMIN_PASSWORD = 'super-secret-admin-password'
    vi.resetModules()
  })

  it('rejects a forged unsigned "authenticated" cookie value', async () => {
    const { isAdminAuthenticated } = await import('./admin-auth')
    cookieJar.set('admin_session', { value: 'authenticated' })
    expect(await isAdminAuthenticated()).toBe(false)
  })

  it('accepts a real session set by setAdminSession()', async () => {
    const { isAdminAuthenticated, setAdminSession } = await import('./admin-auth')
    await setAdminSession()
    expect(await isAdminAuthenticated()).toBe(true)
  })

  it('rejects when ADMIN_PASSWORD is unset (fail closed)', async () => {
    delete process.env.ADMIN_PASSWORD
    const { isAdminAuthenticated } = await import('./admin-auth')
    cookieJar.set('admin_session', { value: 'authenticated' })
    expect(await isAdminAuthenticated()).toBe(false)
    process.env.ADMIN_PASSWORD = OLD_ENV
  })

  it('verifyAdminPassword rejects a wrong password and accepts the right one', async () => {
    const { verifyAdminPassword } = await import('./admin-auth')
    expect(verifyAdminPassword('wrong')).toBe(false)
    expect(verifyAdminPassword('super-secret-admin-password')).toBe(true)
  })
})
