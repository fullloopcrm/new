import { PHONE, PHONE_HREF, EMAIL, HOURS } from "@/app/site/theroadsidehelper/_data/content";
import { BookingForm } from "@/app/site/theroadsidehelper/_components/BookingForm";
import { ValuationHint } from "@/app/site/theroadsidehelper/_components/ValuationHint";

export default function BookPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">$149/hr flat &bull; 1-Hour Minimum &bull; 24/7</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Book Roadside Help Near Me — <span className="text-amber-300">24/7 at $149/hr</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Fill out the form below and a dispatcher will call you within 5 minutes with an ETA. Need help right now? Call <a href={PHONE_HREF} className="text-amber-300 hover:underline">{PHONE}</a>.
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
                  { step: "1", title: "Fill Out the Form", desc: "Tell us your location, vehicle, and the problem. Takes 60 seconds." },
                  { step: "2", title: "Dispatcher Calls You", desc: "Within 5 minutes. They confirm details, quote the rate, and dispatch the closest technician." },
                  { step: "3", title: "Tech Arrives Fast", desc: "Average response under 60 minutes in cities we serve. You'll get a text with their name and ETA." },
                  { step: "4", title: "Fixed & Rolling", desc: "Most jobs finish inside the 1-hour minimum. You pay the flat $149/hr rate — no surprise add-ons." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-base font-bold text-white">{item.step}</div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 space-y-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-700 font-cta">Need Help Right Now?</p>
                  <a href={PHONE_HREF} className="mt-1 block text-xl font-bold text-slate-900 hover:text-emerald-700 transition-colors">{PHONE}</a>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-700 font-cta">Email</p>
                  <a href={`mailto:${EMAIL}`} className="mt-1 block text-base text-slate-700 hover:text-emerald-700 transition-colors">{EMAIL}</a>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-700 font-cta">Hours</p>
                  <p className="mt-1 text-base text-slate-700">{HOURS}</p>
                </div>
              </div>
            </div>

            {/* Right — booking form */}
            <div>
              <BookingForm />
              <ValuationHint className="mt-4" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}