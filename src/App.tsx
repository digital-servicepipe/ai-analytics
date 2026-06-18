import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  FileText,
  LayoutDashboard,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  Upload,
  Waypoints,
} from "lucide-react";
import { BotReferencePanel } from "./components/BotReferencePanel";
import { ChartsGrid } from "./components/ChartsGrid";
import { EmptyState } from "./components/EmptyState";
import { FiltersBar } from "./components/FiltersBar";
import { KpiCard } from "./components/KpiCard";
import { SiteMapBoard } from "./components/SiteMapBoard";
import { SiteMapExplorer } from "./components/SiteMapExplorer";
import { SeoDashboard } from "./components/SeoDashboard";
import { UploadZone } from "./components/UploadZone";
import { UrlTable } from "./components/UrlTable";
import { AiChatWidget } from "./components/AiChatWidget";
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
  SeoMetricRow,
  UploadedFileMeta,
} from "./types";
import {
  buildKpis,
  buildUrlSummaries,
  filterRows,
  getDataPeriod,
  getFilterOptions,
} from "./utils/aggregations";
import { formatInteger } from "./utils/format";
import { parseCsvFile } from "./utils/parseCsv";
import { parseSeoFile } from "./utils/parseSeo";
import { loadGeminiKey, loadPersistedState, saveGeminiKey, savePersistedState } from "./utils/storage";
import { installAutoNbsp } from "./utils/typography";
import { parseUrlState, updateUrlState } from "./utils/urlState";

const emptyFilters: Filters = {
  dateFrom: "",
  dateTo: "",
  agentGroups: [],
  agentDetails: [],
  sections: [],
  countries: [],
  pathQuery: "",
};

type ScreenKey = "overview" | "pages" | "seo" | "map" | "control";

const ACTIVE_SCREEN_STORAGE_KEY = "ai-analytics-active-screen";
const SEO_MODULE_ENABLED = false;

function isScreenKey(value: string | null): value is ScreenKey {
  return (
    value === "overview" ||
    value === "pages" ||
    (SEO_MODULE_ENABLED && value === "seo") ||
    value === "map" ||
    value === "control"
  );
}

type TopPathRow = {
  path: string;
  title: string;
  count: number;
  userAgentExamples: string[];
};

type TopPathLimit = 5 | 15 | 30 | 50 | "all";

const topPathLimitOptions: TopPathLimit[] = [5, 15, 30, 50, "all"];

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

function buildDisplayPath(fullUrl: string): string {
  return fullUrl.replace(/^https?:\/\/[^/]+/i, "") || "/";
}

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" aria-hidden="true">
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

