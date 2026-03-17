import Link from "next/link";

export default function ProPaywall() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
        Morek 360 Depot Pro
      </div>

      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        Upgrade auf Pro
      </h2>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
        Dein aktueller Zugang enthält diese Premium-Bereiche noch nicht. Mit Pro
        bekommst du den vollen Zugriff auf das Morek 360 Depot.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-white">Depot Performance</div>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Performance, Werteentwicklung und sauberer Überblick über dein Depot.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-white">Robotics Movers</div>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Die spannendsten Bewegungen im Robotics-Sektor auf einen Blick.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-white">Premium News</div>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Relevante News passend zu Depot und Watchlist ohne Umwege.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard/plans"
          className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
        >
          Jetzt Pro freischalten
        </Link>

        <Link
          href="/dashboard/abo-kuendigen"
          className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Abo verwalten
        </Link>
      </div>
    </div>
  );
}