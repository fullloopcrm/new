import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getCurrentTenant, isImpersonating } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import ImpersonationBanner from './impersonation-banner'
import DashboardShell from './dashboard-shell'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'jeff@consortiumnyc.com'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
