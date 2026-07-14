import { AsyncLocalStorage } from 'node:async_hooks'

// Carries the current request's tenant actor through the async call chain so
// src/lib/supabase.ts can attribute writes without every route threading
// context through by hand. Set by getTenantForRequest() (tenant-query.ts)
// after it resolves who's making the request; read by every subsequent
// supabaseAdmin write in the same request.
//
// IMPORTANT — why this is two functions, not one `setAuditActor(actor)`:
// AsyncLocalStorage.enterWith() only rebinds the context for code that runs
// AFTER it in the same synchronous execution (and whatever that code awaits
// forward from there). getTenantForRequest() can't know the actor until
// after several awaits (cookies(), headers(), a DB lookup) — and calling
// enterWith() that late does NOT propagate back to the ROUTE HANDLER's code
// that runs after `await getTenantForRequest()` returns, because that
// continuation was already scheduled before enterWith() ever ran. Verified
// empirically in audit-context.test.ts (a naive "await stuff, then
// enterWith()" shape loses the context at the caller 100% of the time).
//
// The fix: enterWith() a mutable placeholder object SYNCHRONOUSLY, as the
// very first statement of getTenantForRequest(), before any await. That
// placeholder reference is what propagates to the caller. Once the actor is
// actually known (after the real awaits), setAuditActor() just mutates the
// same object in place — no second enterWith() call needed, so there's no
// second propagation boundary to cross.
export type AuditActorKind = 'pin_admin' | 'clerk_super_admin' | 'tenant_member_pin' | 'clerk_user'

export interface AuditActor {
  actorKind: AuditActorKind | null
  actorId: string | null
  actorRole: string | null
  tenantId: string | null
  path: string | null
  method: string | null
  ip: string | null
  userAgent: string | null
}

const storage = new AsyncLocalStorage<AuditActor>()

function emptyActor(): AuditActor {
  return {
    actorKind: null,
    actorId: null,
    actorRole: null,
    tenantId: null,
    path: null,
    method: null,
    ip: null,
    userAgent: null,
  }
}

// Must be the first statement of the function that will go on to resolve the
// actor — before any `await` in that function. See the module comment above.
export function beginAuditActor(): void {
  storage.enterWith(emptyActor())
}

// Fills in the actor once it's known. Safe to call after any number of
// awaits: it mutates the object already bound by beginAuditActor(), it does
// not re-enter the async context.
export function setAuditActor(fields: Omit<AuditActor, never>): void {
  const store = storage.getStore()
  if (!store) return
  Object.assign(store, fields)
}

// Returns undefined until an actor has actually been resolved (i.e. no-ops
// like beginAuditActor() having been called but the request erroring out
// before setAuditActor() runs never produce a phantom audit row).
export function getAuditActor(): AuditActor | undefined {
  const store = storage.getStore()
  if (!store || !store.actorKind || !store.actorId || !store.tenantId) return undefined
  return store
}
