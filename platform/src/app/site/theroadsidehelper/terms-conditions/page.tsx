import { TenantTermsConditions } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Terms & Conditions | The Roadside Helper' }

const identity = { name: 'The Roadside Helper', url: 'https://theroadsidehelper.com' }

export default function TermsPage() {
  return <TenantTermsConditions identity={identity} />
}
