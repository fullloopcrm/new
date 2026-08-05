import { getCurrentTenantId } from '@/lib/tenant'

// /admin/comhub is reachable directly from the platform-admin nav with no
// tenant impersonated — there's no "which tenant" to pick there, it's meant
// to show Full Loop's OWN inbox (fed by the hub site + SEO satellite chat
// widget). getCurrentTenantId() throwing in that case is what left the page
// spinning forever (unhandled on the client, so it never stopped loading).
// Wraps getCurrentTenantId() itself (impersonation still wins when active)
// and only falls back to the pre-existing "⚙️ System (SEO + Sales Agreements
// — not a real tenant)" row on the throw case. Same tenant id the main-host
// chat widget resolves to — see FULL_LOOP_TENANT in
// api/admin/requests/[id]/agreement/route.ts and HUB_CHAT_TENANT_ID in
// middleware.ts. Deliberately a thin wrapper around getCurrentTenantId()
// rather than a new export off lib/tenant — every /admin/comhub route's
// test mocks that module down to just { getCurrentTenantId }, so any other
// export from it resolves undefined under those mocks.
const FULL_LOOP_SYSTEM_TENANT_ID = '117968d2-24a1-42b5-96bd-7022e4e838ee'

export async function getComhubAdminTenantId(): Promise<string> {
  try {
    return await getCurrentTenantId()
  } catch {
    return FULL_LOOP_SYSTEM_TENANT_ID
  }
}
