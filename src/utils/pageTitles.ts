import generatedTitles from "../data/pageTitles.generated.json";

type TitleMeta = {
  title: string;
  source: string;
  kind: string;
};

const pageTitles = generatedTitles as Record<string, TitleMeta>;

function normalizePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";

  try {
    const url = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed)
      : new URL(trimmed, "https://servicepipe.ru");
    const pathname = decodeURI(url.pathname || "/");
    return pathname !== "/" ? pathname.replace(/\/$/, "") : "/";
  } catch {
    const clean = trimmed.split("?")[0]?.split("#")[0] ?? "/";
    const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
    return withSlash !== "/" ? withSlash.replace(/\/$/, "") : "/";
  }
}

function fallbackTitleFromPath(path: string) {
  const normalized = normalizePath(path);
  if (normalized === "/") return "Главная";

  return normalized
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() ?? normalized;
}

export function getPageTitle(path: string, fallback?: string) {
  const normalized = normalizePath(path);
  return pageTitles[normalized]?.title?.trim() || fallback || fallbackTitleFromPath(normalized);
}

export function hasMappedPageTitle(path: string) {
  return Boolean(pageTitles[normalizePath(path)]?.title);
}

export function getPageTitleMeta(path: string) {
  return pageTitles[normalizePath(path)] ?? null;
}
