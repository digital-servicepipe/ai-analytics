export type BotReferenceItem = {
  agent: string;
  family: string;
  category: string;
  intent: string;
  logMeaning: string;
  action: string;
  robots: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceType: "official" | "open";
};

const openAiSource = "https://platform.openai.com/docs/bots";
const anthropicSource =
  "https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler";
const googleSource =
  "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers";
const microsoftSource =
  "https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0";
const appleSource = "https://support.apple.com/en-us/119829";
const amazonSource = "https://developer.amazon.com/support/amazonbot";
const commonCrawlSource = "https://commoncrawl.org/ccbot";
const robotsSource = "https://www.rfc-editor.org/rfc/rfc9309";
const perplexitySource = "https://docs.perplexity.ai/guides/bots";

export const BOT_REFERENCE_ITEMS: BotReferenceItem[] = [
  {
    agent: "ChatGPT-User",
    family: "OpenAI",
    category: "User fetch",
    intent:
      "Разовый запрос от имени пользователя ChatGPT: открыть URL, проверить факт, прочитать источник для ответа.",
    logMeaning:
      "Это ближе к человеческому интересу, чем к фоновому сканированию. В логах такой UA часто означает, что пользователь уже спросил ChatGPT о теме или ссылке.",
    action:
      "Дайте сверху проверяемый ответ, дату, цифры, FAQ, цитируемый фрагмент и понятный canonical.",
    robots: "Обычно учитывается отдельно от обучающих краулеров; блокируйте осознанно, чтобы не потерять цитируемость в ответах.",
    sourceLabel: "OpenAI Bots",
    sourceUrl: openAiSource,
    sourceType: "official",
  },
  {
    agent: "GPTBot",
    family: "OpenAI",
    category: "AI training crawler",
    intent:
      "Автоматический crawler для улучшения и обучения моделей OpenAI, не пользовательский запрос в реальном времени.",
    logMeaning:
      "Показывает, какие публичные страницы потенциально попадают в контур обучения или улучшения моделей.",
    action:
      "Оставляйте доступными только канонические, качественные и юридически допустимые разделы с устойчивыми фактами.",
    robots: "Управляется отдельной директивой User-agent: GPTBot.",
    sourceLabel: "OpenAI Bots",
    sourceUrl: openAiSource,
    sourceType: "official",
  },
  {
    agent: "OAI-SearchBot",
    family: "OpenAI",
    category: "Search crawler",
    intent:
      "Сканирует страницы для поиска и показа ссылок в продуктах OpenAI, включая ответы ChatGPT с веб-поиском.",
    logMeaning:
      "Это сигнал AI-поисковой видимости: страницу могут находить и показывать как источник в ответе.",
    action:
      "Проверьте title, description, H1, дату обновления, первый абзац, статус 200 и внутренние ссылки.",
    robots: "Управляется отдельной директивой User-agent: OAI-SearchBot.",
    sourceLabel: "OpenAI Bots",
    sourceUrl: openAiSource,
    sourceType: "official",
  },
  {
    agent: "OAI-AdsBot",
    family: "OpenAI",
    category: "Ads crawler",
    intent:
      "Проверяет рекламные посадочные страницы: доступность, релевантность и качество страницы для рекламного сценария.",
    logMeaning:
      "Запрос связан не с SEO, а с проверкой лендинга и рекламного обещания.",
    action:
      "Сверьте оффер, условия, контакты, скорость загрузки, отсутствие закрытых блоков и совпадение с объявлением.",
    robots: "Если блокировать, можно сломать проверку рекламных посадочных страниц.",
    sourceLabel: "OpenAI Bots",
    sourceUrl: openAiSource,
    sourceType: "official",
  },
  {
    agent: "Operator",
    family: "OpenAI",
    category: "Agent action",
    intent:
      "Запрос от агентского сценария OpenAI: пользовательская задача может требовать открыть страницу и выполнить действие.",
    logMeaning:
      "Это ближе к интерактивному ассистенту, чем к обычному краулеру. Точный смысл зависит от path и поведения в сессии.",
    action:
      "Проверьте, что ключевые страницы понятны без ручных подсказок: CTA, условия, ошибки форм и next step.",
    robots: "Оценивайте отдельно от GPTBot и SearchBot: это пользовательский агентский сценарий.",
    sourceLabel: "OpenAI Bots",
    sourceUrl: openAiSource,
    sourceType: "official",
  },
  {
    agent: "ClaudeBot",
    family: "Anthropic",
    category: "AI training crawler",
    intent:
      "Автоматически читает публичные страницы для обучения и улучшения моделей Claude.",
    logMeaning:
      "Это не прямой пользовательский запрос; это фоновое чтение публичного контента.",
    action:
      "Оставляйте доступными экспертные страницы, кейсы, определения, ограничения и проверяемые факты.",
    robots: "Управляется директивой User-agent: ClaudeBot.",
    sourceLabel: "Anthropic crawler support",
    sourceUrl: anthropicSource,
    sourceType: "official",
  },
  {
    agent: "Claude-SearchBot",
    family: "Anthropic",
    category: "Search crawler",
    intent:
      "Сканирует страницы для поиска Claude: находит материалы, которые могут быть показаны или процитированы в ответах.",
    logMeaning:
      "Сигнал видимости в AI-поиске Claude, а не только общего crawling.",
    action:
      "Усилите заголовок, краткий ответ, даты, факты, источники и связанные внутренние страницы.",
    robots: "Управляется отдельной директивой User-agent: Claude-SearchBot.",
    sourceLabel: "Anthropic crawler support",
    sourceUrl: anthropicSource,
    sourceType: "official",
  },
  {
    agent: "Claude-User",
    family: "Anthropic",
    category: "User fetch",
    intent:
      "Разовый fetch по действию пользователя Claude: открыть страницу или файл, который пользователь явно попросил разобрать.",
    logMeaning:
      "Чаще отражает конкретный интерес пользователя к URL, а не фоновое сканирование сайта.",
    action:
      "Дайте самодостаточное резюме, факты, ограничения, авторство и ссылки на первоисточники.",
    robots: "Блокировка снижает способность Claude читать URL по запросу пользователя.",
    sourceLabel: "Anthropic crawler support",
    sourceUrl: anthropicSource,
    sourceType: "official",
  },
  {
    agent: "anthropic-ai",
    family: "Anthropic",
    category: "Legacy crawler",
    intent:
      "Legacy-имя Anthropic для чтения публичного контента; роль лучше подтверждать по актуальной документации и IP.",
    logMeaning:
      "Считать его точным сигналом намерения нельзя без проверки IP/rDNS и свежей документации.",
    action:
      "Проверьте правила robots.txt, IP, частоту и разделы сайта; для доступа оставляйте только качественный контент.",
    robots: "Управляйте отдельно, если этот UA явно указан в вашей политике.",
    sourceLabel: "Anthropic crawler support",
    sourceUrl: anthropicSource,
    sourceType: "official",
  },
  {
    agent: "PerplexityBot",
    family: "Perplexity",
    category: "Search crawler",
    intent:
      "Обходит страницы для поискового индекса Perplexity, чтобы находить источники для ответов пользователей.",
    logMeaning:
      "Сигнал потенциальной видимости в ответах Perplexity и похожих AI-search сценариях.",
    action:
      "Сделайте страницу удобной для цитирования: ответ, дата, таблицы, FAQ, источники и внутренние ссылки.",
    robots: "Управляется отдельной директивой User-agent: PerplexityBot.",
    sourceLabel: "Perplexity bots",
    sourceUrl: perplexitySource,
    sourceType: "official",
  },
  {
    agent: "Perplexity-User",
    family: "Perplexity",
    category: "User fetch",
    intent:
      "Fetch по запросу пользователя Perplexity: извлечь свежую информацию и использовать страницу как источник.",
    logMeaning:
      "Показывает, что конкретный пользовательский запрос мог привести Perplexity на страницу.",
    action:
      "Поставьте наверх точный ответ, дату обновления, ключевые цифры и формулировки для цитирования.",
    robots: "Блокировка может снижать доступность страницы как источника в пользовательских ответах.",
    sourceLabel: "Perplexity bots",
    sourceUrl: perplexitySource,
    sourceType: "official",
  },
  {
    agent: "Googlebot",
    family: "Google",
    category: "Search crawler",
    intent:
      "Классический поисковый crawler Google для индексации и ранжирования в Google Search.",
    logMeaning:
      "Основной сигнал SEO-индексации Google.",
    action:
      "Проверьте 200 OK, canonical, title/H1, основной HTML-контент, schema.org и внутренние ссылки.",
    robots: "Управляется User-agent: Googlebot или общими правилами.",
    sourceLabel: "Google crawlers",
    sourceUrl: googleSource,
    sourceType: "official",
  },
  {
    agent: "Google-Extended",
    family: "Google",
    category: "AI policy token",
    intent:
      "Сигнал управления использованием контента в Gemini и Vertex AI; это не обычный Google Search crawler.",
    logMeaning:
      "Это про AI-использование контента, а не про классическую поисковую индексацию.",
    action:
      "Отдельно решите AI-политику: какие разделы разрешать для Gemini/Vertex AI, а какие закрывать.",
    robots: "Управляется User-agent: Google-Extended.",
    sourceLabel: "Google crawlers",
    sourceUrl: googleSource,
    sourceType: "official",
  },
  {
    agent: "Google-CloudVertexBot",
    family: "Google",
    category: "User/client fetch",
    intent:
      "Fetch из Google Vertex AI по инициативе клиента Vertex: конкретный URL нужен как источник или контекст.",
    logMeaning:
      "Скорее прикладной запрос по URL, чем фоновая индексация всего сайта.",
    action:
      "Проверьте доступность без сложной авторизации, самодостаточный ответ и корректные метаданные.",
    robots: "Управляется отдельной директивой User-agent: Google-CloudVertexBot.",
    sourceLabel: "Google crawlers",
    sourceUrl: googleSource,
    sourceType: "official",
  },
  {
    agent: "GoogleOther",
    family: "Google",
    category: "Product crawler",
    intent:
      "Универсальный crawler Google для внутренних продуктовых задач, не обязательно для классического поискового индекса.",
    logMeaning:
      "Не приравнивайте его автоматически к Googlebot и SEO-ранжированию.",
    action:
      "Проверьте статус-коды, robots.txt, технический шум, дубли и странные path.",
    robots: "Управляется User-agent: GoogleOther или общими правилами.",
    sourceLabel: "Google crawlers",
    sourceUrl: googleSource,
    sourceType: "official",
  },
  {
    agent: "VertexBot",
    family: "Google",
    category: "Vertex/AI crawler",
    intent:
      "Связан с Vertex AI и AI-сценариями Google; точное имя в логах лучше сверять с Google-CloudVertexBot.",
    logMeaning:
      "Если это сокращенное или нестандартное имя, нужен контроль IP/rDNS и полного user-agent.",
    action:
      "Сверьте полный UA, IP и path; не смешивайте с Googlebot без подтверждения.",
    robots: "Используйте явные правила для Google-CloudVertexBot, если требуется контроль Vertex AI.",
    sourceLabel: "Google crawlers",
    sourceUrl: googleSource,
    sourceType: "official",
  },
  {
    agent: "Bingbot",
    family: "Microsoft",
    category: "Search crawler",
    intent:
      "Поисковый crawler Microsoft Bing для индекса Bing и связанных поисковых сценариев.",
    logMeaning:
      "SEO-сигнал для Bing и поверхностей, которые используют индекс Microsoft.",
    action:
      "Проверьте sitemap, canonical, статус-коды, robots.txt, заголовки и отсутствие дублей.",
    robots: "Управляется User-agent: bingbot.",
    sourceLabel: "Bing crawlers",
    sourceUrl: microsoftSource,
    sourceType: "official",
  },
  {
    agent: "AdIdxBot",
    family: "Microsoft",
    category: "Ads crawler",
    intent:
      "Crawler Microsoft Advertising для проверки рекламных посадочных страниц и связанного контента.",
    logMeaning:
      "Это не органический SEO-краулер; запрос связан с рекламным качеством и доступностью лендинга.",
    action:
      "Проверьте соответствие объявления и страницы: оффер, цена, условия, контакты и доступность.",
    robots: "Блокировка может повлиять на рекламную проверку Microsoft Advertising.",
    sourceLabel: "Bing crawlers",
    sourceUrl: microsoftSource,
    sourceType: "official",
  },
  {
    agent: "Copilot",
    family: "Microsoft",
    category: "Assistant fetch",
    intent:
      "Ассистентский сценарий Microsoft Copilot: странице нужна прикладная выжимка для ответа пользователю.",
    logMeaning:
      "Точный смысл зависит от полного UA, path и источника трафика; проверяйте IP и сессию.",
    action:
      "Держите вывод, условия применимости, шаги и ссылки рядом с основным текстом.",
    robots: "Не смешивайте с Bingbot: это другой тип поведения.",
    sourceLabel: "Bing crawlers",
    sourceUrl: microsoftSource,
    sourceType: "official",
  },
  {
    agent: "Applebot",
    family: "Apple",
    category: "Search/assistant crawler",
    intent:
      "Crawler Apple для функций поиска и ассистентов Apple, включая Siri, Spotlight и связанные поверхности.",
    logMeaning:
      "Сигнал видимости в экосистеме Apple, не только в обычном веб-поиске.",
    action:
      "Проверьте заголовки, структурированные данные, canonical URL, краткий ответ и доступность страницы.",
    robots: "Управляется User-agent: Applebot.",
    sourceLabel: "Applebot",
    sourceUrl: appleSource,
    sourceType: "official",
  },
  {
    agent: "Applebot-Extended",
    family: "Apple",
    category: "AI policy token",
    intent:
      "Сигнал управления использованием контента при обучении и улучшении генеративных моделей Apple.",
    logMeaning:
      "Это про AI-использование контента, а не про обычную поисковую видимость Applebot.",
    action:
      "Определите, какие разделы можно использовать для AI, а какие нужно закрыть отдельно.",
    robots: "Управляется User-agent: Applebot-Extended.",
    sourceLabel: "Applebot",
    sourceUrl: appleSource,
    sourceType: "official",
  },
  {
    agent: "Amazonbot / amznbot",
    family: "Amazon",
    category: "Product crawler",
    intent:
      "Crawler Amazon получает публичный веб-контент для улучшения сервисов Amazon, включая Alexa и поисковые сценарии.",
    logMeaning:
      "Сигнал интереса сервисов Amazon к публичной странице; точный сценарий зависит от полного UA.",
    action:
      "Проверьте доступность важных коммерческих страниц, условия, цены, контакты и факты.",
    robots: "Управляется User-agent: Amazonbot или amznbot, если указано в политике.",
    sourceLabel: "Amazonbot",
    sourceUrl: amazonSource,
    sourceType: "official",
  },
  {
    agent: "Amzn-SearchBot",
    family: "Amazon",
    category: "Search crawler",
    intent:
      "Поисковый crawler Amazon собирает страницы для поисковых и discovery-сценариев Amazon.",
    logMeaning:
      "Ближе к поисковой видимости внутри продуктов Amazon, чем к обучающему AI-crawl.",
    action:
      "Усилите коммерческие страницы: оффер, характеристики, FAQ, условия покупки и структурированные данные.",
    robots: "Управляется отдельной директивой User-agent: Amzn-SearchBot.",
    sourceLabel: "Amazonbot",
    sourceUrl: amazonSource,
    sourceType: "official",
  },
  {
    agent: "Amzn-User",
    family: "Amazon",
    category: "User fetch",
    intent:
      "Fetch от имени пользователя Amazon-сервиса: конкретный URL нужен как источник или контекст.",
    logMeaning:
      "Чаще означает прикладной запрос к URL, а не сканирование всего сайта.",
    action:
      "Держите ключевой ответ, условия, цену или характеристики на странице в явном виде.",
    robots: "Блокируйте отдельно от Amazonbot, если не хотите закрывать весь Amazon crawl.",
    sourceLabel: "Amazonbot",
    sourceUrl: amazonSource,
    sourceType: "official",
  },
  {
    agent: "DuckAssistBot",
    family: "DuckDuckGo",
    category: "AI/search answer crawler",
    intent:
      "Crawler для ассистентских и поисковых ответов DuckDuckGo; ищет страницы, пригодные для краткого ответа.",
    logMeaning:
      "Сигнал потенциального попадания в answer/search сценарии, но точную роль надо проверять по полному UA.",
    action:
      "Дайте короткий ответ, факты, источники, дату обновления и минимум рекламного шума вокруг основного текста.",
    robots: "Если официальная политика недоступна, применяйте осторожное правило по полному UA и IP.",
    sourceLabel: "Robots Exclusion Protocol",
    sourceUrl: robotsSource,
    sourceType: "open",
  },
  {
    agent: "CCBot",
    family: "Common Crawl",
    category: "Open dataset crawler",
    intent:
      "Архивирует публичный веб в открытый датасет Common Crawl, который используют поисковые, исследовательские и AI-команды.",
    logMeaning:
      "Попадание страницы в открытые датасеты, а не прямой пользовательский спрос.",
    action:
      "Решите, нужен ли сайт в открытых датасетах; оставляйте доступными только канонические качественные страницы.",
    robots: "Управляется User-agent: CCBot.",
    sourceLabel: "Common Crawl CCBot",
    sourceUrl: commonCrawlSource,
    sourceType: "official",
  },
  {
    agent: "Bytespider",
    family: "ByteDance",
    category: "AI/search crawler",
    intent:
      "Краулер ByteDance для публичного веб-контента, который может использоваться в поисковых и AI-сценариях.",
    logMeaning:
      "Назначение нужно подтверждать по полному UA, IP и актуальной политике владельца.",
    action:
      "Проверьте robots.txt, юридическую допустимость AI-использования и доступность только разрешенных разделов.",
    robots: "При отсутствии надежной официальной страницы используйте явное правило User-agent и проверку IP.",
    sourceLabel: "Robots Exclusion Protocol",
    sourceUrl: robotsSource,
    sourceType: "open",
  },
  {
    agent: "PetalBot",
    family: "Huawei",
    category: "Search crawler",
    intent:
      "Crawler Huawei Petal Search для поискового индекса и связанных поисковых сервисов Huawei.",
    logMeaning:
      "Сигнал видимости в поисковых продуктах Huawei, если UA и IP подтверждены.",
    action:
      "Проверьте sitemap, canonical, robots.txt и метаданные страниц, которые должны попадать в Petal Search.",
    robots: "Управляйте через явное правило User-agent: PetalBot.",
    sourceLabel: "Robots Exclusion Protocol",
    sourceUrl: robotsSource,
    sourceType: "open",
  },
  {
    agent: "YandexBot",
    family: "Yandex",
    category: "Search crawler",
    intent:
      "Crawler Яндекса для поиска, быстрых ответов и связанных поисковых сервисов.",
    logMeaning:
      "SEO-сигнал для индекса Яндекса и его поисковых поверхностей.",
    action:
      "Проверьте robots.txt, Clean-param, sitemap, canonical, title/H1 и релевантность первого экрана.",
    robots: "Управляется User-agent: Yandex или YandexBot.",
    sourceLabel: "Robots Exclusion Protocol",
    sourceUrl: robotsSource,
    sourceType: "open",
  },
  {
    agent: "facebookexternalhit / Meta",
    family: "Meta",
    category: "Link preview crawler",
    intent:
      "Проверяет, как ссылка выглядит при распространении в соцсетях и мессенджерах Meta.",
    logMeaning:
      "Обычно связан с превью ссылки: Open Graph, картинка, title и description.",
    action:
      "Проверьте og:title, og:description, og:image, canonical и доступность изображения для crawler.",
    robots: "Блокировка может сломать превью ссылок в соцсетях.",
    sourceLabel: "Robots Exclusion Protocol",
    sourceUrl: robotsSource,
    sourceType: "open",
  },
  {
    agent: "Cloudflare / AlwaysOnline",
    family: "Cloudflare",
    category: "Infrastructure bot",
    intent:
      "Инфраструктурный бот Cloudflare: проверка, кэширование, Always Online или служебные сценарии сети.",
    logMeaning:
      "Это не маркетинговый или поисковый спрос; смотрите статус-коды, частоту и технические path.",
    action:
      "Отдельно анализируйте от AI-ботов: проверьте настройки CDN, кэша, firewall и origin-ответы.",
    robots: "Не используйте robots.txt как главный контроль для инфраструктурного трафика.",
    sourceLabel: "Robots Exclusion Protocol",
    sourceUrl: robotsSource,
    sourceType: "open",
  },
];
