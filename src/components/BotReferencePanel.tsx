import { ChevronDown, ExternalLink, Info } from "lucide-react";
import { useMemo } from "react";
import { BOT_REFERENCE_ITEMS, type BotReferenceItem } from "../data/botReference";
import type { NormalizedLogRow } from "../types";
import { formatInteger, formatPercent } from "../utils/format";
import { getAgentDetailLabel } from "../utils/normalize";

type BotReferencePanelProps = {
  rows: NormalizedLogRow[];
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

  return (
    <article className="panel h-full p-4">
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

      <div className="grid max-h-[620px] items-start gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
        {items.map((item) => (
          <details
            key={`${item.family}:${item.agent}`}
            className="group self-start rounded-2xl border border-white/10 bg-surface px-3 py-2"
          >
            <summary className="flex cursor-pointer list-none items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-sm font-extrabold leading-5 text-ink">{item.agent}</p>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-bold text-muted">
                    {item.category}
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
    </article>
  );
}
