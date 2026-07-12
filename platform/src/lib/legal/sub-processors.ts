/**
 * Sub-processor registry (GDPR Art. 28 / CCPA "service provider" disclosure).
 *
 * A sub-processor is any third party that processes personal data on our behalf
 * to deliver the Full Loop CRM service. GDPR Art. 28(2)/(4) requires that we
 * (a) maintain an accurate, current list of sub-processors, (b) make it
 * available to customers, and (c) give notice of changes. This file is the
 * single source of truth that backs the public /sub-processors page.
 *
 * Adding, removing, or repurposing a provider here is a material change: update
 * the `lastUpdated` date and give customers advance notice per the DPA.
 *
 * NOTE ON LINKS: each `privacyUrl` points at the provider's public privacy /
 * legal page. Before publishing, confirm the provider's *current* DPA link
 * (these move) and swap in the DPA URL where a distinct one exists.
 */

export type SubProcessorCategory =
  | 'Payments'
  | 'Communications'
  | 'Infrastructure & Database'
  | 'Email'
  | 'AI / LLM Processing'
  | 'Hosting & Analytics';

export interface SubProcessor {
  /** Legal / product name of the provider. */
  name: string;
  /** What we use them for, in plain language. */
  purpose: string;
  /** Grouping used for display and filtering. */
  category: SubProcessorCategory;
  /** The categories of personal data they may process on our behalf. */
  dataProcessed: string;
  /** Where processing / storage primarily occurs. */
  location: string;
  /** Public privacy or DPA page. Verify current DPA link before publishing. */
  privacyUrl: string;
}

/**
 * Current sub-processors. Keep alphabetical within category for stable diffs.
 *
 * Auth note: Clerk was previously used for authentication but owner login is
 * dormant / moved off Clerk (see src/lib/owner-session.ts). Clerk is therefore
 * intentionally omitted here; re-add it if/when owner auth is wired back on.
 */
export const SUB_PROCESSORS: readonly SubProcessor[] = [
  {
    name: 'Stripe',
    purpose: 'Payment processing, invoicing, and subscription billing.',
    category: 'Payments',
    dataProcessed:
      'Name, email, billing address, payment card / bank details, transaction history.',
    location: 'United States (global processing).',
    privacyUrl: 'https://stripe.com/privacy',
  },
  {
    name: 'Telnyx',
    purpose:
      'SMS and voice communications (appointment reminders, service texts, calls). Twilio may be used as an equivalent provider for the same purpose.',
    category: 'Communications',
    dataProcessed: 'Phone number, message content, call metadata.',
    location: 'United States.',
    privacyUrl: 'https://telnyx.com/privacy-policy',
  },
  {
    name: 'Supabase',
    purpose:
      'Primary application database, file storage, and row-level-secured tenant data.',
    category: 'Infrastructure & Database',
    dataProcessed:
      'All customer, client, job, and account records stored in the CRM.',
    location: 'United States (AWS regions).',
    privacyUrl: 'https://supabase.com/privacy',
  },
  {
    name: 'Resend',
    purpose: 'Transactional and service email delivery.',
    category: 'Email',
    dataProcessed: 'Email address, name, email content.',
    location: 'United States.',
    privacyUrl: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'Anthropic',
    purpose:
      'AI / LLM features (message drafting, categorization, and assistant tooling). xAI may be used as an equivalent LLM provider for the same features.',
    category: 'AI / LLM Processing',
    dataProcessed:
      'Prompt content, which may include names, message text, and business data supplied for processing.',
    location: 'United States.',
    privacyUrl: 'https://www.anthropic.com/legal/privacy',
  },
  {
    name: 'Vercel',
    purpose: 'Application hosting, edge delivery, and privacy-safe analytics.',
    category: 'Hosting & Analytics',
    dataProcessed:
      'IP address, request metadata, and aggregate usage analytics.',
    location: 'United States (global edge network).',
    privacyUrl: 'https://vercel.com/legal/privacy-policy',
  },
] as const;

/** Date this registry was last reviewed/changed. Update on every material change. */
export const SUB_PROCESSORS_LAST_UPDATED = 'July 12, 2026';
