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
  minute: number | null;
  httpUserAgent: string;
  uniqId: string;
  path: string;
  country: string;
  asn: string;
  subnet: string;
  botType: string;
  agentGroup: string;
  section: string;
  pageType: PageType;
};

export type Filters = {
  dateFrom: string;
  dateTo: string;
  agentGroups: string[];
  agentDetails: string[];
  sections: string[];
  countries: string[];
  pathQuery: string;
};

export type Kpi = {
  label: string;
  value: string;
  hint: string;
};

export type InsightTone = "signal" | "opportunity" | "watch";

export type InsightItem = {
  title: string;
  body: string;
  action: string;
  tone: InsightTone;
};

export type IntentSummary = {
  label: string;
  purpose: string;
  count: number;
  share: number;
  action: string;
};

export type UrlSummary = {
  path: string;
  total: number;
  topGroup: string;
  topGroupCount: number;
  topGroupShare: number;
  uniqueGroups: number;
  uniqueAgents: number;
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
  | "topGroupCount"
  | "uniqueGroups"
  | "uniqueAgents"
  | "asnCount";

export type ParseResult = {
  rows: NormalizedLogRow[];
  rowCount: number;
};

export type FileKind = "logs";

export type UploadedFileMeta = {
  id: string;
  kind: FileKind;
  name: string;
  rowCount: number;
  uploadedAt: string;
};

export type PersistedDashboardState = {
  version: 2;
  rows: NormalizedLogRow[];
  files: UploadedFileMeta[];
};
