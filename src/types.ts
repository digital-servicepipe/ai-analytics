export type RawLogRow = Record<string, string | undefined>;

export type PageType =
  | "product"
  | "blog"
  | "press"
  | "news"
  | "industry"
  | "file"
  | "technical"
  | "other";

export type NormalizedLogRow = {
  datetimeRaw: string;
  parsedAt: Date | null;
  date: string;
  hour: number | null;
  httpUserAgent: string;
  uniqId: string;
  path: string;
  country: string;
  asn: string;
  subnet: string;
  botType: string;
  section: string;
  pageType: PageType;
};

export type Filters = {
  dateFrom: string;
  dateTo: string;
  botTypes: string[];
  sections: string[];
  countries: string[];
  pathQuery: string;
};

export type Kpi = {
  label: string;
  value: string;
  hint: string;
};

export type UrlSummary = {
  path: string;
  total: number;
  chatGptUser: number;
  oaiSearchBot: number;
  gptBot: number;
  section: string;
  pageType: PageType;
  firstSeen: string;
  lastSeen: string;
  countries: string[];
  asnCount: number;
  userAgentExamples: string[];
};

export type SortKey =
  | "total"
  | "chatGptUser"
  | "oaiSearchBot"
  | "gptBot"
  | "asnCount";

export type ParseResult = {
  rows: NormalizedLogRow[];
  rowCount: number;
};
