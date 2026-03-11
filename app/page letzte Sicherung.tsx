"use client";

import { useEffect, useMemo, useState } from "react";
import { STOCKS, type StockItem, type StockType } from "./lib/stocks";

const SECURITIES_STORAGE_KEY = "morek-robotics-securities-v42";
const TRANSACTIONS_STORAGE_KEY = "morek-robotics-transactions-v42";
const NEWS_STORAGE_KEY = "morek-robotics-news-v42";
const SNAPSHOTS_STORAGE_KEY = "morek-robotics-snapshots-v42";
const SETTINGS_STORAGE_KEY = "morek-robotics-settings-v42";
const ALERTS_STORAGE_KEY = "morek-robotics-alerts-v42";
const AUTO_REFRESH_MINUTES_DEFAULT = 30;

type Security = {
  id: string;
  name: string;
  sector: string;
  wkn: string;
  ticker: string;
  quoteSymbol: string;
  isin: string;
  currentPrice: number;
  note: string;
  targetPrice: number;
  stopPrice: number;
  manualPrice: number;
  type: StockType;
  shares: number;
  buyPrice: number;
  targetWeight: number;
  buyZoneMin?: number;
  buyZoneMax?: number;
  stopBuy?: number;
  stopLoss?: number;
  status?: "Live" | "Watchlist";
};

type TransactionType = "BUY" | "SELL";

type Transaction = {
  id: string;
  securityId: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fees: number;
  broker: string;
  tradeDate: string;
  note: string;
};

type NewsItem = {
  title: string;
  source: string;
  summary: string;
  url: string;
  time: string;
  sentiment: string;
  tickers: string;
};

type Snapshot = {
  id: string;
  date: string;
  invested: number;
  marketValue: number;
  pnl: number;
  pnlPct: number;
  realizedPnl: number;
};

type QuoteStatus = {
  state: "idle" | "loading" | "success" | "cached" | "error" | "manual";
  message: string;
};

type AlertItem = {
  id: string;
  securityId: string;
  ticker: string;
  title: string;
  message: string;
  level: "info" | "success" | "warning" | "danger";
  createdAt: string;
};

type Settings = {
  autoRefreshEnabled: boolean;
  autoRefreshMinutes: number;
  priceMode: "api" | "manual-first";
};

type QuoteApiResponse = {
  ok: boolean;
  price?: number;
  source?: "live" | "cache";
  fetchedAt?: string;
  error?: string;
};

