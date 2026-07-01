import { PHONE, SMS_HREF, EMAIL, HOURS } from "@/app/site/we-pay-you-junk/_data/content";
import { BookingForm } from "@/app/site/we-pay-you-junk/_components/BookingForm";

export default function BookPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">starting at $100/hr &bull; 1 Hour Minimum &bull; Dump Fees Included</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Book Your <span className="gradient-text">Junk Removal</span> Today
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Fill out the form below and we&apos;ll call you to confirm your pickup. Same-day available.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Left — info */}
            <div>
              <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">How It Works</h2>
              <div className="mt-6 space-y-6">
                {[
                  { step: "1", title: "Fill Out the Form", desc: "Tell us your name, number, and what you need removed. Takes 60 seconds." },
                  { step: "2", title: "We Call You", desc: "Our team calls to confirm pricing, 1 hour minimum, and schedule your pickup." },
                  { step: "3", title: "We Show Up", desc: "Our crew arrives, loads your items, and appraises anything with resale value on the spot." },
                  { step: "4", title: "You Pay Less or Get Paid", desc: "50% Resale Credit (when applicable)s reduce your bill. If credits exceed the bill, we pay you the difference." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-bold text-white">{item.step}</div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 space-y-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Prefer to Text?</p>
                  <a href={SMS_HREF} className="mt-1 block text-xl font-bold text-slate-900 hover:text-teal-700 transition-colors">{PHONE}</a>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Email</p>
                  <a href={`mailto:${EMAIL}`} className="mt-1 block text-base text-slate-700 hover:text-teal-700 transition-colors">{EMAIL}</a>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Hours</p>
                  <p className="mt-1 text-base text-slate-700">{HOURS} &bull; 7 Days a Week</p>
                </div>
              </div>
            </div>

            {/* Right — booking form */}
            <div>
              <BookingForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
