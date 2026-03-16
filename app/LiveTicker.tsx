"use client";

type TickerItem = {
  symbol: string;
  name: string;
  price: string;
  change: string;
};

const TICKERS: TickerItem[] = [
  { symbol: "NVDA", name: "Nvidia", price: "180.25", change: "-1.58%" },
  { symbol: "TSLA", name: "Tesla", price: "391.20", change: "-0.96%" },
  { symbol: "ISRG", name: "Intuitive Surgical", price: "512.40", change: "+0.72%" },
  { symbol: "ABB", name: "ABB Robotics", price: "48.12", change: "+0.34%" },
  { symbol: "ROK", name: "Rockwell Automation", price: "271.84", change: "-0.41%" },
  { symbol: "SYM", name: "Symbotic", price: "39.81", change: "+2.10%" },
];

export default function LiveTicker() {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#122556] p-6 shadow-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-blue-200/60">
            Live Market
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">
            Top Robotics & AI Aktien
          </h2>
          <p className="mt-1 text-sm text-blue-100/70">
            Live-Ansicht für Robotics, AI und Zukunftstechnologie
          </p>
        </div>

        <div className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300">
          Market open
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {TICKERS.map((stock) => {
          const isNegative = stock.change.startsWith("-");

          return (
            <div
              key={stock.symbol}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="text-xs text-blue-100/70">{stock.name}</div>

              <div className="mt-1 text-lg font-bold text-white">
                {stock.symbol}
              </div>

              <div className="mt-3 text-2xl font-semibold text-white">
                {stock.price} $
              </div>

              <div
                className={`mt-1 text-sm font-medium ${
                  isNegative ? "text-red-400" : "text-green-400"
                }`}
              >
                {stock.change}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}