import { ChevronDown, ExternalLink, Info } from "lucide-react";
import { useMemo } from "react";
import { BOT_REFERENCE_ITEMS, type BotReferenceItem } from "../data/botReference";
import type { NormalizedLogRow } from "../types";
import { formatInteger, formatPercent } from "../utils/format";
import { getAgentDetailLabel } from "../utils/normalize";

type BotReferencePanelProps = {
  rows: NormalizedLogRow[];
};

type CountedBotReferenceItem = BotReferenceItem & {
  count: number;
  share: number;
};

type BotRoleGroup = {
  key: string;
  title: string;
  hint: string;
  categories: string[];
};

const botRoleGroups: BotRoleGroup[] = [
  {
    key: "user-triggered",
    title: "Пользовательские fetchers и агенты",
    hint: "Запросы по явному действию пользователя или агентскому сценарию.",
    categories: ["User fetch", "User/client fetch", "Assistant fetch", "Agent action", "Link preview crawler"],
  },
  {
    key: "search",
    title: "Поисковые и ответные краулеры",
    hint: "Обход для индекса, поиска, ответов и цитирования источников.",
    categories: ["Search crawler", "Search/assistant crawler", "AI/search crawler", "AI/search answer crawler"],
  },
  {
    key: "training",
    title: "Краулеры для обучения AI",
    hint: "Фоновое чтение публичного контента для обучения или улучшения моделей.",
    categories: ["AI training crawler", "Legacy crawler"],
  },
  {
    key: "product",
    title: "Продуктовые и служебные краулеры",
    hint: "Рекламные, продуктовые, инфраструктурные и policy-агенты.",
    categories: ["Ads crawler", "Product crawler", "Vertex/AI crawler", "AI policy token", "Infrastructure bot"],
  },
  {
    key: "dataset",
    title: "Открытые датасеты",
    hint: "Краулеры, собирающие публичные веб-датасеты.",
    categories: ["Open dataset crawler"],
  },
];

const categoryLabels: Record<string, string> = {
  "AI policy token": "AI policy",
  "AI training crawler": "training crawler",
  "AI/search answer crawler": "answer crawler",
  "AI/search crawler": "AI search crawler",
  "Ads crawler": "ads crawler",
  "Agent action": "agent action",
  "Assistant fetch": "assistant fetch",
  "Infrastructure bot": "infrastructure bot",
  "Legacy crawler": "legacy crawler",
  "Link preview crawler": "link preview",
  "Open dataset crawler": "dataset crawler",
  "Product crawler": "product crawler",
  "Search crawler": "search crawler",
  "Search/assistant crawler": "search crawler",
  "User fetch": "user-triggered fetch",
  "User/client fetch": "user-triggered fetch",
  "Vertex/AI crawler": "Vertex AI crawler",
};

function sourceBadge(type: "official" | "open") {
  return type === "official" ? "официально" : "открытый источник";
}

function agentAliases(item: BotReferenceItem) {
  return item.agent
    .split("/")
    .map((alias) => alias.trim().toLowerCase())
    .filter(Boolean);
}

function countForAgent(item: BotReferenceItem, counts: Map<string, number>) {
  const aliases = agentAliases(item);
  let total = 0;

  counts.forEach((count, agent) => {
    if (aliases.some((alias) => agent === alias || agent.includes(alias))) {
      total += count;
    }
  });

  return total;
}

function groupItems(items: CountedBotReferenceItem[]) {
  const used = new Set<string>();
  const groups = botRoleGroups.map((group) => {
    const categorySet = new Set(group.categories);
    const groupItems = items.filter((item) => categorySet.has(item.category));
    groupItems.forEach((item) => used.add(item.agent));

    return {
      ...group,
      items: groupItems,
      count: groupItems.reduce((sum, item) => sum + item.count, 0),
    };
  });

  const otherItems = items.filter((item) => !used.has(item.agent));
  if (otherItems.length) {
    groups.push({
      key: "other",
      title: "Прочие агенты",
      hint: "Редкие или нестандартные user-agent, которые лучше проверять по IP/rDNS и источнику.",
      categories: [],
      items: otherItems,
      count: otherItems.reduce((sum, item) => sum + item.count, 0),
    });
  }

  return groups.filter((group) => group.items.length);
}

export function BotReferencePanel({ rows }: BotReferencePanelProps) {
  const total = rows.length || 1;
  const items = useMemo(() => {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      const agent = getAgentDetailLabel(row.botType, row.httpUserAgent).toLowerCase();
      counts.set(agent, (counts.get(agent) ?? 0) + 1);
    });

    return BOT_REFERENCE_ITEMS.map((item) => {
      const count = countForAgent(item, counts);
      return { ...item, count, share: count / total };
    }).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.family.localeCompare(right.family, "ru") || left.agent.localeCompare(right.agent, "ru");
    });
  }, [rows, total]);

  const activeCount = items.filter((item) => item.count > 0).length;
  const groupedItems = useMemo(() => groupItems(items), [items]);

  return (
    <article className="panel flex h-[640px] flex-col p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-aqua" aria-hidden="true" />
            <h2 className="text-sm font-extrabold text-ink">Намерения user-agent</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">
            Компактная справка по всем известным агентам: назначение, трактовка в логах и источник.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-extrabold text-aqua">{activeCount}/{items.length}</p>
          <p className="text-[11px] font-bold uppercase tracking-normal text-muted">в фильтре</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {groupedItems.map((group) => (
          <section key={group.key} className="rounded-2xl border border-line bg-surface p-2.5">
            <div className="mb-2 flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <h3 className="text-xs font-extrabold uppercase tracking-normal text-ink">
                  {group.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted">{group.hint}</p>
              </div>
              <span className="shrink-0 rounded-full bg-aqua/10 px-2 py-1 text-xs font-extrabold text-aqua">
                {formatInteger(group.count)}
              </span>
            </div>

            <div className="grid items-start gap-2 lg:grid-cols-2">
              {group.items.map((item) => (
                <details
                  key={`${item.family}:${item.agent}`}
                  className="group self-start rounded-2xl border border-line bg-panel px-3 py-2"
                >
                  <summary className="flex cursor-pointer list-none items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-extrabold leading-5 text-ink">{item.agent}</p>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-bold text-muted">
                          {categoryLabels[item.category] ?? item.category}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.intent}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={item.count > 0 ? "text-sm font-extrabold text-aqua" : "text-sm font-bold text-muted"}>
                        {formatInteger(item.count)}
                      </p>
                      <p className="text-[11px] font-bold text-muted">{formatPercent(item.share * 100)}</p>
                    </div>
                    <ChevronDown
                      className="mt-1 h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs leading-5">
                    <p className="text-ink">
                      <span className="font-extrabold">Логи: </span>
                      {item.logMeaning}
                    </p>
                    <p className="text-ink">
                      <span className="font-extrabold">Действие: </span>
                      {item.action}
                    </p>
                    <p className="text-muted">
                      <span className="font-extrabold text-ink">Robots: </span>
                      {item.robots}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-bold text-muted">
                        {item.family} · {sourceBadge(item.sourceType)}
                      </span>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-extrabold text-aqua hover:text-white"
                      >
                        {item.sourceLabel}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
