import { RotateCcw, Search } from "lucide-react";
import type { Filters } from "../types";
import { DateRangePicker } from "./DateRangePicker";

type Options = {
  botTypes: string[];
  sections: string[];
  countries: string[];
  minDate: string;
  maxDate: string;
};

type FiltersBarProps = {
  filters: Filters;
  options: Options;
  onChange: (filters: Filters) => void;
  onReset: () => void;
  onQuickFilter: (key: "all" | "chatgpt" | "product" | "blog" | "noTechnical") => void;
};

function MultiSelect({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const selectedSet = new Set(selected);

  const toggle = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  };

  return (
    <details className="group relative">
      <summary className="flex min-w-[160px] cursor-pointer list-none items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
        <span>{label}</span>
        <span className="ml-3 rounded-md bg-surface px-2 py-0.5 text-xs text-muted">
          {selected.length || "все"}
        </span>
      </summary>
      <div className="absolute z-20 mt-2 max-h-72 w-72 overflow-auto rounded-xl border border-line bg-white p-2 shadow-card">
        {values.map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface"
          >
            <input
              className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
              type="checkbox"
              checked={selectedSet.has(value)}
              onChange={() => toggle(value)}
            />
            <span className="truncate" title={value}>
              {value}
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}

export function FiltersBar({
  filters,
  options,
  onChange,
  onReset,
  onQuickFilter,
}: FiltersBarProps) {
  return (
    <section className="rounded-2xl border border-line bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          minDate={options.minDate}
          maxDate={options.maxDate}
          onChange={(range) => onChange({ ...filters, ...range })}
        />

        <MultiSelect
          label="ИИ-агенты"
          values={options.botTypes}
          selected={filters.botTypes}
          onChange={(botTypes) => onChange({ ...filters, botTypes })}
        />
        <MultiSelect
          label="Разделы"
          values={options.sections}
          selected={filters.sections}
          onChange={(sections) => onChange({ ...filters, sections })}
        />
        <MultiSelect
          label="Страны"
          values={options.countries}
          selected={filters.countries}
          onChange={(countries) => onChange({ ...filters, countries })}
        />

        <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-muted" aria-hidden="true" />
          <input
            className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
            placeholder="Поиск по URL/path"
            value={filters.pathQuery}
            onChange={(event) =>
              onChange({ ...filters, pathQuery: event.target.value })
            }
          />
        </label>

        <button
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-surface"
          type="button"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Сбросить фильтры
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ["all", "Все"],
          ["chatgpt", "Только ChatGPT-User"],
          ["product", "Только продуктовые"],
          ["blog", "Только блог/кейсы"],
          ["noTechnical", "Исключить technical/noise"],
        ].map(([key, label]) => (
          <button
            key={key}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-accent hover:text-accent"
            type="button"
            onClick={() => onQuickFilter(key as Parameters<FiltersBarProps["onQuickFilter"]>[0])}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
