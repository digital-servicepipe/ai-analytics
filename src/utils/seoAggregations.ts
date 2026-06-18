import type { Kpi, PageType, SeoMetricRow, SeoSource } from "../types";
import { formatInteger, formatPercent, uniqueSorted } from "./format";

export type SeoFilters = {
  source: "all" | SeoSource;
  dateFrom: string;
  dateTo: string;
  sections: string[];
  pathQuery: string;
  minImpressions: string;
  minClicks: string;
  minCtr: string;
  maxPosition: string;
  segment: "all" | "clicks" | "noClicks" | "lowCtr" | "nearTop";
};

export type SeoPageSummary = {
  path: string;
  section: string;
  pageType: PageType;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  googleImpressions: number;
  googleClicks: number;
  googleCtr: number;
  googlePosition: number;
  yandexImpressions: number;
  yandexClicks: number;
  yandexCtr: number;
  yandexPosition: number;
  sources: SeoSource[];
};

export type SeoSectionSummary = {
  section: string;
  pages: number;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export type SeoDatePoint = {
  date: string;
  label: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export const emptySeoFilters: SeoFilters = {
  source: "all",
  dateFrom: "",
  dateTo: "",
  sections: [],
  pathQuery: "",
  minImpressions: "",
  minClicks: "",
  minCtr: "",
  maxPosition: "",
  segment: "all",
};

function parseFilterNumber(value: string): number | null {
  if (!value.trim()) return null;
  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function weightedPosition(rows: SeoMetricRow[]): number {
  const weight = rows.reduce((sum, row) => sum + row.impressions, 0);
  if (!weight) return 0;
  return rows.reduce((sum, row) => sum + row.position * row.impressions, 0) / weight;
}

function sourcePosition(rows: SeoMetricRow[], source: SeoSource): number {
  return weightedPosition(rows.filter((row) => row.source === source));
}

function sourceCtr(rows: SeoMetricRow[], source: SeoSource): number {
  const scoped = rows.filter((row) => row.source === source);
  const impressions = scoped.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = scoped.reduce((sum, row) => sum + row.clicks, 0);
  return impressions ? (clicks / impressions) * 100 : 0;
}

export function getSeoFilterOptions(rows: SeoMetricRow[]) {
  const dates = uniqueSorted(rows.map((row) => row.date).filter(Boolean));

  return {
    sources: uniqueSorted(rows.map((row) => row.source)) as SeoSource[],
    sections: uniqueSorted(rows.map((row) => row.section)),
    dates,
    minDate: dates[0] ?? "",
    maxDate: dates[dates.length - 1] ?? "",
  };
}

export function filterSeoRows(rows: SeoMetricRow[], filters: SeoFilters): SeoMetricRow[] {
  const sections = new Set(filters.sections);
  const query = filters.pathQuery.trim().toLowerCase();
  const minImpressions = parseFilterNumber(filters.minImpressions);
  const minClicks = parseFilterNumber(filters.minClicks);
  const minCtr = parseFilterNumber(filters.minCtr);
  const maxPosition = parseFilterNumber(filters.maxPosition);

  return rows.filter((row) => {
    if (filters.source !== "all" && row.source !== filters.source) return false;
    if (filters.dateFrom && (!row.date || row.date < filters.dateFrom)) return false;
    if (filters.dateTo && (!row.date || row.date > filters.dateTo)) return false;
    if (sections.size && !sections.has(row.section)) return false;
    if (query && !row.path.toLowerCase().includes(query)) return false;
    if (minImpressions !== null && row.impressions < minImpressions) return false;
    if (minClicks !== null && row.clicks < minClicks) return false;
    if (minCtr !== null && row.ctr < minCtr) return false;
    if (maxPosition !== null && row.position > maxPosition) return false;
    if (filters.segment === "clicks" && row.clicks <= 0) return false;
    if (filters.segment === "noClicks" && row.clicks > 0) return false;
    if (filters.segment === "lowCtr" && !(row.impressions >= 500 && row.ctr < 1)) return false;
    if (filters.segment === "nearTop" && !(row.position > 3 && row.position <= 15)) return false;
    return true;
  });
}

export function buildSeoDateSeries(rows: SeoMetricRow[]): SeoDatePoint[] {
  const groups = new Map<string, SeoMetricRow[]>();
  rows.forEach((row) => {
    const key = row.date || "Без даты";
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  });

  return Array.from(groups.entries())
    .map(([date, group]) => {
      const impressions = group.reduce((sum, row) => sum + row.impressions, 0);
      const clicks = group.reduce((sum, row) => sum + row.clicks, 0);
      const [, month, day] = date.split("-");

      return {
        date,
        label: month && day ? `${day}.${month}` : date,
        impressions,
        clicks,
        ctr: impressions ? (clicks / impressions) * 100 : 0,
        position: weightedPosition(group),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildSeoPageSummaries(rows: SeoMetricRow[]): SeoPageSummary[] {
  const groups = new Map<string, SeoMetricRow[]>();
  rows.forEach((row) => {
    const group = groups.get(row.path) ?? [];
    group.push(row);
    groups.set(row.path, group);
  });

  return Array.from(groups.entries())
    .map(([path, group]) => {
      const impressions = group.reduce((sum, row) => sum + row.impressions, 0);
      const clicks = group.reduce((sum, row) => sum + row.clicks, 0);
      const google = group.filter((row) => row.source === "Google");
      const yandex = group.filter((row) => row.source === "Yandex");
      const googleImpressions = google.reduce((sum, row) => sum + row.impressions, 0);
      const googleClicks = google.reduce((sum, row) => sum + row.clicks, 0);
      const yandexImpressions = yandex.reduce((sum, row) => sum + row.impressions, 0);
      const yandexClicks = yandex.reduce((sum, row) => sum + row.clicks, 0);

      return {
        path,
        section: group[0]?.section ?? "Другое",
        pageType: group[0]?.pageType ?? "other",
        impressions,
        clicks,
        ctr: impressions ? (clicks / impressions) * 100 : 0,
        position: weightedPosition(group),
        googleImpressions,
        googleClicks,
        googleCtr: sourceCtr(group, "Google"),
        googlePosition: sourcePosition(group, "Google"),
        yandexImpressions,
        yandexClicks,
        yandexCtr: sourceCtr(group, "Yandex"),
        yandexPosition: sourcePosition(group, "Yandex"),
        sources: uniqueSorted(group.map((row) => row.source)) as SeoSource[],
      };
    })
    .sort((a, b) => b.impressions - a.impressions);
}

export function buildSeoKpis(rows: SeoMetricRow[], pages: SeoPageSummary[]): Kpi[] {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const ctr = impressions ? (clicks / impressions) * 100 : 0;
  const avgPosition = weightedPosition(rows);

  return [
    {
      label: "Страницы",
      value: formatInteger(pages.length),
      hint: "уникальные URL в выборке",
    },
    {
      label: "Показы",
      value: formatInteger(impressions),
      hint: "суммарная видимость в поиске",
    },
    {
      label: "Клики",
      value: formatInteger(clicks),
      hint: "переходы из Google и Яндекса",
    },
    {
      label: "CTR",
      value: formatPercent(ctr),
      hint: "клики / показы",
    },
    {
      label: "Позиция",
      value: avgPosition.toLocaleString("ru-RU", { maximumFractionDigits: 2 }),
      hint: "средняя, взвешена по показам",
    },
    {
      label: "Без кликов",
      value: formatInteger(pages.filter((row) => row.clicks === 0 && row.impressions > 0).length),
      hint: "есть показы, но нет переходов",
    },
  ];
}

export function buildSeoSourceComparison(rows: SeoMetricRow[]) {
  return (["Google", "Yandex"] as SeoSource[])
    .map((source) => {
      const scoped = rows.filter((row) => row.source === source);
      const impressions = scoped.reduce((sum, row) => sum + row.impressions, 0);
      const clicks = scoped.reduce((sum, row) => sum + row.clicks, 0);
      return {
        source: source === "Yandex" ? "Яндекс" : "Google",
        impressions,
        clicks,
        ctr: impressions ? (clicks / impressions) * 100 : 0,
        position: weightedPosition(scoped),
      };
    })
    .filter((row) => row.impressions || row.clicks);
}

export function buildSeoSectionSummaries(pages: SeoPageSummary[]): SeoSectionSummary[] {
  const groups = new Map<string, SeoPageSummary[]>();
  pages.forEach((page) => {
    const group = groups.get(page.section) ?? [];
    group.push(page);
    groups.set(page.section, group);
  });

  return Array.from(groups.entries())
    .map(([section, group]) => {
      const impressions = group.reduce((sum, row) => sum + row.impressions, 0);
      const clicks = group.reduce((sum, row) => sum + row.clicks, 0);
      const weight = group.reduce((sum, row) => sum + row.impressions, 0);
      return {
        section,
        pages: group.length,
        impressions,
        clicks,
        ctr: impressions ? (clicks / impressions) * 100 : 0,
        position: weight
          ? group.reduce((sum, row) => sum + row.position * row.impressions, 0) / weight
          : 0,
      };
    })
    .sort((a, b) => b.impressions - a.impressions);
}

export function buildSeoOpportunities(pages: SeoPageSummary[]) {
  return {
    trafficLeaders: [...pages].sort((a, b) => b.clicks - a.clicks).slice(0, 8),
    highDemandLowCtr: [...pages]
      .filter((row) => row.impressions >= 500 && row.ctr < 1)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 8),
    nearTop: [...pages]
      .filter((row) => row.position > 3 && row.position <= 15)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 8),
  };
}
