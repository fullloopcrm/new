import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { getCurrentTenant, isImpersonating } from '@/lib/tenant'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { verifyAdminToken, verifyTenantAdminToken } from '@/app/api/admin-auth/route'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import ImpersonationBanner from './impersonation-banner'
import DashboardShell from './dashboard-shell'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'hi@fullloopcrm.com'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // On a tenant custom domain, /admin is rewritten to /dashboard and the
  // tenant is resolved from the signed header — NOT from Clerk or an
  // impersonation cookie, so middleware's auth.protect() never ran. Without
  // this gate the tenant's entire CRM (clients, finance, bookings) would be
  // publicly readable. Accept EITHER the global super-admin token (Jeff, any
  // tenant) OR a per-tenant member token minted for THIS tenant (login at
  // <domain>/fullloop with the member's own PIN).
  const hdrs = await headers()
  const hdrTenantId = hdrs.get('x-tenant-id')
  const onTenantDomain = !!hdrTenantId && verifyTenantHeaderSig(hdrTenantId, hdrs.get('x-tenant-sig'))
  if (onTenantDomain) {
    const adminToken = (await cookies()).get('admin_token')?.value
    const ok = !!adminToken && (verifyAdminToken(adminToken) || !!verifyTenantAdminToken(adminToken, hdrTenantId!))
    if (!ok) {
      redirect('/fullloop')
    }
  }

  const tenant = await getCurrentTenant()

  if (!tenant) {
    try {
      const { userId } = await auth()
      if (userId && SUPER_ADMIN_IDS.includes(userId)) {
        redirect('/admin')
      }
    } catch {
      // auth() may fail during admin PIN impersonation — that's ok
    }
    redirect('/onboarding')
  }

  const impersonating = await isImpersonating()

  // Check if this is admin PIN impersonation (vs Clerk super admin)
  const cookieStore = await (await import('next/headers')).cookies()
  const isAdminImpersonation = impersonating && !!cookieStore.get('admin_token')?.value

  // Track login activity (only for real users, not impersonation)
  if (!impersonating) {
    const lastActive = tenant.last_active_at ? new Date(tenant.last_active_at).getTime() : 0
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    if (lastActive < oneHourAgo) {
      supabaseAdmin
        .from('tenants')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', tenant.id)
        .then(() => {})

      sendEmail({
        to: ADMIN_EMAIL,
        subject: `[FL] ${tenant.name} just logged in`,
        html: `<p><strong>${tenant.name}</strong> (${tenant.industry}) started a new session.</p><p>Last active: ${tenant.last_active_at ? new Date(tenant.last_active_at).toLocaleString() : 'First login'}</p>`,
      }).catch(() => {})
    }
  }

  return (
    <DashboardShell
      tenantName={tenant.name}
      primaryColor={tenant.primary_color}
      impersonationBanner={impersonating ? <ImpersonationBanner tenantName={tenant.name} /> : null}
      isAdminImpersonation={isAdminImpersonation}
    >
      {children}
    </DashboardShell>
  )
}
