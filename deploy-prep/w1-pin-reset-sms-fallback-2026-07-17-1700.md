# W1 — pin-reset SMS-fallback fix + adjacent auth surface sweep — 2026-07-17 17:00

## Fix landed (commit ff0de145)

`POST /api/pin-reset` (`action: 'send_code'`) is the self-service tenant-member
PIN-reset flow: a member proves control of their on-file phone/email, gets a
6-digit code, then sets a new PIN. Delivery tries SMS first, email as
fallback.

The SMS branch read `tenant.telnyx_phone` alone:

```ts
if (member.phone && tenant.telnyx_api_key && tenant.telnyx_phone) { ... }
```

`tenants.sms_number` predates `telnyx_phone` and is still independently
writable via the admin settings API (confirmed via grep — `src/lib/tenant.ts`,
`src/app/api/admin/settings/route.ts`, `admin/businesses/[id]/route.ts` all
still read/write it). `telnyx_phone` is the newer dedicated column. The
correct precedence (`telnyx_phone || sms_number`) is already established
elsewhere in this codebase — confirmed live in `src/lib/jefe/actions.ts`
line 103: `const fromNumber = t.telnyx_phone || t.sms_number || ''`.

Net effect before the fix: a tenant configured only on the legacy
`sms_number` column would silently skip SMS for PIN-reset codes and fall
through to email — or hit a flat 503 ("No phone/email on file to send a
code") if the member requesting the reset only has a phone on file, even
though the tenant genuinely has SMS capability. A locked-out team member
with no email on file would have no way to reset their own login PIN.

Fixed by adding `sms_number` to the tenant select and using
`tenant.telnyx_phone || tenant.sms_number` for both the send-gate and the
`telnyxPhone` param passed to `sendSMS`. Also fixed the response's `via`
field, which reported `'sms'` whenever `member.phone && tenant.telnyx_api_key`
were present regardless of which channel actually delivered the code
(pre-existing since before this fix, same root condition) — now tracks the
actual delivery channel via a `deliveredVia` variable.

3 new tests (`route.sms-fallback.test.ts`): sms_number-only delivery,
telnyx_phone-preferred-when-both-set, and the 503 fallback when neither is
configured and the member has no email. RED-confirmed via `git apply -R` on
the source diff alone (not stash) — pre-fix code returned 503 instead of 200
for the sms_number-only case, for the right reason. tsc clean (same 2
pre-existing baseline errors: admin-auth route type quirk +
sunnyside-clean-nyc's untracked site-nav.ts, both unrelated/untouched). Full
suite 580/580 files, 3149/3150 tests (1 pre-existing expected-fail), was
579/579 3146/3147 — +1 file, +3 tests, 0 regressions. eslint: 2 new warnings
on the new test file's `_args` unused-param pattern, identical class to the
pre-existing warning in `cron/rating-prompt/route.claim-before-send.test.ts`
(confirmed via direct comparison), not a new warning class.

## Scope note — did NOT expand into the wider telnyx_phone sweep

This is one instance of the exact resolver-precedence class W2 already
centralized into `lib/sms-credentials.ts` on their own branch (commits
bdde7111/89b65aa3, not present in this worktree) and applied to the
library-layer call sites (notify.ts, payment-processor.ts, notify-team.ts,
admin-contacts.ts, comms-prefs.ts) plus `jefe/actions.ts`. W2 flagged ~35
remaining direct-API-route call sites for incremental follow-up, and the
leader explicitly logged a hold on that carry-forward list pending Jeff's
answer on a related but distinct compliance question (bookings/batch's
platform-shared-key fallback vs. the other ~40 callers' skip-if-unconfigured
behavior — a 10DLC carrier-registration question).

`pin-reset` was fixed as a standalone, narrowly-scoped instance discovered
independently in this worktree — it only uses the tenant's own two columns
(`telnyx_phone`/`sms_number`), never a platform-shared key, so it does not
touch the compliance question the hold was about. Deliberately did NOT
continue sweeping the other ~60 files that reference `telnyx_phone` in
`src/app/api`/`src/lib` (grep-counted) — that mechanical sweep is W2's
tracked, held lane; duplicating it here risks conflicting fixes across
worktrees at merge time. Flagging this file (pin-reset/route.ts) as already
handled so W2's eventual sweep doesn't need to re-derive it.

## Continuation sweep — adjacent auth/PIN surface, clean

Checked the rest of the PIN-adjacent auth surface for a second finding
before closing out:

- `src/app/api/admin-auth/route.ts` (login: super-admin PIN + per-tenant
  member PIN) — rate-limited 5/15min by IP, constant-time compare on the
  super-admin token, HMAC-hash DB lookup (not per-char compare) for the
  tenant PIN, login-alert notification on success. Clean.
- `src/app/api/admin/users/[id]/pin/route.ts` (admin-set/reset a member's
  PIN) — already carries an owner-escalation guard from a prior session
  (non-owner `settings.edit` holder can't reset the owner's own PIN),
  tenant-scoped via `tenantDb`, per-tenant PIN-uniqueness check. Clean, not
  touched.
- `src/app/api/security/events/route.ts` — `audit.view`-gated, tenant-scoped.
  Clean. (Noticed, not touched: `limit` query param isn't validated as
  numeric before `Math.min`/`.limit()` — `NaN` on non-numeric input. No
  ownership/auth impact, just a robustness nit, not worth a dedicated fix.)
- `src/app/api/unsubscribe/route.ts` — signed-token-required opt-out (SMS
  STOP / email link), tenant+client scoped write, already documents its own
  guard rationale in a header comment from a prior session. Clean.

No second bug found — not manufactured. `member_pin_reset_codes` table has
no other consumer; no cleanup cron exists for expired/used rows, but that's
a storage-growth nit, not a correctness or security issue, not chased.

## tenant_domains schema lane

Reconfirmed intact: 043/055/056/059/068/069 all present, no drift. No
schema/backfill changes this pass.

File-only. No push/deploy/DB.
