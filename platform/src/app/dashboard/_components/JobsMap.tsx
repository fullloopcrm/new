'use client'
import dynamic from 'next/dynamic'

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)', mono: 'var(--mono)',
}

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), {
  ssr: false,
  loading: () => <div style={{ height: 400, background: V.canvas, border: `1px solid ${V.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: V.muted }}>Loading map…</div>,
})

export interface MapJob {
  id: string
  start_time: string
  status: string
  service_type: string | null
  cleaner_id: string | null
  clients: { name: string; address: string } | null
  team_members: { name: string } | null
}

export default function JobsMap({ jobs }: { jobs: MapJob[] }) {
  const Bar = (
    <div className="inline-block mb-3" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>Jobs · Map</div>
  )
  return (
    <div className="mb-8">
      {Bar}
      <div style={{ border: `1px solid ${V.line}` }}>
        {/* DashboardMap maps `cleaners(name)`; our rows carry `team_members(name)` — alias it. */}
        <DashboardMap jobs={jobs.map(j => ({ ...j, cleaners: j.team_members })) as never} />
      </div>
    </div>
  )
}
