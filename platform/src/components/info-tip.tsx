'use client'

interface InfoTipProps {
  text: string
}

// Small "?" affordance that shows an explanatory tooltip on hover/focus.
// Self-contained styling (not tied to any page's CSS variables) so it drops
// into any dashboard surface — light or dark — without extra wiring.
export function InfoTip({ text }: InfoTipProps) {
  return (
    <span className="group relative inline-flex items-center align-middle" style={{ marginLeft: 5 }}>
      <button
        type="button"
        aria-label={text}
        className="inline-flex items-center justify-center rounded-full text-[10px] leading-none transition-colors"
        style={{
          width: 14,
          height: 14,
          background: 'rgba(128,128,128,0.18)',
          border: '1px solid rgba(128,128,128,0.4)',
          color: 'inherit',
          opacity: 0.75,
        }}
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[220px] -translate-x-1/2 rounded px-2 py-1.5 text-[11px] leading-snug opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{ background: '#1C1C1C', color: '#F5F5F3', fontFamily: 'system-ui, sans-serif' }}
      >
        {text}
      </span>
    </span>
  )
}
