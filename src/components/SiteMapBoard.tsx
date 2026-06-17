import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Check, Copy, ExternalLink, FolderTree, Layers3, Target } from "lucide-react";
import type { Filters, NormalizedLogRow } from "../types";
import { matchesSectionFilter } from "../utils/aggregations";
import { formatInteger, truncateMiddle } from "../utils/format";
import { getPageMeta } from "../utils/normalize";
import {
  buildSitemapNodes,
  parseRobots,
  parseSitemap,
  summarizeTraffic,
  type SitemapEntry,
  type SitemapNode,
} from "../utils/siteFiles";

type SitemapBucketKey = "main" | "press" | "blog";
type SitemapGroupKey = string;
type NodeTag = "hot" | "warm" | "cold" | "empty" | "blocked";

type SiteMapBoardProps = {
  filters: Filters;
  rows: NormalizedLogRow[];
  sitemapFiles: Array<{ name: string; content: string }>;
  robotsTxt: string;
  onPathSelect: (path: string) => void;
};

type GroupSummary = {
  key: SitemapGroupKey;
  label: string;
  fileName: string;
  totalRequests: number;
  urlCount: number;
  activeCount: number;
  blockedCount: number;
  nodes: SitemapNode[];
};

type GroupNodeData = {
  groupKey: SitemapGroupKey;
  label: string;
  fileName: string;
  totalRequests: number;
  urlCount: number;
  activeCount: number;
  blockedCount: number;
  expanded: boolean;
  onToggle: (groupKey: SitemapGroupKey) => void;
};

type PathNodeData = {
  title: string;
  path: string;
  fullUrl: string;
  total: number;
  status: NodeTag;
  blockedRules: string[];
  botLabels: string[];
  onPathSelect: (path: string) => void;
};

type SitemapEntryMeta = {
  groupKey: SitemapGroupKey;
  fileName: string;
  order: number;
};

const edgeStyle = {
  stroke: "rgba(148, 163, 184, 0.36)",
  strokeWidth: 1.2,
};

const filterChips: Array<[NodeTag, string]> = [
  ["hot", "Горячие path"],
  ["warm", "Средний поток"],
  ["cold", "Низкий поток"],
  ["empty", "Нет запросов"],
  ["blocked", "Robots"],
];

const bucketOrder: SitemapBucketKey[] = ["main", "press", "blog"];

const bucketMeta: Record<SitemapBucketKey, { label: string }> = {
  main: { label: "Основной" },
  press: { label: "Новости и пресс-центр" },
  blog: { label: "Блог и кейсы" },
};

function buildFullUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `https://servicepipe.ru${encodeURI(path.startsWith("/") ? path : `/${path}`)}`;
}

function buildSitemapGroupKey(fileName: string, index: number) {
  return `sitemap:${index}:${fileName}`;
}

function formatSitemapLabel(fileName: string) {
  return fileName.replace(/^site-files\//, "");
}

function stopMapInteraction(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function quantile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.floor(values.length * ratio));
  return values[index] ?? 0;
}

function classifyNode(
  node: SitemapNode,
  lowMark: number,
  highMark: number,
): NodeTag {
  if (node.isBlockedByRobots) return "blocked";
  if (node.total <= 0) return "empty";
  if (node.total >= highMark) return "hot";
  if (node.total >= lowMark) return "warm";
  return "cold";
}

function getNodeTags(
  node: SitemapNode,
  lowMark: number,
  highMark: number,
): NodeTag[] {
  const tags: NodeTag[] = [];

  if (node.isBlockedByRobots) tags.push("blocked");
  if (node.total <= 0) {
    tags.push("empty");
    return tags;
  }

  if (node.total >= highMark) tags.push("hot");
  else if (node.total >= lowMark) tags.push("warm");
  else tags.push("cold");

  return tags;
}

function getMinimapColor(node: Node) {
  const data = node.data as Partial<PathNodeData> | undefined;
  if (data?.status === "hot") return "#2dd4bf";
  if (data?.status === "warm") return "#8b5cf6";
  if (data?.status === "cold") return "#60a5fa";
  if (data?.status === "blocked") return "#f87171";
  if (data?.status === "empty") return "#6b7280";
  return "#1f2937";
}

