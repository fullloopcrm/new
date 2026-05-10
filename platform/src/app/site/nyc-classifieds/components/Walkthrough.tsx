// @ts-nocheck
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { STEPS, getStep, setStep, dismiss, incrementVisit, shouldShow } from '@/app/site/nyc-classifieds/_lib/walkthrough'
import WalkthroughTooltip from './WalkthroughTooltip'

export default function Walkthrough() {
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [targetReady, setTargetReady] = useState(false)
  const observerRef = useRef<MutationObserver | null>(null)

  // On mount: check if walkthrough should show, increment visit count
  useEffect(() => {
    const visits = incrementVisit()
    const show = shouldShow()
    const step = getStep()
    console.log('[walkthrough]', { visits, show, step, dismissed: localStorage.getItem('walkthrough_dismissed') })
    if (!show) return
    if (step > STEPS.length) return
    setCurrentStep(step)
  }, [])

  // Watch for the target element to appear in the DOM
  useEffect(() => {
    if (currentStep === null) return

    const stepDef = STEPS.find(s => s.id === currentStep)
    if (!stepDef) return

    const checkTarget = () => {
      const el = document.querySelector(`[data-walkthrough="${stepDef.target}"]`)
      if (el) {
        setTargetReady(true)
        if (observerRef.current) {
          observerRef.current.disconnect()
          observerRef.current = null
        }
        return true
      }
      return false
    }

    // Check immediately
    if (checkTarget()) return

    // Otherwise observe DOM for dynamic element
    setTargetReady(false)
    observerRef.current = new MutationObserver(() => { checkTarget() })
    observerRef.current.observe(document.body, { childList: true, subtree: true })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [currentStep])

  // Listen for CustomEvents that advance event-driven steps
  useEffect(() => {
    if (currentStep === null) return

    const stepDef = STEPS.find(s => s.id === currentStep)
    if (!stepDef || stepDef.advanceOn !== 'event' || !stepDef.event) return

    const eventName = stepDef.event
    const handler = () => { advance() }
    window.addEventListener(eventName, handler)
    return () => window.removeEventListener(eventName, handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  const advance = useCallback(() => {
    if (currentStep === null) return
    const next = currentStep + 1
    if (next > STEPS.length) {
      // Walkthrough complete
      dismiss()
      setCurrentStep(null)
      return
    }
    setStep(next)
    setTargetReady(false)
    setCurrentStep(next)
  }, [currentStep])

  const skip = useCallback(() => {
    dismiss()
    setCurrentStep(null)
  }, [])

  if (currentStep === null || !targetReady) return null

  const stepDef = STEPS.find(s => s.id === currentStep)
  if (!stepDef) return null

  return (
    <WalkthroughTooltip
      step={stepDef}
      onNext={advance}
      onSkip={skip}
      totalSteps={STEPS.length}
    />
  )
}
