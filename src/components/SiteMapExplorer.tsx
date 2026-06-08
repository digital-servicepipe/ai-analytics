import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Search, ShieldAlert, Upload } from "lucide-react";
import {
  DEFAULT_ROBOTS_FILE,
  DEFAULT_ROBOTS_TXT,
  DEFAULT_SITEMAP_FILES,
  DEFAULT_SITEMAP_XML,
} from "../data/defaultSiteFiles";
import type { Filters, NormalizedLogRow } from "../types";
import { formatDate, formatInteger, truncateMiddle } from "../utils/format";
import { matchesSectionFilter } from "../utils/aggregations";
import { getPageMeta } from "../utils/normalize";
import {
  parseRobots,
  parseSitemap,
  summarizeTraffic,
} from "../utils/siteFiles";

type SiteMapExplorerProps = {
  filters: Filters;
  rows: NormalizedLogRow[];
  onPathSelect: (path: string) => void;
};

type LoadedSiteFile = {
  name: string;
  content: string;
};

type SitemapRow = ReturnType<typeof parseSitemap>[number] & {
  sources: string[];
};

function botSummary(bots: Record<string, number>) {
  return Object.entries(bots)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3);
}

function collectSitemapRows(files: LoadedSiteFile[]): SitemapRow[] {
  const rowsByPath = new Map<string, SitemapRow>();

  files.forEach((file) => {
    parseSitemap(file.content).forEach((entry) => {
      const current = rowsByPath.get(entry.path);

      if (current) {
        current.sources.push(file.name);
        return;
      }

      rowsByPath.set(entry.path, { ...entry, sources: [file.name] });
    });
  });

  return Array.from(rowsByPath.values()).sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}

