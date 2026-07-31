import { TenantTermsConditions } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Terms & Conditions | The NYC Mobile Salon' }

const identity = { name: 'The NYC Mobile Salon', url: 'https://thenycmobilesalon.com', email: 'thenycmobilesalon@gmail.com' }

export default function TermsPage() {
  return <TenantTermsConditions identity={identity} />
}
