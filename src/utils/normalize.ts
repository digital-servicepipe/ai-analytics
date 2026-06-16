import type { NormalizedLogRow, PageType, RawLogRow } from "../types";

type AgentIntentProfile = {
  purpose: string;
  action: string;
  audience: string;
};

export const REQUIRED_COLUMNS = [
  "datetime",
  "http_user_agent",
  "uniq_id",
  "path",
  "cresp_country",
  "cresp_asn",
  "cresp_subnet",
  "bot_type",
];

const productPaths = [
  "/web-ddos-protection",
  "/antibot",
  "/waf",
  "/ip-transit",
  "/web-log-analysis",
  "/dosgate",
  "/cybert",
  "/flowcollector",
  "/secure-dns-hosting",
  "/stress-test",
  "/visibla/scan",
  "/visibla/verify",
];

const technicalNeedles = [
  ".json",
  ".env",
  ".git",
  "manifest",
  "build-manifest",
  "asset-manifest",
];

function value(row: RawLogRow, key: string): string {
  return String(row[key] ?? "").trim();
}

const AGENT_NAME_PATTERNS: Array<{ name: string; family: string; pattern: RegExp }> = [
  { name: "ChatGPT-User", family: "OpenAI", pattern: /chatgpt-user/i },
  { name: "GPTBot", family: "OpenAI", pattern: /gptbot/i },
  { name: "OAI-SearchBot", family: "OpenAI", pattern: /oai-searchbot/i },
  { name: "Operator", family: "OpenAI", pattern: /operator/i },
  { name: "ClaudeBot", family: "Anthropic", pattern: /claudebot/i },
  { name: "Claude-User", family: "Anthropic", pattern: /claude-user|claude-code/i },
  { name: "Googlebot", family: "Google", pattern: /googlebot/i },
  { name: "Google-Extended", family: "Google", pattern: /google-extended/i },
  { name: "GoogleOther", family: "Google", pattern: /googleother/i },
  { name: "VertexBot", family: "Google", pattern: /vertex/i },
  { name: "PerplexityBot", family: "Perplexity", pattern: /perplexitybot/i },
  { name: "Perplexity-User", family: "Perplexity", pattern: /perplexity-user/i },
  { name: "Applebot", family: "Apple", pattern: /applebot/i },
  { name: "Bytespider", family: "ByteDance", pattern: /bytespider/i },
  { name: "Amazonbot", family: "Amazon", pattern: /amazonbot/i },
  { name: "DuckAssistBot", family: "DuckDuckGo", pattern: /duckassistbot/i },
  { name: "CCBot", family: "Common Crawl", pattern: /ccbot/i },
  { name: "PetalBot", family: "Huawei", pattern: /petalbot/i },
  { name: "Bingbot", family: "Microsoft", pattern: /bingbot/i },
  { name: "AdIdxBot", family: "Microsoft", pattern: /adidxbot/i },
  { name: "Copilot", family: "Microsoft", pattern: /copilot/i },
  { name: "YandexBot", family: "Yandex", pattern: /yandex/i },
  { name: "Meta", family: "Meta", pattern: /facebookexternalhit|meta/i },
  { name: "Cloudflare", family: "Cloudflare", pattern: /cloudflare|alwaysonline|cf-/i },
];

function findAgentPattern(source: string) {
  return AGENT_NAME_PATTERNS.find((candidate) => candidate.pattern.test(source));
}

function findAgentName(source: string, botType: string): string {
  const match = findAgentPattern(source);
  if (match) return match.name;

  const cleanBotType = botType.trim();
  if (cleanBotType && cleanBotType !== "Unknown bot") return cleanBotType;
  return "Unknown user-agent";
}

export function getAgentDetailLabel(botType: string, userAgent: string): string {
  const normalizedBot = botType.trim();
  const normalizedUserAgent = userAgent.trim();
  const source = `${normalizedBot} ${normalizedUserAgent}`.trim();

  if (!source || normalizedUserAgent === "Unknown user-agent") {
    return normalizedBot || "Unknown user-agent";
  }

  const agentName = findAgentName(source, normalizedBot);
  return agentName;
}

export function getAgentGroup(botType: string, userAgent: string): string {
  const source = `${botType} ${userAgent}`.toLowerCase();
  const match = findAgentPattern(source);
  if (match) return match.family;

  const normalizedBotType = botType.trim();
  if (normalizedBotType && normalizedBotType !== "Unknown bot") return normalizedBotType;

  return "Other";
}

