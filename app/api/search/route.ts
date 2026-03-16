import { NextRequest, NextResponse } from "next/server";

type TwelveDataItem = {
  symbol?: string;
  instrument_name?: string;
  exchange?: string;
  mic_code?: string;
  country?: string;
  type?: string;
  currency?: string;
  isin?: string;
};

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!query) {
    return NextResponse.json({
      ok: false,
      error: "Bitte Suchbegriff eingeben",
      results: [],
    });
  }

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "TWELVE_DATA_API_KEY fehlt",
      results: [],
    });
  }

  try {
    const url =
      "https://api.twelvedata.com/symbol_search?" +
      new URLSearchParams({
        symbol: query,
        outputsize: "12",
        apikey: apiKey,
      }).toString();

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        error: data?.message || `Suche fehlgeschlagen (${response.status})`,
        results: [],
      });
    }

    const raw = Array.isArray(data?.data) ? data.data : [];

    const results = raw
      .filter((item: TwelveDataItem) => item.symbol && item.instrument_name)
      .map((item: TwelveDataItem) => ({
        symbol: item.symbol || "",
        name: item.instrument_name || "",
        wkn: item.isin || "",
        type: item.type || "Equity",
        region: item.country || item.exchange || item.mic_code || "",
        currency: item.currency || "",
      }));

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (error) {
    console.error("Search route error:", error);

    return NextResponse.json({
      ok: false,
      error: "Serverfehler bei der Suche",
      results: [],
    });
  }
}