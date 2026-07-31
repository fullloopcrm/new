import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | The Home Services Company' }

const identity = { name: 'The Home Services Company', url: 'https://thehomeservicescompany.com' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
