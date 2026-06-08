export const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

export function formatInteger(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0,0%";
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function formatDate(date: string): string {
  if (date === "Unknown") return "Unknown";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}.${month}.${year}`;
}

export function truncateMiddle(value: string, maxLength = 42): string {
  if (value.length <= maxLength) return value;
  const headLength = Math.ceil((maxLength - 1) * 0.62);
  const tailLength = Math.floor((maxLength - 1) * 0.38);
  return `${value.slice(0, headLength)}…${value.slice(-tailLength)}`;
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ru"),
  );
}
