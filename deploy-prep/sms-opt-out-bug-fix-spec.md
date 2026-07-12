# SMS opt-out bug fix spec — `send-apology-batch` reads a dead consent column

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Spec only — the route is NOT edited here.**
Ready for review. Confirmed by data-flow analysis of the repo, not by a prod DB read._

## TL;DR

`POST /api/admin/send-apology-batch` gates its opt-out skip on `clients.sms_opt_in`, but **no
code path in the repo ever writes `clients.sms_opt_in`.** The real opt-out signal — written by
the Telnyx `STOP` handler and read by every other send path — is **`clients.sms_consent`**.
Result: a client who texted **STOP** (→ `sms_consent = false`) is **not** skipped by the apology
batch and **gets texted anyway.** That is a consent/TCPA violation on an outbound SMS blast.

The fix is one column rename in two lines. This spec gives the exact change and a RED test that
proves the opted-out client is skipped once the fix lands.

## Evidence (why this is a real bug, not a naming nit)

**Where opt-out is *written* (the truth column is `sms_consent`):**

- `platform/src/app/api/webhooks/telnyx/route.ts:163` — inbound `STOP` →
  `.update({ sms_consent: false })`.
- `platform/src/app/api/webhooks/telnyx/route.ts:225` — inbound `START` →
  `.update({ sms_consent: true })`.
- `platform/src/lib/nycmaid/sms.ts:143` — carrier/`STOP` fallback →
  `clients … .update({ sms_consent: false })`.
- `platform/src/lib/selena/tools.ts:1102` — do-not-contact action →
  `.update({ do_not_service: true, … sms_consent: false })`.

**Where opt-out is *read* correctly (everyone else gates on `sms_consent !== false`):**

- `platform/src/app/api/campaigns/[id]/send/route.ts:108`
- `platform/src/app/api/campaigns/send/route.ts:116`
- `platform/src/app/api/cron/outreach/route.ts:111`
- `platform/src/lib/selena/tools.ts:955,962`

**The one offender (reads `sms_opt_in` instead):**

- `platform/src/app/api/admin/send-apology-batch/route.ts:38` —
  `.select('id, name, phone, do_not_service, sms_opt_in')`
- `platform/src/app/api/admin/send-apology-batch/route.ts:56` —
  `if (c.sms_opt_in === false) { skippedOptOut++; continue }`

**Nothing writes `clients.sms_opt_in` anywhere in `platform/src`.** (Confirm:
`grep -rn "sms_opt_in" platform/src` returns only this route's read, a sibling **display** bug
(below), plus two *unrelated* notification **type strings** — `platform/src/lib/notify.ts:42` and
`webhooks/telnyx/route.ts:230` `type: 'sms_opt_in'` — which are correct as-is and are **not** the
`clients` column.)

**Sibling display bug (same dead column, fix it too):**
`platform/src/app/dashboard/clients/[id]/page.tsx:384` renders
`SMS Opt-in: {client.sms_opt_in ? 'Yes' : 'No'}`. Because `sms_opt_in` is the dead column, the
operator sees **"SMS Opt-in: Yes"** even for a client who texted STOP (`sms_consent = false`) —
the consent UI misreports. Fix: read `client.sms_consent` (and ensure the page's fetch selects
`sms_consent`). Lower severity than the send bug (misleads the operator vs. actually texting an
opted-out client) but the same root cause and worth landing in the same change. The regression
guard `schema-drift-guard.test.ts` lists both sites.

### The failure trace

1. Customer texts **STOP** → webhook sets `clients.sms_consent = false`. `sms_opt_in` is untouched.
2. Operator runs an apology blast including that client.
3. Route selects `sms_opt_in`. Its value is the column default `true` (schema.sql) — or
   `undefined` if the column isn't present in prod. **Either way it is never `=== false`.**
4. The `if (c.sms_opt_in === false)` skip **does not fire.** The opted-out client is texted.

The bug does **not** depend on whether `sms_opt_in` physically exists in prod. If it exists
(`platform/supabase/schema.sql:108` defines it, default `true`) it is a **dead column** no
opt-out path maintains; if it doesn't, the read is `undefined`. In both cases the gate is inert.

## The fix (exact, two lines, do this in the route)

`platform/src/app/api/admin/send-apology-batch/route.ts`

