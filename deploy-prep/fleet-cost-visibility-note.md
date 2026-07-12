# Fleet Cost Visibility — token / $ burn per worker + fleet total (Q-O5, FOR-JEFF-REVIEW)

**Status:** PROPOSAL / note only. Nothing applied, nothing wired in. Describes how to make per-worker and fleet-total spend observable. The leader decides whether to adopt.

**Author:** W6, branch `p1-w6`, 2026-07-12.

---

## The problem

The fleet runs N workers, each an autonomous `claude -p` loop (`.worker-driver.sh`). Every order is a fresh non-interactive invocation that burns input+output tokens = real money. Today there is **no per-worker or fleet-total accounting** — Jeff cannot answer "which worker cost the most today?" or "what did this whole run cost?" without after-the-fact guessing from the Anthropic console, which is delayed and not attributable per worker.

The cost that matters most is the one nobody's watching: a **wedged or looping worker** (see `invocation-timeout-design.md`) can silently burn tokens on retries. Cost visibility is also the earliest signal of that failure mode.

## What data is actually available

Be honest about the source of truth before designing dashboards:

1. **`claude -p` does not print a token/cost summary by default.** The plain text-output mode used by the driver (`claude -p "..."`) returns only the model's text. So the driver as written captures **no usage numbers**.
2. **`--output-format json` (or `stream-json`) does include usage.** Non-interactive Claude Code emits a result envelope with `usage` (input/output/cache tokens) and, in current versions, a `total_cost_usd` field. **This is the clean, authoritative per-invocation source** and the one to build on. Version-dependent — verify the exact field names against the installed `claude` (`/Users/jefftucker/.local/bin/claude`) before parsing; do not hardcode a schema from memory.
3. **Anthropic Console / usage API** is the billing-truth backstop but is account-wide and delayed — good for reconciliation, not for live per-worker attribution.

**Recommendation: derive per-invocation cost from `--output-format json`'s usage/cost fields.** Anything else (estimating from prompt length, char-counting the log) is a guess and should be labeled as one.

## Design

### Per-worker: log usage per invocation

Have each driver capture the JSON result, extract usage, append one line to a per-worker ledger. Sketch (design only — not applied to the live driver):

```bash
COST_LEDGER=/tmp/fleet-cost-$ID.jsonl
# Invoke in JSON mode instead of plain text:
RESULT=$(claude -p "$PROMPT" --permission-mode acceptEdits --output-format json 2>&1)
# Extract the model's text for the existing report path:
OUT=$(printf '%s' "$RESULT" | jq -r '.result // .text // empty' 2>/dev/null)
# Append a cost record (fields: verify names against installed claude):
printf '%s' "$RESULT" | jq -c --arg id "$ID" --arg ts "$(date +%s)" '{
  worker: $id, ts: ($ts|tonumber),
  in:  (.usage.input_tokens // 0),
  out: (.usage.output_tokens // 0),
  cache_read: (.usage.cache_read_input_tokens // 0),
  usd: (.total_cost_usd // null)
}' >> "$COST_LEDGER" 2>/dev/null
```

Notes / caveats:
- Switching the driver to `--output-format json` is a **real behavior change** to `.worker-driver.sh` (the existing code greps `$OUT` text and appends the last non-empty line to the channel). It must be paired with a `jq` extract of the text so the report path still works. That's why this is a proposal, not a silent edit — it touches a live fleet script.
- Requires `jq` on the host — verify (`command -v jq`) before adopting. If absent, a `grep`/`sed` extract of the JSON is brittle; prefer installing `jq`.
- If `total_cost_usd` is not present in the installed version, compute USD from tokens × the model's published per-token rates held in one constants block (so a price change is a one-line edit). Label computed USD as **estimated**, not billed.

### Fleet total: aggregate the ledgers

A tiny read-only roll-up over all per-worker ledgers — no writes, safe to run anytime:

```bash
# fleet-cost-report.sh (read-only aggregator)
for f in /tmp/fleet-cost-*.jsonl; do cat "$f"; done | jq -s '
  group_by(.worker) | map({
    worker: .[0].worker,
    invocations: length,
    in_tokens:  (map(.in)  | add),
    out_tokens: (map(.out) | add),
    usd: (map(.usd // 0) | add)
  })
  | { per_worker: ., fleet_total_usd: (map(.usd) | add),
      fleet_total_tokens: (map(.in_tokens + .out_tokens) | add) }'
```

Output is per-worker rows + a fleet total. Run on demand, or on an interval, or append a one-line summary to the LEADER channel so cost rides alongside status. Optionally add a per-worker or fleet **budget threshold** that emits a WARN line when crossed — the cheapest early-warning for a runaway/looping worker.

## Minimal first step (lowest risk)

If changing the driver's output format feels too invasive right now, the **zero-driver-change** interim is: nothing reliable. Plain-text mode carries no usage data, so any "cost" derived from the current logs is a fabricated estimate. The honest minimum viable change **is** switching to `--output-format json` + a `jq` extract. There is no accurate cost view without capturing usage at invocation time. State that plainly rather than shipping a fake number.

## Verification done / not done

- **Nothing run.** No driver modified, no aggregator executed.
- **Not verified on host:** the exact `usage` / `total_cost_usd` field names emitted by the installed `claude` version, and whether `jq` is present. Both must be confirmed before adoption — the `jq` filters above assume field names that are version-dependent and are explicitly flagged as verify-first.
- Confirmed: the current `.worker-driver.sh` uses plain `claude -p "..."` (no `--output-format`), so it captures **zero** usage data today. That's the gap this note closes.

## Relationship to other fleet docs

- Pairs with `invocation-timeout-design.md`: cost spikes are an early symptom of a hung/looping worker; a per-worker budget WARN and the heartbeat check catch overlapping failure modes.
- Independent of the duplicate-driver (`atomic-queue-claim-design.md`) and respawn (`fleet-supervisor-note.md`) work.
