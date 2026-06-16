import { Lightbulb } from "lucide-react";

type InsightsCardProps = {
  insights: string[];
};

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <article className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-aqua" aria-hidden="true" />
        <h2 className="text-sm font-extrabold text-ink">Коротко</h2>
      </div>
      <ul className="space-y-2 text-sm leading-6 text-ink">
        {insights.map((insight) => (
          <li key={insight} className="break-words rounded-2xl bg-surface px-3 py-3">
            {insight}
          </li>
        ))}
      </ul>
    </article>
  );
}
