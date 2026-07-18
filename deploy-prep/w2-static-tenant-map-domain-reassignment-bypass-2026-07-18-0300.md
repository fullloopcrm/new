# W2 gap/fluidity refresh — 2026-07-18 03:00

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-admin-websites-legacy-collision-guard-gap-2026-07-18-0245.md`.

Leader's instruction this round (02:52 LEADER->W2): "Good closure and good self-correction... Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: `middleware.ts`'s `STATIC_TENANT_MAP` fallback never consulted the resolver at all — a hardcoded id/slug that could go silently stale on a legitimate domain reassignment

**Bug found:** every other host branch in `middleware.ts` resolves through `getTenantByDomain()` — the hardened tenant_domains-first / tenants.domain-fallback resolver, complete with its TRANSITION ASSERT-AND-REFUSE divergence guard. `STATIC_TENANT_MAP` (two hardcoded entries for `thefloridamaid.com` / `www.thefloridamaid.com`, added 2026-04-25 "used when DB lookup at the edge is unreliable") was the one exception: it matched on the raw host BEFORE any call to `getTenantByDomain`, and on a match, never called it at all — only `getTenantBySlug(staticTenant.slug)` for a status re-check, which resolves by slug, not by domain. A prior re-audit (`w2-tenant-resolution-surface-reaudit-clean-2026-07-17-1524.md`) called this branch "Clean" at a summary level but didn't examine this specific asymmetry.

**Concrete failure mode:** `thefloridamaid.com` is legitimately detached from `the-florida-maid` and reassigned to a different tenant (deliberate migration, or an admin correcting a past mistake) — the DB now genuinely says a different tenant owns this host. Because this branch never asks the DB, it keeps serving the OLD hardcoded tenant (`the-florida-maid`, id `56490a6b-...`) under `thefloridamaid.com` forever, until someone remembers to hand-edit and redeploy this map. This is the identical brand-swap/wrong-tenant failure mode `getTenantByDomain`'s own TRANSITION divergence guard exists to catch — except this branch structurally couldn't trip that guard, because it never entered the resolver at all. Worse than the guard's normal failure mode (refuse to serve, loud log): this one **mis-serves the wrong tenant silently**, no log, no refusal, indefinitely.

**Fixed:** `middleware.ts`'s `STATIC_TENANT_MAP` branch now calls `getTenantByDomain(cleanHost)` first. If the resolver has an answer (found or a live `TENANT_DIVERGENCE` refusal), its answer wins outright — the resolver's tenant is served (status-gated, same as every other path) or the request is refused, exactly as it would be for any other custom domain. The hardcoded map is now used ONLY as the true original fail-open fallback: when the resolver has no row at all for the host (never migrated), or throws a non-divergence error (a transient DB blip) — matching the map's own stated intent ("used when DB lookup ... is unreliable") for the first time, since the prior code used it unconditionally rather than only on lookup failure.

## (2) — swept what (1) opened up: confirmed no other surface bypasses the resolver, no conflict with the resolver-flip smoke fixture

- Grepped for any other hardcoded tenant id/slug map in `src/` (`Record<string, { id: string...`, the hardcoded tenant id itself) — `STATIC_TENANT_MAP` is the only one. `APEX_CANONICAL_DOMAINS` (a `Set<string>` used only for the canonical-www-redirect decision, no tenant identity attached) is a different mechanism and doesn't bypass anything.
- Cross-checked `tenant-resolver-flip.fixture.ts`, which documents `thefloridamaid.com -> the-florida-maid` as a post-deploy smoke expectation sourced from this exact `STATIC_TENANT_MAP`. The fix is consistent with it: a correctly-migrated/configured DB still resolves the same way (resolver agrees with the hardcode), so the opt-in smoke suite (`SMOKE_RUN=1`, skipped in normal `vitest run`) is unaffected either way.
- Nothing else "opens up" from this surface — it was a single self-contained branch fix, not a shared helper with other call sites.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–21, unchanged (see prior rounds' docs for full list, most recently restated in `w2-admin-websites-legacy-collision-guard-gap-2026-07-18-0245.md`).

CLOSED this round:
24. ~~`middleware.ts`'s `STATIC_TENANT_MAP` fallback for `thefloridamaid.com` never consulted `getTenantByDomain`, so a legitimate domain reassignment in the DB would silently keep serving the stale hardcoded tenant forever~~ — fixed above (1): resolver consulted first, hardcoded map now only used as true fail-open fallback (no row / transient error), never overriding a live resolver answer or a `TENANT_DIVERGENCE` refusal.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- `npx eslint src/middleware.ts src/middleware.tenant-routing.test.ts` — 0 errors, 0 warnings.
- `src/middleware.tenant-routing.test.ts` — 31 tests, all passed. Added 3 new tests: WRONG-TENANT PROBE (resolver says a different tenant now owns `thefloridamaid.com` — resolver wins over the stale hardcode), a suspended-tenant variant of the same probe (resolver's status gate applies even though the hardcoded map would have served it), and a `TENANT_DIVERGENCE`-not-swallowed probe (the resolver's own refusal isn't masked by falling through to the hardcoded tenant). Updated 1 existing test whose assertion (`getTenantByDomain` never called for this host) was the literal bug being fixed — now asserts it IS called, and the hardcoded map is used only once that call returns null.
- Ran the middleware + resolver-core suite together (`middleware.tenant-routing`, `middleware.admin-token-verify`, `middleware.secret-echo`, `tenant-lookup`, `tenant`, `domains`) — 6 files, 130 tests, all passed.
- Full repo suite: 702 files, 2990 passed, 37 skipped (pre-existing), 0 failed — net +3 vs. the prior round's 2987, matching the 3 new tests added.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (fix + tests) + 1 docs commit (this file).
