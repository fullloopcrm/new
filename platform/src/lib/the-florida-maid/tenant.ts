// The Florida Maid tenant inside FullLoop.
//
// Mirrors src/lib/nycmaid/tenant.ts's isNycMaid gating pattern so shared code
// can special-case this tenant without touching default/global behavior.
export const THE_FLORIDA_MAID_TENANT_ID = '56490a6b-820c-49e6-8c14-cb4e54ffcb06'

export function isFloridaMaid(tenantId: string | null | undefined): boolean {
  return tenantId === THE_FLORIDA_MAID_TENANT_ID
}
