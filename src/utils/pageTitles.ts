import generatedTitles from "../data/pageTitles.generated.json";

type TitleMeta = {
  title: string;
  source: string;
  kind: string;
};

const mainPageTitles = {
  "/": {
    title: "Servicepipe - разработчик систем высокоточной защиты от DDoS-атак и ботов",
    source: "manual-main-urls",
    kind: "main",
  },
  "/dosgate": {
    title: "DosGate - система защиты IT-инфраструктуры от DDoS-атак и сетевых угроз",
    source: "manual-main-urls",
    kind: "product",
  },
  "/dosgate/autopilot": {
    title: "DosGate Autopilot | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/dosgate/rlog": {
    title: "DosGate RLOG | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/flowcollector": {
    title: "FlowCollector - система анализа сетевого трафика | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/ip-transit": {
    title: "Защита сети от DDoS-атак на L3-L4 - IP-транзит | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/secure-dns-hosting": {
    title: "Защита DNS-хостинга от DDoS-атак и аномальных нагрузок | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/cybert": {
    title: "Cybert - защита от DDoS-атак и ботов без раскрытия SSL | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/web-ddos-protection": {
    title: "Защита сайтов, приложений и API от DDoS-атак | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/antibot": {
    title: "Антибот - защита сайтов, мобильных приложений и API | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/waf": {
    title: "WAF от ведущих российских вендоров | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/visibla": {
    title: "Visibla - защита от фрода в маркетинге | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/visibla/scan": {
    title: "Visibla Scan - достоверная веб-аналитика | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/visibla/verify": {
    title: "Visibla Verify - верификатор трафика | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/stress-test": {
    title: "Стресс-тестирование на устойчивость к DDoS | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/web-log-analysis": {
    title: "Анализ логов веб-сервера | Servicepipe",
    source: "manual-main-urls",
    kind: "product",
  },
  "/finance": {
    title: "Защита банков и финансовых компаний от DDoS и ботов",
    source: "manual-main-urls",
    kind: "industry",
  },
  "/telecom": {
    title: "Комплексная защита телекома от DDoS-атак | Решения Servicepipe",
    source: "manual-main-urls",
    kind: "industry",
  },
  "/retail": {
    title: "Защита интернет-магазина от DDoS-атак и ботов",
    source: "manual-main-urls",
    kind: "industry",
  },
  "/marketing": {
    title: "Защита сайта от накрутки поведенческих факторов | Servicepipe",
    source: "manual-main-urls",
    kind: "industry",
  },
  "/about": {
    title: "О компании Servicepipe",
    source: "manual-main-urls",
    kind: "company",
  },
  "/career": {
    title: "Карьера в Servicepipe",
    source: "manual-main-urls",
    kind: "company",
  },
  "/it-career-start": {
    title: "Начало карьеры в IT | Servicepipe",
    source: "manual-main-urls",
    kind: "company",
  },
  "/cybersecurity-lab": {
    title: "Исследовательская лаборатория | Servicepipe",
    source: "manual-main-urls",
    kind: "company",
  },
  "/contacts": {
    title: "Контакты Servicepipe",
    source: "manual-main-urls",
    kind: "company",
  },
  "/why-servicepipe": {
    title: "Преимущества и отзывы Servicepipe",
    source: "manual-main-urls",
    kind: "company",
  },
  "/partners": {
    title: "Партнерские программы Servicepipe",
    source: "manual-main-urls",
    kind: "company",
  },
  "/news": {
    title: "Новости компании | Servicepipe",
    source: "manual-main-urls",
    kind: "news",
  },
  "/press-center": {
    title: "СМИ о нас | Servicepipe",
    source: "manual-main-urls",
    kind: "press",
  },
  "/blog": {
    title: "Блог о решениях Servicepipe",
    source: "manual-main-urls",
    kind: "blog",
  },
  "/partners/wmx": {
    title: "WMX - авторизованный поставщик WAF | Партнеры Servicepipe",
    source: "manual-main-urls",
    kind: "partner",
  },
} satisfies Record<string, TitleMeta>;

const pageTitles: Record<string, TitleMeta> = {
  ...(generatedTitles as Record<string, TitleMeta>),
  ...mainPageTitles,
};

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
