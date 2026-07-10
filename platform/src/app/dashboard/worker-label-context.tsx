'use client'

import { createContext, useContext } from 'react'
import { workerLabel, type WorkerLabels } from '@/lib/worker-label'

const WorkerLabelContext = createContext<WorkerLabels>({ singular: 'Team member', plural: 'Team members' })

/**
 * Provides the tenant's field-worker noun (Cleaner / Driver / Stylist / Tech…)
 * to every dashboard client component. Fed the tenant industry from the server
 * layout so labels are trade-correct without per-component fetching.
 */
export function WorkerLabelProvider({
  industry,
  children,
}: {
  industry?: string | null
  children: React.ReactNode
}) {
  return <WorkerLabelContext.Provider value={workerLabel(industry)}>{children}</WorkerLabelContext.Provider>
}

export function useWorkerLabel(): WorkerLabels {
  return useContext(WorkerLabelContext)
}
