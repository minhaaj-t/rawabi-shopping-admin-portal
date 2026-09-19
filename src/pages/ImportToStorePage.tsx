import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileUp, RotateCcw, Upload } from "../lib/icons";
import { adminApi } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import {
  SAMPLE_STORE_CSV,
  STORE_IMPORT_HEADERS,
  downloadTextFile,
  normalizeImportRows,
  parseStoreCsv,
  parseStoreJson,
  storeRowsToCsv,
  type StoreImportRow,
} from "../lib/storeImport";

type ImportResult = Awaited<ReturnType<typeof adminApi.importToStore>>;
type InputMode = "csv" | "json";

const DEFAULT_JSON = `[
  {
    "sku": "SAMPLE-SKU",
    "uom": "PCS",
    "price": 12.5,
    "offer_price": 10,
    "stock": 25,
    "stock_limit": 5,
    "soldout_status": 1,
    "offer_start_date": "2026-01-01",
    "offer_end_date": "2026-12-31"
  }
]`;

function formatMoney(v: unknown) {
  return Number(v ?? 0).toFixed(2);
}

export function ImportToStorePage() {
  const user = getUser();
  const storePortal = isStorePortal(user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [stores, setStores] = useState<Array<{ ec_store_id: number; ec_store_name: string }>>([]);
  const [storeId, setStoreId] = useState(String(user?.store_id || ""));
  const [inputMode, setInputMode] = useState<InputMode>("csv");
  const [json, setJson] = useState(DEFAULT_JSON);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<StoreImportRow[]>([]);
  const [dryRun, setDryRun] = useState(false);
  const [createMissing, setCreateMissing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState("");

  useEffect(() => {
    if (!storePortal) {
      void adminApi.stores().then((s) => {
        setStores(s);
        if (!storeId && s[0]) setStoreId(String(s[0].ec_store_id));
      });
    }
  }, [storePortal, storeId]);

  const previewRows = useMemo(() => rows.slice(0, 20), [rows]);

  function parseCurrentInput() {
    setParseError("");
    try {
      if (inputMode === "json") {
        setRows(parseStoreJson(json));
        setFileName("");
        return parseStoreJson(json);
      }
      setParseError("Upload a CSV file or switch to JSON mode.");
      return [];
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
      setRows([]);
      return [];
    }
  }

  async function onFileChange(file: File | null) {
    setParseError("");
    setResult(null);
    setMsg("");
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = parseStoreCsv(text);
      if (!parsed.length) {
        setParseError("No rows found in CSV.");
        setRows([]);
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      setInputMode("csv");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "CSV parse failed");
      setRows([]);
    }
  }

  async function runImport(validateOnly = false) {
    setError("");
    setMsg("");
    setResult(null);
    const parsed = inputMode === "json" ? (() => {
      try {
        const next = parseStoreJson(json);
        setRows(next);
        setParseError("");
        return next;
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "Invalid JSON");
        return [];
      }
    })() : rows;

    if (!parsed.length) {
      setError(parseError || "Add rows via CSV upload or JSON before importing.");
      return;
    }
    if (!storeId) {
      setError("Select a store.");
      return;
    }

    setBusy(true);
    try {
      const res = await adminApi.importToStore({
        store_id: Number(storeId),
        dry_run: validateOnly || dryRun,
        create_missing: createMissing,
        rows: normalizeImportRows(parsed),
      });
      setResult(res);
      const action = validateOnly || dryRun ? "Validated" : "Imported";
      setMsg(
        `${action}: ${res.updated} updated, ${res.inserted} inserted, ${res.unchanged} unchanged, ${res.skipped} skipped.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportStoreCsv() {
    if (!storeId) {
      setError("Select a store.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await adminApi.exportStoreImport(Number(storeId));
      const csvRows: StoreImportRow[] = res.items.map((item) => ({
        sku: String(item.sku),
        uom: String(item.uom ?? ""),
        price: Number(item.price),
        offer_price: Number(item.offer_price),
        stock: Number(item.stock),
        stock_limit: Number(item.stock_limit),
        soldout_status: Number(item.soldout_status),
        offer_start_date: String(item.offer_start_date ?? ""),
        offer_end_date: String(item.offer_end_date ?? ""),
      }));
      downloadTextFile(`store-${storeId}-products.csv`, storeRowsToCsv(csvRows));
      setMsg(`Exported ${res.total} store products.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadSample() {
    downloadTextFile("sample-store-import.csv", SAMPLE_STORE_CSV);
  }

  function resetAll() {
    setJson(DEFAULT_JSON);
    setRows([]);
    setFileName("");
    setResult(null);
    setError("");
    setMsg("");
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="orders-page import-store-page">
      <div className="page-head">
        <div>
          <h1>Import to Store</h1>
          <p className="page-sub">
            Update <code>ec_store_products</code> by SKU + UOM — price, offer, stock, limits, sold-out status, and offer dates.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={downloadSample}>
            <Download size={14} />
            Sample CSV
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void exportStoreCsv()}>
            <Download size={14} />
            Export store
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {parseError ? <div className="alert alert-error">{parseError}</div> : null}

      <div className="card import-store-options">
        <div className="import-store-options-grid">
          {!storePortal ? (
            <label className="import-store-field">
              Store
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                {stores.map((s) => (
                  <option key={s.ec_store_id} value={s.ec_store_id}>
                    {s.ec_store_name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="import-store-field">
              <span>Store</span>
              <strong className="import-store-store-id">#{storeId}</strong>
            </div>
          )}
          <label className="import-store-check">
            <span>Create missing store rows</span>
            <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} />
          </label>
          <label className="import-store-check">
            <span>Dry run only</span>
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          </label>
        </div>
      </div>

      <div className="card import-store-panel">
        <div className="import-store-tabs">
          <button type="button" className={`btn btn-secondary${inputMode === "csv" ? " is-active" : ""}`} onClick={() => setInputMode("csv")}>
            <FileUp size={14} />
            CSV file
          </button>
          <button type="button" className={`btn btn-secondary${inputMode === "json" ? " is-active" : ""}`} onClick={() => setInputMode("json")}>
            JSON rows
          </button>
        </div>

        {inputMode === "csv" ? (
          <div className="import-store-body import-store-upload">
            <div className="import-store-upload-row">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="import-store-file-hidden"
                onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp size={14} />
                Choose CSV file
              </button>
              <span className={`import-store-file-name${fileName ? "" : " is-empty"}`}>
                {fileName || "No file selected"}
              </span>
            </div>
            {fileName ? <p className="muted import-store-meta">{rows.length} row(s) ready to import</p> : null}
            <p className="muted import-store-meta">
              Columns: {STORE_IMPORT_HEADERS.join(", ")}. Max 500 rows per import.
            </p>
          </div>
        ) : (
          <div className="import-store-body">
            <textarea
              className="import-store-json"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={14}
              spellCheck={false}
            />
            <button type="button" className="btn btn-secondary" onClick={() => void parseCurrentInput()}>
              Parse JSON
            </button>
          </div>
        )}

        <div className="import-store-foot actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void runImport(true)}>
            Validate
          </button>
          <button type="button" className="btn btn-green" disabled={busy} onClick={() => void runImport(false)}>
            <Upload size={14} />
            {busy ? "Working…" : dryRun ? "Run dry import" : "Import"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetAll}>
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {rows.length ? (
        <div className="card import-store-table-card">
          <h3>Preview ({Math.min(rows.length, 20)} of {rows.length})</h3>
          <div className="table-wrap">
            <table className="data orders-table import-store-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>UOM</th>
                  <th className="orders-amount-col">Price</th>
                  <th className="orders-amount-col">Offer</th>
                  <th className="orders-amount-col">Stock</th>
                  <th className="orders-amount-col">Limit</th>
                  <th className="orders-status-col">Soldout</th>
                  <th>Offer start</th>
                  <th>Offer end</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={`${row.sku}-${row.uom}-${idx}`}>
                    <td>{row.row ?? idx + 1}</td>
                    <td>{row.sku}</td>
                    <td>{row.uom ?? "-"}</td>
                    <td className="orders-amount-col">{row.price != null ? formatMoney(row.price) : "-"}</td>
                    <td className="orders-amount-col">{row.offer_price != null ? formatMoney(row.offer_price) : "-"}</td>
                    <td className="orders-amount-col">{row.stock ?? "-"}</td>
                    <td className="orders-amount-col">{row.stock_limit ?? "-"}</td>
                    <td className="orders-status-cell">{row.soldout_status ?? "-"}</td>
                    <td className="nowrap">{row.offer_start_date ?? "-"}</td>
                    <td className="nowrap">{row.offer_end_date ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {result?.rejected.length ? (
        <div className="card import-store-table-card">
          <h3>Rejected rows ({result.rejected.length})</h3>
          <div className="table-wrap">
            <table className="data orders-table import-store-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>SKU</th>
                  <th>UOM</th>
                  <th>Reason</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {result.rejected.map((row) => (
                  <tr key={`${row.row}-${row.sku}-${row.reason}`}>
                    <td>{row.row}</td>
                    <td>{row.sku}</td>
                    <td>{row.uom}</td>
                    <td>{row.reason}</td>
                    <td className="wrap">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
