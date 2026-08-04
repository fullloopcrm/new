export const RECIPIENT_FILTERS = ['all_tenants', 'active_tenants', 'setup_tenants', 'suspended_tenants'] as const
export type RecipientFilter = (typeof RECIPIENT_FILTERS)[number]

export const CHANNELS = ['email', 'sms', 'both'] as const
export type Channel = (typeof CHANNELS)[number]
export const CHANNEL_LABEL: Record<Channel, string> = { email: 'Email', sms: 'SMS', both: 'Email + SMS' }
export const isChannel = (v: string): v is Channel => (CHANNELS as readonly string[]).includes(v)

export const RECIPIENT_FILTER_LABEL: Record<RecipientFilter, string> = {
  all_tenants: 'All tenants',
  active_tenants: 'Active tenants',
  setup_tenants: 'Tenants mid-setup',
  suspended_tenants: 'Suspended tenants',
}

export function statusForFilter(filter: RecipientFilter): string | null {
  if (filter === 'active_tenants') return 'active'
  if (filter === 'setup_tenants') return 'setup'
  if (filter === 'suspended_tenants') return 'suspended'
  return null // all_tenants
}

export function isRecipientFilter(v: string): v is RecipientFilter {
  return (RECIPIENT_FILTERS as readonly string[]).includes(v)
}
