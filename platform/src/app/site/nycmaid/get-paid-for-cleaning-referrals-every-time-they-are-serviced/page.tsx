import type { Metadata } from 'next'
import { breadcrumbSchema, localBusinessSchema, faqSchema } from '@/app/site/nycmaid/_lib/seo/schema'
import JsonLd from '@/app/site/nycmaid/_components/JsonLd'
import Breadcrumbs from '@/app/site/nycmaid/_components/Breadcrumbs'
import ReferralFAQSection from '@/app/site/nycmaid/_components/ReferralFAQSection'
import ReferralCTABlock from '@/app/site/nycmaid/_components/ReferralCTABlock'
import ReferralPageBody from '@/app/site/nycmaid/_components/ReferralPageBody'

export const metadata: Metadata = {
  title: 'Get Paid for Cleaning Referrals | Earn 10% Commission | The NYC Maid',
  description: 'Earn 10% commission every time your referral books a cleaning (from $59/hr). Recurring income, fast payouts via Zelle or Apple Cash. (212) 202-8400',
  alternates: { canonical: 'https://www.thenycmaid.com/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
  openGraph: {
    title: 'Get Paid for Cleaning Referrals | The NYC Maid',
    description: 'Earn 10% commission every time someone you refer books a cleaning. Recurring income, fast payouts.',
    url: 'https://www.thenycmaid.com/get-paid-for-cleaning-referrals-every-time-they-are-serviced',
  },
}

const referralFAQs = [
  { question: 'How much do I earn per referral?', answer: 'You earn 10% commission on every cleaning booked by someone you referred. This is recurring — every time they book, you get paid.' },
  { question: 'How do I get paid?', answer: 'We pay commissions via Zelle or Apple Cash after each completed cleaning. You choose your preferred payout method when you sign up.' },
  { question: 'Is there a limit on how many people I can refer?', answer: 'No limit! Refer as many people as you want. The more referrals, the more you earn.' },
  { question: 'How do I track my referrals?', answer: 'After signing up, you get access to a referral dashboard where you can see your link performance, active referrals, earnings, and payout history.' },
  { question: 'Do my referrals need to use a special link?', answer: 'Yes — when you sign up, you receive a unique referral link. When someone books through your link, the referral is automatically tracked.' },
  { question: 'How long do I earn commissions for each referral?', answer: 'You earn commissions for as long as the person you referred remains a customer. If they book weekly cleanings for a year, you earn 10% on every single one.' },
]

const referralFAQsBilingual = [
  { question: 'How much do I earn per referral?', questionEs: '¿Cuánto gano por cada referido?', answer: 'You earn 10% commission on every cleaning booked by someone you referred. This is recurring — every time they book, you get paid.', answerEs: 'Ganas el 10% de comisión en cada limpieza que reserve la persona que referiste. Es recurrente — cada vez que reservan, te pagan.' },
  { question: 'How do I get paid?', questionEs: '¿Cómo me pagan?', answer: 'We pay commissions via Zelle or Apple Cash after each completed cleaning. You choose your preferred payout method when you sign up.', answerEs: 'Pagamos las comisiones por Zelle o Apple Cash después de cada limpieza completada. Eliges tu método de pago preferido al registrarte.' },
  { question: 'Is there a limit on how many people I can refer?', questionEs: '¿Hay un límite de personas que puedo referir?', answer: 'No limit! Refer as many people as you want. The more referrals, the more you earn.', answerEs: '¡Sin límite! Refiere a tantas personas como quieras. Mientras más refieras, más ganas.' },
  { question: 'How do I track my referrals?', questionEs: '¿Cómo rastreo mis referidos?', answer: 'After signing up, you get access to a referral dashboard where you can see your link performance, active referrals, earnings, and payout history.', answerEs: 'Después de registrarte, tienes acceso a un panel de referidos donde puedes ver el rendimiento de tu enlace, referidos activos, ganancias e historial de pagos.' },
  { question: 'Do my referrals need to use a special link?', questionEs: '¿Mis referidos necesitan usar un enlace especial?', answer: 'Yes — when you sign up, you receive a unique referral link. When someone books through your link, the referral is automatically tracked.', answerEs: 'Sí — al registrarte, recibes un enlace de referido único. Cuando alguien reserva a través de tu enlace, el referido se rastrea automáticamente.' },
  { question: 'How long do I earn commissions for each referral?', questionEs: '¿Por cuánto tiempo gano comisiones por cada referido?', answer: 'You earn commissions for as long as the person you referred remains a customer. If they book weekly cleanings for a year, you earn 10% on every single one.', answerEs: 'Ganas comisiones mientras la persona que refieres siga siendo cliente. Si reservan limpiezas semanales durante un año, ganas el 10% de cada una.' },
]

export default function ReferralPage() {
  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Referral Program', url: 'https://www.thenycmaid.com/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
        ]),
        faqSchema(referralFAQs),
      ]} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs items={[{ name: 'Referral Program', href: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced' }]} />
      </div>

      <ReferralPageBody />

      <ReferralFAQSection faqs={referralFAQsBilingual} title="Referral Program FAQ" titleEs="Preguntas Frecuentes del Programa de Referidos" />
      <ReferralCTABlock />
    </>
  )
}