type NewsApiResponse = {
  ok: boolean;
  items?: NewsItem[];
  error?: string;
};

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function eur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function pct(value: number): string {
  return `${Number(value || 0).toFixed(2).replace(".", ",")} %`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSecurity(item: StockItem): Security {
  return {
    id: item.id,
    name: item.name,
    sector: item.sector,
    wkn: item.wkn,
    ticker: item.ticker,
    quoteSymbol: item.priceTicker || item.ticker,
    isin: item.isin || "",
    currentPrice: Number(item.currentPrice || 0),
    note: item.notes || "",
    targetPrice: Number(item.stopBuy || 0),
    stopPrice: Number(item.stopLoss || 0),
    manualPrice: 0,
    type: item.type,
    shares: Number(item.shares || 0),
    buyPrice: Number(item.buyPrice || 0),
    targetWeight: Number(item.targetWeight || 0),
    buyZoneMin: item.buyZoneMin,
    buyZoneMax: item.buyZoneMax,
    stopBuy: item.stopBuy,
    stopLoss: item.stopLoss,
    status: item.status,
  };
}

const initialSecurities: Security[] = STOCKS.map(toSecurity);

const defaultSettings: Settings = {
  autoRefreshEnabled: false,
  autoRefreshMinutes: AUTO_REFRESH_MINUTES_DEFAULT,
  priceMode: "api",
};

function normalizeSecurities(input: any[]): Security[] {
  const initialMap = new Map(initialSecurities.map((item) => [item.id, item] as const));

  return input.map((item) => {
    const fallback = initialMap.get(item.id);

    return {
      id: item.id || makeId(),
      name: String(item.name || fallback?.name || ""),
      sector: String(item.sector || fallback?.sector || ""),
      wkn: String(item.wkn || fallback?.wkn || ""),
      ticker: String(item.ticker || fallback?.ticker || "").toUpperCase(),
      quoteSymbol: String(item.quoteSymbol || item.priceTicker || fallback?.quoteSymbol || item.ticker || "").toUpperCase(),
      isin: String(item.isin || fallback?.isin || ""),
      currentPrice: Number(item.currentPrice || 0),
      note: String(item.note || item.notes || fallback?.note || ""),
      targetPrice: Number(item.targetPrice || item.stopBuy || fallback?.targetPrice || 0),
      stopPrice: Number(item.stopPrice || item.stopLoss || fallback?.stopPrice || 0),
      manualPrice: Number(item.manualPrice || 0),
      type: item.type === "watchlist" ? "watchlist" : "depot",
      shares: Number(item.shares || 0),
      buyPrice: Number(item.buyPrice || 0),
      targetWeight: Number(item.targetWeight || 0),
      buyZoneMin: item.buyZoneMin ?? fallback?.buyZoneMin,
      buyZoneMax: item.buyZoneMax ?? fallback?.buyZoneMax,
      stopBuy: item.stopBuy ?? fallback?.stopBuy,
      stopLoss: item.stopLoss ?? fallback?.stopLoss,
      status: item.status || fallback?.status,
    };
  });
}

function alertBg(level: AlertItem["level"]): string {
  if (level === "danger") return "#ffe6e6";
  if (level === "warning") return "#fff3db";
  if (level === "success") return "#e7f7ea";
  return "#eef4ff";
}

export default function Page() {
  const [securities, setSecurities] = useState<Security[]>(initialSecurities);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [quoteStatuses, setQuoteStatuses] = useState<Record<string, QuoteStatus>>({});
  const [message, setMessage] = useState("Bereit.");
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [lastAutoRefreshAt, setLastAutoRefreshAt] = useState("");
  const [activeTab, setActiveTab] = useState<StockType>("depot");

  const [newSecurity, setNewSecurity] = useState({
    name: "",
    sector: "",
    wkn: "",
    isin: "",
    ticker: "",
    quoteSymbol: "",
    note: "",
  });

  const depotSelection = initialSecurities.find((item) => item.type === "depot")?.id || "";

  const [newTransaction, setNewTransaction] = useState({
    securityId: depotSelection,
    type: "BUY" as TransactionType,
    quantity: 0,
    price: 0,
    fees: 0,
    broker: "",
    tradeDate: "",
    note: "",
  });

  const depotStocks = useMemo(() => securities.filter((item) => item.type === "depot"), [securities]);
  const watchlistStocks = useMemo(() => securities.filter((item) => item.type === "watchlist"), [securities]);

  useEffect(() => {
    try {
      const savedSecurities = localStorage.getItem(SECURITIES_STORAGE_KEY);
      const savedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      const savedNews = localStorage.getItem(NEWS_STORAGE_KEY);
      const savedSnapshots = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const savedAlerts = localStorage.getItem(ALERTS_STORAGE_KEY);

      if (savedSecurities) {
        const parsed = JSON.parse(savedSecurities);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSecurities(normalizeSecurities(parsed));
        }
      }
      if (savedTransactions) {
        const parsed = JSON.parse(savedTransactions);
        if (Array.isArray(parsed)) setTransactions(parsed);
      }
      if (savedNews) {
        const parsed = JSON.parse(savedNews);
        if (Array.isArray(parsed)) setNews(parsed);
      }
      if (savedSnapshots) {
        const parsed = JSON.parse(savedSnapshots);
        if (Array.isArray(parsed)) setSnapshots(parsed);
      }
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && typeof parsed === "object") {
          setSettings({
            autoRefreshEnabled: Boolean(parsed.autoRefreshEnabled),
            autoRefreshMinutes: Number(parsed.autoRefreshMinutes || AUTO_REFRESH_MINUTES_DEFAULT),
            priceMode: parsed.priceMode === "manual-first" ? "manual-first" : "api",
          });
        }
      }
      if (savedAlerts) {
        const parsed = JSON.parse(savedAlerts);
        if (Array.isArray(parsed)) setAlerts(parsed);
      }
    } catch (error) {
      console.error(error);
      setMessage("Fehler beim Laden des lokalen Speichers.");
    } finally {
      setLoadedFromStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!loadedFromStorage) return;
    localStorage.setItem(SECURITIES_STORAGE_KEY, JSON.stringify(securities));
  }, [securities, loadedFromStorage]);

  useEffect(() => {
    if (!loadedFromStorage) return;
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions, loadedFromStorage]);

  useEffect(() => {
    if (!loadedFromStorage) return;
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(news));
  }, [news, loadedFromStorage]);

  useEffect(() => {
    if (!loadedFromStorage) return;
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
  }, [snapshots, loadedFromStorage]);

  useEffect(() => {
    if (!loadedFromStorage) return;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings, loadedFromStorage]);

  useEffect(() => {
    if (!loadedFromStorage) return;
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts, loadedFromStorage]);

  useEffect(() => {
    if (newTransaction.securityId) return;
    const firstDepot = depotStocks[0]?.id || "";
    setNewTransaction((prev) => ({ ...prev, securityId: firstDepot }));
  }, [depotStocks, newTransaction.securityId]);

  const transactionsBySecurity = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    for (const tx of transactions) {
      if (!grouped[tx.securityId]) grouped[tx.securityId] = [];
      grouped[tx.securityId].push(tx);
    }
    return grouped;
  }, [transactions]);

  const positionRows = useMemo(() => {
    return securities.map((security) => {
      const txs = [...(transactionsBySecurity[security.id] || [])].sort((a, b) =>
        (a.tradeDate || "").localeCompare(b.tradeDate || "")
      );

      let openQuantity = 0;
      let openCost = 0;
      let realizedPnl = 0;
      let buyCount = 0;
      let sellCount = 0;

      for (const tx of txs) {
        if (tx.type === "BUY") {
          openQuantity += tx.quantity;
          openCost += tx.quantity * tx.price + tx.fees;
          buyCount += 1;
        } else {
          sellCount += 1;
          if (openQuantity > 0) {
            const avgCostPerShare = openCost / openQuantity;
            const soldCost = avgCostPerShare * tx.quantity;
            const proceeds = tx.quantity * tx.price - tx.fees;
            realizedPnl += proceeds - soldCost;
            openQuantity -= tx.quantity;
            openCost -= soldCost;
            if (openQuantity < 0) {
              openQuantity = 0;
              openCost = 0;
            }
          }
        }
      }

      const avgBuyPrice = openQuantity > 0 ? openCost / openQuantity : 0;
      const effectivePrice =
        settings.priceMode === "manual-first"
          ? security.manualPrice || security.currentPrice
          : security.currentPrice || security.manualPrice;

      const marketValue = openQuantity * effectivePrice;
      const pnl = marketValue - openCost;
      const pnlPct = openCost > 0 ? (pnl / openCost) * 100 : 0;

      return {
        ...security,
        transactionCount: txs.length,
        buyCount,
        sellCount,
        totalQuantity: openQuantity,
        avgBuyPrice,
        invested: openCost,
        effectivePrice,
        marketValue,
        pnl,
        pnlPct,
        realizedPnl,
      };
    });
  }, [securities, transactionsBySecurity, settings.priceMode]);

  const visiblePositionRows = useMemo(
    () => positionRows.filter((row) => row.type === activeTab),
    [positionRows, activeTab]
  );

  const watchlistRows = useMemo(
    () => positionRows.filter((row) => row.type === "watchlist"),
    [positionRows]
  );

  const summary = useMemo(() => {
    const depotRows = positionRows.filter((row) => row.type === "depot");
    const invested = depotRows.reduce((sum, row) => sum + row.invested, 0);
    const marketValue = depotRows.reduce((sum, row) => sum + row.marketValue, 0);
    const pnl = depotRows.reduce((sum, row) => sum + row.pnl, 0);
    const realizedPnl = depotRows.reduce((sum, row) => sum + row.realizedPnl, 0);
    const activePositions = depotRows.filter((row) => row.totalQuantity > 0).length;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    return { invested, marketValue, pnl, pnlPct, realizedPnl, activePositions };
  }, [positionRows]);

  const maxMarketValue = useMemo(() => {
    return Math.max(...snapshots.map((item) => item.marketValue), 1);
  }, [snapshots]);

  function pushAlert(
    securityId: string,
    ticker: string,
    title: string,
    text: string,
    level: AlertItem["level"]
  ) {
    setAlerts((prev) =>
      [
        {
          id: makeId(),
          securityId,
          ticker,
          title,
          message: text,
          level,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 100)
    );
  }

  async function fetchQuote(symbol: string, forceLive = false): Promise<QuoteApiResponse> {
    try {
      const response = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}${forceLive ? "&live=1" : ""}`);
      return (await response.json()) as QuoteApiResponse;
    } catch (error) {
      console.error(error);
      return { ok: false, error: "Netzwerkfehler beim Kursabruf" };
    }
  }

  async function fetchNews(symbols: string[]): Promise<NewsApiResponse> {
    try {
      const response = await fetch(`/api/news?symbols=${encodeURIComponent(symbols.join(","))}`);
      return (await response.json()) as NewsApiResponse;
    } catch (error) {
      console.error(error);
      return { ok: false, error: "Netzwerkfehler beim Newsabruf" };
    }
  }

  async function refreshSinglePrice(row: (typeof positionRows)[number]) {
    setQuoteStatuses((prev) => ({
      ...prev,
      [row.ticker]: { state: "loading", message: "Lädt ..." },
    }));

    const quote = await fetchQuote(row.quoteSymbol || row.ticker, true);

    if (quote.ok && typeof quote.price === "number") {
      setSecurities((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, currentPrice: quote.price || 0 } : item))
      );
      setQuoteStatuses((prev) => ({
        ...prev,
        [row.ticker]: {
          state: quote.source === "cache" ? "cached" : "success",
          message: quote.source === "cache" ? `Cache ${quote.price}` : `Live ${quote.price}`,
        },
      }));
      setMessage(`Kurs für ${row.ticker} aktualisiert.`);
    } else {
      setQuoteStatuses((prev) => ({
        ...prev,
        [row.ticker]: { state: "error", message: quote.error || "Fehler" },
      }));
      setMessage(`Kurs für ${row.ticker} konnte nicht geladen werden.`);
    }
  }

  async function loadPrices(forceLive: boolean) {
    setLoadingPrices(true);
    setMessage(forceLive ? "Lade alle Kurse live ..." : "Lade Kurse mit Server-Cache ...");

    for (const security of securities) {
      setQuoteStatuses((prev) => ({
        ...prev,
        [security.ticker]: { state: "loading", message: "Lädt ..." },
      }));

      const quote = await fetchQuote(security.quoteSymbol || security.ticker, forceLive);
      if (quote.ok && typeof quote.price === "number") {
        setSecurities((prev) =>
          prev.map((item) => (item.id === security.id ? { ...item, currentPrice: quote.price || 0 } : item))
        );
        setQuoteStatuses((prev) => ({
          ...prev,
          [security.ticker]: {
            state: quote.source === "cache" ? "cached" : "success",
            message: quote.source === "cache" ? `Cache ${quote.price}` : `Live ${quote.price}`,
          },
        }));
      } else {
        setQuoteStatuses((prev) => ({
          ...prev,
          [security.ticker]: { state: "error", message: quote.error || "Fehler" },
        }));
      }
      await sleep(100);
    }

    setLoadingPrices(false);
    setMessage("Kursabruf abgeschlossen.");
  }

  async function loadNews() {
    setLoadingNews(true);
    setMessage("Lade aktuelle News ...");

    const symbols = securities.map((item) => item.quoteSymbol || item.ticker).filter(Boolean);
    const result = await fetchNews(symbols);

    if (result.ok && Array.isArray(result.items)) {
      setNews(result.items);
      setMessage(`News geladen: ${result.items.length} Einträge.`);
    } else {
      setMessage(result.error || "News konnten nicht geladen werden.");
    }

    setLoadingNews(false);
  }

  function addSecurity() {
    if (!newSecurity.name || !newSecurity.ticker) {
      setMessage("Bitte mindestens Name und Ticker eintragen.");
      return;
    }

    const ticker = newSecurity.ticker.toUpperCase();
    const quoteSymbol = (newSecurity.quoteSymbol || ticker).toUpperCase();

    const security: Security = {
      id: makeId(),
      name: newSecurity.name,
      sector: newSecurity.sector,
      wkn: newSecurity.wkn,
      ticker,
      quoteSymbol,
      isin: newSecurity.isin,
      currentPrice: 0,
      note: newSecurity.note,
      targetPrice: 0,
      stopPrice: 0,
      manualPrice: 0,
      type: activeTab,
      shares: 0,
      buyPrice: 0,
      targetWeight: 0,
      status: activeTab === "depot" ? "Live" : "Watchlist",
    };

    setSecurities((prev) => [...prev, security]);
    setNewSecurity({
      name: "",
      sector: "",
      wkn: "",
      isin: "",
      ticker: "",
      quoteSymbol: "",
      note: "",
    });
    setMessage(`${security.name} wurde ${activeTab === "depot" ? "ins Depot" : "in die Watchlist"} übernommen.`);
  }

  function addTransaction() {
    if (!newTransaction.securityId || newTransaction.quantity <= 0 || newTransaction.price <= 0) {
      setMessage("Bitte Aktie, Stückzahl und Kurs korrekt eintragen.");
      return;
    }

    const selected = securities.find((item) => item.id === newTransaction.securityId);
    if (!selected || selected.type !== "depot") {
      setMessage("Transaktionen können nur für Depot-Werte erfasst werden.");
      return;
    }

    const tx: Transaction = {
      id: makeId(),
      securityId: newTransaction.securityId,
      type: newTransaction.type,
      quantity: Number(newTransaction.quantity),
      price: Number(newTransaction.price),
      fees: Number(newTransaction.fees || 0),
      broker: newTransaction.broker,
      tradeDate: newTransaction.tradeDate,
      note: newTransaction.note,
    };

    setTransactions((prev) => [...prev, tx]);
    setNewTransaction((prev) => ({
      ...prev,
      quantity: 0,
      price: 0,
      fees: 0,
      broker: "",
      tradeDate: "",
      note: "",
    }));
    setMessage(`Transaktion für ${selected.ticker} gespeichert.`);
  }

  function deleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    setMessage("Transaktion gelöscht.");
  }

  function updateSecurityField(id: string, patch: Partial<Security>) {
    setSecurities((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function saveSnapshot() {
    const snapshot: Snapshot = {
      id: makeId(),
      date: new Date().toISOString().slice(0, 10),
      invested: summary.invested,
      marketValue: summary.marketValue,
      pnl: summary.pnl,
      pnlPct: summary.pnlPct,
      realizedPnl: summary.realizedPnl,
    };
    setSnapshots((prev) => [...prev, snapshot]);
    setMessage("Snapshot gespeichert.");
  }

  function clearSavedData() {
    localStorage.removeItem(SECURITIES_STORAGE_KEY);
    localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    localStorage.removeItem(NEWS_STORAGE_KEY);
    localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(ALERTS_STORAGE_KEY);
    setSecurities(initialSecurities);
    setTransactions([]);
    setNews([]);
    setSnapshots([]);
    setSettings(defaultSettings);
    setAlerts([]);
    setQuoteStatuses({});
    setMessage("Gespeicherte Daten gelöscht und auf Startwerte zurückgesetzt.");
  }

  useEffect(() => {
    for (const row of positionRows) {
      if (row.type !== "depot") continue;
      if (!row.stopPrice || row.totalQuantity <= 0) continue;
      if (row.effectivePrice > 0 && row.effectivePrice <= row.stopPrice) {
        pushAlert(
          row.id,
          row.ticker,
          `${row.ticker} Stop erreicht`,
          `Der Kurs von ${row.ticker} liegt bei ${eur(row.effectivePrice)} und damit auf/unter dem Stop von ${eur(row.stopPrice)}.`,
          "warning"
        );
      }
      if (row.targetPrice > 0 && row.effectivePrice >= row.targetPrice) {
        pushAlert(
          row.id,
          row.ticker,
          `${row.ticker} Target erreicht`,
          `Der Kurs von ${row.ticker} liegt bei ${eur(row.effectivePrice)} und damit auf/über dem Ziel von ${eur(row.targetPrice)}.`,
          "success"
        );
      }
    }
  }, [positionRows]);

  useEffect(() => {
    if (!settings.autoRefreshEnabled) return;
    const ms = Math.max(settings.autoRefreshMinutes, 5) * 60 * 1000;
    const interval = setInterval(async () => {
      await loadPrices(false);
      setLastAutoRefreshAt(new Date().toISOString());
    }, ms);
    return () => clearInterval(interval);
  }, [settings.autoRefreshEnabled, settings.autoRefreshMinutes, securities]);

  return (
    <main style={{ padding: "24px", fontFamily: "Arial, sans-serif", maxWidth: "1800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Morek Robotics Depot 4.2</h1>
      <p style={{ marginBottom: "20px" }}>Aktien, Käufe und Verkäufe – plus serverseitigem Kursabruf.</p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("depot")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: activeTab === "depot" ? "#222" : "#f3f3f3",
            color: activeTab === "depot" ? "#fff" : "#222",
            cursor: "pointer",
          }}
        >
          Depot ({depotStocks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("watchlist")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: activeTab === "watchlist" ? "#222" : "#f3f3f3",
            color: activeTab === "watchlist" ? "#fff" : "#222",
            cursor: "pointer",
          }}
        >
          Watchlist ({watchlistStocks.length})
        </button>
      </div>

      <div style={{ marginBottom: "20px", color: "#666" }}>
        Depot: {depotStocks.length} | Watchlist: {watchlistStocks.length}
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button onClick={() => loadPrices(false)} disabled={loadingPrices}>
          {loadingPrices ? "Kurse werden geladen ..." : "Kurse laden (mit Server-Cache)"}
        </button>
        <button onClick={() => loadPrices(true)} disabled={loadingPrices}>
          Alle live aktualisieren
        </button>
        <button onClick={loadNews} disabled={loadingNews}>
          {loadingNews ? "News werden geladen ..." : "News laden"}
        </button>
        <button onClick={saveSnapshot}>Snapshot speichern</button>
        <button onClick={clearSavedData}>Gespeicherte Daten löschen</button>
      </div>

      <div style={{ marginBottom: "20px", color: "#555" }}>{message}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
          <div>Investiert</div>
          <strong>{eur(summary.invested)}</strong>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
          <div>Depotwert</div>
          <strong>{eur(summary.marketValue)}</strong>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
          <div>Unrealisierte G&V</div>
          <strong>{eur(summary.pnl)}</strong>
          <div>{pct(summary.pnlPct)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
          <div>Realisierte G&V</div>
          <strong>{eur(summary.realizedPnl)}</strong>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
          <div>Aktive Positionen</div>
          <strong>{summary.activePositions}</strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
          <h2 style={{ marginTop: 0 }}>Neue Aktie anlegen</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <input value={newSecurity.name} onChange={(e) => setNewSecurity((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name der Aktie" />
            <input value={newSecurity.ticker} onChange={(e) => setNewSecurity((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))} placeholder="Ticker intern" />
            <input value={newSecurity.quoteSymbol} onChange={(e) => setNewSecurity((prev) => ({ ...prev, quoteSymbol: e.target.value.toUpperCase() }))} placeholder="Kurssymbol API" />
            <input value={newSecurity.wkn} onChange={(e) => setNewSecurity((prev) => ({ ...prev, wkn: e.target.value }))} placeholder="WKN" />
            <input value={newSecurity.isin} onChange={(e) => setNewSecurity((prev) => ({ ...prev, isin: e.target.value }))} placeholder="ISIN" />
            <input value={newSecurity.sector} onChange={(e) => setNewSecurity((prev) => ({ ...prev, sector: e.target.value }))} placeholder="Sektor" />
            <input value={newSecurity.note} onChange={(e) => setNewSecurity((prev) => ({ ...prev, note: e.target.value }))} placeholder="Notiz" style={{ gridColumn: "1 / span 2" }} />
          </div>
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={addSecurity}>
              {activeTab === "depot" ? "Aktie ins Depot hinzufügen" : "Aktie in Watchlist hinzufügen"}
            </button>
            <span style={{ fontSize: "12px", color: "#666" }}>
              Aktueller Zielbereich: <strong>{activeTab === "depot" ? "Depot" : "Watchlist"}</strong>
            </span>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
          <h2 style={{ marginTop: 0 }}>Kauf / Verkauf erfassen</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <select value={newTransaction.securityId} onChange={(e) => setNewTransaction((prev) => ({ ...prev, securityId: e.target.value }))}>
              {depotStocks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.ticker})
                </option>
              ))}
            </select>
            <select value={newTransaction.type} onChange={(e) => setNewTransaction((prev) => ({ ...prev, type: e.target.value as TransactionType }))}>
              <option value="BUY">Kauf</option>
              <option value="SELL">Verkauf</option>
            </select>
            <input type="date" value={newTransaction.tradeDate} onChange={(e) => setNewTransaction((prev) => ({ ...prev, tradeDate: e.target.value }))} />
            <input type="number" step="0.0001" value={newTransaction.quantity} onChange={(e) => setNewTransaction((prev) => ({ ...prev, quantity: Number(e.target.value) }))} placeholder="Stückzahl" />
            <input type="number" step="0.0001" value={newTransaction.price} onChange={(e) => setNewTransaction((prev) => ({ ...prev, price: Number(e.target.value) }))} placeholder="Kurs" />
            <input type="number" step="0.01" value={newTransaction.fees} onChange={(e) => setNewTransaction((prev) => ({ ...prev, fees: Number(e.target.value) }))} placeholder="Nebenkosten" />
            <input value={newTransaction.broker} onChange={(e) => setNewTransaction((prev) => ({ ...prev, broker: e.target.value }))} placeholder="Bank / Broker" />
            <input value={newTransaction.note} onChange={(e) => setNewTransaction((prev) => ({ ...prev, note: e.target.value }))} placeholder="Notiz" style={{ gridColumn: "1 / span 2" }} />
          </div>
          <div style={{ marginTop: "12px" }}>
            <button onClick={addTransaction}>{newTransaction.type === "BUY" ? "Kauf speichern" : "Verkauf speichern"}</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
          <h2 style={{ marginTop: 0 }}>Einstellungen / Agent</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={settings.autoRefreshEnabled} onChange={(e) => setSettings((prev) => ({ ...prev, autoRefreshEnabled: e.target.checked }))} />
              Auto-Refresh aktiv
            </label>
            <div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Intervall Minuten</div>
              <input type="number" min={5} value={settings.autoRefreshMinutes} onChange={(e) => setSettings((prev) => ({ ...prev, autoRefreshMinutes: Number(e.target.value) || 30 }))} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Kursmodus</div>
              <select value={settings.priceMode} onChange={(e) => setSettings((prev) => ({ ...prev, priceMode: e.target.value as Settings["priceMode"] }))}>
                <option value="api">API bevorzugt</option>
                <option value="manual-first">Manuell bevorzugt</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Letzter Auto-Refresh</div>
              <div>{lastAutoRefreshAt ? new Date(lastAutoRefreshAt).toLocaleString("de-DE") : "Noch keiner"}</div>
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
          <h2 style={{ marginTop: 0 }}>Alerts</h2>
          {alerts.length === 0 ? (
            <div style={{ color: "#666" }}>Noch keine Alerts vorhanden.</div>
          ) : (
            <div style={{ display: "grid", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
              {alerts.map((alert) => (
                <div key={alert.id} style={{ background: alertBg(alert.level), border: "1px solid #ddd", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontWeight: "bold" }}>{alert.title}</div>
                  <div style={{ fontSize: "13px" }}>{alert.message}</div>
                  <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>{new Date(alert.createdAt).toLocaleString("de-DE")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto", marginBottom: "24px" }}>
        <h2>{activeTab === "depot" ? "Depotübersicht" : "Watchlist-Übersicht"}</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
          <thead>
            <tr style={{ background: "#f3f3f3" }}>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Aktie</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Ticker</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>WKN</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Kurssymbol</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Kursstatus</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Target</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Stop</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Manuell</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Transaktionen</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Offene Stückzahl</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Ø offener Einstand</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Aktueller / Effektiver Kurs</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Offen investiert</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Depotwert</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Unrealisiert</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Realisiert</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Refresh</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {visiblePositionRows.map((row) => {
              const status = quoteStatuses[row.ticker];

              return (
                <tr key={row.id}>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    <div>
                      <strong>{row.name}</strong>
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{row.sector}</div>
                  </td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>{row.ticker}</td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>{row.wkn}</td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>{row.quoteSymbol}</td>

                  <td style={{ border: "1px solid #ddd", padding: "10px", fontSize: "12px" }}>
                    {status ? status.message : "Noch nicht geladen"}
                  </td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.targetPrice}
                      onChange={(e) => updateSecurityField(row.id, { targetPrice: Number(e.target.value) })}
                      style={{ width: "90px" }}
                    />
                  </td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.stopPrice}
                      onChange={(e) => updateSecurityField(row.id, { stopPrice: Number(e.target.value) })}
                      style={{ width: "90px" }}
                    />
                  </td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.manualPrice}
                      onChange={(e) => updateSecurityField(row.id, { manualPrice: Number(e.target.value) })}
                      style={{ width: "90px" }}
                    />
                  </td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {row.transactionCount} ({row.buyCount} K / {row.sellCount} V)
                  </td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>{row.totalQuantity}</td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>{eur(row.avgBuyPrice)}</td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {row.currentPrice ? eur(row.currentPrice) : "-"} / <strong>{row.effectivePrice ? eur(row.effectivePrice) : "-"}</strong>
                  </td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>{eur(row.invested)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>{eur(row.marketValue)}</td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    <div>{eur(row.pnl)}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{pct(row.pnlPct)}</div>
                  </td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>{eur(row.realizedPnl)}</td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    <button onClick={() => refreshSinglePrice(row)}>Live</button>
                  </td>

                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                  {row.type === "watchlist" ? (
  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
    <button
      onClick={() => {
        setSecurities((prev) =>
          prev.map((s) => (s.id === row.id ? { ...s, type: "depot" } : s))
        );
      }}
    >
      ins Depot
    </button>

    <button
      onClick={() => {
        setSecurities((prev) => prev.filter((s) => s.id !== row.id));
      }}
      style={{
        background: "#c33",
        color: "white",
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      löschen
    </button>
  </div>
) : (
  <button
    onClick={() => {
      setSecurities((prev) => prev.filter((s) => s.id !== row.id));
    }}
    style={{
      background: "#c33",
      color: "white",
      padding: "4px 8px",
      borderRadius: 4,
      fontSize: 12,
    }}
  >
    löschen
  </button>
)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ overflowX: "auto", marginBottom: "24px" }}>
        <h2>Transaktionsjournal</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
          <thead>
            <tr style={{ background: "#f3f3f3" }}>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Datum</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Aktie</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Art</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Stückzahl</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Kurs</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Nebenkosten</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Broker</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Volumen</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Notiz</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ border: "1px solid #ddd", padding: "10px", color: "#666" }}>
                  Noch keine Transaktionen erfasst.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const security = securities.find((s) => s.id === tx.securityId);

                return (
                  <tr key={tx.id}>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{tx.tradeDate || "-"}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                      {security?.name || "-"} ({security?.ticker || "-"})
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{tx.type}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{tx.quantity}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{eur(tx.price)}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{eur(tx.fees)}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{tx.broker || "-"}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{eur(tx.quantity * tx.price + tx.fees)}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{tx.note || "-"}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                      <button onClick={() => deleteTransaction(tx.id)}>Löschen</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", marginBottom: "24px" }}>
  <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}>
    <h2 style={{ marginTop: 0 }}>Depotchart / Performance über Zeit</h2>
    {snapshots.length === 0 ? (
      <div style={{ color: "#666" }}>
        Noch keine Snapshots gespeichert. Mit „Snapshot speichern“ legst du die Entwicklung über Zeit an.
      </div>
    ) : (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "end",
            gap: "10px",
            height: "220px",
            padding: "12px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          {snapshots.map((item) => (
            <div
              key={item.id}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                title={`${item.date}: ${eur(item.marketValue)}`}
                style={{
                  width: "100%",
                  maxWidth: "42px",
                  height: `${Math.max((item.marketValue / maxMarketValue) * 180, 8)}px`,
                  background: item.pnl >= 0 ? "#9fd3a8" : "#e7a3a3",
                  border: "1px solid #bbb",
                  borderRadius: "6px 6px 0 0",
                }}
              />
              <div style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>
                {item.date.slice(5)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</div>

<h2 style={{ fontSize: "24px", marginBottom: "12px" }}>Aktuelle News</h2>
{news.length === 0 ? (
  <div style={{ color: "#666" }}>Noch keine News geladen.</div>
) : (
  <div style={{ display: "grid", gap: "16px" }}>
    {news.map((item, index) => (
      <div
        key={`${item.url}-${index}`}
        style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "16px" }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>{item.title}</div>
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
          {item.source} · {item.time} · {item.sentiment} · {item.tickers}
        </div>
        <div style={{ marginBottom: "10px" }}>{item.summary}</div>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer">
            Artikel öffnen
          </a>
        ) : null}
      </div>
    ))}
  </div>
)}
    </main>
  );
}