// Brand identity for Consortium NYC (consortiumnyc.com). Consortium NYC is the
// brand; The NYC Marketing Company is a partner it links out to for "learn
// more" invitations and lead capture.
export const BRAND_NAME = "Consortium NYC";
export const BRAND_SHORT = "Consortium NYC";
export const PARTNER_NAME = "The NYC Marketing Company";
export const PARTNER_URL = "https://www.thenycmarketingcompany.com";
export const PARTNER_CONTACT_URL = "https://www.thenycmarketingcompany.com/contact";

/**
 * Partnership lockup: "Consortium NYC — proud partner of The NYC Marketing
 * Company". The partner name links out to thenycmarketingcompany.com.
 */
export function PartnerLine({ className }: { className?: string }) {
  return (
    <span className={className}>
      {BRAND_SHORT} — proud partner of{" "}
      <a
        href={PARTNER_URL}
        target="_blank"
        rel="noopener"
        className="underline decoration-1 underline-offset-2 hover:opacity-80"
      >
        {PARTNER_NAME}
      </a>
    </span>
  );
}

/**
 * Slim site-wide announcement banner inviting visitors to learn more about the
 * partner. Rendered once at the top of the layout.
 */
export function PartnerBanner() {
  return (
    <div className="bg-slate-900 text-white text-center text-sm py-2 px-4">
      <span className="opacity-90">
        Consortium NYC has partnered with {PARTNER_NAME}.{" "}
      </span>
      <a
        href={PARTNER_URL}
        target="_blank"
        rel="noopener"
        className="font-semibold underline decoration-1 underline-offset-2 hover:opacity-80 whitespace-nowrap"
      >
        Learn more →
      </a>
    </div>
  );
}
