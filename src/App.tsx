import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  LayoutDashboard,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  Waypoints,
} from "lucide-react";
import { ChartsGrid } from "./components/ChartsGrid";
import { EmptyState } from "./components/EmptyState";
import { FiltersBar } from "./components/FiltersBar";
import { KpiCard } from "./components/KpiCard";
import { SiteMapBoard } from "./components/SiteMapBoard";
import { SiteMapExplorer } from "./components/SiteMapExplorer";
import { UploadZone } from "./components/UploadZone";
import { UrlTable } from "./components/UrlTable";
import {
  DEFAULT_ROBOTS_FILE,
  DEFAULT_ROBOTS_TXT,
  DEFAULT_SITEMAP_FILES,
  DEFAULT_SITEMAP_XML,
} from "./data/defaultSiteFiles";
import type {
  Filters,
  NormalizedLogRow,
  PersistedDashboardState,
  UploadedFileMeta,
} from "./types";
import {
  buildAgentIntentSummary,
  buildAgentGroupBars,
  buildDetailedAgentBars,
  buildKpis,
  buildLowSignalPaths,
  buildPageTypeShare,
  buildTimeActivity,
  buildTopPages,
  buildUrlSummaries,
  filterRows,
  getDataPeriod,
  getFilterOptions,
} from "./utils/aggregations";
import { formatInteger, formatPercent, truncateMiddle } from "./utils/format";
import { parseCsvFile } from "./utils/parseCsv";
import { getPageTitle } from "./utils/pageTitles";
import { loadPersistedState, savePersistedState } from "./utils/storage";

const emptyFilters: Filters = {
  dateFrom: "",
  dateTo: "",
  agentGroups: [],
  agentDetails: [],
  sections: [],
  countries: [],
  pathQuery: "",
};

type ScreenKey = "overview" | "pages" | "map" | "control";

type RankingRow = {
  label: string;
  value: string;
  hint?: string;
};

type StatRow = {
  label: string;
  value: string;
  hint: string;
};

type TopPathRow = {
  path: string;
  title: string;
  count: number;
};

type LoadedSitemapFile = {
  name: string;
  content: string;
};

function createFileId(): string {
  return `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function formatDateTime(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return "Нет данных";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function buildFullUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `https://servicepipe.ru${encodeURI(normalizedPath)}`;
}

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M13.8 13.8 18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <path
        d="M16.5 5.5h3M18 4v3"
        stroke="#A78BFA"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function buildRankingRows(
  rows: NormalizedLogRow[],
  key: "section",
  hintLabel: string,
  limit = 6,
): RankingRow[] {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const value = row[key] || "Unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      value: formatInteger(count),
      hint: hintLabel,
    }));
}

function RankingCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: RankingRow[];
}) {
  return (
    <article className="panel h-full p-4">
      <div className="mb-4">
        <h2 className="text-sm font-extrabold text-ink">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>

      <div className="space-y-2">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={`${title}:${row.label}`}
              className="flex items-start justify-between gap-3 rounded-2xl bg-surface px-3 py-3"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-bold leading-5 text-ink">{row.label}</p>
                {row.hint && (
                  <p className="mt-0.5 break-words text-xs leading-5 text-muted">{row.hint}</p>
                )}
              </div>
              <span className="shrink-0 text-right text-sm font-extrabold text-aqua">
                {row.value}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-surface px-3 py-3 text-sm text-muted">
            Недостаточно данных
          </div>
        )}
      </div>
    </article>
  );
}

