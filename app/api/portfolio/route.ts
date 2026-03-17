import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type TransactionType = "buy" | "sell";

type PortfolioTransactionRow = {
  id: string;
  symbol: string;
  name: string;
  wkn: string | null;
  region: string | null;
  currency: string;
  transaction_type: TransactionType;
  quantity: number;
  price: number;
  fees: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Nicht eingeloggt." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("portfolio_transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      transactions: (data ?? []) as PortfolioTransactionRow[],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Nicht eingeloggt." }, { status: 401 });
    }

    const body = await request.json();

    const symbol = String(body.symbol ?? "").trim().toUpperCase();
    const name = String(body.name ?? "").trim();
    const wkn = body.wkn ? String(body.wkn).trim().toUpperCase() : null;
    const region = body.region ? String(body.region).trim() : null;
    const currency = String(body.currency ?? "EUR").trim().toUpperCase() || "EUR";
    const transactionType = String(body.transactionType ?? "buy").trim().toLowerCase() as TransactionType;
    const quantity = Number(body.quantity ?? 0);
    const price = Number(body.price ?? 0);
    const fees = Number(body.fees ?? 0);
    const note = body.note ? String(body.note).trim() : null;
    const transactionDate = String(body.transactionDate ?? "").trim();

    if (!symbol) {
      return NextResponse.json({ ok: false, error: "Symbol fehlt." }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ ok: false, error: "Name fehlt." }, { status: 400 });
    }

    if (transactionType !== "buy" && transactionType !== "sell") {
      return NextResponse.json({ ok: false, error: "Ungültiger Transaktionstyp." }, { status: 400 });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ ok: false, error: "Stückzahl muss größer als 0 sein." }, { status: 400 });
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ ok: false, error: "Kaufpreis ist ungültig." }, { status: 400 });
    }

    if (!Number.isFinite(fees) || fees < 0) {
      return NextResponse.json({ ok: false, error: "Nebenkosten sind ungültig." }, { status: 400 });
    }

    const finalDate =
      transactionDate && /^\d{4}-\d{2}-\d{2}$/.test(transactionDate)
        ? transactionDate
        : new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("portfolio_transactions")
      .insert({
        user_id: user.id,
        symbol,
        name,
        wkn,
        region,
        currency,
        transaction_type: transactionType,
        quantity,
        price,
        fees,
        note,
        transaction_date: finalDate,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      transaction: data as PortfolioTransactionRow,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}