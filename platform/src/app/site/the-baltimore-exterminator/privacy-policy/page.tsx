import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | The Baltimore Exterminator' }

const identity = { name: 'The Baltimore Exterminator', url: 'https://thebaltimoreexterminator.com', email: 'hello@thebaltimoreexterminator.com', phone: '(410) 844-6060' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
