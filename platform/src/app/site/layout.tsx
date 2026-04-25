// Passthrough layout. Each tenant subtree at /site/<slug>/ provides its own
// marketing chrome (nav, footer, fonts, analytics). Keeping this layer empty
// prevents double-rendering of nav/footer when a tenant's own layout runs.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
