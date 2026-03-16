"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setStatus("Bitte eine E-Mail-Adresse eingeben.");
      return;
    }

    try {
      setBusy(true);
      setStatus("");

      const supabase = createClient();
      const baseUrl = window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setStatus(error.message || "Login-Link konnte nicht gesendet werden.");
        return;
      }

      setStatus("Der Login-Link wurde an deine E-Mail-Adresse gesendet.");
    } catch (error) {
      console.error(error);
      setStatus("Es ist ein Fehler aufgetreten.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0d1b3d] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="text-center">
          <Link
            href="/"
            className="inline-block text-sm text-blue-100/60 hover:text-white"
          >
            ← Zurück zur Startseite
          </Link>

          <p className="mt-6 text-xs uppercase tracking-[0.24em] text-blue-200/60">
            Morek 360 Depot
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Login zum Investment Dashboard
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-blue-100/75 sm:text-base">
            Fordere deinen persönlichen Login-Link an und greife auf Depot,
            Watchlist, Live-Kurse und Premium-Funktionen zu.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#122556] p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">Login / Zugang anfordern</h2>
            <p className="mt-2 text-sm text-blue-100/70">
              Gib deine E-Mail-Adresse ein. Du erhältst einen Magic Link für den
              direkten Zugang zu deinem Dashboard.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-blue-100/85"
                >
                  E-Mail-Adresse
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full rounded-2xl border border-white/10 bg-[#18306a] px-4 py-3 text-sm text-white outline-none placeholder:text-blue-100/35"
                  disabled={busy}
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl border border-white/10 bg-[#23438f] px-4 py-3 font-medium text-white hover:bg-[#2e53ab] disabled:opacity-50"
              >
                {busy ? "Link wird gesendet ..." : "Login-Link senden"}
              </button>

              {status ? (
                <p className="text-sm text-blue-100/75">{status}</p>
              ) : null}
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[#122556] p-5 shadow-2xl">
              <h2 className="text-lg font-semibold">Free</h2>
              <p className="mt-1 text-sm text-blue-100/60">Kostenlos starten</p>
              <div className="mt-4 text-3xl font-bold">0 €</div>

              <ul className="mt-5 space-y-2 text-sm text-blue-100/80">
                <li>✔ 5 Aktien im Depot</li>
                <li>✔ 5 Aktien in der Watchlist</li>
                <li>✔ Live-Kurse</li>
                <li>✔ Markt-News</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#122556] p-5 shadow-2xl">
              <h2 className="text-lg font-semibold">Pro Plan</h2>
              <p className="mt-1 text-sm text-blue-100/60">Für aktive Anleger</p>
              <div className="mt-4 text-3xl font-bold">4,99 €</div>

              <ul className="mt-5 space-y-2 text-sm text-blue-100/80">
                <li>✔ 25 Aktien im Depot</li>
                <li>✔ 25 Aktien in der Watchlist</li>
                <li>✔ Live-Kurse</li>
                <li>✔ Markt-News</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#18306a] p-5 shadow-2xl">
              <div className="inline-flex rounded-full border border-white/10 bg-[#23438f] px-3 py-1 text-xs uppercase tracking-wide text-white">
                Premium
              </div>

              <h2 className="mt-4 text-lg font-semibold">Investor Plan</h2>
              <p className="mt-1 text-sm text-blue-100/60">Für Profis</p>
              <div className="mt-4 text-3xl font-bold">9,99 €</div>

              <ul className="mt-5 space-y-2 text-sm text-blue-100/80">
                <li>✔ unbegrenztes Depot</li>
                <li>✔ unbegrenzte Watchlist</li>
                <li>✔ Robotics Score</li>
                <li>✔ Premium-Analysen</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}