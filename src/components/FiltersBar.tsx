import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bot,
  Check,
  ChevronDown,
  Filter,
  Layers3,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
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

type FiltersBarProps = {
  filters: Filters;
  options: Options;
  onChange: (filters: Filters) => void;
  onReset: () => void;
};

type MenuKey = "groups" | "details" | "sections" | null;

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
  icon: ReactNode;
  emptyText?: string;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

function getPopoverPosition(
  element: HTMLElement | null,
  preferredWidth: number,
  minWidth = 300,
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

function truncateValue(value: string, max = 24) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(8, max - 10))}...${value.slice(-6)}`;
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
  icon,
  emptyText = "Ничего не найдено",
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
      setPosition(getPopoverPosition(triggerRef.current, 440, 300));
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

  const allVisibleSelected =
    visibleValues.length > 0 && visibleValues.every((value) => selectedSet.has(value));

  const toggle = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }

    onChange([...selected, value]);
  };

  const toggleVisible = () => {
    if (!visibleValues.length) return;

    if (allVisibleSelected) {
      const visibleSet = new Set(visibleValues);
      onChange(selected.filter((item) => !visibleSet.has(item)));
      return;
    }

    onChange(Array.from(new Set([...selected, ...visibleValues])));
  };

  const summary =
    selected.length === 0
      ? "Все"
      : selected.length === 1
        ? truncateValue(selected[0])
        : `${selected.length} выбрано`;

  return (
    <div className="min-w-0">
      <button
        ref={triggerRef}
        className={[
          "control group grid h-14 w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 px-3 py-2 text-left",
          isOpen ? "border-aqua shadow-card" : "",
          selected.length ? "bg-[rgba(45,212,191,0.055)]" : "",
        ].join(" ")}
        type="button"
        onClick={() => setOpenMenu(isOpen ? null : menuKey)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-aqua/10 text-aqua transition group-hover:bg-aqua/15">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase leading-none tracking-normal text-muted">
            {label}
          </span>
          <span className="mt-1 block truncate text-[13px] font-extrabold leading-5 text-ink">
            {summary}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className="rounded-full bg-aqua px-2 py-0.5 text-[11px] font-extrabold text-[#071314]">
              {selected.length}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted transition ${isOpen ? "rotate-180 text-aqua" : ""}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {isOpen && position
        ? createPortal(
            <div
              data-fk-dropdown-portal="true"
              className="fixed z-[120] overflow-hidden rounded-2xl border border-line bg-panel shadow-workspace"
              style={{ top: position.top, left: position.left, width: position.width }}
            >
              <div className="border-b border-line p-2.5">
                {searchable && (
                  <label className="control mb-2 grid min-h-[40px] grid-cols-[auto_1fr_auto] items-center gap-x-2 px-3 py-2 text-sm focus-within:border-aqua">
                    <Search className="h-4 w-4 text-muted" aria-hidden="true" />
                    <input
                      className="w-full border-0 bg-transparent text-sm font-semibold text-ink outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted"
                      placeholder={placeholder}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      autoFocus
                    />
                    {query && (
                      <button
                        type="button"
                        className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"
                        onClick={() => setQuery("")}
                        aria-label="Очистить поиск"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </label>
                )}

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-muted">
                    {visibleValues.length} из {values.length}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-bold text-muted hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!visibleValues.length}
                      onClick={toggleVisible}
                    >
                      {allVisibleSelected ? "Снять видимые" : "Выбрать видимые"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-bold text-muted hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!selected.length}
                      onClick={() => onChange([])}
                    >
                      Очистить
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-80 overflow-auto p-2 pr-1">
                {visibleValues.length ? (
                  visibleValues.map((value) => {
                    const checked = selectedSet.has(value);

                    return (
                      <button
                        key={value}
                        className={[
                          "fk-analytics-option grid w-full grid-cols-[auto_1fr] items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                          checked ? "bg-surface text-ink" : "text-muted",
                        ].join(" ")}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          toggle(value);
                        }}
                        title={value}
                      >
                        <span
                          className={[
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                            checked ? "border-aqua bg-aqua text-[#071314]" : "border-line bg-surface",
                          ].join(" ")}
                        >
                          {checked && <Check className="h-3 w-3" aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 break-words leading-5">{value}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-xl bg-surface px-3 py-4 text-center text-sm text-muted">
                    {emptyText}
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (filters.countries.length) {
      onChange({ ...filters, countries: [] });
    }
  }, [filters, onChange]);

  const activeFilterCount =
    Number(Boolean(filters.dateFrom || filters.dateTo)) +
    filters.agentGroups.length +
    filters.agentDetails.length +
    filters.sections.length +
    Number(Boolean(filters.pathQuery.trim()));
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <section ref={rootRef} className="panel p-3.5">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua/10 text-aqua">
            <Filter className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold text-ink">Фильтры</h2>
              <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">
                {hasActiveFilters ? `${activeFilterCount} активных` : "без ограничений"}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-muted">
              Path, user-agent и разделы для анализа AI&nbsp;трафика.
            </p>
          </div>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[170px_minmax(150px,1fr)_minmax(170px,1.15fr)_minmax(150px,1fr)_minmax(280px,1.6fr)_112px]">
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
            icon={<Bot className="h-4 w-4" aria-hidden="true" />}
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
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            emptyText="Такого user-agent нет в текущем срезе"
          />

          <MultiSelectDropdown
            label="Разделы"
            menuKey="sections"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            values={options.sections}
            selected={filters.sections}
            onChange={(sections) => onChange({ ...filters, sections })}
            icon={<Layers3 className="h-4 w-4" aria-hidden="true" />}
          />

          <label className="control group grid h-14 min-w-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 text-sm focus-within:border-aqua">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-aqua/10 text-aqua transition group-hover:bg-aqua/15">
              <Search className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase leading-none tracking-normal text-muted">
                Path
              </span>
              <input
                className="mt-1 block w-full appearance-none border-0 bg-transparent p-0 text-[13px] font-extrabold leading-5 text-ink outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted"
                placeholder="Найти URL или часть path"
                value={filters.pathQuery}
                onChange={(event) => onChange({ ...filters, pathQuery: event.target.value })}
              />
            </span>
            {filters.pathQuery && (
              <button
                type="button"
                className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"
                onClick={() => onChange({ ...filters, pathQuery: "" })}
                aria-label="Очистить path"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </label>

          <button
            className="control inline-flex h-14 items-center justify-center gap-2 px-3 py-2 text-[13px] font-extrabold text-ink hover:border-aqua hover:text-aqua disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Сброс
          </button>
        </div>
      </div>
    </section>
  );
}
