import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
});
const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type DateRangePickerProps = {
  dateFrom: string;
  dateTo: string;
  minDate: string;
  maxDate: string;
  onChange: (range: { dateFrom: string; dateTo: string }) => void;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

function parseDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, amount: number) {
  const date = parseDate(value);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDate(date);
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const dayOffset = (firstDay.getUTCDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setUTCDate(firstDay.getUTCDate() - dayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });
}

function compareDate(left: string, right: string) {
  return left.localeCompare(right);
}

function clampDate(value: string, minDate: string, maxDate: string) {
  if (!value) return "";
  if (minDate && compareDate(value, minDate) < 0) return minDate;
  if (maxDate && compareDate(value, maxDate) > 0) return maxDate;
  return value;
}

function readableDate(value: string) {
  const date = parseDate(value);
  return date ? DATE_FORMATTER.format(date) : "";
}

function getPopoverPosition(element: HTMLElement | null, preferredWidth: number): PopoverPosition | null {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const width = Math.min(preferredWidth, window.innerWidth - 24);
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);

  return {
    top: rect.bottom + 8,
    left,
    width,
  };
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  minDate,
  maxDate,
  onChange,
}: DateRangePickerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parseDate(dateFrom || maxDate || minDate) ?? new Date()),
  );

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!wrapperRef.current?.contains(target as Node) && !target?.closest("[data-fk-dropdown-portal]")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setVisibleMonth(startOfMonth(parseDate(dateFrom || maxDate || minDate) ?? new Date()));

    const updatePosition = () => {
      setPosition(getPopoverPosition(triggerRef.current, 340));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [dateFrom, isOpen, maxDate, minDate]);

  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const currentMonth = visibleMonth.getUTCMonth();
  const monthLabel = MONTH_FORMATTER.format(visibleMonth);
  const summary =
    dateFrom && dateTo
      ? `${readableDate(dateFrom)} - ${readableDate(dateTo)}`
      : dateFrom
        ? `С ${readableDate(dateFrom)}`
        : dateTo
          ? `По ${readableDate(dateTo)}`
          : "Все даты";

  const selectDate = (value: string) => {
    if (!dateFrom || dateTo) {
      onChange({ dateFrom: value, dateTo: "" });
      return;
    }

    if (compareDate(value, dateFrom) < 0) {
      onChange({ dateFrom: value, dateTo: "" });
      return;
    }

    onChange({ dateFrom, dateTo: value });
  };

  const setPreset = (daysBack: number) => {
    if (!maxDate) return;
    const start = clampDate(addDays(maxDate, -(daysBack - 1)), minDate, maxDate);
    onChange({ dateFrom: start, dateTo: maxDate });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        className="control inline-flex h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-aqua/10 text-aqua">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="grid min-w-0 gap-0">
            <span className="text-[10px] font-bold uppercase tracking-normal text-muted">Дата</span>
            <span className="truncate text-[13px] font-bold text-ink">{summary}</span>
          </span>
        </span>
      </button>

      {isOpen && position
        ? createPortal(
            <div
              data-fk-dropdown-portal="true"
              className="fixed z-[120] rounded-2xl border border-line bg-panel p-3 shadow-card"
              style={{ top: position.top, left: position.left, width: position.width }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface hover:text-ink"
                  type="button"
                  onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
                  aria-label="Предыдущий месяц"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="text-sm font-bold capitalize text-ink">{monthLabel}</div>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface hover:text-ink"
                  type="button"
                  onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
                  aria-label="Следующий месяц"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-muted">
                {DAY_NAMES.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((date) => {
                  const value = formatDate(date);
                  const isOutsideMonth = date.getUTCMonth() !== currentMonth;
                  const isDisabled =
                    (minDate && compareDate(value, minDate) < 0) ||
                    (maxDate && compareDate(value, maxDate) > 0);
                  const isStart = value === dateFrom;
                  const isEnd = value === dateTo;
                  const isInRange =
                    dateFrom &&
                    dateTo &&
                    compareDate(value, dateFrom) > 0 &&
                    compareDate(value, dateTo) < 0;

                  return (
                    <button
                      key={value}
                      className={[
                        "h-9 rounded-lg text-sm font-bold transition",
                        isOutsideMonth ? "text-slate-300" : "text-ink",
                        isInRange ? "bg-aqua/10 text-aqua" : "",
                        isStart || isEnd ? "bg-aqua text-[#071314]" : "hover:bg-surface",
                        isDisabled ? "cursor-not-allowed opacity-30 hover:bg-transparent" : "",
                      ].join(" ")}
                      disabled={Boolean(isDisabled)}
                      type="button"
                      onClick={() => selectDate(value)}
                    >
                      {date.getUTCDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  className="control px-2 py-1.5 text-xs font-bold text-ink"
                  type="button"
                  onClick={() => setPreset(7)}
                >
                  7 дней
                </button>
                <button
                  className="control px-2 py-1.5 text-xs font-bold text-ink"
                  type="button"
                  onClick={() => setPreset(30)}
                >
                  30 дней
                </button>
                <button
                  className="control inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-bold text-ink"
                  type="button"
                  onClick={() => onChange({ dateFrom: "", dateTo: "" })}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Очистить
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
