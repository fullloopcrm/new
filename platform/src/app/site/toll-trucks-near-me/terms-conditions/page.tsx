import { TenantTermsConditions } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Terms & Conditions | Toll Trucks Near Me' }

const identity = { name: 'Toll Trucks Near Me', url: '' }

export default function TermsPage() {
  return <TenantTermsConditions identity={identity} />
}
