import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, Trash2, Upload } from "../lib/icons";
import { adminApi } from "../lib/api";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { brandImageFallbacks, brandImageUrl } from "../lib/media";
import { ImportBrandModal } from "../components/ImportBrandModal";
import { LoadingIndicator } from "../components/LoadingIndicator";

type BrandRow = {
  id: number;
  name: string;
  name_ar?: string | null;
  image?: string | null;
  image_url?: string | null;
  status: number;
  product_count?: number;
  created_at?: string | null;
};

type FormState = {
  name: string;
  name_ar: string;
  image: string;
  status: string;
};

const emptyForm = (): FormState => ({
  name: "",
  name_ar: "",
  image: "",
  status: "1",
});

function BrandThumb({ filename, url, alt }: { filename?: string | null; url?: string | null; alt: string }) {
  const candidates = useMemo(() => brandImageFallbacks(filename, url), [filename, url]);
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [filename, url]);

  if (!candidates.length || index >= candidates.length) {
    return <span className="brand-thumb-placeholder">No image</span>;
  }

  return (
    <img
      src={candidates[index]}
      alt={alt}
      className="brand-thumb"
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

export function BrandsPage() {
  const [items, setItems] = useState<BrandRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(40);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "1" | "0">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.brands({
        page,
        per_page: perPage,
        q: q.trim() || undefined,
        status: statusFilter === "all" ? undefined : Number(statusFilter),
      });
      setItems(res.items as BrandRow[]);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load brands");
    } finally {
      setBusy(false);
    }
  }, [page, perPage, q, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm());
    setPreviewUrl(null);
    setMsg("");
    setOpen(true);
  }

  useOpenAddQuery(openAdd);

  function openEdit(row: BrandRow) {
    setEditId(row.id);
    setForm({
      name: row.name || "",
      name_ar: row.name_ar || "",
      image: row.image || "",
      status: String(row.status ?? 1),
    });
    setPreviewUrl(brandImageUrl(row.image, row.image_url));
    setMsg("");
    setOpen(true);
  }

  async function onUploadImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.name || "brand");
      const uploaded = await adminApi.uploadBrandImage(fd);
      setForm((s) => ({ ...s, image: uploaded.filename }));
      setPreviewUrl(uploaded.url || brandImageUrl(uploaded.filename));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      setMsg("Brand name is required.");
      return;
    }
    setBusy(true);
    setMsg("");
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      name_ar: form.name_ar.trim(),
      image: form.image.trim(),
      status: Number(form.status),
    };
    try {
      if (editId) await adminApi.updateBrand(editId, body);
      else await adminApi.createBrand(body);
      setOpen(false);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(row: BrandRow) {
    await adminApi.updateBrandStatus(row.id, row.status === 1 ? 0 : 1);
    await refresh();
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this brand? Products keep the brand id but the brand will be hidden.")) return;
    await adminApi.deleteBrand(id);
    await refresh();
  }

  function applySearch(e?: FormEvent) {
    e?.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  }

  const activeCount = useMemo(() => items.filter((b) => b.status === 1).length, [items]);

  return (
    <div className="page brand-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">Catalog · Brands</p>
          <h1 className="page-title">Brand management</h1>
          <p className="page-sub">
            Manage product brands — names, images, status, CSV import, and image ZIP upload.
          </p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(true)}>
            <Upload size={14} aria-hidden /> Import brands
          </button>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            Add brand
          </button>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card brand-card">
        <div className="panel-toolbar brand-toolbar">
          <form className="brand-search-form" onSubmit={applySearch}>
            <div className="brand-search-wrap">
              <Search size={14} aria-hidden />
              <input
                className="brand-search"
                value={searchInput}
                placeholder="Search name, Arabic, or ID…"
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
          </form>

          <div className="brand-toolbar-end">
            <div className="brand-status-tabs" role="tablist" aria-label="Status filter">
              {(
                [
                  ["all", "All"],
                  ["1", "Active"],
                  ["0", "Off"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === value}
                  className={`brand-status-tab${statusFilter === value ? " active" : ""}`}
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void refresh()} disabled={busy}>
              Refresh
            </button>
          </div>
        </div>

        <p className="muted brand-hint">
          {busy ? "Loading…" : `${total} brands · ${activeCount} active on this page`}
        </p>

        <div className="table-wrap">
          <table className="data brand-table">
            <thead>
              <tr>
                <th className="brand-id-col">ID</th>
                <th className="brand-img-col">Image</th>
                <th>Brand</th>
                <th className="brand-products-col">Products</th>
                <th className="brand-status-col">Status</th>
                <th className="brand-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className={row.status !== 1 ? "is-off" : undefined}>
                  <td className="brand-id-col muted">#{row.id}</td>
                  <td className="brand-img-col">
                    <BrandThumb filename={row.image} url={row.image_url} alt={row.name} />
                  </td>
                  <td className="wrap">
                    <div className="brand-name-cell">
                      <button type="button" className="brand-name-link" onClick={() => openEdit(row)}>
                        {row.name || `Brand #${row.id}`}
                      </button>
                      {row.name_ar ? (
                        <span className="muted brand-name-ar" dir="rtl">
                          {row.name_ar}
                        </span>
                      ) : null}
                      {row.image ? <span className="muted brand-file">{row.image}</span> : null}
                    </div>
                  </td>
                  <td className="brand-products-col">{row.product_count ?? 0}</td>
                  <td className="brand-status-col">
                    <span className={`status-pill ${row.status === 1 ? "is-on" : "is-off"}`}>
                      {row.status === 1 ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="brand-actions-col">
                    <div className="brand-row-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onToggle(row)}>
                        {row.status === 1 ? "Deactivate" : "Activate"}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onDelete(row.id)}>
                        <Trash2 size={13} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !busy ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No brands found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {busy && !items.length ? <LoadingIndicator label="Loading brands…" /> : null}

        {totalPages > 1 ? (
          <div className="brand-pager">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="muted">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || busy}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-card brand-modal" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <div>
                <h2>{editId ? "Edit brand" : "Add brand"}</h2>
                <p className="muted page-sub">English + Arabic name, logo image, and active status.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="brand-modal-body">
              <div className="brand-form-grid">
                <label className="pf-field">
                  <span className="pf-label">Brand name (English)</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Rawabi Fresh"
                  />
                </label>
                <label className="pf-field">
                  <span className="pf-label">Brand name (Arabic)</span>
                  <input
                    value={form.name_ar}
                    dir="rtl"
                    onChange={(e) => setForm((s) => ({ ...s, name_ar: e.target.value }))}
                    placeholder="الاسم بالعربي"
                  />
                </label>
                <label className="pf-field">
                  <span className="pf-label">Status</span>
                  <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
                    <option value="1">Active</option>
                    <option value="0">Off</option>
                  </select>
                </label>
                <label className="pf-field">
                  <span className="pf-label">Image filename</span>
                  <input
                    value={form.image}
                    onChange={(e) => {
                      const image = e.target.value;
                      setForm((s) => ({ ...s, image }));
                      setPreviewUrl(brandImageUrl(image));
                    }}
                    placeholder="brand-logo.png"
                  />
                  <span className="muted pf-hint">Stored under uploads/brand_images/</span>
                </label>
                <label className="pf-field brand-upload-field">
                  <span className="pf-label">Upload logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="admin-file-input"
                    disabled={uploading}
                    onChange={(e) => void onUploadImage(e.target.files?.[0] ?? null)}
                  />
                  <span className="muted pf-hint">{uploading ? "Uploading…" : "JPG / PNG / GIF / WebP · max 5MB"}</span>
                </label>
                <div className="brand-preview-box">
                  <span className="pf-label">Preview</span>
                  {previewUrl || form.image ? (
                    <BrandThumb filename={form.image} url={previewUrl} alt={form.name || "Brand"} />
                  ) : (
                    <span className="brand-thumb-placeholder large">No image</span>
                  )}
                </div>
              </div>

              {msg ? <p className="error">{msg}</p> : null}

              <div className="brand-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" disabled={busy || uploading} onClick={() => void save()}>
                  {busy ? "Saving…" : editId ? "Save changes" : "Create brand"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {importOpen ? (
        <ImportBrandModal
          onClose={() => setImportOpen(false)}
          onDone={() => {
            setImportOpen(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
