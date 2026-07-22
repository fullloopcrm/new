import ReferralSignupForm from '@/app/site/nycmaid/_components/ReferralSignupForm'

const en = {
  heroTitle: 'Get Paid for Cleaning Referrals',
  heroBody: 'Earn 10% commission every time someone you refer books a cleaning with The NYC Maid. No limit on referrals. Recurring income for as long as they stay a customer.',
  benefits: [
    { big: '10%', label: 'Commission', body: 'On every cleaning your referral books — not just the first one.' },
    { big: 'Recurring', label: 'Income', body: 'Every time they book, you earn. Weekly clients mean weekly payouts.' },
    { big: 'Fast', label: 'Payouts', body: 'Paid via Zelle or Apple Cash after each completed cleaning.' },
  ],
  howItWorksLabel: 'How It Works',
  howItWorksTitle: 'Three Simple Steps',
  steps: [
    { title: 'Sign Up & Get Your Link', body: "Fill out the form — takes 30 seconds. You'll receive a unique referral link and code." },
    { title: 'Share With Friends & Family', body: 'Send your link to anyone who needs cleaning in NYC, Long Island, or NJ. They book using your link.' },
    { title: 'Earn 10% Every Time', body: 'You get 10% of every cleaning they book — paid after each completed visit. No cap on earnings.' },
  ],
  whyLabel: 'Why It Works',
  why: [
    'No cost to you — ever',
    'No sales pitch needed — just share your link',
    'Your referrals get the same great rates',
    'Track everything in your referral dashboard',
    'Unlimited referrals, unlimited earnings',
  ],
  earningsLabel: 'Example Earnings',
  earningsTitle: 'See How Quickly It Adds Up',
  earnings: [
    { label: '1 referral, weekly cleaning', value: '$25+/mo' },
    { label: '5 referrals, bi-weekly', value: '$60+/mo' },
    { label: '10 referrals, weekly', value: '$250+/mo' },
  ],
}

const es = {
  heroTitle: 'Gana Dinero por Referir Clientes de Limpieza',
  heroBody: 'Gana 10% de comisión cada vez que alguien que refieras reserve una limpieza con The NYC Maid. Sin límite de referidos. Ingresos recurrentes mientras sigan siendo clientes.',
  benefits: [
    { big: '10%', label: 'Comisión', body: 'En cada limpieza que reserve tu referido — no solo la primera.' },
    { big: 'Recurrente', label: 'Ingreso', body: 'Cada vez que reservan, tú ganas. Clientes semanales significan pagos semanales.' },
    { big: 'Rápido', label: 'Pagos', body: 'Se paga por Zelle o Apple Cash después de cada limpieza completada.' },
  ],
  howItWorksLabel: 'Cómo Funciona',
  howItWorksTitle: 'Tres Pasos Simples',
  steps: [
    { title: 'Regístrate y Obtén Tu Enlace', body: 'Llena el formulario — toma 30 segundos. Recibirás un enlace y código de referido único.' },
    { title: 'Comparte con Amigos y Familia', body: 'Envía tu enlace a quien necesite limpieza en NYC, Long Island o NJ. Reservan usando tu enlace.' },
    { title: 'Gana 10% Cada Vez', body: 'Obtienes el 10% de cada limpieza que reserven — pagado después de cada visita completada. Sin límite de ganancias.' },
  ],
  whyLabel: 'Por Qué Funciona',
  why: [
    'Sin costo para ti — nunca',
    'No necesitas vender nada — solo comparte tu enlace',
    'Tus referidos obtienen las mismas excelentes tarifas',
    'Rastrea todo en tu panel de referidos',
    'Referidos ilimitados, ganancias ilimitadas',
  ],
  earningsLabel: 'Ejemplo de Ganancias',
  earningsTitle: 'Mira Qué Rápido Se Suma',
  earnings: [
    { label: '1 referido, limpieza semanal', value: '$25+/mes' },
    { label: '5 referidos, quincenal', value: '$60+/mes' },
    { label: '10 referidos, semanal', value: '$250+/mes' },
  ],
}

export default function ReferralPageBody() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#1E2A4A] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-1">
            {en.heroTitle}
          </h1>
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[#A8F0DC] tracking-wide leading-[0.95] mb-6">
            {es.heroTitle}
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl leading-relaxed">
            {en.heroBody}
          </p>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed mt-3 italic">
            {es.heroBody}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {en.benefits.map((b, i) => (
            <div key={b.label} className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-8 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#1E2A4A] tracking-wide mb-2">{b.big}</p>
              <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">{b.label} / {es.benefits[i].label}</p>
              <p className="text-gray-600 text-sm">{b.body}</p>
              <p className="text-gray-400 text-sm italic mt-1">{es.benefits[i].body}</p>
            </div>
          ))}
        </div>

        {/* Video */}
        <div className="mb-16">
          <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
            <iframe
              src="https://www.youtube.com/embed/MhVjNiZtB_E"
              title="The NYC Maid Referral Program"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Two-column: How it Works + Signup Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-4">{en.howItWorksLabel} / {es.howItWorksLabel}</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-1">{en.howItWorksTitle}</p>
            <p className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A]/60 tracking-wide mb-8">{es.howItWorksTitle}</p>

            <div className="space-y-8">
              {en.steps.map((s, i) => (
                <div key={s.title} className="flex gap-5">
                  <div className="w-10 h-10 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</div>
                  <div>
                    <h3 className="font-semibold text-[#1E2A4A] text-lg mb-0.5">{s.title}</h3>
                    <h3 className="font-semibold text-[#1E2A4A]/60 text-base mb-1">{es.steps[i].title}</h3>
                    <p className="text-gray-600">{s.body}</p>
                    <p className="text-gray-400 italic mt-1">{es.steps[i].body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-12 h-[2px] bg-[#A8F0DC] my-10" />

            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-4">{en.whyLabel} / {es.whyLabel}</h2>
            <ul className="space-y-3">
              {en.why.map((item, i) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#A8F0DC] mt-1 text-lg">&#10003;</span>
                  <span>
                    <span className="text-gray-700 block">{item}</span>
                    <span className="text-gray-400 italic block">{es.why[i]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ReferralSignupForm />
        </div>

        {/* Earnings example */}
        <div className="bg-white border border-gray-200 rounded-xl p-10 mb-16 text-center">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">{en.earningsLabel} / {es.earningsLabel}</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-1">{en.earningsTitle}</p>
          <p className="font-[family-name:var(--font-bebas)] text-lg text-[#1E2A4A]/60 tracking-wide mb-6">{es.earningsTitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {en.earnings.map((e, i) => (
              <div key={e.label} className={`p-5 rounded-xl ${i === 2 ? 'bg-[#F5FBF8] border border-[#A8F0DC]/30' : 'bg-gray-50'}`}>
                <p className="text-sm text-gray-500">{e.label}</p>
                <p className="text-sm text-gray-400 italic mb-1">{es.earnings[i].label}</p>
                <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">{e.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
