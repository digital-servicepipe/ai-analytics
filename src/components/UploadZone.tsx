import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";

type UploadZoneProps = {
  error: string;
  isParsing: boolean;
  onFile: (file: File) => void;
};

export function UploadZone({ error, isParsing, onFile }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(false);
    handleFiles(event.dataTransfer.files);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <section className="w-full max-w-3xl rounded-2xl border border-line bg-white p-8 shadow-card">
        <div className="mb-6">
          <p className="text-sm font-medium text-accent">AI agents dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">
            Запросы ИИ-агентов к сайту
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Загрузите CSV с логами ИИ-агентов, чтобы сразу построить KPI,
            графики, фильтры и таблицу запросов к страницам сайта.
          </p>
        </div>

        <div
          className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${
            isOver
              ? "border-accent bg-blue-50"
              : "border-line bg-[#f9fbfe] hover:border-accent"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsOver(true);
          }}
          onDragLeave={() => setIsOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
        >
          <FileUp className="mb-4 h-12 w-12 text-accent" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-ink">
            Загрузите CSV с логами ИИ-агентов
          </h2>
          <p className="mt-2 text-sm text-muted">
            Перетащите файл сюда или выберите его вручную
          </p>
          <button
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2648bd]"
            type="button"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Выбрать CSV
          </button>
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept=".csv,text/csv"
            onChange={onChange}
          />
        </div>

        {isParsing && (
          <p className="mt-4 text-sm font-medium text-accent">Файл обрабатывается...</p>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}
