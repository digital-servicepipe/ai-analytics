import Papa from "papaparse";
import type { ParseResult, RawLogRow } from "../types";
import { normalizeRow, REQUIRED_COLUMNS } from "./normalize";

function trimRowHeaders(row: RawLogRow): RawLogRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim(), value]),
  );
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawLogRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      worker: true,
      complete: (result) => {
        const fields = (result.meta.fields ?? []).map((field) => field.trim());
        const missing = REQUIRED_COLUMNS.filter((column) => !fields.includes(column));

        if (result.errors.length) {
          reject(
            new Error(
              `CSV не распарсился: ${result.errors
                .slice(0, 3)
                .map((error) => error.message)
                .join("; ")}`,
            ),
          );
          return;
        }

        if (!fields.length || !result.data.length) {
          reject(new Error("CSV пустой или не содержит строк данных."));
          return;
        }

        if (missing.length) {
          reject(
            new Error(`Нет обязательных колонок: ${missing.join(", ")}.`),
          );
          return;
        }

        resolve({
          rows: result.data.map(trimRowHeaders).map(normalizeRow),
          rowCount: result.data.length,
        });
      },
      error: (error) => {
        reject(new Error(`Не удалось прочитать CSV: ${error.message}`));
      },
    });
  });
}
