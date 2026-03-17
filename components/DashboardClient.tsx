"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type PortfolioTransaction = {
  id: string;
  symbol: string;
  name: string;
  wkn: string | null;
  region: string | null;
  currency: string;
  transaction_type: "buy" | "sell";
  quantity: number;
  price: number;
  fees: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
};

type DepotPosition = {
  symbol: string;
  name: string;
  wkn?: string;
  type: string;
  region: string;
  currency: string;
  quantity: number;
  invested: number;
  fees: number;
  averagePrice: number;
  transactions: number;
  notes: string[];
};

const DEFAULT_NEWS_SYMBOLS = ["NVDA", "TSLA", "ISRG", "ABB", "ROK", "SYM"];

const PLAN_LIMITS: Record<PlanType, number> = {
  free: 5,
  pro: 25,
  investor: Number.POSITIVE_INFINITY,
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardClient({
  userEmail,
  currentPlan,
}: DashboardClientProps) {
  const [portfolioTransactions, setPortfolioTransactions] = useState<
    PortfolioTransaction[]
  >([]);
  const [watchlistItems, setWatchlistItems] = useState<StockItem[]>([]);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("");
  const [transactionDate, setTransactionDate] = useState(getTodayDateString());
  const [note, setNote] = useState("");

  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const [formError, setFormError] = useState("");

  const depotLimit = PLAN_LIMITS[currentPlan];
  const watchlistLimit = PLAN_LIMITS[currentPlan];
  const hasUnlimitedDepot = !Number.isFinite(depotLimit);
  const hasUnlimitedWatchlist = !Number.isFinite(watchlistLimit);

  useEffect(() => {
    let isMounted = true;

    async function loadPortfolio() {
      try {
        setIsLoadingPortfolio(true);

        const response = await fetch("/api/portfolio", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!isMounted) return;

        if (!response.ok || !result?.ok) {
          setPortfolioTransactions([]);
          return;
        }

        setPortfolioTransactions(
          Array.isArray(result.transactions) ? result.transactions : []
        );
      } catch {
        if (isMounted) {
          setPortfolioTransactions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPortfolio(false);
        }
      }
    }

    loadPortfolio();

    return () => {
      isMounted = false;
    };
  }, []);

  function isSameStock(a: StockItem, b: StockItem) {
    return (
      a.symbol.trim().toUpperCase() === b.symbol.trim().toUpperCase() &&
      a.name.trim() === b.name.trim() &&
      (a.wkn || "").trim() === (b.wkn || "").trim()
    );
  }

  const depotPositions = useMemo<DepotPosition[]>(() => {
    const grouped = new Map<string, DepotPosition>();

    for (const tx of portfolioTransactions) {
      const symbol = tx.symbol?.trim().toUpperCase() || "";
      const name = tx.name?.trim() || symbol;
      const wkn = tx.wkn ?? undefined;
      const region = tx.region ?? "Unbekannt";
      const currency = tx.currency || "EUR";
      const key = `${symbol}__${wkn || name}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          symbol,
          name,
          wkn,
          type: "stock",
          region,
          currency,
          quantity: 0,
          invested: 0,
          fees: 0,
          averagePrice: 0,
          transactions: 0,
          notes: [],
        });
      }

      const position = grouped.get(key)!;

      if (tx.transaction_type === "buy") {
        position.quantity += Number(tx.quantity || 0);
        position.invested +=
          Number(tx.quantity || 0) * Number(tx.price || 0) +
          Number(tx.fees || 0);
        position.fees += Number(tx.fees || 0);
      } else {
        position.quantity -= Number(tx.quantity || 0);
        position.invested -= Number(tx.quantity || 0) * Number(tx.price || 0);
      }

      position.transactions += 1;

      if (tx.note?.trim()) {
        position.notes.push(tx.note.trim());
      }
    }

    return Array.from(grouped.values())
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        ...item,
        averagePrice: item.quantity > 0 ? item.invested / item.quantity : 0,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [portfolioTransactions]);

  const depotItems = useMemo<StockItem[]>(() => {
    return depotPositions.map((position) => ({
      symbol: position.symbol,
      name: position.name,
      wkn: position.wkn,
      type: position.type,
      region: position.region,
      currency: position.currency,
    }));
  }, [depotPositions]);

  const depotCount = depotPositions.length;
  const watchlistCount = watchlistItems.length;

  const totalInvested = useMemo(() => {
    return depotPositions.reduce((sum, item) => sum + item.invested, 0);
  }, [depotPositions]);

  const totalDepotValue = useMemo(() => {
    return depotPositions.reduce((sum, item) => sum + item.invested, 0);
  }, [depotPositions]);

  const performanceValue = 0;

  function canAddToDepot(stock: StockItem) {
    const alreadyExists = depotItems.some((item) => isSameStock(item, stock));

    if (alreadyExists) {
      setUpgradeMessage("");
      return true;
    }

    if (!hasUnlimitedDepot && depotCount >= depotLimit) {
      setUpgradeMessage(
        `Dein ${currentPlan.toUpperCase()} Depot ist aktuell auf ${depotLimit} Aktien begrenzt. Upgrade auf PRO oder Investor, um mehr Werte hinzuzufügen.`
      );
      return false;
    }

    setUpgradeMessage("");
    return true;
  }

  function canAddToWatchlist(stock: StockItem) {
    const alreadyExists = watchlistItems.some((item) => isSameStock(item, stock));

    if (alreadyExists) {
      setUpgradeMessage("");
      return true;
    }

    if (!hasUnlimitedWatchlist && watchlistItems.length >= watchlistLimit) {
      setUpgradeMessage(
        `Deine ${currentPlan.toUpperCase()} Watchlist ist aktuell auf ${watchlistLimit} Aktien begrenzt. Upgrade auf PRO oder Investor, um mehr Werte hinzuzufügen.`
      );
      return false;
    }

    setUpgradeMessage("");
    return true;
  }

  function openDepotModal(stock: StockItem) {
    if (!canAddToDepot(stock)) return;

    setSelectedStock(stock);
    setQuantity("");
    setPrice("");
    setFees("");
    setTransactionDate(getTodayDateString());
    setNote("");
    setFormError("");
  }

  function closeDepotModal() {
    setSelectedStock(null);
    setQuantity("");
    setPrice("");
    setFees("");
    setTransactionDate(getTodayDateString());
    setNote("");
    setFormError("");
    setIsSavingTransaction(false);
  }

  async function saveDepotTransaction() {
    if (!selectedStock) return;

    const parsedQuantity = Number(quantity.replace(",", "."));
    const parsedPrice = Number(price.replace(",", "."));
    const parsedFees = fees.trim() === "" ? 0 : Number(fees.replace(",", "."));

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError("Bitte eine gültige Stückzahl eingeben.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError("Bitte einen gültigen Kaufpreis eingeben.");
      return;
    }

    if (!Number.isFinite(parsedFees) || parsedFees < 0) {
      setFormError("Bitte gültige Nebenkosten eingeben.");
      return;
    }

    if (!transactionDate) {
      setFormError("Bitte ein gültiges Kaufdatum wählen.");
      return;
    }

    try {
      setIsSavingTransaction(true);
      setFormError("");

      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          wkn: selectedStock.wkn,
          region: selectedStock.region,
          currency: selectedStock.currency || "EUR",
          transactionType: "buy",
          quantity: parsedQuantity,
          price: parsedPrice,
          fees: parsedFees,
          note,
          transactionDate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.ok || !result?.transaction) {
        setFormError(
          result?.error || "Die Depot-Position konnte nicht gespeichert werden."
        );
        setIsSavingTransaction(false);
        return;
      }

      setPortfolioTransactions((prev) => [
        result.transaction as PortfolioTransaction,
        ...prev,
      ]);

      setWatchlistItems((prev) =>
        prev.filter((item) => !isSameStock(item, selectedStock))
      );

      closeDepotModal();
    } catch {
      setFormError("Beim Speichern ist ein Fehler aufgetreten.");
      setIsSavingTransaction(false);
    }
  }

  function handleAddToDepot(stock: StockItem) {
    openDepotModal(stock);
  }

  function handleAddToWatchlist(stock: StockItem) {
    if (!canAddToWatchlist(stock)) return;

    setWatchlistItems((prev) => {
      if (prev.some((item) => isSameStock(item, stock))) {
        return prev;
      }
      return [stock, ...prev];
    });

    setUpgradeMessage("");
  }

  function removeFromWatchlist(stock: StockItem) {
    setWatchlistItems((prev) =>
      prev.filter((item) => !isSameStock(item, stock))
    );

    if (!hasUnlimitedWatchlist && watchlistItems.length - 1 < watchlistLimit) {
      setUpgradeMessage("");
    }
  }

  const formattedPerformance = useMemo(() => {
    return formatCurrency(performanceValue);
  }, [performanceValue]);

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
    <>
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
                Depot, Käufe, Verkäufe, Nachkäufe und Watchlist an einem Ort.
                Suche weiter über WKN, Namen und Symbol direkt im Dashboard.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                  {hasUnlimitedDepot
                    ? "Unbegrenztes Depot aktiv"
                    : `${depotCount} von ${depotLimit} Depot-Plätzen genutzt`}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                  {hasUnlimitedWatchlist
                    ? "Unbegrenzte Watchlist aktiv"
                    : `${watchlistCount} von ${watchlistLimit} Watchlist-Plätzen genutzt`}
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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
              <div className="rounded-2xl border border-white/10 bg-[#10245c] px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Depotwert
                </div>
                <div className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[26px] md:text-[28px]">
                  {formatCurrency(totalDepotValue)}
                </div>
                <div className="mt-2 text-xs text-white/45">offener Einstand</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#10245c] px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Investiert
                </div>
                <div className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[26px] md:text-[28px]">
                  {formatCurrency(totalInvested)}
                </div>
                <div className="mt-2 text-xs text-white/45">alle Käufe brutto</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#10245c] px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Positionen
                </div>
                <div className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[26px] md:text-[28px]">
                  {depotCount}
                </div>
                <div className="mt-2 text-xs text-white/45">aktuell offen</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#10245c] px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Performance
                </div>
                <div className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-emerald-300 sm:text-[26px] md:text-[28px]">
                  {formattedPerformance}
                </div>
                <div className="mt-2 text-xs text-white/45">realisiert</div>
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
                    Deine gekauften Werte erscheinen hier mit echten Depotdaten.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70">
                  {hasUnlimitedDepot
                    ? `${depotCount} Werte`
                    : `${depotCount} / ${depotLimit}`}
                </div>
              </div>

              {isLoadingPortfolio ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d2157] px-4 py-12 text-center text-sm text-white/45">
                  Depot wird geladen...
                </div>
              ) : depotPositions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d2157] px-4 py-12 text-center text-sm text-white/45">
                  Noch keine Positionen im Depot.
                </div>
              ) : (
                <div className="space-y-3">
                  {depotPositions.map((stock) => (
                    <div
                      key={`depot-${stock.symbol}-${stock.wkn || stock.name}`}
                      className="rounded-2xl border border-white/10 bg-[#0d2157] p-4"
                    >
                      <div className="flex flex-col gap-4">
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
                              onClick={() =>
                                handleAddToDepot({
                                  symbol: stock.symbol,
                                  name: stock.name,
                                  wkn: stock.wkn,
                                  type: stock.type,
                                  region: stock.region,
                                  currency: stock.currency,
                                })
                              }
                              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
                            >
                              Nachkaufen
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleAddToWatchlist({
                                  symbol: stock.symbol,
                                  name: stock.name,
                                  wkn: stock.wkn,
                                  type: stock.type,
                                  region: stock.region,
                                  currency: stock.currency,
                                })
                              }
                              className="rounded-xl border border-white/10 bg-[#1a347a] px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-[#23408d]"
                            >
                              Zur Watchlist
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.15em] text-white/45">
                              Stückzahl
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {formatNumber(stock.quantity)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.15em] text-white/45">
                              Investiert
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {formatCurrency(stock.invested, stock.currency)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.15em] text-white/45">
                              Ø Kaufpreis
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {formatCurrency(stock.averagePrice, stock.currency)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.15em] text-white/45">
                              Käufe
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {stock.transactions}
                            </div>
                          </div>
                        </div>

                        {stock.notes.length > 0 ? (
                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.15em] text-white/45">
                              Notizen
                            </div>
                            <div className="mt-2 text-sm leading-6 text-white/80">
                              {stock.notes[stock.notes.length - 1]}
                            </div>
                          </div>
                        ) : null}
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

      {selectedStock ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#132b6b] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Depotkauf erfassen
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {selectedStock.symbol} · {selectedStock.name}
                  {selectedStock.wkn ? ` · WKN ${selectedStock.wkn}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDepotModal}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10"
              >
                Schließen
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Stückzahl
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0d2157] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/40"
                  placeholder="z. B. 10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Kaufpreis pro Aktie
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0d2157] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/40"
                  placeholder="z. B. 125,50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Nebenkosten
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0d2157] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/40"
                  placeholder="z. B. 4,90"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Kaufdatum
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0d2157] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Notiz
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-[#0d2157] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/40"
                  placeholder="Optional, z. B. erster Einstieg oder Nachkauf"
                />
              </div>
            </div>

            {formError ? (
              <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {formError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveDepotTransaction}
                disabled={isSavingTransaction}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingTransaction ? "Speichert..." : "Depotkauf speichern"}
              </button>

              <button
                type="button"
                onClick={closeDepotModal}
                disabled={isSavingTransaction}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}