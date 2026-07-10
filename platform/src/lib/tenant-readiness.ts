/**
 * Tenant readiness — Stage 0, READ-ONLY.
 *
 * Derives "how ready is this tenant to go live?" from the canonical profile
 * plus the existing lead→review smoke gate, instead of a hand-toggled 11-section
 * checklist. Two design deltas from the 100x simulation are baked in here:
 *
 *   delta 1 (funnel-aware): the schedule / payment / review spine stages do NOT
 *     apply to a `lead_only` tenant. Today runOnboardingGate always checks them,
 *     which is why 11% of simulated lead_only tenants could never reach live.
 *     Stage 0 only REPORTS this correctly; the activation gate itself is patched
 *     in a later stage (a write-path change, out of read-only scope).
 *
 *   delta 2 (forcing function): launch-critical fields that are empty are
 *     surfaced as explicit blockers, so a tenant can't silently launch generic.
 *
 * No writes, no side effects. Safe to run against live tenants.
 */
import {
  getTenantProfile,
  appliesToFunnel,
  type FunnelMode,
  type ProfileSection,
  type TenantProfile,
} from './tenant-profile'
import { runOnboardingGate, type GateStage } from './onboarding-gate'

/** Gate stages that only matter for tenants that actually book/charge/review. */
const SPINE_STAGES_BY_FUNNEL: Record<FunnelMode, GateStage['stage'][]> = {
  booking: ['site', 'lead', 'schedule', 'payment', 'review'],
  pipeline: ['site', 'lead', 'schedule', 'payment', 'review'],
  lead_only: ['site', 'lead'], // capture only — no schedule/payment/review
}

export interface SectionReadiness {
  section: ProfileSection
  filled: number
  applicable: number
  missingCritical: string[]
}

export interface TenantReadiness {
  tenantId: string
  name: string
  slug: string
  status: string
  funnel: FunnelMode
  completeness: { filled: number; applicable: number; pct: number }
  sections: SectionReadiness[]
  /** Empty launch-critical fields (funnel-applicable) — the forcing function. */
  launchBlockers: string[]
  /** Gate stages that apply to this funnel, with pass/fail + detail. */
  spine: Array<{ stage: string; ok: boolean; detail: string; applicable: boolean }>
  /** All applicable critical fields filled AND all applicable spine stages pass. */
  canLaunch: boolean
}

export async function computeReadiness(tenantId: string): Promise<TenantReadiness | null> {
  const profile = await getTenantProfile(tenantId)
  if (!profile) return null

  const applicableFields = profile.fields.filter((f) => appliesToFunnel(f, profile.funnel))
  const filled = applicableFields.filter((f) => f.filled).length
  const applicable = applicableFields.length

  // Per-section rollup.
  const sectionMap = new Map<ProfileSection, SectionReadiness>()
  for (const f of applicableFields) {
    const sec = sectionMap.get(f.section) || { section: f.section, filled: 0, applicable: 0, missingCritical: [] }
    sec.applicable += 1
    if (f.filled) sec.filled += 1
    else if (f.tier === 'critical') sec.missingCritical.push(f.label)
    sectionMap.set(f.section, sec)
  }

  const launchBlockers = applicableFields
    .filter((f) => f.tier === 'critical' && !f.filled)
    .map((f) => f.label)

  // Funnel-aware spine (delta 1).
  const gate = await runOnboardingGate(tenantId)
  const applicableStages = new Set(SPINE_STAGES_BY_FUNNEL[profile.funnel])
  const spine = gate.stages.map((st) => ({
    stage: st.stage,
    ok: st.ok,
    detail: st.detail,
    applicable: applicableStages.has(st.stage),
  }))

  const spinePasses = spine.filter((st) => st.applicable).every((st) => st.ok)
  const canLaunch = launchBlockers.length === 0 && spinePasses

  return {
    tenantId,
    name: profile.name,
    slug: profile.slug,
    status: profile.status,
    funnel: profile.funnel,
    completeness: {
      filled,
      applicable,
      pct: applicable > 0 ? Math.round((filled / applicable) * 100) : 0,
    },
    sections: [...sectionMap.values()].sort((a, b) => a.section.localeCompare(b.section)),
    launchBlockers,
    spine,
    canLaunch,
  }
}

/** Convenience for the audit: readiness for a batch of tenants (sequential — kind to prod). */
export async function computeReadinessBatch(
  tenants: Array<{ id: string }>,
): Promise<TenantReadiness[]> {
  const out: TenantReadiness[] = []
  for (const t of tenants) {
    const r = await computeReadiness(t.id)
    if (r) out.push(r)
  }
  return out
}

// Re-export for callers that map over profile shapes.
export type { TenantProfile }
