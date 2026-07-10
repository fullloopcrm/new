import type { SiteConfig } from '../_config/types'
import type { LegalDocData } from '../_components/LegalDoc'

/**
 * Per-tenant legal document content, built from SiteConfig.
 *
 * Written to home-service industry standards and kept TRADE-NEUTRAL (a plumbing,
 * towing, or cleaning tenant can all use it). Names the real business and its
 * real contact info. NOT a substitute for a lawyer's review — it is a solid,
 * accurate baseline. Notably it discloses the service providers the platform
 * actually relies on (payments, SMS, email, hosting) instead of falsely claiming
 * "we never share with anyone," and covers TCPA text-messaging consent and
 * CCPA/CPRA rights, which home-service operators commonly need.
 */

const UPDATED = 'July 2026'

interface LegalBiz {
  name: string
  url: string
  email: string
  phone: string
  phoneDigits: string
  place: string
}

function lb(config: SiteConfig): LegalBiz {
  return {
    name: config.identity.name,
    url: config.identity.url.replace(/\/+$/, ''),
    email: config.contact.email,
    phone: config.contact.phone,
    phoneDigits: config.contact.phoneDigits,
    place: config.geo.placename,
  }
}

function contact(b: LegalBiz) {
  return {
    contactBody: `Questions? Contact ${b.name} at`,
    contactEmail: b.email || undefined,
    contactPhone: b.phone || undefined,
    contactPhoneDigits: b.phoneDigits || undefined,
  }
}

export function privacyPolicyDoc(config: SiteConfig): LegalDocData {
  const b = lb(config)
  return {
    title: 'Privacy Policy',
    subtitle: 'How we collect, use, and protect your information',
    updated: UPDATED,
    breadcrumb: 'Privacy Policy',
    breadcrumbHref: '/privacy-policy',
    intro: [
      `This Privacy Policy explains how ${b.name} ("we," "us," or "our") collects, uses, shares, and protects your information when you request a quote, book a service, or use our website.`,
    ],
    sections: [
      {
        heading: 'Information We Collect',
        body: ['When you contact us, request a quote, or book a service, we may collect:'],
        bullets: [
          'Contact information — your name, phone number, email address, and service address.',
          'Service details — information about the job, your property, access instructions, and any special requests or preferences.',
          'Payment information — collected through our third-party payment processor. We do not store full payment card numbers on our own servers.',
          'Website usage data — pages visited, links clicked, and general device/browser information, used to measure and improve our site.',
        ],
      },
      {
        heading: 'How We Use Your Information',
        bullets: [
          'To schedule, confirm, and deliver your service',
          'To communicate with you about appointments, quotes, updates, and support',
          'To dispatch the right professional to your location',
          'To process payments and maintain records',
          'To measure and improve our website and services',
          'To send service updates and, only with your consent, occasional offers (you can opt out at any time)',
        ],
      },
      {
        heading: 'Text Messages & Phone Calls',
        body: [
          `By providing your phone number and opting in, you consent to receive calls and text messages from ${b.name} about your inquiry, appointments, reminders, and support — including messages sent using automated technology. Consent is not a condition of purchase.`,
          'Message frequency may vary. Message and data rates may apply. Reply STOP to opt out of texts at any time, or HELP for help. Carriers are not liable for delayed or undelivered messages.',
        ],
      },
      {
        heading: 'Service Providers We Work With',
        body: [
          'To run our business we rely on trusted third-party service providers, and we share only the information each one needs to perform its function on our behalf:',
        ],
        bullets: [
          'Payment processing — to securely accept and process payments',
          'Text messaging and telephony — to send appointment texts and connect calls',
          'Email delivery — to send confirmations and updates',
          'Website hosting and data storage — to operate our site and securely store records',
        ],
        note: `These providers are bound to use your information only to provide their service to us. We do not sell your personal information, and we do not share it with data brokers or advertising networks.`,
      },
      {
        heading: 'Cookies & Website Analytics',
        body: [
          'We use cookies and similar technologies for basic site functionality and to measure how our website is used so we can improve it.',
          'You can opt out of the sale or sharing of your personal information at any time using the "Do Not Sell or Share My Info" control on our site, and we automatically honor Global Privacy Control (GPC) browser signals.',
        ],
      },
      {
        heading: 'Your Privacy Rights',
        bullets: [
          'Access the personal information we hold about you',
          'Request correction of inaccurate information',
          'Request deletion of your personal information',
          'Opt out of marketing communications at any time',
          'Opt out of the sale or sharing of your personal information',
        ],
      },
      {
        heading: 'California Residents (CCPA/CPRA)',
        id: 'california',
        body: [
          'If you are a California resident, you have the right to know what personal information we collect and how we use it, to request access to or deletion or correction of your information, and to opt out of the "sale" or "sharing" of your personal information. We do not sell your personal information.',
          `We will not discriminate against you for exercising these rights. To exercise them, contact us using the details below, or use the "Do Not Sell or Share My Info" control on our site. We honor Global Privacy Control (GPC) signals as a valid opt-out request.`,
        ],
      },
      {
        heading: 'Data Retention',
        body: ['We keep your information only as long as needed to provide our services, meet legal and tax obligations, resolve disputes, and enforce our agreements. When it is no longer needed, we delete or de-identify it.'],
      },
      {
        heading: 'How We Protect Your Information',
        body: ['We use industry-standard safeguards including encrypted data transmission (SSL/TLS), access controls, and restricted internal access. Only authorized team members can view your information, and only what they need to do their job.'],
      },
      {
        heading: "Children's Privacy",
        body: ['Our services and website are intended for adults. We do not knowingly collect personal information from children under 13. If you believe a child has provided us information, contact us and we will delete it.'],
      },
      {
        heading: 'Changes to This Policy',
        body: ['We may update this Privacy Policy from time to time. Material changes will be reflected by the "Last updated" date above, and continued use of our services means you accept the updated policy.'],
      },
    ],
    ...contact(b),
  }
}

