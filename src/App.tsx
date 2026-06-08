import { useEffect, useMemo, useState } from "react";
import { BarChart3, Database, RotateCcw } from "lucide-react";
import { ChartsGrid } from "./components/ChartsGrid";
import { EmptyState } from "./components/EmptyState";
import { FiltersBar } from "./components/FiltersBar";
import { InsightsCard } from "./components/InsightsCard";
import { KpiCard } from "./components/KpiCard";
import { SiteMapExplorer } from "./components/SiteMapExplorer";
import type { Filters, NormalizedLogRow } from "./types";
import {
  buildInsights,
  buildKpis,
  buildUrlSummaries,
  filterRows,
  getDataPeriod,
  getFilterOptions,
} from "./utils/aggregations";
import { parseCsvText } from "./utils/parseCsv";
import { UrlTable } from "./components/UrlTable";
import { formatInteger } from "./utils/format";

const emptyFilters: Filters = {
  dateFrom: "",
  dateTo: "",
  botTypes: [],
  sections: [],
  sectionPatterns: "",
  countries: [],
  pathQuery: "",
};

const DEFAULT_DATABASE_URL = "/data/chatgpt_may.csv";
const DEFAULT_DATABASE_NAME = "chatgpt_may.csv";

export function App() {
  const [rows, setRows] = useState<NormalizedLogRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [error, setError] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const options = useMemo(() => getFilterOptions(rows), [rows]);
  const filteredRows = useMemo(
    () => filterRows(rows, filters),
    [filters, rows],
  );
  const kpis = useMemo(() => buildKpis(filteredRows), [filteredRows]);
  const urlSummaries = useMemo(
    () => buildUrlSummaries(filteredRows),
    [filteredRows],
  );
  const insights = useMemo(() => buildInsights(filteredRows), [filteredRows]);
  const period = useMemo(() => getDataPeriod(rows), [rows]);

  useEffect(() => {
    let isMounted = true;

    const loadDatabase = async () => {
      setError("");

      try {
        const response = await fetch(DEFAULT_DATABASE_URL);

        if (!response.ok) {
          throw new Error(`Не удалось загрузить базу: HTTP ${response.status}.`);
        }

        const csv = await response.text();
        const result = await parseCsvText(csv);

        if (!isMounted) return;
        setRows(result.rows);
        setFileName(DEFAULT_DATABASE_NAME);
        setFilters(emptyFilters);
      } catch (caught) {
        if (!isMounted) return;
        setRows([]);
        setFileName("");
        setError(caught instanceof Error ? caught.message : "Не удалось загрузить базу.");
      } finally {
        if (!isMounted) return;
        setIsBootstrapping(false);
      }
    };

    void loadDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetFilters = () => setFilters(emptyFilters);

  const quickFilter = (
    key: "all" | "chatgpt" | "product" | "blog" | "noTechnical",
  ) => {
    if (key === "all") {
      resetFilters();
      return;
    }
    if (key === "chatgpt") {
      setFilters({ ...emptyFilters, botTypes: ["ChatGPT-User"] });
      return;
    }
    if (key === "product") {
      setFilters({ ...emptyFilters, sections: ["Product / service"] });
      return;
    }
    if (key === "blog") {
      setFilters({ ...emptyFilters, sections: ["Blog / cases"] });
      return;
    }
    setFilters({
      ...filters,
      sections: options.sections.filter((section) => section !== "Technical / noise"),
    });
  };

  if (isBootstrapping) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-6 text-ink">
        <section className="w-full max-w-xl rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white">
            <Database className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">База загружается</h1>
          <p className="mt-2 text-sm text-muted">
            Дашборд открывает сохранённую базу данных без ручной загрузки CSV.
          </p>
        </section>
      </main>
    );
  }

  if (!rows.length) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-6 text-ink">
        <section className="w-full max-w-xl rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white">
            <Database className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">База не загрузилась</h1>
          <p className="mt-2 text-sm text-muted">
            Проверьте, что файл базы доступен по адресу {DEFAULT_DATABASE_URL}.
          </p>
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-4 text-ink lg:px-6">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-3">
        <header className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-normal text-muted">
                  AI agents dashboard
                </p>
                <h1 className="text-xl font-semibold text-ink">
                  Запросы ИИ-агентов к сайту
                </h1>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="rounded-lg bg-surface px-3 py-2">
                база: {fileName}
              </span>
              <span className="rounded-lg bg-surface px-3 py-2">
                {period}
              </span>
              <span className="rounded-lg bg-surface px-3 py-2">
                строк: {formatInteger(rows.length)}
              </span>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 font-semibold text-ink hover:bg-surface"
                type="button"
                onClick={resetFilters}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Сбросить фильтры
              </button>
            </div>
          </div>
        </header>

        <FiltersBar
          filters={filters}
          options={options}
          onChange={setFilters}
          onReset={resetFilters}
          onQuickFilter={quickFilter}
        />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {filteredRows.length ? (
          <>
            <div className="grid gap-3 2xl:grid-cols-[1fr_360px]">
              <ChartsGrid
                rows={filteredRows}
                onPathSelect={(path) =>
                  setFilters((current) => ({ ...current, pathQuery: path }))
                }
              />
              <InsightsCard insights={insights} />
            </div>
            <SiteMapExplorer
              filters={filters}
              rows={filteredRows}
              onPathSelect={(path) =>
                setFilters((current) => ({ ...current, pathQuery: path }))
              }
            />
            <UrlTable summaries={urlSummaries} />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}
