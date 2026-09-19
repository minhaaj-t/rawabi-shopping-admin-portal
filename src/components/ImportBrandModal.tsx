import { useRef, useState } from "react";
import { Upload, X } from "../lib/icons";
import { adminApi } from "../lib/api";

const SAMPLE_CSV = `brand_id,name,image,name_ar
,SAMPLE BRAND,sample-brand.png,
`;

type ImportRow = {
  id?: number;
  name: string;
  name_ar?: string;
  image?: string;
};

type RejectedRow = {
  row: number;
  name: string;
  reason: string;
};

function parseCsv(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  const splitLine = (line: string) => {
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
  };

  let start = 0;
  const first = splitLine(lines[0]).map((c) => c.toLowerCase());
  if (first.some((c) => c.includes("name") || c.includes("brand"))) start = 1;

  const rows: ImportRow[] = [];
  for (let i = start; i < lines.length && rows.length < 400; i++) {
    const cols = splitLine(lines[i]);
    const idRaw = cols[0]?.trim();
    const name = cols[1]?.trim() ?? "";
    if (!name) break;
    const row: ImportRow = { name, image: cols[2]?.trim() || undefined, name_ar: cols[3]?.trim() || undefined };
    if (idRaw && /^\d+$/.test(idRaw)) row.id = Number(idRaw);
    rows.push(row);
  }
  return rows;
}

function downloadSample() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample-brand-import.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportBrandModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const csvRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [rejected, setRejected] = useState<RejectedRow[]>([]);

  async function runImport() {
    setBusy(true);
    setMsg("");
    setError("");
    setRejected([]);
    try {
      const file = csvRef.current?.files?.[0];
      if (!file) {
        setError("Choose a CSV file to import.");
        setBusy(false);
        return;
      }
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        setError("No brand rows found. Use the sample CSV format.");
        setBusy(false);
        return;
      }

      const zipFile = zipRef.current?.files?.[0];
      if (zipFile) {
        const fd = new FormData();
        fd.append("zip_file", zipFile);
        await adminApi.uploadBrandImagesZip(fd);
      }

      const res = await adminApi.importBrands(rows);
      setRejected(res.rejected ?? []);
      setMsg(`Import complete — ${res.inserted} added, ${res.updated} updated, ${res.failed} failed.`);
      if (res.inserted || res.updated) onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card import-brand-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
        <div className="page-head">
          <div>
            <h2>Import brands</h2>
            <p className="muted page-sub">
              Upload a CSV sheet to add or update brands. Column order: brand ID (optional), name, image filename, Arabic name.
            </p>
          </div>
        </div>

        <div className="import-brand-body">
          <label className="pf-field">
            <span className="pf-label">Brand spreadsheet (CSV)</span>
            <input ref={csvRef} type="file" accept=".csv,text/csv" className="admin-file-input" />
          </label>

          <label className="pf-field">
            <span className="pf-label">Brand images ZIP (optional)</span>
            <input ref={zipRef} type="file" accept=".zip,application/zip" className="admin-file-input" />
            <span className="muted pf-hint">Extracts JPG/PNG/GIF into uploads/brand_images/</span>
          </label>

          <div className="import-brand-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={downloadSample}>
              Download sample CSV
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void runImport()}>
              <Upload size={14} /> {busy ? "Importing…" : "Import brands"}
            </button>
          </div>

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
                      <th>Name</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejected.map((r) => (
                      <tr key={`${r.row}-${r.name}`}>
                        <td>{r.row}</td>
                        <td>{r.name || "—"}</td>
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