export function termsDoc(config: SiteConfig): LegalDocData {
  const b = lb(config)
  return {
    title: 'Terms & Conditions',
    subtitle: 'The terms that govern our services',
    updated: UPDATED,
    breadcrumb: 'Terms & Conditions',
    breadcrumbHref: '/terms-conditions',
    intro: [
      `These Terms & Conditions govern your use of ${b.name}'s website and services. By requesting a quote, booking a service, or using our site, you agree to these terms.`,
    ],
    sections: [
      { heading: 'Our Services', body: [`${b.name} provides professional home and property services in ${b.place} and surrounding areas. Specific scope, availability, and pricing are confirmed at the time of booking.`] },
      { heading: 'Booking, Scheduling & Access', body: ['When you book, you agree to provide accurate details and safe, timely access to the service location. If we cannot access the location or the job differs materially from what was described, additional charges or rescheduling may apply.'] },
      { heading: 'Pricing & Payment', body: ['Prices are provided as quotes or hourly/flat rates confirmed at booking and may change if the scope changes. Payment is processed through our secure third-party payment processor. You are responsible for any applicable taxes and for keeping a valid payment method on file.'] },
      { heading: 'Cancellations & Rescheduling', body: ['Cancellation and rescheduling windows are described at booking and in our Refund Policy. Late cancellations or missed appointments may incur a fee.'] },
      {
        heading: 'Text Messaging Consent',
        body: [`By providing your phone number, you consent to receive calls and texts from ${b.name} related to your service, including via automated technology. Consent is not a condition of purchase. Message and data rates may apply; reply STOP to opt out, HELP for help.`],
      },
      { heading: 'Your Responsibilities', bullets: ['Provide accurate contact and service information', 'Ensure safe and lawful access to the service location', 'Secure or disclose valuables, pets, and hazards in advance', 'Maintain a valid payment method'] },
      { heading: 'Service Guarantee & Limitations', body: ['We stand behind our work and will make reasonable efforts to resolve legitimate concerns raised promptly after service. We are not responsible for pre-existing damage, conditions that cannot be corrected by the service requested, or issues outside the agreed scope of work.'] },
      { heading: 'Limitation of Liability', body: [`To the fullest extent permitted by law, ${b.name}'s total liability for any claim related to our services is limited to the amount you paid for the service giving rise to the claim. We are not liable for indirect, incidental, or consequential damages.`] },
      { heading: 'Indemnification', body: [`You agree to indemnify and hold ${b.name} harmless from claims arising out of your breach of these terms, your misuse of our services, or your violation of any law or third-party right.`] },
      { heading: 'Intellectual Property', body: ['All content on our website — text, graphics, logos, and design — is owned by or licensed to us and may not be copied or reused without permission.'] },
      { heading: 'Governing Law & Disputes', body: ['These terms are governed by the laws of the state in which we operate, without regard to conflict-of-law rules. Any dispute will be resolved in the courts located in that jurisdiction.'] },
      { heading: 'Changes to These Terms', body: ['We may update these terms from time to time. The "Last updated" date reflects the latest version, and continued use of our services means you accept the changes.'] },
    ],
    ...contact(b),
  }
}

