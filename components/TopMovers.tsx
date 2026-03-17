"use client";

import { useEffect, useMemo, useState } from "react";

type StockItem = {
  symbol: string;
  name: string;
  wkn?: string;
  type?: string;
  region?: string;
  currency?: string;
};

type QuoteResponse = {
  ok?: boolean;
  price?: number | null;
  change?: number | null;
  error?: string;
};

type NewsArticle = {
  title?: string;
  symbol?: string;
  symbols?: string[];
};

type NewsResponse = {
  articles?: NewsArticle[];
};

type MoversItem = {
  symbol: string;
  name: string;
  change: number;
  price: number | null;
};

type TopMoversProps = {
  depotItems?: StockItem[];
  watchlistItems?: StockItem[];
};

const FALLBACK_ROBOTICS_STOCKS: StockItem[] = [
  { symbol: "NVDA", name: "Nvidia" },
  { symbol: "ISRG", name: "Intuitive Surgical" },
  { symbol: "ABB", name: "ABB" },
  { symbol: "ROK", name: "Rockwell Automation" },
  { symbol: "SYM", name: "Symbotic" },
  { symbol: "PATH", name: "UiPath" },
  { symbol: "TER", name: "Teradyne" },
  { symbol: "TSLA", name: "Tesla" },
];

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2).replace(".", ",")} %`;
}

function formatPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) return "–";
  return `${value.toFixed(2).replace(".", ",")} $`;
}

function dedupeStocks(stocks: StockItem[]) {
  const seen = new Set<string>();
  const result: StockItem[] = [];

  for (const stock of stocks) {
    const symbol = stock.symbol?.trim().toUpperCase();
    if (!symbol) continue;
    if (seen.has(symbol)) continue;

    seen.add(symbol);
    result.push({
      ...stock,
      symbol,
      name: stock.name?.trim() || symbol,
    });
  }

  return result;
}

export default function TopMovers({
  depotItems = [],
  watchlistItems = [],
}: TopMoversProps) {
  const [items, setItems] = useState<MoversItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostMentioned, setMostMentioned] = useState<string>("–");

  const prioritizedStocks = useMemo(() => {
    const merged = dedupeStocks([
      ...depotItems,
      ...watchlistItems,
      ...FALLBACK_ROBOTICS_STOCKS,
    ]);

    return merged.slice(0, 10);
  }, [depotItems, watchlistItems]);

  const prioritizedSymbols = useMemo(() => {
    return prioritizedStocks.map((stock) => stock.symbol);
  }, [prioritizedStocks]);

  useEffect(() => {
    let cancelled = false;

    async function loadMovers() {
      setLoading(true);

      try {
        const quoteResults = await Promise.all(
          prioritizedStocks.map(async (stock) => {
            try {
              const response = await fetch(
                `/api/quote?symbol=${encodeURIComponent(stock.symbol)}`,
                { cache: "no-store" }
              );

              const data: QuoteResponse = await response.json();

              if (!response.ok || !data?.ok || typeof data.change !== "number") {
                return null;
              }

              return {
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                change: data.change,
                price: typeof data.price === "number" ? data.price : null,
              } as MoversItem;
            } catch {
              return null;
            }
          })
        );

        const validItems = quoteResults.filter(
          (item): item is MoversItem => item !== null
        );

        if (!cancelled) {
          setItems(validItems);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      }

      try {
        const response = await fetch(
          `/api/news?symbols=${encodeURIComponent(prioritizedSymbols.join(","))}`,
          { cache: "no-store" }
        );

        const data: NewsResponse = await response.json();
        const counts: Record<string, number> = {};

        for (const symbol of prioritizedSymbols) {
          counts[symbol] = 0;
        }

        if (Array.isArray(data?.articles)) {
          for (const article of data.articles) {
            const articleSymbols = Array.isArray(article.symbols)
              ? article.symbols
              : article.symbol
                ? [article.symbol]
                : [];

            for (const rawSymbol of articleSymbols) {
              const symbol = String(rawSymbol).trim().toUpperCase();
              if (counts[symbol] !== undefined) {
                counts[symbol] += 1;
              }
            }
          }
        }

        const topSymbol =
          Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "–";

        const topName =
          prioritizedStocks.find((stock) => stock.symbol === topSymbol)?.name ??
          topSymbol;

        if (!cancelled) {
          setMostMentioned(topName || "–");
        }
      } catch {
        if (!cancelled) {
          setMostMentioned("–");
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    loadMovers();

    return () => {
      cancelled = true;
    };
  }, [prioritizedStocks, prioritizedSymbols]);

  const winners = useMemo(() => {
    return [...items]
      .filter((item) => item.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 3);
  }, [items]);

  const losers = useMemo(() => {
    return [...items]
      .filter((item) => item.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 3);
  }, [items]);

  const sourceHint = useMemo(() => {
    if (depotItems.length > 0 || watchlistItems.length > 0) {
      return "Basierend auf Depot, Watchlist und ergänzenden Robotics-Werten.";
    }

    return "Basierend auf ausgewählten Robotics-Aktien.";
  }, [depotItems.length, watchlistItems.length]);

  return (
    <section className="rounded-[26px] border border-white/10 bg-[#132b6b] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">
          Top Robotics Movers heute
        </h2>
        <p className="mt-1 text-sm leading-6 text-white/65">{sourceHint}</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d2157] px-4 py-10 text-center text-sm text-white/45">
          Lade Movers...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0d2157] p-4">
            <div className="mb-3 text-sm font-semibold text-emerald-300">
              Gewinner
            </div>

            {winners.length === 0 ? (
              <div className="text-sm text-white/45">Keine Daten verfügbar.</div>
            ) : (
              <div className="space-y-3">
                {winners.map((item) => (
                  <div
                    key={`winner-${item.symbol}`}
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {item.symbol}
                        </div>
                        <div className="text-xs text-white/60">{item.name}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-300">
                          {formatPercent(item.change)}
                        </div>
                        <div className="text-xs text-white/55">
                          {formatPrice(item.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d2157] p-4">
            <div className="mb-3 text-sm font-semibold text-rose-300">
              Verlierer
            </div>

            {losers.length === 0 ? (
              <div className="text-sm text-white/45">Keine Daten verfügbar.</div>
            ) : (
              <div className="space-y-3">
                {losers.map((item) => (
                  <div
                    key={`loser-${item.symbol}`}
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {item.symbol}
                        </div>
                        <div className="text-xs text-white/60">{item.name}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-rose-300">
                          {formatPercent(item.change)}
                        </div>
                        <div className="text-xs text-white/55">
                          {formatPrice(item.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d2157] p-4">
            <div className="mb-3 text-sm font-semibold text-amber-300">
              News-Fokus
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                Meistgenannt heute
              </div>

              <div className="mt-3 text-lg font-semibold text-white">
                {mostMentioned}
              </div>

              <p className="mt-2 text-sm leading-6 text-white/60">
                Basierend auf den aktuell geladenen News für deine priorisierten
                Werte.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}