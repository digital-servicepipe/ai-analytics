import type { Filters, Kpi, NormalizedLogRow, PageType, UrlSummary } from "../types";
import { formatDate, formatInteger, formatPercent, uniqueSorted } from "./format";
import { getAgentDetailLabel } from "./normalize";

const palette = ["#2DD4BF", "#60A5FA", "#A78BFA", "#FB923C", "#FB7185", "#94A3B8"];

export type ActivityGranularity = "hour" | "minute";

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

function rankedValues(
  rows: NormalizedLogRow[],
  getter: (row: NormalizedLogRow) => string,
): string[] {
  return Array.from(countBy(rows, getter).entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return String(left[0]).localeCompare(String(right[0]));
    })
    .map(([value]) => value);
}

function agentDetail(row: NormalizedLogRow): string {
  return getAgentDetailLabel(row.botType, row.httpUserAgent);
}

export function matchesSectionFilter(
  _path: string,
  section: string,
  filters: Filters,
): boolean {
  if (!filters.sections.length) return true;
  return filters.sections.includes(section);
}

export function filterRows(rows: NormalizedLogRow[], filters: Filters): NormalizedLogRow[] {
  const query = filters.pathQuery.trim().toLowerCase();
  const agentGroups = new Set(filters.agentGroups);
  const agentDetails = new Set(filters.agentDetails);
  const countries = new Set(filters.countries);

  return rows.filter((row) => {
    if (filters.dateFrom && (row.date === "Unknown" || row.date < filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && (row.date === "Unknown" || row.date > filters.dateTo)) {
      return false;
    }
    if (agentGroups.size && !agentGroups.has(row.agentGroup)) return false;
    if (agentDetails.size && !agentDetails.has(agentDetail(row))) return false;
    if (!matchesSectionFilter(row.path, row.section, filters)) return false;
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
    agentGroups: rankedValues(rows, (row) => row.agentGroup),
    agentDetails: rankedValues(rows, (row) => agentDetail(row)),
    sections: rankedValues(rows, (row) => row.section),
    countries: rankedValues(rows, (row) => row.country),
    minDate: knownDates[0] ?? "",
    maxDate: knownDates[knownDates.length - 1] ?? "",
  };
}

export function getDataPeriod(rows: NormalizedLogRow[]): string {
  const dates = rows
    .map((row) => row.date)
    .filter((date) => date !== "Unknown")
    .sort();

  if (!dates.length) return "period unknown";
  return `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`;
}

export function buildKpis(rows: NormalizedLogRow[]): Kpi[] {
  const total = rows.length;
  const uniquePaths = new Set(rows.map((row) => row.path)).size;
  const uniqueGroups = new Set(rows.map((row) => row.agentGroup).filter(Boolean)).size;
  const uniqueAgents = new Set(rows.map((row) => agentDetail(row)).filter(Boolean)).size;
  const uniqueSections = new Set(rows.map((row) => row.section).filter(Boolean)).size;
  const activeDays = new Set(rows.map((row) => row.date).filter((date) => date !== "Unknown")).size;

  return [
    { label: "Запросы", value: formatInteger(total), hint: "в текущем срезе" },
    { label: "Path", value: formatInteger(uniquePaths), hint: "уникальные path" },
    { label: "Группы", value: formatInteger(uniqueGroups), hint: "крупные группы ботов" },
    { label: "User-agent", value: formatInteger(uniqueAgents), hint: "короткие имена" },
    { label: "Разделы", value: formatInteger(uniqueSections), hint: "видимые блоки сайта" },
    { label: "Дни", value: formatInteger(activeDays), hint: "активные даты" },
  ];
}

export function buildDailySeries(rows: NormalizedLogRow[]) {
  const groups = buildAgentGroupBars(rows)
    .slice(0, 5)
    .map((item) => item.agentGroup);
  const dates = Array.from(
    new Set(rows.map((row) => row.date).filter((date) => date !== "Unknown")),
  ).sort();
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    if (row.date === "Unknown" || !groups.includes(row.agentGroup)) return;
    const key = `${row.date}::${row.agentGroup}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return {
    bots: groups,
    colors: Object.fromEntries(
      groups.map((group, index) => [group, palette[index % palette.length]]),
    ),
    data: dates.map((date) => {
      const point: Record<string, string | number> = {
        date,
        label: formatDate(date),
      };

      groups.forEach((group) => {
        point[group] = counts.get(`${date}::${group}`) ?? 0;
      });

      return point;
    }),
  };
}

export function buildBotBars(rows: NormalizedLogRow[]) {
  return Array.from(countBy(rows, (row) => row.botType).entries())
    .map(([botType, count]) => ({ botType, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 12);
}

export function buildDetailedAgentBars(rows: NormalizedLogRow[]) {
  return Array.from(countBy(rows, (row) => agentDetail(row)).entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 12);
}

export function buildAgentGroupBars(rows: NormalizedLogRow[]) {
  return Array.from(countBy(rows, (row) => row.agentGroup).entries())
    .map(([agentGroup, count]) => ({ agentGroup, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 12);
}

export function buildTopPages(rows: NormalizedLogRow[], limit = 10) {
  return Array.from(countBy(rows, (row) => row.path).entries())
    .map(([path, count]) => ({ path, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

export function buildPageTypeShare(rows: NormalizedLogRow[]) {
  const titles: Record<PageType, string> = {
    product: "Продукты",
    blog: "Блог",
    press: "Пресс-центр",
    news: "Новости",
    industry: "Отрасли",
    file: "Файлы",
    technical: "Техническое",
    other: "Другое",
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

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minuteKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function minuteLabel(key: string, singleDate: boolean): string {
  const [date, time] = key.split(" ");
  if (singleDate) return time;
  return `${formatDate(date)} ${time}`;
}

export function buildTimeActivity(
  rows: NormalizedLogRow[],
  granularity: ActivityGranularity,
) {
  if (granularity === "hour") {
    return buildHourlyActivity(rows).map((point) => ({
      key: point.hour,
      label: `${point.hour}:00`,
      count: point.count,
    }));
  }

  const groups = new Map<string, number>();
  const dates = new Set<string>();

  rows.forEach((row) => {
    const parsedAt = toDate(row.parsedAt);
    if (!parsedAt) return;

    const key = minuteKey(parsedAt);
    groups.set(key, (groups.get(key) ?? 0) + 1);
    dates.add(key.slice(0, 10));
  });

  const singleDate = dates.size <= 1;
  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => ({
      key,
      label: minuteLabel(key, singleDate),
      count,
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
      const topGroup = buildAgentGroupBars(group)[0];
      const uniqueAgents = new Set(group.map((row) => agentDetail(row))).size;
      const uniqueGroups = new Set(group.map((row) => row.agentGroup)).size;
      const first = sortedDates[0] ?? "Unknown";
      const last = sortedDates[sortedDates.length - 1] ?? "Unknown";

      return {
        path,
        total: group.length,
        topGroup: topGroup?.agentGroup ?? "Unknown",
        topGroupCount: topGroup?.count ?? 0,
        topGroupShare: group.length ? (topGroup?.count ?? 0) / group.length : 0,
        uniqueGroups,
        uniqueAgents,
        section: group[0]?.section ?? "Other",
        pageType: group[0]?.pageType ?? "other",
        firstSeen: formatDate(first),
        lastSeen: formatDate(last),
        countries: uniqueSorted(group.map((row) => row.country)).slice(0, 6),
        asnCount: new Set(group.map((row) => row.asn)).size,
        userAgentExamples: uniqueSorted(group.map((row) => agentDetail(row))).slice(0, 3),
      };
    })
    .sort((left, right) => right.total - left.total);
}

export function buildInsights(rows: NormalizedLogRow[]): string[] {
  if (!rows.length) return [];

  const total = rows.length;
  const topGroup = buildAgentGroupBars(rows)[0];
  const topAgent = buildDetailedAgentBars(rows)[0];
  const topPath = buildTopPages(rows, 1)[0];
  const topSection = Array.from(countBy(rows, (row) => row.section).entries()).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const activeDays = new Set(rows.map((row) => row.date).filter((date) => date !== "Unknown")).size;

  return [
    topGroup ? `${topGroup.agentGroup} даёт ${formatPercent((topGroup.count / total) * 100)} потока.` : "",
    topAgent ? `${topAgent.label} встречается чаще всего.` : "",
    topPath ? `Больше всего запросов получает ${topPath.path}.` : "",
    topSection ? `${topSection[0]} даёт ${formatPercent((topSection[1] / total) * 100)} запросов.` : "",
    activeDays ? `Данные собраны за ${formatInteger(activeDays)} дней.` : "",
  ].filter(Boolean);
}
