import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!symbol) {
    return NextResponse.json(
      {
        ok: false,
        error: "Kein Symbol übergeben",
      },
      { status: 400 }
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "FINNHUB_API_KEY fehlt",
      },
      { status: 500 }
    );
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
      symbol
    )}&token=${apiKey}`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Finnhub HTTP ${res.status}`,
          price: null,
          change: null,
        },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      ok: true,
      price: typeof data?.c === "number" ? data.c : null,
      change: typeof data?.dp === "number" ? data.dp : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
        price: null,
        change: null,
      },
      { status: 500 }
    );
  }
}