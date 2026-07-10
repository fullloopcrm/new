// Repurposed from the original "assessment hint" component.
// Now surfaces a roadside-specific tip so existing imports stay valid.
export function ValuationHint({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 ${className}`}>
      <p className="font-semibold font-cta">Average response: under 60 minutes in the cities we serve.</p>
      <p className="mt-1 text-emerald-800/90">
        A dispatcher will call within 5 minutes of your booking with the technician&apos;s name, ETA, and direct number — so you&apos;re never wondering where help is.
      </p>
    </div>
  );
}