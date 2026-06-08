import { SearchX } from "lucide-react";

type EmptyStateProps = {
  title?: string;
  description?: string;
};

export function EmptyState({
  title = "Нет данных под выбранные фильтры",
  description = "Сбросьте фильтры или измените поиск по URL/path.",
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 text-center">
      <div>
        <SearchX className="mx-auto mb-3 h-8 w-8 text-muted" aria-hidden="true" />
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
