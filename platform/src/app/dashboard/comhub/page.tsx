import ComHub from '@/app/admin/comhub/page'

/**
 * Operator-facing ComHub. Reuses the same ComHub surface as the platform-admin
 * route — one UI, edited once. The API is tenant-scoped (getCurrentTenantId), so
 * it shows THIS tenant's threads/channels/voice, driven by the tenant profile's
 * own Telnyx / email credentials.
 */
export default function DashboardComHubPage() {
  return <ComHub />
}
