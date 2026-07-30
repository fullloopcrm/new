import { TenantTermsConditions } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Terms & Conditions | The Home Services Company' }

const identity = { name: 'The Home Services Company', url: 'https://thehomeservicescompany.com' }

export default function TermsPage() {
  return <TenantTermsConditions identity={identity} />
}
