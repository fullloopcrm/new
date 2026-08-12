'use client'

import { usePortalAuth } from '../portal-auth'
import PortalChatWidget from '../PortalChatWidget'

// Was previously wired to /api/portal/connect (connect_channels — a separate
// system that never surfaces in ComHub). Replaced with the same ComHub-backed
// chat used as the sitewide floating widget, embedded full-page here so the
// bottom-nav "Chat" tab actually lands somewhere ComHub sees.
export default function PortalConnectPage() {
  const { auth, t } = usePortalAuth()

  if (!auth) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        {t('Please log in to chat.', 'Inicia sesión para chatear.')}
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-16" style={{ height: 'calc(100vh - 180px)' }}>
      <PortalChatWidget embedded />
    </div>
  )
}
