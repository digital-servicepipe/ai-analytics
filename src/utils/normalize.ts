import type { NormalizedLogRow, PageType, RawLogRow } from "../types";

export const REQUIRED_COLUMNS = [
  "datetime",
  "http_user_agent",
  "uniq_id",
  "path",
  "cresp_country",
  "cresp_asn",
  "cresp_subnet",
  "bot_type",
];

const productPaths = [
  "/web-ddos-protection",
  "/antibot",
  "/waf",
  "/ip-transit",
  "/web-log-analysis",
  "/dosgate",
  "/cybert",
  "/flowcollector",
  "/secure-dns-hosting",
  "/stress-test",
  "/visibla/scan",
  "/visibla/verify",
];

const technicalNeedles = [
  ".json",
  ".env",
  ".git",
  "manifest",
  "build-manifest",
  "asset-manifest",
];

function value(row: RawLogRow, key: string): string {
  return String(row[key] ?? "").trim();
}

export function parseDatetime(raw: string): {
  parsedAt: Date | null;
  date: string;
  hour: number | null;
} {
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (!match) {
    return { parsedAt: null, date: "Unknown", hour: null };
  }

  const [, year, month, day, hour, minute, second] = match;
  const parsedAt = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  if (Number.isNaN(parsedAt.getTime())) {
    return { parsedAt: null, date: "Unknown", hour: null };
  }

  return {
    parsedAt,
    date: `${year}-${month}-${day}`,
    hour: Number(hour),
  };
}

function startsWithSegment(path: string, segment: string): boolean {
  return path === segment || path.startsWith(`${segment}/`);
}

export function getPageMeta(pathValue: string): {
  section: string;
  pageType: PageType;
} {
  const path = pathValue.toLowerCase();

  if (path.startsWith("/blog")) {
    return { section: "Blog / cases", pageType: "blog" };
  }
  if (path.startsWith("/press-center")) {
    return { section: "PR / press-center", pageType: "press" };
  }
  if (path.startsWith("/news")) {
    return { section: "News", pageType: "news" };
  }
  if (path.startsWith("/uploads") || path.startsWith("/assets")) {
    return { section: "Files / assets", pageType: "file" };
  }
  if (
    startsWithSegment(path, "/finance") ||
    startsWithSegment(path, "/retail") ||
    startsWithSegment(path, "/telecom")
  ) {
    return { section: "Industry pages", pageType: "industry" };
  }
  if (technicalNeedles.some((needle) => path.includes(needle))) {
    return { section: "Technical / noise", pageType: "technical" };
  }
  if (productPaths.some((productPath) => startsWithSegment(path, productPath))) {
    return { section: "Product / service", pageType: "product" };
  }

  return { section: "Other", pageType: "other" };
}

export function normalizeRow(row: RawLogRow): NormalizedLogRow {
  const datetimeRaw = value(row, "datetime");
  const path = value(row, "path") || "Unknown path";
  const botType = value(row, "bot_type") || "Unknown bot";
  const { parsedAt, date, hour } = parseDatetime(datetimeRaw);
  const { section, pageType } = getPageMeta(path);

  return {
    datetimeRaw,
    parsedAt,
    date,
    hour,
    httpUserAgent: value(row, "http_user_agent") || "Unknown user-agent",
    uniqId: value(row, "uniq_id"),
    path,
    country: value(row, "cresp_country") || "Unknown country",
    asn: value(row, "cresp_asn") || "Unknown ASN",
    subnet: value(row, "cresp_subnet"),
    botType,
    section,
    pageType,
  };
}
