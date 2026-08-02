// Passthrough layout. Each tenant subtree at /site/<slug>/ provides its own
// marketing chrome (nav, footer, fonts, analytics). Keeping this layer empty
// prevents double-rendering of nav/footer when a tenant's own layout runs.
//
// GlobalSiteChatWidget is the one deliberate exception: it's mounted here,
// not per-tenant, so every tenant site gets the floating ComHub web-chatbot
// automatically. It resolves its own branding at runtime (/api/tenant/public)
// instead of being hardcoded, so this single instance is correct for all of
// them. Tenants with their own hero-embedded chat (e.g. the-florida-maid)
// keep that separately in their own layout/page — this is only the floating
// launcher.
import GlobalSiteChatWidget from '@/components/comhub/GlobalSiteChatWidget'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GlobalSiteChatWidget />
    </>
  )
}