function classifySitemapBucket(fileName: string, path: string): SitemapBucketKey {
  const normalizedName = fileName.toLowerCase();
  const normalizedPath = path.toLowerCase();

  if (normalizedName.includes("blog") || normalizedPath.startsWith("/blog")) return "blog";
  if (
    normalizedName.includes("news") ||
    normalizedName.includes("press") ||
    normalizedPath.startsWith("/press-center") ||
    normalizedPath.startsWith("/news")
  ) {
    return "press";
  }

  return "main";
}

function GroupNode({ data }: NodeProps<Node<GroupNodeData>>) {
  return (
    <div className="fk-map-node fk-map-group">
      <Handle type="source" position={Position.Right} className="fk-map-handle" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold text-ink">{data.label}</p>
          <p className="mt-0.5 truncate text-[11px] font-bold uppercase text-muted">
            {data.fileName}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {formatInteger(data.urlCount)} URL, {formatInteger(data.totalRequests)} запросов
          </p>
        </div>
        <button
          className="fk-map-action nodrag nopan rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-ink hover:border-aqua hover:text-aqua"
          type="button"
          onPointerDown={stopMapInteraction}
          onMouseDown={stopMapInteraction}
          onDoubleClick={stopMapInteraction}
          onClick={(event) => {
            stopMapInteraction(event);
            data.onToggle(data.groupKey);
          }}
        >
          {data.expanded ? "Скрыть" : `Показать ${data.urlCount}`}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-surface px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-muted">URL</p>
          <p className="mt-1 text-sm font-extrabold text-ink">{formatInteger(data.urlCount)}</p>
        </div>
        <div className="rounded-xl bg-surface px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-muted">Активны</p>
          <p className="mt-1 text-sm font-extrabold text-ink">
            {formatInteger(data.activeCount)}
          </p>
        </div>
        <div className="rounded-xl bg-surface px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-muted">Robots</p>
          <p className="mt-1 text-sm font-extrabold text-ink">
            {formatInteger(data.blockedCount)}
          </p>
        </div>
      </div>
    </div>
  );
}

