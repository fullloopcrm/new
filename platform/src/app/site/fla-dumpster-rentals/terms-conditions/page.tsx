import { TenantTermsConditions } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Terms & Conditions | FLA Dumpster Rentals' }

const identity = { name: 'FLA Dumpster Rentals', url: 'https://fladumpsterrentals.com' }

export default function TermsPage() {
  return <TenantTermsConditions identity={identity} />
}
