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
    label: 'Introduce yourself, tell us why you’d be great for this, and what “all in” actually looks like for you.',
    helpText: 'This is a long-term opportunity, not a job — say a bit about where you see yourself down the road, and why you’re someone who goes all in rather than watching the clock.',
  },
  {
    key: 'quick_facts',
    label: 'In one take: what do you do now? Are you bilingual in English and Spanish (if so, say a bit in both)? And when could you start?',
  },
  {
    key: 'goal_track_record',
    label: 'Tell us about a specific goal you set for yourself and crushed — and one you set and missed. What did each one teach you?',
    helpText: 'We want someone who always wants more, not someone waiting for the clock to run out.',
  },
  {
    key: 'ownership_of_mistakes',
    label: 'Tell us about a real mistake you made at work — what happened, what you did about it, and how you made sure it never happened again.',
  },
  {
    key: 'task_completion_style',
    label: 'Walk us through what happens after you’re handed a task — from the moment you get it to the moment you come back and say it’s done.',
    helpText: 'We’re not looking for progress updates. We’re looking for someone who takes it, kills it, verifies it’s actually done, and comes back ready for the next thing.',
  },
  {
    key: 'ai_comfort',
    label: 'This role includes learning to manage — and eventually help implement — AI systems, no prior experience required. Tell us about a time you had to pick up a new tool or technology fast, and how it went.',
  },
  {
    key: 'why_this_role',
    label: 'Why do you want to build toward eventually running this company — not just work here?',
    helpText: 'This is a real business on a real growth trajectory, not a project — tell us why this level of responsibility fits you right now.',
  },
  {
    key: 'no_show_scenario',
    label: 'A field team member no-shows 30 minutes before a job, and the client is already upset from a prior reschedule. Walk us through exactly what you do in the next 10 minutes.',
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
      'An entrepreneurial, all-in opportunity: this rebranded startup is 8 months old and already on pace for $600,000 in annual revenue, having just passed $40,000 in monthly revenue in month 7. We went from 30 cleanings in January to nearly 200 in July, and we’re just getting started — expanding into Philadelphia, Connecticut, and Florida. Backed by 20 years of home services marketing experience, this is a leadership and profit-sharing position with a real path to becoming CEO of a multi-million-dollar company. Full oversight of the day-to-day operation — team, clients, payments, hiring, quality control — plus learning to manage and implement the AI systems that run alongside you.',
    compSummary:
      'Based on experience — discussed directly during the process.',
    employmentType: '1099 Independent Contractor',
    schedule: 'Monday–Friday, 8:00 AM–6:00 PM',
    location: 'Remote — Anywhere in the U.S.',
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
