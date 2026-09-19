import { useRef, useState } from "react";
import { Download, Upload, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import { parseStoreCsv } from "../lib/storeImport";

const CATALOG_HEADERS = [
  "Product",
  "Brand",
  "Category",
  "Sub Category",
  "Sub Sub Cat",
  "Sub Sub Sub",
  "Description",
  "Short Desc",
  "SKU",
  "UOM",
  "Barcode",
  "Status",
  "Features",
  "Featured Img",
  "Multiple Img",
  "Selling Price",
  "Offer Price",
  "Purchase Pr",
  "tag",
];

const STORE_HEADERS = ["SKU", "UOM", "Price", "Offer Price", "Stock", "Soldout Status"];

const SAMPLE_CATALOG = `${CATALOG_HEADERS.join(",")}
Sample Product,,10,,,,Long description,Short text,SAMPLE-SKU,PCS,123456789,1,,sample.jpg,,12.50,10.00,8.00,
`;

const SAMPLE_STORE = `${STORE_HEADERS.join(",")}
SAMPLE-SKU,PCS,12.50,10.00,25,1
`;

type CatalogRow = Parameters<typeof adminApi.importProducts>[0][number];

type Props = {
  storePortal: boolean;
  activeStoreId: string;
  queryParams: Record<string, string | number | undefined>;
  onClose: () => void;
  onImportDone: () => void;
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === `"`) {
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function parseCatalogCsv(text: string): CatalogRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  let start = 0;
  const first = splitCsvLine(lines[0]).map((c) => c.toLowerCase());
  if (first.some((c) => c.includes("sku") || c.includes("product"))) start = 1;

  const rows: CatalogRow[] = [];
  for (let i = start; i < lines.length && rows.length < 500; i++) {
    const cols = splitCsvLine(lines[i]);
    const sku = cols[8]?.trim() ?? "";
    const uom = cols[9]?.trim() ?? "";
    if (!sku && !uom && !cols[0]?.trim()) continue;
    if (!sku || !uom) break;

    const num = (v?: string) => {
      const t = v?.trim();
      if (!t) return undefined;
      const n = Number(t);
      return Number.isFinite(n) ? n : undefined;
    };

    rows.push({
      name: cols[0]?.trim() || undefined,
      brand_id: num(cols[1]),
      category_id: num(cols[2]),
      subcategory_id: num(cols[3]),
      sub_subcategory_id: num(cols[4]),
      sub_sub_subcategory_id: num(cols[5]),
      detailed_description: cols[6]?.trim() || undefined,
      short_description: cols[7]?.trim() || undefined,
      sku,
      uom,
      barcode: cols[10]?.trim() || undefined,
      status: num(cols[11]) as 0 | 1 | undefined,
      features: cols[12]?.trim() || undefined,
      image: cols[13]?.trim() || undefined,
      gallery: cols[14]?.trim() || undefined,
      selling_price: num(cols[15]),
      offer_price: num(cols[16]),
      purchase_price: num(cols[17]),
      tags: cols[18]?.trim() || undefined,
    });
  }
  return rows;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(v: unknown) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export function ProductImportExportModal({ storePortal, activeStoreId, queryParams, onClose, onImportDone }: Props) {
  const [tab, setTab] = useState<"export" | "import">("export");
  const [importMode, setImportMode] = useState<"catalog" | "store">(storePortal ? "store" : "catalog");
  const csvRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [rejected, setRejected] = useState<Array<{ row: number; sku: string; reason: string }>>([]);
  const [exportLimit, setExportLimit] = useState(500);

  async function runExport() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.products({ ...queryParams, page: 1, per_page: exportLimit });
      const lines = res.items.map((p) =>
        [
          p.name,
          "",
          p.category_id ?? "",
          p.subcategory_id ?? "",
          p.sub_subcategory_id ?? "",
          "",
          "",
          "",
          p.sku,
          p.uom,
          p.barcode,
          p.status,
          "",
          p.image ?? "",
          "",
          p.base_price,
          p.offer_price ?? "",
          "",
          "",
        ]
          .map(csvCell)
          .join(","),
      );
      downloadCsv(`products-store-${activeStoreId}.csv`, [CATALOG_HEADERS.join(","), ...lines].join("\n"));
      setMsg(`Exported ${res.items.length} products.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    setError("");
    setMsg("");
    setRejected([]);
    try {
      const file = csvRef.current?.files?.[0];
      if (!file) {
        setError("Choose a CSV file.");
        setBusy(false);
        return;
      }
      const text = await file.text();

      if (importMode === "store") {
        const rows = parseStoreCsv(text);
        if (!rows.length) {
          setError("No store rows found.");
          setBusy(false);
          return;
        }
        const res = await adminApi.importToStore({
          store_id: Number(activeStoreId),
          rows,
        });
        setMsg(`Store import — ${res.updated} updated, ${res.inserted} inserted, ${res.skipped} skipped.`);
        if (res.rejected?.length) {
          setRejected(res.rejected.map((r) => ({ row: r.row, sku: r.sku, reason: r.message })));
        }
        if (res.updated || res.inserted) onImportDone();
      } else {
        const rows = parseCatalogCsv(text);
        if (!rows.length) {
          setError("No catalog rows found.");
          setBusy(false);
          return;
        }
        const zipFile = zipRef.current?.files?.[0];
        if (zipFile) {
          const fd = new FormData();
          fd.append("zip_file", zipFile);
          await adminApi.uploadProductImagesZip(fd);
        }
        const res = await adminApi.importProducts(rows);
        setRejected(res.rejected ?? []);
        setMsg(`Catalog import — ${res.inserted} added, ${res.updated} updated, ${res.failed} failed.`);
        if (res.inserted || res.updated) onImportDone();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card import-brand-modal product-io-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
        <div className="page-head">
          <div>
            <h2>Import / Export products</h2>
            <p className="muted page-sub">Bulk catalog spreadsheet and store pricing for store {activeStoreId}</p>
          </div>
        </div>

        <div className="product-io-tabs">
          <button type="button" className={tab === "export" ? "is-active" : ""} onClick={() => setTab("export")}>
            Export
          </button>
          <button type="button" className={tab === "import" ? "is-active" : ""} onClick={() => setTab("import")}>
            Import
          </button>
        </div>

        <div className="import-brand-body">
          {tab === "export" ? (
            <>
              <p className="muted">
                Exports the current filtered product list as a CSV compatible with the catalog import template.
              </p>
              <label className="pf-field">
                <span className="pf-label">Max rows</span>
                <select value={exportLimit} onChange={(e) => setExportLimit(Number(e.target.value))}>
                  {[100, 250, 500, 1000].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="import-brand-actions">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void runExport()}>
                  <Download size={14} /> {busy ? "Exporting…" : "Export CSV"}
                </button>
              </div>
            </>
          ) : (
            <>
              {!storePortal ? (
                <div className="product-io-mode">
                  <label className="pf-field">
                    <span className="pf-label">Import type</span>
                    <select value={importMode} onChange={(e) => setImportMode(e.target.value as "catalog" | "store")}>
                      <option value="catalog">Catalog spreadsheet (create / update SKUs)</option>
                      <option value="store">Store pricing & stock (SKU + UOM)</option>
                    </select>
                  </label>
                </div>
              ) : null}

              <p className="muted">
                {importMode === "catalog"
                  ? "Upload a CSV matching the legacy product import columns. Existing SKU+UOM rows are updated; blank cells are left unchanged."
                  : "Upload store rows to update ec_store_products for the selected store."}
              </p>

              <label className="pf-field">
                <span className="pf-label">CSV file</span>
                <input ref={csvRef} type="file" accept=".csv,text/csv" className="admin-file-input" />
              </label>

              {importMode === "catalog" && !storePortal ? (
                <label className="pf-field">
                  <span className="pf-label">Product images ZIP (optional)</span>
                  <input ref={zipRef} type="file" accept=".zip,application/zip" className="admin-file-input" />
                  <span className="muted pf-hint">Extracts images into uploads/product_images/featured_image/</span>
                </label>
              ) : null}

              <div className="import-brand-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    downloadCsv(
                      importMode === "catalog" ? "sample-product-import.csv" : "sample-store-import.csv",
                      importMode === "catalog" ? SAMPLE_CATALOG : SAMPLE_STORE,
                    )
                  }
                >
                  Download sample CSV
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void runImport()}>
                  <Upload size={14} /> {busy ? "Importing…" : "Run import"}
                </button>
              </div>
            </>
          )}

          {error ? <p className="error">{error}</p> : null}
          {msg ? <p className="muted">{msg}</p> : null}

          {rejected.length ? (
            <div className="import-brand-rejected">
              <strong>Rejected rows</strong>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>SKU</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejected.map((r) => (
                      <tr key={`${r.row}-${r.sku}`}>
                        <td>{r.row}</td>
                        <td>{r.sku || "—"}</td>
                        <td>{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
