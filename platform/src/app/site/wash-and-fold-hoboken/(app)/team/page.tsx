'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TeamLoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    document.title = 'Team Login | The NYC Maid'
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/team/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })

    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('cleaner_id', data.cleaner.id)
      localStorage.setItem('cleaner_name', data.cleaner.name)
      router.push('/team/dashboard')
    } else {
      setError('Invalid PIN / PIN inválido')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1E2A4A]">Team Portal / Portal del Equipo</h1>
          <p className="text-gray-600 mt-2">The NYC Maid</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1E2A4A] mb-2">Enter Your PIN / Ingresa Tu PIN</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 text-center text-2xl font-mono border rounded-lg text-[#1E2A4A] tracking-widest"
                placeholder="••••••"
                autoFocus
              />
            </div>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              disabled={pin.length < 4 || loading}
              className="w-full py-3 bg-[#1E2A4A] text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Logging in... / Ingresando...' : 'Login / Iniciar Sesión'}
            </button>
          </form>
        </div>

        {/* Save to Home Screen Tips */}
        <div className="mt-6 bg-[#A8F0DC]/20 rounded-lg p-4 border border-[#A8F0DC]/30">
          <p className="text-[#1E2A4A] font-medium text-sm mb-2">📱 Save for Quick Access / Guardar para Acceso Rápido:</p>
          <ul className="text-[#1E2A4A]/70 text-xs space-y-1">
            <li><strong>iPhone:</strong> Tap Share → &quot;Add to Home Screen&quot; / Toca Compartir → &quot;Agregar a Inicio&quot;</li>
            <li><strong>Android:</strong> Tap Menu (⋮) → &quot;Add to Home Screen&quot; / Toca Menú (⋮) → &quot;Agregar a Inicio&quot;</li>
          </ul>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Questions? / ¿Preguntas? <a href="tel:2122028400" className="text-[#1E2A4A]">(212) 202-8400</a>
        </p>
      </div>
    </div>
  )
}
