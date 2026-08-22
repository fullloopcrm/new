import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | The Baltimore Exterminator' }

const identity = { name: 'The Baltimore Exterminator', url: 'https://thebaltimoreexterminator.com', email: 'hello@thebaltimoreexterminator.com', phone: '(410) 899-0100' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
