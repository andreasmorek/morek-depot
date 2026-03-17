import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RawTransaction = {
  id: string;
  symbol: string;
  name: string;
  wkn: string | null;
  region: string | null;
  currency: string | null;
  transaction_type: "buy" | "sell";
  quantity: number | string;
  price: number | string;
  fees: number | string | null;
  transaction_date: string;
  note: string | null;
  created_at: string;
};

type Holding = {
  key: string;
  symbol: string;
  name: string;
  wkn?: string;
  region?: string;
  currency?: string;
  quantity: number;
  avgPrice: number;
  invested: number;
  realizedPnL: number;
  transactionCount: number;
};

function toNumber(value: number | string | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function holdingKey(tx: {
  symbol: string;
  wkn?: string | null;
  name: string;
}) {
  return `${tx.symbol.trim().toUpperCase()}__${(tx.wkn ?? "").trim()}__${tx.name.trim()}`;
}

function computePortfolio(transactions: RawTransaction[]) {
  const sortedAsc = [...transactions].sort((a, b) => {
    const dateDiff =
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();

    if (dateDiff !== 0) return dateDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const map = new Map<string, Holding>();

  for (const tx of sortedAsc) {
    const key = holdingKey(tx);
    const quantity = toNumber(tx.quantity);
    const price = toNumber(tx.price);
    const fees = toNumber(tx.fees);

    if (!map.has(key)) {
      map.set(key, {
        key,
        symbol: tx.symbol.trim().toUpperCase(),
        name: tx.name,
        wkn: tx.wkn ?? undefined,
        region: tx.region ?? undefined,
        currency: tx.currency ?? undefined,
        quantity: 0,
        avgPrice: 0,
        invested: 0,
        realizedPnL: 0,
        transactionCount: 0,
      });
    }

    const holding = map.get(key)!;
    holding.transactionCount += 1;

    if (tx.transaction_type === "buy") {
      const gross = quantity * price + fees;
      holding.invested += gross;
      holding.quantity += quantity;
      holding.avgPrice = holding.quantity > 0 ? holding.invested / holding.quantity : 0;
      continue;
    }

    if (holding.quantity <= 0) {
      continue;
    }

    const sellQty = Math.min(quantity, holding.quantity);
    const avgCostBeforeSell = holding.quantity > 0 ? holding.invested / holding.quantity : 0;
    const proceedsNet = sellQty * price - fees;
    const costSold = sellQty * avgCostBeforeSell;

    holding.realizedPnL += proceedsNet - costSold;
    holding.quantity -= sellQty;
    holding.invested -= costSold;

    if (holding.quantity <= 0.0000001) {
      holding.quantity = 0;
      holding.invested = 0;
      holding.avgPrice = 0;
    } else {
      holding.avgPrice = holding.invested / holding.quantity;
    }
  }

  const holdings = Array.from(map.values())
    .filter((item) => item.quantity > 0)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  const summary = {
    openValue: holdings.reduce((sum, item) => sum + item.invested, 0),
    realizedPnL: Array.from(map.values()).reduce((sum, item) => sum + item.realizedPnL, 0),
    positionCount: holdings.length,
    transactionCount: transactions.length,
    totalBought: transactions
      .filter((tx) => tx.transaction_type === "buy")
      .reduce((sum, tx) => {
        const quantity = toNumber(tx.quantity);
        const price = toNumber(tx.price);
        const fees = toNumber(tx.fees);
        return sum + quantity * price + fees;
      }, 0),
  };

  const transactionsDesc = [...transactions].sort((a, b) => {
    const dateDiff =
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();

    if (dateDiff !== 0) return dateDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    holdings,
    transactions: transactionsDesc,
    summary,
  };
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("portfolio_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(computePortfolio((data ?? []) as RawTransaction[]));
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await request.json();

  const payload = {
    symbol: String(body.symbol ?? "").trim().toUpperCase(),
    name: String(body.name ?? "").trim(),
    wkn: body.wkn ? String(body.wkn).trim() : null,
    region: body.region ? String(body.region).trim() : null,
    currency: body.currency ? String(body.currency).trim() : null,
    transaction_type: String(body.transaction_type ?? "").trim() as "buy" | "sell",
    quantity: Number(body.quantity ?? 0),
    price: Number(body.price ?? 0),
    fees: Number(body.fees ?? 0),
    transaction_date: String(body.transaction_date ?? "").trim(),
    note: body.note ? String(body.note).trim() : null,
  };

  if (!payload.symbol || !payload.name) {
    return NextResponse.json(
      { error: "Symbol und Name sind Pflichtfelder." },
      { status: 400 }
    );
  }

  if (!["buy", "sell"].includes(payload.transaction_type)) {
    return NextResponse.json(
      { error: "Ungültiger Transaktionstyp." },
      { status: 400 }
    );
  }

  if (!(payload.quantity > 0) || !(payload.price >= 0) || !(payload.fees >= 0)) {
    return NextResponse.json(
      { error: "Bitte gültige Werte eingeben." },
      { status: 400 }
    );
  }

  if (!payload.transaction_date) {
    return NextResponse.json(
      { error: "Bitte ein Datum eingeben." },
      { status: 400 }
    );
  }

  if (payload.transaction_type === "sell") {
    const { data: existing, error: loadError } = await supabase
      .from("portfolio_transactions")
      .select("*")
      .eq("user_id", user.id);

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }

    const { holdings } = computePortfolio((existing ?? []) as RawTransaction[]);
    const key = `${payload.symbol}__${payload.wkn ?? ""}__${payload.name}`;
    const currentHolding = holdings.find((item) => item.key === key);

    if (!currentHolding || currentHolding.quantity < payload.quantity) {
      return NextResponse.json(
        { error: "Du kannst nicht mehr Stück verkaufen als im Depot liegen." },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase.from("portfolio_transactions").insert({
    user_id: user.id,
    ...payload,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}