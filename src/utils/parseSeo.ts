import type { PageType, SeoMetricRow, SeoSource } from "../types";
import { getPageMeta, normalizePathForJoin } from "./normalize";
import { parseXlsxFile, type SheetTable } from "./xlsx";

type SeoParseResult = {
  rows: SeoMetricRow[];
  rowCount: number;
  sources: SeoSource[];
};

const headerAliases = {
  path: ["path", "url", "page", "страница", "адрес"],
  dateRange: ["datesrange", "daterange", "date", "period", "период", "диапазондат"],
  clicks: ["клики", "kлики", "clicks"],
  impressions: ["показы", "impressions"],
  ctr: ["ctr"],
  position: ["позиция", "position", "avgposition", "avg.position"],
};

function compact(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/[\s._%():;,[\]{}-]+/g, "");
}

function cellText(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}

function findHeader(headers: string[], aliases: string[]): number {
  const normalized = headers.map(compact);
  return normalized.findIndex((header) => aliases.some((alias) => header === compact(alias)));
}

function parseNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = cellText(value);
  if (!raw) return 0;
  const numeric = Number(raw.replace("%", "").replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
}

function inferSource(sheetName: string): SeoSource {
  const normalized = sheetName.toLowerCase();
  if (normalized.includes("google")) return "Google";
  if (normalized.includes("yandex") || normalized.includes("яндекс")) return "Yandex";
  return "Unknown";
}

function parseDateFromFileName(fileName: string): string {
  const match = fileName.match(/(20\d{2})[-_. ](\d{2})[-_. ](\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const russianMonths: Record<string, string> = {
    января: "01",
    февраля: "02",
    марта: "03",
    апреля: "04",
    мая: "05",
    июня: "06",
    июля: "07",
    августа: "08",
    сентября: "09",
    октября: "10",
    ноября: "11",
    декабря: "12",
  };
  const rangeMatch = fileName.toLowerCase().match(/(?:\d{1,2})\s*[-–]\s*(\d{1,2})\s+([а-яё]+)\s+(20\d{2})/);
  if (!rangeMatch) return "";
  const month = russianMonths[rangeMatch[2]];
  if (!month) return "";
  return `${rangeMatch[3]}-${month}-${rangeMatch[1].padStart(2, "0")}`;
}

function parseDateFromRange(value: string | number | null | undefined): string {
  const text = cellText(value);
  const matches = Array.from(text.matchAll(/(20\d{2})-(\d{2})-(\d{2})/g));
  const last = matches[matches.length - 1];
  if (!last) return "";
  return `${last[1]}-${last[2]}-${last[3]}`;
}

function parseTable(
  table: SheetTable,
  file: File,
  fileId: string,
  date: string,
): SeoMetricRow[] {
  const [headerRow, ...dataRows] = table.rows;
  const headers = (headerRow ?? []).map(cellText);
  if (!headers.length) return [];

  const pathIndex = findHeader(headers, headerAliases.path);
  const clicksIndex = findHeader(headers, headerAliases.clicks);
  const impressionsIndex = findHeader(headers, headerAliases.impressions);
  const ctrIndex = findHeader(headers, headerAliases.ctr);
  const positionIndex = findHeader(headers, headerAliases.position);
  const dateRangeIndex = findHeader(headers, headerAliases.dateRange);

  if (pathIndex < 0 || clicksIndex < 0 || impressionsIndex < 0) return [];

  const source = inferSource(table.name);

  return dataRows.flatMap((row, rowIndex) => {
    const rawPath = cellText(row[pathIndex]);
    if (!rawPath) return [];

    const path = normalizePathForJoin(rawPath);
    const meta = getPageMeta(path);
    const clicks = Math.round(parseNumber(row[clicksIndex]));
    const impressions = Math.round(parseNumber(row[impressionsIndex]));
    const ctr = ctrIndex >= 0 ? parseNumber(row[ctrIndex]) : impressions ? (clicks / impressions) * 100 : 0;
    const rowDate = dateRangeIndex >= 0 ? parseDateFromRange(row[dateRangeIndex]) || date : date;

    return [
      {
        id: `${fileId}:${table.name}:${rowIndex}`,
        fileId,
        fileName: file.name,
        source,
        date: rowDate,
        path,
        clicks,
        impressions,
        ctr,
        position: positionIndex >= 0 ? parseNumber(row[positionIndex]) : 0,
        section: meta.section,
        pageType: meta.pageType as PageType,
      },
    ];
  });
}

export async function parseSeoFile(file: File, fileId: string): Promise<SeoParseResult> {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xlsx")) {
    throw new Error("SEO-панель сейчас принимает XLSX-выгрузку Google/Yandex.");
  }

  const tables = await parseXlsxFile(file);
  const date = parseDateFromFileName(file.name);
  const rows = tables.flatMap((table) => parseTable(table, file, fileId, date));
  const sources = Array.from(new Set(rows.map((row) => row.source)));

  if (!rows.length) {
    throw new Error("Не нашёл SEO-колонки: Path, клики, показы, CTR и позиция.");
  }

  return {
    rows,
    rowCount: rows.length,
    sources,
  };
}
