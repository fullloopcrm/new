import { TenantTermsConditions } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Terms & Conditions | NYC Tow' }

const identity = { name: 'NYC Tow', url: 'https://thenyctowingservice.com' }

export default function TermsPage() {
  return <TenantTermsConditions identity={identity} />
}
