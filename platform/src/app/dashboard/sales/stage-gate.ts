// Split out of page.tsx — Next.js page files may only export a default
// component (and a few config values), so nextStageOptions can't live there
// and stay directly unit-testable.
export type Stage = 'new' | 'qualifying' | 'quoted' | 'pending' | 'sold' | 'lost'

// Forward-only pipeline order (excludes the terminal 'lost' branch).
const STAGE_ORDER: Stage[] = ['new', 'qualifying', 'quoted', 'pending', 'sold']

// A deal can only move to its immediate next stage, back to Lost from any
// open stage, or reopened to Lead from Lost — never skip a stage (e.g. Lead
// straight to Quote, bypassing Qualify).
export function nextStageOptions(stage: string): Stage[] {
  if (stage === 'lost') return ['new']
  const idx = STAGE_ORDER.indexOf(stage as Stage)
  const forward = idx > -1 && idx < STAGE_ORDER.length - 1 ? [STAGE_ORDER[idx + 1]] : []
  return stage === 'sold' ? forward : [...forward, 'lost']
}
