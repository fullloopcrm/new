/**
 * Owner-facing label for the worker who performs the job. Intentionally generic
 * and trade-agnostic — every tenant (cleaning included) sees the same neutral
 * "Team member", never a trade-specific noun like "Cleaner". The industry arg is
 * accepted (so the call sites don't need to change) but deliberately ignored.
 */
export interface WorkerLabels {
  singular: string
  plural: string
}

export function workerLabel(_industry?: string | null): WorkerLabels {
  return { singular: 'Team member', plural: 'Team members' }
}
