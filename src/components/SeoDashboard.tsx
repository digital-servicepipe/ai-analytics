import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  Search,
  Upload,
} from "lucide-react";
import {
  Bar as RechartsBar,
  Brush,
  CartesianGrid as RechartsGrid,
  ComposedChart as RechartsComposedChart,
  Line as RechartsLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeoMetricRow, SeoSource } from "../types";
import { KpiCard } from "./KpiCard";
import {
  buildSeoDateSeries,
  buildSeoKpis,
  buildSeoPageSummaries,
  emptySeoFilters,
  filterSeoRows,
  getSeoFilterOptions,
  type SeoDatePoint,
  type SeoFilters,
  type SeoPageSummary,
} from "../utils/seoAggregations";
import { formatInteger, formatPercent, truncateMiddle } from "../utils/format";

type SeoDashboardProps = {
  rows: SeoMetricRow[];
  onUploadSeo: () => void;
};

type SeoTableSortKey =
  | "path"
  | "impressions"
  | "clicks"
  | "ctr"
  | "position"
  | "google"
  | "yandex"
  | "section";
type SortDirection = "asc" | "desc";

const sourceLabels: Record<"all" | SeoSource, string> = {
  all: "Все",
  Google: "Google",
  Yandex: "Яндекс",
  Unknown: "Неизвестно",
};

const segmentLabels: Array<{ value: SeoFilters["segment"]; label: string; hint: string }> = [
  { value: "all", label: "Все страницы", hint: "без сценария" },
  { value: "clicks", label: "С кликами", hint: "есть переходы" },
  { value: "noClicks", label: "Без кликов", hint: "есть показы" },
  { value: "lowCtr", label: "CTR просел", hint: "спрос есть" },
  { value: "nearTop", label: "Рядом с топом", hint: "позиции 4-15" },
];

function formatDecimal(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function formatDateLabel(date: string): string {
  const [, month, day] = date.split("-");
  return month && day ? `${day}.${month}` : date || "Без даты";
}

function buildFullUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `https://servicepipe.ru${encodeURI(path.startsWith("/") ? path : `/${path}`)}`;
}

