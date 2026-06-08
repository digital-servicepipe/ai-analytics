import type { NormalizedLogRow } from "../types";

export type SitemapEntry = {
  url: string;
  path: string;
  title: string;
  group: string;
  depth: number;
  lastmod: string;
  changefreq: string;
  priority: string;
};

export type RobotsRule = {
  agent: string;
  directive: "disallow" | "crawl-delay" | "sitemap" | "clean-param";
  value: string;
};

export type TrafficSummary = {
  path: string;
  rawPath: string;
  total: number;
  bots: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  disallowedBy: string[];
};

export type SitemapNode = SitemapEntry & {
  total: number;
  bots: Record<string, number>;
  isBlockedByRobots: boolean;
  blockingRules: string[];
};

export function normalizePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";

  try {
    const url = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed)
      : new URL(trimmed, "https://servicepipe.ru");
    const path = decodeURI(url.pathname || "/");
    return path !== "/" ? path.replace(/\/$/, "") : "/";
  } catch {
    const [path] = trimmed.split("?");
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return normalized !== "/" ? normalized.replace(/\/$/, "") : "/";
  }
}

export function normalizePathWithSearch(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";

  try {
    const url = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed)
      : new URL(trimmed, "https://servicepipe.ru");
    return `${decodeURI(url.pathname || "/")}${url.search}`;
  } catch {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
}

function textFromElement(element: Element, tagName: string) {
  return element.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? "";
}

function titleFromPath(path: string) {
  if (path === "/") return "Главная";
  return path.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? path;
}

function groupFromPath(path: string) {
  if (path === "/") return "Главная";
  return path.split("/").filter(Boolean)[0] ?? "Другое";
}

export function parseSitemap(xml: string): SitemapEntry[] {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const urls = Array.from(document.getElementsByTagName("url"));

  return urls
    .map((element) => {
      const url = textFromElement(element, "loc");
      const path = normalizePath(url);
      const depth = path === "/" ? 0 : path.split("/").filter(Boolean).length;

      return {
        url,
        path,
        title: titleFromPath(path),
        group: groupFromPath(path),
        depth,
        lastmod: textFromElement(element, "lastmod"),
        changefreq: textFromElement(element, "changefreq"),
        priority: textFromElement(element, "priority"),
      };
    })
    .filter((entry) => entry.url);
}

export function parseRobots(robotsTxt: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let agents: string[] = [];
  let hasDirective = false;

  robotsTxt.split(/\r?\n/).forEach((line) => {
    const cleanLine = line.replace(/#.*/, "").trim();
    if (!cleanLine) return;

    const separator = cleanLine.indexOf(":");
    if (separator === -1) return;

    const key = cleanLine.slice(0, separator).trim().toLowerCase();
    const value = cleanLine.slice(separator + 1).trim();

    if (key === "user-agent") {
      if (hasDirective) {
        agents = [];
        hasDirective = false;
      }
      agents.push(value);
      return;
    }

    if (key === "disallow") {
      hasDirective = true;
      agents.forEach((agent) =>
        rules.push({ agent, directive: "disallow", value }),
      );
      return;
    }

    if (key === "crawl-delay") {
      hasDirective = true;
      agents.forEach((agent) =>
        rules.push({ agent, directive: "crawl-delay", value }),
      );
      return;
    }

    if (key === "sitemap") {
      rules.push({ agent: "*", directive: "sitemap", value });
      return;
    }

    if (key === "clean-param") {
      rules.push({ agent: "*", directive: "clean-param", value });
    }
  });

  return rules;
}

function escapeRegExp(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function matchesRule(path: string, rule: string) {
  if (!rule) return false;
  if (rule === "/") return true;

  if (rule.includes("*")) {
    const pattern = rule
      .split("*")
      .map((part) => escapeRegExp(part))
      .join(".*");
    return new RegExp(`^${pattern}`).test(path);
  }

  return path.startsWith(rule);
}

function matchesAgent(row: NormalizedLogRow, agent: string) {
  if (agent === "*") return true;
  const normalizedAgent = agent.toLowerCase();
  return (
    row.botType.toLowerCase().includes(normalizedAgent) ||
    row.httpUserAgent.toLowerCase().includes(normalizedAgent)
  );
}

export function getBlockingRules(row: NormalizedLogRow, rules: RobotsRule[]) {
  const path = normalizePathWithSearch(row.path);

  return rules
    .filter((rule) => rule.directive === "disallow")
    .filter((rule) => matchesAgent(row, rule.agent))
    .filter((rule) => matchesRule(path, rule.value))
    .map((rule) => `${rule.agent}: ${rule.value}`);
}

export function summarizeTraffic(
  rows: NormalizedLogRow[],
  robotsRules: RobotsRule[],
): TrafficSummary[] {
  const groups = new Map<string, NormalizedLogRow[]>();

  rows.forEach((row) => {
    const path = normalizePath(row.path);
    const group = groups.get(path) ?? [];
    group.push(row);
    groups.set(path, group);
  });

  return Array.from(groups.entries())
    .map(([path, group]) => {
      const dates = group
        .map((row) => row.date)
        .filter((date) => date !== "Unknown")
        .sort();
      const bots: Record<string, number> = {};
      const disallowedBy = Array.from(
        new Set(group.flatMap((row) => getBlockingRules(row, robotsRules))),
      );

      group.forEach((row) => {
        bots[row.botType] = (bots[row.botType] ?? 0) + 1;
      });

      return {
        path,
        rawPath: group[0]?.path ?? path,
        total: group.length,
        bots,
        firstSeen: dates[0] ?? "Unknown",
        lastSeen: dates[dates.length - 1] ?? "Unknown",
        disallowedBy,
      };
    })
    .sort((left, right) => right.total - left.total);
}

export function buildSitemapNodes(
  sitemapEntries: SitemapEntry[],
  traffic: TrafficSummary[],
  robotsRules: RobotsRule[],
) {
  const trafficByPath = new Map(traffic.map((item) => [item.path, item]));
  const syntheticRow = (path: string): NormalizedLogRow => ({
    datetimeRaw: "",
    parsedAt: null,
    date: "Unknown",
    hour: null,
    httpUserAgent: "",
    uniqId: "",
    path,
    country: "",
    asn: "",
    subnet: "",
    botType: "*",
    section: "",
    pageType: "other",
  });

  return sitemapEntries.map((entry) => {
    const item = trafficByPath.get(entry.path);
    const blockingRules = getBlockingRules(syntheticRow(entry.path), robotsRules);

    return {
      ...entry,
      total: item?.total ?? 0,
      bots: item?.bots ?? {},
      isBlockedByRobots: blockingRules.length > 0,
      blockingRules,
    };
  });
}
