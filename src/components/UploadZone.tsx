import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";
import type { UploadedFileMeta } from "../types";

type UploadZoneProps = {
  error: string;
  isParsing: boolean;
  files: UploadedFileMeta[];
  onLogFiles: (files: File[]) => void;
};

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M13.8 13.8 18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <path
        d="M16.5 5.5h3M18 4v3"
        stroke="#A78BFA"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UploadZone({ error, isParsing, files, onLogFiles }: UploadZoneProps) {
  const logInputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  const handleLogFiles = (fileList: FileList | null) => {
    const nextFiles = Array.from(fileList ?? []);
    if (nextFiles.length) onLogFiles(nextFiles);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(false);
    handleLogFiles(event.dataTransfer.files);
  };

  const onLogChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleLogFiles(event.target.files);
    event.target.value = "";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-app p-6 text-ink">
      <section className="w-full max-w-5xl rounded-[28px] border border-line bg-screen p-3 shadow-workspace">
        <div className="rounded-3xl border border-line bg-panel p-6 md:p-8">
          <div className="mb-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface text-aqua">
              <BrandMark />
            </div>
            <p className="text-xs font-bold uppercase tracking-normal text-muted">NeraLens</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-ink">
              Загрузите CSV логов
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Можно загрузить один файл или сразу несколько. Все CSV объединяются в один рабочий
              набор.
            </p>
          </div>

          <div
            className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${
              isOver
                ? "border-aqua bg-[#11211D]"
                : "border-line bg-surface hover:border-aqua"
            }`}
            onClick={() => logInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsOver(true);
            }}
            onDragLeave={() => setIsOver(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-panel text-aqua">
              <FileUp className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-ink">Логи AI-агентов</h2>
            <p className="mt-2 text-sm text-muted">
              Перетащите CSV сюда или выберите несколько файлов вручную.
            </p>
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-aqua px-4 py-2.5 text-sm font-bold text-[#071314]"
              type="button"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Выбрать CSV
            </button>
            <input
              ref={logInputRef}
              className="hidden"
              type="file"
              accept=".csv,text/csv"
              multiple
              onChange={onLogChange}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
              <p className="text-sm font-bold text-ink">Уже загружено</p>
              <p className="mt-1 text-sm text-muted">
                {files.length} файла · {files.reduce((sum, file) => sum + file.rowCount, 0).toLocaleString("ru-RU")} строк
              </p>
            </div>
          )}

          {isParsing && (
            <p className="mt-4 text-sm font-bold text-accent">Обрабатываю файлы...</p>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