function MetricFilter({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm">
      <span className="shrink-0 font-bold text-muted">{label}</span>
      <input
        className="min-w-0 max-w-[86px] bg-transparent text-right font-extrabold text-ink outline-none placeholder:text-muted"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Chip({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`min-h-10 rounded-full border px-3.5 text-left text-sm transition ${
        active
          ? "border-aqua bg-aqua text-[#071314]"
          : "border-line bg-surface text-muted hover:border-white/20 hover:bg-panel hover:text-ink"
      }`}
      type="button"
      onClick={onClick}
    >
      <span className="block whitespace-nowrap font-extrabold">{label}</span>
      {hint && <span className="block whitespace-nowrap text-[11px] font-bold opacity-75">{hint}</span>}
    </button>
  );
}

function SeoFiltersPanel({
  filters,
  options,
  onChange,
}: {
  filters: SeoFilters;
  options: ReturnType<typeof getSeoFilterOptions>;
  onChange: (filters: SeoFilters) => void;
}) {
  const sourceButtons = ["all", ...options.sources] as Array<"all" | SeoSource>;
  const selectedSections = new Set(filters.sections);
  const shownSections = options.sections.slice(0, 12);

  const pickDate = (date: string) => {
    onChange({ ...filters, dateFrom: date, dateTo: date });
  };

  const toggleSection = (section: string) => {
    onChange({
      ...filters,
      sections: selectedSections.has(section)
        ? filters.sections.filter((item) => item !== section)
        : [...filters.sections, section],
    });
  };

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h2 className="text-sm font-extrabold text-ink">Фильтры SEO</h2>
          <p className="mt-0.5 text-xs text-muted">Сначала дата и источник, потом страница и метрики.</p>
        </div>
        <button
          className="control inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-bold text-ink"
          type="button"
          onClick={() => onChange(emptySeoFilters)}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Сброс
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sourceButtons.map((source) => (
          <Chip
            key={source}
            active={filters.source === source}
            label={sourceLabels[source]}
            onClick={() => onChange({ ...filters, source })}
          />
        ))}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Chip
          active={!filters.dateFrom && !filters.dateTo}
          label="Все даты"
          onClick={() => onChange({ ...filters, dateFrom: "", dateTo: "" })}
        />
        {options.dates.map((date) => (
          <Chip
            key={date}
            active={filters.dateFrom === date && filters.dateTo === date}
            label={formatDateLabel(date)}
            hint={date}
            onClick={() => pickDate(date)}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto]">
        <label className="control flex min-h-12 items-center gap-2 rounded-full px-4 text-sm">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            className="w-full bg-transparent font-bold text-ink outline-none placeholder:text-muted"
            placeholder="Найти URL или часть страницы"
            value={filters.pathQuery}
            onChange={(event) => onChange({ ...filters, pathQuery: event.target.value })}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <MetricFilter
            label="Показы от"
            placeholder="0"
            value={filters.minImpressions}
            onChange={(minImpressions) => onChange({ ...filters, minImpressions })}
          />
          <MetricFilter
            label="Клики от"
            placeholder="0"
            value={filters.minClicks}
            onChange={(minClicks) => onChange({ ...filters, minClicks })}
          />
          <MetricFilter
            label="CTR от"
            placeholder="%"
            value={filters.minCtr}
            onChange={(minCtr) => onChange({ ...filters, minCtr })}
          />
          <MetricFilter
            label="Позиция до"
            placeholder="20"
            value={filters.maxPosition}
            onChange={(maxPosition) => onChange({ ...filters, maxPosition })}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {segmentLabels.map((segment) => (
          <Chip
            key={segment.value}
            active={filters.segment === segment.value}
            label={segment.label}
            hint={segment.hint}
            onClick={() => onChange({ ...filters, segment: segment.value })}
          />
        ))}
      </div>

      {shownSections.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Chip
            active={!filters.sections.length}
            label="Все разделы"
            onClick={() => onChange({ ...filters, sections: [] })}
          />
          {shownSections.map((section) => (
            <Chip
              key={section}
              active={selectedSections.has(section)}
              label={truncateMiddle(section, 28)}
              onClick={() => toggleSection(section)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DailyBreakdown({ rows }: { rows: SeoDatePoint[] }) {
  return (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {rows.map((row) => (
        <div
          key={row.date}
          className="min-w-[148px] rounded-2xl border border-line bg-surface px-3 py-3"
          title={row.date}
        >
          <p className="text-xs font-extrabold text-aqua">{formatDateLabel(row.date)}</p>
          <p className="mt-2 text-lg font-extrabold text-ink">{formatInteger(row.impressions)}</p>
          <p className="text-xs font-bold text-muted">показов</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <span className="rounded-lg bg-panel px-2 py-1 font-bold text-ink">
              {formatInteger(row.clicks)} кликов
            </span>
            <span className="rounded-lg bg-panel px-2 py-1 font-bold text-ink">
              CTR {formatPercent(row.ctr)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SeoDateChart({ rows }: { rows: SeoDatePoint[] }) {
  const hasManyDates = rows.length > 1;

  return (
    <article className="panel p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-extrabold text-ink">Динамика по дням</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
            Каждый столбец — отдельная дата из загруженных SEO-файлов. Показы идут столбцами,
            клики и CTR — линиями.
          </p>
        </div>
        <span className="rounded-full border border-line bg-surface px-3 py-2 text-xs font-extrabold text-muted">
          {rows.length} {rows.length === 1 ? "дата" : "дат"}
        </span>
      </div>

      {!hasManyDates && (
        <div className="mt-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-bold text-muted">
          В текущей выборке одна дата. Для настоящей дневной динамики загрузите несколько дневных
          SEO-выгрузок или файл, где есть строки по разным датам.
        </div>
      )}

      <div className="mt-4 h-[390px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsComposedChart data={rows} margin={{ top: 12, right: 12, bottom: 22, left: -8 }}>
            <RechartsGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              minTickGap={0}
              tick={{ fontSize: 11 }}
              tickLine={false}
              angle={rows.length > 8 ? -32 : 0}
              textAnchor={rows.length > 8 ? "end" : "middle"}
              height={rows.length > 8 ? 54 : 30}
            />
            <YAxis yAxisId="count" tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
            <YAxis
              yAxisId="rate"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) =>
                `${Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`
              }
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#222327",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                color: "#e3e3e3",
              }}
              formatter={(value, name) => {
                if (name === "ctr") return [formatPercent(Number(value)), "CTR"];
                if (name === "clicks") return [formatInteger(Number(value)), "Клики"];
                return [formatInteger(Number(value)), "Показы"];
              }}
              labelFormatter={(label, payload: Array<{ payload?: { date?: string; position?: number } }>) => {
                const point = payload?.[0]?.payload;
                return `${point?.date ?? label} · позиция ${formatDecimal(point?.position ?? 0)}`;
              }}
            />
            <RechartsBar
              yAxisId="count"
              dataKey="impressions"
              fill="#2dd4bf"
              maxBarSize={42}
              minPointSize={3}
              radius={[8, 8, 0, 0]}
            />
            <RechartsLine
              yAxisId="count"
              dataKey="clicks"
              dot={{ r: 4 }}
              stroke="#34d399"
              strokeWidth={2.6}
              type="monotone"
            />
            <RechartsLine
              yAxisId="rate"
              dataKey="ctr"
              dot={{ r: 4 }}
              stroke="#a78bfa"
              strokeWidth={2.6}
              type="monotone"
            />
            {rows.length > 18 && <Brush dataKey="label" height={24} stroke="#2dd4bf" travellerWidth={10} />}
          </RechartsComposedChart>
        </ResponsiveContainer>
      </div>

      <DailyBreakdown rows={rows} />
    </article>
  );
}

function SeoPagesTable({ rows }: { rows: SeoPageSummary[] }) {
  const [copied, setCopied] = useState("");
  const [sortKey, setSortKey] = useState<SeoTableSortKey>("impressions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedRows = useMemo(() => {
    const getNumber = (row: SeoPageSummary) => {
      if (sortKey === "impressions") return row.impressions;
      if (sortKey === "clicks") return row.clicks;
      if (sortKey === "ctr") return row.ctr;
      if (sortKey === "position") return row.position || Number.MAX_SAFE_INTEGER;
      if (sortKey === "google") return row.googleImpressions;
      if (sortKey === "yandex") return row.yandexImpressions;
      return 0;
    };

    return [...rows].sort((a, b) => {
      let result = 0;
      if (sortKey === "path") result = a.path.localeCompare(b.path, "ru");
      else if (sortKey === "section") result = a.section.localeCompare(b.section, "ru");
      else result = getNumber(a) - getNumber(b);
      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, sortDirection, sortKey]);

  const visibleRows = sortedRows.slice(0, 300);

  const changeSort = (key: SeoTableSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "position" || key === "path" || key === "section" ? "asc" : "desc");
  };

  const SortHeader = ({ label, sort }: { label: string; sort: SeoTableSortKey }) => {
    const isActive = sortKey === sort;

    return (
      <button
        className={`inline-flex w-full items-center gap-1.5 text-left font-extrabold ${
          isActive ? "text-ink" : "text-muted"
        }`}
        type="button"
        onClick={() => changeSort(sort)}
      >
        <span>{label}</span>
        <ArrowDownUp
          className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-aqua" : "text-muted"}`}
          aria-hidden="true"
        />
      </button>
    );
  };

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
    <section className="panel p-4">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-extrabold text-ink">Страницы из SEO</h2>
          <p className="mt-1 text-sm text-muted">
            Показано {formatInteger(visibleRows.length)} из {formatInteger(rows.length)}. URL можно
            открыть или скопировать.
          </p>
        </div>
      </div>

      <div className="relative h-[min(72vh,780px)] overflow-auto rounded-2xl border border-line">
        <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-surface text-muted">
            <tr>
              <th className="sticky left-0 z-20 w-[420px] bg-surface px-4 py-3">
                <SortHeader label="URL" sort="path" />
              </th>
              <th className="px-3 py-3">
                <SortHeader label="Показы" sort="impressions" />
              </th>
              <th className="px-3 py-3">
                <SortHeader label="Клики" sort="clicks" />
              </th>
              <th className="px-3 py-3">
                <SortHeader label="CTR" sort="ctr" />
              </th>
              <th className="px-3 py-3">
                <SortHeader label="Позиция" sort="position" />
              </th>
              <th className="px-3 py-3">
                <SortHeader label="Google" sort="google" />
              </th>
              <th className="px-3 py-3">
                <SortHeader label="Яндекс" sort="yandex" />
              </th>
              <th className="px-3 py-3">
                <SortHeader label="Раздел" sort="section" />
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const fullUrl = buildFullUrl(row.path);

              return (
                <tr key={row.path} className="group border-t border-line hover:bg-surface">
                  <td className="sticky left-0 z-[1] bg-panel px-4 py-3 group-hover:bg-surface">
                    <div className="flex max-w-[400px] items-center gap-2">
                      <button
                        className="control inline-flex h-8 w-8 shrink-0 items-center justify-center text-ink"
                        type="button"
                        title="Скопировать URL"
                        onClick={() => void copyUrl(row.path)}
                      >
                        {copied === row.path ? (
                          <Check className="h-4 w-4 text-aqua" aria-hidden="true" />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                      <a
                        className="inline-flex min-w-0 items-center gap-1.5 font-extrabold text-aqua hover:text-[#93E6D9]"
                        href={fullUrl}
                        rel="noreferrer"
                        target="_blank"
                        title={fullUrl}
                      >
                        <span className="truncate">{truncateMiddle(row.path, 76)}</span>
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-extrabold">{formatInteger(row.impressions)}</td>
                  <td className="px-3 py-3">{formatInteger(row.clicks)}</td>
                  <td className="px-3 py-3">{formatPercent(row.ctr)}</td>
                  <td className="px-3 py-3">{formatDecimal(row.position)}</td>
                  <td className="px-3 py-3">
                    {formatInteger(row.googleImpressions)} / {formatInteger(row.googleClicks)}
                    <span className="ml-1 text-xs text-muted">CTR {formatPercent(row.googleCtr)}</span>
                  </td>
                  <td className="px-3 py-3">
                    {formatInteger(row.yandexImpressions)} / {formatInteger(row.yandexClicks)}
                    <span className="ml-1 text-xs text-muted">CTR {formatPercent(row.yandexCtr)}</span>
                  </td>
                  <td className="px-3 py-3">{row.section}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {copied && (
        <div className="fixed bottom-5 right-5 rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white shadow-card">
          URL скопирован
        </div>
      )}
    </section>
  );
}

export function SeoDashboard({ rows, onUploadSeo }: SeoDashboardProps) {
  const [filters, setFilters] = useState<SeoFilters>(emptySeoFilters);

  const options = useMemo(() => getSeoFilterOptions(rows), [rows]);
  const filteredRows = useMemo(() => filterSeoRows(rows, filters), [filters, rows]);
  const pages = useMemo(() => buildSeoPageSummaries(filteredRows), [filteredRows]);
  const kpis = useMemo(() => buildSeoKpis(filteredRows, pages), [filteredRows, pages]);
  const dateSeries = useMemo(() => buildSeoDateSeries(filteredRows), [filteredRows]);
  const datesLabel =
    options.dates.length > 1
      ? `${formatDateLabel(options.dates[0])} — ${formatDateLabel(options.dates[options.dates.length - 1])}`
      : options.dates[0]
        ? formatDateLabel(options.dates[0])
        : "дата не указана";

  if (!rows.length) {
    return (
      <section className="panel p-8 text-center">
        <h2 className="text-xl font-extrabold text-ink">SEO-данные не загружены</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted">
          Загрузите XLSX с листами Google и Яндекс. Панель работает отдельно от AI-логов.
        </p>
        <button
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-aqua px-4 py-2.5 text-sm font-extrabold text-[#071314]"
          type="button"
          onClick={onUploadSeo}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Загрузить SEO XLSX
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <section className="panel p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="mr-auto">
            <h1 className="text-2xl font-extrabold text-ink">SEO</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              Отдельная панель по Google Search Console и Яндекс.Вебмастеру. Период в данных:
              {" "}
              {datesLabel}. AI-визиты здесь не учитываются.
            </p>
          </div>
          <button
            className="control inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-ink"
            type="button"
            onClick={onUploadSeo}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Добавить XLSX
          </button>
        </div>
      </section>

      <SeoFiltersPanel filters={filters} options={options} onChange={setFilters} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <SeoDateChart rows={dateSeries} />
      <SeoPagesTable rows={pages} />
    </section>
  );
}
