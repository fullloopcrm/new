/**
 * Shared step list for the onboarding profile wizard. Single source of truth
 * for both the client wizard (src/app/dashboard/onboarding/page.tsx) and the
 * progress API (src/app/api/dashboard/onboarding/progress) so the sidebar
 * badge's total always matches the wizard's actual step count.
 */
export const ONBOARDING_STEPS = [
  { key: 'identity', title: 'Business Identity', blurb: 'Legal details for invoices, taxes, and 1099/W-2 filing.' },
  { key: 'contact', title: 'Address & Contact', blurb: 'Where you operate and how customers reach you.' },
  { key: 'brand', title: 'Brand', blurb: 'How your business looks and sounds across your site and AI.' },
  { key: 'compliance', title: 'Licensing & Insurance', blurb: 'Trade credentials that build trust and meet compliance.' },
  { key: 'social', title: 'Social & Reviews', blurb: 'Public profiles for your site footer, schema, and review flow.' },
  { key: 'import', title: 'Import your business', blurb: 'Bring your existing clients, schedule, and books into Full Loop.' },
] as const
