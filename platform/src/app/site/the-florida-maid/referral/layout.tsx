import FeedbackWidget from '@/app/site/the-florida-maid/_components/FeedbackWidget'

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget source="Referral Portal" />
    </>
  )
}
