# W2 gap/fluidity refresh — 2026-07-17 12:36

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-domains-dead-column-noticed27-close-2026-07-17-1222.md`.

Leader's fresh 3-deep queue this round (12:24 LEADER->W2): (1) continue project archetype depth, (2) continue fresh-ground hunting on a new surface, (3) keep gap/fluidity current.

## (1) Fresh-ground — second mirror of the resolver-precedence bug class, in the new SELENA agent

Swept every remaining direct `.domain` read in `src/lib` looking for a NEW surface with the same shape as NOTICED #26's `tenantSiteUrl()` bug (reads `tenants.domain` only, never consults `tenant_domains`). Found it in `src/lib/selena/agent.ts` — the new SELENA persona/brand-override pipeline (`buildPlaybook`/`getAgentConfig`'s neighbor file):

- `buildBrandOverride(tenantId)` builds the "BRAND OVERRIDE" preamble that tells the LLM what domain to quote to a non-nycmaid tenant's customers instead of nycmaid's hardcoded `thenycmaid.com`. It read `tenant.domain` (legacy column) only.
- `applyBrandRewrite(text, tenantId)` is the deterministic post-processing safety net that rewrites any literal `thenycmaid.com` left in an outbound LLM response. Same bug: `if (domain) out = out.replace(/thenycmaid\.com/gi, domain)` silently no-ops when `domain` is falsy.
- `src/lib/selena/agent-config-loader.ts`'s `getAgentConfig()` (used by the same pipeline to build the tenant's portal-link contact info) had the identical gap.

**Blast radius today: zero.** Per the leader's Q4 cutover note, `/api/chat` and `/api/webhooks/telnyx` only route the **nycmaid** tenant to this new agent — every other tenant's live traffic still hits `selena-legacy.ts`/`selena-legacy-email.ts`. And nycmaid's own tenant_id short-circuits both `buildBrandOverride`/`applyBrandRewrite` before any domain resolution runs (`if (tenantId === NYCMAID_TENANT_ID) return`). So this is currently dead code for domain-resolution purposes — same "landmine, not live" shape as the last round's `domains.ts` fix.

**But it's a real landmine**, more severe in kind than the admin-email-link version NOTICED #26 closed: the moment a non-nycmaid tenant whose only domain lives in `tenant_domains` (registered via the `admin/websites` panel, which never touches `tenants.domain`) is cut over to this agent, `applyBrandRewrite()` would silently let the literal WRONG brand domain — `thenycmaid.com` — reach that tenant's own customers in a live chat/SMS/email reply. `buildBrandOverride()` would also instruct the LLM to substitute `"<not configured>"` for the domain slot instead of the tenant's real one.

**Fixed:** both functions now resolve via `getPrimaryTenantDomain()` (`src/lib/domains.ts`, already built + tested for `tenantSiteUrl()`'s fix) first — `tenant_domains` PRIMARY active row, then `tenants.domain`, then a `website_url`-derived fallback — same precedence direction as every other fix this session. `getAgentConfig()` in `agent-config-loader.ts` got the identical treatment. `buildBrandOverride`/`applyBrandRewrite` were previously private (unexported); exported both for direct testability, same pattern already used in this file for `isOwner`/`normalizePhoneDigits`/`buildCtxBlock`.

13 new vitest cases: `agent-config-loader.test.ts` (+4: PRIMARY-wins, tenants.domain fallback, website_url fallback, wrong-tenant probe) and a new `agent.test.ts` (+9: nycmaid short-circuit x2, PRIMARY-wins x2, tenants.domain fallback x2, no-domain-anywhere case, wrong-tenant probe x2, plus a BUG-CLASS PROBE naming the exact live failure mode this fix prevents). Mutation-verified: reverted the `agent.ts`/`agent-config-loader.ts` diff via `git diff` + `git apply -R` (`git stash` disabled, shared `.git` dir across all 4 worker worktrees) — 10 of the 13 new tests went RED for the right reason (all 9 `agent.test.ts` cases via `buildBrandOverride`/`applyBrandRewrite is not a function` once un-exported; `agent-config-loader.test.ts`'s PRIMARY-wins precedence case via the wrong-URL assertion, `legacy-ace.com/portal` instead of `ace.com/portal`). The other 3 new `agent-config-loader.test.ts` cases (tenants.domain fallback, website_url fallback, wrong-tenant probe) passed unchanged even reverted — expected, not a gap: the reverted code never queries `tenant_domains` at all, so those 3 assertions hold identically whether the fix is applied or not; only the PRIMARY-wins case actually exercises the new code path in that file. Reapplied, confirmed all 17 (13 new + 4 pre-existing untouched) GREEN.

## (2) Archetype depth — 5a-51, proving the reverse-lookup precedence against the live schema

Added **5a-51** to `platform/scripts/sim-all-trades.ts` (after 5a-50, before `5b. CHANGE ORDER`). Same shape as 5a-49's `tenantSiteUrl()` probe: seeds a real legacy `tenants.domain` value, confirms fallback: seeds a real active PRIMARY `tenant_domains` row alongside it, confirms it wins; creates a real second tenant with its own PRIMARY `tenant_domains` row and confirms the first tenant's `buildBrandOverride()`/`applyBrandRewrite()` never resolve to the second tenant's domain. Restores both tables' original state and deletes the throwaway second tenant (the run's primary tenant is shared by every later phase).

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-51 (and the still-pending 5a-35 through 5a-50) pass before relying on them.**

## (3) NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-28), plus:

- **#29 (new):** `src/lib/selena-legacy-email.ts`'s `formatHtmlReply()` (the LEGACY email-reply engine's HTML signature builder — currently the one still serving ALL non-nycmaid tenants' AI email replies, per the Q4 note) has the same `tenant.domain`-only read for its footer site-link. Checked call graph before flagging: `handleInboundEmail` (the file's one exported entry point) has **zero callers anywhere in `src`** — grepped every import of `selena-legacy-email`, found only a reference inside `postgrest-injection-routes.test.ts`, no production route or cron wires it up despite the file's own doc comment claiming "the email-monitor cron dispatches per-tenant." So this is itself currently dead/unwired code, same "landmine, not live" shape as this round's fix and last round's `domains.ts` fix — but lower priority than what was just closed, since even if wired up today the worst case is a missing/blank footer link (the code degrades to an empty string, not a wrong-brand leak like the SELENA agent case). Left unfixed this round — flagging as the next natural target if fresh-ground continues down this same sweep.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item #28 (dead neighborhood-attribution feature) still straddles both tracks per last round's note.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, incl. `sim-all-trades.ts`).
- `npx eslint` on all touched/new app files (`agent.ts`, `agent-config-loader.ts`, `agent.test.ts`, `agent-config-loader.test.ts`): 0 new warnings — the 2 warnings surfaced (`agent-config-loader.ts`'s pre-existing unused `industry` var, `agent.ts`'s pre-existing unused `_conversationId` param) both predate this round's diff, confirmed via `git diff` (neither touched line appears in the diff).
- Full suite: 581/581 files, 2529/2529 non-skipped tests passing (37 pre-existing skipped, up from 580/2516 last round — the +13 new test cases across the 2 modified + 1 new test file), zero regressions.
- Fix mutation-verified (see above).
- File-only, no push/deploy/DB write. `sim-all-trades.ts` probe added but not run by me (leader-run-only, per standing convention).

File-only, no push/deploy/DB write from this worker.
