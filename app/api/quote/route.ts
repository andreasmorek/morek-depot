import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "PSK557XUVBB17M7V";

const CACHE_TTL = 60 * 60 * 1000;

const cache: Map<string, { price: number; time: number }> = new Map();

export async function GET(req: NextRequest) {

  const symbol = req.nextUrl.searchParams.get("symbol");
  const force = req.nextUrl.searchParams.get("force") === "1";

  if (!symbol) {
    return NextResponse.json({
      ok: false,
      error: "Kein Symbol übergeben"
    });
  }

  const cached = cache.get(symbol);

  if (!force && cached && Date.now() - cached.time < CACHE_TTL) {
    return NextResponse.json({
      ok: true,
      price: cached.price,
      source: "cache",
      fetchedAt: new Date(cached.time).toISOString()
    });
  }

  try {

    const url =
      "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=" +
      symbol +
      "&apikey=" +
      API_KEY;

    const response = await fetch(url);

    const data = await response.json();

    if (data?.Note) {
      return NextResponse.json({
        ok: false,
        error: data.Note
      });
    }

    const price = Number(data?.["Global Quote"]?.["05. price"]);

    if (!price) {
      return NextResponse.json({
        ok: false,
        error: "Kein Kurs zurückgegeben"
      });
    }

    cache.set(symbol, {
      price: price,
      time: Date.now()
    });

    return NextResponse.json({
      ok: true,
      price: price,
      source: "live",
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {

    return NextResponse.json({
      ok: false,
      error: "Kursabruf fehlgeschlagen"
    });

  }

}