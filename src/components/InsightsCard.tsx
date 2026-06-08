import { Lightbulb } from "lucide-react";

type InsightsCardProps = {
  insights: string[];
};

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-violet" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink">Что видно по данным</h2>
      </div>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-5 text-slate-700 marker:text-violet">
        {insights.map((insight) => (
          <li key={insight}>{insight}</li>
        ))}
      </ul>
    </article>
  );
}
