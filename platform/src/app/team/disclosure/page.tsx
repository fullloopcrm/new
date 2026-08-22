'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../team-auth'

// Fair Chance / "ban-the-box" compliant criminal history disclosure.
// Shown once, post-offer (portal access already means an offer went out
// via admin approval) — never on the public /apply form. Wording follows
// EEOC guidance: a record does not automatically disqualify, and factors
// considered are the nature of the offense, time passed, and job relevance.
export default function TeamDisclosurePage() {
  const { auth, authLoaded, setAuth, t } = useTeamAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasRecord, setHasRecord] = useState<'yes' | 'no' | ''>('')
  const [explanation, setExplanation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pendingReview, setPendingReview] = useState(false)

  useEffect(() => {
    if (!authLoaded) return
    if (!auth) { router.push('/team/login'); return }
    fetch('/api/team-portal/disclosure', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.disclosed) router.replace('/team')
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [auth, authLoaded, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!auth || !hasRecord) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/team-portal/disclosure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ has_record: hasRecord, explanation }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(t('Something went wrong. Please try again.', 'Algo salió mal. Inténtelo de nuevo.'))
        setSubmitting(false)
        return
      }
      if (data.pendingReview) {
        // A "yes" answer holds them out of the portal pending an admin's
        // individualized review — log out so this session's still-valid
        // token can't keep browsing the portal past this point.
        setPendingReview(true)
        setAuth(null)
        return
      }
      router.replace('/team')
    } catch {
      setError(t('Something went wrong. Please try again.', 'Algo salió mal. Inténtelo de nuevo.'))
      setSubmitting(false)
    }
  }

  if (!authLoaded || checking) {
    return <p className="text-slate-400 text-center py-10">{t('Loading...', 'Cargando...')}</p>
  }

  if (pendingReview) {
    return (
      <div className="text-center px-4 py-10">
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          {t("Thanks — we're reviewing this", 'Gracias — estamos revisando esto')}
        </h1>
        <p className="text-sm text-slate-500">
          {t(
            "Your response is being reviewed. We'll reach out once that's complete before you can access the team portal.",
            'Su respuesta está siendo revisada. Nos pondremos en contacto una vez que esto esté completo antes de que pueda acceder al portal del equipo.',
          )}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-1">
        {t('One More Step', 'Un Paso Más')}
      </h1>
      <p className="text-sm text-slate-500 mb-5">
        {t(
          'This question is asked of every new team member after an offer has been made, as required by fair chance hiring laws.',
          'Esta pregunta se hace a cada nuevo miembro del equipo después de que se ha hecho una oferta, según lo requerido por las leyes de contratación de oportunidad justa.',
        )}
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-xs text-slate-600 leading-relaxed">
        <p className="mb-2">
          {t(
            'A criminal conviction will not automatically disqualify you from employment. We consider the nature of the offense, how much time has passed, and its relevance to the job before making any decision.',
            'Una condena penal no lo descalificará automáticamente para el empleo. Consideramos la naturaleza del delito, cuánto tiempo ha pasado y su relevancia para el trabajo antes de tomar cualquier decisión.',
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t(
              'Have you ever been convicted of a crime?',
              '¿Alguna vez ha sido condenado por un delito?',
            )}
            <span className="text-red-500"> *</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setHasRecord('no')}
              className={`flex-1 border rounded-lg py-2.5 text-sm font-medium ${
                hasRecord === 'no' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-300 text-slate-600'
              }`}
            >
              {t('No', 'No')}
            </button>
            <button
              type="button"
              onClick={() => setHasRecord('yes')}
              className={`flex-1 border rounded-lg py-2.5 text-sm font-medium ${
                hasRecord === 'yes' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-300 text-slate-600'
              }`}
            >
              {t('Yes', 'Sí')}
            </button>
          </div>
        </div>

        {hasRecord === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('Please explain (optional)', 'Por favor explique (opcional)')}
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder={t('Offense, date, and any details you want considered', 'Delito, fecha y cualquier detalle que desee que se considere')}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!hasRecord || submitting}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {submitting ? t('Submitting...', 'Enviando...') : t('Continue', 'Continuar')}
        </button>
      </form>
    </div>
  )
}
