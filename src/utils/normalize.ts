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
  "/visibla",
  "/visibla/scan",
  "/visibla/verify",
];

const solutionSections: Array<{ path: string; section: string }> = [
  { path: "/telecom", section: "Отраслевые" },
  { path: "/marketing", section: "Отраслевые" },
  { path: "/retail", section: "Отраслевые" },
  { path: "/finance", section: "Отраслевые" },
];

const companyPaths = [
  "/about",
  "/why-servicepipe",
  "/career",
  "/vacancies",
  "/jobs",
  "/partners",
  "/contacts",
  "/cybersecurity-lab",
  "/it-career-start",
];

const servicePaths = [
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-news.xml",
  "/sitemap-blog.xml",
  "/favicon.ico",
  "/favicon.svg",
];

const technicalNeedles = [
  ".json",
  ".env",
  ".git",
  "manifest",
  "build-manifest",
  "asset-manifest",
  "/api/",
  "/admin",
  "/wp-",
];

export const SECTION_ORDER = [
  "Отраслевые",
  "Новости",
  "Пресс-центр",
  "Блог и кейсы",
  "Продукты",
  "Компания",
  "Файлы и ассеты",
  "Служебные страницы",
  "Технический шум",
  "Другое",
];

export function getSectionRank(section: string): number {
  const index = SECTION_ORDER.indexOf(section);
  return index === -1 ? SECTION_ORDER.length : index;
}

function value(row: RawLogRow, key: string): string {
  return String(row[key] ?? "").trim();
}

