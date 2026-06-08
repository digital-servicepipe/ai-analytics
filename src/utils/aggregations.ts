import type {
  Filters,
  Kpi,
  NormalizedLogRow,
  PageType,
  UrlSummary,
} from "../types";
import { formatDate, formatInteger, formatPercent, uniqueSorted } from "./format";

const palette = ["#3157d8", "#7157d9", "#0f9f8f", "#e9893a", "#d43f6a", "#64748b"];

export function filterRows(
  rows: NormalizedLogRow[],
  filters: Filters,
): NormalizedLogRow[] {
  const query = filters.pathQuery.trim().toLowerCase();
  const bots = new Set(filters.botTypes);
  const sections = new Set(filters.sections);
  const countries = new Set(filters.countries);

  return rows.filter((row) => {
    if (filters.dateFrom && (row.date === "Unknown" || row.date < filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && (row.date === "Unknown" || row.date > filters.dateTo)) {
      return false;
    }
    if (bots.size && !bots.has(row.botType)) return false;
    if (sections.size && !sections.has(row.section)) return false;
    if (countries.size && !countries.has(row.country)) return false;
    if (query && !row.path.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function getFilterOptions(rows: NormalizedLogRow[]) {
  const knownDates = rows
    .map((row) => row.date)
    .filter((date) => date !== "Unknown")
    .sort();

  return {
    botTypes: uniqueSorted(rows.map((row) => row.botType)),
    sections: uniqueSorted(rows.map((row) => row.section)),
    countries: uniqueSorted(rows.map((row) => row.country)),
    minDate: knownDates[0] ?? "",
    maxDate: knownDates[knownDates.length - 1] ?? "",
  };
}

export function getDataPeriod(rows: NormalizedLogRow[]): string {
  const dates = rows
    .map((row) => row.date)
    .filter((date) => date !== "Unknown")
    .sort();
  if (!dates.length) return "период неизвестен";
  return `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`;
}

function countBy<T extends string | number>(
  rows: NormalizedLogRow[],
  getter: (row: NormalizedLogRow) => T,
): Map<T, number> {
  const map = new Map<T, number>();
  rows.forEach((row) => {
    const key = getter(row);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return map;
}

export function buildKpis(rows: NormalizedLogRow[]): Kpi[] {
  const total = rows.length;
  const uniquePages = new Set(rows.map((row) => row.path)).size;
  const countBot = (bot: string) =>
    rows.filter((row) => row.botType === bot).length;
  const commercial = rows.filter((row) =>
    ["product", "industry"].includes(row.pageType),
  ).length;

  return [
    {
      label: "Всего обращений",
      value: formatInteger(total),
      hint: "в текущем фильтре",
    },
    {
      label: "Уникальных страниц",
      value: formatInteger(uniquePages),
      hint: "path с обращениями",
    },
    {
      label: "ChatGPT-User",
      value: formatInteger(countBot("ChatGPT-User")),
      hint: "обращения этого ИИ-агента",
    },
    {
      label: "OAI-SearchBot",
      value: formatInteger(countBot("OAI-SearchBot")),
      hint: "обращения этого ИИ-агента",
    },
    {
      label: "GPTBot",
      value: formatInteger(countBot("GPTBot")),
      hint: "обращения этого ИИ-агента",
    },
    {
      label: "Доля коммерческих страниц",
      value: formatPercent(total ? (commercial / total) * 100 : 0),
      hint: "product + industry",
    },
  ];
}

export function buildDailySeries(rows: NormalizedLogRow[]) {
  const bots = Array.from(countBy(rows, (row) => row.botType).keys()).slice(0, 6);
  const dates = Array.from(
    new Set(rows.map((row) => row.date).filter((date) => date !== "Unknown")),
  ).sort();
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    if (row.date === "Unknown" || !bots.includes(row.botType)) return;
    const key = `${row.date}::${row.botType}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return {
    bots,
    colors: Object.fromEntries(bots.map((bot, index) => [bot, palette[index % palette.length]])),
    data: dates.map((date) => {
      const point: Record<string, string | number> = {
        date,
        label: formatDate(date),
      };
      bots.forEach((bot) => {
        point[bot] = counts.get(`${date}::${bot}`) ?? 0;
      });
      return point;
    }),
  };
}

export function buildBotBars(rows: NormalizedLogRow[]) {
  return Array.from(countBy(rows, (row) => row.botType).entries())
    .map(([botType, count]) => ({ botType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

export function buildTopPages(rows: NormalizedLogRow[], limit = 10) {
  return Array.from(countBy(rows, (row) => row.path).entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildPageTypeShare(rows: NormalizedLogRow[]) {
  const titles: Record<PageType, string> = {
    product: "Product",
    blog: "Blog",
    press: "PR",
    news: "News",
    industry: "Industry",
    file: "Files",
    technical: "Technical",
    other: "Other",
  };

  return Array.from(countBy(rows, (row) => row.pageType).entries()).map(
    ([pageType, value], index) => ({
      name: titles[pageType],
      value,
      fill: palette[index % palette.length],
    }),
  );
}

export function buildHourlyActivity(rows: NormalizedLogRow[]) {
  const counts = countBy(
    rows.filter((row) => row.hour !== null),
    (row) => row.hour as number,
  );

  return Array.from({ length: 24 }, (_, hour) => ({
    hour: String(hour).padStart(2, "0"),
    count: counts.get(hour) ?? 0,
  }));
}

export function buildUrlSummaries(rows: NormalizedLogRow[]): UrlSummary[] {
  const groups = new Map<string, NormalizedLogRow[]>();
  rows.forEach((row) => {
    const group = groups.get(row.path) ?? [];
    group.push(row);
    groups.set(row.path, group);
  });

  return Array.from(groups.entries())
    .map(([path, group]) => {
      const sortedDates = group
        .map((row) => row.date)
        .filter((date) => date !== "Unknown")
        .sort();
      const first = sortedDates[0] ?? "Unknown";
      const last = sortedDates[sortedDates.length - 1] ?? "Unknown";

      return {
        path,
        total: group.length,
        chatGptUser: group.filter((row) => row.botType === "ChatGPT-User").length,
        oaiSearchBot: group.filter((row) => row.botType === "OAI-SearchBot").length,
        gptBot: group.filter((row) => row.botType === "GPTBot").length,
        section: group[0]?.section ?? "Other",
        pageType: group[0]?.pageType ?? "other",
        firstSeen: formatDate(first),
        lastSeen: formatDate(last),
        countries: uniqueSorted(group.map((row) => row.country)).slice(0, 6),
        asnCount: new Set(group.map((row) => row.asn)).size,
        userAgentExamples: uniqueSorted(group.map((row) => row.httpUserAgent)).slice(0, 2),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function buildInsights(rows: NormalizedLogRow[]): string[] {
  if (!rows.length) return [];
  const total = rows.length;
  const topBot = buildBotBars(rows)[0];
  const topPage = buildTopPages(rows, 1)[0];
  const topSection = Array.from(countBy(rows, (row) => row.section).entries()).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const chatGpt = rows.filter((row) => row.botType === "ChatGPT-User").length;
  const commercial = rows.filter((row) =>
    ["product", "industry"].includes(row.pageType),
  ).length;

  return [
    topBot
      ? `Основной объем обращений дает ${topBot.botType} - ${formatPercent((topBot.count / total) * 100)}.`
      : "",
    topPage
      ? `Лидирующая страница по запросам ИИ-агентов: ${topPage.path}.`
      : "",
    topSection
      ? `Самый заметный раздел: ${topSection[0]} - ${formatPercent((topSection[1] / total) * 100)}.`
      : "",
    `Доля ChatGPT-User в текущем фильтре: ${formatPercent((chatGpt / total) * 100)}.`,
    `Коммерческие страницы дают ${formatPercent((commercial / total) * 100)} обращений.`,
  ].filter(Boolean);
}
