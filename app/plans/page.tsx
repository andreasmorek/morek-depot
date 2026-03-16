import PayPalSubscriptionButtons from "@/app/dashboard/PayPalSubscriptionButtons";

export default function PlansPage() {
  return (
    <main className="min-h-screen bg-[#081a4b] text-white">
      <section className="mx-auto w-full max-w-[1100px] px-4 py-10 md:px-6">
        <div className="rounded-[30px] border border-white/10 bg-[#132b6b] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.24)] md:p-8">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Morek 360 Depot
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Starte kostenlos und upgrade bei Bedarf
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-8 text-white/75">
              Jeder Nutzer startet mit einem Free Depot. Wenn du mehr
              Depotplätze brauchst, kannst du direkt in der App auf PRO oder
              Investor upgraden.
            </p>
          </div>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-[#10245c] p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Free Depot</h2>
              <p className="mt-1 text-sm leading-6 text-white/65">
                Kostenloser Start mit bis zu 5 Aktien im Depot.
              </p>
            </div>

            <PayPalSubscriptionButtons />
          </div>
        </div>
      </section>
    </main>
  );
}