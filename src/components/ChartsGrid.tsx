import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NormalizedLogRow } from "../types";
import {
  buildAgentGroupBars,
  buildDailySeries,
  buildDetailedAgentBars,
  buildPageTypeShare,
  buildTimeActivity,
  buildTopPages,
  type ActivityGranularity,
} from "../utils/aggregations";
import { formatInteger, truncateMiddle } from "../utils/format";

type ChartsGridProps = {
  rows: NormalizedLogRow[];
  onPathSelect: (path: string) => void;
};

const groupPalette = [
  "#2DD4BF",
  "#60A5FA",
  "#A78BFA",
  "#F59E0B",
  "#F472B6",
  "#94A3B8",
  "#34D399",
  "#FB7185",
];

const gridStroke = "rgba(255,255,255,0.08)";
const axisTick = { fontSize: 11, fill: "#8E918F" };

function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`panel min-h-[320px] p-4 ${className}`.trim()}>
      <div className="mb-4 flex min-h-11 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 break-words text-xs leading-5 text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="h-[260px]">{children}</div>
    </article>
  );
}

function TooltipCard({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ color?: string; name?: string; value?: number | string }>;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[180px] rounded-2xl border border-line bg-panel px-3 py-3 shadow-workspace">
      <div className="mb-2 text-xs font-bold uppercase text-muted">{label}</div>
      <div className="space-y-1.5">
        {payload
          .filter((item) => Number(item.value) > 0)
          .map((item) => (
            <div key={String(item.name)} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color || "#2DD4BF" }}
                />
                <span className="truncate text-sm text-ink">{item.name}</span>
              </div>
              <span className="shrink-0 text-sm font-extrabold text-ink">
                {formatInteger(Number(item.value))}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

export function ChartsGrid({ rows, onPathSelect }: ChartsGridProps) {
  const [activityGranularity, setActivityGranularity] =
    useState<ActivityGranularity>("hour");

  const daily = useMemo(() => buildDailySeries(rows), [rows]);
  const groupBars = useMemo(() => buildAgentGroupBars(rows).slice(0, 10), [rows]);
  const detailBars = useMemo(
    () =>
      buildDetailedAgentBars(rows)
        .slice(0, 10)
        .map((item) => ({ ...item, shortLabel: truncateMiddle(item.label, 22) })),
    [rows],
  );
  const topPaths = useMemo(
    () =>
      buildTopPages(rows, 8).map((item) => ({
        ...item,
        shortLabel: truncateMiddle(item.title, 28),
      })),
    [rows],
  );
  const pageTypes = useMemo(
    () =>
      buildPageTypeShare(rows)
        .sort((left, right) => right.value - left.value)
        .map((item) => ({
          ...item,
          shortName: truncateMiddle(item.name, 14),
        })),
    [rows],
  );
  const activity = useMemo(
    () => buildTimeActivity(rows, activityGranularity),
    [activityGranularity, rows],
  );
  const activityStep = Math.max(0, Math.ceil(activity.length / 7) - 1);

  return (
    <section className="grid gap-3 2xl:grid-cols-12">
      <div className="2xl:col-span-8">
        <ChartCard
          title="Запросы по дням"
          subtitle="Основные группы ботов по дням."
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily.data} margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
              <defs>
                {daily.bots.map((bot) => (
                  <linearGradient
                    key={`gradient:${bot}`}
                    id={`daily-${bot}`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={daily.colors[bot]} stopOpacity={0.34} />
                    <stop offset="95%" stopColor={daily.colors[bot]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: gridStroke }}
              />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipCard />} />
              {daily.bots.map((bot) => (
                <Area
                  key={bot}
                  dataKey={bot}
                  type="monotone"
                  stroke={daily.colors[bot]}
                  fill={`url(#daily-${bot})`}
                  strokeWidth={2.25}
                  isAnimationActive={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="2xl:col-span-4">
        <ChartCard title="Группы ботов" subtitle="Кто даёт основной поток.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={groupBars}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 0, left: 46 }}
            >
              <CartesianGrid stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tick={axisTick} axisLine={false} allowDecimals={false} />
              <YAxis
                dataKey="agentGroup"
                type="category"
                tick={axisTick}
                tickLine={false}
                width={94}
              />
              <Tooltip content={<TooltipCard />} />
              <Bar dataKey="count" radius={[0, 10, 10, 0]} isAnimationActive={false}>
                {groupBars.map((entry, index) => (
                  <Cell
                    key={`${entry.agentGroup}:${entry.count}`}
                    fill={groupPalette[index % groupPalette.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="2xl:col-span-6">
        <ChartCard
          title="Запросы по времени"
          subtitle={
            activityGranularity === "hour"
              ? "Срез по часам."
              : "Срез по часу и минуте."
          }
          action={
            <div className="inline-flex shrink-0 rounded-xl border border-line bg-surface p-1">
              {[
                ["hour", "Часы"],
                ["minute", "Часы:минуты"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    activityGranularity === value
                      ? "bg-panel text-ink ring-1 ring-inset ring-aqua/20"
                      : "text-muted hover:text-ink"
                  }`}
                  type="button"
                  onClick={() => setActivityGranularity(value as ActivityGranularity)}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity} margin={{ top: 8, right: 14, bottom: 0, left: -10 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                interval={activityStep}
                tick={{ ...axisTick, fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: gridStroke }}
              />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipCard />} />
              <Bar
                dataKey="count"
                fill="#2DD4BF"
                radius={[10, 10, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="2xl:col-span-6">
        <ChartCard title="Топ user-agent" subtitle="Какие имена встречаются чаще всего.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={detailBars}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 0, left: 72 }}
            >
              <CartesianGrid stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tick={axisTick} axisLine={false} allowDecimals={false} />
              <YAxis
                dataKey="shortLabel"
                type="category"
                tick={axisTick}
                tickLine={false}
                width={116}
              />
              <Tooltip content={<TooltipCard />} />
              <Bar
                dataKey="count"
                radius={[0, 10, 10, 0]}
                fill="#60A5FA"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="2xl:col-span-5">
        <ChartCard title="Типы path" subtitle="Какие типы path получают больше запросов.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pageTypes}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 0, left: 52 }}
            >
              <CartesianGrid stroke={gridStroke} horizontal={false} />
              <XAxis
                type="number"
                tick={axisTick}
                axisLine={{ stroke: gridStroke }}
                allowDecimals={false}
              />
              <YAxis
                dataKey="shortName"
                type="category"
                tick={axisTick}
                tickLine={false}
                width={64}
              />
              <Tooltip content={<TooltipCard />} />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} isAnimationActive={false}>
                {pageTypes.map((entry, index) => (
                  <Cell key={entry.name} fill={groupPalette[index % groupPalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="2xl:col-span-7">
        <ChartCard title="Топ path" subtitle="Клик по строке подставляет path в фильтр.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topPaths}
              layout="vertical"
              margin={{ top: 8, right: 20, bottom: 0, left: 140 }}
            >
              <CartesianGrid stroke={gridStroke} horizontal={false} />
              <XAxis
                type="number"
                tick={axisTick}
                axisLine={{ stroke: gridStroke }}
                allowDecimals={false}
              />
              <YAxis
                dataKey="shortLabel"
                type="category"
                tick={axisTick}
                tickLine={false}
                interval={0}
                width={140}
              />
              <Tooltip content={<TooltipCard />} />
              <Bar
                dataKey="count"
                fill="#A78BFA"
                radius={[0, 10, 10, 0]}
                cursor="pointer"
                isAnimationActive={false}
                onClick={(event) => {
                  const path = event?.payload?.path;
                  if (path) onPathSelect(path);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}
