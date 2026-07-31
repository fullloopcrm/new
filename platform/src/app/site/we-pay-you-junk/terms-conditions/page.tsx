import { TenantTermsConditions } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Terms & Conditions | We Pay You Junk' }

const identity = { name: 'We Pay You Junk', url: 'https://wepayyoujunkremoval.com', email: 'wepayyoujunk@gmail.com' }

export default function TermsPage() {
  return <TenantTermsConditions identity={identity} />
}
