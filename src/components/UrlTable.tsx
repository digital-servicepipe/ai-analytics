import { useMemo, useState } from "react";
import { ArrowDownUp, Check, Copy, ExternalLink, Search } from "lucide-react";
import type { SortKey, UrlSummary } from "../types";
import { formatInteger, truncateMiddle } from "../utils/format";

type UrlTableProps = {
  summaries: UrlSummary[];
};

type Limit = 10 | 25 | 50 | "all";
type TableSortKey = Exclude<SortKey, "asnCount">;

const sortLabels: Record<TableSortKey, string> = {
  total: "Запросы",
  chatGptUser: "ChatGPT-User",
  oaiSearchBot: "OAI-SearchBot",
  gptBot: "GPTBot",
};

function buildFullUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `https://servicepipe.ru${encodeURI(normalizedPath)}`;
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
    const sorted = [...filteredRows].sort((a, b) => {
      const result = a[sortKey] - b[sortKey];
      return sortDirection === "asc" ? result : -result;
    });

    return limit === "all" ? sorted : sorted.slice(0, limit);
  }, [filteredRows, limit, sortDirection, sortKey]);

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
      className="inline-flex items-center gap-1 text-left hover:text-accent"
      type="button"
      onClick={() => setSort(key)}
      title={`Сортировать: ${sortLabels[key]}`}
    >
      {sortLabels[key]}
      <ArrowDownUp className="h-3 w-3" aria-hidden="true" />
    </button>
  );

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-semibold text-ink">Страницы и запросы</h2>
          <p className="mt-0.5 text-sm text-muted">
            Показано {formatInteger(rows.length)} из{" "}
            {formatInteger(filteredRows.length)} страниц
          </p>
        </div>

        <label className="flex min-w-[320px] flex-1 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm lg:max-w-xl">
          <Search className="h-4 w-4 text-muted" aria-hidden="true" />
          <input
            className="w-full bg-transparent outline-none placeholder:text-muted"
            placeholder="Поиск по странице или URL"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="flex rounded-lg border border-line p-1">
          {([10, 25, 50, "all"] as const).map((item) => (
            <button
              key={item}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                limit === item
                  ? "bg-accent text-white"
                  : "text-slate-700 hover:bg-surface"
              }`}
              type="button"
              onClick={() => setLimit(item)}
            >
              {item === "all" ? "Все" : item}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[min(68vh,760px)] overflow-auto rounded-xl border border-line">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-surface text-slate-600">
            <tr>
              <th className="sticky left-0 z-20 w-[430px] bg-surface px-4 py-3 font-semibold">
                Страница
              </th>
              <th className="px-3 py-3 font-semibold">{numericHeader("total")}</th>
              <th className="px-3 py-3 font-semibold">
                {numericHeader("chatGptUser")}
              </th>
              <th className="px-3 py-3 font-semibold">
                {numericHeader("oaiSearchBot")}
              </th>
              <th className="px-3 py-3 font-semibold">{numericHeader("gptBot")}</th>
              <th className="px-3 py-3 font-semibold">Раздел</th>
              <th className="px-3 py-3 font-semibold">Тип</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const fullUrl = buildFullUrl(row.path);

              return (
                <tr key={row.path} className="group border-t border-line hover:bg-[#f9fbfe]">
                  <td className="sticky left-0 z-[1] bg-white px-4 py-3 group-hover:bg-[#f9fbfe]">
                    <div className="flex max-w-[410px] items-center gap-2">
                      <button
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-slate-500 hover:border-accent hover:text-accent"
                        type="button"
                        title="Скопировать полный URL"
                        onClick={() => copyUrl(fullUrl)}
                      >
                        {copied === fullUrl ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                      <a
                        className="inline-flex min-w-0 items-center gap-1.5 font-medium text-accent hover:text-[#2648bd]"
                        href={fullUrl}
                        rel="noreferrer"
                        target="_blank"
                        title={fullUrl}
                      >
                        <span className="truncate">
                          {truncateMiddle(fullUrl.replace(/^https?:\/\//, ""), 74)}
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold">{formatInteger(row.total)}</td>
                  <td className="px-3 py-3">{formatInteger(row.chatGptUser)}</td>
                  <td className="px-3 py-3">{formatInteger(row.oaiSearchBot)}</td>
                  <td className="px-3 py-3">{formatInteger(row.gptBot)}</td>
                  <td className="px-3 py-3">{row.section}</td>
                  <td className="px-3 py-3">{row.pageType}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {copied && (
        <div className="fixed bottom-5 right-5 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white shadow-card">
          URL скопирован
        </div>
      )}
    </section>
  );
}
