// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import type { WalkthroughStep } from '@/app/site/nyc-classifieds/_lib/walkthrough'

interface Props {
  step: WalkthroughStep
  onNext: () => void
  onSkip: () => void
  totalSteps: number
}

interface Position {
  top: number
  left: number
  arrowLeft: number
  spotlight: { top: number; left: number; width: number; height: number }
}

export default function WalkthroughTooltip({ step, onNext, onSkip, totalSteps }: Props) {
  const [pos, setPos] = useState<Position | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const reposition = useCallback(() => {
    const mobile = window.innerWidth < 640
    setIsMobile(mobile)

    const el = document.querySelector(`[data-walkthrough="${step.target}"]`)
    if (!el) { setPos(null); return }
    const rect = el.getBoundingClientRect()
    const pad = 6
    const tooltipWidth = mobile ? window.innerWidth - 32 : 340

    const spotlight = {
      top: rect.top + window.scrollY - pad,
      left: rect.left + window.scrollX - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    }

    // Place below target
    const top = rect.bottom + window.scrollY + 14
    let left = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2

    // Clamp so tooltip stays on screen
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))

    const arrowLeft = Math.max(20, Math.min(
      rect.left + window.scrollX + rect.width / 2 - left,
      tooltipWidth - 20,
    ))

    setPos({ top, left, arrowLeft, spotlight })
  }, [step.target])

  useEffect(() => {
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [reposition])

  // Scroll target into view
  useEffect(() => {
    const el = document.querySelector(`[data-walkthrough="${step.target}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [step.target])

  // Escape key dismisses
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSkip])

  if (!pos) return null

  const tooltipWidth = isMobile ? window.innerWidth - 32 : 340

  // Step progress dots
  const dots = []
  for (let i = 1; i <= totalSteps; i++) {
    dots.push(
      <span
        key={i}
        style={{
          width: i === step.id ? '18px' : '6px',
          height: '6px',
          borderRadius: '3px',
          backgroundColor: i === step.id ? '#1a56db' : '#d1d5db',
          transition: 'all 0.2s ease',
        }}
      />
    )
  }

  return (
    <>
      {/* Full-screen dark overlay */}
      <div
        onClick={onSkip}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          zIndex: 9999,
        }}
      />

      {/* Spotlight cutout */}
      <div
        style={{
          position: 'absolute',
          top: pos.spotlight.top,
          left: pos.spotlight.left,
          width: pos.spotlight.width,
          height: pos.spotlight.height,
          borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip card */}
      <div
        role="dialog"
        aria-label={step.title}
        style={{
          position: 'absolute',
          top: pos.top,
          left: pos.left,
          width: tooltipWidth,
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
          padding: isMobile ? '20px 18px 16px' : '22px 24px 18px',
          zIndex: 10001,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Arrow */}
        <div style={{
          position: 'absolute',
          top: '-7px',
          left: pos.arrowLeft,
          width: '14px',
          height: '14px',
          backgroundColor: '#ffffff',
          transform: 'rotate(45deg)',
          borderRadius: '2px',
        }} />

        {/* Title */}
        <div style={{
          fontSize: isMobile ? '0.9375rem' : '1rem',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '6px',
          lineHeight: 1.3,
        }}>
          {step.title}
        </div>

        {/* Body */}
        <div style={{
          fontSize: isMobile ? '0.8125rem' : '0.875rem',
          color: '#4b5563',
          lineHeight: 1.55,
          marginBottom: '18px',
        }}>
          {step.body}
        </div>

        {/* Footer: dots left, buttons right */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {dots}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={onSkip}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                padding: '10px 12px',
                minHeight: '44px',
                minWidth: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              Skip
            </button>

            {step.advanceOn === 'manual' && (
              <button
                onClick={onNext}
                style={{
                  backgroundColor: '#1a56db',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 22px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '-0.01em',
                }}
              >
                {step.buttonLabel || 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
