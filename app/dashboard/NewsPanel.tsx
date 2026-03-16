"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type NewsArticle = {
  title: string;
  description?: string;
  snippet?: string;
  source?: string;
  published_at?: string;
  url?: string;
  image_url?: string;
  relevanceScore?: number;
};

type NewsPanelProps = {
  symbols: string[];
};

export default function NewsPanel({ symbols }: NewsPanelProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latestRequestRef = useRef(0);

  const symbolKey = useMemo(() => {
    return symbols
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 8)
      .join(",");
  }, [symbols]);

  useEffect(() => {
    const requestId = Date.now();
    latestRequestRef.current = requestId;

    const controller = new AbortController();

    async function loadNews() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/news?symbols=${encodeURIComponent(symbolKey)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (latestRequestRef.current !== requestId) {
          return;
        }

        if (!response.ok || !data?.ok) {
          setError(data?.error || "News konnten nicht geladen werden.");
          setLoading(false);
          return;
        }

        setArticles(Array.isArray(data.articles) ? data.articles : []);
        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        if (latestRequestRef.current !== requestId) {
          return;
        }

        setError("News konnten nicht geladen werden.");
        setLoading(false);
      }
    }

    if (!symbolKey) {
      setArticles([]);
      setLoading(false);
      return;
    }

    loadNews();

    return () => controller.abort();
  }, [symbolKey]);

  function formatDate(value?: string) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  if (loading && articles.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="animate-pulse rounded-2xl border border-white/10 bg-[#0d2157] p-4"
          >
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="mt-3 h-3 w-full rounded bg-white/10" />
            <div className="mt-2 h-3 w-5/6 rounded bg-white/10" />
            <div className="mt-3 h-3 w-1/3 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (error && articles.length === 0) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-5 text-sm text-rose-100">
        {error}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d2157] px-4 py-10 text-center text-sm text-white/45">
        Aktuell keine News für diese Werte gefunden.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loading && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
          News werden aktualisiert ...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {error}
        </div>
      )}

      {articles.map((article, index) => (
        <a
          key={`${article.url || article.title}-${index}`}
          href={article.url || "#"}
          target="_blank"
          rel="noreferrer"
          className="block rounded-2xl border border-white/10 bg-[#0d2157] p-4 transition hover:border-white/20 hover:bg-[#112864]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-6 text-white">
                {article.title}
              </h3>

              {(article.description || article.snippet) && (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/70">
                  {article.description || article.snippet}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
                {article.source && <span>{article.source}</span>}
                {article.published_at && (
                  <span>{formatDate(article.published_at)}</span>
                )}
              </div>
            </div>

            {typeof article.relevanceScore === "number" && (
              <div className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                Score {article.relevanceScore}
              </div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}