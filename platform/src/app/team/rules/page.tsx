'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'

type Announcement = {
  id: string
  title_en: string | null
  title_es: string | null
  body_en: string
  body_es: string | null
  created_at: string
}

export default function TeamRulesPage() {
  const { auth, authLoaded, t } = useTeamAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // authLoaded gates the redirect: auth is null both while the layout's
    // localStorage read is pending AND when truly logged out.
    if (!authLoaded) return
    if (!auth) { router.push('/team/login'); return }
    fetch('/api/team-portal/announcements', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.announcements || []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false))
  }, [auth, authLoaded, router])

  if (!auth) return null

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-slate-800 mb-1">
        {t('Announcements', 'Anuncios')}
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        {t('Team rules and updates from the office', 'Reglas del equipo y actualizaciones de la oficina')}
      </p>

      {loading && (
        <p className="text-center py-12 text-slate-400">{t('Loading...', 'Cargando...')}</p>
      )}

      {!loading && announcements.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-slate-400">
          {t('No announcements yet.', 'Aún no hay anuncios.')}
        </div>
      )}

      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h2 className="font-semibold text-slate-800">
                {t(a.title_en || 'Announcement', a.title_es || 'Anuncio')}
              </h2>
              <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(a.created_at)}</span>
            </div>
            <div className="text-sm text-slate-500 whitespace-pre-line">
              {t(a.body_en, a.body_es || a.body_en)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