function TopPathsPanel({ rows }: { rows: TopPathRow[] }) {
  const [copied, setCopied] = useState("");

  const copyUrl = async (path: string) => {
    const fullUrl = buildFullUrl(path);
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(path);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };

  return (
    <article className="panel h-full p-4">
      <div className="mb-4">
        <h2 className="text-sm font-extrabold text-ink">Топ path</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          15 страниц с самым заметным потоком. Можно сразу открыть или скопировать ссылку.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const fullUrl = buildFullUrl(row.path);
          return (
            <div
              key={row.path}
              className="flex items-start justify-between gap-3 rounded-2xl bg-surface px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <a
                  className="block break-words text-sm font-bold leading-5 text-ink hover:text-aqua"
                  href={fullUrl}
                  rel="noreferrer"
                  target="_blank"
                  title={fullUrl}
                >
                  {row.title}
                </a>
                <p className="mt-1 break-all text-xs leading-5 text-muted">{row.path}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {formatInteger(row.count)} запросов
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  className="control inline-flex h-9 w-9 items-center justify-center text-ink"
                  type="button"
                  title="Скопировать ссылку"
                  onClick={() => void copyUrl(row.path)}
                >
                  {copied === row.path ? (
                    <Check className="h-4 w-4 text-aqua" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                <a
                  className="control inline-flex h-9 w-9 items-center justify-center text-ink hover:text-aqua"
                  href={fullUrl}
                  rel="noreferrer"
                  target="_blank"
                  title="Открыть страницу"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function HealthPanel({ rows }: { rows: StatRow[] }) {
  return (
    <article className="panel h-full p-4">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-aqua" aria-hidden="true" />
        <h2 className="text-sm font-extrabold text-ink">Сейчас</h2>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl bg-surface px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{row.label}</p>
                <p className="mt-1 break-words text-xs leading-5 text-muted">{row.hint}</p>
              </div>
              <span className="max-w-[55%] break-words text-right text-sm font-extrabold text-ink">
                {row.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function SettingsPanel({
  files,
  period,
  rowCount,
  firstSeen,
  lastSeen,
  onAdd,
  onClear,
  onResetFilters,
}: {
  files: UploadedFileMeta[];
  period: string;
  rowCount: number;
  firstSeen: string;
  lastSeen: string;
  onAdd: () => void;
  onClear: () => void;
  onResetFilters: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <article className="panel p-5">
        <div className="mb-5">
          <h2 className="text-lg font-extrabold text-ink">Файлы</h2>
          <p className="mt-1 text-sm text-muted">
            Загружайте CSV, объединяйте их в один набор и очищайте базу, если нужно.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-xs font-bold uppercase text-muted">Файлы</p>
            <p className="mt-2 break-words text-sm font-extrabold text-ink">
              {files.length === 1 ? files[0]?.name : `${files.length} CSV`}
            </p>
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-xs font-bold uppercase text-muted">Период</p>
            <p className="mt-2 text-sm font-extrabold text-ink">{period}</p>
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-xs font-bold uppercase text-muted">Первая запись</p>
            <p className="mt-2 text-sm font-extrabold text-ink">{firstSeen}</p>
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-xs font-bold uppercase text-muted">Последняя запись</p>
            <p className="mt-2 text-sm font-extrabold text-ink">{lastSeen}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-aqua px-4 py-2.5 text-sm font-extrabold text-[#071314]"
            type="button"
            onClick={onAdd}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Добавить CSV
          </button>
          <button
            className="control inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-ink"
            type="button"
            onClick={onResetFilters}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Сбросить фильтры
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-red-300/30 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700"
            type="button"
            onClick={onClear}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Очистить данные
          </button>
        </div>
      </article>

      <article className="panel p-5">
        <h2 className="text-sm font-extrabold text-ink">База</h2>
        <div className="mt-4 space-y-2">
          <div className="rounded-2xl bg-surface px-3 py-3">
            <p className="text-xs font-bold uppercase text-muted">Строки</p>
            <p className="mt-2 text-2xl font-extrabold text-ink">{formatInteger(rowCount)}</p>
          </div>
          <div className="rounded-2xl bg-surface px-3 py-3">
            <p className="text-xs font-bold uppercase text-muted">Набор</p>
            <p className="mt-2 text-sm font-extrabold text-ink">
              {files.length ? `${files.length} файлов` : "Пусто"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Можно загружать несколько CSV подряд. Они объединяются автоматически.
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}

export function App() {
  const [rows, setRows] = useState<NormalizedLogRow[]>([]);
  const [files, setFiles] = useState<UploadedFileMeta[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("overview");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sitemapFiles, setSitemapFiles] = useState<LoadedSitemapFile[]>([
    { name: "sitemap.xml", content: DEFAULT_SITEMAP_XML },
  ]);
  const [robotsTxt, setRobotsTxt] = useState(DEFAULT_ROBOTS_TXT);
  const logInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPersistedState()
      .then((state) => {
        setRows(state.rows);
        setFiles(state.files);
      })
      .catch((caught) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "Не удалось восстановить сохранённые файлы.",
        );
      })
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    const loadSiteDefaults = async () => {
      try {
        const baseUrl = document.baseURI;
        const loadedSitemaps = await Promise.all(
          DEFAULT_SITEMAP_FILES.map(async (path) => {
            const response = await fetch(new URL(path, baseUrl));
            if (!response.ok) throw new Error(path);
            return {
              name: path.split("/").pop() ?? path,
              content: await response.text(),
            };
          }),
        );
        const robotsResponse = await fetch(new URL(DEFAULT_ROBOTS_FILE, baseUrl));
        if (!robotsResponse.ok) throw new Error(DEFAULT_ROBOTS_FILE);
        setSitemapFiles(loadedSitemaps);
        setRobotsTxt(await robotsResponse.text());
      } catch {
        setSitemapFiles([{ name: "sitemap.xml", content: DEFAULT_SITEMAP_XML }]);
        setRobotsTxt(DEFAULT_ROBOTS_TXT);
      }
    };

    void loadSiteDefaults();
  }, []);

  const persistState = async (nextState: PersistedDashboardState) => {
    setRows(nextState.rows);
    setFiles(nextState.files);
    await savePersistedState(nextState);
  };

  const allOptions = useMemo(() => getFilterOptions(rows), [rows]);
  const filteredRows = useMemo(() => filterRows(rows, filters), [filters, rows]);
  const kpis = useMemo(() => buildKpis(filteredRows), [filteredRows]);
  const urlSummaries = useMemo(() => buildUrlSummaries(filteredRows), [filteredRows]);
  const period = useMemo(() => getDataPeriod(rows), [rows]);
  const filterOptions = useMemo(
    () => ({
      ...allOptions,
      agentGroups: getFilterOptions(
        filterRows(rows, { ...filters, agentGroups: [], agentDetails: [] }),
      ).agentGroups,
      agentDetails: getFilterOptions(
        filterRows(rows, { ...filters, agentDetails: [] }),
      ).agentDetails,
      sections: getFilterOptions(filterRows(rows, { ...filters, sections: [] })).sections,
      countries: getFilterOptions(filterRows(rows, { ...filters, countries: [] })).countries,
    }),
    [allOptions, filters, rows],
  );

  const groupRows = useMemo(
    () =>
      buildAgentGroupBars(filteredRows)
        .slice(0, 6)
        .map((item) => ({
          label: item.agentGroup,
          value: formatInteger(item.count),
          hint: "запросов",
        })),
    [filteredRows],
  );

  const detailRows = useMemo(
    () =>
      buildDetailedAgentBars(filteredRows)
        .slice(0, 6)
        .map((item) => ({
          label: truncateMiddle(item.label, 36),
          value: formatInteger(item.count),
        })),
    [filteredRows],
  );

  const intentRows = useMemo(
    () =>
      buildAgentIntentSummary(filteredRows, 6).map((item) => ({
        label: item.label,
        value: formatPercent(item.share * 100),
        hint: item.purpose,
      })),
    [filteredRows],
  );

  const sectionRows = useMemo(
    () => buildRankingRows(filteredRows, "section", "запросов"),
    [filteredRows],
  );

  const topPathRows = useMemo<TopPathRow[]>(
    () => buildTopPages(filteredRows, 15),
    [filteredRows],
  );

  const lowSignalRows = useMemo(
    () =>
      buildLowSignalPaths(filteredRows, 6).map((item) => ({
        label: truncateMiddle(getPageTitle(item.path), 44),
        value: formatInteger(item.count),
        hint: `${truncateMiddle(item.path, 36)} · ${item.section}`,
      })),
    [filteredRows],
  );

  const healthRows = useMemo<StatRow[]>(() => {
    const total = filteredRows.length;
    const agentGroups = buildAgentGroupBars(filteredRows);
    const detailedAgents = buildDetailedAgentBars(filteredRows);
    const pageTypes = buildPageTypeShare(filteredRows).sort(
      (left, right) => right.value - left.value,
    );
    const peakMinute = buildTimeActivity(filteredRows, "minute").reduce(
      (best, current) => (current.count > best.count ? current : best),
      { key: "", label: "--", count: 0 },
    );
    const peakHour = buildTimeActivity(filteredRows, "hour").reduce(
      (best, current) => (current.count > best.count ? current : best),
      { key: "", label: "--", count: 0 },
    );

    return [
      {
        label: "Главная группа",
        value: agentGroups[0]?.agentGroup ?? "Нет данных",
        hint: agentGroups[0]
          ? `${formatPercent((agentGroups[0].count / total) * 100)} потока`
          : "Нет данных",
      },
      {
        label: "Главный user-agent",
        value: truncateMiddle(detailedAgents[0]?.label ?? "Нет данных", 30),
        hint: detailedAgents[0]
          ? `${formatInteger(detailedAgents[0].count)} запросов`
          : "Нет данных",
      },
      {
        label: "Пик по минуте",
        value: peakMinute.label,
        hint: `${formatInteger(peakMinute.count)} запросов`,
      },
      {
        label: "Пик по часу",
        value: peakHour.label,
        hint: `${formatInteger(peakHour.count)} запросов`,
      },
      {
        label: "Тип path",
        value: pageTypes[0]?.name ?? "Нет данных",
        hint: pageTypes[0] ? formatInteger(pageTypes[0].value) : "Нет данных",
      },
    ];
  }, [filteredRows]);

  const timelineMeta = useMemo(() => {
    const validDates = rows
      .map((row) => row.parsedAt)
      .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());

    return {
      firstSeen: formatDateTime(validDates[0] ?? null),
      lastSeen: formatDateTime(validDates[validDates.length - 1] ?? null),
    };
  }, [rows]);

  const handleLogFiles = async (incomingFiles: File[]) => {
    if (!incomingFiles.length) return;

    setIsParsing(true);
    setError("");

    try {
      const parsedFiles = await Promise.all(
        incomingFiles.map(async (file) => ({
          file,
          parsed: await parseCsvFile(file),
        })),
      );

      const fileMetas: UploadedFileMeta[] = parsedFiles.map(({ file, parsed }) => ({
        id: createFileId(),
        kind: "logs",
        name: file.name,
        rowCount: parsed.rowCount,
        uploadedAt: new Date().toISOString(),
      }));

      await persistState({
        version: 2,
        rows: [...rows, ...parsedFiles.flatMap(({ parsed }) => parsed.rows)],
        files: [...files, ...fileMetas],
      });

      setActiveScreen("overview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось прочитать CSV логов.");
    } finally {
      setIsParsing(false);
    }
  };

  const onLogInput = (event: ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? []);
    if (incomingFiles.length) void handleLogFiles(incomingFiles);
    event.target.value = "";
  };

  const clearLogs = async () => {
    setError("");
    await persistState({
      version: 2,
      rows: [],
      files: [],
    });
    setFilters(emptyFilters);
    setActiveScreen("overview");
  };

  const resetFilters = () => setFilters(emptyFilters);

  const quickFilter = (
    key:
      | "all"
      | "openai"
      | "anthropic"
      | "perplexity"
      | "google"
      | "product"
      | "noTechnical",
  ) => {
    if (key === "all") return resetFilters();
    if (key === "openai") return setFilters({ ...emptyFilters, agentGroups: ["OpenAI"] });
    if (key === "anthropic") {
      return setFilters({ ...emptyFilters, agentGroups: ["Anthropic"] });
    }
    if (key === "perplexity") {
      return setFilters({ ...emptyFilters, agentGroups: ["Perplexity"] });
    }
    if (key === "google") return setFilters({ ...emptyFilters, agentGroups: ["Google"] });
    if (key === "product") {
      return setFilters({ ...emptyFilters, sections: ["Продукты и услуги"] });
    }

    setFilters({
      ...emptyFilters,
      sections: allOptions.sections.filter((section) => section !== "Технический шум"),
    });
  };

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface text-sm font-semibold text-accent">
        Загружаю сохранённые файлы...
      </main>
    );
  }

  if (!rows.length) {
    return (
      <UploadZone
        error={error}
        files={files}
        isParsing={isParsing}
        onLogFiles={handleLogFiles}
      />
    );
  }

  const screenMeta: Record<
    ScreenKey,
    { label: string; title: string; description: string; icon: typeof LayoutDashboard }
  > = {
    overview: {
      label: "Панель",
      title: "Аналитика ИИ-ботов",
      description: "Запросы, группы, user-agent и path в одном экране.",
      icon: LayoutDashboard,
    },
    pages: {
      label: "URL",
      title: "Path и запросы",
      description: "Какие path получают запросы и кто по ним ходит",
      icon: FileText,
    },
    map: {
      label: "Карта",
      title: "Карта сайта",
      description: "Все URL из sitemap, плотность запросов и пустые зоны на одной доске.",
      icon: Waypoints,
    },
    control: {
      label: "Данные",
      title: "Файлы и проверки",
      description: "CSV, очистка базы и проверка sitemap с robots.txt",
      icon: Settings2,
    },
  };

  const screenOrder: ScreenKey[] = ["overview", "pages", "map", "control"];
  const activeMeta = screenMeta[activeScreen];

  return (
    <main className="min-h-screen bg-app text-ink">
      <input
        ref={logInputRef}
        className="hidden"
        type="file"
        accept=".csv,text/csv"
        multiple
        onChange={onLogInput}
      />

      <div className="grid h-screen overflow-hidden lg:grid-cols-[188px_minmax(0,1fr)]">
        <aside className="h-screen overflow-y-auto border-r border-line bg-sidebar px-3 py-4">
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-surface text-aqua">
                <BrandMark />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-ink">NeraLens</p>
                <p className="truncate text-[11px] leading-4 text-muted">AI-боты в логах</p>
              </div>
            </div>

            <nav className="space-y-2">
              {screenOrder.map((screen) => {
                const meta = screenMeta[screen];
                const Icon = meta.icon;
                const isActive = activeScreen === screen;

                return (
                  <button
                    key={screen}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left ${
                      isActive
                        ? "bg-panel text-ink ring-1 ring-inset ring-aqua/25"
                        : "text-muted hover:bg-surface hover:text-ink"
                    }`}
                    type="button"
                    onClick={() => setActiveScreen(screen)}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? "bg-aqua/12 text-aqua" : "bg-surface text-muted"
                      }`}
                    >
                      <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
                    </div>
                    <span className="min-w-0 truncate text-sm font-bold">{meta.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-aqua px-3 py-2.5 text-sm font-extrabold text-[#071314]"
                type="button"
                onClick={() => logInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Добавить CSV
              </button>
            </div>
          </div>
        </aside>

        <section className="h-screen min-w-0 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6 xl:px-7">
          <div className="flex w-full flex-col gap-4">
            <header className="flex flex-wrap items-end gap-3">
              <div className="mr-auto">
                <p className="text-sm font-bold text-muted">{activeMeta.label}</p>
                <h2 className="mt-1 text-3xl font-extrabold text-ink">{activeMeta.title}</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
                  {activeMeta.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-2xl border border-line bg-panel px-3 py-2 text-sm font-bold text-ink">
                  {formatInteger(filteredRows.length)} строк
                </span>
                <button
                  className="control inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-ink"
                  type="button"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Сбросить
                </button>
              </div>
            </header>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {isParsing && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-accent">
                Обрабатываю файлы...
              </div>
            )}

            <FiltersBar
              filters={filters}
              options={filterOptions}
              onChange={setFilters}
              onReset={resetFilters}
              onQuickFilter={quickFilter}
            />

            {activeScreen === "overview" && (
              <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  {kpis.map((kpi) => (
                    <KpiCard key={kpi.label} kpi={kpi} />
                  ))}
                </section>

                {filteredRows.length ? (
                  <>
                    <ChartsGrid
                      rows={filteredRows}
                      onPathSelect={(path) =>
                        setFilters((current) => ({ ...current, pathQuery: path }))
                      }
                    />

                    <section className="grid items-stretch gap-3 xl:grid-cols-3">
                      <RankingCard
                        title="Группы ботов"
                        description="Кто даёт основной поток."
                        rows={groupRows}
                      />
                      <RankingCard
                        title="Намерения user-agent"
                        description="Что именно пытаются сделать конкретные агенты."
                        rows={intentRows}
                      />
                      <RankingCard
                        title="Точки роста"
                        description="Какие path получают мало запросов, но их стоит усилить."
                        rows={lowSignalRows}
                      />
                    </section>

                    <section className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                      <div className="min-w-0">
                        <TopPathsPanel rows={topPathRows} />
                      </div>
                      <div className="min-w-0">
                        <HealthPanel rows={healthRows} />
                      </div>
                    </section>

                    <section className="grid items-stretch gap-3 xl:grid-cols-2">
                      <RankingCard
                        title="Короткие user-agent"
                        description="Какие конкретные имена встречаются чаще всего."
                        rows={detailRows}
                      />
                      <RankingCard
                        title="Разделы спроса"
                        description="Какие разделы сайта чаще всего попадают в интерес ботов."
                        rows={sectionRows}
                      />
                    </section>
                  </>
                ) : (
                  <EmptyState />
                )}
              </>
            )}

            {activeScreen === "pages" && (
              <>{filteredRows.length ? <UrlTable summaries={urlSummaries} /> : <EmptyState />}</>
            )}

            {activeScreen === "map" && (
              <SiteMapBoard
                filters={filters}
                rows={filteredRows}
                sitemapFiles={sitemapFiles}
                robotsTxt={robotsTxt}
                onPathSelect={(path) =>
                  setFilters((current) => ({ ...current, pathQuery: path }))
                }
              />
            )}

            {activeScreen === "control" && (
              <>
                <SettingsPanel
                  files={files}
                  period={period}
                  rowCount={rows.length}
                  firstSeen={timelineMeta.firstSeen}
                  lastSeen={timelineMeta.lastSeen}
                  onAdd={() => logInputRef.current?.click()}
                  onClear={() => void clearLogs()}
                  onResetFilters={resetFilters}
                />

                <SiteMapExplorer
                  filters={filters}
                  rows={filteredRows}
                  onPathSelect={(path) =>
                    setFilters((current) => ({ ...current, pathQuery: path }))
                  }
                />
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
