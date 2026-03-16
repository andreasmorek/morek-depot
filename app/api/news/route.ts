import { NextRequest, NextResponse } from "next/server";

type MarketauxArticle = {
  uuid?: string;
  title?: string;
  description?: string;
  snippet?: string;
  source?: string;
  published_at?: string;
  url?: string;
  image_url?: string;
  entities?: Array<{
    symbol?: string;
    name?: string;
    type?: string;
  }>;
};

const API_KEY = process.env.MARKETAUX_API_KEY;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreArticle(article: MarketauxArticle, symbols: string[]) {
  const title = article.title ?? "";
  const description = article.description ?? "";
  const snippet = article.snippet ?? "";
  const text = `${title} ${description} ${snippet}`.toLowerCase();

  const entitySymbols =
    article.entities
      ?.map((entity) => entity.symbol?.toUpperCase().trim())
      .filter(Boolean) ?? [];

  let score = 0;

  for (const symbol of symbols) {
    const clean = symbol.toUpperCase().trim();
    if (!clean) continue;

    if (entitySymbols.includes(clean)) {
      score += 12;
    }

    const exactTickerRegex = new RegExp(`\\b${clean}\\b`, "i");
    if (exactTickerRegex.test(title)) {
      score += 8;
    }

    if (exactTickerRegex.test(description)) {
      score += 5;
    }

    if (exactTickerRegex.test(snippet)) {
      score += 4;
    }

    if (text.includes(clean.toLowerCase())) {
      score += 2;
    }
  }

  if (title) score += 1;
  if (article.image_url) score += 1;
  if (article.description) score += 1;

  const publishedTime = article.published_at
    ? new Date(article.published_at).getTime()
    : 0;

  if (publishedTime) {
    const hoursOld = (Date.now() - publishedTime) / (1000 * 60 * 60);

    if (hoursOld <= 6) score += 5;
    else if (hoursOld <= 24) score += 4;
    else if (hoursOld <= 72) score += 3;
    else if (hoursOld <= 168) score += 2;
    else score += 1;
  }

  return score;
}

function dedupeArticles(articles: MarketauxArticle[]) {
  const seen = new Set<string>();

  return articles.filter((article) => {
    const key = normalizeText(
      `${article.title ?? ""}|${article.url ?? ""}|${article.source ?? ""}`
    );

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { ok: false, error: "MARKETAUX_API_KEY fehlt", articles: [] },
      { status: 500 }
    );
  }

  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 8);

  if (symbols.length === 0) {
    return NextResponse.json({
      ok: true,
      articles: [],
    });
  }

  try {
    const url = new URL("https://api.marketaux.com/v1/news/all");

    url.searchParams.set("api_token", API_KEY);
    url.searchParams.set("symbols", symbols.join(","));
    url.searchParams.set("language", "de,en");
    url.searchParams.set("limit", "20");
    url.searchParams.set("filter_entities", "true");

    const response = await fetch(url.toString(), {
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      const raw = await response.text();

      return NextResponse.json(
        {
          ok: false,
          error: `Upstream Fehler ${response.status}`,
          details: raw,
          articles: [],
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawArticles: MarketauxArticle[] = Array.isArray(data?.data)
      ? data.data
      : [];

    const cleaned = dedupeArticles(rawArticles);

    const sorted = cleaned
      .map((article) => ({
        title: article.title ?? "",
        description: article.description ?? "",
        snippet: article.snippet ?? "",
        source: article.source ?? "",
        published_at: article.published_at ?? "",
        url: article.url ?? "",
        image_url: article.image_url ?? "",
        entities: article.entities ?? [],
        relevanceScore: scoreArticle(article, symbols),
      }))
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }

        const timeA = a.published_at ? new Date(a.published_at).getTime() : 0;
        const timeB = b.published_at ? new Date(b.published_at).getTime() : 0;

        return timeB - timeA;
      })
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      articles: sorted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
        articles: [],
      },
      { status: 500 }
    );
  }
}