function PathNode({ data }: NodeProps<Node<PathNodeData>>) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`fk-map-node fk-map-path fk-map-path--${data.status}`}>
      <Handle type="target" position={Position.Left} className="fk-map-handle" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-ink">
            {truncateMiddle(data.title, 26)}
          </p>
          <p className="mt-1 break-all text-[11px] leading-4 text-muted">{data.path}</p>
        </div>
        <div className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-bold text-ink">
          {formatInteger(data.total)}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {data.botLabels.slice(0, 2).map((bot) => (
          <span
            key={`${data.path}:${bot}`}
            className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold text-muted"
          >
            {truncateMiddle(bot, 18)}
          </span>
        ))}
        {!data.botLabels.length && (
          <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold text-muted">
            Нет запросов
          </span>
        )}
        {data.blockedRules.length > 0 && (
          <span className="rounded-full border border-red-400/35 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
            Robots
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          className="fk-map-action nodrag nopan inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink hover:border-aqua hover:text-aqua"
          type="button"
          title="Скопировать ссылку"
          onPointerDown={stopMapInteraction}
          onMouseDown={stopMapInteraction}
          onDoubleClick={stopMapInteraction}
          onClick={(event) => {
            stopMapInteraction(event);
            void copyLink();
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        <a
          className="fk-map-action nodrag nopan inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink hover:border-aqua hover:text-aqua"
          href={data.fullUrl}
          rel="noreferrer"
          target="_blank"
          title="Открыть path"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          className="fk-map-action nodrag nopan inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-2.5 text-[11px] font-bold text-ink hover:border-aqua hover:text-aqua"
          type="button"
          onPointerDown={stopMapInteraction}
          onMouseDown={stopMapInteraction}
          onDoubleClick={stopMapInteraction}
          onClick={(event) => {
            stopMapInteraction(event);
            data.onPathSelect(data.path);
          }}
        >
          В фильтр
        </button>
      </div>
    </div>
  );
}

const nodeTypes = {
  group: GroupNode,
  path: PathNode,
};

function FlowViewportSync({ syncKey }: { syncKey: string }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void fitView({
        padding: 0.14,
        duration: 260,
        includeHiddenNodes: true,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [fitView, syncKey]);

  return null;
}

export function SiteMapBoard({
  filters,
  rows,
  sitemapFiles,
  robotsTxt,
  onPathSelect,
}: SiteMapBoardProps) {
  const [selectedTags, setSelectedTags] = useState<NodeTag[]>([
    "hot",
    "warm",
    "cold",
    "empty",
    "blocked",
  ]);
  const [expandedGroups, setExpandedGroups] = useState<SitemapGroupKey[]>([]);

  const entryMetaByPath = useMemo(() => {
    const meta = new Map<string, SitemapEntryMeta>();

    sitemapFiles.forEach((file, fileIndex) => {
      const groupKey = buildSitemapGroupKey(file.name, fileIndex);
      parseSitemap(file.content).forEach((entry, entryIndex) => {
        if (meta.has(entry.path)) return;
        meta.set(entry.path, {
          groupKey,
          fileName: file.name,
          order: fileIndex * 10000 + entryIndex,
        });
      });
    });

    return meta;
  }, [sitemapFiles]);

  const sitemapGroups = useMemo(
    () =>
      sitemapFiles.map((file, index) => ({
        key: buildSitemapGroupKey(file.name, index),
        label: formatSitemapLabel(file.name),
        fileName: file.name,
        order: index,
      })),
    [sitemapFiles],
  );

  const sitemapEntries = useMemo<SitemapEntry[]>(
    () =>
      sitemapFiles.flatMap((file) => parseSitemap(file.content)).filter((entry, index, list) => {
        return list.findIndex((item) => item.path === entry.path) === index;
      }),
    [sitemapFiles],
  );

  const robotsRules = useMemo(() => parseRobots(robotsTxt), [robotsTxt]);
  const traffic = useMemo(() => summarizeTraffic(rows, robotsRules), [robotsRules, rows]);

  const sitemapNodes = useMemo(
    () => buildSitemapNodes(sitemapEntries, traffic, robotsRules),
    [robotsRules, sitemapEntries, traffic],
  );

  const requestValues = useMemo(
    () =>
      sitemapNodes
        .map((item) => item.total)
        .filter((value) => value > 0)
        .sort((left, right) => left - right),
    [sitemapNodes],
  );
  const lowMark = quantile(requestValues, 0.35);
  const highMark = quantile(requestValues, 0.75);

  const filteredNodes = useMemo(() => {
    const query = filters.pathQuery.trim().toLowerCase();

    return sitemapNodes.filter((node) => {
      const { section } = getPageMeta(node.path);
      const tags = getNodeTags(node, lowMark, highMark);
      if (!matchesSectionFilter(node.path, section, filters)) return false;
      if (query && !node.path.toLowerCase().includes(query)) return false;
      if (!selectedTags.some((tag) => tags.includes(tag))) return false;
      return true;
    });
  }, [filters, highMark, lowMark, selectedTags, sitemapNodes]);

  const groups = useMemo<GroupSummary[]>(() => {
    const grouped = new Map<SitemapGroupKey, SitemapNode[]>();

    sitemapGroups.forEach((group) => grouped.set(group.key, []));

    filteredNodes.forEach((node) => {
      const groupKey = entryMetaByPath.get(node.path)?.groupKey ?? sitemapGroups[0]?.key;
      if (!groupKey) return;
      const items = grouped.get(groupKey) ?? [];
      items.push(node);
      grouped.set(groupKey, items);
    });

    return sitemapGroups
      .map((group) => {
        const nodes = (grouped.get(group.key) ?? []).sort((left, right) => {
          if (right.total !== left.total) return right.total - left.total;
          const leftOrder = entryMetaByPath.get(left.path)?.order ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = entryMetaByPath.get(right.path)?.order ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;
          return left.path.localeCompare(right.path);
        });

        return {
          key: group.key,
          label: group.label,
          fileName: group.fileName,
          totalRequests: nodes.reduce((sum, node) => sum + node.total, 0),
          urlCount: nodes.length,
          activeCount: nodes.filter((node) => node.total > 0).length,
          blockedCount: nodes.filter((node) => node.isBlockedByRobots).length,
          nodes,
        };
      })
      .filter((group) => group.urlCount > 0);
  }, [entryMetaByPath, filteredNodes, sitemapGroups]);

  useEffect(() => {
    const defaults =
      filters.pathQuery.trim().length > 0
        ? groups.map((group) => group.key)
        : [];

    setExpandedGroups((current) => {
      const allowed = new Set(groups.map((group) => group.key));
      const merged = new Set(current.filter((key) => allowed.has(key)));
      defaults.forEach((key) => merged.add(key));
      return Array.from(merged);
    });
  }, [filters.pathQuery, groups]);

  const summary = useMemo(
    () => ({
      urlCount: filteredNodes.length,
      activeCount: filteredNodes.filter((node) => node.total > 0).length,
      emptyCount: filteredNodes.filter((node) => node.total === 0).length,
      blockedCount: filteredNodes.filter((node) => node.isBlockedByRobots).length,
    }),
    [filteredNodes],
  );

  const toggleGroup = (groupKey: SitemapGroupKey) => {
    setExpandedGroups((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey],
    );
  };

  const expandGroup = (groupKey: SitemapGroupKey) => {
    setExpandedGroups((current) => (current.includes(groupKey) ? current : [...current, groupKey]));
  };

  const collapseGroup = (groupKey: SitemapGroupKey) => {
    setExpandedGroups((current) => current.filter((key) => key !== groupKey));
  };

  const toggleTag = (tag: NodeTag) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const graph = useMemo(() => {
    const nodes: Array<Node<GroupNodeData | PathNodeData>> = [];
    const edges: Edge[] = [];

    let currentY = 0;
    const laneGap = 72;
    const groupWidth = 320;
    const groupHeight = 176;
    const childWidth = 252;
    const childHeight = 118;
    const childGapX = 28;
    const childGapY = 18;
    const childColumns = 3;

    groups.forEach((group) => {
      const isExpanded = expandedGroups.includes(group.key);
      const visibleChildren = isExpanded ? group.nodes : [];
      const childRows = Math.max(1, Math.ceil(Math.max(visibleChildren.length, 1) / childColumns));
      const laneHeight = Math.max(
        groupHeight,
        childRows * childHeight + (childRows - 1) * childGapY,
      );

      nodes.push({
        id: `group:${group.key}`,
        type: "group",
        position: { x: 0, y: currentY },
        draggable: false,
        selectable: false,
        data: {
          groupKey: group.key,
          label: group.label,
          fileName: group.fileName,
          totalRequests: group.totalRequests,
          urlCount: group.urlCount,
          activeCount: group.activeCount,
          blockedCount: group.blockedCount,
          expanded: isExpanded,
          onToggle: toggleGroup,
        },
        style: { width: groupWidth, height: groupHeight },
      });

      visibleChildren.forEach((node, index) => {
        const column = index % childColumns;
        const row = Math.floor(index / childColumns);
        const status = classifyNode(node, lowMark, highMark);
        const botLabels = Object.entries(node.bots)
          .sort((left, right) => right[1] - left[1])
          .map(([label]) => label);

        nodes.push({
          id: `path:${node.path}`,
          type: "path",
          position: {
            x: groupWidth + 92 + column * (childWidth + childGapX),
            y: currentY + row * (childHeight + childGapY),
          },
          draggable: false,
          data: {
            title: node.title || node.path,
            path: node.path,
            fullUrl: buildFullUrl(node.path),
            total: node.total,
            status,
            blockedRules: node.blockingRules,
            botLabels,
            onPathSelect,
          },
          style: { width: childWidth, height: childHeight },
        });

        edges.push({
          id: `edge:${group.key}:${node.path}`,
          source: `group:${group.key}`,
          target: `path:${node.path}`,
          type: "smoothstep",
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          style: edgeStyle,
        });
      });

      currentY += laneHeight + laneGap;
    });

    return { nodes, edges };
  }, [expandedGroups, groups, highMark, lowMark, onPathSelect]);

  const viewportSyncKey = useMemo(
    () => `${expandedGroups.join("|")}::${graph.nodes.length}::${graph.edges.length}`,
    [expandedGroups, graph.edges.length, graph.nodes.length],
  );

  return (
    <section className="panel p-4">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-extrabold text-ink">Карта сайта</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
            Разбивка строго по sitemap: основной, новости и пресс-центр, блог и кейсы. Внутри
            видно все URL, число запросов, пустые страницы и правила robots.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="control inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-ink"
            type="button"
            onClick={() => setExpandedGroups(groups.map((group) => group.key))}
          >
            <Layers3 className="h-4 w-4" />
            Раскрыть всё
          </button>
          <button
            className="control inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-ink"
            type="button"
            onClick={() => setExpandedGroups([])}
          >
            <FolderTree className="h-4 w-4" />
            Свернуть всё
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-surface px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-extrabold text-ink">Sitemap</p>
          <button
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-bold text-ink hover:border-aqua hover:text-aqua"
            type="button"
            onClick={() => setExpandedGroups(groups.map((group) => group.key))}
          >
            Раскрыть все
          </button>
          <button
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-bold text-ink hover:border-aqua hover:text-aqua"
            type="button"
            onClick={() => setExpandedGroups([])}
          >
            Скрыть все
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => {
            const isExpanded = expandedGroups.includes(group.key);
            return (
              <div
                key={group.key}
                className="flex items-center gap-2 rounded-xl border border-line bg-panel px-2 py-2"
              >
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    isExpanded
                      ? "bg-aqua text-[#071314]"
                      : "border border-line bg-surface text-ink hover:border-aqua hover:text-aqua"
                  }`}
                  type="button"
                  onClick={() => (isExpanded ? collapseGroup(group.key) : expandGroup(group.key))}
                >
                  {group.label}
                </button>
                <span className="text-xs font-bold text-muted">
                  {formatInteger(group.urlCount)} URL
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["URL в карте", summary.urlCount],
            ["С запросами", summary.activeCount],
            ["Пустые", summary.emptyCount],
            ["Robots", summary.blockedCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-surface px-4 py-3">
              <p className="text-[11px] font-bold uppercase text-muted">{label}</p>
              <p className="mt-1 text-xl font-extrabold text-ink">
                {formatInteger(Number(value))}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterChips.map(([tag, label]) => (
            <button
              key={tag}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                selectedTags.includes(tag)
                  ? "border-aqua bg-aqua/12 text-aqua"
                  : "border-line bg-surface text-ink hover:border-aqua hover:text-aqua"
              }`}
              type="button"
              onClick={() => toggleTag(tag)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2dd4bf]" />
          Горячие path
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" />
          Средний поток
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#60a5fa]" />
          Низкий поток
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#6b7280]" />
          Нет запросов
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
          Robots
        </span>
      </div>

      <div className="fk-map-canvas">
        {graph.nodes.length ? (
          <ReactFlow
            fitView
            minZoom={0.35}
            maxZoom={1.6}
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            elementsSelectable
            panOnScroll
            panOnDrag
            zoomOnScroll
            defaultEdgeOptions={{ style: edgeStyle }}
          >
            <FlowViewportSync syncKey={viewportSyncKey} />
            <Background color="rgba(148, 163, 184, 0.12)" gap={20} size={1} />
            <MiniMap
              pannable
              zoomable
              nodeStrokeWidth={2}
              maskColor="rgba(10, 12, 16, 0.72)"
              style={{
                background: "#111419",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              nodeColor={getMinimapColor}
            />
            <Controls
              showInteractive={false}
              style={{
                background: "#111419",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl bg-surface px-6 text-center text-sm text-muted">
            По текущему фильтру на карте ничего не осталось. Сбросьте path или разделы.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl bg-surface px-4 py-4">
          <p className="text-sm font-extrabold text-ink">Как читать карту</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Слева всегда три fixed-блока по sitemap. Нажмите на кнопку в блоке, чтобы показать или
            скрыть URL внутри. Запросы влияют только на цвет и счетчики, но не на структуру карты.
          </p>
        </div>

        <div className="rounded-2xl bg-surface px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-aqua" />
            <p className="text-sm font-extrabold text-ink">Сейчас в карте</p>
          </div>
          <div className="space-y-2 text-sm text-muted">
            <p>Блоков: {formatInteger(groups.length)}</p>
            <p>Раскрыто: {formatInteger(expandedGroups.length)}</p>
            {groups.map((group) => (
              <p key={group.key}>
                {group.label}:{" "}
                <span className="font-bold text-ink">{formatInteger(group.urlCount)} URL</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
