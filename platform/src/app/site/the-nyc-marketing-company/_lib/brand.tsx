// Brand identity for The NYC Marketing Company (thenycmarketingcompany.com).
export const BRAND_NAME = "The NYC Marketing Company";

// Short forms for logos / tight lockups.
export const BRAND_SHORT = "The NYC Marketing Company";

/**
 * Inline brand name. Renders "The NYC Marketing Company" for any rendered
 * (JSX) mention of the brand.
 */
export function BrandLink({ className }: { className?: string }) {
  return <span className={className}>{BRAND_NAME}</span>;
}
