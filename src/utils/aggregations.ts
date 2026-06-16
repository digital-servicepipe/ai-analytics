import type {
  Filters,
  InsightItem,
  IntentSummary,
  Kpi,
  NormalizedLogRow,
  PageType,
  UrlSummary,
} from "../types";
import { formatDate, formatInteger, formatPercent, uniqueSorted } from "./format";
import { getAgentDetailLabel, getAgentIntentProfile } from "./normalize";
import { getPageTitle } from "./pageTitles";

const palette = ["#2DD4BF", "#60A5FA", "#A78BFA", "#FB923C", "#FB7185", "#94A3B8"];

export type ActivityGranularity = "hour" | "minute";

export type InsightsContext = {
  sitemapPaths?: string[];
  blockedPaths?: Array<{ path: string; total: number; rules: string[] }>;
};

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
      return String(left[0]).localeCompare(String(right[0]), "ru");
    })
    .map(([value]) => value);
}

function agentDetail(row: NormalizedLogRow): string {
  return getAgentDetailLabel(row.botType, row.httpUserAgent);
}

function pageTypePriority(pageType: PageType): number {
  switch (pageType) {
    case "product":
    case "press":
      return 5;
    case "news":
    case "industry":
      return 4;
    case "blog":
      return 3;
    case "other":
      return 2;
    default:
      return 0;
  }
}

