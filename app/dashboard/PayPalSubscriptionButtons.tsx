"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PayPalButtons,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js";

type ActivePlan = "pro" | "investor" | null;

export default function PayPalSubscriptionButtons() {
  const router = useRouter();

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const proPlan = process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID;
  const investorPlan = process.env.NEXT_PUBLIC_PAYPAL_INVESTOR_PLAN_ID;

  const [loadingPlan, setLoadingPlan] = useState<ActivePlan>(null);
  const [error, setError] = useState("");

  async function activatePlan(plan: "pro" | "investor", subscriptionId: string) {
    setLoadingPlan(plan);
    setError("");

    try {
      const response = await fetch("/api/paypal/activate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          subscriptionId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Plan konnte nicht aktiviert werden.");
      }

      router.refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Plan konnte nicht aktiviert werden."
      );
    } finally {
      setLoadingPlan(null);
    }
  }

  if (!clientId) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
        PayPal Client ID fehlt.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <PayPalScriptProvider
        options={{
          clientId,
          vault: true,
          intent: "subscription",
        }}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {proPlan ? (
            <div className="rounded-[26px] border border-white/10 bg-[#122556] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
              <div className="mb-4">
                <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Upgrade
                </div>
              </div>

              <h3 className="text-2xl font-semibold text-white">PRO Plan</h3>

              <p className="mt-2 text-sm leading-6 text-white/70">
                Für aktive Anleger mit mehr Platz im Depot.
              </p>

              <div className="mt-5 text-white">
                <div className="text-3xl font-semibold">4,99 €</div>
                <div className="mt-1 text-sm text-white/60">pro Monat</div>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-white/75">
                <li>• Bis zu 25 Aktien im Depot</li>
                <li>• Watchlist und News direkt in der App</li>
                <li>• Ideal für den täglichen Überblick</li>
              </ul>

              <div className="mt-6">
                {loadingPlan === "pro" ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                    PRO Plan wird aktiviert ...
                  </div>
                ) : (
                  <PayPalButtons
                    style={{
                      layout: "vertical",
                      color: "gold",
                      shape: "rect",
                      label: "subscribe",
                    }}
                    createSubscription={(_data, actions) => {
                      return actions.subscription.create({
                        plan_id: proPlan,
                      });
                    }}
                    onApprove={async (data) => {
                      if (!data.subscriptionID) {
                        throw new Error("Keine subscriptionID von PayPal erhalten.");
                      }

                      await activatePlan("pro", data.subscriptionID);
                    }}
                    onError={() => {
                      setError("PayPal konnte das PRO-Abo nicht starten.");
                    }}
                    onCancel={() => {
                      setError("Der PayPal-Vorgang wurde abgebrochen.");
                    }}
                  />
                )}
              </div>
            </div>
          ) : null}

          {investorPlan ? (
            <div className="rounded-[26px] border border-white/10 bg-[#122556] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
              <div className="mb-4">
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Premium
                </div>
              </div>

              <h3 className="text-2xl font-semibold text-white">
                Investor Plan
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/70">
                Für Nutzer mit voller Flexibilität und unbegrenztem Depot.
              </p>

              <div className="mt-5 text-white">
                <div className="text-3xl font-semibold">9,99 €</div>
                <div className="mt-1 text-sm text-white/60">pro Monat</div>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-white/75">
                <li>• Unbegrenzte Depotplätze</li>
                <li>• Große Watchlist und Marktbeobachtung</li>
                <li>• Maximale Freiheit für dein Depot</li>
              </ul>

              <div className="mt-6">
                {loadingPlan === "investor" ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                    Investor Plan wird aktiviert ...
                  </div>
                ) : (
                  <PayPalButtons
                    style={{
                      layout: "vertical",
                      color: "gold",
                      shape: "rect",
                      label: "subscribe",
                    }}
                    createSubscription={(_data, actions) => {
                      return actions.subscription.create({
                        plan_id: investorPlan,
                      });
                    }}
                    onApprove={async (data) => {
                      if (!data.subscriptionID) {
                        throw new Error("Keine subscriptionID von PayPal erhalten.");
                      }

                      await activatePlan("investor", data.subscriptionID);
                    }}
                    onError={() => {
                      setError("PayPal konnte das Investor-Abo nicht starten.");
                    }}
                    onCancel={() => {
                      setError("Der PayPal-Vorgang wurde abgebrochen.");
                    }}
                  />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </PayPalScriptProvider>
    </div>
  );
}