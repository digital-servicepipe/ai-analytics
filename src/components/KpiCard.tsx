import type { Kpi } from "../types";

type KpiCardProps = {
  kpi: Kpi;
};

export function KpiCard({ kpi }: KpiCardProps) {
  return (
    <article className="panel min-h-[126px] overflow-hidden p-4">
      <p className="break-words text-xs font-bold uppercase tracking-normal text-muted">
        {kpi.label}
      </p>
      <p className="mt-3 text-[28px] font-extrabold leading-none tracking-normal text-ink">
        {kpi.value}
      </p>
      <p className="mt-2 break-words text-xs leading-5 text-muted">{kpi.hint}</p>
    </article>
  );
}
