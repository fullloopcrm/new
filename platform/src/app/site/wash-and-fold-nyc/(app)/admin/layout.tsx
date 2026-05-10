// @ts-nocheck
import type { Metadata } from 'next'
import AdminShell from './AdminShell'

export const metadata: Metadata = {
  manifest: '/admin-manifest.json',
  applicationName: 'Wash and Fold Admin',
  appleWebApp: {
    capable: true,
    title: 'Admin',
    statusBarStyle: 'default',
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
