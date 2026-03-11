import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "PSK557XUVBB17M7V";

export async function GET(req: NextRequest) {

  const symbols = req.nextUrl.searchParams.get("symbols");

  if (!symbols) {
    return NextResponse.json({
      ok: false,
      error: "Keine Symbole übergeben"
    });
  }

  try {

    const url =
      "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=" +
      symbols +
      "&sort=LATEST&limit=12&apikey=" +
      API_KEY;

    const response = await fetch(url);

    const data = await response.json();

    if (data?.Note) {
      return NextResponse.json({
        ok: false,
        error: data.Note
      });
    }

    const items = (data.feed || []).map((entry: any) => ({
      title: entry.title,
      source: entry.source,
      summary: entry.summary,
      url: entry.url,
      time: entry.time_published,
      sentiment: entry.overall_sentiment_label,
      tickers: (entry.ticker_sentiment || [])
        .map((t: any) => t.ticker)
        .join(", ")
    }));

    return NextResponse.json({
      ok: true,
      items: items
    });

  } catch (error) {

    return NextResponse.json({
      ok: false,
      error: "News konnten nicht geladen werden"
    });

  }

}