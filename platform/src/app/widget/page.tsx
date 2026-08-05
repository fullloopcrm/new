import GlobalSiteChatWidget from '@/components/comhub/GlobalSiteChatWidget'

// Chromeless page meant to be iframed by external sites (the SEO satellite
// microsites — see their embed script) that can't mount a React component
// directly. Renders nothing but the floating ComHub widget itself; the
// iframe's own requests are same-origin here, so they get the tenant
// header the widget needs via the main-host allowlist in middleware.ts.
export const metadata = {
  robots: { index: false, follow: false },
}

export default function WidgetPage() {
  return (
    <>
      <style>{`html, body { background: transparent !important; margin: 0; padding: 0; }`}</style>
      <GlobalSiteChatWidget />
    </>
  )
}
