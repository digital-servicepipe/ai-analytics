import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NormalizedLogRow } from "../types";
import {
  buildBotBars,
  buildDailySeries,
  buildHourlyActivity,
  buildPageTypeShare,
  buildTopPages,
} from "../utils/aggregations";
import { formatInteger, truncateMiddle } from "../utils/format";

type ChartsGridProps = {
  rows: NormalizedLogRow[];
  onPathSelect: (path: string) => void;
};

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="min-h-[260px] rounded-2xl border border-line bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      <div className="h-[215px]">{children}</div>
    </article>
  );
}

export function ChartsGrid({ rows, onPathSelect }: ChartsGridProps) {
  const daily = useMemo(() => buildDailySeries(rows), [rows]);
  const botBars = useMemo(() => buildBotBars(rows), [rows]);
  const topPages = useMemo(
    () =>
      buildTopPages(rows, 10).map((item) => ({
        ...item,
        shortPath: truncateMiddle(item.path, 26),
      })),
    [rows],
  );
  const pageTypes = useMemo(() => buildPageTypeShare(rows), [rows]);
  const hourly = useMemo(() => buildHourlyActivity(rows), [rows]);

  return (
    <section className="grid gap-3 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <ChartCard title="Динамика обращений по дням">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily.data} margin={{ top: 5, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(value, name) => [formatInteger(Number(value)), String(name)]}
                labelFormatter={(label) => `Дата: ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {daily.bots.map((bot) => (
                <Line
                  key={bot}
                  dataKey={bot}
                  dot={false}
                  stroke={daily.colors[bot]}
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="xl:col-span-5">
        <ChartCard title="Обращения по типам ИИ-агентов">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={botBars} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="botType" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [formatInteger(Number(value)), "Обращения"]}
                labelFormatter={(label) => `ИИ-агент: ${label}`}
              />
              <Bar dataKey="count" fill="#3157d8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="xl:col-span-5">
        <ChartCard title="Топ страниц">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topPages}
              layout="vertical"
              margin={{ top: 5, right: 18, bottom: 0, left: 82 }}
            >
              <CartesianGrid stroke="#eef2f7" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                dataKey="shortPath"
                type="category"
                tick={{ fontSize: 11 }}
                tickLine={false}
                width={82}
              />
              <Tooltip
                formatter={(value) => [formatInteger(Number(value)), "Обращения"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.path ?? ""}
              />
              <Bar
                dataKey="count"
                fill="#7157d9"
                radius={[0, 8, 8, 0]}
                cursor="pointer"
                onClick={(event) => {
                  const path = event?.payload?.path;
                  if (path) onPathSelect(path);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="xl:col-span-3">
        <ChartCard title="Типы страниц">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pageTypes}
                dataKey="value"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
              >
                {pageTypes.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [formatInteger(Number(value)), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="xl:col-span-4">
        <ChartCard title="Активность по часам">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [formatInteger(Number(value)), "Обращения"]}
                labelFormatter={(label) => `Час: ${label}:00`}
              />
              <Bar dataKey="count" fill="#0f9f8f" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}
