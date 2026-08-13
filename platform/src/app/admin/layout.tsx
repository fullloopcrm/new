import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyAdminToken } from '@/app/api/admin-auth/route'
import { supabaseAdmin } from '@/lib/supabase'
import AdminLogout from './AdminLogout'
import TenantChatAlerts from './tenant-chat-alerts'

// Editorial Loop styling for the platform admin. Mirrors /dashboard's
// .loop-scope chrome but uses the admin's own nav structure (super-admin
// view across all tenants).

type Sub = { letter: string; label: string; href: string }
type Section = {
  num: string
  label: string
  href: string
  fold: string
  subs: Sub[]
}

const navMain: Section[] = [
  { num: '00', label: 'Overview', href: '/admin', fold: 'overview', subs: [] },
  { num: '01', label: 'Sales', href: '/admin/sales', fold: 'sales', subs: [] },
  { num: '02', label: 'Tenants', href: '/admin/businesses', fold: 'tenants', subs: [
    { letter: 'a', label: 'Territories', href: '/admin/territories' },
  ] },
  { num: '03', label: 'Tenant Chats', href: '/admin/tenant-chats', fold: 'tenant-chats', subs: [] },
  { num: '04', label: 'ComHub', href: '/admin/comhub', fold: 'comhub', subs: [] },
  { num: '05', label: 'SEO', href: '/admin/seo', fold: 'seo', subs: [] },
  { num: '06', label: 'Company', href: '/admin/company/finance', fold: 'company', subs: [
    { letter: 'a', label: 'Finance', href: '/admin/company/finance' },
    { letter: 'b', label: 'Team', href: '/admin/company/team' },
    { letter: 'c', label: 'Campaigns', href: '/admin/company/campaigns' },
    { letter: 'd', label: 'Analytics', href: '/admin/company/analytics' },
  ] },
  { num: '07', label: 'Task Board', href: '/admin/boards', fold: 'boards', subs: [] },
]

const navPlatform = [
  { label: 'Tenant Health', href: '/admin/tenant-health' },
  { label: 'Feedback', href: '/admin/feedback' },
  { label: 'System Status', href: '/admin/status' },
  { label: 'Activity Log', href: '/admin/activity' },
  { label: 'Monitoring', href: '/admin/monitoring' },
  { label: 'AI Usage', href: '/admin/ai-usage' },
  { label: 'Security', href: '/admin/security' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Legal Tips', href: '/admin/legal-tips' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Docs', href: '/admin/docs' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value

  if (!token || !verifyAdminToken(token)) {
    redirect('/admin-login')
  }

  // Tenants that finished the onboarding questionnaire but haven't been
  // activated yet — clears itself the moment an admin activates the tenant,
  // since that action IS "jumping on it." No separate dismiss/ack needed.
  const { data: awaitingActivation } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('status', 'setup')
    .not('onboarding_completed_at', 'is', null)
    .order('onboarding_completed_at', { ascending: true })

  return (
    <div className="loop-scope min-h-screen flex" style={{ background: 'var(--color-loop-bg)' }}>
      {/* SIDEBAR */}
      <aside
        className="w-60 fixed inset-y-0 left-0 z-40 flex flex-col"
        style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-muted-2)', borderRight: '1px solid #2E2E2E' }}
      >
        {/* Brand */}
        <div className="px-[22px] pt-[22px] pb-1">
          <Link href="/admin" className="flex items-center gap-2" style={{ color: '#F4F4F1' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: '19px', fontWeight: 500, letterSpacing: '-0.025em' }}>Full Loop</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#A8A8A4' }}>CRM</span>
          </Link>
        </div>
        <div className="px-[22px] pb-3" style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          v1.0 - Admin
        </div>

        {/* Always-live link to the current shared site template — a
            permanent "template-preview" tenant (industry: cleaning, no real
            business behind it) kept activated purely so there's always a
            real, up-to-date URL to check template changes against, without
            tying it to any actual tenant's data. */}
        <a
          href="https://template-preview.fullloopcrm.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-[22px] mb-4 flex items-center justify-between gap-2 rounded-md px-2.5 py-2 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          style={{ border: '1px solid #2E2E2E', fontFamily: 'var(--mono)', fontSize: '10.5px', color: '#A8A8A4', letterSpacing: '0.03em' }}
        >
          <span className="flex items-center gap-2">
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: '#4ADE80', boxShadow: '0 0 8px rgba(74,222,128,0.4)' }} />
            Live Template Preview
          </span>
          <span style={{ color: '#5A5A5A' }}>↗</span>
        </a>

        <div className="flex-1 overflow-y-auto pb-20">
          {/* Main */}
          <div className="mx-[22px] mt-[14px] mb-[6px]" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#5A5A5A', fontWeight: 600 }}>
            Platform
          </div>
          {navMain.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className="px-[22px] py-1.5 flex items-center gap-3 transition-colors"
                style={{ fontSize: '13.5px', color: '#A8A8A4' }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#5A5A5A', width: '18px', flexShrink: 0 }}>
                  {item.num}
                </span>
                <span>{item.label}</span>
              </Link>
              {item.subs.map((sub) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className="flex items-center gap-2.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ padding: '4px 22px 4px 44px', fontSize: '12.5px', color: '#888' }}
                >
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: '#555', width: '12px', flexShrink: 0, letterSpacing: '0.04em' }}>
                    {sub.letter}
                  </span>
                  <span>{sub.label}</span>
                </Link>
              ))}
            </div>
          ))}

          {/* Platform group */}
          <div className="mx-[22px] mt-[14px] mb-[6px]" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#5A5A5A', fontWeight: 600 }}>
            System
          </div>
          {navPlatform.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-[22px] py-1.5 flex items-center gap-3"
              style={{ fontSize: '13.5px', color: '#A8A8A4' }}
            >
              <span style={{ width: '18px', flexShrink: 0 }} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-[22px] pt-[14px] pb-[18px]" style={{ background: 'linear-gradient(to top, #1C1C1C 70%, transparent)' }}>
          <div className="flex items-center gap-2 pt-3" style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: '#888', borderTop: '1px solid #2E2E2E', letterSpacing: '0.04em' }}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: '#4ADE80', boxShadow: '0 0 8px rgba(74,222,128,0.4)' }} />
            All systems operational
          </div>
          <div className="mt-2.5">
            <AdminLogout />
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 overflow-y-auto md:ml-60" style={{ background: 'var(--color-loop-bg)' }}>
        {(awaitingActivation || []).length > 0 && (
          <div style={{ background: '#DC2626' }}>
            {(awaitingActivation || []).map((t) => (
              <Link
                key={t.id}
                href={`/admin/businesses/${t.id}`}
                className="flex items-center justify-center gap-2 px-4 py-2 hover:bg-black/10"
                style={{ color: '#fff', fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}
              >
                Tenant onboarding form completed: {t.name}
              </Link>
            ))}
          </div>
        )}
        <div className="px-12 pt-4 pb-24 max-w-[1500px]">
          {/* Topbar — admin label */}
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--color-loop-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Platform Admin · Super-User View
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--color-loop-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' , timeZone: 'America/New_York' })}
            </span>
          </div>
          <div className="pb-3 mb-6" style={{ borderBottom: '1px solid var(--color-loop-ink)' }} />
          {children}
        </div>
      </main>
      <TenantChatAlerts />
    </div>
  )
}
