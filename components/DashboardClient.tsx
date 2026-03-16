"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LiveTicker from "@/app/LiveTicker";
import NewsPanel from "@/app/dashboard/NewsPanel";
import StockSearch from "@/components/StockSearch";

type StockItem = {
  symbol: string;
  name: string;
  wkn?: string;
  type: string;
  region: string;
  currency?: string;
};

type PlanType = "free" | "pro" | "investor";

type DashboardClientProps = {
  userEmail: string;
  currentPlan: PlanType;
};

const DEFAULT_NEWS_SYMBOLS = ["NVDA", "TSLA", "ISRG", "ABB", "ROK", "SYM"];

const PLAN_LIMITS: Record<PlanType, number> = {
  free: 5,
  pro: 25,
  investor: Number.POSITIVE_INFINITY,
};

export default function DashboardClient({
  userEmail,
  currentPlan,
}: DashboardClientProps) {
  const [depotItems, setDepotItems] = useState<StockItem[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<StockItem[]>([]);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const depotLimit = PLAN_LIMITS[currentPlan];
  const hasUnlimitedDepot = !Number.isFinite(depotLimit);
  const depotCount = depotItems.length;
  const watchlistCount = watchlistItems.length;

  function isSameStock(a: StockItem, b: StockItem) {
    return (
      a.symbol.trim().toUpperCase() === b.symbol.trim().toUpperCase() &&
      a.name.trim() === b.name.trim() &&
      (a.wkn || "").trim() === (b.wkn || "").trim()
    );
  }

  function canAddToDepot(stock: StockItem) {
    const alreadyExists = depotItems.some((item) => isSameStock(item, stock));

    if (alreadyExists) {
      setUpgradeMessage("");
      return true;
    }

    if (!hasUnlimitedDepot && depotItems.length >= depotLimit) {
      setUpgradeMessage(
        `Dein ${currentPlan.toUpperCase()} Depot ist aktuell auf ${depotLimit} Aktien begrenzt. Upgrade auf PRO oder Investor, um mehr Werte hinzuzufügen.`
      );
      return false;
    }

    setUpgradeMessage("");
    return true;
  }

  function handleAddToDepot(stock: StockItem) {
    if (!canAddToDepot(stock)) return;

    setDepotItems((prev) => {
      if (prev.some((item) => isSameStock(item, stock))) {
        return prev;
      }
      return [stock, ...prev];
    });

    setWatchlistItems((prev) =>
      prev.filter((item) => !isSameStock(item, stock))
    );
  }

  function handleAddToWatchlist(stock: StockItem) {
    setUpgradeMessage("");

    setWatchlistItems((prev) => {
      if (prev.some((item) => isSameStock(item, stock))) {
        return prev;
      }
      return [stock, ...prev];
    });

    setDepotItems((prev) => prev.filter((item) => !isSameStock(item, stock)));
  }

  function removeFromDepot(stock: StockItem) {
    setDepotItems((prev) => prev.filter((item) => !isSameStock(item, stock)));

    if (!hasUnlimitedDepot && depotItems.length - 1 < depotLimit) {
      setUpgradeMessage("");
    }
  }

  function removeFromWatchlist(stock: StockItem) {
    setWatchlistItems((prev) =>
      prev.filter((item) => !isSameStock(item, stock))
    );
  }

  const formattedPerformance = useMemo(() => "0,00 %", []);

  const planLabel = useMemo(() => {
    if (currentPlan === "investor") return "Investor";
    if (currentPlan === "pro") return "PRO";
    return "Free";
  }, [currentPlan]);

  const newsSymbols = useMemo(() => {
    const merged = [...depotItems, ...watchlistItems];
    const uniqueSymbols: string[] = [];

    for (const item of merged) {
      const symbol = item.symbol?.trim().toUpperCase();
      if (!symbol) continue;

      if (!uniqueSymbols.includes(symbol)) {
        uniqueSymbols.push(symbol);
      }
    }

    return uniqueSymbols.length > 0
      ? uniqueSymbols.slice(0, 8)
      : DEFAULT_NEWS_SYMBOLS;
  }, [depotItems, watchlistItems]);

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/10 bg-[#132b6b] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.24)] md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Morek 360 Depot
              </span>

              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                {userEmail}
              </span>

              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                Plan: {planLabel}
              </span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Dein persönliches Aktien-Dashboard
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-8 text-white/75">
              Depot, Watchlist und Marktüberblick an einem Ort. Suche über WKN,
              Namen und Symbol direkt im Dashboard.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                {hasUnlimitedDepot
                  ? "Unbegrenztes Depot aktiv"
                  : `${depotCount} von ${depotLimit} Depot-Plätzen genutzt`}
              </div>

              {currentPlan === "free" || currentPlan === "pro" ? (
                <Link
                  href="/plans"
                  className="inline-flex items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
                >
                  Jetzt upgraden
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[500px]">
            <div className="rounded-2xl border border-white/10 bg-[#10245c] px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                Depotwert
              </div>
              <div className="mt-2 text-2xl font-semibold leading-none text-white md:text-[30px]">
                0,00 €
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#10245c] px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                Positionen
              </div>
              <div className="mt-2 text-2xl font-semibold leading-none text-white md:text-[30px]">
                {depotCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#10245c] px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                Watchlist
              </div>
              <div className="mt-2 text-2xl font-semibold leading-none text-white md:text-[30px]">
                {watchlistCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#10245c] px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                Performance
              </div>
              <div className="mt-2 text-2xl font-semibold leading-none text-emerald-300 md:text-[30px]">
                {formattedPerformance}
              </div>
            </div>
          </div>
        </div>
      </section>

      {upgradeMessage ? (
        <section className="rounded-[24px] border border-amber-300/20 bg-amber-400/10 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-200">
                Limit erreicht
              </div>
              <p className="mt-1 text-sm leading-6 text-amber-100/90">
                {upgradeMessage}
              </p>
            </div>

            <Link
              href="/plans"
              className="inline-flex items-center justify-center rounded-xl border border-amber-200/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Upgrade ansehen
            </Link>
          </div>
        </section>
      ) : null}

      <LiveTicker />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-[26px] border border-white/10 bg-[#132b6b] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
            <StockSearch
              onAddToDepot={handleAddToDepot}
              onAddToWatchlist={handleAddToWatchlist}
            />
          </section>

          <section className="rounded-[26px] border border-white/10 bg-[#132b6b] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Depot</h2>
                <p className="mt-1 text-sm leading-6 text-white/65">
                  Deine gekauften Werte erscheinen hier.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70">
                {hasUnlimitedDepot
                  ? `${depotCount} Werte`
                  : `${depotCount} / ${depotLimit}`}
              </div>
            </div>

            {depotItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d2157] px-4 py-12 text-center text-sm text-white/45">
                Noch keine Positionen im Depot.
              </div>
            ) : (
              <div className="space-y-3">
                {depotItems.map((stock) => (
                  <div
                    key={`depot-${stock.symbol}-${stock.wkn || stock.name}`}
                    className="rounded-2xl border border-white/10 bg-[#0d2157] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-white">
                          {stock.symbol}
                        </div>
                        <div className="mt-1 text-sm text-white/85">
                          {stock.name}
                        </div>
                        <div className="mt-1 text-xs text-white/50">
                          {stock.region}
                          {stock.wkn ? ` • WKN ${stock.wkn}` : ""}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddToWatchlist(stock)}
                          className="rounded-xl border border-white/10 bg-[#1a347a] px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-[#23408d]"
                        >
                          Zur Watchlist
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromDepot(stock)}
                          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/15"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div>
          <section className="rounded-[26px] border border-white/10 bg-[#132b6b] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Watchlist</h2>
              <p className="mt-1 text-sm leading-6 text-white/65">
                Beobachtete Titel ohne Kauf.
              </p>
            </div>

            {watchlistItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d2157] px-4 py-12 text-center text-sm text-white/45">
                Noch keine Werte auf der Watchlist.
              </div>
            ) : (
              <div className="space-y-3">
                {watchlistItems.map((stock) => (
                  <div
                    key={`watchlist-${stock.symbol}-${stock.wkn || stock.name}`}
                    className="rounded-2xl border border-white/10 bg-[#0d2157] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-white">
                          {stock.symbol}
                        </div>
                        <div className="mt-1 text-sm text-white/85">
                          {stock.name}
                        </div>
                        <div className="mt-1 text-xs text-white/50">
                          {stock.region}
                          {stock.wkn ? ` • WKN ${stock.wkn}` : ""}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddToDepot(stock)}
                          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
                        >
                          Zum Depot
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromWatchlist(stock)}
                          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/15"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div>
          <section className="rounded-[26px] border border-white/10 bg-[#132b6b] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">News</h2>
              <p className="mt-1 text-sm leading-6 text-white/65">
                News zu Depot, Watchlist und relevanten Marktbewegungen.
              </p>
            </div>

            <NewsPanel symbols={newsSymbols} />
          </section>
        </div>
      </div>
    </div>
  );
}