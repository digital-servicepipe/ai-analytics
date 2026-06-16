import { SearchX } from "lucide-react";

type EmptyStateProps = {
  title?: string;
  description?: string;
};

export function EmptyState({
  title = "Нет данных по выбранным фильтрам",
  description = "Сбросьте фильтры или измените поиск по URL.",
}: EmptyStateProps) {
  return (
    <div className="panel flex min-h-[240px] items-center justify-center border-dashed px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-muted">
          <SearchX className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="break-words text-base font-bold text-ink">{title}</h2>
        <p className="mt-1 break-words text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}
