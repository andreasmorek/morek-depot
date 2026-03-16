"use client";

import { useMemo, useState } from "react";

type SearchResult = {
  symbol: string;
  name: string;
  wkn?: string;
  type: string;
  region: string;
  currency?: string;
};

type StockSearchProps = {
  onAddToDepot?: (stock: SearchResult) => void;
  onAddToWatchlist?: (stock: SearchResult) => void;
};

export default function StockSearch({
  onAddToDepot,
  onAddToWatchlist,
}: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  async function handleSearch() {
    if (!trimmedQuery) {
      setResults([]);
      setError("");
      setSearched(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(true);

      const response = await fetch(
        "/api/search?q=" + encodeURIComponent(trimmedQuery),
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!data.ok) {
        setResults([]);
        setError(data.error || "Suche fehlgeschlagen");
        return;
      }

      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      setResults([]);
      setError("Suche fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  function handleAddToDepot(stock: SearchResult) {
    if (onAddToDepot) return onAddToDepot(stock);
    console.log("Zum Depot:", stock);
  }

  function handleAddToWatchlist(stock: SearchResult) {
    if (onAddToWatchlist) return onAddToWatchlist(stock);
    console.log("Zur Watchlist:", stock);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Aktie suchen</h2>
        <p className="mt-1 text-sm leading-6 text-white/65">
          Suche über WKN, Name oder Symbol und füge Werte direkt zum Depot oder
          zur Watchlist hinzu.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="WKN, Name oder Symbol"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0d2157] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10"
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="shrink-0 rounded-xl border border-white/10 bg-[#23408d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2b4da8] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Suche..." : "Suchen"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {!loading && searched && !error && results.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0d2157] px-4 py-4 text-sm text-white/55">
          Keine Treffer gefunden.
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((stock) => (
            <div
              key={`${stock.symbol}-${stock.region}-${stock.name}`}
              className="rounded-2xl border border-white/10 bg-[#0d2157] p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-white">
                      {stock.symbol}
                    </span>

                    {stock.currency ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/60">
                        {stock.currency}
                      </span>
                    ) : null}

                    {stock.type ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/60">
                        {stock.type}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 text-sm font-medium text-white/90">
                    {stock.name}
                  </div>

                  <div className="mt-1 text-xs text-white/50">
                    {stock.region}
                    {stock.wkn ? ` • WKN ${stock.wkn}` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddToDepot(stock)}
                    className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
                  >
                    Zum Depot
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddToWatchlist(stock)}
                    className="rounded-xl border border-white/10 bg-[#1a347a] px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-[#23408d]"
                  >
                    Zur Watchlist
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}