const AGENT_NAME_PATTERNS: Array<{ name: string; family: string; pattern: RegExp }> = [
  { name: "ChatGPT-User", family: "OpenAI", pattern: /chatgpt-user/i },
  { name: "GPTBot", family: "OpenAI", pattern: /gptbot/i },
  { name: "OAI-SearchBot", family: "OpenAI", pattern: /oai-searchbot/i },
  { name: "OAI-AdsBot", family: "OpenAI", pattern: /oai-adsbot/i },
  { name: "Operator", family: "OpenAI", pattern: /operator/i },
  { name: "Claude-SearchBot", family: "Anthropic", pattern: /claude-searchbot/i },
  { name: "ClaudeBot", family: "Anthropic", pattern: /claudebot/i },
  { name: "Claude-User", family: "Anthropic", pattern: /claude-user|claude-code/i },
  { name: "anthropic-ai", family: "Anthropic", pattern: /anthropic-ai/i },
  { name: "Google-CloudVertexBot", family: "Google", pattern: /google-cloudvertexbot/i },
  { name: "Googlebot", family: "Google", pattern: /googlebot/i },
  { name: "Google-Extended", family: "Google", pattern: /google-extended/i },
  { name: "GoogleOther", family: "Google", pattern: /googleother/i },
  { name: "VertexBot", family: "Google", pattern: /vertex/i },
  { name: "PerplexityBot", family: "Perplexity", pattern: /perplexitybot/i },
  { name: "Perplexity-User", family: "Perplexity", pattern: /perplexity-user/i },
  { name: "Applebot-Extended", family: "Apple", pattern: /applebot-extended/i },
  { name: "Applebot", family: "Apple", pattern: /applebot/i },
  { name: "Bytespider", family: "ByteDance", pattern: /bytespider/i },
  { name: "Amazonbot", family: "Amazon", pattern: /amazonbot/i },
  { name: "Amazonbot", family: "Amazon", pattern: /amznbot/i },
  { name: "Amzn-SearchBot", family: "Amazon", pattern: /amzn-searchbot/i },
  { name: "Amzn-User", family: "Amazon", pattern: /amzn-user/i },
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

function resolveAgentIntentProfile(detail: string, group: string): AgentIntentProfile {
  if (detail.includes("chatgpt-user")) {
    return {
      purpose:
        "пришел по действию пользователя ChatGPT: открыть страницу, проверить факт или подготовить ответ со ссылкой",
      action:
        "Дайте в начале страницы короткий проверяемый ответ, факты, даты, цифры и фрагмент, который можно процитировать без контекста.",
      audience: "Маркетинг",
    };
  }

  if (detail.includes("claude-user") || detail.includes("claude-code")) {
    return {
      purpose:
        "пришел по действию пользователя Claude: разово прочитать страницу или файл, который пользователь явно попросил разобрать",
      action:
        "Сделайте основную мысль явной: заголовок, краткое резюме, факты, ограничения и понятные ссылки на первоисточники.",
      audience: "Контент",
    };
  }

  if (detail.includes("perplexity-user")) {
    return {
      purpose:
        "пришел по запросу пользователя Perplexity: извлечь свежую информацию и использовать страницу как источник в ответе",
      action:
        "Поставьте наверх точный ответ, дату обновления, ключевые цифры и формулировки, которые легко сопоставить с запросом пользователя.",
      audience: "Контент",
    };
  }

  if (detail.includes("copilot")) {
    return {
      purpose:
        "похож на пользовательский ассистентский fetch: нужна страница, из которой можно быстро собрать прикладной ответ",
      action:
        "Держите вывод, условия применимости, шаги и ссылки рядом с основным текстом, без скрытия смысла ниже первого экрана.",
      audience: "Маркетинг",
    };
  }

  if (detail.includes("gptbot")) {
    return {
      purpose:
        "сканирует страницы для улучшения и обучения моделей OpenAI; это не пользовательский запрос в реальном времени",
      action:
        "Если хотите быть понятными для AI-обучения, оставьте доступными канонические страницы с фактами, FAQ, кейсами и устойчивыми формулировками.",
      audience: "CMO",
    };
  }

  if (detail.includes("oai-searchbot")) {
    return {
      purpose:
        "сканирует сайт для поиска и показа ссылок в продуктах OpenAI, включая ответы ChatGPT с веб-поиском",
      action:
        "Проверьте title, description, H1, дату обновления, хлебные крошки, канонический URL и понятный первый абзац.",
      audience: "SEO",
    };
  }

  if (detail.includes("oai-adsbot")) {
    return {
      purpose:
        "проверяет страницы, связанные с рекламой OpenAI: доступность, релевантность и качество посадочной страницы",
      action:
        "Сверьте посадочные страницы с рекламным обещанием: оффер, условия, контакты, скорость загрузки и отсутствие закрытых блоков.",
      audience: "Performance",
    };
  }

  if (detail.includes("claude-searchbot")) {
    return {
      purpose:
        "сканирует страницы для поиска Claude: находит материалы, которые могут быть показаны или процитированы в ответах",
      action:
        "Усильте индексируемые страницы: ясный заголовок, краткий ответ, структурированные факты, даты и ссылки на связанные материалы.",
      audience: "SEO",
    };
  }

  if (detail.includes("claudebot")) {
    return {
      purpose:
        "автоматически читает публичные страницы для обучения и улучшения моделей Claude; это не прямой запрос пользователя",
      action:
        "Дайте модели чистый контент: экспертные объяснения, кейсы, термины, ограничения, сравнения и минимум шаблонного шума.",
      audience: "Контент",
    };
  }

  if (detail.includes("anthropic-ai")) {
    return {
      purpose:
        "похож на legacy-краулер Anthropic для чтения публичного контента; точную роль лучше подтверждать по актуальному UA и IP",
      action:
        "Если доступ разрешен, держите на странице проверяемые факты, авторство, дату обновления и ясные правила использования контента.",
      audience: "Маркетинг",
    };
  }

  if (detail.includes("perplexitybot")) {
    return {
      purpose:
        "обходит страницы для поискового индекса Perplexity, чтобы затем находить источники для ответов пользователей",
      action:
        "Сделайте страницу удобной для цитирования: конкретный ответ, дата, авторитетные факты, таблицы, FAQ и внутренние ссылки.",
      audience: "SEO",
    };
  }

  if (detail.includes("google-extended")) {
    return {
      purpose:
        "сигнал Google для управления использованием контента в Gemini и Vertex AI; это не обычный Google Search crawler",
      action:
        "Отдельно решите политику AI-использования: разрешать ли этот UA в robots.txt и какие разделы сайта должны быть доступны.",
      audience: "Юристы",
    };
  }

  if (detail.includes("google-cloudvertexbot") || detail.includes("vertexbot")) {
    return {
      purpose:
        "fetch из Google Vertex AI по инициативе клиента Vertex: сервису нужен конкретный URL как источник или контекст",
      action:
        "Проверьте, что важные URL доступны без сложной авторизации, содержат самодостаточный ответ и корректные метаданные.",
      audience: "Продукт",
    };
  }

  if (detail.includes("googleother")) {
    return {
      purpose:
        "универсальный краулер Google для внутренних продуктовых задач, не обязательно для классического поискового индекса",
      action:
        "Не считайте этот трафик обычным SEO-сигналом: проверьте доступность, robots.txt, статус-коды и технический шум.",
      audience: "SEO",
    };
  }

  if (detail.includes("googlebot")) {
    return {
      purpose:
        "классический поисковый crawler Google: обходит страницу для индексации и ранжирования в Google Search",
      action:
        "Держите страницу индексируемой: 200 OK, canonical, title/H1, основной контент в HTML, schema.org и понятные внутренние ссылки.",
      audience: "SEO",
    };
  }

  if (detail.includes("bingbot")) {
    return {
      purpose:
        "поисковый crawler Microsoft Bing: обходит страницы для индекса Bing и связанных поисковых сценариев",
      action:
        "Проверьте индексируемость для Bing: robots.txt, sitemap, canonical, статус-коды, заголовки и отсутствие дублей.",
      audience: "SEO",
    };
  }

  if (detail.includes("adidxbot")) {
    return {
      purpose:
        "crawler Microsoft Advertising: проверяет рекламные посадочные страницы и связанный с объявлениями контент",
      action:
        "Сверьте рекламу и лендинг: оффер, цена или условия, контактные данные, доступность страницы и отсутствие блокировок.",
      audience: "Performance",
    };
  }

  if (detail.includes("applebot-extended")) {
    return {
      purpose:
        "сигнал Apple для управления использованием контента при обучении и улучшении генеративных моделей Apple",
      action:
        "Определите AI-политику в robots.txt отдельно от поисковой видимости Applebot: что можно использовать, а что закрыть.",
      audience: "Юристы",
    };
  }

  if (detail.includes("applebot")) {
    return {
      purpose:
        "crawler Apple для функций поиска и ассистентов Apple, включая Siri, Spotlight и связанные поисковые поверхности",
      action:
        "Сделайте страницы самодостаточными: понятные заголовки, структурированные данные, canonical URL и краткий ответ в начале.",
      audience: "SEO",
    };
  }

  if (detail.includes("amazonbot") || detail.includes("amznbot")) {
    return {
      purpose:
        "crawler Amazon: получает публичный веб-контент для улучшения сервисов Amazon, включая Alexa и поисковые сценарии",
      action:
        "Проверьте, какие разделы должны быть доступны Amazonbot, и держите на них ясные факты, цены, условия и контакты.",
      audience: "Маркетинг",
    };
  }

  if (detail.includes("amzn-user")) {
    return {
      purpose:
        "fetch от имени пользователя Amazon-сервиса: конкретный URL нужен как источник или контекст для пользовательского сценария",
      action:
        "Держите ключевой ответ, условия, цену или характеристики на странице в явном виде, чтобы их можно было прочитать без переходов.",
      audience: "Продукт",
    };
  }

  if (detail.includes("amzn-searchbot")) {
    return {
      purpose:
        "поисковый crawler Amazon: собирает страницы для поисковых и discovery-сценариев Amazon",
      action:
        "Усилите коммерческие страницы: оффер, характеристики, FAQ, условия покупки, наличие и структурированные данные.",
      audience: "SEO",
    };
  }

  if (detail.includes("duckassistbot")) {
    return {
      purpose:
        "crawler DuckDuckGo для ассистентских и поисковых ответов; ищет страницы, пригодные для краткого ответа",
      action:
        "Дайте на странице короткий ответ, факты, источники, дату обновления и минимум рекламного шума вокруг основного текста.",
      audience: "Контент",
    };
  }

  if (detail.includes("ccbot")) {
    return {
      purpose:
        "краулер Common Crawl: архивирует публичный веб в открытый датасет, который затем используют поисковые и AI-команды",
      action:
        "Решите, нужен ли сайт в открытых датасетах; если да, сохраняйте доступными только канонические и качественные страницы.",
      audience: "Юристы",
    };
  }

  if (detail.includes("bytespider")) {
    return {
      purpose:
        "краулер ByteDance: собирает публичный веб-контент для продуктов ByteDance, включая поиск и AI-сценарии",
      action:
        "Проверьте правила robots.txt для ByteDance и доступность только тех разделов, где допустимо внешнее AI-использование.",
      audience: "Юристы",
    };
  }

  if (detail.includes("petalbot")) {
    return {
      purpose:
        "crawler Huawei Petal Search: обходит страницы для поискового индекса и связанных поисковых сервисов Huawei",
      action:
        "Проверьте sitemap, canonical, robots.txt и понятные метаданные для страниц, которые должны попадать в поиск Huawei.",
      audience: "SEO",
    };
  }

  if (detail.includes("yandex")) {
    return {
      purpose:
        "crawler Яндекса: обходит страницы для поиска, быстрых ответов и связанных поисковых сервисов",
      action:
        "Проверьте robots.txt, Clean-param, sitemap, canonical, title/H1 и релевантность первого экрана запросу.",
      audience: "SEO",
    };
  }

  if (
    detail.includes("bot") ||
    detail.includes("spider") ||
    detail.includes("crawler") ||
    group.includes("google") ||
    group.includes("microsoft") ||
    group.includes("apple") ||
    group.includes("amazon") ||
    group.includes("common crawl")
  ) {
    return {
      purpose:
        "автоматически сканирует страницу как внешний crawler; точное назначение зависит от владельца UA и правил robots.txt",
      action:
        "Сначала подтвердите UA по IP и официальной документации, затем настройте robots.txt, sitemap, canonical и качество контента.",
      audience: "SEO",
    };
  }

  if (group.includes("anthropic") || group.includes("openai") || group.includes("perplexity")) {
    return {
      purpose:
        "относится к AI-платформе: вероятно читает страницу для ответа, поиска или улучшения модели, но UA не распознан точно",
      action:
        "Проверьте конкретный user-agent и дайте странице самодостаточный ответ, факты, источники, FAQ и явную дату обновления.",
      audience: "Маркетинг",
    };
  }

  if (group.includes("meta")) {
    return {
      purpose:
        "проверяет, как материал выглядит при распространении в соцсетях и мессенджерах Meta",
      action:
        "Для PR и контента проверьте Open Graph: заголовок, описание, изображение, цитату, цифры и корректный canonical.",
      audience: "PR",
    };
  }

  return {
    purpose:
      "читает страницу как внешний user-agent, но по имени нельзя достоверно определить владельца и назначение",
    action:
      "Не делайте вывод только по строке UA: проверьте IP/rDNS, частоту запросов, path, robots.txt и поведение в логах.",
    audience: "Аналитика",
  };
}

export function getAgentIntentProfile(agentGroup: string, agentDetail: string): AgentIntentProfile {
  const detail = agentDetail.toLowerCase();
  const group = agentGroup.toLowerCase();

  return resolveAgentIntentProfile(detail, group);
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
  const solution = solutionSections.find((item) => startsWithSegment(path, item.path));

  if (solution) {
    return { section: solution.section, pageType: "industry" };
  }

  if (startsWithSegment(path, "/news")) {
    return { section: "Новости", pageType: "news" };
  }

  if (startsWithSegment(path, "/press-center")) {
    return { section: "Пресс-центр", pageType: "press" };
  }

  if (startsWithSegment(path, "/blog")) {
    return { section: "Блог и кейсы", pageType: "blog" };
  }

  if (productPaths.some((productPath) => startsWithSegment(path, productPath))) {
    return { section: "Продукты", pageType: "product" };
  }

  if (companyPaths.some((companyPath) => startsWithSegment(path, companyPath))) {
    return { section: "Компания", pageType: "company" };
  }

  if (
    path.startsWith("/uploads") ||
    path.startsWith("/assets") ||
    path.startsWith("/files") ||
    /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|jpg|jpeg|png|webp|gif|svg|ico)$/i.test(path)
  ) {
    return { section: "Файлы и ассеты", pageType: "file" };
  }

  if (path === "/" || servicePaths.some((servicePath) => startsWithSegment(path, servicePath))) {
    return { section: "Служебные страницы", pageType: "service" };
  }

  if (technicalNeedles.some((needle) => path.includes(needle))) {
    return { section: "Технический шум", pageType: "technical" };
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
