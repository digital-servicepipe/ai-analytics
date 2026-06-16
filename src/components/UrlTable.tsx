import { useMemo, useState } from "react";
import { ArrowDownUp, Check, Copy, ExternalLink, Search } from "lucide-react";
import type { UrlSummary } from "../types";
import { formatInteger, formatPercent, truncateMiddle } from "../utils/format";

type UrlTableProps = {
  summaries: UrlSummary[];
};

type Limit = 10 | 25 | 50 | "all";
type TableSortKey = "total" | "topGroupCount" | "uniqueGroups" | "uniqueAgents";

const sortLabels: Record<TableSortKey, string> = {
  total: "Запросы",
  topGroupCount: "Поток группы",
  uniqueGroups: "Группы",
  uniqueAgents: "User-agent",
};

const pageTypeLabels: Record<UrlSummary["pageType"], string> = {
  product: "Продукт",
  blog: "Блог",
  press: "Пресс",
  news: "Новости",
  industry: "Отрасль",
  file: "Файл",
  technical: "Тех.",
  other: "Другое",
};

function buildFullUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `https://servicepipe.ru${encodeURI(normalizedPath)}`;
}

function buildDisplayPath(fullUrl: string): string {
  return fullUrl.replace(/^https?:\/\/[^/]+/i, "") || "/";
}

export function UrlTable({ summaries }: UrlTableProps) {
  const [sortKey, setSortKey] = useState<TableSortKey>("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<Limit>(50);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");

  const filteredRows = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    return lowerQuery
      ? summaries.filter((summary) => summary.path.toLowerCase().includes(lowerQuery))
      : summaries;
  }, [query, summaries]);

  const rows = useMemo(() => {
    const sorted = [...filteredRows].sort((left, right) => {
      const result = left[sortKey] - right[sortKey];
      return sortDirection === "asc" ? result : -result;
    });

    return limit === "all" ? sorted : sorted.slice(0, limit);
  }, [filteredRows, limit, sortDirection, sortKey]);

  const headerStats = useMemo(() => {
    const totalHits = filteredRows.reduce((sum, row) => sum + row.total, 0);
    const uniqueSections = new Set(filteredRows.map((row) => row.section)).size;
    const uniqueGroups = new Set(filteredRows.map((row) => row.topGroup)).size;
    const uniqueAgents = new Set(filteredRows.flatMap((row) => row.userAgentExamples)).size;

    return [
      ["Path", formatInteger(filteredRows.length)],
      ["Запросы", formatInteger(totalHits)],
      ["Группы", formatInteger(uniqueGroups)],
      ["User-agent", formatInteger(uniqueAgents)],
      ["Разделы", formatInteger(uniqueSections)],
    ];
  }, [filteredRows]);

  const setSort = (key: TableSortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };

  const numericHeader = (key: TableSortKey) => (
    <button
      className="inline-flex items-center gap-1 text-left text-muted hover:text-accent"
      type="button"
      onClick={() => setSort(key)}
      title={`Сортировать: ${sortLabels[key]}`}
    >
      {sortLabels[key]}
      <ArrowDownUp className="h-3 w-3" aria-hidden="true" />
    </button>
  );

  return (
    <section className="panel p-4">
      <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Path и запросы</h2>
          <p className="mt-1 text-sm text-muted">
            Какие path получают запросы, какие группы доминируют и где чаще встречаются разные
            user-agent.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {headerStats.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surface px-3 py-3">
                <p className="text-[11px] font-bold uppercase text-muted">{label}</p>
                <p className="mt-2 text-lg font-extrabold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="control flex min-h-[48px] items-center gap-2 px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-muted" aria-hidden="true" />
            <input
              className="w-full bg-transparent text-sm font-bold text-ink outline-none placeholder:text-muted"
              placeholder="Найти path"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {([10, 25, 50, "all"] as const).map((item) => (
              <button
                key={item}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                  limit === item
                    ? "bg-aqua text-[#071314]"
                    : "border border-line bg-surface text-ink"
                }`}
                type="button"
                onClick={() => setLimit(item)}
              >
                {item === "all" ? "Все" : item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative h-[min(70vh,760px)] overflow-auto rounded-2xl border border-line">
        <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-panel text-muted">
            <tr>
              <th className="sticky left-0 z-20 w-[480px] bg-panel px-4 py-3 font-bold">
                Path
              </th>
              <th className="px-3 py-3 font-bold">{numericHeader("total")}</th>
              <th className="px-3 py-3 font-bold">Главная группа</th>
              <th className="px-3 py-3 font-bold">{numericHeader("topGroupCount")}</th>
              <th className="px-3 py-3 font-bold">{numericHeader("uniqueGroups")}</th>
              <th className="px-3 py-3 font-bold">{numericHeader("uniqueAgents")}</th>
              <th className="px-3 py-3 font-bold">Раздел</th>
              <th className="px-3 py-3 font-bold">Тип</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const fullUrl = buildFullUrl(row.path);
              const displayPath = buildDisplayPath(fullUrl);

              return (
                <tr key={row.path} className="group border-t border-line align-top hover:bg-[#F8FAFC]">
                  <td className="sticky left-0 z-[1] bg-white px-4 py-3 group-hover:bg-[#F8FAFC]">
                    <div className="flex max-w-[456px] items-start gap-2">
                      <button
                        className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line text-slate-500 hover:border-accent hover:text-accent"
                        type="button"
                        title="Скопировать URL"
                        onClick={() => copyUrl(fullUrl)}
                      >
                        {copied === fullUrl ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <a
                          className="flex max-w-full items-start gap-1.5 font-bold text-accent hover:text-[#93E6D9]"
                          href={fullUrl}
                          rel="noreferrer"
                          target="_blank"
                          title={fullUrl}
                        >
                          <span className="min-w-0 break-all leading-5">
                            {truncateMiddle(displayPath, 58)}
                          </span>
                          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        </a>
                        <p className="mt-1 truncate text-xs text-muted">servicepipe.ru</p>
                        <p className="mt-1 break-words text-xs leading-5 text-muted">
                          {row.userAgentExamples.join(" / ")}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3 font-bold text-ink">{formatInteger(row.total)}</td>
                  <td className="px-3 py-3 text-ink">{row.topGroup}</td>
                  <td className="px-3 py-3 text-ink">
                    {formatInteger(row.topGroupCount)}
                    <span className="ml-2 text-xs text-muted">
                      {formatPercent(row.topGroupShare * 100)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ink">{formatInteger(row.uniqueGroups)}</td>
                  <td className="px-3 py-3 text-ink">{formatInteger(row.uniqueAgents)}</td>
                  <td className="px-3 py-3 text-muted">{truncateMiddle(row.section, 24)}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink">
                      {pageTypeLabels[row.pageType]}
                    </span>
                  </td>
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
