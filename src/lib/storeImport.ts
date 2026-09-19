export const STORE_IMPORT_HEADERS = [
  "SKU",
  "UOM",
  "Price",
  "Offer Price",
  "Stock",
  "Stock Limit",
  "Soldout Status",
  "Offer Start",
  "Offer End",
] as const;

export type StoreImportRow = {
  row?: number;
  sku: string;
  uom?: string;
  price?: number;
  offer_price?: number;
  stock?: number;
  stock_limit?: number;
  soldout_status?: number;
  offer_start_date?: string;
  offer_end_date?: string;
};

export function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      cols.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

function num(v?: string) {
  const t = v?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function dateCell(v?: string) {
  const t = v?.trim();
  if (!t) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const parsed = new Date(t);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return t;
}

export function parseStoreCsv(text: string): StoreImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  let start = 0;
  const first = splitCsvLine(lines[0])[0]?.toLowerCase() ?? "";
  if (first.includes("sku")) start = 1;

  const rows: StoreImportRow[] = [];
  for (let i = start; i < lines.length && rows.length < 500; i += 1) {
    const cols = splitCsvLine(lines[i]);
    const sku = cols[0]?.trim();
    if (!sku) break;
    rows.push({
      row: i + 1,
      sku,
      uom: cols[1]?.trim() || undefined,
      price: num(cols[2]),
      offer_price: num(cols[3]),
      stock: num(cols[4]),
      stock_limit: num(cols[5]),
      soldout_status: num(cols[6]),
      offer_start_date: dateCell(cols[7]),
      offer_end_date: dateCell(cols[8]),
    });
  }
  return rows;
}

export function parseStoreJson(text: string): StoreImportRow[] {
  const parsed = JSON.parse(text) as Array<Record<string, unknown>>;
  if (!Array.isArray(parsed)) throw new Error("JSON must be an array of rows");
  return parsed.slice(0, 500).map((r, idx) => ({
    row: idx + 1,
    sku: String(r.sku ?? ""),
    uom: r.uom ? String(r.uom) : undefined,
    price: r.price != null ? Number(r.price) : undefined,
    offer_price: r.offer_price != null ? Number(r.offer_price) : undefined,
    stock: r.stock != null ? Number(r.stock) : undefined,
    stock_limit: r.stock_limit != null ? Number(r.stock_limit) : undefined,
    soldout_status: r.soldout_status != null ? Number(r.soldout_status) : undefined,
    offer_start_date: r.offer_start_date ? String(r.offer_start_date) : undefined,
    offer_end_date: r.offer_end_date ? String(r.offer_end_date) : undefined,
  }));
}

export function storeRowsToCsv(rows: StoreImportRow[]) {
  const lines = rows.map((r) =>
    [
      r.sku,
      r.uom ?? "",
      r.price ?? "",
      r.offer_price ?? "",
      r.stock ?? "",
      r.stock_limit ?? "",
      r.soldout_status ?? "",
      r.offer_start_date ?? "",
      r.offer_end_date ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [STORE_IMPORT_HEADERS.join(","), ...lines].join("\n");
}

export const SAMPLE_STORE_CSV = `${STORE_IMPORT_HEADERS.join(",")}
"SAMPLE-SKU","PCS","12.50","10.00","25","5","1","2026-01-01","2026-12-31"`;

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function normalizeImportRows(rows: StoreImportRow[]) {
  return rows.map((r) => ({
    sku: r.sku.trim(),
    uom: r.uom?.trim() || undefined,
    price: r.price,
    offer_price: r.offer_price,
    stock: r.stock,
    stock_limit: r.stock_limit,
    soldout_status: r.soldout_status,
    offer_start_date: r.offer_start_date,
    offer_end_date: r.offer_end_date,
  }));
}
