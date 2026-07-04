# Selena — The Learning / Educating Machine (design)

**Date:** 2026-07-04
**Status:** DESIGN. Nothing here is built yet except the substrate noted below. Multi-week, staged.
**North star (Jeff):** Selena is ONE global core engine. She watches every tenant's agent, learns each business more and more automatically, distills what's generally true, updates the shared core, and every tenant inherits the improvement. A machine that gets measurably smarter over time — per business AND overall.

---

## 0. Definition of "smart" (the non-negotiable)

A learning system that cannot **measure** whether it improved is not learning — it is accumulating text, and accumulated text makes prompts longer, slower, costlier, and *more diluted*. So the first-class citizen of this design is a **scoreboard**, not the memory store.

Rule: **no lesson, skill, or persona change is "kept" until it's tied to an outcome metric that moved (or at least didn't regress).**

---

## 1. What already exists (verified in code, the substrate)

| Primitive | Where | What it does | Limit today |
|---|---|---|---|
| `yinez_memory` | write `core.ts:1572/1781`, `conversation-scorer.ts:269`; read `agent.ts:~571/586`, `core.ts:1222/1856` | closed-loop memory: types `lesson`/`rule`/`instruction`/`issue`/`self_review`; client-scoped + global | **recency-only, capped (10 client / 50 global); global rows NOT tenant-scoped; no relevance ranking** |
| `skills` (yinez_skills) | `tools.ts` (`create_skill`/`update_skill`/`set_skill_active`/`record_skill_use`) | agent authors its own procedures; `hit_count` | no success attribution; active rows auto-load (no relevance gate) |
| `conversation-scorer.ts` | `scoreConversation` + `selfReviewConversation` | rates a convo, writes brutally-honest self-review to memory | fires only on **booking**, nycmaid-centric, per-conversation only (no aggregation) |
| `selena_config` (Persona) | `persona-file.ts` (READ, wired 2026-07-04) | authored personality file, now folded into the prompt | **write side (auto-append from learning) not built** |

**Takeaway:** the *capture → store → read-back* loop physically exists. What's missing is everything that makes it actually get smarter: relevance retrieval, aggregation/distillation, cross-tenant promotion, measurement, and pruning.

---

## 2. Three tiers of knowledge (isolation is a hard wall)

```
CORE knowledge          → agent-general, PII-stripped, applies to ALL tenants.
  (shared preamble,        Promoted from tenant learnings ONLY after human/metric gate.
   core skills library)     Blast radius = everyone. Versioned + rollback.
        ▲ promote (gated)
TENANT knowledge        → this business only (its objections, FAQs, pricing edges,
  (selena_config +         service-area facts, winning phrasings). Grows automatically.
   tenant memory/skills)    Blast radius = one tenant. Never leaks to another.
        ▲ distill (nightly)
CLIENT memory           → this customer only (preferences, history). Ephemeral-ish.
  (yinez_memory/client)    Blast radius = one conversation.
```

**Isolation invariants:**
1. Client memory never crosses clients.
2. Tenant knowledge never crosses tenants. (**Bug today:** global lessons have no `tenant_id` filter — fix before scaling.)
3. Only **abstracted, PII-stripped, agent-general** patterns are eligible to promote to CORE. Raw tenant text never goes to core.

---

## 3. The pipeline

```
CAPTURE → DISTILL → STORE(tier) → RETRIEVE(relevance) → MEASURE → PROMOTE / PRUNE
```

### 3.1 CAPTURE (extend what exists)
- Score + self-review on **every terminal outcome** (booked, abandoned, escalated, resolved, ghosted) — not just booking. All tenants, all channels.
- Store structured signals, not just prose: `{outcome, converted:bool, msgs_to_outcome, objections[], missing_info[], stall_point, what_worked, what_failed}`.

### 3.2 DISTILL (new, scheduled)
- Nightly per-tenant job: cluster the day's reviews → candidate tenant-lessons/skills/persona-appends. Dedup against existing. LLM proposes; nothing auto-applied to core.
- Weekly cross-tenant job: cluster tenant-lessons that recur across ≥N unrelated tenants → candidate CORE promotions (agent-general only).

### 3.3 STORE — retrieval is the unlock (biggest change)
- Add `embedding` (pgvector) + `tags[]` + `tier` + `outcome_stats` to the memory/skills store.
- Retrieval becomes **relevance-ranked, tenant-scoped, budgeted**: given the live conversation, pull top-K by semantic match within (client ∪ tenant ∪ core), not "latest 50." Kills dilution and the token wall simultaneously.

### 3.4 MEASURE (the scoreboard — build FIRST)
- Per tenant + global, tracked over time: conversion rate, escalation rate, avg self-review score, msgs-to-booking, cost/convo.
- Every lesson/skill/persona change is **versioned and tagged**; attribute outcomes to the version that was live. Before/after (or holdback) so "did it help" is answerable.

### 3.5 PROMOTE / PRUNE (the immune system)
- Promote tenant→core only when: recurs across tenants, is agent-general, PII-free, and **gated** (human approve, or metric-proven on a canary tenant first).
- Prune: lessons/skills with no positive attribution after M uses get archived. **Memory is a budget, not a landfill.** Pruning is as important as learning.

---

## 4. The "educating" outputs
1. **Educates herself** — the loop above.
2. **Educates the owner** — weekly per-tenant digest: what customers asked, where deals were lost, what she learned, what she still needs the owner to answer/decide. (Owner-facing, via the admin chat / Jefe.)
3. **Bootstraps new tenants** — a new tenant's Selena starts from the industry-keyed CORE knowledge instead of blank. Day-one competence, then diverges as it learns its own business.

---

## 5. Hard problems (where this lives or dies — no bypassing)
1. **Prompt bloat / cost.** Recency-dump doesn't scale. → relevance retrieval + token budget per tier. (Prereq, not optional.)
2. **Poisoning.** Same-model self-review can be confidently wrong. → confidence scores, dedup, metric gate before anything reaches core; human-in-loop for core.
3. **Tenant isolation / privacy.** → strict `tenant_id` scoping (fix the global-lessons leak first); PII strip on any promotion.
4. **Blast radius.** A core change hits every tenant. → versioning, canary tenant, one-click rollback, changelog.
5. **Human control.** Tenant-learning can be fairly autonomous (contained). Core promotion is **approval-gated** at least until metrics earn trust.

---

## 6. Build order (measurement-first — prove each layer before the next)
1. **Scoreboard + versioning** (no behavior change). You cannot claim "smarter" without it. Also: **fix the global-lessons `tenant_id` leak.**
2. **Relevance retrieval** (pgvector + tags + budget) — replaces recency-dump. Immediate quality + cost win.
3. **Tenant DISTILL loop** — nightly per-tenant → writes tenant knowledge + persona appends (contained blast radius). This is "learns each business auto."
4. **PROMOTE/PRUNE** — the immune system + core promotion (gated).
5. **Educating outputs** — owner digest + new-tenant bootstrap.

Each step is shippable and measurable on its own. If step N doesn't move the scoreboard, we stop and fix before step N+1.

---

## 7. Open decisions for Jeff
- **Autonomy line:** tenant-learning auto-applies (contained) — agreed? Core promotion stays approval-gated until metrics earn trust — agreed?
- **pgvector:** OK to add the extension to the FL Supabase DB (needed for relevance retrieval)?
- **Owner digest channel:** in-app (`/dashboard`), email, or Jefe/Telegram?
- **Canary tenant** for core changes: which tenant is safe to test core promotions on before all-tenant rollout? (Not nycmaid — it's the crown jewel and byte-identical-locked.)
```
```
