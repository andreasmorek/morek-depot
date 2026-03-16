import Link from "next/link";
import LiveTicker from "./LiveTicker";

export default function HomePage() {
  return (
    <>
  

      <main className="min-h-screen bg-[#0d1b3d] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-6xl space-y-10">
          <section className="rounded-3xl border border-white/10 bg-[#122556] p-8 shadow-2xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-blue-200/60">
                Morek 360 Depot
              </p>

              <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
                Robotics & AI Investment Dashboard
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm text-blue-100/75 sm:text-base">
                Verfolge deine Aktien aus den Bereichen Robotik, künstliche
                Intelligenz und Zukunftstechnologie in einem modernen Dashboard
                mit Depot, Watchlist, Live-Kursen und News.
              </p>

              <p className="mx-auto mt-4 max-w-2xl text-sm text-blue-100/70">
                Jeder Zugang startet automatisch im kostenlosen <b>Free Plan</b>.
                Ein Upgrade auf <b>Pro</b> oder <b>Investor</b> kannst du später
                jederzeit direkt im Dashboard freischalten.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/10 bg-[#23438f] px-6 py-3 font-medium text-white hover:bg-[#2e53ab]"
                >
                  Kostenlos registrieren
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-2xl border border-white/10 bg-[#162c61] px-6 py-3 font-medium text-blue-100/90 hover:bg-[#1a3270]"
                >
                  Bereits registriert? Zum Login
                </Link>
              </div>

              <p className="mt-4 text-xs text-blue-100/50">
                Hinweis: Nach der Registrierung bitte einmal einloggen, damit dein
                persönliches Dashboard aktiviert wird.
              </p>
            </div>
          </section>

          <LiveTicker />

          <section className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-[#122556] p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">Free</h2>
              <p className="mt-1 text-sm text-blue-100/60">Kostenlos starten</p>

              <div className="mt-4 text-3xl font-bold">0 €</div>

              <ul className="mt-6 space-y-2 text-sm text-blue-100/80">
                <li>✔ 5 Aktien im Depot</li>
                <li>✔ 5 Aktien in der Watchlist</li>
                <li>✔ Live-Kurse</li>
                <li>✔ Markt-News</li>
              </ul>

              <p className="mt-6 text-xs text-blue-100/50">
                Einstieg für neue Nutzer
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#122556] p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">Pro Plan</h2>
              <p className="mt-1 text-sm text-blue-100/60">
                Für aktive Anleger
              </p>

              <div className="mt-4 text-3xl font-bold">4,99 €</div>

              <ul className="mt-6 space-y-2 text-sm text-blue-100/80">
                <li>✔ 25 Aktien im Depot</li>
                <li>✔ 25 Aktien in der Watchlist</li>
                <li>✔ Live-Kurse</li>
                <li>✔ Markt-News</li>
              </ul>

              <p className="mt-6 text-xs text-blue-100/50">
                Upgrade später direkt im Dashboard möglich
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#18306a] p-6 shadow-2xl">
              <div className="inline-flex rounded-full border border-white/10 bg-[#23438f] px-3 py-1 text-xs uppercase tracking-wide text-white">
                Premium
              </div>

              <h2 className="mt-4 text-xl font-semibold">Investor Plan</h2>
              <p className="mt-1 text-sm text-blue-100/60">
                Für ambitionierte Anleger
              </p>

              <div className="mt-4 text-3xl font-bold">9,99 €</div>

              <ul className="mt-6 space-y-2 text-sm text-blue-100/80">
                <li>✔ unbegrenztes Depot</li>
                <li>✔ unbegrenzte Watchlist</li>
                <li>✔ Robotics Score</li>
                <li>✔ Premium-Analysen</li>
              </ul>

              <p className="mt-6 text-xs text-blue-100/50">
                Upgrade jederzeit im Dashboard möglich
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}