'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'

type GuidelineSection = {
  title_en: string
  title_es: string
  content_en: string
  content_es: string
}

export default function TeamRulesPage() {
  const { auth, t } = useTeamAuth()
  const router = useRouter()
  const [sections, setSections] = useState<GuidelineSection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) { router.push('/team/login'); return }
    fetch('/api/team-portal/guidelines', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => setSections(data.sections || defaultSections))
      .catch(() => setSections(defaultSections))
      .finally(() => setLoading(false))
  }, [auth, router])

  if (!auth) return null

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-slate-800 mb-1">
        {t('Team Guidelines', 'Reglas del Equipo')}
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        {t('Please review and follow these guidelines', 'Por favor revisa y sigue estas reglas')}
      </p>

      {loading && (
        <p className="text-center py-12 text-slate-400">{t('Loading...', 'Cargando...')}</p>
      )}

      <div className="space-y-4">
        {sections.map((section, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-800 mb-2">
              {t(section.title_en, section.title_es)}
            </h2>
            <div className="text-sm text-slate-500 whitespace-pre-line">
              {t(section.content_en, section.content_es)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const defaultSections: GuidelineSection[] = [
  {
    title_en: 'Punctuality',
    title_es: 'Puntualidad',
    content_en: 'Always arrive on time. If you will be late, notify the office immediately.\n\nCheck in using the app when you arrive at the job location.',
    content_es: 'Siempre llega a tiempo. Si vas a llegar tarde, notifica a la oficina inmediatamente.\n\nRegistra tu entrada usando la app cuando llegues al lugar de trabajo.',
  },
  {
    title_en: 'Professionalism',
    title_es: 'Profesionalismo',
    content_en: 'Maintain a professional appearance and attitude at all times.\n\nBe respectful to clients and their property.',
    content_es: 'Mantén una apariencia y actitud profesional en todo momento.\n\nSe respetuoso con los clientes y su propiedad.',
  },
  {
    title_en: 'Communication',
    title_es: 'Comunicacion',
    content_en: 'Keep your phone charged and available during work hours.\n\nReport any issues or concerns to management promptly.',
    content_es: 'Mantén tu teléfono cargado y disponible durante las horas de trabajo.\n\nReporta cualquier problema o inquietud a la gerencia de inmediato.',
  },
  {
    title_en: 'Quality Standards',
    title_es: 'Estándares de Calidad',
    content_en: 'Follow the checklist for each job type.\n\nTake before and after photos when requested.\n\nEnsure client satisfaction before checking out.',
    content_es: 'Sigue la lista de verificación para cada tipo de trabajo.\n\nToma fotos de antes y después cuando se solicite.\n\nAsegura la satisfacción del cliente antes de registrar tu salida.',
  },
]
