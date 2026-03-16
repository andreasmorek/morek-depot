import { NextResponse } from "next/server";

const SYMBOLS = ["NVDA", "ISRG", "ABB", "SYM", "TER"];

let cache: {
  timestamp: number;
  data: Array<{
    symbol: string;
    price: number | null;
    change: number | null;
    percentChange: number | null;
    ok: boolean;
    error?: string;
  }>;
} | null = null;

const CACHE_MS = 60_000;

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "FINNHUB_API_KEY fehlt",
        data: [],
      },
      { status: 500 }
    );
  }

  if (cache && Date.now() - cache.timestamp < CACHE_MS) {
    return NextResponse.json({
      ok: true,
      cached: true,
      data: cache.data,
      updatedAt: cache.timestamp,
    });
  }

  try {
    const results = await Promise.all(
      SYMBOLS.map(async (symbol) => {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;

          const res = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          });

          if (!res.ok) {
            return {
              symbol,
              price: null,
              change: null,
              percentChange: null,
              ok: false,
              error: `HTTP ${res.status}`,
            };
          }

          const json = await res.json();

          const price =
            typeof json?.c === "number" && Number.isFinite(json.c) ? json.c : null;
          const change =
            typeof json?.d === "number" && Number.isFinite(json.d) ? json.d : null;
          const percentChange =
            typeof json?.dp === "number" && Number.isFinite(json.dp) ? json.dp : null;

          return {
            symbol,
            price,
            change,
            percentChange,
            ok: price !== null,
            error: price === null ? "Keine Kursdaten" : undefined,
          };
        } catch (error) {
          return {
            symbol,
            price: null,
            change: null,
            percentChange: null,
            ok: false,
            error: error instanceof Error ? error.message : "Unbekannter Fehler",
          };
        }
      })
    );

    cache = {
      timestamp: Date.now(),
      data: results,
    };

    return NextResponse.json({
      ok: true,
      cached: false,
      data: results,
      updatedAt: cache.timestamp,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
        data: [],
      },
      { status: 500 }
    );
  }
}