'use client'
import { useEffect, useState } from 'react'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}

export default function SidePanel({ open, onClose, title, children, width = 'max-w-md' }: SidePanelProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10000]" onClick={onClose}>
      <div className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />
      <div
        className={`absolute right-0 top-0 h-full w-full ${width} bg-white shadow-xl transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 65px)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
