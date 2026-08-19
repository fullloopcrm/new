import { Fragment } from 'react'

/**
 * Splits plain body copy on a tenant's own phone number(s) and wraps each
 * occurrence in a real sms: link, so a phone number mentioned mid-sentence in
 * generated long-form content (About, FAQ, Pricing, Contact, Careers, Reviews)
 * is clickable the same way the nav/footer/CTA buttons already are. Matches
 * the literal display string (e.g. "(415) 573-FILM", a vanity number), not a
 * generic phone regex, since the display text and the dialable digits differ
 * for vanity numbers.
 */
export function linkifyPhones(text: string, phones: { display: string | undefined; digits: string | undefined }[]): React.ReactNode {
  const real = phones.filter((p): p is { display: string; digits: string } => Boolean(p.display && p.digits))
  if (real.length === 0) return text

  // Longest display string first so a support-line number that happens to be
  // a substring of another doesn't get partially matched.
  const sorted = [...real].sort((a, b) => b.display.length - a.display.length)
  const pattern = new RegExp(`(${sorted.map((p) => p.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  const parts = text.split(pattern)

  return parts.map((part, i) => {
    const match = sorted.find((p) => p.display === part)
    if (!match) return <Fragment key={i}>{part}</Fragment>
    return (
      <a key={i} href={`sms:${match.digits}`} className="underline decoration-1 underline-offset-2 hover:text-[var(--brand)]">
        {part}
      </a>
    )
  })
}
