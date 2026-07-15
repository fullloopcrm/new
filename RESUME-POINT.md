# RESUME POINT — 2026-07-11 ~21:50 (overnight autonomous)

## READ FIRST, IN ORDER
1. `LEADER-HANDOFF.md` — full 8-section current-state + durable ops reference (ACCESS, roles, screen-driving gotchas).
2. `JEFF-MORNING-QUEUE.md` — the 5 gated decisions (Q1–Q5) awaiting Jeff's yes/no.
3. `PUNCH-LIST.md` (`~/flwork-todo/`) — running tracker + RUNNING% block.
4. `NEW-LEADER-BOOT.md` — if you are a FRESH leader, that is your boot prompt.

## FLEET STATE (verified ~21:50 — RE-VERIFY before you claim it)
- **W1** `p1-w1`@`53a28aee` · driver pid **18355** alive
- **W2** `p1-w2`@`79accdf0` · driver pid **18356** alive (authored this handoff package)
- **W3** `p1-w3`@`d25eb2a0` · driver pid **18357** alive
- **W4** `p1-w4`@`ec6ac63f` · driver pid **18358** alive · **live sub-invocation** finishing `env-var-inventory.md`
- Coordination = `LEADER-CHANNEL.md`. Re-verify: `pgrep -fl "claude -p"` + `ps -p 18355 18356 18357 18358`.

## RUNNING % (authoritative: PUNCH-LIST)
```
DONE 3/133 (2%) · CODE 31/133 (23%) · GATE 23/133 (17%) · OPEN 16/133 (12%) · TODO 59/133 (44%)
```
Nothing from the P1 sprint is in production — DONE stays 3. Overnight work deepens CODE (tracker recompute pending).

## NEXT ACTION (do immediately)
1. **Never-idle check:** dispatch W1 + W3 to next non-gated lanes if they are between orders (candidates in LEADER-HANDOFF §7). W4 finishing env-var doc; W2 free after this commit.
2. **Do NOT** push / deploy / write prod DB / change DNS or env — those are Jeff-gated (Q1–Q5 in the queue). Keep file-only work flowing.
3. **Config-Source-of-Truth (#1) is the top priority** once Jeff clears Q3 — resolver flip is branch-real on p1-w2, shipping it is Q3 Phase B.

## IN-FLIGHT / OPEN THREADS (leader call needed — see LEADER-HANDOFF §3)
- crews `setMembers()` cross-tenant delete (no ownership re-check; no tenant_id col) → needs ownership guard.
- team-portal `messages`/`update-phone` + `client/preferred-cleaner`/`recurring` IDOR (caller-supplied id, no token) → auth change.
- Q4 config dual-shape: provisioning writes `pricing_rows`/`emoji_usage`/`time_estimates{label,hours}`, legacy reads `pricing_tiers`/`emoji`/`time_estimates{size,estimate}` → author BOTH shapes or live agent drops price/emoji/time-est.

## SHIP-READY (awaiting Jeff's gated merge/deploy — Q3)
All WAVE-2 isolation/auth/SEO/migration fixes are branch-real across p1-w1..w4 (+ ADRs, deploy-prep, self-attack GREEN 114/114). `origin/main` = WAVE-1 only. Certify via staged deploy + post-deploy probes; honest ceiling = NOT runtime-verified (live probes blocked, no prod creds in worktrees).