export function SiteMapExplorer({ filters, rows, onPathSelect }: SiteMapExplorerProps) {
  const [sitemapFiles, setSitemapFiles] = useState<LoadedSiteFile[]>([
    { name: "sitemap.xml", content: DEFAULT_SITEMAP_XML },
  ]);
  const [robotsTxt, setRobotsTxt] = useState(DEFAULT_ROBOTS_TXT);
  const [query, setQuery] = useState("");
  const [missingLimit, setMissingLimit] = useState<50 | 100 | 250 | "all">(100);

  useEffect(() => {
    const loadDefaults = async () => {
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

    void loadDefaults();
  }, []);

  const sitemapRows = useMemo(() => collectSitemapRows(sitemapFiles), [sitemapFiles]);
  const filteredSitemapRows = useMemo(() => {
    const pathQuery = filters.pathQuery.trim().toLowerCase();

    return sitemapRows.filter((entry) => {
      const { section } = getPageMeta(entry.path);

      if (!matchesSectionFilter(entry.path, section, filters)) return false;
      if (pathQuery && !entry.path.toLowerCase().includes(pathQuery)) return false;

      return true;
    });
  }, [filters, sitemapRows]);
  const robotsRules = useMemo(() => parseRobots(robotsTxt), [robotsTxt]);
  const traffic = useMemo(
    () => summarizeTraffic(rows, robotsRules),
    [robotsRules, rows],
  );
  const trafficByPath = useMemo(
    () => new Map(traffic.map((item) => [item.path, item])),
    [traffic],
  );
  const missingActivity = useMemo(
    () => filteredSitemapRows.filter((entry) => !trafficByPath.has(entry.path)),
    [filteredSitemapRows, trafficByPath],
  );
  const robotsViolations = useMemo(
    () => traffic.filter((item) => item.disallowedBy.length),
    [traffic],
  );
  const queryValue = query.trim().toLowerCase();
  const filteredMissing = missingActivity.filter((entry) =>
    queryValue
      ? `${entry.path} ${entry.sources.join(" ")}`.toLowerCase().includes(queryValue)
      : true,
  );
  const missingRows =
    missingLimit === "all" ? filteredMissing : filteredMissing.slice(0, missingLimit);
  const activeSitemapPages = filteredSitemapRows.length - missingActivity.length;

  const uploadSitemapFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setSitemapFiles(
      await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          content: await file.text(),
        })),
      ),
    );
    event.target.value = "";
  };

  const uploadRobotsFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRobotsTxt(await file.text());
    event.target.value = "";
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-semibold text-ink">Sitemap и robots</h2>
          <p className="text-sm text-muted">
            Базовая проверка: где в sitemap нет запросов ИИ и где robots нарушается
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Sitemap
          <input
            className="hidden"
            type="file"
            multiple
            accept=".xml,application/xml,text/xml"
            onChange={(event) => void uploadSitemapFiles(event)}
          />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Robots
          <input
            className="hidden"
            type="file"
            accept=".txt,text/plain"
            onChange={(event) => void uploadRobotsFile(event)}
          />
        </label>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-xs font-medium uppercase text-muted">URL в sitemap</p>
          <p className="mt-1 text-xl font-semibold text-ink">
            {formatInteger(filteredSitemapRows.length)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-xs font-medium uppercase text-muted">С запросами</p>
          <p className="mt-1 text-xl font-semibold text-ink">
            {formatInteger(activeSitemapPages)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase text-muted">Без запросов</p>
          <p className="mt-1 text-xl font-semibold text-ink">
            {formatInteger(missingActivity.length)}
          </p>
        </div>
        <div className={`rounded-xl border p-3 ${robotsViolations.length ? "border-amber-200 bg-amber-50" : "border-line bg-surface"}`}>
          <p className="text-xs font-medium uppercase text-muted">Robots violations</p>
          <p className="mt-1 text-xl font-semibold text-ink">
            {formatInteger(robotsViolations.length)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 2xl:grid-cols-[1fr_520px]">
        <div className="rounded-xl border border-line">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <div className="mr-auto">
              <h3 className="text-sm font-semibold text-ink">
                Страницы из sitemap без запросов ИИ
              </h3>
              <p className="text-xs text-muted">
                Это кандидаты на проверку: агенты не доходят до них в текущем фильтре
              </p>
            </div>
            <label className="flex min-w-[260px] items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-muted" aria-hidden="true" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-muted"
                placeholder="Найти URL"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="flex rounded-lg border border-line p-1">
              {([50, 100, 250, "all"] as const).map((item) => (
                <button
                  key={item}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                    missingLimit === item
                      ? "bg-accent text-white"
                      : "text-slate-700 hover:bg-surface"
                  }`}
                  type="button"
                  onClick={() => setMissingLimit(item)}
                >
                  {item === "all" ? "Все" : item}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-surface text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">URL</th>
                  <th className="w-[150px] px-3 py-2 font-semibold">Sitemap</th>
                  <th className="w-[120px] px-3 py-2 font-semibold">Lastmod</th>
                  <th className="w-[110px] px-3 py-2 font-semibold">Freq</th>
                </tr>
              </thead>
              <tbody>
                {missingRows.map((entry) => (
                  <tr key={entry.path} className="border-t border-line hover:bg-[#f9fbfe]">
                    <td className="px-3 py-2 font-semibold text-ink">
                      {truncateMiddle(entry.path, 92)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {entry.sources.join(", ")}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {entry.lastmod ? formatDate(entry.lastmod) : "-"}
                    </td>
                    <td className="px-3 py-2 text-muted">{entry.changefreq || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!missingRows.length && (
              <div className="p-4 text-sm text-muted">
                В текущем фильтре все страницы из sitemap имеют запросы ИИ.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-line">
          <div className="border-b border-line p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Нарушения robots.txt
            </h3>
            <p className="text-xs text-muted">
              URL, куда агенты ходили, хотя правило Disallow это закрывает
            </p>
          </div>

          <div className="max-h-[520px] overflow-auto">
            {robotsViolations.map((item) => (
              <button
                key={item.path}
                className="block w-full border-b border-line px-3 py-3 text-left hover:bg-amber-50"
                type="button"
                onClick={() => onPathSelect(item.path)}
              >
                <div className="mb-2 flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{item.path}</p>
                    <p className="text-xs text-muted">
                      {formatInteger(item.total)} запросов
                    </p>
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {item.disallowedBy.map((rule) => (
                    <span key={rule} className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                      {rule}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {botSummary(item.bots).map(([bot, count]) => (
                    <span key={bot} className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-xs text-muted">
                      <Bot className="h-3 w-3" aria-hidden="true" />
                      {bot}: {formatInteger(count)}
                    </span>
                  ))}
                </div>
              </button>
            ))}

            {!robotsViolations.length && (
              <div className="p-4 text-sm text-muted">
                Нарушений robots.txt в текущем фильтре нет.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        {sitemapFiles.map((file) => (
          <span key={file.name} className="rounded-md bg-surface px-2 py-1">
            {file.name}: {formatInteger(parseSitemap(file.content).length)}
          </span>
        ))}
      </div>
    </section>
  );
}