export function refundDoc(config: SiteConfig): LegalDocData {
  const b = lb(config)
  return {
    title: 'Refund Policy',
    subtitle: 'Our satisfaction commitment',
    updated: UPDATED,
    breadcrumb: 'Refund Policy',
    breadcrumbHref: '/refund-policy',
    intro: [`We want you to be satisfied with your service from ${b.name}. This policy explains how we handle concerns, re-services, cancellations, and refunds.`],
    sections: [
      { heading: 'Satisfaction & Re-Service', body: ['If something about your completed service did not meet a reasonable standard, contact us promptly — within 24 hours of service where possible. We will review the concern and, when warranted, return to correct the specific issue at no additional charge before any refund is considered.'] },
      { heading: 'Cancellations & Rescheduling', body: ['You may cancel or reschedule within the window communicated at booking. Cancellations made after that window, or missed appointments, may incur a fee to cover reserved time and dispatch. Recurring services may require additional notice as described at signup.'] },
      { heading: 'Refunds', body: ['Where a refund is appropriate, it is issued to the original payment method after we have had a reasonable opportunity to inspect and, if possible, correct the issue. Refunds are for the affected service only and do not apply to concerns reported outside a reasonable timeframe or to conditions outside the agreed scope of work.'] },
      { heading: 'Payment Disputes', body: ['If you believe you were charged in error, contact us first — most issues are resolved quickly and directly. Please reach out before initiating a chargeback so we can make it right.'] },
    ],
    ...contact(b),
  }
}

export function doNotSellDoc(config: SiteConfig): LegalDocData {
  const b = lb(config)
  return {
    title: 'Do Not Sell or Share My Personal Information',
    subtitle: 'Your California privacy choices',
    updated: UPDATED,
    breadcrumb: 'Do Not Sell or Share',
    breadcrumbHref: '/do-not-share-policy',
    intro: [`Under the California Consumer Privacy Act (CCPA/CPRA), California residents have the right to opt out of the "sale" or "sharing" of their personal information. This page explains our practices and how to exercise that right with ${b.name}.`],
    sections: [
      { heading: 'We Do Not Sell Your Personal Information', body: [`${b.name} does not sell your personal information for money, and we do not share it with data brokers or advertising networks for cross-context behavioral advertising.`] },
      {
        heading: 'How to Opt Out',
        id: 'do-not-sell',
        body: [
          'Even though we do not sell your information, you can record an opt-out at any time using the "Do Not Sell or Share My Info" control in our site footer.',
          'We also automatically honor Global Privacy Control (GPC) browser signals as a valid opt-out request — if your browser or extension sends GPC, no action is needed on your part.',
        ],
      },
      { heading: 'Your Other California Rights', bullets: ['The right to know what personal information we collect and how we use it', 'The right to request deletion of your personal information', 'The right to request correction of inaccurate information', 'The right not to be discriminated against for exercising your privacy rights'] },
      { heading: 'Authorized Agents', body: ['You may designate an authorized agent to submit a request on your behalf. We may require verification of your identity and the agent\'s authority before acting on the request.'] },
    ],
    contactHeading: 'Submit a Request',
    ...contact(b),
    contactBody: `To exercise any of these rights, contact ${b.name} at`,
  }
}
