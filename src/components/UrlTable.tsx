import { useMemo, useState } from "react";
import { ArrowDownUp, Check, Copy, ExternalLink, Search } from "lucide-react";
import type { SortKey, UrlSummary } from "../types";
import { formatInteger, truncateMiddle } from "../utils/format";

type UrlTableProps = {
  summaries: UrlSummary[];
};

type Limit = 10 | 25 | 50 | "all";

const sortLabels: Record<SortKey, string> = {
  total: "Всего обращений",
  chatGptUser: "ChatGPT-User",
  oaiSearchBot: "OAI-SearchBot",
  gptBot: "GPTBot",
  asnCount: "ASN count",
};

function buildFullUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `https://servicepipe.ru${encodeURI(normalizedPath)}`;
}

export function UrlTable({ summaries }: UrlTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<Limit>(25);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");

  const rows = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    const filtered = lowerQuery
      ? summaries.filter((summary) => summary.path.toLowerCase().includes(lowerQuery))
      : summaries;
    const sorted = [...filtered].sort((a, b) => {
      const result = a[sortKey] - b[sortKey];
      return sortDirection === "asc" ? result : -result;
    });
    return limit === "all" ? sorted : sorted.slice(0, limit);
  }, [limit, query, sortDirection, sortKey, summaries]);

  const setSort = (key: SortKey) => {
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

  const numericHeader = (key: SortKey) => (
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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold text-ink">
          Страницы и обращения
        </h2>
        <label className="flex min-w-[260px] items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-muted" aria-hidden="true" />
          <input
            className="w-full bg-transparent outline-none placeholder:text-muted"
            placeholder="Поиск по path в таблице"
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
              {item === "all" ? "All" : `Top ${item}`}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-h-[38vh] overflow-auto rounded-xl border border-line">
        <table className="w-full min-w-[1260px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-surface text-slate-600">
            <tr>
              <th className="w-[300px] px-3 py-2 font-semibold">URL</th>
              <th className="px-3 py-2 font-semibold">{numericHeader("total")}</th>
              <th className="px-3 py-2 font-semibold">{numericHeader("chatGptUser")}</th>
              <th className="px-3 py-2 font-semibold">{numericHeader("oaiSearchBot")}</th>
              <th className="px-3 py-2 font-semibold">{numericHeader("gptBot")}</th>
              <th className="px-3 py-2 font-semibold">Section</th>
              <th className="px-3 py-2 font-semibold">Page type</th>
              <th className="px-3 py-2 font-semibold">First seen</th>
              <th className="px-3 py-2 font-semibold">Last seen</th>
              <th className="px-3 py-2 font-semibold">Countries</th>
              <th className="px-3 py-2 font-semibold">{numericHeader("asnCount")}</th>
              <th className="w-[220px] px-3 py-2 font-semibold">User-agent examples</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const fullUrl = buildFullUrl(row.path);

              return (
                <tr
                  key={row.path}
                  className="border-t border-line hover:bg-[#f9fbfe]"
                >
                  <td className="px-3 py-2">
                    <div className="flex max-w-[290px] items-center gap-2">
                      <button
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-slate-500 hover:border-accent hover:text-accent"
                        type="button"
                        title="Скопировать полный URL"
                        onClick={() => copyUrl(fullUrl)}
                      >
                        {copied === fullUrl ? (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
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
                          {truncateMiddle(fullUrl.replace(/^https?:\/\//, ""), 52)}
                        </span>
                        <ExternalLink
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-semibold">{formatInteger(row.total)}</td>
                  <td className="px-3 py-2">{formatInteger(row.chatGptUser)}</td>
                  <td className="px-3 py-2">{formatInteger(row.oaiSearchBot)}</td>
                  <td className="px-3 py-2">{formatInteger(row.gptBot)}</td>
                  <td className="px-3 py-2">{row.section}</td>
                  <td className="px-3 py-2">{row.pageType}</td>
                  <td className="px-3 py-2">{row.firstSeen}</td>
                  <td className="px-3 py-2">{row.lastSeen}</td>
                  <td className="px-3 py-2" title={row.countries.join(", ")}>
                    {row.countries.join(", ")}
                  </td>
                  <td className="px-3 py-2">{formatInteger(row.asnCount)}</td>
                  <td
                    className="px-3 py-2"
                    title={row.userAgentExamples.join(" | ")}
                  >
                    {truncateMiddle(row.userAgentExamples.join(" | "), 52)}
                  </td>
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
