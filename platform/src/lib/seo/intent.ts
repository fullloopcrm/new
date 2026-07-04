// ---------------------------------------------------------------------------
// Dual-intent classifier — is a search query demand-side (a customer looking
// to buy) or supply-side (a worker looking for a job)?
//
// This is what makes SIGNAL optimize both funnels: customers in AND workers in.
// Heuristic for Phase 1 — refined later with per-tenant term lists and the
// learn loop. Applicant signals are high-precision; everything else defaults to
// customer, since demand-side is the dominant intent on these sites.
// ---------------------------------------------------------------------------
export type Intent = 'customer' | 'applicant' | 'unknown'

const APPLICANT_RE =
  /\b(jobs?|hiring|hire|careers?|apply|application|employ(?:ment|er|ee)?|salary|wages?|hourly|per\s?hour|\/\s?hr|vacanc(?:y|ies)|recruit(?:ing|ment)?|position|work\s+(?:for|at)|now\s+hiring|earn\b)/i

export function classifyIntent(query: string): Intent {
  if (!query || !query.trim()) return 'unknown'
  if (APPLICANT_RE.test(query)) return 'applicant'
  return 'customer'
}
