/**
 * Shared, config-driven catalog for "management" hires (roles that oversee an
 * operation rather than perform the trade itself — administrators, ops
 * coordinators, founding CEOs). One position = one entry here + one thin
 * page.tsx per tenant for marketing copy. All of them share the same
 * PositionApplicationForm and the same /api/management-applications backend.
 *
 * Only four fields are ever typed: name, phone, email, address. Everything
 * else the platform wants to know about a candidate is a recorded (video or
 * audio) answer, not a text box — this is deliberate: candidates apply from
 * their phones, and typing is the single biggest reason they abandon a long
 * application.
 *
 * Adding a new position or a new tenant for an existing position is a config
 * change, not a new form component.
 */

export interface RecordedQuestion {
  key: string
  label: string
  helpText?: string
}

export interface PositionConfig {
  slug: string
  tenantSlug: string
  title: string
  tagline: string
  compSummary: string
  employmentType: string
  schedule: string
  location: string
  responsibilitiesNote?: string
  supportPhone?: string
  introMessage: string
  recordingSecondsLimit: number
  recordedQuestions: RecordedQuestion[]
  photoRequired: boolean
  resumeRequired: boolean
}

/**
 * Shown before any question — sets expectations up front so candidates don't
 * bail assuming this is a long form. Reusable across positions/tenants.
 */
export const DEFAULT_INTRO_MESSAGE =
  'This is not a 20-minute application. A handful of short video or audio answers — no typing required beyond your contact info. Most people finish in under 10 minutes.'

export const DEFAULT_RECORDING_SECONDS_LIMIT = 60

/**
 * Trade-neutral recorded question set for the "Administrator" position — full
 * oversight of a service business's day-to-day operation. Written to apply
 * equally to a maid service, a towing company, a mobile salon, an
 * exterminator, or any other trade on the platform. Tenants share this
 * template; only tenant facts (comp, schedule, business name) differ.
 */
export const ADMINISTRATOR_QUESTIONS: RecordedQuestion[] = [
  {
    key: 'intro',
    label: 'Introduce yourself, tell us why you’d be good for this position, and what your long-term goals are.',
    helpText: 'We’re looking for someone in this for the long haul — this is a long-term position, so say a bit about where you see yourself down the road.',
  },
  {
    key: 'quick_facts',
    label: 'In one take: what do you do now? Are you bilingual in English and Spanish (if so, say a bit in both)? And when could you start?',
  },
  {
    key: 'experience_managing',
    label: 'Tell us about the biggest team or operation you’ve managed — how big, how long, and how it went.',
  },
  {
    key: 'why_this_role',
    label: 'Why do you want full ownership of this operation?',
    helpText: 'This is a real business, not a project — tell us why this level of responsibility fits you right now.',
  },
  {
    key: 'no_show_scenario',
    label: 'A field team member no-shows 30 minutes before a job, and the client is already upset from a prior reschedule. Walk us through exactly what you do in the next 10 minutes.',
  },
  {
    key: 'shift_conflict_scenario',
    label: 'Several team members want more hours, but only one is consistently reliable and well-reviewed. How do you handle the scheduling and the conversation?',
  },
  {
    key: 'training_handoff',
    label: 'Part of this role is training someone else to cover the hours or days you don’t personally work. How would you approach building that handoff?',
  },
  {
    key: 'references',
    label: 'Give us the name and phone number of two people who can vouch for your reliability.',
  },
]

export const POSITIONS: Record<string, PositionConfig> = {
  'nycmaid:administrator': {
    slug: 'administrator',
    tenantSlug: 'nycmaid',
    title: 'Administrator',
    tagline:
      'Full oversight of NYC Maid’s day-to-day operation — your service team, clients, payments, hiring, and quality control. General-manager-level ownership, without general-manager-level hours, because the platform automates most of the routine work.',
    compSummary:
      '$1,000/week (1099) for the first 90 days. After 90 days: 10% of net profit, with scaling opportunities to discuss.',
    employmentType: '1099 Independent Contractor',
    schedule: 'Monday–Friday, 8:00 AM–6:00 PM',
    location: 'Remote / Work From Home',
    responsibilitiesNote:
      'You will also train the weekend assistant administrator who covers weekend service — so part of this role is building a playbook someone else can run.',
    supportPhone: '2122028400',
    introMessage: DEFAULT_INTRO_MESSAGE,
    recordingSecondsLimit: DEFAULT_RECORDING_SECONDS_LIMIT,
    recordedQuestions: ADMINISTRATOR_QUESTIONS,
    photoRequired: true,
    resumeRequired: false,
  },
}

export function getPosition(tenantSlug: string, positionSlug: string): PositionConfig | null {
  return POSITIONS[`${tenantSlug}:${positionSlug}`] || null
}
