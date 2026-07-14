import { describe, it, expect } from 'vitest'
import { beginAuditActor, setAuditActor, getAuditActor } from './audit-context'

/**
 * The whole audit-log design rests on one assumption: an actor resolved
 * inside an awaited helper (getTenantForRequest) is still visible to the
 * CALLER's code that runs after that await returns — because that's exactly
 * how every route handler is shaped:
 *   const { tenantId } = await getTenantForRequest()   // resolves the actor
 *   await supabaseAdmin.from(...).insert(...)          // must still see it
 *
 * A naive "await some stuff, then AsyncLocalStorage.enterWith(actor)" does
 * NOT work for this — verified below (first test), and it's why
 * getTenantForRequest() calls beginAuditActor() synchronously, before its
 * first await, and later calls setAuditActor() to fill in the fields.
 */

describe('a naive late enterWith (what NOT to do)', () => {
  it('does NOT propagate to the caller once real awaits happened first', async () => {
    const { AsyncLocalStorage } = await import('node:async_hooks')
    const storage = new AsyncLocalStorage<{ id: string }>()

    async function resolveLate(id: string) {
      await Promise.resolve() // stands in for cookies()/headers()/DB lookup
      await Promise.resolve()
      storage.enterWith({ id })
    }

    async function caller() {
      await resolveLate('a')
      return storage.getStore()
    }

    expect(await caller()).toBeUndefined()
  })
})

describe('audit-context: beginAuditActor + setAuditActor (the real shape)', () => {
  it('is visible to the caller after the resolving function returns', async () => {
    async function getTenantForRequestSim() {
      beginAuditActor() // must be the first statement, before any await
      await Promise.resolve() // cookies()
      await Promise.resolve() // headers()
      await Promise.resolve() // db lookup
      setAuditActor({
        actorKind: 'clerk_user',
        actorId: 'user-1',
        actorRole: 'staff',
        tenantId: 'tenant-1',
        path: '/api/clients',
        method: 'POST',
        ip: null,
        userAgent: null,
      })
      return { tenantId: 'tenant-1' }
    }

    expect(getAuditActor()).toBeUndefined()
    await getTenantForRequestSim()
    expect(getAuditActor()).toMatchObject({ actorId: 'user-1', tenantId: 'tenant-1' })
  })

  it('returns undefined if the resolver throws before setAuditActor() ever runs', async () => {
    async function getTenantForRequestSim() {
      beginAuditActor()
      await Promise.resolve()
      throw new Error('Unauthorized')
    }

    await expect(getTenantForRequestSim()).rejects.toThrow('Unauthorized')
    expect(getAuditActor()).toBeUndefined()
  })

  it('isolates concurrent "requests" from each other', async () => {
    async function simulateRequest(id: string): Promise<string | undefined> {
      async function getTenantForRequestSim() {
        beginAuditActor()
        await new Promise((r) => setTimeout(r, Math.random() * 5))
        setAuditActor({
          actorKind: 'clerk_user',
          actorId: id,
          actorRole: 'staff',
          tenantId: `tenant-${id}`,
          path: null,
          method: null,
          ip: null,
          userAgent: null,
        })
      }
      await getTenantForRequestSim()
      await new Promise((r) => setTimeout(r, Math.random() * 5))
      return getAuditActor()?.actorId ?? undefined
    }

    const results = await Promise.all(['a', 'b', 'c', 'd', 'e'].map(simulateRequest))
    expect(results).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})
