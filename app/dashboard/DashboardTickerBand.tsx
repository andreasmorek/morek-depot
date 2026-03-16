"use client";

type BandItem = {
  symbol: string;
  price: string;
  change: string;
};

const ITEMS: BandItem[] = [
  { symbol: "NVDA", price: "180.25", change: "-1.58%" },
  { symbol: "TSLA", price: "391.20", change: "-0.96%" },
  { symbol: "ISRG", price: "512.40", change: "+0.72%" },
  { symbol: "ABB", price: "48.12", change: "+0.34%" },
  { symbol: "ROK", price: "271.84", change: "-0.41%" },
  { symbol: "SYM", price: "39.81", change: "+2.10%" },
];

export default function DashboardTickerBand() {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#122556] p-6 shadow-2xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <p className="text-sm font-semibold text-white">Live Ticker</p>
        <p className="text-xs text-blue-100/60">Robotics & AI</p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3">
          {ITEMS.map((item) => {
            const isNegative = item.change.startsWith("-");

            return (
              <div
                key={item.symbol}
                className="min-w-[140px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="text-base font-semibold text-white">
                  {item.symbol}
                </div>
                <div className="mt-1 text-sm text-blue-100/60">
                  {item.price} $
                </div>
                <div
                  className={`mt-1 text-base font-semibold ${
                    isNegative ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {item.change}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}