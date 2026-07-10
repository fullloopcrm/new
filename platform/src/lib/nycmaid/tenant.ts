// The NYC Maid tenant inside FullLoop.
//
// Per Jeff (2026-07-05): the NYC Maid parity copy-over is scoped to THIS tenant
// only — NOT global. Behaviors ported 1:1 from the standalone NYC Maid build
// (~/Desktop/nycmaid) are gated behind `isNycMaid(tenantId)` in shared code so
// the other tenants keep their current behavior untouched. This is a deliberate,
// authorized exception to FullLoop's "everything is global" architecture rule
// for the duration of the NYC Maid cutover.
export const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

export function isNycMaid(tenantId: string | null | undefined): boolean {
  return tenantId === NYCMAID_TENANT_ID
}
