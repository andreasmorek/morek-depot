export type StockSearchItem = {
  symbol: string;
  name: string;
  wkn: string;
};

export const stockUniverse: StockSearchItem[] = [
  { symbol: "NVDA", name: "NVIDIA Corp.", wkn: "918422" },
  { symbol: "AMD", name: "Advanced Micro Devices", wkn: "863186" },
  { symbol: "TSLA", name: "Tesla Inc.", wkn: "A1CX3T" },
  { symbol: "AAPL", name: "Apple Inc.", wkn: "865985" },
  { symbol: "MSFT", name: "Microsoft Corp.", wkn: "870747" },
  { symbol: "AMZN", name: "Amazon.com Inc.", wkn: "906866" },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A", wkn: "A14Y6F" },
  { symbol: "META", name: "Meta Platforms Inc.", wkn: "A1JWVX" },
  { symbol: "ASML", name: "ASML Holding", wkn: "A1J4U4" },
  { symbol: "TSM", name: "Taiwan Semiconductor", wkn: "909800" },
  { symbol: "PLTR", name: "Palantir Technologies", wkn: "A2QA4J" },
  { symbol: "SMCI", name: "Super Micro Computer", wkn: "A0MKJF" },
  { symbol: "ARM", name: "Arm Holdings ADR", wkn: "A3EUCD" },
  { symbol: "AVGO", name: "Broadcom Inc.", wkn: "A2JG9Z" },
  { symbol: "QCOM", name: "Qualcomm Inc.", wkn: "883121" },
  { symbol: "CRM", name: "Salesforce Inc.", wkn: "A0B87V" },
  { symbol: "ORCL", name: "Oracle Corp.", wkn: "871460" },
  { symbol: "SAP", name: "SAP SE", wkn: "716460" },
  { symbol: "ADBE", name: "Adobe Inc.", wkn: "871981" },
  { symbol: "SNOW", name: "Snowflake Inc.", wkn: "A2QB38" },
];