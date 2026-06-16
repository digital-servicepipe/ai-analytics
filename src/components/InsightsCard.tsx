import { Lightbulb } from "lucide-react";
import type { InsightItem } from "../types";

type InsightsCardProps = {
  insights: InsightItem[];
};

const toneStyles: Record<InsightItem["tone"], string> = {
  signal: "border-aqua/20 bg-aqua/5",
  opportunity: "border-[#60A5FA]/20 bg-[#60A5FA]/8",
  watch: "border-[#A78BFA]/20 bg-[#A78BFA]/8",
};

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <article className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-aqua" aria-hidden="true" />
        <h2 className="text-sm font-extrabold text-ink">Выводы для панели</h2>
      </div>
      <div className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className={`rounded-2xl border px-3 py-3 ${toneStyles[insight.tone]}`}
          >
            <h3 className="mb-2 text-sm font-extrabold text-ink">{insight.title}</h3>
            <p className="text-sm leading-6 text-ink">{insight.body}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{insight.action}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