export function getAgentIntentProfile(agentGroup: string, agentDetail: string): AgentIntentProfile {
  const detail = agentDetail.toLowerCase();
  const group = agentGroup.toLowerCase();

  if (
    detail.includes("chatgpt-user") ||
    detail.includes("claude-user") ||
    detail.includes("perplexity-user") ||
    detail.includes("copilot")
  ) {
    return {
      purpose: "ищет готовый ответ, цитату и короткий вывод для пользователя",
      action:
        "Добавьте сверху ясный ответ, тезисы, цифры, FAQ и фрагменты, которые можно легко процитировать.",
      audience: "Маркетинг",
    };
  }

  if (
    detail.includes("oai-searchbot") ||
    detail.includes("gptbot") ||
    detail.includes("claudebot") ||
    detail.includes("perplexitybot") ||
    detail.includes("googlebot") ||
    detail.includes("google-extended") ||
    detail.includes("bingbot") ||
    detail.includes("applebot") ||
    detail.includes("bytespider") ||
    detail.includes("duckassistbot") ||
    detail.includes("ccbot") ||
    detail.includes("petalbot") ||
    detail.includes("yandex")
  ) {
    return {
      purpose: "сканирует страницу для индексации, retrieval и будущих ответов",
      action:
        "Упростите структуру страницы: понятный заголовок, блок с сутью, факты, таблицы, FAQ и чистые внутренние ссылки.",
      audience: "CMO",
    };
  }

  if (group.includes("anthropic") || group.includes("openai") || group.includes("perplexity")) {
    return {
      purpose: "оценивает, можно ли страницу использовать в AI-ответах и рекомендациях",
      action:
        "Усильте экспертность: добавьте кейсы, формулировки выгод, сравнения и конкретные сценарии применения.",
      audience: "Маркетинг",
    };
  }

  if (group.includes("google") || group.includes("microsoft") || group.includes("apple")) {
    return {
      purpose: "проверяет видимость и пригодность страницы для поиска и ассистентов",
      action:
        "Проверьте, что ключевые path дают понятный интент, короткое описание и не прячут важный смысл ниже первого экрана.",
      audience: "CMO",
    };
  }

  if (group.includes("meta")) {
    return {
      purpose: "проверяет, как материал выглядит для распространения и ссылок",
      action:
        "Для PR и контента добавьте чёткий заголовок, заметную цитату, цифры и блок, который легко репостить.",
      audience: "PR",
    };
  }

  return {
    purpose: "проверяет и читает страницу как внешний агент или краулер",
    action:
      "Сделайте страницу понятной без контекста: один главный месседж, короткое объяснение и явный следующий шаг.",
    audience: "Маркетинг",
  };
}

export function parseDatetime(raw: string): {
  parsedAt: Date | null;
  date: string;
  hour: number | null;
  minute: number | null;
} {
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (!match) {
    return { parsedAt: null, date: "Unknown", hour: null, minute: null };
  }

  const [, year, month, day, hour, minute, second] = match;
  const parsedAt = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  if (Number.isNaN(parsedAt.getTime())) {
    return { parsedAt: null, date: "Unknown", hour: null, minute: null };
  }

  return {
    parsedAt,
    date: `${year}-${month}-${day}`,
    hour: Number(hour),
    minute: Number(minute),
  };
}

function startsWithSegment(path: string, segment: string): boolean {
  return path === segment || path.startsWith(`${segment}/`);
}

export function normalizePathForJoin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "/";

  let path = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      path = `${url.pathname}${url.search}`;
    }
  } catch {
    path = trimmed;
  }

  const withoutHash = path.split("#")[0] || "/";
  const normalized = withoutHash.startsWith("/") ? withoutHash : `/${withoutHash}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : "/";
}

export function getPageMeta(pathValue: string): {
  section: string;
  pageType: PageType;
} {
  const path = normalizePathForJoin(pathValue).toLowerCase();

  if (path.startsWith("/blog")) {
    return { section: "Блог и кейсы", pageType: "blog" };
  }
  if (path.startsWith("/press-center")) {
    return { section: "Пресс-центр", pageType: "press" };
  }
  if (path.startsWith("/news")) {
    return { section: "Новости", pageType: "news" };
  }
  if (path.startsWith("/uploads") || path.startsWith("/assets")) {
    return { section: "Файлы и ассеты", pageType: "file" };
  }
  if (
    startsWithSegment(path, "/finance") ||
    startsWithSegment(path, "/retail") ||
    startsWithSegment(path, "/telecom")
  ) {
    return { section: "Отраслевые страницы", pageType: "industry" };
  }
  if (technicalNeedles.some((needle) => path.includes(needle))) {
    return { section: "Технический шум", pageType: "technical" };
  }
  if (productPaths.some((productPath) => startsWithSegment(path, productPath))) {
    return { section: "Продукты и услуги", pageType: "product" };
  }

  return { section: "Другое", pageType: "other" };
}

export function normalizeRow(row: RawLogRow): NormalizedLogRow {
  const datetimeRaw = value(row, "datetime");
  const path = normalizePathForJoin(value(row, "path") || "Unknown path");
  const botType = value(row, "bot_type") || "Unknown bot";
  const httpUserAgent = value(row, "http_user_agent") || "Unknown user-agent";
  const { parsedAt, date, hour, minute } = parseDatetime(datetimeRaw);
  const { section, pageType } = getPageMeta(path);

  return {
    datetimeRaw,
    parsedAt,
    date,
    hour,
    minute,
    httpUserAgent,
    uniqId: value(row, "uniq_id"),
    path,
    country: value(row, "cresp_country") || "Unknown country",
    asn: value(row, "cresp_asn") || "Unknown ASN",
    subnet: value(row, "cresp_subnet"),
    botType,
    agentGroup: getAgentGroup(botType, httpUserAgent),
    section,
    pageType,
  };
}
