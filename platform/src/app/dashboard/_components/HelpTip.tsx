/**
 * Inline help — a small "?" that reveals a tip on hover/focus. Reusable on any
 * field or item across the dashboard. Styles live in globals.css (.help-tip).
 */
export default function HelpTip({ text }: { text: string }) {
  return (
    <span className="help-tip" tabIndex={0} role="note" aria-label={text}>
      ?
      <span className="help-bubble">{text}</span>
    </span>
  )
}
