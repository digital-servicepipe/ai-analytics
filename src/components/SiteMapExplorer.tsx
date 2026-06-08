import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Map as MapIcon,
  ShieldAlert,
  Upload,
} from "lucide-react";
import {
  DEFAULT_ROBOTS_FILE,
  DEFAULT_ROBOTS_TXT,
  DEFAULT_SITEMAP_FILES,
  DEFAULT_SITEMAP_XML,
} from "../data/defaultSiteFiles";
import type { NormalizedLogRow } from "../types";
import { formatInteger } from "../utils/format";
import {
  buildSitemapNodes,
  parseRobots,
  parseSitemap,
  summarizeTraffic,
} from "../utils/siteFiles";

type SiteMapExplorerProps = {
  rows: NormalizedLogRow[];
  onPathSelect: (path: string) => void;
};

type LoadedSiteFile = {
  name: string;
  content: string;
};

type TreeItem = {
  type: "folder" | "page";
  name: string;
  path: string;
  pages: number;
  total: number;
  blocked: number;
  bots: Record<string, number>;
};

function splitPath(path: string) {
  return path.split("/").filter(Boolean);
}

function joinPath(parts: string[]) {
  return parts.length ? `/${parts.join("/")}` : "/";
}

function titleFromSegment(segment: string) {
  return segment.replace(/[-_]/g, " ");
}

function isUnderPath(path: string, parentPath: string) {
  if (parentPath === "/") return true;
  return path === parentPath || path.startsWith(`${parentPath}/`);
}

function mergeBots(target: Record<string, number>, source: Record<string, number>) {
  Object.entries(source).forEach(([bot, count]) => {
    target[bot] = (target[bot] ?? 0) + count;
  });
}

function botSummary(bots: Record<string, number>) {
  return Object.entries(bots)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 2);
}

function statTone(value: number) {
  return value ? "border-amber-200 bg-amber-50" : "border-line bg-surface";
}

