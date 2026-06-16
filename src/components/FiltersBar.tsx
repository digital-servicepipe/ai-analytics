import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { Filters } from "../types";
import { DateRangePicker } from "./DateRangePicker";

type Options = {
  agentGroups: string[];
  agentDetails: string[];
  sections: string[];
  countries: string[];
  minDate: string;
  maxDate: string;
};

type QuickFilterKey =
  | "all"
  | "openai"
  | "anthropic"
  | "perplexity"
  | "google"
  | "product"
  | "noTechnical";

type FiltersBarProps = {
  filters: Filters;
  options: Options;
  onChange: (filters: Filters) => void;
  onReset: () => void;
  onQuickFilter: (key: QuickFilterKey) => void;
};

type MenuKey = "groups" | "details" | "sections" | "countries" | null;

type MultiSelectDropdownProps = {
  label: string;
  menuKey: Exclude<MenuKey, null>;
  openMenu: MenuKey;
  setOpenMenu: (menu: MenuKey) => void;
  values: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
  placeholder?: string;
};

function MultiSelectDropdown({
  label,
  menuKey,
  openMenu,
  setOpenMenu,
  values,
  selected,
  onChange,
  searchable = false,
  placeholder = "Найти",
}: MultiSelectDropdownProps) {
  const [query, setQuery] = useState("");
  const isOpen = openMenu === menuKey;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const visibleValues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return values;

    return values.filter((value) => value.toLowerCase().includes(normalizedQuery));
  }, [query, values]);

  const toggle = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }

    onChange([...selected, value]);
  };

  const summary =
    selected.length === 0
      ? "Все"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} выбрано`;

  return (
    <div className="relative min-w-0">
      <button
        className={`control grid min-h-[54px] w-full min-w-[180px] grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2 text-left ${
          isOpen ? "border-aqua shadow-card" : ""
        }`}
        type="button"
        onClick={() => setOpenMenu(isOpen ? null : menuKey)}
      >
        <span className="text-[11px] font-bold uppercase text-muted">{label}</span>
        <ChevronDown
          className={`row-span-2 h-4 w-4 text-muted transition ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        <span className="truncate text-sm font-extrabold text-ink">{summary}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-30 mt-2 w-[min(420px,calc(100vw-32px))] rounded-2xl border border-line bg-panel p-2 shadow-workspace">
          {searchable && (
            <label className="control mb-2 grid min-h-[44px] grid-cols-[auto_1fr] items-center gap-x-2 px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-muted" aria-hidden="true" />
              <input
                className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                placeholder={placeholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}

          <div className="max-h-80 overflow-auto pr-1">
            {visibleValues.length ? (
              visibleValues.map((value) => (
                <button
                  key={value}
                  className={`fk-analytics-option flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                    selectedSet.has(value) ? "bg-surface text-ink" : "text-muted"
                  }`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    toggle(value);
                  }}
                  title={value}
                >
                  <span
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
                      selectedSet.has(value)
                        ? "border-aqua bg-aqua"
                        : "border-line bg-surface"
                    }`}
                  />
                  <span className="min-w-0 break-words leading-5">{value}</span>
                </button>
              ))
            ) : (
              <div className="rounded-xl bg-surface px-3 py-3 text-sm text-muted">
                Ничего не найдено
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function FiltersBar({
  filters,
  options,
  onChange,
  onReset,
  onQuickFilter,
}: FiltersBarProps) {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <section ref={rootRef} className="panel p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-auto flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-aqua" aria-hidden="true" />
          <h2 className="text-sm font-extrabold text-ink">Фильтры</h2>
        </div>

        {[
          ["all", "Все"],
          ["openai", "OpenAI"],
          ["anthropic", "Anthropic"],
          ["perplexity", "Perplexity"],
          ["google", "Google"],
          ["product", "Коммерция"],
          ["noTechnical", "Без тех. шума"],
        ].map(([key, label]) => (
          <button
            key={key}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink transition hover:border-aqua hover:text-aqua"
            type="button"
            onClick={() => onQuickFilter(key as QuickFilterKey)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 xl:grid-cols-2 2xl:grid-cols-[minmax(220px,0.95fr)_minmax(180px,0.75fr)_minmax(220px,0.95fr)_minmax(180px,0.75fr)_minmax(180px,0.75fr)_minmax(260px,1.2fr)_auto]">
        <DateRangePicker
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          minDate={options.minDate}
          maxDate={options.maxDate}
          onChange={(range) => onChange({ ...filters, ...range })}
        />

        <MultiSelectDropdown
          label="Группы"
          menuKey="groups"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          values={options.agentGroups}
          selected={filters.agentGroups}
          onChange={(agentGroups) => onChange({ ...filters, agentGroups })}
        />

        <MultiSelectDropdown
          label="User-agent"
          menuKey="details"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          values={options.agentDetails}
          selected={filters.agentDetails}
          searchable
          placeholder="Найти user-agent"
          onChange={(agentDetails) => onChange({ ...filters, agentDetails })}
        />

        <MultiSelectDropdown
          label="Разделы"
          menuKey="sections"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          values={options.sections}
          selected={filters.sections}
          onChange={(sections) => onChange({ ...filters, sections })}
        />

        <MultiSelectDropdown
          label="Страны"
          menuKey="countries"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          values={options.countries}
          selected={filters.countries}
          searchable
          placeholder="Найти страну"
          onChange={(countries) => onChange({ ...filters, countries })}
        />

        <label className="control grid min-h-[54px] grid-cols-[auto_1fr] items-center gap-x-2 px-3 py-2 text-sm">
          <Search className="row-span-2 h-4 w-4 text-muted" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase text-muted">Path</span>
          <input
            className="w-full bg-transparent text-sm font-extrabold text-ink outline-none placeholder:text-muted"
            placeholder="Найти path"
            value={filters.pathQuery}
            onChange={(event) => onChange({ ...filters, pathQuery: event.target.value })}
          />
        </label>

        <button
          className="control inline-flex min-h-[54px] items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-ink hover:border-aqua hover:text-aqua"
          type="button"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Сбросить
        </button>
      </div>
    </section>
  );
}
