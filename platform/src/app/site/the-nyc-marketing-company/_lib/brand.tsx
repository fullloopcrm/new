// Combined brand identity. Plain string for metadata, schema, alt text, and any
// non-JSX context where a link is impossible.
export const BRAND_NAME = "Consortium NYC (Now The NYC Marketing Company)";

// Short forms for logos / tight lockups.
export const BRAND_SHORT = "Consortium NYC";
export const PARTNER_NAME = "The NYC Marketing Company";
export const PARTNER_URL = "https://www.thenycmarketingcompany.com";

/**
 * Renders the combined brand "Consortium NYC (Now The NYC Marketing Company)"
 * with "The NYC Marketing Company" linked to thenycmarketingcompany.com.
 * Use this for every rendered (JSX) mention of the brand.
 */
export function BrandLink({ className }: { className?: string }) {
  return (
    <span className={className}>
      {BRAND_SHORT} (Now{" "}
      <a
        href={PARTNER_URL}
        target="_blank"
        rel="noopener"
        className="underline decoration-1 underline-offset-2 hover:opacity-80"
      >
        {PARTNER_NAME}
      </a>
      {")"}
    </span>
  );
}