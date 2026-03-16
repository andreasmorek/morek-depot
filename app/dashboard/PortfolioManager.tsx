"use client";

import { useEffect, useState } from "react";

type PortfolioItem = {
  id: string;
  symbol: string;
};

type QuoteData = {
  price: number | null;
  change: number | null;
};

export default function PortfolioManager({
  initialPortfolio,
  planName,
}: {
  initialPortfolio: PortfolioItem[];
  planName: string | null;
}) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initialPortfolio);
  const [symbol, setSymbol] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [prices, setPrices] = useState<Record<string, QuoteData>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  const limit =
    planName === "Investor Plan"
      ? 9999
      : planName === "Pro Plan"
      ? 25
      : 5;

  const usage =
    limit === 9999 ? `${portfolio.length} / unbegrenzt` : `${portfolio.length} / ${limit}`;

  const normalizeQuote = (data: any): QuoteData => {
    const price =
      typeof data?.price === "number"
        ? data.price
        : typeof data?.regularMarketPrice === "number"
        ? data.regularMarketPrice
        : typeof data?.quote?.price === "number"
        ? data.quote.price
        : null;

    const change =
      typeof data?.change === "number"
        ? data.change
        : typeof data?.changePercent === "number"
        ? data.changePercent
        : typeof data?.regularMarketChangePercent === "number"
        ? data.regularMarketChangePercent
        : typeof data?.quote?.change === "number"
        ? data.quote.change
        : null;

    return { price, change };
  };

  useEffect(() => {
    const loadPrices = async () => {
      if (portfolio.length === 0) {
        setPrices({});
        return;
      }

      try {
        setLoadingPrices(true);

        const entries = await Promise.all(
          portfolio.map(async (stock) => {
            try {
              const response = await fetch(
                `/api/quote?symbol=${encodeURIComponent(stock.symbol)}`,
                { cache: "no-store" }
              );

              if (!response.ok) {
                return [stock.symbol, { price: null, change: null }] as const;
              }

              const data = await response.json();
              return [stock.symbol, normalizeQuote(data)] as const;
            } catch (error) {
              console.error(`Quote error for ${stock.symbol}:`, error);
              return [stock.symbol, { price: null, change: null }] as const;
            }
          })
        );

        setPrices(Object.fromEntries(entries));
      } finally {
        setLoadingPrices(false);
      }
    };

    loadPrices();
  }, [portfolio]);

  const handleAdd = async () => {
    const cleanSymbol = symbol.trim().toUpperCase();

    if (!cleanSymbol) {
      setMessage("Bitte ein Symbol eingeben");
      return;
    }

    try {
      setBusy(true);
      setMessage("");

      const response = await fetch("/api/portfolio/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: cleanSymbol,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(result?.error || "Aktie konnte nicht hinzugefügt werden");
        return;
      }

      setPortfolio((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          symbol: cleanSymbol,
        },
      ]);

      setSymbol("");
      setMessage("Aktie hinzugefügt");
      window.location.reload();
    } catch (error) {
      console.error(error);
      setMessage("Serverfehler");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusy(true);
      setMessage("");

      const response = await fetch("/api/portfolio/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(result?.error || "Aktie konnte nicht gelöscht werden");
        return;
      }

      setPortfolio((prev) => prev.filter((item) => item.id !== id));
      setMessage("Aktie gelöscht");
    } catch (error) {
      console.error(error);
      setMessage("Serverfehler");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#122556] p-5 shadow-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Depot</h2>
          <p className="mt-1 text-sm text-blue-100/65">Nutzung: {usage}</p>
        </div>

        <div className="rounded-full border border-white/10 bg-[#1a3270] px-3 py-1 text-sm font-medium text-white">
          {planName ?? "Free Plan"}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Ticker eingeben, z. B. NVDA"
          className="w-full rounded-2xl border border-white/10 bg-[#18306a] px-4 py-3 text-sm text-white outline-none placeholder:text-blue-100/35"
          disabled={busy}
        />

        <button
          onClick={handleAdd}
          disabled={busy}
          className="rounded-2xl border border-white/10 bg-[#23438f] px-4 py-3 text-sm font-medium text-white hover:bg-[#2e53ab] disabled:opacity-50"
        >
          + Aktie hinzufügen
        </button>
      </div>

      {message ? (
        <p className="mt-3 text-sm text-blue-100/75">{message}</p>
      ) : null}

      {loadingPrices ? (
        <p className="mt-3 text-xs text-blue-100/50">Kurse werden geladen ...</p>
      ) : null}

      <div className="mt-4 space-y-2">
        {portfolio.length > 0 ? (
          portfolio.map((stock) => {
            const quote = prices[stock.symbol];
            const hasPrice = typeof quote?.price === "number";
            const hasChange = typeof quote?.change === "number";

            return (
              <div
                key={stock.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#18306a] p-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white">{stock.symbol}</div>

                  <div className="mt-1 text-sm">
                    {hasPrice ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-blue-100/80">
                          {quote.price?.toFixed(2)} USD
                        </span>

                        {hasChange ? (
                          <span
                            className={
                              (quote.change ?? 0) >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {(quote.change ?? 0) >= 0 ? "+" : ""}
                            {quote.change?.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-blue-100/35">–</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-blue-100/40">Kurs nicht verfügbar</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(stock.id)}
                  disabled={busy}
                  className="shrink-0 rounded-xl border border-white/10 bg-[#203e85] px-3 py-1 text-sm text-white/80 hover:bg-[#2b4f9f] disabled:opacity-50"
                >
                  Löschen
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-blue-100/50">Noch keine Aktien im Depot</p>
        )}
      </div>
    </div>
  );
}