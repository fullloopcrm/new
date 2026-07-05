'use client'

import { useState, useEffect } from 'react'

interface NeighborhoodHomeProps {
  boroughSlug: string
  neighborhoodSlug: string
  neighborhoodName: string
  boroughName: string
}

export default function NeighborhoodHome({ boroughSlug, neighborhoodSlug, neighborhoodName, boroughName }: NeighborhoodHomeProps) {
  const [isHome, setIsHome] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  const homeKey = `${boroughSlug}/${neighborhoodSlug}`

  useEffect(() => {
    const saved = localStorage.getItem('home')
    if (saved === homeKey) {
      setIsHome(true)
    } else if (!saved) {
      // No home set yet — show the prompt
      setShowPrompt(true)
    }
  }, [homeKey])

  const saveHome = () => {
    localStorage.setItem('home', homeKey)
    setIsHome(true)
    setShowPrompt(false)
  }

  const clearHome = () => {
    localStorage.removeItem('home')
    setIsHome(false)
    setShowPrompt(true)
  }

  if (isHome) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 0',
        fontSize: '0.875rem',
        fontFamily: "'DM Sans', sans-serif",
        color: '#111827',
      }}>
        <span style={{ color: '#d97706', fontSize: '1rem' }}>&#9733;</span>
        <span>{neighborhoodName}, {boroughName}</span>
        <button
          onClick={clearHome}
          style={{
            color: '#1a56db',
            fontSize: '0.8125rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: 'underline',
          }}
        >
          Change
        </button>
      </div>
    )
  }

  if (showPrompt) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        marginBottom: '8px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontFamily: "'DM Sans', sans-serif",
        color: '#111827',
      }}>
        <span>Make {neighborhoodName} your home neighborhood? Classifieds and Porch will default here.</span>
        <button
          onClick={saveHome}
          style={{
            backgroundColor: '#1a56db',
            color: '#ffffff',
            padding: '4px 14px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.8125rem',
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
          }}
        >
          Yes
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          style={{
            color: '#6b7280',
            fontSize: '0.8125rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Not now
        </button>
      </div>
    )
  }

  return null
}
