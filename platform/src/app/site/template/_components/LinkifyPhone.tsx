import { Fragment } from 'react'
import Link from 'next/link'

/**
 * Renders plain body copy (from the long-form content engine, which produces
 * string paragraphs, not JSX) into rich text: markdown-style [text](/path)
 * links become real internal <Link>s, and any occurrence of the tenant's own
 * phone number(s) becomes a real sms: link — in one pass, so the two never
 * collide. Used by LongformArticle (About/FAQ/Pricing/Contact/Careers/Blog)
 * and the Reviews page, the only renderers that turn this content into DOM.
 */
export function linkifyPhones(text: string, phones: { display: string | undefined; digits: string | undefined }[]): React.ReactNode {
  const real = phones.filter((p): p is { display: string; digits: string } => Boolean(p.display && p.digits))

  // Split on markdown links first: [text](/path). Internal paths only (starts
  // with /) — this content never links externally.
  const linkPattern = /\[([^\]]+)\]\((\/[^)]*)\)/g
  const segments: Array<{ text: string } | { linkText: string; href: string }> = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = linkPattern.exec(text))) {
    if (m.index > lastIndex) segments.push({ text: text.slice(lastIndex, m.index) })
    segments.push({ linkText: m[1], href: m[2] })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) })

  const sortedPhones = real.length > 0
    ? [...real].sort((a, b) => b.display.length - a.display.length)
    : []
  const phonePattern = sortedPhones.length > 0
    ? new RegExp(`(${sortedPhones.map((p) => p.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
    : null

  function renderPlainText(plain: string, keyPrefix: string): React.ReactNode {
    if (!phonePattern) return plain
    const parts = plain.split(phonePattern)
    return parts.map((part, i) => {
      const match = sortedPhones.find((p) => p.display === part)
      if (!match) return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
      return (
        <a key={`${keyPrefix}-${i}`} href={`sms:${match.digits}`} className="underline decoration-1 underline-offset-2 hover:text-[var(--brand)]">
          {part}
        </a>
      )
    })
  }

  return segments.map((seg, i) =>
    'href' in seg ? (
      <Link key={i} href={seg.href} className="underline text-[var(--brand)] hover:text-[var(--accent)]">
        {seg.linkText}
      </Link>
    ) : (
      <Fragment key={i}>{renderPlainText(seg.text, String(i))}</Fragment>
    ),
  )
}
