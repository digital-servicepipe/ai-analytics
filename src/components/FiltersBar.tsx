import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  className?: string;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

function getPopoverPosition(
  element: HTMLElement | null,
  preferredWidth: number,
  minWidth = 260,
): PopoverPosition | null {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const width = Math.min(
    Math.max(rect.width, minWidth),
    Math.min(preferredWidth, viewportWidth - 24),
  );
  const left = Math.min(Math.max(12, rect.left), viewportWidth - width - 12);

  return {
    top: rect.bottom + 8,
    left,
    width,
  };
}

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
  className = "",
}: MultiSelectDropdownProps) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpen = openMenu === menuKey;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    const updatePosition = () => {
      setPosition(getPopoverPosition(triggerRef.current, 420, 280));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
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
    <div className={`relative min-w-0 shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        className={`control grid h-[46px] w-full grid-cols-[1fr_auto] items-center gap-x-2.5 px-3 py-1.5 text-left ${
          isOpen ? "border-aqua shadow-card" : ""
        }`}
        type="button"
        onClick={() => setOpenMenu(isOpen ? null : menuKey)}
      >
        <span className="text-[10px] font-bold uppercase tracking-normal text-muted">{label}</span>
        <ChevronDown
          className={`row-span-2 h-3.5 w-3.5 text-muted transition ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        <span className="truncate text-[13px] font-bold text-ink">{summary}</span>
      </button>

      {isOpen && position
        ? createPortal(
            <div
              data-fk-dropdown-portal="true"
              className="fixed z-[120] rounded-2xl border border-line bg-panel p-2 shadow-workspace"
              style={{ top: position.top, left: position.left, width: position.width }}
            >
              {searchable && (
                <label className="control mb-2 grid min-h-[40px] grid-cols-[auto_1fr] items-center gap-x-2 px-3 py-2 text-sm focus-within:border-aqua focus-within:bg-[#1a1e23]">
                  <Search className="h-4 w-4 text-muted" aria-hidden="true" />
                  <input
                    className="w-full border-0 bg-transparent text-sm font-semibold text-ink outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted"
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
            </div>,
            document.body,
          )
        : null}
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
        const target = event.target as HTMLElement | null;
        if (!target?.closest("[data-fk-dropdown-portal]")) {
          setOpenMenu(null);
        }
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const quickFilters: Array<[QuickFilterKey, string]> = [
    ["all", "Все"],
    ["openai", "OpenAI"],
    ["anthropic", "Anthropic"],
    ["perplexity", "Perplexity"],
    ["google", "Google"],
    ["product", "Коммерция"],
    ["noTechnical", "Без тех. шума"],
  ];

  return (
    <section ref={rootRef} className="panel p-3.5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-aqua/10 text-aqua">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-ink">Фильтры</h2>
            <p className="text-[12px] text-muted">Быстрый срез и точный поиск по логам.</p>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max flex-nowrap gap-2">
            {quickFilters.map(([key, label]) => (
              <button
                key={key}
                className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-bold text-ink transition hover:border-aqua hover:text-aqua"
                type="button"
                onClick={() => onQuickFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-[1180px] flex-nowrap items-center gap-2">
            <div className="w-[128px] shrink-0">
              <DateRangePicker
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                minDate={options.minDate}
                maxDate={options.maxDate}
                onChange={(range) => onChange({ ...filters, ...range })}
              />
            </div>

            <MultiSelectDropdown
              label="Группы ботов"
              menuKey="groups"
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              values={options.agentGroups}
              selected={filters.agentGroups}
              onChange={(agentGroups) => onChange({ ...filters, agentGroups })}
              className="w-[154px]"
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
              className="w-[156px]"
            />

            <MultiSelectDropdown
              label="Разделы"
              menuKey="sections"
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              values={options.sections}
              selected={filters.sections}
              onChange={(sections) => onChange({ ...filters, sections })}
              className="w-[132px]"
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
              className="w-[116px]"
            />

            <label className="control flex h-[46px] min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5 text-sm focus-within:border-aqua focus-within:bg-[#1a1e23]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aqua/10 text-aqua">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase leading-none tracking-normal text-muted">
                  Path
                </span>
                <input
                  className="mt-1 block w-full appearance-none border-0 bg-transparent p-0 text-[13px] font-bold leading-[16px] text-ink outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted"
                  placeholder="Найти path или часть URL"
                  value={filters.pathQuery}
                  onChange={(event) => onChange({ ...filters, pathQuery: event.target.value })}
                />
              </span>
            </label>

            <button
              className="control inline-flex h-[46px] w-[112px] shrink-0 items-center justify-center gap-2 px-3 py-1.5 text-[13px] font-bold text-ink hover:border-aqua hover:text-aqua"
              type="button"
              onClick={onReset}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Сбросить
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
