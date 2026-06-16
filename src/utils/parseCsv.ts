import Papa from "papaparse";
import type { ParseResult, RawLogRow } from "../types";
import { normalizeRow, REQUIRED_COLUMNS } from "./normalize";

const FIELD_ALIASES: Record<string, string> = {
  ua: "http_user_agent",
  user_agent: "http_user_agent",
};

function canonicalFieldName(field: string): string {
  const normalized = field.trim();
  return FIELD_ALIASES[normalized] ?? normalized;
}

function canonicalizeRowHeaders(row: RawLogRow): RawLogRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [canonicalFieldName(key), value]),
  );
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawLogRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      worker: true,
      complete: (result) => {
        const fields = (result.meta.fields ?? []).map(canonicalFieldName);
        const missing = REQUIRED_COLUMNS.filter((column) => !fields.includes(column));

        if (result.errors.length) {
          reject(
            new Error(
              `CSV не распознан: ${result.errors
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
          reject(new Error(`Не хватает обязательных колонок: ${missing.join(", ")}.`));
          return;
        }

        resolve({
          rows: result.data.map(canonicalizeRowHeaders).map(normalizeRow),
          rowCount: result.data.length,
        });
      },
      error: (error) => {
        reject(new Error(`Не удалось прочитать CSV: ${error.message}`));
      },
    });
  });
}
