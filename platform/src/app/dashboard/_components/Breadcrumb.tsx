import Link from 'next/link'

/**
 * Breadcrumb trail — every intermediate segment links back, the last one
 * (the current page) is plain text. Reusable across any dashboard sub-page.
 */
export default function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <div className="text-xs text-slate-500" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>←</span>
      {items.map((item, idx) => (
        <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.href ? (
            <Link href={item.href} className="hover:underline">{item.label}</Link>
          ) : (
            <span>{item.label}</span>
          )}
          {idx < items.length - 1 && <span>/</span>}
        </span>
      ))}
    </div>
  )
}
