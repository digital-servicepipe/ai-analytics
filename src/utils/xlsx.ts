export type SheetTable = {
  name: string;
  rows: Array<Array<string | number | null>>;
};

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

const textDecoder = new TextDecoder("utf-8");

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const minOffset = Math.max(0, bytes.length - 65558);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readUint32(bytes, offset) === 0x06054b50) return offset;
  }
  throw new Error("XLSX archive is missing the ZIP directory.");
}

function parseCentralDirectory(bytes: Uint8Array): Map<string, ZipEntry> {
  const eocdOffset = findEndOfCentralDirectory(bytes);
  const entryCount = readUint16(bytes, eocdOffset + 10);
  let offset = readUint32(bytes, eocdOffset + 16);
  const entries = new Map<string, ZipEntry>();

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(bytes, offset) !== 0x02014b50) break;

    const method = readUint16(bytes, offset + 10);
    const compressedSize = readUint32(bytes, offset + 20);
    const fileNameLength = readUint16(bytes, offset + 28);
    const extraLength = readUint16(bytes, offset + 30);
    const commentLength = readUint16(bytes, offset + 32);
    const localHeaderOffset = readUint32(bytes, offset + 42);
    const nameStart = offset + 46;
    const name = textDecoder.decode(bytes.slice(nameStart, nameStart + fileNameLength));

    entries.set(name, { name, method, compressedSize, localHeaderOffset });
    offset = nameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (!("DecompressionStream" in window)) {
    throw new Error("Browser does not support XLSX decompression.");
  }

  const buffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  const stream = new Blob([buffer]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntry(
  bytes: Uint8Array,
  entry: ZipEntry,
): Promise<string> {
  const localOffset = entry.localHeaderOffset;
  if (readUint32(bytes, localOffset) !== 0x04034b50) {
    throw new Error(`Broken XLSX entry: ${entry.name}`);
  }

  const fileNameLength = readUint16(bytes, localOffset + 26);
  const extraLength = readUint16(bytes, localOffset + 28);
  const dataStart = localOffset + 30 + fileNameLength + extraLength;
  const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return textDecoder.decode(compressed);
  if (entry.method === 8) return textDecoder.decode(await inflateRaw(compressed));

  throw new Error(`Unsupported XLSX compression method: ${entry.method}`);
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function getRelTargets(xml: string): Map<string, string> {
  const doc = parseXml(xml);
  const map = new Map<string, string>();
  Array.from(doc.getElementsByTagName("Relationship")).forEach((rel) => {
    const id = rel.getAttribute("Id");
    const target = rel.getAttribute("Target");
    if (!id || !target) return;
    map.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
  });
  return map;
}

function parseSharedStrings(xml: string): string[] {
  const doc = parseXml(xml);
  return Array.from(doc.getElementsByTagName("si")).map((node) => node.textContent ?? "");
}

function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0] ?? "A";
  return Array.from(letters.toUpperCase()).reduce(
    (total, letter) => total * 26 + letter.charCodeAt(0) - 64,
    0,
  ) - 1;
}

function trimTrailingEmpty<T>(values: T[], empty: T): T[] {
  let end = values.length;
  while (end > 0 && values[end - 1] === empty) end -= 1;
  return values.slice(0, end);
}

function parseCell(cell: Element, sharedStrings: string[]): string | number | null {
  const type = cell.getAttribute("t");
  const valueNode = cell.getElementsByTagName("v")[0];

  if (type === "inlineStr") {
    return cell.getElementsByTagName("is")[0]?.textContent ?? "";
  }

  const raw = valueNode?.textContent ?? "";
  if (!raw) return null;
  if (type === "s") return sharedStrings[Number(raw)] ?? "";
  if (type === "b") return raw === "1" ? 1 : 0;

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : raw;
}

function parseSheetXml(xml: string, sharedStrings: string[]): Array<Array<string | number | null>> {
  const doc = parseXml(xml);
  const rows: Array<Array<string | number | null>> = [];

  Array.from(doc.getElementsByTagName("row")).forEach((rowNode) => {
    const rowIndex = Number(rowNode.getAttribute("r") ?? rows.length + 1) - 1;
    const row: Array<string | number | null> = [];

    Array.from(rowNode.getElementsByTagName("c")).forEach((cell) => {
      const ref = cell.getAttribute("r") ?? "";
      row[columnIndex(ref)] = parseCell(cell, sharedStrings);
    });

    rows[rowIndex] = trimTrailingEmpty(row.map((value) => value ?? null), null);
  });

  return rows.filter((row) => row.some((value) => value !== null && value !== ""));
}

export async function parseXlsxFile(file: File): Promise<SheetTable[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = parseCentralDirectory(bytes);
  const workbookEntry = entries.get("xl/workbook.xml");
  const relsEntry = entries.get("xl/_rels/workbook.xml.rels");

  if (!workbookEntry || !relsEntry) {
    throw new Error("XLSX file does not contain workbook metadata.");
  }

  const [workbookXml, relsXml, sharedStringsXml] = await Promise.all([
    readZipEntry(bytes, workbookEntry),
    readZipEntry(bytes, relsEntry),
    entries.has("xl/sharedStrings.xml")
      ? readZipEntry(bytes, entries.get("xl/sharedStrings.xml")!)
      : Promise.resolve(""),
  ]);

  const relTargets = getRelTargets(relsXml);
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  const workbook = parseXml(workbookXml);

  const sheets = await Promise.all(
    Array.from(workbook.getElementsByTagName("sheet")).map(async (sheet) => {
      const name = sheet.getAttribute("name") ?? "Sheet";
      const relId = sheet.getAttribute("r:id");
      const target = relId ? relTargets.get(relId) : undefined;
      const entry = target ? entries.get(target) : undefined;

      if (!entry) return { name, rows: [] };
      return {
        name,
        rows: parseSheetXml(await readZipEntry(bytes, entry), sharedStrings),
      };
    }),
  );

  return sheets.filter((sheet) => sheet.rows.length);
}