function TopPathsPanel({ rows }: { rows: TopPathRow[] }) {
  const [copied, setCopied] = useState("");
  const [limit, setLimit] = useState<TopPathLimit>(15);
  const visibleRows = limit === "all" ? rows : rows.slice(0, limit);

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
    <article className="panel flex h-[640px] flex-col p-4">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-ink">Топ path</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Самые частые страницы в&nbsp;выборке. Ссылку можно открыть или скопировать.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {topPathLimitOptions.map((option) => {
            const active = limit === option;
            const label = option === "all" ? "Все" : String(option);

            return (
              <button
                key={option}
                className={`h-8 rounded-lg border px-2.5 text-xs font-extrabold transition ${
                  active
                    ? "border-aqua bg-aqua text-[#071314]"
                    : "border-line bg-surface text-muted hover:border-aqua hover:text-ink"
                }`}
                type="button"
                onClick={() => setLimit(option)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mb-3 text-xs font-bold text-muted">
        Показано {formatInteger(visibleRows.length)} из&nbsp;{formatInteger(rows.length)}
      </p>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {visibleRows.map((row) => {
          const fullUrl = buildFullUrl(row.path);
          const displayPath = buildDisplayPath(fullUrl);

          return (
            <div
              key={row.path}
              className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-3 transition hover:bg-panel"
            >
              <div className="min-w-0 flex-1">
                <a
                  className="block break-words text-sm font-extrabold leading-5 text-aqua transition hover:text-[#93E6D9]"
                  href={fullUrl}
                  rel="noreferrer"
                  target="_blank"
                  title={fullUrl}
                >
                  {row.title}
                </a>
                <p className="mt-1 break-all text-xs leading-5 text-muted">
                  {displayPath}
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-muted">
                  {row.userAgentExamples.join(" / ")}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">{formatInteger(row.count)} запросов</p>
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

function SettingsPanel({
  files,
  period,
  rowCount,
  firstSeen,
  lastSeen,
  geminiKey,
  onAdd,
  onClear,
  onResetFilters,
  onGeminiKeyChange,
}: {
  files: UploadedFileMeta[];
  period: string;
  rowCount: number;
  firstSeen: string;
  lastSeen: string;
  geminiKey: string;
  onAdd: () => void;
  onClear: () => void;
  onResetFilters: () => void;
  onGeminiKeyChange: (key: string) => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
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
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-ink">Настройки ИИ</h2>
            <p className="mt-1 text-sm text-muted">
              Используется для генерации умных инсайтов и СЕО-ТЗ через OpenRouter (бесплатно).
            </p>
          </div>
          <div className="max-w-xl">
            <label className="mb-2 block text-xs font-bold uppercase text-muted" htmlFor="gemini-key">
              OpenRouter API Key
            </label>
            <input
              id="gemini-key"
              type="password"
              className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-aqua"
              placeholder="sk-or-v1-..."
              value={geminiKey}
              onChange={(e) => onGeminiKeyChange(e.target.value)}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Получить бесплатный ключ можно в{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-aqua hover:underline"
              >
                OpenRouter
              </a>. Используется модель DeepSeek.
            </p>
          </div>
        </article>
      </div>

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
  const [seoRows, setSeoRows] = useState<SeoMetricRow[]>([]);
  const [files, setFiles] = useState<UploadedFileMeta[]>([]);
  const [geminiKey, setGeminiKey] = useState(() => loadGeminiKey());
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => {
    const { filters: urlFilters } = parseUrlState();
    return { ...emptyFilters, ...urlFilters };
  });
  const [activeScreen, setActiveScreen] = useState<ScreenKey>(() => {
    const { screen: urlScreen } = parseUrlState();
    if (isScreenKey(urlScreen)) return urlScreen;
    const storedScreen = window.localStorage.getItem(ACTIVE_SCREEN_STORAGE_KEY);
    return isScreenKey(storedScreen) ? storedScreen : "overview";
  });
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sitemapFiles, setSitemapFiles] = useState<LoadedSitemapFile[]>([
    { name: "sitemap.xml", content: DEFAULT_SITEMAP_XML },
  ]);
  const [robotsTxt, setRobotsTxt] = useState(DEFAULT_ROBOTS_TXT);
  const logInputRef = useRef<HTMLInputElement>(null);
  const seoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => installAutoNbsp(), []);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_SCREEN_STORAGE_KEY, activeScreen);
    updateUrlState(activeScreen, filters, emptyFilters);
  }, [activeScreen, filters]);

  useEffect(() => {
    if (!SEO_MODULE_ENABLED && activeScreen === "seo") {
      setActiveScreen("overview");
    }
  }, [activeScreen]);

  useEffect(() => {
    loadPersistedState()
      .then((state) => {
        setRows(state.rows);
        setSeoRows(state.seoRows);
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
    setSeoRows(nextState.seoRows);
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

  const topPathRows = useMemo<TopPathRow[]>(
    () =>
      urlSummaries.map((item) => ({
        path: item.path,
        title: item.title,
        count: item.total,
        userAgentExamples: item.userAgentExamples,
      })),
    [urlSummaries],
  );

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
        version: 3,
        rows: [...rows, ...parsedFiles.flatMap(({ parsed }) => parsed.rows)],
        seoRows,
        files: [...files, ...fileMetas],
      });

      setActiveScreen("overview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось прочитать CSV логов.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSeoFiles = async (incomingFiles: File[]) => {
    if (!incomingFiles.length) return;

    setIsParsing(true);
    setError("");

    try {
      const parsedFiles = await Promise.all(
        incomingFiles.map(async (file) => {
          const fileId = createFileId();
          return {
            file,
            fileId,
            parsed: await parseSeoFile(file, fileId),
          };
        }),
      );

      const fileMetas: UploadedFileMeta[] = parsedFiles.map(({ file, fileId, parsed }) => ({
        id: fileId,
        kind: "seo",
        name: file.name,
        rowCount: parsed.rowCount,
        uploadedAt: new Date().toISOString(),
        source: parsed.sources.length === 1 ? parsed.sources[0] : undefined,
      }));

      await persistState({
        version: 3,
        rows,
        seoRows: [...seoRows, ...parsedFiles.flatMap(({ parsed }) => parsed.rows)],
        files: [...files, ...fileMetas],
      });

      setActiveScreen("seo");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось прочитать SEO XLSX.");
    } finally {
      setIsParsing(false);
    }
  };

  const onLogInput = (event: ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? []);
    if (incomingFiles.length) void handleLogFiles(incomingFiles);
    event.target.value = "";
  };

  const onSeoInput = (event: ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? []);
    if (incomingFiles.length) void handleSeoFiles(incomingFiles);
    event.target.value = "";
  };

  const clearLogs = async () => {
    setError("");
    await persistState({
      version: 3,
      rows: [],
      seoRows: [],
      files: [],
    });
    setFilters(emptyFilters);
    setActiveScreen("overview");
  };

  const resetFilters = () => setFilters(emptyFilters);

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface text-sm font-semibold text-accent">
        Загружаю сохранённые файлы...
      </main>
    );
  }

  if (!rows.length && (!SEO_MODULE_ENABLED || !seoRows.length)) {
    return (
      <UploadZone
        error={error}
        files={files}
        isParsing={isParsing}
        onLogFiles={handleLogFiles}
        onSeoFiles={handleSeoFiles}
        showSeoUpload={SEO_MODULE_ENABLED}
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
    seo: {
      label: "SEO",
      title: "SEO",
      description: "Отдельная панель Google Search Console и Яндекс.Вебмастера без связи с AI-визитами.",
      icon: Search,
    },
    map: {
      label: "Карта",
      title: "Карта сайта",
      description: "Все URL из sitemap, плотность запросов и пустые зоны на одной доске.",
      icon: Waypoints,
    },
    control: {
      label: "Настройки",
      title: "Настройки",
      description: "Файлы, очистка базы и проверка sitemap с robots.txt",
      icon: Settings2,
    },
  };

  // SEO module is temporarily hidden; keep the screen code wired for quick restore.
  const screenOrder: ScreenKey[] = SEO_MODULE_ENABLED
    ? ["overview", "pages", "seo", "map", "control"]
    : ["overview", "pages", "map", "control"];
  const activeMeta = screenMeta[activeScreen];
  const activeRowCount = SEO_MODULE_ENABLED && activeScreen === "seo" ? seoRows.length : filteredRows.length;

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
      {SEO_MODULE_ENABLED && (
        <input
          ref={seoInputRef}
          className="hidden"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple
          onChange={onSeoInput}
        />
      )}

      <div className="grid h-screen overflow-hidden lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="h-screen overflow-y-auto border-r border-line bg-sidebar px-4 py-5">
          <div className="flex h-full flex-col gap-5">
            <div className="flex items-center gap-4 px-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-aqua">
                <BrandMark />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold tracking-tight text-ink">NeraLens</p>
                <p className="truncate text-xs leading-5 text-muted">AI-боты в логах</p>
              </div>
            </div>

            <nav className="space-y-2.5">
              {screenOrder.map((screen) => {
                const meta = screenMeta[screen];
                const Icon = meta.icon;
                const isActive = activeScreen === screen;

                return (
                  <button
                    key={screen}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${
                      isActive
                        ? "bg-panel text-ink ring-1 ring-inset ring-aqua/25"
                        : "text-muted hover:bg-surface hover:text-ink"
                    }`}
                    type="button"
                    onClick={() => setActiveScreen(screen)}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
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
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-aqua px-3 py-2.5 text-sm font-extrabold text-[#071314] transition hover:opacity-90"
                type="button"
                onClick={() => setIsAiChatOpen(true)}
              >
                <Bot className="h-4 w-4" aria-hidden="true" />
                NeraLens AI
              </button>
            </div>
          </div>
        </aside>

        <section className="h-screen min-w-0 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6 xl:px-6">
          <div className="flex w-full flex-col gap-5">
            <header className="flex flex-wrap items-end gap-4">
              <div className="mr-auto">
                <p className="text-sm font-bold text-muted">{activeMeta.label}</p>
                <h2 className="mt-1 text-3xl font-extrabold text-ink">{activeMeta.title}</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
                  {activeMeta.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-2xl border border-line bg-panel px-3 py-2 text-sm font-bold text-ink">
                  {formatInteger(activeRowCount)} строк
                </span>
                {SEO_MODULE_ENABLED && activeScreen === "seo" ? (
                  <button
                    className="control inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-ink"
                    type="button"
                    onClick={() => seoInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Добавить SEO XLSX
                  </button>
                ) : (
                  <button
                    className="control inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-ink"
                    type="button"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Сбросить
                  </button>
                )}
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

            {(!SEO_MODULE_ENABLED || activeScreen !== "seo") && (
              <FiltersBar
                filters={filters}
                options={filterOptions}
                onChange={setFilters}
                onReset={resetFilters}
              />
            )}

            {activeScreen === "overview" && (
              <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  {kpis.map((kpi) => (
                    <KpiCard key={kpi.label} kpi={kpi} />
                  ))}
                </section>

                {filteredRows.length ? (
                  <>
                    <ChartsGrid rows={filteredRows} />

                    <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
                      <div className="min-w-0 space-y-3">
                        <TopPathsPanel rows={topPathRows} />
                      </div>
                      <div className="min-w-0 space-y-3">
                        <BotReferencePanel rows={filteredRows} />
                      </div>
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

            {/* SEO module is temporarily hidden via SEO_MODULE_ENABLED. */}
            {SEO_MODULE_ENABLED && activeScreen === "seo" && (
              <SeoDashboard rows={seoRows} onUploadSeo={() => seoInputRef.current?.click()} />
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
              <div className="flex flex-col gap-5">
                <SettingsPanel
                  files={files}
                  period={period}
                  rowCount={rows.length}
                  firstSeen={timelineMeta.firstSeen}
                  lastSeen={timelineMeta.lastSeen}
                  geminiKey={geminiKey}
                  onAdd={() => logInputRef.current?.click()}
                  onClear={() => void clearLogs()}
                  onResetFilters={resetFilters}
                  onGeminiKeyChange={(key) => {
                    setGeminiKey(key);
                    saveGeminiKey(key);
                  }}
                />

                <SiteMapExplorer
                  filters={filters}
                  rows={filteredRows}
                  onPathSelect={(path) =>
                    setFilters((current) => ({ ...current, pathQuery: path }))
                  }
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <AiChatWidget
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        apiKey={geminiKey}
        rows={filteredRows}
      />
    </main>
  );
}
