import type { Kpi } from "../types";

type KpiCardProps = {
  kpi: Kpi;
};

export function KpiCard({ kpi }: KpiCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-normal text-muted">
        {kpi.label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink">{kpi.value}</p>
      <p className="mt-1 text-xs text-muted">{kpi.hint}</p>
    </article>
  );
}
