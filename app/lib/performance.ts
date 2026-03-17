export type DepotStock = {
  id: string;
  symbol: string;
  name: string;
  wkn?: string | null;
  isin?: string | null;
  shares: number;
  avgBuyPrice: number;
  currentPrice?: number | null;
};

export type DepotStockWithPerformance = DepotStock & {
  invested: number;
  currentValue: number;
  profitLoss: number;
  performancePct: number;
};

export type DepotTotals = {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalPerformancePct: number;
};

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateStockPerformance(
  stock: DepotStock
): DepotStockWithPerformance {
  const shares = toNumber(stock.shares);
  const avgBuyPrice = toNumber(stock.avgBuyPrice);
  const currentPrice = toNumber(stock.currentPrice);

  const invested = shares * avgBuyPrice;
  const currentValue = shares * currentPrice;
  const profitLoss = currentValue - invested;
  const performancePct = invested > 0 ? (profitLoss / invested) * 100 : 0;

  return {
    ...stock,
    shares,
    avgBuyPrice,
    currentPrice,
    invested: round2(invested),
    currentValue: round2(currentValue),
    profitLoss: round2(profitLoss),
    performancePct: round2(performancePct),
  };
}

export function calculateDepotTotals(
  stocks: DepotStockWithPerformance[]
): DepotTotals {
  const totalInvested = stocks.reduce((sum, stock) => sum + stock.invested, 0);
  const totalCurrentValue = stocks.reduce(
    (sum, stock) => sum + stock.currentValue,
    0
  );
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalPerformancePct =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  return {
    totalInvested: round2(totalInvested),
    totalCurrentValue: round2(totalCurrentValue),
    totalProfitLoss: round2(totalProfitLoss),
    totalPerformancePct: round2(totalPerformancePct),
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " %";
}