```diff
@@ line 38
-      .select('id, name, phone, do_not_service, sms_opt_in')
+      .select('id, name, phone, do_not_service, sms_consent')
@@ line 56
-      if (c.sms_opt_in === false) { skippedOptOut++; continue }
+      if (c.sms_consent === false) { skippedOptOut++; continue }
```

Sense is unchanged: `sms_consent` is `true`/`NULL` when contactable, `false` after `STOP`, so
`=== false` still means "opted out, skip." This exactly matches the campaigns/outreach paths.

No other line changes. The response field is already named `skipped_opt_out` — leave it; only its
input column changes.

> **Do not** instead add a `sms_opt_in` column or start writing it. That would create a second,
> parallel consent source that the STOP/START webhook does not maintain — the same drift class
> this fix removes. `sms_consent` is the single source of truth (see `schema-drift-register.md`).

## RED test to add with the fix

Add as `platform/src/app/api/admin/send-apology-batch/route.test.ts`. It is **RED against the
current route** (which selects `sms_opt_in`, so `sms_consent` is not even fetched and the STOP'd
client is texted) and **GREEN once the two-line fix lands**. No DB or network — the Supabase
client, `requirePermission`, and `sendSMS` are mocked.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mocks: permission always granted for one tenant ---
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 't1' }, error: null })),
}))

const sendSMS = vi.fn(async () => ({ ok: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...a: unknown[]) => sendSMS(...a) }))

// One opted-out client: texted STOP → sms_consent === false.
// The apology batch MUST skip them. It also has an (irrelevant) sms_opt_in === true,
// which is exactly the trap the buggy route falls into.
const OPTED_OUT_CLIENT = {
  id: 'c1', name: 'Pat Doe', phone: '+15551234567',
  do_not_service: false, sms_consent: false, sms_opt_in: true,
}

// Minimal supabaseAdmin stub. clients.select→in returns the opted-out client;
// tenants.select→single returns telnyx creds so a send WOULD happen if not skipped.
vi.mock('@/lib/supabase', () => {
  const clientsSelect = {
    eq: () => ({ in: async () => ({ data: [OPTED_OUT_CLIENT], error: null }) }),
  }
  const tenantsSelect = {
    eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }, error: null }) }),
  }
  return {
    supabaseAdmin: {
      from: (table: string) => ({
        select: () => (table === 'clients' ? clientsSelect : tenantsSelect),
        update: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }),
      }),
    },
  }
})

import { POST } from './route'

function req(body: unknown): Request {
  return new Request('http://localhost/api/admin/send-apology-batch', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  })
}

describe('send-apology-batch — opt-out enforcement', () => {
  beforeEach(() => sendSMS.mockClear())

  it('does NOT text a client who opted out (sms_consent === false)', async () => {
    const res = await POST(req({ client_ids: ['c1'], credit_pct: 10 }) as never)
    const json = await res.json()

    // The core safety assertion: no SMS was sent to the opted-out client.
    expect(sendSMS).not.toHaveBeenCalled()
    expect(json.sent).toBe(0)
    expect(json.skipped_opt_out).toBe(1)
  })
})
```

**Why it is RED today:** the current route selects `sms_opt_in` (not `sms_consent`), so the
client object it evaluates lacks a `false` consent signal on the column it checks; the skip never
fires; `sendSMS` is called → `expect(sendSMS).not.toHaveBeenCalled()` fails. After the fix the
route reads `sms_consent === false`, skips, and the test passes.

## Verification checklist (for whoever lands the fix)

- [ ] Apply the two-line diff above to the route.
- [ ] Add the test file; `pnpm --dir platform vitest run send-apology-batch` → green.
- [ ] `grep -rn "sms_opt_in" platform/src` → only the two notification-**type** strings remain
      (`notify.ts`, `telnyx/route.ts`); **zero** `clients` column reads.
- [ ] `npx tsc --noEmit` clean.
- [ ] Regression guard `schema-drift-guard.test.ts` (see task c) goes green.

## Honest scope notes

- **Not verified against prod.** This is a repo data-flow finding. It does not require prod
  access to be correct — the write/read column mismatch is in the source. Whether `sms_opt_in`
  physically exists in prod only changes *how* the gate is inert, not *that* it is.
- **This spec does not touch the route** (per the order). Fix + test are proposals, ready for a
  reviewer to apply.
- Cross-ref: `schema-drift-register.md` (`clients.sms_opt_in` → PHANTOM/`sms_consent` CANONICAL),
  `service-role-to-scoped-client-map.md` (this route is a KEEP/admin surface).