export function SiteMapExplorer({ rows, onPathSelect }: SiteMapExplorerProps) {
  const [sitemapFiles, setSitemapFiles] = useState<LoadedSiteFile[]>([
    { name: "sitemap.xml", content: DEFAULT_SITEMAP_XML },
  ]);
  const [robotsTxt, setRobotsTxt] = useState(DEFAULT_ROBOTS_TXT);
  const [currentPath, setCurrentPath] = useState("/");

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

  const fileStats = useMemo(
    () =>
      sitemapFiles.map((file) => ({
        name: file.name,
        count: parseSitemap(file.content).length,
      })),
    [sitemapFiles],
  );

  const sitemapEntries = useMemo(() => {
    const entries = sitemapFiles.flatMap((file) => parseSitemap(file.content));
    const byPath = new Map(entries.map((entry) => [entry.path, entry]));
    return Array.from(byPath.values());
  }, [sitemapFiles]);
  const robotsRules = useMemo(() => parseRobots(robotsTxt), [robotsTxt]);
  const traffic = useMemo(
    () => summarizeTraffic(rows, robotsRules),
    [robotsRules, rows],
  );
  const sitemapNodes = useMemo(
    () => buildSitemapNodes(sitemapEntries, traffic, robotsRules),
    [robotsRules, sitemapEntries, traffic],
  );

  const sitemapPathSet = useMemo(
    () => new Set(sitemapEntries.map((entry) => entry.path)),
    [sitemapEntries],
  );
  const blockedTraffic = useMemo(
    () => traffic.filter((item) => item.disallowedBy.length),
    [traffic],
  );
  const outsideSitemap = useMemo(
    () => traffic.filter((item) => !sitemapPathSet.has(item.path)),
    [sitemapPathSet, traffic],
  );

  const treeItems = useMemo(() => {
    const currentParts = splitPath(currentPath);
    const currentDepth = currentParts.length;
    const items = new Map<string, TreeItem>();

    sitemapNodes.forEach((node) => {
      if (!isUnderPath(node.path, currentPath)) return;

      const parts = splitPath(node.path);
      if (node.path === "/" && currentPath === "/") {
        items.set("/", {
          type: "page",
          name: "Главная",
          path: "/",
          pages: 1,
          total: node.total,
          blocked: node.isBlockedByRobots ? 1 : 0,
          bots: { ...node.bots },
        });
        return;
      }
      if (parts.length <= currentDepth) return;

      const childParts = parts.slice(0, currentDepth + 1);
      const childPath = joinPath(childParts);
      const isDirectPage = parts.length === currentDepth + 1;
      const item = items.get(childPath) ?? {
        type: isDirectPage ? "page" : "folder",
        name: titleFromSegment(childParts[childParts.length - 1]),
        path: childPath,
        pages: 0,
        total: 0,
        blocked: 0,
        bots: {},
      };

      item.type = item.type === "folder" || !isDirectPage ? "folder" : "page";
      item.pages += 1;
      item.total += node.total;
      item.blocked += node.isBlockedByRobots ? 1 : 0;
      mergeBots(item.bots, node.bots);
      items.set(childPath, item);
    });

    return Array.from(items.values()).sort((left, right) => {
      if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
      return right.total - left.total || right.pages - left.pages || left.path.localeCompare(right.path);
    });
  }, [currentPath, sitemapNodes]);

  const breadcrumbs = splitPath(currentPath).reduce(
    (acc, part, index, parts) => [
      ...acc,
      { label: titleFromSegment(part), path: joinPath(parts.slice(0, index + 1)) },
    ],
    [{ label: "Сайт", path: "/" }],
  );
  const maxHits = Math.max(1, ...treeItems.map((item) => item.total));
  const visitedSitemapPages = sitemapNodes.filter((node) => node.total > 0).length;
  const disallowRulesCount = robotsRules.filter(
    (rule) => rule.directive === "disallow",
  ).length;

  const uploadRobotsFile = async (
    event: ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setter(await file.text());
    event.target.value = "";
  };

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
    setCurrentPath("/");
    event.target.value = "";
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="mr-auto flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
            <MapIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Карта сайта</h2>
            <p className="text-sm text-muted">
              Дерево sitemap с фактическими заходами ИИ-агентов
            </p>
          </div>
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
            onChange={(event) => void uploadRobotsFile(event, setRobotsTxt)}
          />
        </label>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_330px]">
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {currentPath !== "/" && (
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-ink"
                type="button"
                onClick={() => setCurrentPath(joinPath(splitPath(currentPath).slice(0, -1)))}
                aria-label="Назад"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {breadcrumbs.map((crumb, index) => (
              <button
                key={crumb.path}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold ${
                  crumb.path === currentPath
                    ? "bg-accent text-white"
                    : "bg-white text-ink hover:bg-slate-100"
                }`}
                type="button"
                onClick={() => setCurrentPath(crumb.path)}
              >
                {index > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                {crumb.label}
              </button>
            ))}
          </div>

          <div className="grid max-h-[520px] gap-2 overflow-auto pr-1 md:grid-cols-2 2xl:grid-cols-3">
            {treeItems.map((item) => {
              const heat = Math.max(4, Math.round((item.total / maxHits) * 100));
              const isFolder = item.type === "folder";

              return (
                <button
                  key={item.path}
                  className="group rounded-xl border border-line bg-white p-3 text-left shadow-sm transition hover:border-accent hover:shadow-card"
                  type="button"
                  onClick={() => {
                    if (isFolder) {
                      setCurrentPath(item.path);
                      return;
                    }
                    onPathSelect(item.path);
                  }}
                >
                  <div className="mb-3 flex items-start gap-2">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isFolder ? "bg-accent/10 text-accent" : "bg-surface text-muted"
                      }`}
                    >
                      {isFolder ? (
                        <FolderOpen className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-semibold capitalize text-ink">
                          {item.name}
                        </p>
                        {isFolder && (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted group-hover:text-accent" aria-hidden="true" />
                        )}
                      </div>
                      <p className="truncate text-xs text-muted">{item.path}</p>
                    </div>
                  </div>

                  <div className="mb-2 h-2 rounded-full bg-surface">
                    <div
                      className={`h-2 rounded-full ${item.blocked ? "bg-amber-500" : "bg-accent"}`}
                      style={{ width: `${heat}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{formatInteger(item.total)} запросов</span>
                    {isFolder && <span>{formatInteger(item.pages)} страниц</span>}
                    {item.blocked > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                        <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                        {formatInteger(item.blocked)}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">
                    {botSummary(item.bots).map(([bot, count]) => (
                      <span key={bot} className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5">
                        <Bot className="h-3 w-3" aria-hidden="true" />
                        {bot}: {formatInteger(count)}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="text-xs font-medium uppercase text-muted">Sitemap</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {formatInteger(sitemapEntries.length)}
              </p>
              <p className="text-xs text-muted">
                {formatInteger(visitedSitemapPages)} с трафиком
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${statTone(blockedTraffic.length)}`}>
              <p className="text-xs font-medium uppercase text-muted">Robots</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {formatInteger(blockedTraffic.length)}
              </p>
              <p className="text-xs text-muted">запрещённых URL</p>
            </div>
          </div>

          <div className={`rounded-xl border p-3 ${statTone(outsideSitemap.length)}`}>
            <p className="text-xs font-medium uppercase text-muted">Вне sitemap</p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {formatInteger(outsideSitemap.length)}
            </p>
            <p className="text-xs text-muted">агенты ходили, но URL нет в карте</p>
          </div>

          <div className="rounded-xl border border-line p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Куда ходили, хотя закрыто
            </h3>
            <div className="flex max-h-44 flex-col gap-2 overflow-auto">
              {blockedTraffic.slice(0, 6).map((item) => (
                <button
                  key={item.path}
                  className="rounded-lg bg-surface p-2 text-left text-xs hover:bg-amber-50"
                  type="button"
                  onClick={() => onPathSelect(item.path)}
                >
                  <p className="truncate font-semibold text-ink">{item.path}</p>
                  <p className="text-muted">
                    {formatInteger(item.total)} запросов · {item.disallowedBy[0]}
                  </p>
                </button>
              ))}
              {!blockedTraffic.length && (
                <p className="text-sm text-muted">Нарушений по robots.txt нет.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-line p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <Folder className="h-4 w-4" aria-hidden="true" />
              Файлы
            </h3>
            <div className="flex flex-wrap gap-2">
              {fileStats.map((file) => (
                <span key={file.name} className="rounded-md bg-surface px-2 py-1 text-xs text-muted">
                  {file.name}: {formatInteger(file.count)}
                </span>
              ))}
              <span className="rounded-md bg-surface px-2 py-1 text-xs text-muted">
                robots rules: {formatInteger(disallowRulesCount)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
