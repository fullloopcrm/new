import { describe, it, expect } from 'vitest'
import { safeTenantId } from './core'

/**
 * safeTenantId() backs every tenant-scoped query in this file (19 call
 * sites, incl. the askSelena main entry point that resolves tid for every
 * inbound SMS/web/email message). Before this fix, each site inlined
 * `(convo as {...}).tenant_id || NYCMAID_TENANT_ID` directly against a
 * `.single()` result with `error` never destructured — a genuine transient
 * DB failure resolving a conversation's tenant_id was indistinguishable
 * from "legacy row, no tenant_id column set yet", and BOTH silently
 * resolved to NYCMAID_TENANT_ID. That fallback is intentional for the
 * legacy case (see the comment on NYCMAID_TENANT_ID), but a DB blip
 * reassigning an unrelated tenant's conversation to NYCMAID for the
 * duration of that request — using NYCMAID's Anthropic key and exposing
 * NYCMAID's client/booking data to a message that was never theirs — is a
 * cross-tenant leak, not graceful degradation. Fixed to fail loud (throw)
 * on a real query error, preserving the legacy-row fallback only for the
 * genuine no-error/no-tenant_id case.
 */

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

describe('safeTenantId — wrong-tenant / masked-error PROBEs', () => {
  it('MASKED-ERROR PROBE: a real DB error throws instead of silently resolving to NYCMAID', () => {
    expect(() => safeTenantId(null, { message: 'upstream connect error' }, 'probe')).toThrow(/tenant_id lookup failed/)
  })

  it('MASKED-ERROR PROBE: a DB error is never swallowed even if a stale row is also present', () => {
    // Mirrors a race where a row was fetched but the driver still reports
    // a transport-level error alongside it — must not trust the row.
    expect(() =>
      safeTenantId({ tenant_id: 'some-other-tenant' }, { message: 'connection reset' }, 'probe'),
    ).toThrow(/tenant_id lookup failed/)
  })

  it('a genuinely-present tenant_id is returned as-is (not overridden by the NYCMAID fallback)', () => {
    expect(safeTenantId({ tenant_id: 'real-tenant-42' }, null, 'probe')).toBe('real-tenant-42')
  })

  it('legacy fallback preserved: no row + no error still resolves to NYCMAID (documented, intentional)', () => {
    expect(safeTenantId(null, null, 'probe')).toBe(NYCMAID_TENANT_ID)
  })

  it('legacy fallback preserved: a row that exists but has no tenant_id column set still resolves to NYCMAID', () => {
    expect(safeTenantId({}, null, 'probe')).toBe(NYCMAID_TENANT_ID)
  })
})