function pageAction(pageType: PageType): string {
  switch (pageType) {
    case "product":
      return "Добавьте выгоды, FAQ, сценарии применения и короткий ответ в первом экране.";
    case "press":
    case "news":
      return "Добавьте цитаты, цифры, даты и фрагменты, которые удобно пересказывать в AI-ответах.";
    case "blog":
      return "Поднимите наверх вывод, тезисы и прямой ответ на главный вопрос.";
    case "industry":
      return "Усильте отраслевые use case, примеры и формулировки под роль клиента.";
    default:
      return "Сделайте страницу проще: один главный месседж, тезисы и явный следующий шаг.";
  }
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
    .map(([path, count]) => ({ path, count, title: getPageTitle(path) }))
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
        title: getPageTitle(path),
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

export function buildAgentIntentSummary(rows: NormalizedLogRow[], limit = 6): IntentSummary[] {
  const total = rows.length || 1;

  return buildDetailedAgentBars(rows)
    .slice(0, limit)
    .map((item) => {
      const profile = getAgentIntentProfile(item.label, item.label);
      return {
        label: item.label,
        purpose: profile.purpose,
        count: item.count,
        share: item.count / total,
        action: profile.action,
      };
    });
}

export function buildLowSignalPaths(rows: NormalizedLogRow[], limit = 6) {
  const summaries = buildUrlSummaries(rows).filter((item) => pageTypePriority(item.pageType) > 0);
  if (!summaries.length) return [];

  const lowThreshold = summaries.some((item) => item.total <= 3) ? 3 : 5;

  return summaries
    .filter((item) => item.total <= lowThreshold)
    .sort((left, right) => {
      const priorityDiff = pageTypePriority(right.pageType) - pageTypePriority(left.pageType);
      if (priorityDiff !== 0) return priorityDiff;
      if (left.total !== right.total) return left.total - right.total;
      return left.path.localeCompare(right.path, "ru");
    })
    .slice(0, limit)
    .map((item) => {
      const profile = getAgentIntentProfile(item.topGroup, item.userAgentExamples[0] ?? item.topGroup);
      return {
        path: item.path,
        count: item.total,
        section: item.section,
        topGroup: item.topGroup,
        purpose: profile.purpose,
        action: pageAction(item.pageType),
      };
    });
}

export function buildInsights(
  rows: NormalizedLogRow[],
  context: InsightsContext = {},
): InsightItem[] {
  if (!rows.length) return [];

  const total = rows.length;
  const topGroup = buildAgentGroupBars(rows)[0];
  const topIntent = buildAgentIntentSummary(rows, 1)[0];
  const topPath = buildTopPages(rows, 1)[0];
  const lowSignal = buildLowSignalPaths(rows, 2);
  const topSection = Array.from(countBy(rows, (row) => row.section).entries()).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const pressShare = rows.filter((row) => row.pageType === "press" || row.pageType === "news").length;
  const productShare = rows.filter((row) => row.pageType === "product").length;
  const sitemapPaths = context.sitemapPaths ?? [];
  const trafficPaths = Array.from(new Set(rows.map((row) => row.path)));
  const sitemapSet = new Set(sitemapPaths);
  const coveredSitemapCount = sitemapPaths.filter((path) => trafficPaths.includes(path)).length;
  const uncoveredSitemapCount = sitemapPaths.length - coveredSitemapCount;
  const pathsOutsideSitemap = trafficPaths.filter((path) => !sitemapSet.has(path));
  const blockedPaths = context.blockedPaths ?? [];
  const insights: InsightItem[] = [];

  if (topGroup && topIntent) {
    insights.push({
      title: `${topGroup.agentGroup} формирует основной слой AI-видимости`,
      body: `${topGroup.agentGroup} даёт ${formatPercent((topGroup.count / total) * 100)} запросов. Сейчас именно этот контур сильнее всего влияет на то, как страницы считываются ассистентами и AI-поиском.`,
      action: topIntent.action,
      tone: "signal",
    });
  }

  if (topPath && topSection) {
    insights.push({
      title: "Главный магнит спроса уже виден",
      body: `${topPath.path} сейчас получает больше всего запросов, а раздел ${topSection[0]} собирает ${formatPercent((topSection[1] / total) * 100)} потока. Это ориентир, какие формулировки и структура лучше всего цепляют ботов.`,
      action: "Перенесите на соседние path тот же паттерн: короткий ответ сверху, факты, кейсы и заметные внутренние ссылки.",
      tone: "signal",
    });
  }

  if (sitemapPaths.length) {
    insights.push({
      title: "Покрытие sitemap показывает, где видимость ещё не собрана",
      body: `Из ${formatInteger(sitemapPaths.length)} URL в sitemap запросы есть только у ${formatInteger(coveredSitemapCount)}. Остальные ${formatInteger(uncoveredSitemapCount)} страниц пока не вошли в рабочий AI-контур.`,
      action: "Проверьте внутренние ссылки, title/description, первый экран и наличие явного ответа. Начните с product, press и news path без запросов.",
      tone: uncoveredSitemapCount > 0 ? "opportunity" : "signal",
    });
  }

  if (lowSignal.length) {
    const first = lowSignal[0];
    const second = lowSignal[1];
    insights.push({
      title: "Есть path с низким сигналом, но с потенциалом роста",
      body: second
        ? `${first.path} и ${second.path} получают мало запросов, хотя лежат в важных разделах. Такие страницы редко попадают в рабочий контур AI-ботов и теряют шанс на упоминание в ответах.`
        : `${first.path} получает мало запросов, хотя лежит в важном разделе. Такая страница недобирает шанс попасть в контур AI-ответов.`,
      action: first.action,
      tone: "opportunity",
    });
  }

  if (pathsOutsideSitemap.length) {
    insights.push({
      title: "Часть запросов идёт на path вне sitemap",
      body: `${formatInteger(pathsOutsideSitemap.length)} path есть в логах, но их нет в sitemap. Значит, боты находят их через внешние ссылки, старые URL или технические переходы.`,
      action: "Сверьте эти path с sitemap и навигацией: нужные добавьте в индексный контур, лишние склейте, закройте или уберите из маршрутов.",
      tone: "watch",
    });
  }

  if (blockedPaths.length) {
    const topBlocked = blockedPaths
      .slice()
      .sort((left, right) => right.total - left.total)[0];
    insights.push({
      title: "Есть запросы к URL, которые закрыты robots.txt",
      body: `${formatInteger(blockedPaths.length)} path из текущего среза попадают под disallow. Самый заметный пример: ${topBlocked.path} с ${formatInteger(topBlocked.total)} запросами.`,
      action: "Сверьте robots.txt с реальным поведением ботов: часть URL стоит открыть, часть убрать из sitemap и навигации, чтобы не тратить crawl-бюджет.",
      tone: "watch",
    });
  }

  if (pressShare > 0) {
    insights.push({
      title: "Репутационный и новостной слой уже считывается ботами",
      body: `Пресс-центр и новости дают ${formatPercent((pressShare / total) * 100)} запросов. Это значит, что AI-боты уже используют этот слой как источник фактов, цитат и контекста про бренд.`,
      action: "Усильте новости и пресс-материалы: цитаты, имена спикеров, даты, цифры и блоки, которые удобно пересказывать.",
      tone: "signal",
    });
  }

  if (productShare > 0) {
    insights.push({
      title: "Продуктовые path можно докрутить под спрос из AI",
      body: `Продуктовый слой даёт ${formatPercent((productShare / total) * 100)} запросов. Это хороший резерв, чтобы чаще попадать в AI-ответы не только брендом, но и конкретными решениями.`,
      action: "Добавьте на продуктовые страницы сравнения, FAQ, сценарии применения, возражения и блок “для кого это”.",
      tone: "opportunity",
    });
  }

  return insights.slice(0, 6);
}
