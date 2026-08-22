import { TenantTermsConditions } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Terms & Conditions | The Baltimore Exterminator' }

const identity = { name: 'The Baltimore Exterminator', url: 'https://thebaltimoreexterminator.com', email: 'hello@thebaltimoreexterminator.com', phone: '(410) 899-0100' }

export default function TermsPage() {
  return <TenantTermsConditions identity={identity} />
}
